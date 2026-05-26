import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, inArray, isNull, isNotNull, and, lte, gte, or } from 'drizzle-orm';
import { documentGenerationLog, user, boardMember, person, volunteerPeriod, memberPeriod, assembly, organizationSetting, organizationAddress, complianceRole, convocation, agendaItem, agendaItemPerson, organization } from '../db/schema';
import { BOARD_ROLES, type BoardRole } from '../lib/board-roles';
import { type WorkflowInput, type WorkflowType, type OrgSettings, runGeneration } from '../lib/document-engine';
import { formatItalianDate } from '../lib/date-utils';
import { refreshAccessToken } from '../services/google-auth';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_BASE_URL?: string;
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

const documentsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const ALL_WORKFLOW_TYPES: WorkflowType[] = [
  'member_admission',
  'budget_approval',
  'board_election',
  'member_exclusion',
  'member_resignation',
];

const SETTINGS_ID = 'branding';

function parsePermissions(value?: string | null, role?: string): string[] {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
  } catch {
    return [];
  }
}

async function requirePermission(c: any, permission: string) {
  const payload = c.get('jwtPayload');
  // Permissions now come from JWT payload (sourced from organization_user table)
  const permissions = payload.permissions || [];
  if (!permissions.includes(permission)) return c.json({ error: 'Forbidden' }, 403);
  return null;
}

// GET /api/documents/drive-status — check if current user has Drive connected
documentsRouter.get('/drive-status', async (c) => {
  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const currentUser = await db.select().from(user).where(eq(user.id, payload.sub)).get();
  if (!currentUser) return c.json({ error: 'User not found' }, 404);
  return c.json({ connected: !!currentUser.googleRefreshToken });
});

// GET /api/documents/drive-auth-url — get URL to start Drive OAuth (protected)
documentsRouter.get('/drive-auth-url', async (c) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_BASE_URL, JWT_SECRET } = c.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_BASE_URL) {
    return c.json({ error: 'Google OAuth not configured' }, 503);
  }

  const payload = c.get('jwtPayload');
  const state = await sign(
    { type: 'drive', userId: payload.sub, exp: Math.floor(Date.now() / 1000) + 600 },
    JWT_SECRET,
  );

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${GOOGLE_REDIRECT_BASE_URL}/api/auth/google/drive/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return c.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

