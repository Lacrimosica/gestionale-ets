import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { assembly, agendaItem, attendance, user, convocation, memberPeriod, documentGenerationLog, person } from '../db/schema';
import { recomputeRetentionForAssembly } from '../lib/retention';
import { eq, desc, and, not, sql, or, lte, gte, isNull } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
};

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

const assembliesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

assembliesRouter.get('/', async (c) => {
  const denied = await requirePermission(c, 'assemblies.view');
  if (denied) return denied;

  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const [assemblies, convocations] = await Promise.all([
    db.select().from(assembly).where(eq(assembly.orgId, orgId)).orderBy(desc(assembly.totalNumber)).all(),
    db.select().from(convocation).where(eq(convocation.orgId, orgId)).all(),
  ]);

  // Build a map: assemblyId → pairing info
  type PairingInfo = { convocationId: string; convocationDate: string | null; pairedAssemblyId: string | null; pairedAssemblyNumber: number | null; isPrimaryAssembly: boolean };
  const pairingMap = new Map<string, PairingInfo>();
  for (const conv of convocations) {
    const partnerOf1a = assemblies.find((a) => a.id === conv.secondAssemblyId);
    const partnerOf2a = assemblies.find((a) => a.id === conv.assemblyId);
    pairingMap.set(conv.assemblyId, {
      convocationId: conv.id,
      convocationDate: conv.date,
      pairedAssemblyId: conv.secondAssemblyId ?? null,
      pairedAssemblyNumber: partnerOf1a?.totalNumber ?? null,
      isPrimaryAssembly: true,
    });
    if (conv.secondAssemblyId) {
      pairingMap.set(conv.secondAssemblyId, {
        convocationId: conv.id,
        convocationDate: conv.date,
        pairedAssemblyId: conv.assemblyId,
        pairedAssemblyNumber: partnerOf2a?.totalNumber ?? null,
        isPrimaryAssembly: false,
      });
    }
  }

  const result = assemblies.map((a) => ({
    ...a,
    ...(pairingMap.get(a.id) ?? { convocationId: null, convocationDate: null, pairedAssemblyId: null, pairedAssemblyNumber: null, isPrimaryAssembly: null }),
  }));

  return c.json(result);
});

assembliesRouter.get('/:id', async (c) => {
  const denied = await requirePermission(c, 'assemblies.view');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const assemblyData = await db.select().from(assembly).where(and(eq(assembly.id, id), eq(assembly.orgId, orgId))).get();
  if (!assemblyData) return c.json({ error: 'Assembly not found' }, 404);

  const participants = await db.select().from(attendance).where(and(eq(attendance.assemblyId, id), eq(attendance.orgId, orgId))).all();

  // Find this assembly's convocation (may be primary or secondary)
  const allConvocations = await db.select().from(convocation).where(eq(convocation.orgId, orgId)).all();
  const ownConvocation = allConvocations.find(
    (c) => c.assemblyId === id || c.secondAssemblyId === id
  ) ?? null;

  // agendaItems now live on the convocation
  const agendaItems = ownConvocation
    ? await db.select().from(agendaItem).where(and(eq(agendaItem.convocationId, ownConvocation.id), eq(agendaItem.orgId, orgId))).all()
    : [];

  // Resolve president/secretary display names
  const [presidentPerson, secretaryPerson] = await Promise.all([
    assemblyData.presidentId
      ? db.select({ firstName: person.firstName, lastName: person.lastName }).from(person).where(and(eq(person.id, assemblyData.presidentId), eq(person.orgId, orgId))).get()
      : null,
    assemblyData.secretaryId
      ? db.select({ firstName: person.firstName, lastName: person.lastName }).from(person).where(and(eq(person.id, assemblyData.secretaryId), eq(person.orgId, orgId))).get()
      : null,
  ]);
  const presidentName = presidentPerson ? `${presidentPerson.firstName} ${presidentPerson.lastName}` : '';
  const secretaryName = secretaryPerson ? `${secretaryPerson.firstName} ${secretaryPerson.lastName}` : '';

  return c.json({
    ...assemblyData,
    presidentName,
    secretaryName,
    convocationId: ownConvocation?.id ?? null,
    convocationDate: ownConvocation?.date ?? null,
    pairedAssemblyId: ownConvocation
      ? (ownConvocation.assemblyId === id ? ownConvocation.secondAssemblyId : ownConvocation.assemblyId)
      : null,
    agendaItems,
    participants,
  });
});

