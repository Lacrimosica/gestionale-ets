import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { alertSuppression, complianceDocumentFlag, complianceDocument, complianceRole, person, volunteerPeriod, memberPeriod, boardGeneration, boardMember, attendance, user } from '../db/schema';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

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

const peopleRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

// Zod schemas for validation
const insertPersonSchema = createInsertSchema(person);
const patchPersonSchema = insertPersonSchema.partial();

// GET /api/people - List all people
peopleRouter.get('/', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const result = await db.select().from(person).all();
  return c.json(result);
});

// GET /api/people/:id - Get person by ID with history
peopleRouter.get('/:id', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const result = await db.select().from(person).where(eq(person.id, id)).get();

  if (!result) {
    return c.json({ error: 'Person not found' }, 404);
  }

  // Fetch history
  const vPeriods = await db.select().from(volunteerPeriod).where(eq(volunteerPeriod.personId, id)).all();
  const sPeriods = await db.select().from(memberPeriod).where(eq(memberPeriod.personId, id)).all();

  // Fetch board roles joined with generation details
  const dRoles = await db.select({
    member: boardMember,
    generation: boardGeneration
  })
    .from(boardMember)
    .innerJoin(boardGeneration, eq(boardMember.generationId, boardGeneration.id))
    .where(eq(boardMember.personId, id))
    .all();

  return c.json({
    ...result,
    volunteerPeriods: vPeriods,
    memberPeriods: sPeriods,
    boardRoles: dRoles
  });
});

// POST /api/people - Create a new person
peopleRouter.post('/', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  if (body.taxId === '') {
    body.taxId = null;
  }

  const validation = insertPersonSchema.safeParse({
    ...body,
    id: body.id || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (!validation.success) {
    return c.json({ error: 'Invalid data', details: validation.error.format() }, 400);
  }

  const result = await db.insert(person).values(validation.data).returning().get();
  return c.json(result, 201);
});

// PATCH /api/people/:id - Update person details
peopleRouter.patch('/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  if (body.taxId === '') {
    body.taxId = null;
  }

  const validation = patchPersonSchema.safeParse({
    ...body,
    updatedAt: new Date().toISOString(),
  });

  if (!validation.success) {
    return c.json({ error: 'Invalid data', details: validation.error.format() }, 400);
  }

  const result = await db.update(person)
    .set(validation.data)
    .where(eq(person.id, id))
    .returning()
    .get();

  if (!result) {
    return c.json({ error: 'Person not found' }, 404);
  }

  return c.json(result);
});

// DELETE /api/people/:id - Delete person and all associated data
peopleRouter.delete('/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  try {
    const docs = await db.select({ id: complianceDocument.id }).from(complianceDocument).where(eq(complianceDocument.personId, id)).all();
    const docDeletes = docs.map((doc) => db.delete(complianceDocumentFlag).where(eq(complianceDocumentFlag.documentId, doc.id)));

    const batchItems: [any, ...any[]] = [
      db.delete(person).where(eq(person.id, id)),
      ...docDeletes,
      db.delete(alertSuppression).where(eq(alertSuppression.personId, id)),
      db.delete(complianceDocument).where(eq(complianceDocument.personId, id)),
      db.delete(complianceRole).where(eq(complianceRole.personId, id)),
      db.delete(memberPeriod).where(eq(memberPeriod.personId, id)),
      db.delete(volunteerPeriod).where(eq(volunteerPeriod.personId, id)),
      db.delete(boardMember).where(eq(boardMember.personId, id)),
      db.update(attendance).set({ delegatorId: null }).where(eq(attendance.delegatorId, id)),
      db.delete(attendance).where(eq(attendance.personId, id))
    ];

    await db.batch(batchItems);

    return c.json({ success: true, message: 'Person deleted' });
  } catch (error) {
    console.error('Error deleting person:', error);
    return c.json({ error: 'Error while deleting person' }, 500);
  }
});

export { peopleRouter };
