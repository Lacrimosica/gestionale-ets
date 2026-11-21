/**
 * The steps of a password sign-in after the password itself: email verification,
 * the second factor, and forced enrolment for roles that require two-step sign-in.
 *
 * These routes are public (under /api/auth). Each one authenticates with the
 * short-lived pending token issued by POST /api/auth/login, never a session.
 */
import { Hono, type Context } from 'hono';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import { organizationUser, user as userTable } from '../db/schema';
import {
  beginTotpSetup,
  confirmTotpSetup,
  emailAvailable,
  emailVerificationRequired,
  generateRecoveryCodes,
  getMfaStatus,
  mfaRequiredForRole,
  readPendingToken,
  sendEmailCode,
  setEmailOtp,
  signPendingToken,
  totpAvailable,
  verifyEmailCode,
  verifySecondFactor,
  type MfaEnv,
  type MfaMethod,
} from '../lib/mfa';
import { issueSession, type SessionUser } from '../lib/session';
import { clientIp, isRateLimited, tooManyRequests, type RateLimiter } from '../lib/rate-limit';

type Bindings = MfaEnv & { DB: D1Database; AUTH_RATE_LIMITER?: RateLimiter };

type UserRow = typeof userTable.$inferSelect;
type OrgUserRow = typeof organizationUser.$inferSelect;

export type LoginStep =
  | { step: 'verify_email'; pendingToken: string }
  | { step: 'mfa'; pendingToken: string; methods: MfaMethod[] }
  | { step: 'enroll'; pendingToken: string; available: { totp: boolean; email: boolean } }
  | { step: 'done'; token: string; user: SessionUser };

/**
 * Decide what a user who has passed the password check must do next. Called by
 * POST /login and again after each step, so the order is enforced server-side.
 */
export async function nextLoginStep(
  db: DrizzleD1Database,
  env: Bindings,
  user: UserRow,
  orgUser: OrgUserRow,
): Promise<LoginStep> {
  const pending = () => signPendingToken(env, { userId: user.id, orgId: orgUser.orgId });

  if (emailVerificationRequired(env, user)) {
    await sendEmailCode(db, env, user, 'verify_email');
    return { step: 'verify_email', pendingToken: await pending() };
  }

  const { methods } = await getMfaStatus(db, user.id, env);
  if (methods.length > 0) {
    // With email as the only method there's nothing to choose: send the code now.
    if (methods.length === 1 && methods[0] === 'email') await sendEmailCode(db, env, user, 'login');
    return { step: 'mfa', pendingToken: await pending(), methods };
  }

  if (mfaRequiredForRole(orgUser.role, env)) {
    return { step: 'enroll', pendingToken: await pending(), available: { totp: totpAvailable(env), email: emailAvailable(env) } };
  }

  return { step: 'done', ...(await issueSession(env.JWT_SECRET, user, orgUser)) };
}

/** Old clients read `token`/`user` from the login response; keep that shape for 'done'. */
export function loginStepBody(step: LoginStep) {
  return step.step === 'done' ? { token: step.token, user: step.user } : step;
}

const authMfaRouter = new Hono<{ Bindings: Bindings }>();

type Pending = { db: DrizzleD1Database; user: UserRow; orgUser: OrgUserRow; body: Record<string, unknown> };

/**
 * Resolve the pending login behind a request, after rate limiting. The membership
 * is re-read so a user removed mid-login cannot finish signing in.
 */
async function loadPending(c: Context<{ Bindings: Bindings }>): Promise<Pending | Response> {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const pending = await readPendingToken(c.env, body.pendingToken);
  if (!pending) return c.json({ error: 'Sign-in expired. Please start again.' }, 401);

  if (await isRateLimited(c.env.AUTH_RATE_LIMITER, [`mfa:ip:${clientIp(c)}`, `mfa:user:${pending.userId}`])) {
    return tooManyRequests(c);
  }

  const db = drizzle(c.env.DB);
  const user = await db.select().from(userTable).where(eq(userTable.id, pending.userId)).get();
  const orgUser = await db.select().from(organizationUser)
    .where(and(eq(organizationUser.userId, pending.userId), eq(organizationUser.orgId, pending.orgId)))
    .get();
  if (!user || !orgUser) return c.json({ error: 'Sign-in expired. Please start again.' }, 401);
  return { db, user, orgUser, body };
}

const invalidCode = (c: Context) => c.json({ error: 'Invalid or expired code.' }, 400);

