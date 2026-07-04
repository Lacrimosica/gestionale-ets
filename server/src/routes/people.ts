import { Hono } from 'hono';
import { eq, sql, isNull, isNotNull, and } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { alertSuppression, complianceDocumentFlag, complianceDocument, complianceRole, person, volunteerPeriod, memberPeriod, boardGeneration, boardMember, attendance, user, organizationUser } from '../db/schema';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { italianMunicipalityCodes } from '../lib/italian-municipality-codes';
import { validateCodiceFiscale, getPlace } from '../lib/fiscal-code';
import { hashPassword } from '../lib/auth';
import { orgContext, type JwtPayload } from '../lib/org-context';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  jwtPayload: JwtPayload;
};

const peopleRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Zod schemas for validation
const insertPersonSchema = createInsertSchema(person);
const patchPersonSchema = insertPersonSchema.partial();

// GET /api/people/comuni?q=... - Search comuni by name
peopleRouter.get('/comuni', (c) => {
  const q = (c.req.query('q') ?? '').toUpperCase().trim();
  if (q.length < 2) return c.json([]);
  const seen = new Set<string>();
  const results: { name: string; code: string }[] = [];
  for (const [name, code] of italianMunicipalityCodes) {
    if (name.includes(q) && !seen.has(name)) {
      seen.add(name);
      results.push({ name, code });
    }
    if (results.length >= 20) break;
  }
  return c.json(results);
});

// GET /api/people?filter=all|members|volunteers|active|resigned|recent|missing_cf|cf_invalid|cf_unchecked|no_contacts
peopleRouter.get('/', async (c) => {
  const ctx = orgContext(c, 'people.view');
  if (ctx instanceof Response) return ctx;
  const { db, orgId } = ctx;
  const filter = c.req.query('filter') || 'all';

  // Status subquery columns (org-scoped at request time)
  const personStatusColumns = {
    ...getTableColumns(person),
    isActiveMember: sql<number>`CASE WHEN EXISTS (SELECT 1 FROM member_period WHERE member_period.person_id = ${person.id} AND member_period.resignation_date IS NULL AND member_period.org_id = ${orgId}) THEN 1 ELSE 0 END`,
    isMember:       sql<number>`CASE WHEN EXISTS (SELECT 1 FROM member_period WHERE member_period.person_id = ${person.id} AND member_period.org_id = ${orgId}) THEN 1 ELSE 0 END`,
    isVolunteer:    sql<number>`CASE WHEN EXISTS (SELECT 1 FROM volunteer_period WHERE volunteer_period.person_id = ${person.id} AND volunteer_period.status = 'active' AND volunteer_period.exit_date IS NULL AND volunteer_period.org_id = ${orgId}) THEN 1 ELSE 0 END`,
    isResigned:     sql<number>`CASE WHEN EXISTS (SELECT 1 FROM member_period WHERE member_period.person_id = ${person.id} AND member_period.resignation_date IS NOT NULL AND member_period.org_id = ${orgId}) THEN 1 ELSE 0 END`,
    activeMemberPeriodId: sql<string | null>`(SELECT id FROM member_period WHERE member_period.person_id = ${person.id} AND member_period.resignation_date IS NULL AND member_period.org_id = ${orgId} LIMIT 1)`,
  };

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString();

  const whereClause = (() => {
    switch (filter) {
      case 'members':   return sql`EXISTS (SELECT 1 FROM member_period WHERE member_period.person_id = ${person.id} AND member_period.org_id = ${orgId})`;
      case 'volunteers': return sql`EXISTS (SELECT 1 FROM volunteer_period WHERE volunteer_period.person_id = ${person.id} AND volunteer_period.status = 'active' AND volunteer_period.exit_date IS NULL AND volunteer_period.org_id = ${orgId})`;
      case 'active':    return sql`EXISTS (SELECT 1 FROM member_period WHERE member_period.person_id = ${person.id} AND member_period.resignation_date IS NULL AND member_period.org_id = ${orgId})`;
      case 'resigned':  return sql`EXISTS (SELECT 1 FROM member_period WHERE member_period.person_id = ${person.id} AND member_period.resignation_date IS NOT NULL AND member_period.org_id = ${orgId})`;
      case 'recent':    return sql`${person.createdAt} >= ${sixMonthsAgoStr}`;
      case 'missing_cf':  return isNull(person.taxId);
      case 'cf_invalid':  return and(isNotNull(person.taxId), isNotNull(person.cfValidation), sql`${person.cfValidation} != 'OK'`);
      case 'cf_unchecked': return and(isNotNull(person.taxId), isNull(person.cfValidation));
      case 'no_contacts': return and(isNull(person.email), isNull(person.phone));
      default: return undefined;
    }
  })();

  const result = whereClause
    ? await db.select(personStatusColumns).from(person).where(ctx.scoped(person.orgId, whereClause)).all()
    : await db.select(personStatusColumns).from(person).where(ctx.scoped(person.orgId)).all();

  return c.json(result);
});

