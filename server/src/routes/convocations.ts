import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { convocation, user } from '../db/schema';
import { eq } from 'drizzle-orm';

type Bindings = { DB: D1Database };

type Variables = {
  jwtPayload: {
    sub: string;
    email: string;
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

  const db = drizzle(c.env.DB);

  const assemblyId = c.req.query('assemblyId');
  const sortBy = c.req.query('sortBy') || 'sentAt';
  const order = c.req.query('order') || 'desc';

  const all = await db.select().from(convocation).all();

  if (assemblyId) {
    const filtered = all.filter((row) => row.assemblyId === assemblyId || row.secondAssemblyId === assemblyId);
    return c.json(sortRows(filtered, sortBy, order));
  }

  return c.json(sortRows(all, sortBy, order));
});

// GET /api/convocations/:id
convocationsRouter.get('/:id', async (c) => {
  const denied = await requirePermission(c, 'convocations.view');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const row = await db.select().from(convocation).where(eq(convocation.id, id)).get();
  if (!row) return c.json({ error: 'Convocation not found' }, 404);
  return c.json(row);
});

// POST /api/convocations
convocationsRouter.post('/', async (c) => {
  const denied = await requirePermission(c, 'convocations.edit');
  if (denied) return denied;

  const body = await c.req.json();
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
    sentAt: body.sentAt || now.split('T')[0],
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
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(convocation).where(eq(convocation.id, id)).get();

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
    .where(eq(convocation.id, id))
    .run();
  return c.json({ success: true });
});

// DELETE /api/convocations/:id
convocationsRouter.delete('/:id', async (c) => {
  const denied = await requirePermission(c, 'convocations.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(convocation).where(eq(convocation.id, id)).run();
  return c.json({ success: true });
});

export { convocationsRouter };
