import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import {
  alertSuppression,
  complianceDocumentFlag,
  complianceDocument,
  complianceRole,
  boardMember,
  boardGeneration,
  memberPeriod,
  volunteerPeriod,
  person,
  user,
} from '../db/schema';
import {
  computeComplianceAlerts,
  getPrivacyStatus,
  isRoleActive,
  isSuppressionActive,
  roleLabel,
} from '../lib/compliance';

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

const complianceRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

const todayIso = () => new Date().toISOString().split('T')[0];

const booleanFromBody = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value ? 1 : 0;
  return fallback ? 1 : 0;
};

const buildState = async (db: ReturnType<typeof drizzle>) => {
  const [
    allPeople,
    vPeriods,
    sPeriods,
    roles,
    documents,
    flags,
    suppressions,
    boardMemberships,
  ] = await Promise.all([
    db.select().from(person).all(),
    db.select().from(volunteerPeriod).all(),
    db.select().from(memberPeriod).all(),
    db.select().from(complianceRole).all(),
    db.select().from(complianceDocument).all(),
    db.select().from(complianceDocumentFlag).all(),
    db.select().from(alertSuppression).all(),
    db
      .select({
        member: boardMember,
        generation: boardGeneration,
      })
      .from(boardMember)
      .innerJoin(boardGeneration, eq(boardMember.generationId, boardGeneration.id))
      .all(),
  ]);

  const today = todayIso();
  const activeVolunteerIds = new Set<string>(
    vPeriods
      .filter((period) => !period.exitDate || period.exitDate >= today)
      .map((period) => period.personId)
  );
  const activeSocioIds = new Set<string>(
    sPeriods
      .filter((period) => !period.resignationDate || period.resignationDate >= today)
      .map((period) => period.personId)
  );
  const activeBoardIds = new Set<string>();

  for (const boardMembership of boardMemberships) {
    const startDate = boardMembership.generation.startDate;
    const endDate = boardMembership.generation.endDate;
    if ((!startDate || startDate <= today) && (!endDate || endDate >= today)) {
      activeBoardIds.add(boardMembership.member.personId);
    }
  }

  return {
    people: allPeople,
    activeVolunteerIds,
    activeSocioIds,
    activeBoardIds,
    roles,
    documents,
    flags,
    suppressions,
  };
};

const serializeDocument = (document: typeof complianceDocument.$inferSelect, flags: typeof complianceDocumentFlag.$inferSelect[]) => ({
  ...document,
  isCurrent: document.isCurrent === 1,
  isSigned: document.isSigned === 1,
  isDated: document.isDated === 1,
  isComplete: document.isComplete === 1,
  dataProcessingConsent: document.dataProcessingConsent === null ? null : document.dataProcessingConsent === 1,
  thirdPartyCommunicationConsent: document.thirdPartyCommunicationConsent === null ? null : document.thirdPartyCommunicationConsent === 1,
  imageUseConsent: document.imageUseConsent === null ? null : document.imageUseConsent === 1,
  flags: flags.map((flag) => ({
    ...flag,
    isProblematic: flag.isProblematic === 1,
  })),
});

