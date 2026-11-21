import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { convocation, user, assembly, agendaItem, agendaItemPerson, person } from '../db/schema';
import { eq, or, and, inArray } from 'drizzle-orm';
import { withoutServerOwnedFields } from '../lib/request-body';
import { ownedByOrg } from '../lib/org-context';

const invalidReference = (c: any) => c.json({ error: 'Referenced record not found in this organization' }, 404);

/**
 * Keep only ids of people in the caller's org. Agenda members are best-effort
 * links (older clients sent display names), so unknown values are dropped
 * rather than rejected — but another org's person ids must never be linked.
 */
const ownPersonIds = async (db: Parameters<typeof ownedByOrg>[0], orgId: string, ids: unknown): Promise<string[]> => {
  if (!Array.isArray(ids)) return [];
  const candidates = [...new Set(ids.filter((id): id is string => typeof id === 'string' && id !== ''))];
  if (candidates.length === 0) return [];
  const rows = await db.select({ id: person.id }).from(person)
    .where(and(eq(person.orgId, orgId), inArray(person.id, candidates)))
    .all();
  return rows.map((r) => r.id);
};

type AgendaMember = { id: string; name: string };

/**
 * Agenda members (junction rows) with display names, keyed by agenda item id.
 * Both sides are org-filtered so a stray cross-org junction row can never leak a
 * name. The junction has no ordinal, so names are sorted for a stable display.
 */