// GET /api/people/:id - Get person by ID with history
peopleRouter.get('/:id', async (c) => {
  const ctx = orgContext(c, 'people.view');
  if (ctx instanceof Response) return ctx;
  const { db } = ctx;
  const id = c.req.param('id');

  const result = await db.select().from(person).where(ctx.scoped(person.orgId, eq(person.id, id))).get();

  if (!result) {
    return c.json({ error: 'Person not found' }, 404);
  }

  // Fetch history
  const vPeriods = await db.select().from(volunteerPeriod).where(ctx.scoped(volunteerPeriod.orgId, eq(volunteerPeriod.personId, id))).all();
  const sPeriods = await db.select().from(memberPeriod).where(ctx.scoped(memberPeriod.orgId, eq(memberPeriod.personId, id))).all();

  // Fetch board roles joined with generation details
  const dRoles = await db.select({
    member: boardMember,
    generation: boardGeneration
  })
    .from(boardMember)
    .innerJoin(boardGeneration, eq(boardMember.generationId, boardGeneration.id))
    .where(ctx.scoped(boardMember.orgId, eq(boardMember.personId, id)))
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
  const ctx = orgContext(c, 'people.edit');
  if (ctx instanceof Response) return ctx;
  const { db, orgId } = ctx;

  const body = await c.req.json();

  if (body.taxId === '') {
    body.taxId = null;
  }
  if (body.isStudent !== undefined) {
    body.isStudent = body.isStudent ? 1 : 0;
  }
  if (body.isEmployee !== undefined) {
    body.isEmployee = body.isEmployee ? 1 : 0;
  }
  if (body.isPresumedNonExistent !== undefined) {
    body.isPresumedNonExistent = body.isPresumedNonExistent ? 1 : 0;
  }

  const validation = insertPersonSchema.safeParse({
    ...body,
    id: body.id || crypto.randomUUID(),
    orgId: orgId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (!validation.success) {
    return c.json({ error: 'Invalid data', details: validation.error.format() }, 400);
  }

  try {
    const result = await db.insert(person).values(validation.data).returning().get();
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNIQUE constraint failed') && message.includes('person.org_id, person.tax_id')) {
      return c.json({ error: 'A person with this tax ID already exists in your organization' }, 409);
    }
    if (message.includes('UNIQUE constraint failed') && message.includes('person.org_id, person.email')) {
      return c.json({ error: 'A person with this email already exists in your organization' }, 409);
    }
    console.error('Error creating person:', error);
    return c.json({ error: 'Error creating person' }, 500);
  }
});

// PATCH /api/people/:id - Update person details
peopleRouter.patch('/:id', async (c) => {
  const ctx = orgContext(c, 'people.edit');
  if (ctx instanceof Response) return ctx;
  const { db } = ctx;
  const id = c.req.param('id');
  const body = await c.req.json();

  if (body.taxId === '') {
    body.taxId = null;
  }
  if (body.isStudent !== undefined) {
    body.isStudent = body.isStudent ? 1 : 0;
  }
  if (body.isEmployee !== undefined) {
    body.isEmployee = body.isEmployee ? 1 : 0;
  }
  if (body.isPresumedNonExistent !== undefined) {
    body.isPresumedNonExistent = body.isPresumedNonExistent ? 1 : 0;
  }

  const validation = patchPersonSchema.safeParse({
    ...body,
    updatedAt: new Date().toISOString(),
  });

  if (!validation.success) {
    return c.json({ error: 'Invalid data', details: validation.error.format() }, 400);
  }

  try {
    const result = await db.update(person)
      .set(validation.data)
      .where(ctx.scoped(person.orgId, eq(person.id, id)))
      .returning()
      .get();

    if (!result) {
      return c.json({ error: 'Person not found' }, 404);
    }

    return c.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNIQUE constraint failed') && message.includes('person.org_id, person.tax_id')) {
      return c.json({ error: 'A person with this tax ID already exists in your organization' }, 409);
    }
    if (message.includes('UNIQUE constraint failed') && message.includes('person.org_id, person.email')) {
      return c.json({ error: 'A person with this email already exists in your organization' }, 409);
    }
    console.error('Error updating person:', error);
    return c.json({ error: 'Error updating person' }, 500);
  }
});