// GET /api/documents/board-officers — returns deduplicated name lists for presidente and segretario suggestions
documentsRouter.get('/board-officers', async (c) => {
  const denied = await requirePermission(c, 'documents.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const rows = await db
    .select({ firstName: person.firstName, lastName: person.lastName, role: boardMember.role })
    .from(boardMember)
    .innerJoin(person, eq(boardMember.personId, person.id))
    .where(inArray(boardMember.role, [BOARD_ROLES.PRESIDENT, BOARD_ROLES.VICE_PRESIDENT, BOARD_ROLES.SECRETARY]))
    .all();

  const presidenteRoles: Set<BoardRole> = new Set([BOARD_ROLES.PRESIDENT, BOARD_ROLES.VICE_PRESIDENT]);
  const segretarioRoles: Set<BoardRole> = new Set([BOARD_ROLES.VICE_PRESIDENT, BOARD_ROLES.SECRETARY]);

  const presidenteSeen = new Set<string>();
  const segretarioSeen = new Set<string>();
  const presidenti: string[] = [];
  const segretari: string[] = [];

  for (const row of rows) {
    const name = `${row.firstName} ${row.lastName}`;
    if (presidenteRoles.has(row.role) && !presidenteSeen.has(name)) {
      presidenteSeen.add(name);
      presidenti.push(name);
    }
    if (segretarioRoles.has(row.role) && !segretarioSeen.has(name)) {
      segretarioSeen.add(name);
      segretari.push(name);
    }
  }

  return c.json({ presidenti, segretari });
});

// GET /api/documents/board-officers-by-date?date=YYYY-MM-DD
// Returns the active president and secretary based on compliance roles on a given date
documentsRouter.get('/board-officers-by-date', async (c) => {
  const denied = await requirePermission(c, 'documents.view');
  if (denied) return denied;

  const date = c.req.query('date');
  if (!date) return c.json({ error: 'date query param required (YYYY-MM-DD)' }, 400);

  const db = drizzle(c.env.DB);

  const roles = await db
    .select({ roleType: complianceRole.roleType, firstName: person.firstName, lastName: person.lastName })
    .from(complianceRole)
    .innerJoin(person, eq(complianceRole.personId, person.id))
    .where(
      and(
        or(isNull(complianceRole.startDate), lte(complianceRole.startDate, date)),
        or(isNull(complianceRole.endDate), gte(complianceRole.endDate, date))
      )
    )
    .all();

  const presidentRoles = new Set(['Presidente', 'President', 'Vice Presidente', 'Vice President']);
  const secretaryRoles = new Set(['Segretario', 'Secretary']);

  const presidenti = roles
    .filter((r) => presidentRoles.has(r.roleType))
    .map((r) => `${r.firstName} ${r.lastName}`);

  const segretari = roles
    .filter((r) => secretaryRoles.has(r.roleType))
    .map((r) => `${r.firstName} ${r.lastName}`);

  return c.json({ presidenti, segretari });
});

// GET /api/documents/member-candidates — active volunteers without an active membership (for nuoviSoci / sociEsclusi pickers)
documentsRouter.get('/member-candidates', async (c) => {
  const denied = await requirePermission(c, 'documents.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);

  // Find person IDs that already have an active membership (no resignationDate)
  const activeMembers = await db
    .select({ personId: memberPeriod.personId })
    .from(memberPeriod)
    .where(isNull(memberPeriod.resignationDate))
    .all();
  const activeMemberIds = new Set(activeMembers.map((m) => m.personId));

  // Active volunteers
  const volunteers = await db
    .select({ id: person.id, firstName: person.firstName, lastName: person.lastName })
    .from(volunteerPeriod)
    .innerJoin(person, eq(volunteerPeriod.personId, person.id))
    .where(eq(volunteerPeriod.status, 'active'))
    .all();

  // Deduplicate by personId and exclude those already members
  const seen = new Set<string>();
  const candidates: { id: string; nome: string }[] = [];
  for (const v of volunteers) {
    if (!activeMemberIds.has(v.id) && !seen.has(v.id)) {
      seen.add(v.id);
      candidates.push({ id: v.id, nome: `${v.firstName} ${v.lastName}` });
    }
  }

  return c.json(candidates);
});

// GET /api/documents/resigned-members — members with a recorded resignation date (for dimissioni picker)
documentsRouter.get('/resigned-members', async (c) => {
  const denied = await requirePermission(c, 'documents.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);

  const rows = await db
    .select({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      resignationDate: memberPeriod.resignationDate,
    })
    .from(memberPeriod)
    .innerJoin(person, eq(memberPeriod.personId, person.id))
    .where(and(isNotNull(memberPeriod.exitReason), isNotNull(memberPeriod.resignationDate)))
    .all();

  // Deduplicate — keep most recent resignation per person
  const byPerson = new Map<string, { id: string; nome: string; dataRimissioni: string }>();
  for (const row of rows) {
    const key = row.id;
    const existing = byPerson.get(key);
    if (!existing || (row.resignationDate ?? '') > (existing.dataRimissioni ?? '')) {
      byPerson.set(key, {
        id: row.id,
        nome: `${row.firstName} ${row.lastName}`,
        dataRimissioni: row.resignationDate ?? '',
      });
    }
  }

  return c.json(Array.from(byPerson.values()));
});

// GET /api/documents/active-members — currently active members (no resignationDate) for exclusion / dimissioni pickers
documentsRouter.get('/active-members', async (c) => {
  const denied = await requirePermission(c, 'documents.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const rows = await db
    .select({ id: person.id, firstName: person.firstName, lastName: person.lastName })
    .from(memberPeriod)
    .innerJoin(person, eq(memberPeriod.personId, person.id))
    .where(isNull(memberPeriod.resignationDate))
    .all();

  const seen = new Set<string>();
  const result: { id: string; nome: string }[] = [];
  for (const r of rows) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      result.push({ id: r.id, nome: `${r.firstName} ${r.lastName}` });
    }
  }
  result.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  return c.json(result);
});

// GET /api/documents/active-volunteers — all active volunteers for board election picker
documentsRouter.get('/active-volunteers', async (c) => {
  const denied = await requirePermission(c, 'documents.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const rows = await db
    .select({ id: person.id, firstName: person.firstName, lastName: person.lastName })
    .from(volunteerPeriod)
    .innerJoin(person, eq(volunteerPeriod.personId, person.id))
    .where(eq(volunteerPeriod.status, 'active'))
    .all();

  const seen = new Set<string>();
  const result: { id: string; nome: string }[] = [];
  for (const r of rows) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      result.push({ id: r.id, nome: `${r.firstName} ${r.lastName}` });
    }
  }
  result.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  return c.json(result);
});

// GET /api/documents/all-volunteers-with-status — all persons with a volunteer period, labelled by current status
documentsRouter.get('/all-volunteers-with-status', async (c) => {
  const denied = await requirePermission(c, 'documents.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);

  // All persons who have ever had a volunteer period
  const volRows = await db
    .select({ id: person.id, firstName: person.firstName, lastName: person.lastName, volStatus: volunteerPeriod.status })
    .from(volunteerPeriod)
    .innerJoin(person, eq(volunteerPeriod.personId, person.id))
    .all();

  // Current active member person IDs
  const memberRows = await db
    .select({ personId: memberPeriod.personId })
    .from(memberPeriod)
    .where(isNull(memberPeriod.resignationDate))
    .all();
  const activeMemberIds = new Set(memberRows.map((r) => r.personId));

  // Consolidate: one entry per person, tracking if any period is active
  const personMap = new Map<string, { id: string; firstName: string; lastName: string; hasActiveVol: boolean }>();
  for (const row of volRows) {
    const existing = personMap.get(row.id);
    if (!existing) {
      personMap.set(row.id, { id: row.id, firstName: row.firstName, lastName: row.lastName, hasActiveVol: row.volStatus === 'active' });
    } else if (row.volStatus === 'active') {
      existing.hasActiveVol = true;
    }
  }

  const result = [...personMap.values()].map((p) => {
    const isMember = activeMemberIds.has(p.id);
    const label = isMember ? 'socio' : p.hasActiveVol ? 'volontario' : 'dimesso';
    return { id: p.id, nome: `${p.firstName} ${p.lastName}`, label };
  });

  result.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  return c.json(result);
});

// POST /api/documents/generate
documentsRouter.post('/generate', async (c) => {
  const denied = await requirePermission(c, 'documents.generate');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const body = await c.req.json<WorkflowInput & { assemblyId?: string }>();

  // Validate workflowTypes
  const hasWorkflows = Array.isArray(body.workflowTypes) && body.workflowTypes.length > 0;
  const hasExtraItems = Array.isArray(body.extraAgendaItems) && body.extraAgendaItems.length > 0;
  const hasResignations = Array.isArray(body.resignations) && body.resignations.length > 0;

  if (!hasWorkflows && !hasExtraItems && !hasResignations) {
    return c.json({ error: 'Seleziona almeno un punto dell\'ordine del giorno o un tipo di documento.' }, 400);
  }

  if (hasWorkflows) {
    const invalid = body.workflowTypes.filter((t: any) => !ALL_WORKFLOW_TYPES.includes(t));
    if (invalid.length > 0) {
      return c.json({ error: `Invalid workflowTypes: ${invalid.join(', ')}` }, 400);
    }
  }

  // Validate required base fields
  const missing = (
    ['assemblyNumber', 'firstCallStart', 'secondCallStart', 'totalMembers', 'presentMembers',
     'president', 'secretary', 'signatoryRole', 'firstCallModality', 'secondCallModality', 'minutesOpeningModality'] as const
  ).filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length > 0) {
    return c.json({ error: `Missing required fields: ${missing.join(', ')}` }, 400);
  }

  // Validate workflow-specific required fields
  const specificFieldRequired: Record<WorkflowType, keyof WorkflowInput> = {
    member_admission:      'newMembers',
    budget_approval:       'budgetYear',
    board_election:        'newBoard',
    member_exclusion:      'excludedMembers',
    member_resignation:    'resignations' as any,
  };
  for (const type of body.workflowTypes) {
    const field = specificFieldRequired[type];
    if (!body[field]) {
      return c.json({ error: `Missing required field for ${type}: ${field}` }, 400);
    }
  }

  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  // ── Auto-detect and merge workflow data if assemblyId is provided ────────────────
  if (body.assemblyId) {
    const assemblyRes = await db.select().from(assembly).where(eq(assembly.id, body.assemblyId)).get();
    if (assemblyRes && assemblyRes.endTime) {
      body.secondCallEnd = assemblyRes.endTime;
    }

    // Find convocation for this assembly
    const convRes = await db.select().from(convocation)
      .where(or(eq(convocation.assemblyId, body.assemblyId), eq(convocation.secondAssemblyId, body.assemblyId)))
      .get();

    if (convRes) {
      const items = await db.select().from(agendaItem)
        .where(eq(agendaItem.convocationId, convRes.id))
        .all();

      // Sort items by number
      items.sort((a, b) => a.number - b.number);

      const detectedWorkflows: WorkflowType[] = [];
      const votingResults: Record<string, any[]> = body.votingResults || {};
      const extraItems: any[] = [];
      const resignations: any[] = body.resignations || [];

      for (const item of items) {
        const itemType = item.workflowType as WorkflowType;
        const itemData = item.workflowData ? JSON.parse(item.workflowData) : {};

        if (itemType && ALL_WORKFLOW_TYPES.includes(itemType)) {
          if (!detectedWorkflows.includes(itemType)) {
            detectedWorkflows.push(itemType);
          }
          // Populate workflow-specific fields from DB data
          if (itemType === 'member_admission' || itemType === 'board_election' || itemType === 'member_exclusion') {
            // Fetch member person names from junction table
            const members = await db.select({ personId: agendaItemPerson.personId })
              .from(agendaItemPerson)
              .where(eq(agendaItemPerson.agendaItemId, item.id))
              .all();

            if (members.length > 0) {
              const personDetails = await db.select({ firstName: person.firstName, lastName: person.lastName })
                .from(person)
                .where(inArray(person.id, members.map((m: any) => m.personId)))
                .all();
              const memberNames = personDetails.map((p: any) => `${p.firstName} ${p.lastName}`).join('\n');

              if (itemType === 'member_admission') {
                body.newMembers = memberNames || body.newMembers;
              } else if (itemType === 'board_election') {
                body.newBoard = memberNames || body.newBoard;
              } else if (itemType === 'member_exclusion') {
                body.excludedMembers = memberNames || body.excludedMembers;
              }
            } else {
              // Fall back to trying to parse from itemData if no junction rows
              if (itemType === 'member_admission') {
                body.newMembers = itemData.members?.join('\n') || body.newMembers;
              } else if (itemType === 'board_election') {
                body.newBoard = itemData.members?.join('\n') || body.newBoard;
              } else if (itemType === 'member_exclusion') {
                body.excludedMembers = itemData.members?.join('\n') || body.excludedMembers;
              }
            }
          } else if (itemType === 'budget_approval') {
            body.budgetYear = itemData.budgetYear || body.budgetYear;
          } else if (itemType === 'member_resignation') {
            if (Array.isArray(itemData.resignations)) {
              // Format: { name, date }
              resignations.push(...itemData.resignations);
            }
          }
        } else {
          // Extra item (not a specific workflow)
          extraItems.push({
            id: item.id,
            title: item.title,
            body: item.description || ''
          });
        }

        // Extract voting results for this point
        if (itemData.voting && Array.isArray(itemData.voting)) {
          // Key can be workflow type OR point ID for generic points
          const key = itemType || item.id;
          votingResults[key] = itemData.voting;
        }
      }

      // Merge detected workflows into the body
      if (detectedWorkflows.length > 0) {
        body.workflowTypes = detectedWorkflows;
      }
      if (extraItems.length > 0) {
        body.extraAgendaItems = extraItems;
      }
      if (resignations.length > 0) {
        body.resignations = resignations;
      }
      body.votingResults = votingResults;
    }
  }

  const firstCallDate = formatItalianDate(new Date(body.firstCallStart));

  // Load org settings from DB
  const settings = await db.select().from(organizationSetting).where(eq(organizationSetting.orgId, payload.orgId)).get();
  if (!settings?.templateConvocationId) {
    return c.json({ error: 'Document templates not configured. Go to Settings → Documents.' }, 503);
  }

  // Load organization details for branding
  const org = await db.select().from(organization).where(eq(organization.id, payload.orgId)).get();
  if (!org) {
    return c.json({ error: 'Organization not found' }, 404);
  }

  // Resolve assembly type/subtype from the already-loaded assembly record (if assemblyId provided)
  let assemblyType: string = 'ordinary';
  let assemblySubtype: string | null = null;
  if (body.assemblyId) {
    const asmRecord = await db.select({ type: assembly.type, subtype: assembly.subtype })
      .from(assembly).where(eq(assembly.id, body.assemblyId)).get();
    if (asmRecord) {
      assemblyType = asmRecord.type;
      assemblySubtype = asmRecord.subtype ?? null;
    }
  }

  // Select the correct convocation template based on assembly type/subtype
  let selectedConvocationId: string = settings.templateConvocationId;
  if (assemblyType === 'extraordinary') {
    if (assemblySubtype === 'statute_modification' && settings.templateConvocationExtraordinaryStatuteId) {
      selectedConvocationId = settings.templateConvocationExtraordinaryStatuteId;
    } else if (assemblySubtype === 'dissolution' && settings.templateConvocationExtraordinaryDissolutionId) {
      selectedConvocationId = settings.templateConvocationExtraordinaryDissolutionId;
    }
    // merger_split and generic fall back to the ordinary convocation template
  } else if (assemblyType === 'board_council') {
    if (settings.templateConvocationBoardId) {
      selectedConvocationId = settings.templateConvocationBoardId;
    }
  }

  // Resolve org address: pick the most recent entry with effectiveFrom <= assembly date
  const assemblyDateStr = body.firstCallStart.slice(0, 10); // ISO date portion
  const allAddresses = await db.select().from(organizationAddress).all();
  const resolvedAddress = allAddresses
    .filter((a) => a.effectiveFrom <= assemblyDateStr)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.address ?? '';

  const orgSettings: OrgSettings = {
    organizationName:         org.name ?? '',
    city:                     settings.city ?? '',
    address:                  resolvedAddress,
    statuteArticleConvocation: settings.statuteArticleConvocation ?? '',
    statuteArticleProxies:    settings.statuteArticleProxies ?? '',
    statuteArticleMembers:    settings.statuteArticleMembers ?? '',
    statuteArticleBoardVote:  settings.statuteArticleBoardVote ?? '',
    statuteArticleBoardElection: settings.statuteArticleBoardElection ?? '',
    maxProxies:               settings.maxProxies ?? 3,
    outputFolderId:           settings.outputFolderId ?? '',
    templateConvocationId:    selectedConvocationId,
    templateMinutes1aId:      settings.templateMinutes1aId,
    templateMinutes2aId:      settings.templateMinutes2aId,
  };

  // Resolve access token
  const currentUser = await db.select().from(user).where(eq(user.id, payload.sub)).get();
  if (!currentUser?.googleRefreshToken) {
    return c.json({ ok: false, error: 'Google Drive not connected. Go to Documents → Autorizza Google Drive.' }, 403);
  }

  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(
      currentUser.googleRefreshToken,
      c.env.GOOGLE_CLIENT_ID!,
      c.env.GOOGLE_CLIENT_SECRET!,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('invalid_grant')) {
      await db
        .update(user)
        .set({ googleRefreshToken: null, googleAccessToken: null, googleTokenExpiry: null })
        .where(eq(user.id, payload.sub))
        .run();
      return c.json({ ok: false, error: 'drive_reauth_required' }, 401);
    }
    return c.json({ ok: false, error: `Drive token refresh failed: ${msg}` }, 502);
  }

  try {
    const result = await runGeneration(body, orgSettings, {}, accessToken);

    await db.insert(documentGenerationLog).values({
      id,
      orgId: payload.orgId,
      assemblyId: body.assemblyId ?? null,
      workflowType: body.workflowTypes.join(','),
      assemblyNumber: body.assemblyNumber,
      firstCallDate,
      triggeredBy: payload.email,
      triggeredById: payload.sub,
      status: 'success',
      convocazioneDriveUrl: result.convocation?.driveUrl ?? null,
      verbale1aDriveUrl:    result.minutes1a?.driveUrl ?? null,
      verbale2aDriveUrl:    result.minutes2a?.driveUrl ?? null,
      convocazionePdfUrl:   result.convocation?.pdfUrl ?? null,
      verbale1aPdfUrl:      result.minutes1a?.pdfUrl ?? null,
      verbale2aPdfUrl:      result.minutes2a?.pdfUrl ?? null,
      createdAt: now,
    });

    if (body.assemblyId && result.minutes2a) {
      await db
        .update(assembly)
        .set({ googleDocsLink: result.minutes2a.driveUrl, pdfLink: result.minutes2a.pdfUrl, updatedAt: now })
        .where(eq(assembly.id, body.assemblyId))
        .run();
    }

    return c.json({ ok: true, generationId: id, documents: result });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await db.insert(documentGenerationLog).values({
      id,
      orgId: payload.orgId,
      assemblyId: body.assemblyId ?? null,
      workflowType: body.workflowTypes.join(','),
      assemblyNumber: body.assemblyNumber,
      firstCallDate,
      triggeredBy: payload.email,
      triggeredById: payload.sub,
      status: 'error',
      errorMessage,
      createdAt: now,
    });

    console.error('Document generation error:', errorMessage);
    return c.json({ ok: false, error: errorMessage }, 500);
  }
});

