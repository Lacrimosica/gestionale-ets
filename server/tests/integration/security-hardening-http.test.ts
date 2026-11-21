import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import app from '../../src/index';
import { hashPassword } from '../../src/lib/auth';
import {
  initializeMiniflare,
  cleanupMiniflare,
  getMiniflareDB,
  getMiniflareRawDB,
} from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import {
  createTestOrganization,
  createTestUser,
  createTestOrganizationUser,
  createTestInvite,
} from '../setup/fixtures';
import * as schema from '../../src/db/schema';

const JWT_SECRET = 'test-jwt-secret-min-32-characters-long!!';
const APP_URL = 'https://app.test';

const ADMIN_PERMISSIONS = [
  'settings.view',
  'settings.users.view',
  'settings.users.manage',
  'settings.users.reset_password',
  'settings.password.manage',
];

function env(extra: Record<string, string> = {}) {
  return {
    DB: getMiniflareRawDB(),
    JWT_SECRET,
    APP_URL,
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_REDIRECT_BASE_URL: 'https://api.test',
    ...extra,
  };
}

async function mintToken(userId: string, orgId: string, role = 'core_admin', permissions = ADMIN_PERMISSIONS) {
  await getMiniflareDB().update(schema.organizationUser)
    .set({ role, permissions: JSON.stringify(permissions) })
    .where(and(eq(schema.organizationUser.userId, userId), eq(schema.organizationUser.orgId, orgId)))
    .run();
  return sign({ sub: userId, email: 'x@test.local', orgId, role, permissions, exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
}

async function call(method: string, path: string, token: string, body?: unknown, extraEnv?: Record<string, string>) {
  return app.request(
    path,
    {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    env(extraEnv),
  );
}

/** Stub Google's token endpoint so the login callback receives an ID token for `email`. */
function stubGoogle(email: string, sub = `google-${email}`) {
  const b64url = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const idToken = `${b64url({ alg: 'none' })}.${b64url({ sub, email, email_verified: true })}.sig`;
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id_token: idToken }), { status: 200 })));
}

async function googleCallback(inviteToken?: string) {
  const state = await sign({ type: 'login', inviteToken: inviteToken ?? null, exp: Math.floor(Date.now() / 1000) + 600 }, JWT_SECRET);
  const res = await app.request(`/api/auth/google/callback?code=abc&state=${encodeURIComponent(state)}`, {}, env());
  return res.headers.get('Location') ?? '';
}

