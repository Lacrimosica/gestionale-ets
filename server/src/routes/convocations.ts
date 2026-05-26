import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { convocation, user, assembly, agendaItem, agendaItemPerson, person } from '../db/schema';
import { eq, or, and } from 'drizzle-orm';

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

  // Fetch members for each agenda item from junction table
  const agendaItemsWithMembers = await Promise.all(
    agendaItems.map(async (item: any) => {
      const members = await db.select({ personId: agendaItemPerson.personId })
        .from(agendaItemPerson)
        .where(and(eq(agendaItemPerson.agendaItemId, item.id), eq(agendaItemPerson.orgId, orgId)))
        .all();
      return {
        ...item,
        memberIds: members.map((m: any) => m.personId),
      };
    })
  );

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

  await db.update(convocation)
    .set({ ...body, updatedAt: new Date().toISOString() })
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

  // Prepare workflowData without members (they go to junction table now)
  const workflowData = body.workflowData ? { ...body.workflowData } : {};
  const memberIds = workflowData.members || body.memberIds || [];
  delete workflowData.members;

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

  // Write members to junction table
  if (Array.isArray(memberIds) && memberIds.length > 0) {
    const junctionRows = memberIds
      .filter((id: string) => id && typeof id === 'string')
      .map((personId: string) => ({
        id: crypto.randomUUID(),
        agendaItemId: itemId,
        orgId: orgId,
        personId,
        role: null,
        createdAt: new Date().toISOString(),
      }));
    if (junctionRows.length > 0) {
      await db.insert(agendaItemPerson).values(junctionRows).run();
    }
  }

  return c.json(newItem, 201);
});

// PATCH /api/convocations/:id/agenda/:itemId
convocationsRouter.patch('/:id/agenda/:itemId', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const itemId = c.req.param('itemId');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const workflowData = body.workflowData ? { ...body.workflowData } : undefined;
  const memberIds = workflowData?.members || body.memberIds;
  if (workflowData) {
    delete workflowData.members;
  }

  await db.update(agendaItem).set({
    number: body.number,
    title: body.title,
    description: body.description ?? null,
    workflowType: body.workflowType ?? null,
    workflowData: workflowData !== undefined ? JSON.stringify(workflowData) : undefined,
  }).where(and(eq(agendaItem.id, itemId), eq(agendaItem.orgId, orgId))).run();

  // Update junction table if memberIds provided
  if (Array.isArray(memberIds)) {
    // Delete existing members for this item
    await db.delete(agendaItemPerson).where(and(eq(agendaItemPerson.agendaItemId, itemId), eq(agendaItemPerson.orgId, orgId))).run();

    // Insert new members
    if (memberIds.length > 0) {
      const junctionRows = memberIds
        .filter((id: string) => id && typeof id === 'string')
        .map((personId: string) => ({
          id: crypto.randomUUID(),
          agendaItemId: itemId,
          orgId: orgId,
          personId,
          role: null,
          createdAt: new Date().toISOString(),
        }));
      if (junctionRows.length > 0) {
        await db.insert(agendaItemPerson).values(junctionRows).run();
      }
    }
  }

  return c.json({ id: itemId, ...body });
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
