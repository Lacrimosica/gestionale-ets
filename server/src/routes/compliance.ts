import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import { recomputeRetentionFlags } from '../lib/retention';
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
  consentRecord,
} from '../db/schema';
import {
  computeComplianceAlerts,
  getPrivacyStatus,
  isRoleActive,
  isSuppressionActive,
  roleLabel,
  loadRules,
  type ComplianceRules,
} from '../lib/compliance';
import { organizationSetting } from '../db/schema';

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

const complianceRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

complianceRouter.get('/rules', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const activeRules = await loadRules(db);
  return c.json(activeRules);
});

complianceRouter.put('/rules', async (c) => {
  const payload = c.get('jwtPayload');
  // Role now comes from JWT payload (sourced from organization_user table)
  if (payload.role !== 'core_admin') {
    return c.json({ error: 'Only core admin can update compliance rules' }, 403);
  }

  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const body = await c.req.json() as ComplianceRules;
  if (!body?.documentTypes || !body?.roles || !body?.baseRequirements) {
    return c.json({ error: 'Invalid compliance rules structure' }, 400);
  }

  const now = new Date().toISOString();
  const settingsId = `branding_${orgId}`;
  const existing = await db.select().from(organizationSetting).where(eq(organizationSetting.id, settingsId)).get();
  const rulesJson = JSON.stringify(body);

  if (existing) {
    await db.update(organizationSetting)
      .set({ complianceRules: rulesJson, updatedAt: now })
      .where(eq(organizationSetting.id, settingsId))
      .run();
  } else {
    await db.insert(organizationSetting).values({
      id: settingsId,
      orgId: orgId,
      complianceRules: rulesJson,
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  return c.json(body);
});

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

const todayIso = () => new Date().toISOString().split('T')[0];

const booleanFromBody = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value ? 1 : 0;
  return fallback ? 1 : 0;
};

const buildState = async (db: ReturnType<typeof drizzle>, orgId: string) => {
  const [
    allPeople,
    vPeriods,
    sPeriods,
    roles,
    documents,
    flags,
    suppressions,
    boardMemberships,
    consentRecords,
  ] = await Promise.all([
    db.select().from(person).where(eq(person.orgId, orgId)).all(),
    db.select().from(volunteerPeriod).where(eq(volunteerPeriod.orgId, orgId)).all(),
    db.select().from(memberPeriod).where(eq(memberPeriod.orgId, orgId)).all(),
    db.select().from(complianceRole).where(eq(complianceRole.orgId, orgId)).all(),
    db.select().from(complianceDocument).where(eq(complianceDocument.orgId, orgId)).all(),
    db.select().from(complianceDocumentFlag).where(eq(complianceDocumentFlag.orgId, orgId)).all(),
    db.select().from(alertSuppression).where(eq(alertSuppression.orgId, orgId)).all(),
    db
      .select({
        member: boardMember,
        generation: boardGeneration,
      })
      .from(boardMember)
      .innerJoin(boardGeneration, and(eq(boardMember.generationId, boardGeneration.id), eq(boardMember.orgId, orgId)))
      .where(eq(boardMember.orgId, orgId))
      .all(),
    db.select().from(consentRecord).where(eq(consentRecord.orgId, orgId)).all(),
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
    consentRecords,
    volunteerPeriods: vPeriods,
  };
};

const serializeDocument = (
  document: typeof complianceDocument.$inferSelect,
  flags: typeof complianceDocumentFlag.$inferSelect[],
  consentRecords: typeof consentRecord.$inferSelect[] = [],
) => {
  // Build latest consent status per type for this document's person
  const latestConsentByType: Record<string, { status: string; grantedAt: string | null; withdrawnAt: string | null; policyVersion: string | null; collectionMethod: string | null }> = {};
  for (const record of consentRecords) {
    const existing = latestConsentByType[record.consentType];
    if (!existing || record.createdAt > (existing as any)._createdAt) {
      latestConsentByType[record.consentType] = {
        status: record.status,
        grantedAt: record.grantedAt,
        withdrawnAt: record.withdrawnAt,
        policyVersion: record.policyVersion,
        collectionMethod: record.collectionMethod,
        // internal sort key, not exposed
        ...(({ _createdAt: record.createdAt }) as any),
      };
    }
  }

  // Clean up the internal sort key before returning
  const consentsByType: Record<string, { status: string; grantedAt: string | null; withdrawnAt: string | null; policyVersion: string | null; collectionMethod: string | null }> = {};
  for (const [type, data] of Object.entries(latestConsentByType)) {
    const { ...rest } = data as any;
    delete rest._createdAt;
    consentsByType[type] = rest;
  }

  return {
    ...document,
    isCurrent: document.isCurrent === 1,
    isSigned: document.isSigned === 1,
    isDated: document.isDated === 1,
    isComplete: document.isComplete === 1,
    isDigital: document.isDigital === 1,
    consentsByType,
    flags: flags.map((flag) => ({
      ...flag,
      isProblematic: flag.isProblematic === 1,
    })),
  };
};

complianceRouter.get('/summary', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const [state, activeRules] = await Promise.all([buildState(db, orgId), loadRules(db)]);
  const alerts = computeComplianceAlerts(state, activeRules);

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

  const { orgId } = c.get('jwtPayload');
  const includeSuppressed = c.req.query('includeSuppressed') === 'true';
  const db = drizzle(c.env.DB);
  const [state, activeRules] = await Promise.all([buildState(db, orgId), loadRules(db)]);
  const alerts = computeComplianceAlerts(state, activeRules);

  return c.json({
    alerts: alerts.filter((alert) => includeSuppressed || !alert.suppression),
    suppressed: alerts.filter((alert) => alert.suppression),
  });
});

complianceRouter.get('/person/:personId', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const personId = c.req.param('personId');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const [state, activeRules] = await Promise.all([buildState(db, orgId), loadRules(db)]);

  const foundPerson = state.people.find((item) => item.id === personId);
  if (!foundPerson) {
    return c.json({ error: 'Person not found' }, 404);
  }

  const documents = state.documents.filter((document) => document.personId === personId);
  const flags = state.flags.filter((flag) => documents.some((document) => document.id === flag.documentId));
  const roles = state.roles.filter((role) => role.personId === personId);
  const personConsentRecords = state.consentRecords.filter((record) => record.personId === personId);
  const alerts = computeComplianceAlerts({
    ...state,
    people: [foundPerson],
  }, activeRules);

  return c.json({
    roles: roles.map((role) => ({
      ...role,
      label: roleLabel(role.roleType, activeRules),
      active: isRoleActive(role),
    })),
    documents: documents.map((document) =>
      serializeDocument(
        document,
        flags.filter((flag) => flag.documentId === document.id),
        personConsentRecords.filter((record) => record.documentId === document.id),
      )
    ),
    privacyStatus: getPrivacyStatus(documents, personConsentRecords),
    alerts: alerts.filter((alert) => !alert.suppression),
    suppressedAlerts: alerts.filter((alert) => alert.suppression),
  });
});

complianceRouter.post('/roles', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  const created = await db
    .insert(complianceRole)
    .values({
      id: crypto.randomUUID(),
      personId: body.personId,
      orgId: orgId,
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
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const existing = await db.select().from(complianceRole).where(and(eq(complianceRole.id, id), eq(complianceRole.orgId, orgId))).get();

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
    .where(and(eq(complianceRole.id, id), eq(complianceRole.orgId, orgId)))
    .returning()
    .get();

  return c.json(updated);
});

complianceRouter.delete('/roles/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  await db.delete(complianceRole).where(and(eq(complianceRole.id, id), eq(complianceRole.orgId, orgId)));
  return c.json({ success: true });
});

const writeConsentRecords = async (
  db: ReturnType<typeof drizzle>,
  personId: string,
  documentId: string,
  orgId: string,
  consents: Array<{ consentType: string; status: string; grantedAt?: string; withdrawnAt?: string; policyVersion?: string; collectionMethod?: string; notes?: string }>,
  now: string,
) => {
  for (const consent of consents) {
    await db.insert(consentRecord).values({
      id: crypto.randomUUID(),
      personId,
      documentId,
      orgId: orgId,
      consentType: consent.consentType,
      status: consent.status,
      grantedAt: consent.grantedAt ?? null,
      withdrawnAt: consent.withdrawnAt ?? null,
      policyVersion: consent.policyVersion ?? null,
      collectionMethod: consent.collectionMethod ?? 'written_form',
      notes: consent.notes ?? null,
      createdAt: now,
      updatedAt: now,
    }).run();
  }
};

complianceRouter.post('/documents', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  await db
    .update(complianceDocument)
    .set({ isCurrent: 0, updatedAt: now })
    .where(and(
      eq(complianceDocument.personId, body.personId),
      eq(complianceDocument.documentType, body.documentType),
      eq(complianceDocument.orgId, orgId)
    ));

  const created = await db
    .insert(complianceDocument)
    .values({
      id: crypto.randomUUID(),
      personId: body.personId,
      orgId: orgId,
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
      isDigital: booleanFromBody(body.isDigital, true),
      notes: body.notes || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  // Write consent records if provided
  if (Array.isArray(body.consents) && body.consents.length > 0) {
    await writeConsentRecords(db, body.personId, created.id, orgId, body.consents, now);
  }

  return c.json(created, 201);
});

complianceRouter.patch('/documents/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const existing = await db.select().from(complianceDocument).where(and(eq(complianceDocument.id, id), eq(complianceDocument.orgId, orgId))).get();

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
        eq(complianceDocument.documentType, body.documentType ?? existing.documentType),
        eq(complianceDocument.orgId, orgId)
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
      isDigital: body.isDigital === undefined ? existing.isDigital : booleanFromBody(body.isDigital),
      notes: body.notes ?? null,
      updatedAt: now,
    })
    .where(and(eq(complianceDocument.id, id), eq(complianceDocument.orgId, orgId)))
    .returning()
    .get();

  // Write consent records if provided
  if (Array.isArray(body.consents) && body.consents.length > 0) {
    await writeConsentRecords(db, existing.personId, id, orgId, body.consents, now);
  }

  return c.json(updated);
});

