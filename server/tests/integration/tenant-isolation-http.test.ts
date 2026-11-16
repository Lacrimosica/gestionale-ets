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

  const now = new Date().toISOString();

  async function seedActiveMember(orgId: string, personId: string) {
    const db = getMiniflareDB();
    const volunteerPeriodId = crypto.randomUUID();
    await db.insert(schema.volunteerPeriod).values({
      id: volunteerPeriodId, orgId, personId, status: 'active', enrollmentDate: '2025-01-01', createdAt: now,
    });
    await db.insert(schema.memberPeriod).values({
      id: crypto.randomUUID(), orgId, personId, volunteerPeriodId, admissionDate: '2025-02-01', createdAt: now,
    });
  }

  async function seedAssembly(orgId: string) {
    const id = crypto.randomUUID();
    await getMiniflareDB().insert(schema.assembly).values({
      id, orgId, type: 'ordinary', totalNumber: 1, referenceNumber: 1,
      location: 'Sede', mode: 'in_person', createdAt: now, updatedAt: now,
    });
    return id;
  }

  async function seedGenerationLog(orgId: string) {
    const id = crypto.randomUUID();
    await getMiniflareDB().insert(schema.documentGenerationLog).values({
      id, orgId, workflowType: 'budget_approval', assemblyNumber: 1, firstCallDate: '01/01/2025',
      triggeredBy: 'someone@org.local', status: 'success', createdAt: now,
    });
    return id;
  }

  describe('documents', () => {
    it('member and volunteer pickers list only the caller org', async () => {
      const { org1, org2, user1, person1, person2 } = await seedTwoOrgs();
      await seedActiveMember(org1.id, person1.id);
      await seedActiveMember(org2.id, person2.id);
      const token = await mintToken(user1.id, org1.id, ['documents.view']);

      for (const path of ['active-members', 'active-volunteers', 'all-volunteers-with-status']) {
        const res = await call('GET', `/api/documents/${path}`, token);
        expect(res.status, path).toBe(200);
        const ids = ((await res.json()) as Array<{ id: string }>).map((r) => r.id);
        expect(ids, path).toContain(person1.id);
        expect(ids, path).not.toContain(person2.id);
      }
    });

    it('history is scoped to the caller org for list, read, update and delete', async () => {
      const { org1, org2, user1 } = await seedTwoOrgs();
      const ownLog = await seedGenerationLog(org1.id);
      const foreignLog = await seedGenerationLog(org2.id);
      const token = await mintToken(user1.id, org1.id, ['documents.view', 'documents.manage']);

      const list = await call('GET', '/api/documents/history', token);
      const ids = ((await list.json()) as Array<{ id: string }>).map((r) => r.id);
      expect(ids).toEqual([ownLog]);

      expect((await call('GET', `/api/documents/history/${foreignLog}`, token)).status).toBe(404);
      expect((await call('PATCH', `/api/documents/history/${foreignLog}`, token, { notes: 'x' })).status).toBe(404);
      expect((await call('DELETE', `/api/documents/history/${foreignLog}`, token)).status).toBe(404);

      const stillThere = await getMiniflareDB().select().from(schema.documentGenerationLog)
        .where(eq(schema.documentGenerationLog.id, foreignLog)).get();
      expect(stillThere?.notes ?? null).toBeNull();
    });

    it('generate rejects an assembly from another org', async () => {
      const { org1, org2, user1 } = await seedTwoOrgs();
      const foreignAssembly = await seedAssembly(org2.id);
      const token = await mintToken(user1.id, org1.id, ['documents.generate']);

      const res = await call('POST', '/api/documents/generate', token, {
        assemblyId: foreignAssembly,
        workflowTypes: ['budget_approval'],
        budgetYear: 2025,
        assemblyNumber: 1,
        firstCallStart: '2025-04-01T10:00',
        secondCallStart: '2025-04-02T10:00',
        totalMembers: 10,
        presentMembers: 6,
        president: 'P',
        secretary: 'S',
        signatoryRole: 'Presidente',
        firstCallModality: 'in_person',
        secondCallModality: 'in_person',
        minutesOpeningModality: 'in_person',
      });

      expect(res.status).toBe(404);
    });
  });

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