const agendaMembersByItem = async (
  db: Parameters<typeof ownedByOrg>[0],
  orgId: string,
  itemIds: string[],
): Promise<Map<string, AgendaMember[]>> => {
  const byItem = new Map<string, AgendaMember[]>();
  if (itemIds.length === 0) return byItem;
  const rows = await db
    .select({
      agendaItemId: agendaItemPerson.agendaItemId,
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
    })
    .from(agendaItemPerson)
    .innerJoin(person, and(eq(person.id, agendaItemPerson.personId), eq(person.orgId, orgId)))
    .where(and(eq(agendaItemPerson.orgId, orgId), inArray(agendaItemPerson.agendaItemId, itemIds)))
    .all();
  for (const row of rows) {
    const list = byItem.get(row.agendaItemId) ?? [];
    list.push({ id: row.id, name: `${row.firstName} ${row.lastName}` });
    byItem.set(row.agendaItemId, list);
  }
  for (const list of byItem.values()) list.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  return byItem;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');

/**
 * Split an agenda request into junction person ids and the workflow_data to store.
 *
 * - `memberIds` (current client): ids go to the junction; `workflowData.members`,
 *   if still a string array, is kept verbatim as legacy display names from before
 *   the junction existed, so saving e.g. voting results doesn't silently erase them.
 * - no `memberIds` (older clients): `workflowData.members` is read as person ids,
 *   as before, and stripped from workflow_data.
 *
 * `personIds` is undefined when the request doesn't touch members at all.
 */
const splitAgendaMembers = async (
  db: Parameters<typeof ownedByOrg>[0],
  orgId: string,
  body: { memberIds?: unknown; workflowData?: unknown },
): Promise<{ personIds?: string[]; workflowData?: Record<string, unknown> }> => {
  const rawData = body.workflowData;
  const workflowData = rawData && typeof rawData === 'object' && !Array.isArray(rawData)
    ? { ...(rawData as Record<string, unknown>) }
    : undefined;

  if (Array.isArray(body.memberIds)) {
    if (workflowData && !isStringArray(workflowData.members)) delete workflowData.members;
    return { personIds: await ownPersonIds(db, orgId, body.memberIds), workflowData };
  }

  if (workflowData && 'members' in workflowData) {
    const personIds = await ownPersonIds(db, orgId, workflowData.members);
    delete workflowData.members;
    return { personIds, workflowData };
  }

  return { workflowData };
};

const insertAgendaMembers = async (
  db: Parameters<typeof ownedByOrg>[0],
  orgId: string,
  agendaItemId: string,
  personIds: string[],
) => {
  if (personIds.length === 0) return;
  const createdAt = new Date().toISOString();
  await db.insert(agendaItemPerson).values(personIds.map((personId) => ({
    id: crypto.randomUUID(),
    agendaItemId,
    orgId,
    personId,
    role: null,
    createdAt,
  }))).run();
};

type Bindings = { DB: D1Database };

type Variables = {
  jwtPayload: {
    sub: string;
    email: string;
    orgId: string;
    role: string;
    permissions?: string[];
    exp: number;
  };
};

const convocationsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const parsePermissions = (value?: string | null) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const requirePermission = async (c: any, permission: string) => {
  const payload = c.get('jwtPayload');
  // Permissions now come from JWT payload (sourced from organization_user table)
  const permissions = payload.permissions || [];
  if (!permissions.includes(permission)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  return null;
};

const sortRows = <T extends Record<string, unknown>>(rows: T[], sortBy: string, order: string) => (
  [...rows].sort((a, b) => {
    const left = (a[sortBy as keyof T] as string | null | undefined) ?? '';
    const right = (b[sortBy as keyof T] as string | null | undefined) ?? '';
    return order === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
  })
);


// GET /api/convocations - list all, optional ?assemblyId= & ?sortBy= & ?order=
convocationsRouter.get('/', async (c) => {
  const denied = await requirePermission(c, 'convocations.view');
  if (denied) return denied;

  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const assemblyId = c.req.query('assemblyId');
  const sortBy = c.req.query('sortBy') || 'date';
  const order = c.req.query('order') || 'desc';

  const all = await db.select().from(convocation).where(eq(convocation.orgId, orgId)).all();

  if (assemblyId) {
    const filtered = all.filter((row) => row.assemblyId === assemblyId || row.secondAssemblyId === assemblyId);
    return c.json(sortRows(filtered, sortBy, order));
  }

  return c.json(sortRows(all, sortBy, order));
});

// GET /api/convocations/:id — full detail with both assemblies and agenda items
convocationsRouter.get('/:id', async (c) => {
  const denied = await requirePermission(c, 'convocations.view');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const row = await db.select().from(convocation).where(and(eq(convocation.id, id), eq(convocation.orgId, orgId))).get();
  if (!row) return c.json({ error: 'Convocation not found' }, 404);

  const [assembly1, assembly2, agendaItems] = await Promise.all([
    db.select().from(assembly).where(and(eq(assembly.id, row.assemblyId), eq(assembly.orgId, orgId))).get(),
    row.secondAssemblyId
      ? db.select().from(assembly).where(and(eq(assembly.id, row.secondAssemblyId), eq(assembly.orgId, orgId))).get()
      : Promise.resolve(null),
    db.select().from(agendaItem)
      .where(and(eq(agendaItem.convocationId, id), eq(agendaItem.orgId, orgId)))
      .all(),
  ]);

  // memberIds kept for older clients; members carries ids + display names so the
  // UI can show people who aren't in its candidate list (e.g. ex-volunteers).
  const membersByItem = await agendaMembersByItem(db, orgId, agendaItems.map((item) => item.id));
  const agendaItemsWithMembers = agendaItems.map((item) => {
    const members = membersByItem.get(item.id) ?? [];
    return { ...item, memberIds: members.map((m) => m.id), members };
  });

  // Resolve officer names for both assemblies
  const resolveOfficerNames = async (a: typeof assembly.$inferSelect | null | undefined) => {
    if (!a) return null;
    const [pres, sec] = await Promise.all([
      a.presidentId ? db.select({ firstName: person.firstName, lastName: person.lastName }).from(person).where(and(eq(person.id, a.presidentId), eq(person.orgId, orgId))).get() : null,
      a.secretaryId ? db.select({ firstName: person.firstName, lastName: person.lastName }).from(person).where(and(eq(person.id, a.secretaryId), eq(person.orgId, orgId))).get() : null,
    ]);
    return {
      ...a,
      presidentName: pres ? `${pres.firstName} ${pres.lastName}` : '',
      secretaryName: sec ? `${sec.firstName} ${sec.lastName}` : '',
    };
  };

  const [enrichedA1, enrichedA2] = await Promise.all([
    resolveOfficerNames(assembly1),
    resolveOfficerNames(assembly2),
  ]);

  return c.json({
    ...row,
    assembly1: enrichedA1 ?? null,
    assembly2: enrichedA2 ?? null,
    agendaItems: agendaItemsWithMembers.sort((a, b) => a.number - b.number),
  });
});

// POST /api/convocations
convocationsRouter.post('/', async (c) => {
  const denied = await requirePermission(c, 'convocations.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  if (!body.assemblyId) {
    return c.json({ error: 'Main assembly is required' }, 400);
  }

  if (body.secondAssemblyId && body.secondAssemblyId === body.assemblyId) {
    return c.json({ error: 'The two linked assemblies must be different' }, 400);
  }
  if (!(await ownedByOrg(db, orgId, assembly, [body.assemblyId, body.secondAssemblyId]))) {
    return invalidReference(c);
  }

  const row = {
    id,
    assemblyId: body.assemblyId,
    secondAssemblyId: body.secondAssemblyId ?? null,
    orgId: orgId,
    date: body.date || body.convocationDate || now.split('T')[0],
    content: body.content ?? undefined,
    documentLink: body.documentLink ?? undefined,
    proxyFormLink: body.proxyFormLink ?? undefined,
    notes: body.notes ?? undefined,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(convocation).values(row).run();
  return c.json(row, 201);
});

// PATCH /api/convocations/:id
convocationsRouter.patch('/:id', async (c) => {
  const denied = await requirePermission(c, 'convocations.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(convocation).where(and(eq(convocation.id, id), eq(convocation.orgId, orgId))).get();

  if (!existing) {
    return c.json({ error: 'Convocation not found' }, 404);
  }

  const effectiveAssemblyId = body.assemblyId ?? existing.assemblyId;
  const effectiveSecondAssemblyId = body.secondAssemblyId ?? existing.secondAssemblyId;

  if (effectiveSecondAssemblyId && effectiveSecondAssemblyId === effectiveAssemblyId) {
    return c.json({ error: 'The two linked assemblies must be different' }, 400);
  }
  if (!(await ownedByOrg(db, orgId, assembly, [body.assemblyId, body.secondAssemblyId]))) {
    return invalidReference(c);
  }

  await db.update(convocation)
    .set({ ...withoutServerOwnedFields(body), updatedAt: new Date().toISOString() })
    .where(and(eq(convocation.id, id), eq(convocation.orgId, orgId)))
    .run();
  return c.json({ success: true });
});

// DELETE /api/convocations/:id
convocationsRouter.delete('/:id', async (c) => {
  const denied = await requirePermission(c, 'convocations.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  await db.delete(agendaItem).where(and(eq(agendaItem.convocationId, id), eq(agendaItem.orgId, orgId))).run();
  await db.delete(convocation).where(and(eq(convocation.id, id), eq(convocation.orgId, orgId))).run();
  return c.json({ success: true });
});

// POST /api/convocations/:id/agenda
convocationsRouter.post('/:id/agenda', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const convocationId = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const conv = await db.select().from(convocation).where(and(eq(convocation.id, convocationId), eq(convocation.orgId, orgId))).get();
  if (!conv) return c.json({ error: 'Convocation not found' }, 404);

  const itemId = crypto.randomUUID();
  const { personIds = [], workflowData = {} } = await splitAgendaMembers(db, orgId, body);

  const newItem = {
    id: itemId,
    convocationId,
    orgId: orgId,
    number: body.number,
    title: body.title,
    description: body.description ?? null,
    resolution: body.resolution ?? null,
    workflowType: body.workflowType ?? null,
    workflowData: Object.keys(workflowData).length > 0 ? JSON.stringify(workflowData) : null,
    createdAt: new Date().toISOString(),
  };
  await db.insert(agendaItem).values(newItem).run();
  await insertAgendaMembers(db, orgId, itemId, personIds);

  const members = (await agendaMembersByItem(db, orgId, [itemId])).get(itemId) ?? [];
  return c.json({ ...newItem, memberIds: members.map((m) => m.id), members }, 201);
});

// PATCH /api/convocations/:id/agenda/:itemId
convocationsRouter.patch('/:id/agenda/:itemId', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const itemId = c.req.param('itemId');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const item = await db.select({ id: agendaItem.id }).from(agendaItem)
    .where(and(eq(agendaItem.id, itemId), eq(agendaItem.orgId, orgId))).get();
  if (!item) return c.json({ error: 'Agenda item not found' }, 404);

  const { personIds, workflowData } = await splitAgendaMembers(db, orgId, body);

  // Only touch fields the client sent: the workflow panel saves just
  // workflowData/memberIds (+ title), and defaulting the rest to null used to
  // wipe the item's workflowType and description.
  const updates: Partial<typeof agendaItem.$inferInsert> = {};
  if (body.number !== undefined) updates.number = body.number;
  if (body.title !== undefined) updates.title = body.title;
  if ('description' in body) updates.description = body.description ?? null;
  if ('resolution' in body) updates.resolution = body.resolution ?? null;
  if ('workflowType' in body) updates.workflowType = body.workflowType ?? null;
  if (workflowData !== undefined) updates.workflowData = JSON.stringify(workflowData);
  if (Object.keys(updates).length > 0) {
    await db.update(agendaItem).set(updates)
      .where(and(eq(agendaItem.id, itemId), eq(agendaItem.orgId, orgId))).run();
  }

  if (personIds !== undefined) {
    await db.delete(agendaItemPerson).where(and(eq(agendaItemPerson.agendaItemId, itemId), eq(agendaItemPerson.orgId, orgId))).run();
    await insertAgendaMembers(db, orgId, itemId, personIds);
  }

  const members = (await agendaMembersByItem(db, orgId, [itemId])).get(itemId) ?? [];
  return c.json({ id: itemId, ...body, memberIds: members.map((m) => m.id), members });
});

// DELETE /api/convocations/:id/agenda/:itemId
convocationsRouter.delete('/:id/agenda/:itemId', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const itemId = c.req.param('itemId');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  await db.delete(agendaItemPerson).where(and(eq(agendaItemPerson.agendaItemId, itemId), eq(agendaItemPerson.orgId, orgId))).run();
  await db.delete(agendaItem).where(and(eq(agendaItem.id, itemId), eq(agendaItem.orgId, orgId))).run();
  return c.json({ success: true });
});

export { convocationsRouter };