// DELETE /api/people/:id - Delete person and all associated data
peopleRouter.delete('/:id', async (c) => {
  const ctx = orgContext(c, 'people.edit');
  if (ctx instanceof Response) return ctx;
  const { db } = ctx;
  const id = c.req.param('id');

  try {
    const docs = await db.select({ id: complianceDocument.id }).from(complianceDocument).where(ctx.scoped(complianceDocument.orgId, eq(complianceDocument.personId, id))).all();
    const docDeletes = docs.map((doc) => db.delete(complianceDocumentFlag).where(eq(complianceDocumentFlag.documentId, doc.id)));

    const batchItems: [any, ...any[]] = [
      db.delete(person).where(ctx.scoped(person.orgId, eq(person.id, id))),
      ...docDeletes,
      db.delete(alertSuppression).where(ctx.scoped(alertSuppression.orgId, eq(alertSuppression.personId, id))),
      db.delete(complianceDocument).where(ctx.scoped(complianceDocument.orgId, eq(complianceDocument.personId, id))),
      db.delete(complianceRole).where(ctx.scoped(complianceRole.orgId, eq(complianceRole.personId, id))),
      db.delete(memberPeriod).where(ctx.scoped(memberPeriod.orgId, eq(memberPeriod.personId, id))),
      db.delete(volunteerPeriod).where(ctx.scoped(volunteerPeriod.orgId, eq(volunteerPeriod.personId, id))),
      db.delete(boardMember).where(ctx.scoped(boardMember.orgId, eq(boardMember.personId, id))),
      db.update(attendance).set({ delegatorId: null }).where(ctx.scoped(attendance.orgId, eq(attendance.delegatorId, id))),
      db.delete(attendance).where(ctx.scoped(attendance.orgId, eq(attendance.personId, id)))
    ];

    await db.batch(batchItems);

    return c.json({ success: true, message: 'Person deleted' });
  } catch (error) {
    console.error('Error deleting person:', error);
    return c.json({ error: 'Error while deleting person' }, 500);
  }
});

// POST /api/people/:id/verify-cf — verify one person's codice fiscale and persist result
peopleRouter.post('/:id/verify-cf', async (c) => {
  const ctx = orgContext(c, 'people.view');
  if (ctx instanceof Response) return ctx;
  const { db } = ctx;
  const id = c.req.param('id');
  const [p] = await db.select().from(person).where(ctx.scoped(person.orgId, eq(person.id, id)));
  if (!p) return c.json({ error: 'Not found' }, 404);

  if (!p.taxId) {
    return c.json({ error: 'No tax ID on record' }, 422);
  }
  if (!p.firstName || !p.lastName || !p.birthDate || !p.gender) {
    return c.json({ error: 'Insufficient data to validate (need firstName, lastName, birthDate, gender)' }, 422);
  }

  // Try birthPlace first; if the map doesn't recognise it (e.g. it's a city name),
  // fall back to birthCountry which should hold the country name used in the belfiore map.
  const placeForLookup = (p.birthPlace && getPlace(p.birthPlace).length > 0)
    ? p.birthPlace
    : p.birthCountry;

  if (!placeForLookup) {
    return c.json({ error: 'Cannot resolve birth place: set birthCountry to the country name as it appears in the codice catastale data (e.g. "Kazakhistan")' }, 422);
  }

  const result = validateCodiceFiscale({
    code: p.taxId,
    firstName: p.firstName,
    lastName: p.lastName,
    dateBirth: p.birthDate,
    gender: p.gender as 'M' | 'F',
    place: placeForLookup,
  });

  const cfValidation = result.valid ? 'OK' : JSON.stringify(result.errors);
  await db.update(person).set({ cfValidation, updatedAt: new Date().toISOString() }).where(ctx.scoped(person.orgId, eq(person.id, id)));

  return c.json({ valid: result.valid, errors: result.errors, cfValidation });
});