complianceRouter.get('/summary', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const state = await buildState(db);
  const alerts = computeComplianceAlerts(state);

  const activeAlerts = alerts.filter((alert) => !alert.suppression);
  const suppressedAlerts = alerts.filter((alert) => alert.suppression);
  const groups = Array.from(
    activeAlerts.reduce((acc, alert) => {
      acc.set(alert.group, (acc.get(alert.group) ?? 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([group, count]) => ({ group, count }));

  return c.json({
    totalActiveAlerts: activeAlerts.length,
    totalSuppressedAlerts: suppressedAlerts.length,
    groups,
  });
});

complianceRouter.get('/alerts', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const includeSuppressed = c.req.query('includeSuppressed') === 'true';
  const db = drizzle(c.env.DB);
  const state = await buildState(db);
  const alerts = computeComplianceAlerts(state);

  return c.json({
    alerts: alerts.filter((alert) => includeSuppressed || !alert.suppression),
    suppressed: alerts.filter((alert) => alert.suppression),
  });
});

complianceRouter.get('/person/:personId', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const personId = c.req.param('personId');
  const db = drizzle(c.env.DB);
  const state = await buildState(db);

  const foundPerson = state.people.find((item) => item.id === personId);
  if (!foundPerson) {
    return c.json({ error: 'Person not found' }, 404);
  }

  const documents = state.documents.filter((document) => document.personId === personId);
  const flags = state.flags.filter((flag) => documents.some((document) => document.id === flag.documentId));
  const roles = state.roles.filter((role) => role.personId === personId);
  const alerts = computeComplianceAlerts({
    ...state,
    people: [foundPerson],
  });

  return c.json({
    roles: roles.map((role) => ({
      ...role,
      label: roleLabel(role.roleType),
      active: isRoleActive(role),
    })),
    documents: documents.map((document) =>
      serializeDocument(
        document,
        flags.filter((flag) => flag.documentId === document.id)
      )
    ),
    privacyStatus: getPrivacyStatus(documents),
    alerts: alerts.filter((alert) => !alert.suppression),
    suppressedAlerts: alerts.filter((alert) => alert.suppression),
  });
});

complianceRouter.post('/roles', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  const created = await db
    .insert(complianceRole)
    .values({
      id: crypto.randomUUID(),
      personId: body.personId,
      roleType: body.roleType,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      notes: body.notes || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return c.json(created, 201);
});

complianceRouter.patch('/roles/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const existing = await db.select().from(complianceRole).where(eq(complianceRole.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Role not found' }, 404);
  }

  const updated = await db
    .update(complianceRole)
    .set({
      roleType: body.roleType ?? existing.roleType,
      startDate: body.startDate ?? existing.startDate,
      endDate: body.endDate ?? existing.endDate,
      notes: body.notes ?? existing.notes,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(complianceRole.id, id))
    .returning()
    .get();

  return c.json(updated);
});

complianceRouter.delete('/roles/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  await db.delete(complianceRole).where(eq(complianceRole.id, id));
  return c.json({ success: true });
});

complianceRouter.post('/documents', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  if (body.isCurrent) {
    await db
      .update(complianceDocument)
      .set({ isCurrent: 0, updatedAt: now })
      .where(and(
        eq(complianceDocument.personId, body.personId),
        eq(complianceDocument.documentType, body.documentType)
      ));
  }

  const created = await db
    .insert(complianceDocument)
    .values({
      id: crypto.randomUUID(),
      personId: body.personId,
      documentType: body.documentType,
      version: body.version || null,
      driveUrl: body.driveUrl || null,
      signedAt: body.signedAt || null,
      effectiveFrom: body.effectiveFrom || null,
      effectiveTo: body.effectiveTo || null,
      isCurrent: booleanFromBody(body.isCurrent, true),
      isSigned: booleanFromBody(body.isSigned, false),
      isDated: booleanFromBody(body.isDated, false),
      isComplete: booleanFromBody(body.isComplete, true),
      dataProcessingConsent: body.dataProcessingConsent === null || body.dataProcessingConsent === undefined ? null : booleanFromBody(body.dataProcessingConsent, false),
      thirdPartyCommunicationConsent: body.thirdPartyCommunicationConsent === null || body.thirdPartyCommunicationConsent === undefined ? null : booleanFromBody(body.thirdPartyCommunicationConsent, false),
      imageUseConsent: body.imageUseConsent === null || body.imageUseConsent === undefined ? null : booleanFromBody(body.imageUseConsent, false),
      notes: body.notes || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return c.json(created, 201);
});

complianceRouter.patch('/documents/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const existing = await db.select().from(complianceDocument).where(eq(complianceDocument.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const now = new Date().toISOString();
  if (body.isCurrent) {
    await db
      .update(complianceDocument)
      .set({ isCurrent: 0, updatedAt: now })
      .where(and(
        eq(complianceDocument.personId, existing.personId),
        eq(complianceDocument.documentType, body.documentType ?? existing.documentType)
      ));
  }

  const updated = await db
    .update(complianceDocument)
    .set({
      documentType: body.documentType ?? existing.documentType,
      version: body.version ?? null,
      driveUrl: body.driveUrl ?? null,
      signedAt: body.signedAt ?? null,
      effectiveFrom: body.effectiveFrom ?? null,
      effectiveTo: body.effectiveTo ?? null,
      isCurrent: body.isCurrent === undefined ? existing.isCurrent : booleanFromBody(body.isCurrent),
      isSigned: body.isSigned === undefined ? existing.isSigned : booleanFromBody(body.isSigned),
      isDated: body.isDated === undefined ? existing.isDated : booleanFromBody(body.isDated),
      isComplete: body.isComplete === undefined ? existing.isComplete : booleanFromBody(body.isComplete),
      dataProcessingConsent:
        body.dataProcessingConsent === undefined
          ? existing.dataProcessingConsent
          : body.dataProcessingConsent === null
            ? null
            : booleanFromBody(body.dataProcessingConsent),
      thirdPartyCommunicationConsent:
        body.thirdPartyCommunicationConsent === undefined
          ? existing.thirdPartyCommunicationConsent
          : body.thirdPartyCommunicationConsent === null
            ? null
            : booleanFromBody(body.thirdPartyCommunicationConsent),
      imageUseConsent:
        body.imageUseConsent === undefined
          ? existing.imageUseConsent
          : body.imageUseConsent === null
            ? null
            : booleanFromBody(body.imageUseConsent),
      notes: body.notes ?? null,
      updatedAt: now,
    })
    .where(eq(complianceDocument.id, id))
    .returning()
    .get();

  return c.json(updated);
});

