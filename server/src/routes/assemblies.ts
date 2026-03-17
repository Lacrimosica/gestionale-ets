import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { assembly, agendaItem, attendance, user } from '../db/schema';
import { eq, desc, and, not, sql } from 'drizzle-orm';

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

assembliesRouter.get('/', async (c) => {
  const denied = await requirePermission(c, 'assemblies.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  // Sort by total number descending
  const result = await db.select().from(assembly).orderBy(desc(assembly.totalNumber)).all();
  return c.json(result);
});

assembliesRouter.get('/:id', async (c) => {
  const denied = await requirePermission(c, 'assemblies.view');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  const assemblyData = await db.select().from(assembly).where(eq(assembly.id, id)).get();
  if (!assemblyData) return c.json({ error: 'Assembly not found' }, 404);
  
  const agendaItems = await db.select().from(agendaItem).where(eq(agendaItem.assemblyId, id)).all();
  const participants = await db.select().from(attendance).where(eq(attendance.assemblyId, id)).all();
  
  return c.json({
    ...assemblyData,
    agendaItems,
    participants
  });
});

assembliesRouter.post('/', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  
  // 1. Calculate totalNumber
  const lastTotal = await db.select({ max: sql<number>`max(total_number)` }).from(assembly).get();
  const totalNumber = (Number(lastTotal?.max) || 0) + 1;

  // 2. Calculate referenceNumber and referenceYear
  let referenceNumber = 1;
  let referenceYear: number | null = null;

  if (body.type === 'board_council') {
    const lastBoard = await db.select({ max: sql<number>`max(reference_number)` })
      .from(assembly)
      .where(and(
        eq(assembly.type, 'board_council'), 
        eq(assembly.boardGenerationId, body.boardGenerationId)
      ))
      .get();
    referenceNumber = (Number(lastBoard?.max) || 0) + 1;
  } else {
    referenceYear = body.firstCallDate ? new Date(body.firstCallDate).getFullYear() : new Date().getFullYear();
    const lastAnnual = await db.select({ max: sql<number>`max(reference_number)` })
      .from(assembly)
      .where(and(
         not(eq(assembly.type, 'board_council')), 
         eq(assembly.referenceYear, referenceYear)
      ))
      .get();
    referenceNumber = (Number(lastAnnual?.max) || 0) + 1;
  }

  const newAssembly = {
    id,
    ...body,
    totalNumber,
    referenceNumber,
    referenceYear,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.insert(assembly).values(newAssembly).run();
  return c.json(newAssembly, 201);
});

assembliesRouter.patch('/:id', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  await db.update(assembly)
    .set({
      ...body,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(assembly.id, id))
    .run();

  return c.json({ success: true });
});

assembliesRouter.post('/:id/agenda', async (c) => {
  const denied = await requirePermission(c, 'assemblies.edit');
  if (denied) return denied;

  const assemblyId = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  
  const newAgendaItem = {
    id,
    assemblyId,
    ...body,
    createdAt: new Date().toISOString(),
  };

  await db.insert(agendaItem).values(newAgendaItem).run();
  return c.json(newAgendaItem, 201);
});

export { assembliesRouter };