complianceRouter.delete('/documents/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  await db.delete(complianceDocumentFlag).where(and(eq(complianceDocumentFlag.documentId, id), eq(complianceDocumentFlag.orgId, orgId)));
  await db.delete(complianceDocument).where(and(eq(complianceDocument.id, id), eq(complianceDocument.orgId, orgId)));
  return c.json({ success: true });
});

complianceRouter.post('/documents/:id/flags', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const documentId = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  const created = await db
    .insert(complianceDocumentFlag)
    .values({
      id: crypto.randomUUID(),
      documentId,
      orgId: orgId,
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
  const { orgId } = c.get('jwtPayload');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const existing = await db.select().from(complianceDocumentFlag).where(and(eq(complianceDocumentFlag.id, id), eq(complianceDocumentFlag.orgId, orgId))).get();

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
    .where(and(eq(complianceDocumentFlag.id, id), eq(complianceDocumentFlag.orgId, orgId)))
    .returning()
    .get();

  return c.json(updated);
});

complianceRouter.delete('/flags/:id', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const id = c.req.param('id');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  await db.delete(complianceDocumentFlag).where(and(eq(complianceDocumentFlag.id, id), eq(complianceDocumentFlag.orgId, orgId)));
  return c.json({ success: true });
});

// Standalone endpoint to record / update a single consent (e.g. withdrawal after document creation)
complianceRouter.post('/consent-records', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  const created = await db.insert(consentRecord).values({
    id: crypto.randomUUID(),
    personId: body.personId,
    documentId: body.documentId ?? null,
    orgId: orgId,
    consentType: body.consentType,
    status: body.status,
    grantedAt: body.grantedAt ?? null,
    withdrawnAt: body.withdrawnAt ?? null,
    policyVersion: body.policyVersion ?? null,
    collectionMethod: body.collectionMethod ?? null,
    notes: body.notes ?? null,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  return c.json(created, 201);
});

complianceRouter.get('/consent-records/:personId', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const personId = c.req.param('personId');
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const records = await db.select().from(consentRecord)
    .where(and(eq(consentRecord.personId, personId), eq(consentRecord.orgId, orgId)))
    .all();

  return c.json(records);
});

