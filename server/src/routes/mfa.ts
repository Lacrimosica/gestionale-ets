/**
 * Self-service two-step sign-in for a signed-in user: status, enrolling and removing
 * methods, and regenerating recovery codes. Mounted at /api/mfa (session required).
 */
import { Hono, type Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { user as userTable } from '../db/schema';
import type { JwtPayload } from '../lib/org-context';
import {
  beginTotpSetup,
  confirmTotpSetup,
  disableTotp,
  emailAvailable,
  generateRecoveryCodes,
  getMfaStatus,
  mfaRequiredForRole,
  resetMfa,
  sendEmailCode,
  setEmailOtp,
  totpAvailable,
  verifyEmailCode,
  verifySecondFactor,
  type MfaEnv,
  type MfaMethod,
} from '../lib/mfa';
import { isRateLimited, tooManyRequests, type RateLimiter } from '../lib/rate-limit';

type Bindings = MfaEnv & { DB: D1Database; AUTH_RATE_LIMITER?: RateLimiter };
type Env = { Bindings: Bindings; Variables: { jwtPayload: JwtPayload } };
type Ctx = Context<Env>;

const mfaRouter = new Hono<Env>();

async function currentUser(c: Ctx) {
  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const user = await db.select().from(userTable).where(eq(userTable.id, payload.sub)).get();
  return { db, payload, user };
}

const invalidCode = (c: Context) => c.json({ error: 'Invalid or expired code.' }, 400);

/** Guessing codes from a stolen session is still guessing: same budget as sign-in. */
async function limited(c: Ctx) {
  return isRateLimited(c.env.AUTH_RATE_LIMITER, [`mfa:user:${c.get('jwtPayload').sub}`]);
}

// GET / — what is enabled, what is available, and whether this role must use it.
mfaRouter.get('/', async (c) => {
  const { db, payload } = await currentUser(c);
  const status = await getMfaStatus(db, payload.sub, c.env);
  return c.json({
    ...status,
    required: mfaRequiredForRole(payload.role, c.env),
    available: { totp: totpAvailable(c.env), email: emailAvailable(c.env) },
  });
});

/** First method enabled: hand out recovery codes with it. */
async function recoveryCodesIfFirst(c: Ctx, userId: string, methodsBefore: MfaMethod[]) {
  return methodsBefore.length === 0 ? generateRecoveryCodes(drizzle(c.env.DB), userId) : undefined;
}

mfaRouter.post('/totp/setup', async (c) => {
  const { db, user } = await currentUser(c);
  if (!user) return c.json({ error: 'User not found' }, 404);
  const setup = await beginTotpSetup(db, c.env, user);
  if (setup === 'unavailable') return c.json({ error: 'Authenticator apps are not configured on this server.' }, 503);
  if (setup === 'already_enabled') return c.json({ error: 'Already enabled.' }, 409);
  return c.json(setup);
});

mfaRouter.post('/totp/confirm', async (c) => {
  if (await limited(c)) return tooManyRequests(c);
  const { db, payload } = await currentUser(c);
  const { code } = await c.req.json<{ code?: string }>();
  const before = (await getMfaStatus(db, payload.sub, c.env)).methods;
  if (!(await confirmTotpSetup(db, c.env, payload.sub, code))) return invalidCode(c);
  return c.json({ enabled: true, recoveryCodes: await recoveryCodesIfFirst(c, payload.sub, before) });
});

mfaRouter.post('/email/enable', async (c) => {
  const { db, user } = await currentUser(c);
  if (!user) return c.json({ error: 'User not found' }, 404);
  const result = await sendEmailCode(db, c.env, user, 'enable_email');
  if (result === 'unavailable') return c.json({ error: 'Email is not configured on this server.' }, 503);
  if (result === 'throttled') return c.json({ error: 'Please wait a minute before requesting another code.' }, 429);
  return c.json({ sent: true });
});

mfaRouter.post('/email/confirm', async (c) => {
  if (await limited(c)) return tooManyRequests(c);
  const { db, payload, user } = await currentUser(c);
  if (!user) return c.json({ error: 'User not found' }, 404);
  const { code } = await c.req.json<{ code?: string }>();
  const before = (await getMfaStatus(db, payload.sub, c.env)).methods;
  if (!(await verifyEmailCode(db, payload.sub, 'enable_email', code))) return invalidCode(c);
  await setEmailOtp(db, payload.sub, true);
  // Receiving the code proves the address, the same as email verification.
  if (!user.emailVerifiedAt) {
    const now = new Date().toISOString();
    await db.update(userTable).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(userTable.id, user.id)).run();
  }
  return c.json({ enabled: true, recoveryCodes: await recoveryCodesIfFirst(c, payload.sub, before) });
});

type FactorBody = { method?: MfaMethod | 'recovery'; code?: string };

/** Changes to two-step settings need a current second factor, not just the session. */
async function confirmFactor(c: Ctx, body: FactorBody) {
  const { method, code } = body;
  if (method !== 'totp' && method !== 'email' && method !== 'recovery') return false;
  return verifySecondFactor(drizzle(c.env.DB), c.env, c.get('jwtPayload').sub, { method, code });
}

// POST /disable — remove one method: { target: 'totp' | 'email', method, code }.
mfaRouter.post('/disable', async (c) => {
  if (await limited(c)) return tooManyRequests(c);
  const { db, payload } = await currentUser(c);
  const body = await c.req.json<FactorBody & { target?: MfaMethod }>();
  const { methods } = await getMfaStatus(db, payload.sub, c.env);
  if (!body.target || !methods.includes(body.target)) return c.json({ error: 'That method is not enabled.' }, 400);
  if (methods.length === 1 && mfaRequiredForRole(payload.role, c.env)) {
    return c.json({ error: 'Your role requires two-step sign-in; add another method before removing this one.' }, 403);
  }
  if (!(await confirmFactor(c, body))) return invalidCode(c);

  if (methods.length === 1) await resetMfa(db, payload.sub);
  else if (body.target === 'totp') await disableTotp(db, payload.sub);
  else await setEmailOtp(db, payload.sub, false);
  return c.json({ disabled: true });
});

// POST /recovery-codes — replace recovery codes; needs an authenticator or email code.
mfaRouter.post('/recovery-codes', async (c) => {
  if (await limited(c)) return tooManyRequests(c);
  const body = await c.req.json<FactorBody>();
  if (body.method === 'recovery') return c.json({ error: 'Use your authenticator or an email code.' }, 400);
  if (!(await confirmFactor(c, body))) return invalidCode(c);
  return c.json({ recoveryCodes: await generateRecoveryCodes(drizzle(c.env.DB), c.get('jwtPayload').sub) });
});

// POST /email/send-login-code — email a code for confirming a change above.
mfaRouter.post('/email/send-login-code', async (c) => {
  const { db, payload, user } = await currentUser(c);
  if (!user) return c.json({ error: 'User not found' }, 404);
  if (!(await getMfaStatus(db, payload.sub, c.env)).methods.includes('email')) {
    return c.json({ error: 'Email codes are not enabled.' }, 400);
  }
  const result = await sendEmailCode(db, c.env, user, 'login');
  if (result === 'throttled') return c.json({ error: 'Please wait a minute before requesting another code.' }, 429);
  return c.json({ sent: result === 'sent' });
});

export default mfaRouter;
