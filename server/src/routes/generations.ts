import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { boardGeneration, boardMember, person, user } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { isValidRole, normalizeRole } from '../lib/board-roles';

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

const generationsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

// --- BOARD ---

generationsRouter.get('/board', async (c) => {
  const denied = await requirePermission(c, 'board.view');
  if (denied) return denied;

  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const result = await db.select().from(boardGeneration).where(eq(boardGeneration.orgId, orgId)).all();
  return c.json(result);
});

generationsRouter.post('/board', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const body = await c.req.json();
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const id = crypto.randomUUID();
  const newGen = { id, ...body, orgId: orgId, createdAt: new Date().toISOString() };
  await db.insert(boardGeneration).values(newGen).run();
  return c.json(newGen, 201);
});

generationsRouter.get('/board/:id/members', async (c) => {
  const denied = await requirePermission(c, 'board.view');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const result = await db.select({
    member: boardMember,
    person: person
  })
  .from(boardMember)
  .innerJoin(person, eq(boardMember.personId, person.id))
  .where(and(eq(boardMember.generationId, id), eq(boardMember.orgId, orgId)))
  .all();

  return c.json(result);
});

generationsRouter.put('/board/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const result = await db.update(boardGeneration)
    .set(body)
    .where(and(eq(boardGeneration.id, id), eq(boardGeneration.orgId, orgId)))
    .returning()
    .get();

  if (!result) return c.json({ error: 'Board generation not found' }, 404);
  return c.json(result);
});

generationsRouter.delete('/board/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  await db.delete(boardMember).where(and(eq(boardMember.generationId, id), eq(boardMember.orgId, orgId))).run();
  await db.delete(boardGeneration).where(and(eq(boardGeneration.id, id), eq(boardGeneration.orgId, orgId))).run();

  return c.json({ success: true });
});

generationsRouter.post('/board/:id/members', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const generationId = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  // Validate and normalize role
  if (!body.role) {
    return c.json({ error: 'Role is required' }, 400);
  }

  const normalizedRole = normalizeRole(body.role);
  if (!normalizedRole || !isValidRole(normalizedRole)) {
    return c.json({ error: `Invalid role "${body.role}". Valid roles are: president, vice_president, treasurer, secretary, councilor` }, 400);
  }

  const id = crypto.randomUUID();
  const newMember = { id, generationId, ...body, orgId: orgId, role: normalizedRole, createdAt: new Date().toISOString() };
  await db.insert(boardMember).values(newMember).run();

  return c.json(newMember, 201);
});

generationsRouter.put('/board/members/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  // Validate and normalize role if provided
  if (body.role !== undefined) {
    const normalizedRole = normalizeRole(body.role);
    if (!normalizedRole || !isValidRole(normalizedRole)) {
      return c.json({ error: `Invalid role "${body.role}". Valid roles are: president, vice_president, treasurer, secretary, councilor` }, 400);
    }
    body.role = normalizedRole;
  }

  const result = await db.update(boardMember)
    .set(body)
    .where(and(eq(boardMember.id, id), eq(boardMember.orgId, orgId)))
    .returning()
    .get();

  if (!result) return c.json({ error: 'Member not found' }, 404);
  return c.json(result);
});

generationsRouter.delete('/board/members/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  await db.delete(boardMember).where(and(eq(boardMember.id, id), eq(boardMember.orgId, orgId))).run();

  return c.json({ success: true });
});

export { generationsRouter };