assembliesRouter.post('/', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();

  // 1. Calculate totalNumber
  const lastTotal = await db.select({ max: sql<number>`max(total_number)` }).from(assembly).where(eq(assembly.orgId, orgId)).get();
  const totalNumber = (Number(lastTotal?.max) || 0) + 1;

  // 2. Calculate referenceNumber and referenceYear
  let referenceNumber = 1;
  let referenceYear: number | null = null;

  if (body.type === 'board_council') {
    const lastBoard = await db.select({ max: sql<number>`max(reference_number)` })
      .from(assembly)
      .where(and(
        eq(assembly.type, 'board_council'),
        eq(assembly.boardGenerationId, body.boardGenerationId),
        eq(assembly.orgId, orgId)
      ))
      .get();
    referenceNumber = (Number(lastBoard?.max) || 0) + 1;
  } else {
    referenceYear = body.firstCallDate ? new Date(body.firstCallDate).getFullYear() : new Date().getFullYear();
    const lastAnnual = await db.select({ max: sql<number>`max(reference_number)` })
      .from(assembly)
      .where(and(
         not(eq(assembly.type, 'board_council')),
         eq(assembly.referenceYear, referenceYear),
         eq(assembly.orgId, orgId)
      ))
      .get();
    referenceNumber = (Number(lastAnnual?.max) || 0) + 1;
  }

  const { convocationDate: bodyConvDate, ...assemblyFields } = body;

  const newAssembly = {
    id,
    ...assemblyFields,
    orgId: orgId,
    boardGenerationId: body.boardGenerationId || null,
    totalNumber,
    referenceNumber,
    referenceYear,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let convId: string | null = null;
  const batchRequests: any[] = [
    db.insert(assembly).values(newAssembly)
  ];

  if (bodyConvDate) {
    convId = crypto.randomUUID();
    const now = new Date().toISOString();
    batchRequests.push(
      db.insert(convocation).values({
        id: convId,
        assemblyId: id,
        orgId: orgId,
        date: bodyConvDate,
        createdAt: now,
        updatedAt: now,
      })
    );
  }

  await db.batch(batchRequests as [any, ...any[]]);

  return c.json({ ...newAssembly, convocationId: convId }, 201);
});

assembliesRouter.patch('/:id', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const { convocationDate: bodyConvDate, presidentName: _pn, secretaryName: _sn, ...assemblyFields } = body;
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(assembly).where(and(eq(assembly.id, id), eq(assembly.orgId, orgId))).get();
  if (!existing) return c.json({ error: 'Assembly not found' }, 404);

  const ownConvocation = bodyConvDate !== undefined
    ? await db.select().from(convocation)
        .where(and(or(eq(convocation.assemblyId, id), eq(convocation.secondAssemblyId, id)), eq(convocation.orgId, orgId)))
        .get()
    : null;

  const updates: any[] = [];
  if (Object.keys(assemblyFields).length > 0) {
    updates.push(
      db.update(assembly)
        .set({
          ...assemblyFields,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(assembly.id, id), eq(assembly.orgId, orgId)))
    );
  }

  if (ownConvocation && bodyConvDate !== undefined) {
    updates.push(
      db.update(convocation)
        .set({
          date: bodyConvDate ?? '',
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(convocation.id, ownConvocation.id), eq(convocation.orgId, orgId)))
    );
  }

  if (updates.length > 0) {
    await db.batch(updates as [any, ...any[]]);
  }

  // When RUNTS deposit status changes, recompute retention flags for all attendees
  const depositChanged =
    existing !== undefined &&
    body.depositedOnRunts !== undefined &&
    (body.depositedOnRunts ? 1 : 0) !== (existing.depositedOnRunts ? 1 : 0);

  if (depositChanged) {
    await recomputeRetentionForAssembly(db, id);
  }

  return c.json({ success: true });
});