// POST /api/people/:id/create-user - Create a user account for a person and link them
peopleRouter.post('/:id/create-user', async (c) => {
  const ctx = orgContext(c, 'settings.users.manage');
  if (ctx instanceof Response) return ctx;
  const { db, orgId } = ctx;
  const id = c.req.param('id');

  // Fetch person
  const [person_record] = await db.select().from(person).where(ctx.scoped(person.orgId, eq(person.id, id)));
  if (!person_record) {
    return c.json({ error: 'Person not found' }, 404);
  }
  if (person_record.userId) {
    return c.json({ error: 'Person already has a linked user account' }, 409);
  }

  // Parse request body
  const body = await c.req.json<{ email: string; password: string; role: string; permissions?: string[] }>();
  if (!body.email || !body.password || !body.role) {
    return c.json({ error: 'Missing required fields: email, password, role' }, 400);
  }

  // Check for duplicate email
  const [existingUser] = await db.select().from(user).where(eq(user.email, body.email));
  if (existingUser) {
    return c.json({ error: 'Email already in use' }, 409);
  }

  try {
    // Hash password
    const hashedPassword = await hashPassword(body.password);

    // Create user (without role/permissions which live in organizationUser)
    const newUserId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(user).values({
      id: newUserId,
      email: body.email,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    // Create organizationUser link (orgId comes from the verified request context)
    const permissions = body.permissions || [];
    await db.insert(organizationUser).values({
      id: crypto.randomUUID(),
      userId: newUserId,
      orgId,
      role: body.role,
      permissions: JSON.stringify(permissions),
      isOwner: 0,
      joinedAt: now,
    });

    // Link person to user — org-scoped so a person from another tenant can't be linked
    await db.update(person).set({ userId: newUserId, updatedAt: now }).where(ctx.scoped(person.orgId, eq(person.id, id)));

    return c.json({
      person: {
        ...person_record,
        userId: newUserId,
        updatedAt: now,
      },
      user: {
        id: newUserId,
        email: body.email,
        role: body.role,
        permissions,
        createdAt: now,
        updatedAt: now,
      },
    }, 201);
  } catch (error) {
    console.error('Error creating user for person:', error);
    return c.json({ error: 'Error creating user account' }, 500);
  }
});

// POST /api/people/verify-cf/all — verify all people with enough data and persist results
peopleRouter.post('/verify-cf/all', async (c) => {
  const ctx = orgContext(c, 'people.view');
  if (ctx instanceof Response) return ctx;
  const { db } = ctx;
  const everyone = await db.select().from(person).where(ctx.scoped(person.orgId));
  const now = new Date().toISOString();

  let checked = 0, ok = 0, failed = 0, skipped = 0;

  for (const p of everyone) {
    if (!p.taxId || !p.firstName || !p.lastName || !p.birthDate || !p.gender) {
      skipped++;
      continue;
    }
    const placeForLookup = (p.birthPlace && getPlace(p.birthPlace).length > 0)
      ? p.birthPlace
      : p.birthCountry;
    if (!placeForLookup) {
      skipped++;
      continue;
    }
    const result = validateCodiceFiscale({
      code: p.taxId,
      firstName: p.firstName,
      lastName: p.lastName,
      dateBirth: p.birthDate,
      gender: p.gender as 'M' | 'F',
      place: placeForLookup,
    });
    const cfValidation = result.valid ? 'OK' : JSON.stringify(result.errors);
    await db.update(person).set({ cfValidation, updatedAt: now }).where(ctx.scoped(person.orgId, eq(person.id, p.id)));
    checked++;
    result.valid ? ok++ : failed++;
  }

  return c.json({ checked, ok, failed, skipped });
});

export { peopleRouter };