complianceRouter.delete('/documents/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  await db.delete(complianceDocumentFlag).where(eq(complianceDocumentFlag.documentId, id));
  await db.delete(complianceDocument).where(eq(complianceDocument.id, id));
  return c.json({ success: true });
});

complianceRouter.post('/documents/:id/flags', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const documentId = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  const created = await db
    .insert(complianceDocumentFlag)
    .values({
      id: crypto.randomUUID(),
      documentId,
      code: body.code || 'custom_flag',
      label: body.label,
      severity: body.severity || 'warning',
      isProblematic: booleanFromBody(body.isProblematic, true),
      note: body.note || null,
      resolvedAt: body.resolvedAt || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return c.json(created, 201);
});

complianceRouter.patch('/flags/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const existing = await db.select().from(complianceDocumentFlag).where(eq(complianceDocumentFlag.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Flag not found' }, 404);
  }

  const updated = await db
    .update(complianceDocumentFlag)
    .set({
      code: body.code ?? existing.code,
      label: body.label ?? existing.label,
      severity: body.severity ?? existing.severity,
      isProblematic: body.isProblematic === undefined ? existing.isProblematic : booleanFromBody(body.isProblematic),
      note: body.note ?? existing.note,
      resolvedAt: body.resolvedAt ?? existing.resolvedAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(complianceDocumentFlag.id, id))
    .returning()
    .get();

  return c.json(updated);
});

complianceRouter.delete('/flags/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  await db.delete(complianceDocumentFlag).where(eq(complianceDocumentFlag.id, id));
  return c.json({ success: true });
});

complianceRouter.post('/suppressions', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  const existing = await db.select().from(alertSuppression).where(eq(alertSuppression.alertKey, body.alertKey)).all();
  for (const suppression of existing.filter((item) => isSuppressionActive(item))) {
    await db
      .update(alertSuppression)
      .set({ releasedAt: now, updatedAt: now })
      .where(eq(alertSuppression.id, suppression.id));
  }

  const created = await db
    .insert(alertSuppression)
    .values({
      id: crypto.randomUUID(),
      alertKey: body.alertKey,
      personId: body.personId || null,
      reason: body.reason,
      note: body.note || null,
      untilDate: body.untilDate || null,
      suppressedBy: c.get('jwtPayload')?.email || null,
      suppressedAt: now,
      releasedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return c.json(created, 201);
});

complianceRouter.post('/suppressions/:id/release', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  const updated = await db
    .update(alertSuppression)
    .set({
      releasedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(alertSuppression.id, id))
    .returning()
    .get();

  if (!updated) {
    return c.json({ error: 'Suppression not found' }, 404);
  }

  return c.json(updated);
});

export default complianceRouter;
