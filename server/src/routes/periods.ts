import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { volunteerPeriod, memberPeriod, person, user } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  jwtPayload: {
    sub: string;
    email: string;
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
  const db = drizzle(c.env.DB);
  const currentUser = await db.select().from(user).where(eq(user.id, payload.sub)).get();

  if (!currentUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  const permissions = parsePermissions(currentUser.permissions);
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
  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  
  const newPeriod = {
    id,
    personId: body.personId,
    status: 'active',
    enrollmentDate: body.enrollmentDate || new Date().toISOString().split('T')[0],
    notes: body.notes,
    createdAt: new Date().toISOString(),
  };

  await db.insert(volunteerPeriod).values(newPeriod).run();
  return c.json(newPeriod, 201);
});

periodsRouter.patch('/volunteers/:id/exit', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  await db.update(volunteerPeriod)
    .set({
      exitDate: body.exitDate || new Date().toISOString().split('T')[0],
      exitReason: body.exitReason,
      status: 'resigned',
    })
    .where(eq(volunteerPeriod.id, id))
    .run();

  return c.json({ success: true });
});

periodsRouter.get('/volunteers/active', async (c) => {
  const denied = await requirePermission(c, 'volunteers.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const active = await db.select({
    person: person,
    period: volunteerPeriod
  })
  .from(volunteerPeriod)
  .innerJoin(person, eq(volunteerPeriod.personId, person.id))
  .where(and(
    eq(volunteerPeriod.status, 'active'),
    isNull(volunteerPeriod.exitDate)
  ))
  .all();
  
  return c.json(active);
});

// --- MEMBERS ---

periodsRouter.post('/members', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  
  const newPeriod = {
    id,
    personId: body.personId,
    volunteerPeriodId: body.volunteerPeriodId,
    admissionDate: body.admissionDate || new Date().toISOString().split('T')[0],
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
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  await db.update(memberPeriod)
    .set({
      resignationDate: body.resignationDate || new Date().toISOString().split('T')[0],
      exitReason: body.exitReason,
      exitAssemblyId: body.exitAssemblyId,
    })
    .where(eq(memberPeriod.id, id))
    .run();

  return c.json({ success: true });
});

periodsRouter.get('/members/active', async (c) => {
  const denied = await requirePermission(c, 'members.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const active = await db.select({
    person: person,
    period: memberPeriod
  })
  .from(memberPeriod)
  .innerJoin(person, eq(memberPeriod.personId, person.id))
  .where(isNull(memberPeriod.resignationDate))
  .all();
  
  return c.json(active);
});

periodsRouter.get('/members', async (c) => {
  const denied = await requirePermission(c, 'members.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const allMembers = await db.select({
    person: person,
    period: memberPeriod
  })
  .from(memberPeriod)
  .innerJoin(person, eq(memberPeriod.personId, person.id))
  .all();
  
  return c.json(allMembers);
});

export default periodsRouter;
