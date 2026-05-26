import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { volunteerPeriod, memberPeriod, person, user } from '../db/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';

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

const periodsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

// --- VOLUNTEERS ---

periodsRouter.post('/volunteers', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();

  const newPeriod = {
    id,
    personId: body.personId,
    orgId: orgId,
    status: 'active',
    enrollmentDate: body.enrollmentDate || new Date().toISOString().split('T')[0],
    notes: body.notes,
    createdAt: new Date().toISOString(),
  };

  await db.insert(volunteerPeriod).values(newPeriod).run();
  return c.json(newPeriod, 201);
});



periodsRouter.patch('/volunteers/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const updateData: any = {};
  if (body.enrollmentDate) updateData.enrollmentDate = body.enrollmentDate;
  if (body.exitDate !== undefined) updateData.exitDate = body.exitDate;
  if (body.exitReason !== undefined) updateData.exitReason = body.exitReason;
  if (body.status) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;

  if (Object.keys(updateData).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  await db.update(volunteerPeriod)
    .set(updateData)
    .where(and(eq(volunteerPeriod.id, id), eq(volunteerPeriod.orgId, orgId)))
    .run();

  return c.json({ success: true });
});

periodsRouter.delete('/volunteers/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  await db.delete(volunteerPeriod).where(and(eq(volunteerPeriod.id, id), eq(volunteerPeriod.orgId, orgId))).run();
  return c.json({ success: true });
});

periodsRouter.get('/volunteers/active', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const active = await db.select({
    person: person,
    period: volunteerPeriod
  })
  .from(volunteerPeriod)
  .innerJoin(person, eq(volunteerPeriod.personId, person.id))
  .where(and(
    eq(volunteerPeriod.status, 'active'),
    eq(volunteerPeriod.orgId, orgId),
    isNull(volunteerPeriod.exitDate)
  ))
  .all();

  return c.json(active);
});

// --- MEMBERS ---

periodsRouter.get('/members/unlinked', async (c) => {
  const denied = await requirePermission(c, 'members.view');
  if (denied) return denied;

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
    .where(and(isNull(memberPeriod.admissionAssemblyId), eq(memberPeriod.orgId, orgId)))
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
    .where(and(
      isNull(memberPeriod.exitAssemblyId),
      isNotNull(memberPeriod.resignationDate),
      eq(memberPeriod.orgId, orgId)
    ))
    .all(),
  ]);

  return c.json({ admissions, resignations });
});

periodsRouter.post('/members', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  const admissionDate = body.admissionDate || new Date().toISOString().split('T')[0];

  const newPeriod = {
    id,
    personId: body.personId,
    orgId: orgId,
    volunteerPeriodId: body.volunteerPeriodId,
    admissionDate,
    admissionAssemblyId: body.admissionAssemblyId,
    notes: body.notes,
    createdAt: new Date().toISOString(),
  };

  await db.insert(memberPeriod).values(newPeriod).run();
  return c.json(newPeriod, 201);
});

periodsRouter.patch('/members/:id/resignation', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  await db.update(memberPeriod)
    .set({
      resignationDate: body.resignationDate || new Date().toISOString().split('T')[0],
      exitReason: body.exitReason,
      exitAssemblyId: body.exitAssemblyId,
    })
    .where(and(eq(memberPeriod.id, id), eq(memberPeriod.orgId, orgId)))
    .run();

  return c.json({ success: true });
});

periodsRouter.patch('/members/:id/set-assembly', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const updateData: Record<string, string | null> = {};
  if ('admissionAssemblyId' in body) updateData.admissionAssemblyId = body.admissionAssemblyId ?? null;
  if ('exitAssemblyId' in body) updateData.exitAssemblyId = body.exitAssemblyId ?? null;

  if (Object.keys(updateData).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  await db.update(memberPeriod)
    .set(updateData)
    .where(and(eq(memberPeriod.id, id), eq(memberPeriod.orgId, orgId)))
    .run();

  return c.json({ success: true });
});

periodsRouter.patch('/members/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const updateData: any = {};
  if (body.admissionDate) updateData.admissionDate = body.admissionDate;
  if (body.resignationDate !== undefined) updateData.resignationDate = body.resignationDate;
  if (body.exitReason !== undefined) updateData.exitReason = body.exitReason;
  if (body.articleReference !== undefined) updateData.articleReference = body.articleReference;
  if (body.admissionAssemblyId !== undefined) updateData.admissionAssemblyId = body.admissionAssemblyId;
  if (body.exitAssemblyId !== undefined) updateData.exitAssemblyId = body.exitAssemblyId;
  if (body.notes !== undefined) updateData.notes = body.notes;

  if (Object.keys(updateData).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  await db.update(memberPeriod)
    .set(updateData)
    .where(and(eq(memberPeriod.id, id), eq(memberPeriod.orgId, orgId)))
    .run();

  return c.json({ success: true });
});

periodsRouter.delete('/members/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  await db.delete(memberPeriod).where(and(eq(memberPeriod.id, id), eq(memberPeriod.orgId, orgId))).run();
  return c.json({ success: true });
});

periodsRouter.get('/members/active', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const active = await db.select({
    person: person,
    period: memberPeriod
  })
  .from(memberPeriod)
  .innerJoin(person, eq(memberPeriod.personId, person.id))
  .where(and(
    isNull(memberPeriod.resignationDate),
    eq(memberPeriod.orgId, orgId)
  ))
  .all();

  return c.json(active);
});

periodsRouter.get('/members', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const allMembers = await db.select({
    person: person,
    period: memberPeriod
  })
  .from(memberPeriod)
  .innerJoin(person, eq(memberPeriod.personId, person.id))
  .where(eq(memberPeriod.orgId, orgId))
  .all();

  return c.json(allMembers);
});

export default periodsRouter;
