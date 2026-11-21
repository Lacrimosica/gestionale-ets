import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sign } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import app from '../../src/index';
import { hashPassword } from '../../src/lib/auth';
import { getPermissionsForRole } from '../../src/lib/session-permissions';
import { base32Decode, currentStep, hotp } from '../../src/lib/totp';
import type { EmailMessage, EmailSender } from '../../src/lib/email';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB, getMiniflareRawDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { createTestOrganization, createTestUser, createTestOrganizationUser } from '../setup/fixtures';
import * as schema from '../../src/db/schema';

const JWT_SECRET = 'test-jwt-secret-min-32-characters-long!!';
const MFA_ENCRYPTION_KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const PASSWORD = 'correct-horse-battery';

/** Captures outgoing mail so tests can read the codes. */
function fakeSender() {
  const sent: EmailMessage[] = [];
  const sender: EmailSender = { async send(m) { sent.push(m); } };
  const lastCode = () => sent.at(-1)?.text.match(/(\d{6})/)?.[1] ?? '';
  return { sent, sender, lastCode };
}

type EnvOptions = { key?: boolean; email?: EmailSender; requiredRoles?: string };

function env({ key = true, email, requiredRoles }: EnvOptions = {}) {
  return {
    DB: getMiniflareRawDB(),
    JWT_SECRET,
    ...(key ? { MFA_ENCRYPTION_KEY } : {}),
    ...(email ? { EMAIL_SENDER: email } : {}),
    ...(requiredRoles !== undefined ? { MFA_REQUIRED_ROLES: requiredRoles } : {}),
  };
}

async function post(path: string, body: unknown, opts: EnvOptions = {}, token?: string) {
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }, env(opts));
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
}

async function totpCode(secret: string, offsetSteps = 0) {
  return hotp(base32Decode(secret), currentStep() + offsetSteps);
}

async function seedUser(role: string, opts: { verified?: boolean; email?: string } = {}) {
  const org = await createTestOrganization();
  const user = await createTestUser({
    email: opts.email ?? `${role}@club.test`,
    password: await hashPassword(PASSWORD),
    emailVerifiedAt: opts.verified === false ? null : new Date().toISOString(),
  });
  await createTestOrganizationUser(user.id, org.id, { role, permissions: JSON.stringify(getPermissionsForRole(role)), isOwner: 0 });
  return { org, user };
}

const login = (email: string, opts: EnvOptions = {}) => post('/api/auth/login', { email, password: PASSWORD }, opts);

/** Enrol an authenticator through the forced-enrolment path; returns the secret. */
async function enrolTotp(email: string, opts: EnvOptions = {}) {
  const first = await login(email, opts);
  expect(first.body.step).toBe('enroll');
  const setup = await post('/api/auth/mfa/enroll/totp/setup', { pendingToken: first.body.pendingToken }, opts);
  const confirm = await post('/api/auth/mfa/enroll/totp/confirm', { pendingToken: first.body.pendingToken, code: await totpCode(setup.body.secret) }, opts);
  return { secret: setup.body.secret as string, confirm };
}

