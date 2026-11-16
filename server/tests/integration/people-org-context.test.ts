import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { and, eq } from 'drizzle-orm';
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
 * Drives the real people route in-process (app.request) to prove the orgContext
 * module scopes every query to the caller's organization (issue #3).
 */
describe('People route — orgContext scoping (issue #3)', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  async function mintToken(userId: string, orgId: string, permissions: string[]) {
    return sign(
      {
        sub: userId,
        email: `${userId}@test.local`,
        orgId,
        role: 'core_admin',
        permissions,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET,
    );
  }

  function env() {
    return { DB: getMiniflareRawDB(), JWT_SECRET };
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

  it('GET /api/people returns only the caller org’s people', async () => {
    const { org1, user1, person1, person2 } = await seedTwoOrgs();
    const token = await mintToken(user1.id, org1.id, ['people.view']);

    const res = await app.request(
      '/api/people',
      { headers: { Authorization: `Bearer ${token}` } },
      env(),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string }>;
    const ids = body.map((p) => p.id);
    expect(ids).toContain(person1.id);
    expect(ids).not.toContain(person2.id);
  });

  it('GET /api/people/:id for another org’s person returns 404', async () => {
    const { org1, user1, person2 } = await seedTwoOrgs();
    const token = await mintToken(user1.id, org1.id, ['people.view']);

    const res = await app.request(
      `/api/people/${person2.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env(),
    );
    expect(res.status).toBe(404);
  });

  it('returns 403 when the caller lacks the required permission', async () => {
    const { org1, user1 } = await seedTwoOrgs();
    // Token carries people.view but not people.edit.
    const token = await mintToken(user1.id, org1.id, ['people.view']);

    const res = await app.request(
      '/api/people',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'New', lastName: 'Person' }),
      },
      env(),
    );
    expect(res.status).toBe(403);
  });

  it('create-user cannot link a person from another organization', async () => {
    const { org1, user1, person2 } = await seedTwoOrgs();
    const token = await mintToken(user1.id, org1.id, ['settings.users.manage']);

    const res = await app.request(
      `/api/people/${person2.id}/create-user`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'leak@x.local', password: 'password123', role: 'viewer' }),
      },
      env(),
    );

    // The person belongs to org2, so an org1 admin must not find or link it.
    expect(res.status).toBe(404);

    // And org2's person must remain unlinked and no user created.
    const db = getMiniflareDB();
    const person2After = await db
      .select()
      .from(schema.person)
      .where(eq(schema.person.id, person2.id))
      .get();
    expect(person2After?.userId ?? null).toBeNull();

    const leaked = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, 'leak@x.local'))
      .get();
    expect(leaked).toBeUndefined();
  });
});
