import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { boardGeneration, memberGeneration, boardMember, person, user } from '../db/schema';
import { eq } from 'drizzle-orm';

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

// --- BOARD ---

generationsRouter.get('/board', async (c) => {
  const denied = await requirePermission(c, 'board.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);

  const result = await db.select().from(boardGeneration).all();
  return c.json(result);
});

generationsRouter.post('/board', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const id = crypto.randomUUID();
  const newGen = { id, ...body, createdAt: new Date().toISOString() };
  await db.insert(boardGeneration).values(newGen).run();
  return c.json(newGen, 201);
});

generationsRouter.get('/board/:id/members', async (c) => {
  const denied = await requirePermission(c, 'board.view');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const result = await db.select({
    member: boardMember,
    person: person
  })
  .from(boardMember)
  .innerJoin(person, eq(boardMember.personId, person.id))
  .where(eq(boardMember.generationId, id))
  .all();
  
  return c.json(result);
});

generationsRouter.put('/board/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const result = await db.update(boardGeneration)
    .set(body)
    .where(eq(boardGeneration.id, id))
    .returning()
    .get();
    
  if (!result) return c.json({ error: 'Board generation not found' }, 404);
  return c.json(result);
});

generationsRouter.delete('/board/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(boardMember).where(eq(boardMember.generationId, id)).run();
  await db.delete(boardGeneration).where(eq(boardGeneration.id, id)).run();
  
  return c.json({ success: true });
});

generationsRouter.post('/board/:id/members', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const generationId = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const id = crypto.randomUUID();
  const newMember = { id, generationId, ...body, createdAt: new Date().toISOString() };
  await db.insert(boardMember).values(newMember).run();
  
  return c.json(newMember, 201);
});

generationsRouter.put('/board/members/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const result = await db.update(boardMember)
    .set(body)
    .where(eq(boardMember.id, id))
    .returning()
    .get();
    
  if (!result) return c.json({ error: 'Member not found' }, 404);
  return c.json(result);
});

generationsRouter.delete('/board/members/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(boardMember).where(eq(boardMember.id, id)).run();
  
  return c.json({ success: true });
});

// --- MEMBERS ---

generationsRouter.get('/members', async (c) => {
  const denied = await requirePermission(c, 'members.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);

  const result = await db.select().from(memberGeneration).all();
  return c.json(result);
});

generationsRouter.post('/members', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const id = crypto.randomUUID();
  const newGen = { id, ...body, createdAt: new Date().toISOString() };
  await db.insert(memberGeneration).values(newGen).run();
  return c.json(newGen, 201);
});

export { generationsRouter };