describe('Two-step sign-in over HTTP', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  describe('enforcement', () => {
    it('makes an admin without two-step enrol before any session is issued', async () => {
      const { user } = await seedUser('admin');
      const res = await login(user.email);

      expect(res.status).toBe(200);
      expect(res.body.step).toBe('enroll');
      expect(res.body.token).toBeUndefined();
      expect(res.body.available).toEqual({ totp: true, email: false });
    });

    it('lets a viewer without two-step straight in, in the old response shape', async () => {
      const { user } = await seedUser('viewer');
      const res = await login(user.email);

      expect(res.body.token).toBeTruthy();
      expect(res.body.step).toBeUndefined();
    });

    it('does not enforce when MFA_REQUIRED_ROLES is empty (demo)', async () => {
      const { user } = await seedUser('core_admin');
      expect((await login(user.email, { requiredRoles: '' })).body.token).toBeTruthy();
    });

    it('never locks admins out when no method is configured on the server', async () => {
      const { user } = await seedUser('core_admin');
      expect((await login(user.email, { key: false })).body.token).toBeTruthy();
    });

    it('does not accept the pending token as a session', async () => {
      const { user } = await seedUser('admin');
      const { body } = await login(user.email);
      const res = await app.request('/api/people', { headers: { Authorization: `Bearer ${body.pendingToken}` } }, env());
      expect(res.status).toBe(401);
    });
  });

  describe('authenticator app', () => {
    it('enrols, returns recovery codes and a session, then requires a code at sign-in', async () => {
      const { user } = await seedUser('admin');
      const { secret, confirm } = await enrolTotp(user.email);

      expect(confirm.status).toBe(200);
      expect(confirm.body.token).toBeTruthy();
      expect(confirm.body.recoveryCodes).toHaveLength(10);

      const next = await login(user.email);
      expect(next.body).toMatchObject({ step: 'mfa', methods: ['totp'] });
      // The code used to confirm enrolment is spent; the next step's code works.
      const replay = await post('/api/auth/mfa/verify', { pendingToken: next.body.pendingToken, method: 'totp', code: await totpCode(secret) });
      const fresh = await post('/api/auth/mfa/verify', { pendingToken: next.body.pendingToken, method: 'totp', code: await totpCode(secret, 1) });

      expect(replay.status).toBe(400);
      expect(fresh.status).toBe(200);
      expect(fresh.body.token).toBeTruthy();
    });

    it('accepts each recovery code once', async () => {
      const { user } = await seedUser('admin');
      const { confirm } = await enrolTotp(user.email);
      const code = confirm.body.recoveryCodes[0];

      const first = await login(user.email);
      const ok = await post('/api/auth/mfa/verify', { pendingToken: first.body.pendingToken, method: 'recovery', code: code.toUpperCase() });
      const again = await post('/api/auth/mfa/verify', { pendingToken: first.body.pendingToken, method: 'recovery', code });

      expect(ok.status).toBe(200);
      expect(again.status).toBe(400);
    });

    it('refuses enrolment through a pending login once a method exists', async () => {
      const { user } = await seedUser('admin');
      await enrolTotp(user.email);
      const next = await login(user.email);

      const hijack = await post('/api/auth/mfa/enroll/totp/setup', { pendingToken: next.body.pendingToken });
      expect(hijack.status).toBe(409);
    });
  });

  describe('email', () => {
    it('requires a one-time email confirmation before a password sign-in completes', async () => {
      const mail = fakeSender();
      const { user } = await seedUser('viewer', { verified: false });

      const first = await login(user.email, { email: mail.sender });
      expect(first.body.step).toBe('verify_email');
      expect(mail.sent[0].to).toBe(user.email);

      const done = await post('/api/auth/mfa/verify-email', { pendingToken: first.body.pendingToken, code: mail.lastCode() }, { email: mail.sender });
      expect(done.body.token).toBeTruthy();

      const row = await getMiniflareDB().select().from(schema.user).where(eq(schema.user.id, user.id)).get();
      expect(row?.emailVerifiedAt).toBeTruthy();
      expect((await login(user.email, { email: mail.sender })).body.token).toBeTruthy();
    });

    it('skips email verification when no email sender is configured', async () => {
      const { user } = await seedUser('viewer', { verified: false });
      expect((await login(user.email)).body.token).toBeTruthy();
    });

    it('burns a code after five wrong attempts', async () => {
      const mail = fakeSender();
      const { user } = await seedUser('viewer', { verified: false });
      const { body } = await login(user.email, { email: mail.sender });
      const right = mail.lastCode();
      const wrong = right === '000000' ? '111111' : '000000';

      for (let i = 0; i < 5; i++) {
        await post('/api/auth/mfa/verify-email', { pendingToken: body.pendingToken, code: wrong }, { email: mail.sender });
      }
      const late = await post('/api/auth/mfa/verify-email', { pendingToken: body.pendingToken, code: right }, { email: mail.sender });
      expect(late.status).toBe(400);
    });

    it('signs in with an emailed code once email codes are enabled', async () => {
      const mail = fakeSender();
      const opts = { email: mail.sender, key: false };
      const { user } = await seedUser('admin');

      const first = await login(user.email, opts);
      expect(first.body).toMatchObject({ step: 'enroll', available: { totp: false, email: true } });
      await post('/api/auth/mfa/email/send', { pendingToken: first.body.pendingToken }, opts);
      const enrolled = await post('/api/auth/mfa/enroll/email/confirm', { pendingToken: first.body.pendingToken, code: mail.lastCode() }, opts);
      expect(enrolled.body.token).toBeTruthy();

      const next = await login(user.email, opts);
      expect(next.body).toMatchObject({ step: 'mfa', methods: ['email'] });
      // Email is the only method, so the code was sent with the login response.
      const ok = await post('/api/auth/mfa/verify', { pendingToken: next.body.pendingToken, method: 'email', code: mail.lastCode() }, opts);
      expect(ok.body.token).toBeTruthy();
    });
  });

  describe('self-service and admin reset', () => {
    it('stops a required role from removing its last method', async () => {
      const { user } = await seedUser('admin');
      const { secret, confirm } = await enrolTotp(user.email);

      const res = await post('/api/mfa/disable', { target: 'totp', method: 'totp', code: await totpCode(secret, 1) }, {}, confirm.body.token);
      expect(res.status).toBe(403);
    });

    it('lets a viewer turn an authenticator on and off with a current code', async () => {
      const { user } = await seedUser('viewer');
      const session = (await login(user.email)).body.token;

      const setup = await post('/api/mfa/totp/setup', {}, {}, session);
      const on = await post('/api/mfa/totp/confirm', { code: await totpCode(setup.body.secret) }, {}, session);
      const off = await post('/api/mfa/disable', { target: 'totp', method: 'totp', code: await totpCode(setup.body.secret, 1) }, {}, session);

      expect(on.body.recoveryCodes).toHaveLength(10);
      expect(off.status).toBe(200);
      expect((await login(user.email)).body.token).toBeTruthy();
    });

    it('lets a core admin reset a member, but not a member of another org', async () => {
      const db = getMiniflareDB();
      const { org, user: boss } = await seedUser('core_admin');
      const bossSession = (await enrolTotp(boss.email)).confirm.body.token;

      const member = await createTestUser({ email: 'member@club.test', password: await hashPassword(PASSWORD) });
      await createTestOrganizationUser(member.id, org.id, { role: 'viewer', isOwner: 0 });
      await db.insert(schema.userMfa).values({ userId: member.id, emailOtpEnabled: 1, createdAt: 'x', updatedAt: 'x' });

      const shared = await createTestUser({ email: 'shared@club.test' });
      const otherOrg = await createTestOrganization({ slug: 'other' });
      await createTestOrganizationUser(shared.id, org.id, { role: 'viewer', isOwner: 0 });
      await createTestOrganizationUser(shared.id, otherOrg.id, { role: 'core_admin', isOwner: 0 });

      const del = (id: string) => app.request(`/api/settings/users/${id}/mfa`, { method: 'DELETE', headers: { Authorization: `Bearer ${bossSession}` } }, env());

      expect((await del(member.id)).status).toBe(200);
      expect(await db.select().from(schema.userMfa).where(eq(schema.userMfa.userId, member.id)).get()).toBeUndefined();
      expect((await del(shared.id)).status).toBe(403);
    });
  });

  it('leaves Google sign-in without a second step, even for an enrolled admin', async () => {
    const { user } = await seedUser('admin');
    await enrolTotp(user.email);

    const b64url = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const idToken = `${b64url({})}.${b64url({ sub: 'g-admin', email: user.email, email_verified: true })}.s`;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id_token: idToken }))));
    try {
      const state = await sign({ type: 'login', inviteToken: null, exp: Math.floor(Date.now() / 1000) + 600 }, JWT_SECRET);
      const res = await app.request(`/api/auth/google/callback?code=c&state=${encodeURIComponent(state)}`, {}, {
        ...env(), APP_URL: 'https://app.test', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's', GOOGLE_REDIRECT_BASE_URL: 'https://api.test',
      });
      expect(res.headers.get('Location')).toMatch(/^https:\/\/app\.test\/auth\/callback#token=/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