describe('Security hardening over HTTP', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await cleanupMiniflare();
  });

  describe('Google login', () => {
    it('does not re-admit a user who was removed from their organization', async () => {
      const db = getMiniflareDB();
      await createTestOrganization({ id: 'default', slug: 'default' });
      const removed = await createTestUser({ email: 'removed@example.com' });
      stubGoogle(removed.email);

      const location = await googleCallback();

      expect(location).toContain('/auth/callback?error=');
      const memberships = await db.select().from(schema.organizationUser)
        .where(eq(schema.organizationUser.userId, removed.id)).all();
      expect(memberships).toHaveLength(0);
    });

    it('puts the session token in the URL fragment, not the query string', async () => {
      const org = await createTestOrganization();
      const member = await createTestUser({ email: 'member@example.com', password: await hashPassword('password123') });
      await createTestOrganizationUser(member.id, org.id, { role: 'viewer', isOwner: 0 });
      stubGoogle(member.email);

      const location = await googleCallback();

      expect(location.startsWith(`${APP_URL}/auth/callback#token=`)).toBe(true);
    });

    it('does not echo Google error responses back in the redirect', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"invalid_grant","internal":"secret-detail"}', { status: 400 })));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const location = await googleCallback();

      expect(location).toContain('error=');
      expect(decodeURIComponent(location)).not.toContain('secret-detail');
    });

    it('lets an invite be redeemed only once under concurrent callbacks', async () => {
      const db = getMiniflareDB();
      const org = await createTestOrganization();
      const admin = await createTestUser({ email: 'admin@example.com' });
      const invite = await createTestInvite(org.id, admin.id, { email: null, role: 'viewer' });
      const a = await createTestUser({ email: 'a@example.com', password: await hashPassword('password123') });
      const b = await createTestUser({ email: 'b@example.com', password: await hashPassword('password123') });

      const redeem = async (email: string) => {
        const b64url = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '');
        const idToken = `${b64url({})}.${b64url({ sub: `g-${email}`, email, email_verified: true })}.s`;
        const state = await sign({ type: 'login', inviteToken: invite.token, exp: Math.floor(Date.now() / 1000) + 600 }, JWT_SECRET);
        const fetchStub = async () => new Response(JSON.stringify({ id_token: idToken }));
        vi.stubGlobal('fetch', fetchStub);
        return app.request(`/api/auth/google/callback?code=c&state=${encodeURIComponent(state)}`, {}, env());
      };
      await Promise.all([redeem(a.email), redeem(b.email)]);

      const joined = await db.select().from(schema.organizationUser)
        .where(eq(schema.organizationUser.orgId, org.id)).all();
      expect(joined).toHaveLength(1);
    });
  });

  describe('domain self-signup', () => {
    it("does not let domain users sign up when the org's signup mode is invite_only", async () => {
      await createTestOrganization({ authDomain: 'club.org', domainSignupMode: 'invite_only' });
      stubGoogle('newcomer@club.org');

      const location = await googleCallback();

      expect(location).toContain('/auth/callback?error=');
      const created = await getMiniflareDB().select().from(schema.user).where(eq(schema.user.email, 'newcomer@club.org')).get();
      expect(created).toBeUndefined();
    });

    it('signs domain users up into the org that owns the domain when its mode is open', async () => {
      await createTestOrganization({ slug: 'other', authDomain: 'other.org', domainSignupMode: 'open' });
      const club = await createTestOrganization({ slug: 'club', authDomain: 'club.org', domainSignupMode: 'open' });
      stubGoogle('newcomer@club.org');

      await googleCallback();

      const db = getMiniflareDB();
      const created = await db.select().from(schema.user).where(eq(schema.user.email, 'newcomer@club.org')).get();
      const membership = await db.select().from(schema.organizationUser).where(eq(schema.organizationUser.userId, created!.id)).get();
      expect(membership?.orgId).toBe(club.id);
      expect(membership?.role).toBe('viewer');
    });
  });

  describe('rate limiting', () => {
    /** In-memory stand-in for the Cloudflare binding: `max` hits per key. */
    function fakeLimiter(max: number) {
      const hits = new Map<string, number>();
      return {
        keys: hits,
        async limit({ key }: { key: string }) {
          hits.set(key, (hits.get(key) ?? 0) + 1);
          return { success: (hits.get(key) ?? 0) <= max };
        },
      };
    }

    async function login(limiter: ReturnType<typeof fakeLimiter>, email: string, ip: string) {
      return app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': ip },
        body: JSON.stringify({ email, password: 'wrong-password' }),
      }, { ...env(), AUTH_RATE_LIMITER: limiter });
    }

    it('returns 429 once one IP exceeds the login budget', async () => {
      const limiter = fakeLimiter(3);
      const statuses = [];
      for (let i = 0; i < 4; i++) statuses.push((await login(limiter, `user${i}@test`, '1.2.3.4')).status);

      expect(statuses).toEqual([401, 401, 401, 429]);
    });

    it('limits guesses against one account even when they come from different IPs', async () => {
      const limiter = fakeLimiter(3);
      const statuses = [];
      for (let i = 0; i < 4; i++) statuses.push((await login(limiter, 'Victim@Test', `10.0.0.${i}`)).status);

      expect(statuses[3]).toBe(429);
      expect(limiter.keys.get('login:email:victim@test')).toBe(4);
    });
  });

  describe('user management', () => {
    async function seed() {
      const org1 = await createTestOrganization({ slug: 'org1' });
      const org2 = await createTestOrganization({ slug: 'org2' });
      const admin = await createTestUser({ email: 'admin@org1.test' });
      await createTestOrganizationUser(admin.id, org1.id, { role: 'core_admin' });
      return { org1, org2, admin, token: await mintToken(admin.id, org1.id) };
    }

    it("refuses to reset the password of a user who also belongs to another org", async () => {
      const { org1, org2, token } = await seed();
      const shared = await createTestUser({ email: 'shared@test', password: 'original' });
      await createTestOrganizationUser(shared.id, org1.id, { role: 'viewer', isOwner: 0 });
      await createTestOrganizationUser(shared.id, org2.id, { role: 'core_admin', isOwner: 0 });

      const res = await call('POST', `/api/settings/users/${shared.id}/reset-password`, token, { newPassword: 'attacker-pass' });

      expect(res.status).toBe(403);
      const row = await getMiniflareDB().select().from(schema.user).where(eq(schema.user.id, shared.id)).get();
      expect(row?.password).toBe('original');
    });

    it('rejects short passwords on create, reset and change', async () => {
      const { org1, token } = await seed();
      const member = await createTestUser({ email: 'm@test' });
      await createTestOrganizationUser(member.id, org1.id, { role: 'viewer', isOwner: 0 });

      const create = await call('POST', '/api/settings/users', token, { email: 'new@test', password: 'short', role: 'viewer' });
      const reset = await call('POST', `/api/settings/users/${member.id}/reset-password`, token, { newPassword: 'short' });
      const change = await call('POST', '/api/settings/change-password', token, { currentPassword: 'x', newPassword: 'short' });

      expect([create.status, reset.status, change.status]).toEqual([400, 400, 400]);
    });
  });

  describe('branding', () => {
    it("refuses another org's auth domain, and lets two orgs leave it empty", async () => {
      const org1 = await createTestOrganization({ slug: 'org1', authDomain: 'taken.org' });
      const org2 = await createTestOrganization({ slug: 'org2' });
      const org3 = await createTestOrganization({ slug: 'org3' });
      const admins = await Promise.all([org2, org3].map(async (org) => {
        const u = await createTestUser({ email: `admin@${org.slug}.test` });
        await createTestOrganizationUser(u.id, org.id, { role: 'core_admin' });
        return mintToken(u.id, org.id);
      }));

      const steal = await call('PUT', '/api/settings/branding', admins[0], { name: 'Org 2', shortName: 'O2', authDomain: 'taken.org' });
      const empty2 = await call('PUT', '/api/settings/branding', admins[0], { name: 'Org 2', shortName: 'O2', authDomain: '' });
      const empty3 = await call('PUT', '/api/settings/branding', admins[1], { name: 'Org 3', shortName: 'O3', authDomain: '' });

      expect(steal.status).toBe(409);
      expect(empty2.status).toBe(200);
      expect(empty3.status).toBe(200);
      const owner = await getMiniflareDB().select().from(schema.organization).where(eq(schema.organization.id, org1.id)).get();
      expect(owner?.authDomain).toBe('taken.org');
    });

    it('accepts only image data URLs as the logo', async () => {
      const org = await createTestOrganization();
      const u = await createTestUser({ email: 'admin@logo.test' });
      await createTestOrganizationUser(u.id, org.id, { role: 'core_admin' });
      const token = await mintToken(u.id, org.id);

      const bad = await call('PUT', '/api/settings/branding', token, { name: 'O', shortName: 'O', logoDataUrl: 'https://evil.test/x.png' });
      const good = await call('PUT', '/api/settings/branding', token, { name: 'O', shortName: 'O', logoDataUrl: 'data:image/png;base64,iVBORw0KGgo=' });

      expect(bad.status).toBe(400);
      expect(good.status).toBe(200);
    });
  });

  describe('setup in invite_only mode', () => {
    async function attemptSetup(orgCreationToken: string, slug: string) {
      const setupToken = await sign({ type: 'setup_session', exp: Math.floor(Date.now() / 1000) + 600 }, JWT_SECRET);
      return call('POST', '/api/setup', setupToken, {
        orgName: 'New Org', shortName: 'NEW', slug, adminEmail: `${slug}@test`, adminPassword: 'password123', orgCreationToken,
      }, { DEPLOYMENT_MODE: 'invite_only' });
    }

    it('does not accept an ordinary member invite as an org-creation token', async () => {
      const org = await createTestOrganization();
      const admin = await createTestUser({ email: 'admin@first.test' });
      const memberInviteToken = await sign({ type: 'invite', inviteId: 'x', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
      await createTestInvite(org.id, admin.id, { token: memberInviteToken, role: 'viewer' });

      const res = await attemptSetup(memberInviteToken, 'sneaky');

      expect(res.status).toBe(403);
      const created = await getMiniflareDB().select().from(schema.organization).where(eq(schema.organization.slug, 'sneaky')).get();
      expect(created).toBeUndefined();
    });

    it('accepts an org-creation token exactly once', async () => {
      const org = await createTestOrganization();
      const admin = await createTestUser({ email: 'admin@first.test' });
      const orgToken = await sign({ type: 'org_creation', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
      await createTestInvite(org.id, admin.id, { token: orgToken, role: 'core_admin' });

      const first = await attemptSetup(orgToken, 'second-org');
      const again = await attemptSetup(orgToken, 'third-org');

      expect(first.status).toBe(200);
      expect(again.status).toBe(403);
    });
  });

  describe('response headers', () => {
    it('sends security headers and never a wildcard CORS origin', async () => {
      // Unauthenticated, so the JWT middleware answers without touching the DB.
      const res = await app.request('/api/people', { headers: { Origin: 'https://evil.test' } }, { DB: getMiniflareRawDB(), JWT_SECRET });

      expect(res.status).toBe(401);

      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
      expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
      expect(res.headers.get('Cache-Control')).toBe('no-store');
      expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
      expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('https://evil.test');
    });
  });
});