assembliesRouter.delete('/:id', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(assembly).where(and(eq(assembly.id, id), eq(assembly.orgId, orgId))).get();
  if (!existing) return c.json({ error: 'Assembly not found' }, 404);

  // Null out memberPeriod references
  await db.update(memberPeriod).set({ admissionAssemblyId: null }).where(and(eq(memberPeriod.admissionAssemblyId, id), eq(memberPeriod.orgId, orgId))).run();
  await db.update(memberPeriod).set({ exitAssemblyId: null }).where(and(eq(memberPeriod.exitAssemblyId, id), eq(memberPeriod.orgId, orgId))).run();

  // Null out document log references
  await db.update(documentGenerationLog).set({ assemblyId: null }).where(and(eq(documentGenerationLog.assemblyId, id), eq(documentGenerationLog.orgId, orgId))).run();

  // Delete attendance
  await db.delete(attendance).where(and(eq(attendance.assemblyId, id), eq(attendance.orgId, orgId))).run();

  // For convocations where this is the primary assembly: delete agendaItems then the convocation
  const primaryConvocations = await db.select().from(convocation).where(and(eq(convocation.assemblyId, id), eq(convocation.orgId, orgId))).all();
  for (const conv of primaryConvocations) {
    await db.delete(agendaItem).where(and(eq(agendaItem.convocationId, conv.id), eq(agendaItem.orgId, orgId))).run();
    await db.delete(convocation).where(and(eq(convocation.id, conv.id), eq(convocation.orgId, orgId))).run();
  }

  // For convocations where this is the secondary assembly: just unlink
  await db.update(convocation).set({ secondAssemblyId: null }).where(and(eq(convocation.secondAssemblyId, id), eq(convocation.orgId, orgId))).run();

  await db.delete(assembly).where(and(eq(assembly.id, id), eq(assembly.orgId, orgId))).run();
  return c.json({ success: true });
});

assembliesRouter.get('/:id/member-links', async (c) => {
  const denied = await requirePermission(c, 'members.view');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const [admissions, resignations] = await Promise.all([
    db.select({
      id: memberPeriod.id,
      personId: memberPeriod.personId,
      admissionDate: memberPeriod.admissionDate,
      firstName: person.firstName,
      lastName: person.lastName,
    })
    .from(memberPeriod)
    .innerJoin(person, eq(memberPeriod.personId, person.id))
    .where(and(eq(memberPeriod.admissionAssemblyId, id), eq(memberPeriod.orgId, orgId)))
    .all(),

    db.select({
      id: memberPeriod.id,
      personId: memberPeriod.personId,
      resignationDate: memberPeriod.resignationDate,
      firstName: person.firstName,
      lastName: person.lastName,
    })
    .from(memberPeriod)
    .innerJoin(person, eq(memberPeriod.personId, person.id))
    .where(and(eq(memberPeriod.exitAssemblyId, id), eq(memberPeriod.orgId, orgId)))
    .all(),
  ]);

  return c.json({ admissions, resignations });
});


assembliesRouter.get('/:id/eligible-members', async (c) => {
  const denied = await requirePermission(c, 'assemblies.view');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const assemblyData = await db.select({ firstCallDate: assembly.firstCallDate })
    .from(assembly).where(and(eq(assembly.id, id), eq(assembly.orgId, orgId))).get();
  if (!assemblyData) return c.json({ error: 'Assembly not found' }, 404);

  const refDate = assemblyData.firstCallDate ?? new Date().toISOString().split('T')[0];

  const members = await db.select({
    personId: memberPeriod.personId,
    firstName: person.firstName,
    lastName: person.lastName,
  })
    .from(memberPeriod)
    .innerJoin(person, eq(memberPeriod.personId, person.id))
    .where(
      and(
        eq(person.isPresumedNonExistent, 0),
        eq(person.orgId, orgId),
        eq(memberPeriod.orgId, orgId),
        lte(memberPeriod.admissionDate, refDate),
        or(isNull(memberPeriod.resignationDate), gte(memberPeriod.resignationDate, refDate))
      )
    )
    .all();

  // Deduplicate by personId (a person may have multiple periods)
  const seen = new Set<string>();
  const unique = members.filter((m) => {
    if (seen.has(m.personId)) return false;
    seen.add(m.personId);
    return true;
  });

  return c.json(unique);
});

assembliesRouter.post('/:id/attendance', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(attendance)
    .where(and(eq(attendance.assemblyId, id), eq(attendance.personId, body.personId), eq(attendance.orgId, orgId)))
    .get();

  if (existing) {
    await db.update(attendance)
      .set({ mode: body.mode, delegatorId: body.delegatorId ?? null })
      .where(and(eq(attendance.id, existing.id), eq(attendance.orgId, orgId)))
      .run();
    return c.json({ ...existing, mode: body.mode, delegatorId: body.delegatorId ?? null });
  }

  const newRecord = {
    id: crypto.randomUUID(),
    assemblyId: id,
    orgId: orgId,
    personId: body.personId,
    mode: body.mode,
    delegatorId: body.delegatorId ?? null,
    createdAt: new Date().toISOString(),
  };
  await db.insert(attendance).values(newRecord).run();
  return c.json(newRecord, 201);
});

assembliesRouter.delete('/:id/attendance/:personId', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const personId = c.req.param('personId');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  await db.delete(attendance)
    .where(and(eq(attendance.assemblyId, id), eq(attendance.personId, personId), eq(attendance.orgId, orgId)))
    .run();

  return c.json({ success: true });
});

export { assembliesRouter };