complianceRouter.post('/suppressions', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const body = await c.req.json();
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  const existing = await db.select().from(alertSuppression).where(and(eq(alertSuppression.alertKey, body.alertKey), eq(alertSuppression.orgId, orgId))).all();
  for (const suppression of existing.filter((item) => isSuppressionActive(item))) {
    await db
      .update(alertSuppression)
      .set({ releasedAt: now, updatedAt: now })
      .where(and(eq(alertSuppression.id, suppression.id), eq(alertSuppression.orgId, orgId)));
  }

  const created = await db
    .insert(alertSuppression)
    .values({
      id: crypto.randomUUID(),
      alertKey: body.alertKey,
      personId: body.personId || null,
      orgId: orgId,
      reason: body.reason,
      note: body.note || null,
      untilDate: body.untilDate || null,
      suppressedBy: c.get('jwtPayload')?.email || null,
      suppressedById: c.get('jwtPayload')?.sub || null,
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
  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const updated = await db
    .update(alertSuppression)
    .set({
      releasedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(alertSuppression.id, id), eq(alertSuppression.orgId, orgId)))
    .returning()
    .get();

  if (!updated) {
    return c.json({ error: 'Suppression not found' }, 404);
  }

  return c.json(updated);
});

// ── Retention / data-lifecycle endpoints ─────────────────────────────────

/**
 * GET /api/compliance/retention
 * Returns all people grouped into three buckets:
 *   can_remove   — safe to delete from the system
 *   regularize   — anchored but profile is incomplete
 *   anchored     — anchored and profile is complete (cannot remove, nothing urgent)
 */
complianceRouter.get('/retention', async (c) => {
  const denied = await requirePermission(c, 'people.view');
  if (denied) return denied;

  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  // Phase 5: Select both old and new column names during transition period
  const people = await db.select({
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    taxId: person.taxId,
    email: person.email,
    phone: person.phone,
    // Use new names (Phase 5)
    isInVolunteerRegistryPhysical: person.isInVolunteerRegistryPhysical,
    volunteerRegistryStartDate: person.volunteerRegistryStartDate,
    volunteerRegistryEndDate: person.volunteerRegistryEndDate,
    appearsInRuntsProceedings: person.appearsInRuntsProceedings,
    // Keep old names for fallback during transition
    inLibroVolontariCartaceo: person.inLibroVolontariCartaceo,
    libroVolontariStartDate: person.libroVolontariStartDate,
    libroVolontariEndDate: person.libroVolontariEndDate,
    appearsInRuntsVerbale: person.appearsInRuntsVerbale,
    canBeRemoved: person.canBeRemoved,
    needsRegularization: person.needsRegularization,
  }).from(person).where(eq(person.orgId, orgId)).all();

  const canRemove = people.filter((p) => p.canBeRemoved === 1);
  const regularize = people.filter((p) => p.canBeRemoved === 0 && p.needsRegularization === 1);
  const anchored = people.filter((p) => p.canBeRemoved === 0 && p.needsRegularization === 0);

  const serialize = (p: typeof people[0]) => ({
    ...p,
    // Phase 5: Use new names with fallback to old names
    isInVolunteerRegistryPhysical: (p.isInVolunteerRegistryPhysical ?? p.inLibroVolontariCartaceo) === 1,
    volunteerRegistryStartDate: p.volunteerRegistryStartDate ?? p.libroVolontariStartDate,
    volunteerRegistryEndDate: p.volunteerRegistryEndDate ?? p.libroVolontariEndDate,
    appearsInRuntsProceedings: (p.appearsInRuntsProceedings ?? p.appearsInRuntsVerbale) === 1,
    // Keep old fields for backward compatibility in response
    inLibroVolontariCartaceo: p.inLibroVolontariCartaceo === 1,
    libroVolontariStartDate: p.libroVolontariStartDate,
    libroVolontariEndDate: p.libroVolontariEndDate,
    appearsInRuntsVerbale: p.appearsInRuntsVerbale === 1,
    canBeRemoved: p.canBeRemoved === 1,
    needsRegularization: p.needsRegularization === 1,
  });

  return c.json({
    canRemove: canRemove.map(serialize),
    regularize: regularize.map(serialize),
    anchored: anchored.map(serialize),
    totals: {
      canRemove: canRemove.length,
      regularize: regularize.length,
      anchored: anchored.length,
      total: people.length,
    },
  });
});

/**
 * POST /api/compliance/recompute
 * Triggers a full recomputation of all retention-derived flags across the database.
 */
complianceRouter.post('/recompute', async (c) => {
  const denied = await requirePermission(c, 'people.edit');
  if (denied) return denied;

  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  await recomputeRetentionFlags(db, undefined, orgId);
  return c.json({ success: true });
});

export default complianceRouter;