// GET /api/documents/history
documentsRouter.get('/history', async (c) => {
  const denied = await requirePermission(c, 'documents.view');
  if (denied) return denied;

  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const offset = Number(c.req.query('offset') ?? 0);
  const db = drizzle(c.env.DB);

  const records = await db
    .select()
    .from(documentGenerationLog)
    .orderBy(desc(documentGenerationLog.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return c.json(records);
});

// GET /api/documents/history/:id
documentsRouter.get('/history/:id', async (c) => {
  const denied = await requirePermission(c, 'documents.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const record = await db
    .select()
    .from(documentGenerationLog)
    .where(eq(documentGenerationLog.id, c.req.param('id')))
    .get();

  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

// PATCH /api/documents/history/:id — update notes only
documentsRouter.patch('/history/:id', async (c) => {
  const denied = await requirePermission(c, 'documents.manage');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const { id } = c.req.param();
  const { notes } = await c.req.json<{ notes: string }>();

  const existing = await db
    .select()
    .from(documentGenerationLog)
    .where(eq(documentGenerationLog.id, id))
    .get();

  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db
    .update(documentGenerationLog)
    .set({ notes: notes ?? null })
    .where(eq(documentGenerationLog.id, id))
    .run();

  const updated = await db
    .select()
    .from(documentGenerationLog)
    .where(eq(documentGenerationLog.id, id))
    .get();

  return c.json(updated);
});

// DELETE /api/documents/history/:id
documentsRouter.delete('/history/:id', async (c) => {
  const denied = await requirePermission(c, 'documents.manage');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const { id } = c.req.param();

  const existing = await db
    .select()
    .from(documentGenerationLog)
    .where(eq(documentGenerationLog.id, id))
    .get();

  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db.delete(documentGenerationLog).where(eq(documentGenerationLog.id, id)).run();
  return c.json({ success: true });
});

export default documentsRouter;
