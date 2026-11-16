import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import app from '../../src/index';
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
  createTestPerson,
} from '../setup/fixtures';
import * as schema from '../../src/db/schema';

const JWT_SECRET = 'test-jwt-secret-min-32-characters-long!!';

/**
 * Drives real routes in-process with an org-A token against org-B resources.
 * Every cross-tenant attempt must fail without touching org B's data.
 */
describe('Tenant isolation over HTTP', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  async function mintToken(userId: string, orgId: string, permissions: string[], role = 'core_admin') {
    return sign(
      {
        sub: userId,
        email: `${userId}@test.local`,
        orgId,
        role,
        permissions,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET,
    );
  }

  function env() {
    return { DB: getMiniflareRawDB(), JWT_SECRET };
  }

  async function call(method: string, path: string, token: string, body?: unknown) {
    return app.request(
      path,
      {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      env(),
    );
  }

  async function seedTwoOrgs() {
    const org1 = await createTestOrganization({ slug: 'org1', name: 'Org 1' });
    const org2 = await createTestOrganization({ slug: 'org2', name: 'Org 2' });
    const user1 = await createTestUser({ email: 'admin1@org1.local' });
    const user2 = await createTestUser({ email: 'admin2@org2.local' });
    await createTestOrganizationUser(user1.id, org1.id, { role: 'core_admin' });
    await createTestOrganizationUser(user2.id, org2.id, { role: 'core_admin' });
    const person1 = await createTestPerson(org1.id, { orgId: org1.id, firstName: 'Alice' });
    const person2 = await createTestPerson(org2.id, { orgId: org2.id, firstName: 'Bob' });
    return { org1, org2, user1, user2, person1, person2 };
  }

  describe('settings: user password reset', () => {
    it('rejects resetting the password of a user in another org', async () => {
      const { org1, user1, user2 } = await seedTwoOrgs();
      const token = await mintToken(user1.id, org1.id, ['settings.users.reset_password']);

      const res = await call('POST', `/api/settings/users/${user2.id}/reset-password`, token, {
        newPassword: 'attacker-chosen-pw',
      });

      expect(res.status).toBe(404);
      const after = await getMiniflareDB().select().from(schema.user).where(eq(schema.user.id, user2.id)).get();
      expect(after?.password).toBe(user2.password);
    });
  });
});
