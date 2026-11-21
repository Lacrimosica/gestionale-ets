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
const PERMISSIONS = ['convocations.view', 'convocations.edit', 'assemblies.view', 'assemblies.edit'];

type AgendaMember = { id: string; name: string };
type AgendaItemResponse = {
  id: string;
  workflowType: string | null;
  description: string | null;
  workflowData: string | null;
  memberIds: string[];
  members: AgendaMember[];
};

/**
 * Agenda members are linked by person id (agenda_item_person) and read back with
 * display names, so the assembly UI can edit them and documents can print them.
 */
describe('Convocation agenda members', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  const env = () => ({ DB: getMiniflareRawDB(), JWT_SECRET });

  async function mintToken(userId: string, orgId: string) {
    // The session middleware reloads permissions from the membership row.
    await getMiniflareDB().update(schema.organizationUser)
      .set({ role: 'core_admin', permissions: JSON.stringify(PERMISSIONS) })
      .where(and(eq(schema.organizationUser.userId, userId), eq(schema.organizationUser.orgId, orgId)))
      .run();
    return sign(
      { sub: userId, email: `${userId}@test.local`, orgId, role: 'core_admin', permissions: PERMISSIONS, exp: Math.floor(Date.now() / 1000) + 3600 },
      JWT_SECRET,
    );
  }

  async function seed() {
    const org1 = await createTestOrganization({ slug: 'org1', name: 'Org 1' });
    const org2 = await createTestOrganization({ slug: 'org2', name: 'Org 2' });
    const user1 = await createTestUser({ email: 'admin1@org1.local' });
    await createTestOrganizationUser(user1.id, org1.id, { role: 'core_admin' });
    const alice = await createTestPerson(org1.id, { firstName: 'Alice', lastName: 'Bianchi' });
    const bruno = await createTestPerson(org1.id, { firstName: 'Bruno', lastName: 'Verdi' });
    const outsider = await createTestPerson(org2.id, { firstName: 'Olga', lastName: 'Esterna' });

    const now = new Date().toISOString();
    const assemblyId = crypto.randomUUID();
    const convocationId = crypto.randomUUID();
    const db = getMiniflareDB();
    await db.insert(schema.assembly).values({
      id: assemblyId, orgId: org1.id, type: 'ordinary', totalNumber: 1, referenceNumber: 1,
      location: 'Sede', mode: 'in_person', createdAt: now, updatedAt: now,
    }).run();
    await db.insert(schema.convocation).values({
      id: convocationId, orgId: org1.id, assemblyId, date: '2026-01-01', createdAt: now, updatedAt: now,
    }).run();

    const token = await mintToken(user1.id, org1.id);
    return { org1, alice, bruno, outsider, convocationId, token };
  }

  const call = (token: string, method: string, path: string, body?: unknown) => app.request(
    `/api/convocations${path}`,
    {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    env(),
  );

  const junctionPersonIds = async (agendaItemId: string) =>
    (await getMiniflareDB().select({ personId: schema.agendaItemPerson.personId })
      .from(schema.agendaItemPerson)
      .where(eq(schema.agendaItemPerson.agendaItemId, agendaItemId))
      .all()).map((r) => r.personId).sort();

  it('links only own-org person ids and returns them with names', async () => {
    const { alice, bruno, outsider, convocationId, token } = await seed();

    const res = await call(token, 'POST', `/${convocationId}/agenda`, {
      number: 1,
      title: 'Ammissione soci',
      workflowType: 'member_admission',
      memberIds: [bruno.id, alice.id, outsider.id, 'Mario Rossi'],
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as AgendaItemResponse;
    expect(created.members).toEqual([
      { id: alice.id, name: 'Alice Bianchi' },
      { id: bruno.id, name: 'Bruno Verdi' },
    ]);
    expect(await junctionPersonIds(created.id)).toEqual([alice.id, bruno.id].sort());

    const detail = await call(token, 'GET', `/${convocationId}`);
    expect(detail.status).toBe(200);
    const { agendaItems } = (await detail.json()) as { agendaItems: AgendaItemResponse[] };
    expect(agendaItems).toHaveLength(1);
    expect(agendaItems[0].memberIds.sort()).toEqual([alice.id, bruno.id].sort());
    expect(agendaItems[0].members.map((m) => m.name)).toEqual(['Alice Bianchi', 'Bruno Verdi']);
  });

  it('still accepts ids in workflowData.members from older clients', async () => {
    const { alice, convocationId, token } = await seed();

    const res = await call(token, 'POST', `/${convocationId}/agenda`, {
      number: 1,
      title: 'Ammissione soci',
      workflowType: 'member_admission',
      workflowData: { members: [alice.id], budgetYear: 2025 },
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as AgendaItemResponse;
    expect(await junctionPersonIds(created.id)).toEqual([alice.id]);
    expect(JSON.parse(created.workflowData ?? '{}')).toEqual({ budgetYear: 2025 });
  });

  it('PATCH of workflow config keeps type/description and legacy names, replaces members', async () => {
    const { org1, alice, bruno, convocationId, token } = await seed();

    // Legacy row: names as text in workflow_data, nothing in the junction.
    const itemId = crypto.randomUUID();
    await getMiniflareDB().insert(schema.agendaItem).values({
      id: itemId, orgId: org1.id, convocationId, number: 1, title: 'Ammissione soci',
      description: 'Descrizione', workflowType: 'member_admission',
      workflowData: JSON.stringify({ members: ['Mario Rossi'] }), createdAt: new Date().toISOString(),
    }).run();

    // Saving voting only: no people picked yet, legacy names sent back untouched.
    const voting = [{ label: 'Favorevoli', count: 3 }];
    let res = await call(token, 'PATCH', `/${convocationId}/agenda/${itemId}`, {
      workflowData: { members: ['Mario Rossi'], voting },
      memberIds: [],
    });
    expect(res.status).toBe(200);
    let row = await getMiniflareDB().select().from(schema.agendaItem).where(eq(schema.agendaItem.id, itemId)).get();
    expect(row?.workflowType).toBe('member_admission');
    expect(row?.description).toBe('Descrizione');
    expect(JSON.parse(row?.workflowData ?? '{}')).toEqual({ members: ['Mario Rossi'], voting });
    expect(await junctionPersonIds(itemId)).toEqual([]);

    // Picking people: legacy names dropped by the client, junction replaced.
    res = await call(token, 'PATCH', `/${convocationId}/agenda/${itemId}`, {
      workflowData: { voting },
      memberIds: [alice.id, bruno.id],
    });
    expect(res.status).toBe(200);
    const patched = (await res.json()) as AgendaItemResponse;
    expect(patched.members.map((m) => m.id)).toEqual([alice.id, bruno.id]);
    row = await getMiniflareDB().select().from(schema.agendaItem).where(eq(schema.agendaItem.id, itemId)).get();
    expect(JSON.parse(row?.workflowData ?? '{}')).toEqual({ voting });

    // A title-only edit doesn't touch members.
    res = await call(token, 'PATCH', `/${convocationId}/agenda/${itemId}`, { title: 'Nuovo titolo' });
    expect(res.status).toBe(200);
    expect(await junctionPersonIds(itemId)).toEqual([alice.id, bruno.id].sort());
  });
});
