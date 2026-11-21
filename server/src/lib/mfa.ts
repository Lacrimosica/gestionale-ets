/**
 * Two-step sign-in: emailed one-time codes, TOTP authenticator apps and recovery
 * codes, plus the policy deciding who must use them.
 *
 * Every "use once" operation is a conditional UPDATE whose WHERE clause only matches
 * an unused row, so two concurrent requests can never both succeed with one code.
 */
import { and, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { sign, verify } from 'hono/jwt';
import { mfaChallenge, mfaRecoveryCode, userMfa } from '../db/schema';
import { base32Encode, generateTotpSecret, totpUri, verifyTotp } from './totp';
import { openSecret, sealSecret } from './secret-box';
import { createEmailSender, type EmailEnv } from './email';

export type MfaEnv = EmailEnv & {
  JWT_SECRET: string;
  MFA_ENCRYPTION_KEY?: string;
  MFA_REQUIRED_ROLES?: string;
};

export type MfaMethod = 'totp' | 'email';
export type ChallengePurpose = 'login' | 'verify_email' | 'enable_email';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const RESEND_INTERVAL_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const RECOVERY_CODE_COUNT = 10;
const PENDING_TOKEN_TTL_S = 10 * 60;

// ─── Policy ───────────────────────────────────────────────────────────────────

export const totpAvailable = (env: MfaEnv) => !!env.MFA_ENCRYPTION_KEY;
export const emailAvailable = (env: MfaEnv) => createEmailSender(env) !== null;

/**
 * Roles that must enrol. Defaults to admins; MFA_REQUIRED_ROLES="" turns enforcement
 * off (demo). Enforcement also needs at least one usable method — without the
 * encryption key or an email sender, requiring enrolment would lock admins out.
 */
export function mfaRequiredForRole(role: string, env: MfaEnv): boolean {
  if (!totpAvailable(env) && !emailAvailable(env)) return false;
  const roles = (env.MFA_REQUIRED_ROLES ?? 'core_admin,admin')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  return roles.includes(role);
}

/** Password sign-in needs a verified email once a sender exists to verify it with. */
export function emailVerificationRequired(env: MfaEnv, user: { emailVerifiedAt: string | null }): boolean {
  return emailAvailable(env) && !user.emailVerifiedAt;
}

export type MfaStatus = { methods: MfaMethod[]; totpPending: boolean; recoveryCodesLeft: number };

export async function getMfaStatus(db: DrizzleD1Database, userId: string, env: MfaEnv): Promise<MfaStatus> {
  const row = await db.select().from(userMfa).where(eq(userMfa.userId, userId)).get();
  const methods: MfaMethod[] = [];
  if (row?.totpConfirmedAt && totpAvailable(env)) methods.push('totp');
  if (row?.emailOtpEnabled && emailAvailable(env)) methods.push('email');
  const codes = await db
    .select({ n: sql<number>`count(*)` })
    .from(mfaRecoveryCode)
    .where(and(eq(mfaRecoveryCode.userId, userId), isNull(mfaRecoveryCode.usedAt)))
    .get();
  return { methods, totpPending: !!row?.totpSecretEnc && !row.totpConfirmedAt, recoveryCodesLeft: codes?.n ?? 0 };
}

// ─── Pending-login token ──────────────────────────────────────────────────────

export type PendingLogin = { userId: string; orgId: string };

/**
 * Proof that the password step passed, carried between the login steps. It uses
 * `uid` rather than `sub` on purpose: the session middleware requires `sub` and
 * `orgId`, so this token can never be used as a session.
 */
export async function signPendingToken(env: MfaEnv, login: PendingLogin): Promise<string> {
  return sign(
    { type: 'mfa_pending', uid: login.userId, orgId: login.orgId, exp: Math.floor(Date.now() / 1000) + PENDING_TOKEN_TTL_S },
    env.JWT_SECRET,
  );
}

export async function readPendingToken(env: MfaEnv, token: unknown): Promise<PendingLogin | null> {
  if (typeof token !== 'string' || !token) return null;
  try {
    const p = (await verify(token, env.JWT_SECRET, 'HS256')) as { type?: string; uid?: string; orgId?: string };
    if (p.type !== 'mfa_pending' || !p.uid || !p.orgId) return null;
    return { userId: p.uid, orgId: p.orgId };
  } catch {
    return null;
  }
}

// ─── Hashing ──────────────────────────────────────────────────────────────────

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function randomDigits(n: number): string {
  const values = crypto.getRandomValues(new Uint32Array(n));
  return [...values].map((v) => (v % 10).toString()).join('');
}

// ─── Emailed codes ────────────────────────────────────────────────────────────

const SUBJECTS: Record<ChallengePurpose, string> = {
  login: 'Il tuo codice di accesso Niki / Your Niki sign-in code',
  verify_email: 'Conferma il tuo indirizzo email / Confirm your email address',
  enable_email: 'Attiva i codici via email / Turn on email codes',
};

export type SendResult = 'sent' | 'throttled' | 'unavailable';

/** Email a fresh 6-digit code for `purpose`, replacing any earlier unused one. */
export async function sendEmailCode(
  db: DrizzleD1Database,
  env: MfaEnv,
  user: { id: string; email: string },
  purpose: ChallengePurpose,
): Promise<SendResult> {
  const sender = createEmailSender(env);
  if (!sender) return 'unavailable';

  const now = Date.now();
  const recent = await db
    .select({ id: mfaChallenge.id })
    .from(mfaChallenge)
    .where(and(
      eq(mfaChallenge.userId, user.id),
      eq(mfaChallenge.purpose, purpose),
      gt(mfaChallenge.createdAt, new Date(now - RESEND_INTERVAL_MS).toISOString()),
    ))
    .get();
  if (recent) return 'throttled';

  const code = randomDigits(6);
  const id = crypto.randomUUID();
  const nowIso = new Date(now).toISOString();
  await db.batch([
    // Only the newest code is valid.
    db.update(mfaChallenge)
      .set({ consumedAt: nowIso })
      .where(and(eq(mfaChallenge.userId, user.id), eq(mfaChallenge.purpose, purpose), isNull(mfaChallenge.consumedAt))),
    db.insert(mfaChallenge).values({
      id,
      userId: user.id,
      purpose,
      codeHash: await sha256Hex(`${id}:${code}`),
      expiresAt: new Date(now + CHALLENGE_TTL_MS).toISOString(),
      createdAt: nowIso,
    }),
  ]);

  await sender.send({
    to: user.email,
    subject: SUBJECTS[purpose],
    text: `Codice / Code: ${code}\n\nValido 10 minuti. Se non hai richiesto tu questo codice, ignora questa email.\nValid for 10 minutes. If you didn't request it, ignore this email.`,
  });
  return 'sent';
}

/** Check and consume the newest unexpired code for `purpose`. At most 5 attempts per code. */
export async function verifyEmailCode(
  db: DrizzleD1Database,
  userId: string,
  purpose: ChallengePurpose,
  code: unknown,
): Promise<boolean> {
  if (typeof code !== 'string') return false;
  const normalized = code.replace(/\s/g, '');
  const nowIso = new Date().toISOString();
  const challenge = await db
    .select()
    .from(mfaChallenge)
    .where(and(
      eq(mfaChallenge.userId, userId),
      eq(mfaChallenge.purpose, purpose),
      isNull(mfaChallenge.consumedAt),
      gt(mfaChallenge.expiresAt, nowIso),
    ))
    .orderBy(desc(mfaChallenge.createdAt))
    .get();
  if (!challenge) return false;

  // Count the attempt first, atomically, so parallel guesses can't exceed the cap.
  const counted = await db
    .update(mfaChallenge)
    .set({ attempts: sql`${mfaChallenge.attempts} + 1` })
    .where(and(eq(mfaChallenge.id, challenge.id), lt(mfaChallenge.attempts, MAX_CODE_ATTEMPTS), isNull(mfaChallenge.consumedAt)))
    .returning({ id: mfaChallenge.id });
  if (counted.length !== 1) return false;

  if (!constantTimeEqual(await sha256Hex(`${challenge.id}:${normalized}`), challenge.codeHash)) return false;

  const consumed = await db
    .update(mfaChallenge)
    .set({ consumedAt: nowIso })
    .where(and(eq(mfaChallenge.id, challenge.id), isNull(mfaChallenge.consumedAt)))
    .returning({ id: mfaChallenge.id });
  return consumed.length === 1;
}

// ─── TOTP ─────────────────────────────────────────────────────────────────────

async function upsertMfaRow(db: DrizzleD1Database, userId: string, values: Partial<typeof userMfa.$inferInsert>) {
  const now = new Date().toISOString();
  await db
    .insert(userMfa)
    .values({ userId, createdAt: now, updatedAt: now, ...values })
    .onConflictDoUpdate({ target: userMfa.userId, set: { ...values, updatedAt: now } });
}

/**
 * Start (or restart) authenticator setup. Returns the secret and otpauth URI to show
 * as a QR code; nothing is enforced until {@link confirmTotpSetup} succeeds.
 */
export async function beginTotpSetup(
  db: DrizzleD1Database,
  env: MfaEnv,
  user: { id: string; email: string },
): Promise<{ secret: string; uri: string } | 'unavailable' | 'already_enabled'> {
  if (!totpAvailable(env)) return 'unavailable';
  const row = await db.select().from(userMfa).where(eq(userMfa.userId, user.id)).get();
  if (row?.totpConfirmedAt) return 'already_enabled';

  const secret = generateTotpSecret();
  await upsertMfaRow(db, user.id, {
    totpSecretEnc: await sealSecret(secret, env.MFA_ENCRYPTION_KEY!),
    totpConfirmedAt: null,
    totpLastStep: null,
  });
  return { secret, uri: totpUri('Niki', user.email, secret) };
}

export async function confirmTotpSetup(db: DrizzleD1Database, env: MfaEnv, userId: string, code: unknown): Promise<boolean> {
  if (!totpAvailable(env) || typeof code !== 'string') return false;
  const row = await db.select().from(userMfa).where(eq(userMfa.userId, userId)).get();
  if (!row?.totpSecretEnc || row.totpConfirmedAt) return false;
  const step = await verifyTotp(await openSecret(row.totpSecretEnc, env.MFA_ENCRYPTION_KEY!), code, null);
  if (step === null) return false;
  const confirmed = await db
    .update(userMfa)
    .set({ totpConfirmedAt: new Date().toISOString(), totpLastStep: step, updatedAt: new Date().toISOString() })
    .where(and(eq(userMfa.userId, userId), isNull(userMfa.totpConfirmedAt)))
    .returning({ userId: userMfa.userId });
  return confirmed.length === 1;
}

/** Verify a code from a confirmed authenticator, rejecting replays of an accepted step. */
export async function verifyUserTotp(db: DrizzleD1Database, env: MfaEnv, userId: string, code: unknown): Promise<boolean> {
  if (!totpAvailable(env) || typeof code !== 'string') return false;
  const row = await db.select().from(userMfa).where(eq(userMfa.userId, userId)).get();
  if (!row?.totpSecretEnc || !row.totpConfirmedAt) return false;
  const step = await verifyTotp(await openSecret(row.totpSecretEnc, env.MFA_ENCRYPTION_KEY!), code, row.totpLastStep);
  if (step === null) return false;
  const advanced = await db
    .update(userMfa)
    .set({ totpLastStep: step })
    .where(and(eq(userMfa.userId, userId), or(isNull(userMfa.totpLastStep), lt(userMfa.totpLastStep, step))))
    .returning({ userId: userMfa.userId });
  return advanced.length === 1;
}

export async function disableTotp(db: DrizzleD1Database, userId: string) {
  await db.update(userMfa)
    .set({ totpSecretEnc: null, totpConfirmedAt: null, totpLastStep: null, updatedAt: new Date().toISOString() })
    .where(eq(userMfa.userId, userId)).run();
}

export async function setEmailOtp(db: DrizzleD1Database, userId: string, enabled: boolean) {
  await upsertMfaRow(db, userId, { emailOtpEnabled: enabled ? 1 : 0 });
}

// ─── Recovery codes ───────────────────────────────────────────────────────────

const normalizeRecovery = (code: string) => code.toLowerCase().replace(/[^a-z2-7]/g, '');

/** Replace the user's recovery codes; returns the plaintext codes to show once. */
export async function generateRecoveryCodes(db: DrizzleD1Database, userId: string): Promise<string[]> {
  const now = new Date().toISOString();
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = base32Encode(crypto.getRandomValues(new Uint8Array(5))).toLowerCase(); // 8 chars, 40 bits
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
  const rows = await Promise.all(codes.map(async (code) => ({
    id: crypto.randomUUID(),
    userId,
    codeHash: await sha256Hex(normalizeRecovery(code)),
    createdAt: now,
  })));
  await db.batch([
    db.delete(mfaRecoveryCode).where(eq(mfaRecoveryCode.userId, userId)),
    db.insert(mfaRecoveryCode).values(rows),
  ]);
  return codes;
}

export async function useRecoveryCode(db: DrizzleD1Database, userId: string, code: unknown): Promise<boolean> {
  if (typeof code !== 'string') return false;
  const hash = await sha256Hex(normalizeRecovery(code));
  const used = await db
    .update(mfaRecoveryCode)
    .set({ usedAt: new Date().toISOString() })
    .where(and(eq(mfaRecoveryCode.userId, userId), eq(mfaRecoveryCode.codeHash, hash), isNull(mfaRecoveryCode.usedAt)))
    .returning({ id: mfaRecoveryCode.id });
  return used.length === 1;
}

/** Remove every second factor (admin reset, or last method removed). */
export async function resetMfa(db: DrizzleD1Database, userId: string) {
  await db.batch([
    db.delete(userMfa).where(eq(userMfa.userId, userId)),
    db.delete(mfaRecoveryCode).where(eq(mfaRecoveryCode.userId, userId)),
    db.delete(mfaChallenge).where(eq(mfaChallenge.userId, userId)),
  ]);
}

// ─── Second-factor check ──────────────────────────────────────────────────────

export type SecondFactor = { method: MfaMethod | 'recovery'; code: unknown };

/** Verify any enabled second factor for a user. */
export async function verifySecondFactor(
  db: DrizzleD1Database,
  env: MfaEnv,
  userId: string,
  { method, code }: SecondFactor,
): Promise<boolean> {
  const { methods } = await getMfaStatus(db, userId, env);
  if (method === 'recovery') return methods.length > 0 && useRecoveryCode(db, userId, code);
  if (!methods.includes(method)) return false;
  return method === 'totp' ? verifyUserTotp(db, env, userId, code) : verifyEmailCode(db, userId, 'login', code);
}
