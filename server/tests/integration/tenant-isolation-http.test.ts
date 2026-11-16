import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import { zipSync, strToU8 } from 'fflate';
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

  /**
   * Issue a session token and store the same role/permissions on the membership,
   * since the session middleware reloads them from the DB on every request.
   */
  async function mintToken(userId: string, orgId: string, permissions: string[], role = 'core_admin') {
    await getMiniflareDB().update(schema.organizationUser)
      .set({ role, permissions: JSON.stringify(permissions) })
      .where(and(eq(schema.organizationUser.userId, userId), eq(schema.organizationUser.orgId, orgId)))
      .run();
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

  describe('updates cannot reassign server-owned fields', () => {
    it('PATCH /people/:id ignores orgId and userId in the body', async () => {
      const { org1, org2, user1, person1 } = await seedTwoOrgs();
      const token = await mintToken(user1.id, org1.id, ['people.edit']);

      const res = await call('PATCH', `/api/people/${person1.id}`, token, {
        firstName: 'Alicia',
        orgId: org2.id,
        userId: user1.id,
      });

      expect(res.status).toBe(200);
      const after = await getMiniflareDB().select().from(schema.person).where(eq(schema.person.id, person1.id)).get();
      expect(after?.orgId).toBe(org1.id);
      expect(after?.firstName).toBe('Alicia');
      expect(after?.userId ?? null).toBeNull();
    });

    it('PATCH /assemblies/:id ignores orgId in the body', async () => {
      const { org1, org2, user1 } = await seedTwoOrgs();
      const assemblyId = await seedAssembly(org1.id);
      const token = await mintToken(user1.id, org1.id, ['assemblies.edit']);

      const res = await call('PATCH', `/api/assemblies/${assemblyId}`, token, { notes: 'n', orgId: org2.id });

      expect(res.status).toBe(200);
      const after = await getMiniflareDB().select().from(schema.assembly).where(eq(schema.assembly.id, assemblyId)).get();
      expect(after?.orgId).toBe(org1.id);
      expect(after?.notes).toBe('n');
    });

    it('PATCH /convocations/:id ignores orgId in the body', async () => {
      const { org1, org2, user1 } = await seedTwoOrgs();
      const assemblyId = await seedAssembly(org1.id);
      const convocationId = crypto.randomUUID();
      await getMiniflareDB().insert(schema.convocation).values({
        id: convocationId, orgId: org1.id, assemblyId, date: '2025-03-01', createdAt: now, updatedAt: now,
      });
      const token = await mintToken(user1.id, org1.id, ['convocations.edit']);

      const res = await call('PATCH', `/api/convocations/${convocationId}`, token, { notes: 'n', orgId: org2.id });

      expect(res.status).toBe(200);
      const after = await getMiniflareDB().select().from(schema.convocation)
        .where(eq(schema.convocation.id, convocationId)).get();
      expect(after?.orgId).toBe(org1.id);
    });
  });

  describe('import', () => {
    function tsv(header: string[], rows: string[][]) {
      return [header, ...rows].map((r) => r.join('\t')).join('\n');
    }

    async function importZip(token: string, files: Record<string, string | Uint8Array>) {
      const tables = Object.keys(files)
        .filter((f) => f.endsWith('.tsv'))
        .map((f) => f.replace('.tsv', ''));
      const entries: Record<string, Uint8Array> = {
        'MANIFEST.json': strToU8(JSON.stringify({ tables })),
      };
      for (const [name, content] of Object.entries(files)) {
        entries[name] = typeof content === 'string' ? strToU8(content) : content;
      }
      const form = new FormData();
      form.append('file', new File([zipSync(entries)], 'backup.zip', { type: 'application/zip' }));
      return app.request(
        '/api/import',
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
        env(),
      );
    }

    it('does not overwrite or take over a row whose id belongs to another org', async () => {
      const { org1, org2, user1, person2 } = await seedTwoOrgs();
      const token = await mintToken(user1.id, org1.id, []);

      const res = await importZip(token, {
        'people.tsv': tsv(['id', 'firstName', 'lastName'], [[person2.id, 'Hijacked', 'Row']]),
      });

      expect(res.status).toBe(200);
      const after = await getMiniflareDB().select().from(schema.person).where(eq(schema.person.id, person2.id)).get();
      expect(after?.orgId).toBe(org2.id);
      expect(after?.firstName).toBe('Bob');
    });

    it('still updates the caller org’s own rows on re-import', async () => {
      const { org1, user1, person1 } = await seedTwoOrgs();
      const token = await mintToken(user1.id, org1.id, []);

      const res = await importZip(token, {
        'people.tsv': tsv(['id', 'firstName', 'lastName'], [[person1.id, 'Alicia', 'Restored']]),
      });

      expect(res.status).toBe(200);
      const after = await getMiniflareDB().select().from(schema.person).where(eq(schema.person.id, person1.id)).get();
      expect(after?.firstName).toBe('Alicia');
      expect(after?.orgId).toBe(org1.id);
    });

    it('skips rows that reference another org’s records', async () => {
      const { org1, user1, person2 } = await seedTwoOrgs();
      const token = await mintToken(user1.id, org1.id, []);
      const plantedId = crypto.randomUUID();

      const res = await importZip(token, {
        'volunteer_periods.tsv': tsv(
          ['id', 'personId', 'status', 'enrollmentDate'],
          [[plantedId, person2.id, 'active', '2025-01-01']],
        ),
      });

      expect(res.status).toBe(200);
      const planted = await getMiniflareDB().select().from(schema.volunteerPeriod)
        .where(eq(schema.volunteerPeriod.id, plantedId)).get();
      expect(planted).toBeUndefined();
    });

    it('rejects archives that inflate past the size limit', async () => {
      const { org1, user1 } = await seedTwoOrgs();
      const token = await mintToken(user1.id, org1.id, []);

      const res = await importZip(token, { 'padding.bin': new Uint8Array(60 * 1024 * 1024) });

      expect(res.status).toBe(400);
    });
  });

  describe('privilege boundaries', () => {
    const ADMIN_PERMS = ['settings.users.view', 'settings.users.manage', 'people.view'];

    async function seedAdmin() {
      const seeded = await seedTwoOrgs();
      const admin = await createTestUser({ email: 'admin@org1.local' });
      await createTestOrganizationUser(admin.id, seeded.org1.id, {
        role: 'admin',
        permissions: JSON.stringify(ADMIN_PERMS),
      });
      const token = await mintToken(admin.id, seeded.org1.id, ADMIN_PERMS, 'admin');
      return { ...seeded, admin, token };
    }

    it('an admin cannot create a core_admin or grant permissions they lack', async () => {
      const { token } = await seedAdmin();

      const asCore = await call('POST', '/api/settings/users', token, {
        email: 'new1@org1.local', password: 'pw-123456', role: 'core_admin',
      });
      expect(asCore.status).toBe(403);

      const extraPerm = await call('POST', '/api/settings/users', token, {
        email: 'new2@org1.local', password: 'pw-123456', role: 'manager',
        permissions: ['settings.users.reset_password'],
      });
      expect(extraPerm.status).toBe(403);

      const ok = await call('POST', '/api/settings/users', token, {
        email: 'new3@org1.local', password: 'pw-123456', role: 'manager', permissions: ['people.view'],
      });
      expect(ok.status).toBe(201);
    });

    it('an admin cannot change the email of a core_admin', async () => {
      const { token, user1 } = await seedAdmin();

      const res = await call('PUT', `/api/settings/users/${user1.id}`, token, { email: 'attacker@evil.test' });

      expect(res.status).toBe(403);
      const after = await getMiniflareDB().select().from(schema.user).where(eq(schema.user.id, user1.id)).get();
      expect(after?.email).toBe('admin1@org1.local');
    });

    it('nobody can change the email of a user who also belongs to another org', async () => {
      const { org1, org2, user1 } = await seedTwoOrgs();
      const shared = await createTestUser({ email: 'shared@both.local' });
      await createTestOrganizationUser(shared.id, org1.id, { role: 'viewer' });
      await createTestOrganizationUser(shared.id, org2.id, { role: 'core_admin' });
      const token = await mintToken(user1.id, org1.id, ['settings.users.manage']);

      const res = await call('PUT', `/api/settings/users/${shared.id}`, token, { email: 'attacker@evil.test' });

      expect(res.status).toBe(403);
    });

    it('invites cannot target another org or exceed the inviter’s role', async () => {
      const { token, org2 } = await seedAdmin();

      const otherOrg = await call('POST', '/api/auth/invites', token, { role: 'viewer', orgId: org2.id });
      expect(otherOrg.status).toBe(403);

      const tooHigh = await call('POST', '/api/auth/invites', token, { role: 'core_admin' });
      expect(tooHigh.status).toBe(403);

      const ok = await call('POST', '/api/auth/invites', token, { role: 'manager' });
      expect(ok.status).toBe(200);
    });
  });

  describe('references to another org are rejected', () => {
    it('periods, attendance, board and compliance writes refuse foreign ids', async () => {
      const { org1, org2, user1, person1, person2 } = await seedTwoOrgs();
      const ownAssembly = await seedAssembly(org1.id);
      const foreignAssembly = await seedAssembly(org2.id);
      const foreignGeneration = crypto.randomUUID();
      await getMiniflareDB().insert(schema.boardGeneration).values({
        id: foreignGeneration, orgId: org2.id, name: 'B', startDate: '2025-01-01', createdAt: now,
      });
      const token = await mintToken(user1.id, org1.id, [
        'people.edit', 'assemblies.edit', 'convocations.edit', 'settings.users.manage',
      ]);

      const attempts: Array<[string, string, unknown]> = [
        ['POST', '/api/periods/volunteers', { personId: person2.id }],
        ['POST', `/api/assemblies/${ownAssembly}/attendance`, { personId: person2.id, mode: 'in_person' }],
        ['POST', `/api/assemblies/${ownAssembly}/attendance`, { personId: person1.id, mode: 'proxy', delegatorId: person2.id }],
        ['POST', `/api/assemblies/${foreignAssembly}/attendance`, { personId: person1.id, mode: 'in_person' }],
        ['POST', `/api/generations/board/${foreignGeneration}/members`, { personId: person1.id, role: 'president' }],
        ['POST', '/api/convocations', { assemblyId: foreignAssembly }],
        ['POST', '/api/compliance/roles', { personId: person2.id, roleType: 'Presidente' }],
      ];
      for (const [method, path, body] of attempts) {
        const res = await call(method, path, token, body);
        expect(res.status, `${method} ${path} ${JSON.stringify(body)}`).toBe(404);
      }

      const planted = await getMiniflareDB().select().from(schema.volunteerPeriod)
        .where(eq(schema.volunteerPeriod.personId, person2.id)).all();
      expect(planted).toEqual([]);
    });

    it('agenda members outside the org are not linked', async () => {
      const { org1, user1, person1, person2 } = await seedTwoOrgs();
      const assemblyId = await seedAssembly(org1.id);
      const convocationId = crypto.randomUUID();
      await getMiniflareDB().insert(schema.convocation).values({
        id: convocationId, orgId: org1.id, assemblyId, date: '2025-03-01', createdAt: now, updatedAt: now,
      });
      const token = await mintToken(user1.id, org1.id, ['assemblies.edit']);

      const res = await call('POST', `/api/convocations/${convocationId}/agenda`, token, {
        number: 1, title: 'Ammissione', memberIds: [person1.id, person2.id],
      });

      expect(res.status).toBe(201);
      const { id: itemId } = (await res.json()) as { id: string };
      const links = await getMiniflareDB().select().from(schema.agendaItemPerson)
        .where(eq(schema.agendaItemPerson.agendaItemId, itemId)).all();
      expect(links.map((l) => l.personId)).toEqual([person1.id]);
    });

    it('a foreign person planted directly in the DB is not exposed through member listings', async () => {
      const { org1, user1, person2 } = await seedTwoOrgs();
      await seedActiveMember(org1.id, person2.id); // org1 period row pointing at org2's person
      const token = await mintToken(user1.id, org1.id, ['people.view']);

      const res = await call('GET', '/api/periods/members', token);

      expect(res.status).toBe(200);
      const rows = (await res.json()) as Array<{ person: { id: string } }>;
      expect(rows.map((r) => r.person.id)).not.toContain(person2.id);
    });
  });

  describe('compliance', () => {
    const RULES = (tag: string) => ({
      documentTypes: { [tag]: { label: tag } },
      roles: {},
      baseRequirements: { isVolunteer: [tag], isSocio: [], isBoard: [] },
    });

    it('rules are stored and read per org', async () => {
      const { org1, org2, user1, user2 } = await seedTwoOrgs();
      const token1 = await mintToken(user1.id, org1.id, ['people.view']);
      const token2 = await mintToken(user2.id, org2.id, ['people.view']);

      expect((await call('PUT', '/api/compliance/rules', token1, RULES('org1doc'))).status).toBe(200);
      expect((await call('PUT', '/api/compliance/rules', token2, RULES('org2doc'))).status).toBe(200);

      const rules1 = (await (await call('GET', '/api/compliance/rules', token1)).json()) as ReturnType<typeof RULES>;
      const rules2 = (await (await call('GET', '/api/compliance/rules', token2)).json()) as ReturnType<typeof RULES>;
      expect(Object.keys(rules1.documentTypes)).toEqual(['org1doc']);
      expect(Object.keys(rules2.documentTypes)).toEqual(['org2doc']);
    });

    it('a role row planted by another org does not anchor a person’s retention', async () => {
      const { org1, org2, user2, person2 } = await seedTwoOrgs();
      await getMiniflareDB().insert(schema.complianceRole).values({
        id: crypto.randomUUID(), orgId: org1.id, personId: person2.id, roleType: 'Presidente',
        createdAt: now, updatedAt: now,
      });
      const token2 = await mintToken(user2.id, org2.id, ['people.edit']);

      expect((await call('POST', '/api/compliance/recompute', token2)).status).toBe(200);

      const after = await getMiniflareDB().select().from(schema.person).where(eq(schema.person.id, person2.id)).get();
      expect(after?.canBeRemoved).toBe(1);
    });
  });

  describe('session', () => {
    it('a demotion applies to existing tokens immediately', async () => {
      const { org1, user1 } = await seedTwoOrgs();
      const token = await mintToken(user1.id, org1.id, ['people.view']);
      expect((await call('GET', '/api/people', token)).status).toBe(200);

      await getMiniflareDB().update(schema.organizationUser)
        .set({ role: 'viewer', permissions: JSON.stringify([]) })
        .where(and(eq(schema.organizationUser.userId, user1.id), eq(schema.organizationUser.orgId, org1.id)))
        .run();

      expect((await call('GET', '/api/people', token)).status).toBe(403);
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