// POST /verify-email — confirm the address with the emailed code, then continue.
authMfaRouter.post('/verify-email', async (c) => {
  const p = await loadPending(c);
  if (p instanceof Response) return p;
  if (!(await verifyEmailCode(p.db, p.user.id, 'verify_email', p.body.code))) return invalidCode(c);

  const verifiedAt = new Date().toISOString();
  await p.db.update(userTable).set({ emailVerifiedAt: verifiedAt, updatedAt: verifiedAt }).where(eq(userTable.id, p.user.id)).run();
  return c.json(loginStepBody(await nextLoginStep(p.db, c.env, { ...p.user, emailVerifiedAt: verifiedAt }, p.orgUser)));
});

// POST /email/send — (re)send the code the current step is waiting for.
authMfaRouter.post('/email/send', async (c) => {
  const p = await loadPending(c);
  if (p instanceof Response) return p;

  let purpose: 'verify_email' | 'login' | 'enable_email';
  if (emailVerificationRequired(c.env, p.user)) {
    purpose = 'verify_email';
  } else {
    const { methods } = await getMfaStatus(p.db, p.user.id, c.env);
    if (methods.includes('email')) purpose = 'login';
    else if (methods.length === 0) purpose = 'enable_email';
    else return c.json({ error: 'Email codes are not enabled for this account.' }, 400);
  }

  const result = await sendEmailCode(p.db, c.env, p.user, purpose);
  if (result === 'unavailable') return c.json({ error: 'Email is not configured on this server.' }, 503);
  if (result === 'throttled') return c.json({ error: 'Please wait a minute before requesting another code.' }, 429);
  return c.json({ sent: true });
});

// POST /verify — the second factor; issues the session.
authMfaRouter.post('/verify', async (c) => {
  const p = await loadPending(c);
  if (p instanceof Response) return p;
  if (emailVerificationRequired(c.env, p.user)) return c.json({ error: 'Confirm your email first.' }, 409);

  const method = p.body.method;
  if (method !== 'totp' && method !== 'email' && method !== 'recovery') return c.json({ error: 'Invalid method.' }, 400);
  if (!(await verifySecondFactor(p.db, c.env, p.user.id, { method, code: p.body.code }))) return invalidCode(c);

  return c.json(await issueSession(c.env.JWT_SECRET, p.user, p.orgUser));
});

/**
 * Enrolment through a pending login is only for accounts with no second factor yet.
 * Otherwise anyone holding just the password could add their own authenticator and
 * skip the existing one.
 */
async function loadEnrollable(c: Context<{ Bindings: Bindings }>): Promise<Pending | Response> {
  const p = await loadPending(c);
  if (p instanceof Response) return p;
  if (emailVerificationRequired(c.env, p.user)) return c.json({ error: 'Confirm your email first.' }, 409);
  const { methods } = await getMfaStatus(p.db, p.user.id, c.env);
  if (methods.length > 0) return c.json({ error: 'Two-step sign-in is already set up; use your code.' }, 409);
  return p;
}

// POST /enroll/totp/setup — start authenticator enrolment.
authMfaRouter.post('/enroll/totp/setup', async (c) => {
  const p = await loadEnrollable(c);
  if (p instanceof Response) return p;
  const setup = await beginTotpSetup(p.db, c.env, p.user);
  if (setup === 'unavailable') return c.json({ error: 'Authenticator apps are not configured on this server.' }, 503);
  if (setup === 'already_enabled') return c.json({ error: 'Already enabled.' }, 409);
  return c.json(setup);
});

// POST /enroll/totp/confirm — finish enrolment; returns recovery codes and the session.
authMfaRouter.post('/enroll/totp/confirm', async (c) => {
  const p = await loadEnrollable(c);
  if (p instanceof Response) return p;
  if (!(await confirmTotpSetup(p.db, c.env, p.user.id, p.body.code))) return invalidCode(c);
  const recoveryCodes = await generateRecoveryCodes(p.db, p.user.id);
  return c.json({ ...(await issueSession(c.env.JWT_SECRET, p.user, p.orgUser)), recoveryCodes });
});

// POST /enroll/email/confirm — turn on email codes with the code from /email/send.
authMfaRouter.post('/enroll/email/confirm', async (c) => {
  const p = await loadEnrollable(c);
  if (p instanceof Response) return p;
  if (!(await verifyEmailCode(p.db, p.user.id, 'enable_email', p.body.code))) return invalidCode(c);
  await setEmailOtp(p.db, p.user.id, true);
  const now = new Date().toISOString();
  await p.db.update(userTable).set({ emailVerifiedAt: p.user.emailVerifiedAt ?? now, updatedAt: now }).where(eq(userTable.id, p.user.id)).run();
  const recoveryCodes = await generateRecoveryCodes(p.db, p.user.id);
  return c.json({ ...(await issueSession(c.env.JWT_SECRET, p.user, p.orgUser)), recoveryCodes });
});

export default authMfaRouter;
