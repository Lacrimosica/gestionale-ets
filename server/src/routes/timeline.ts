import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { assembly, memberPeriod, person, agendaItem, convocation, user } from '../db/schema';
import { asc, eq, and } from 'drizzle-orm';

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

const timelineRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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


function buildAssemblyLabel(v: typeof assembly.$inferSelect): { label: string; labelKey: string; params: Record<string, any> } {
  const type = v.type;
  const nr = v.referenceNumber;
  const year = v.referenceYear;
  const tot = v.totalNumber;

  if (type === 'board_council') {
    return {
      label: `Board Council n. ${nr}`,
      labelKey: 'timeline.assemblyLabels.board_council_n',
      params: { number: nr }
    };
  }
  if (type === 'ordinary') {
    return {
      label: `Ordinary Assembly n. ${nr}/${year ?? '—'}`,
      labelKey: 'timeline.assemblyLabels.ordinary_n_year',
      params: { number: nr, year: year ?? '—' }
    };
  }
  if (type === 'extraordinary') {
    return {
      label: `Extraordinary Assembly n. ${nr}/${year ?? '—'}`,
      labelKey: 'timeline.assemblyLabels.extraordinary_n_year',
      params: { number: nr, year: year ?? '—' }
    };
  }
  if (type === 'constitution') {
    return {
      label: `Constitutional Assembly`,
      labelKey: 'timeline.assemblyLabels.constitution',
      params: {}
    };
  }
  return {
    label: `Assembly n. ${tot}`,
    labelKey: 'timeline.assemblyLabels.assembly_n',
    params: { total: tot }
  };
}

timelineRouter.get('/', async (c) => {
  const denied = await requirePermission(c, 'timeline.view');
  if (denied) return denied;

  const { orgId } = c.get('jwtPayload');
  const db = drizzle(c.env.DB);


  const [assembliesRaw, membershipEvents, allAgendaItems] = await Promise.all([
    db.select({
      assembly: assembly,
      convDate: convocation.date
    })
      .from(assembly)
      .leftJoin(convocation, and(eq(assembly.id, convocation.assemblyId), eq(assembly.orgId, orgId)))
      .where(eq(assembly.orgId, orgId))
      .orderBy(asc(assembly.firstCallDate)).all(),
    db.select({
      id: memberPeriod.id,
      personId: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      admission: memberPeriod.admissionDate,
      resignation: memberPeriod.resignationDate,
      admissionAssemblyId: memberPeriod.admissionAssemblyId,
      exitAssemblyId: memberPeriod.exitAssemblyId,
      canBeRemoved: person.canBeRemoved
    })
      .from(memberPeriod)
      .innerJoin(person, eq(memberPeriod.personId, person.id))
      .where(eq(memberPeriod.orgId, orgId))
      .all(),
    // Join agendaItem → convocation to recover assembly association
    db.select({
      id: agendaItem.id,
      number: agendaItem.number,
      title: agendaItem.title,
      description: agendaItem.description,
      assemblyId: convocation.assemblyId,
    })
      .from(agendaItem)
      .innerJoin(convocation, and(eq(agendaItem.convocationId, convocation.id), eq(agendaItem.orgId, orgId)))
      .where(eq(agendaItem.orgId, orgId))
      .all(),
  ]);

  const assemblies = assembliesRaw.map(r => ({
    ...r.assembly,
    convocationDate: r.convDate
  }));

  const agendaByAssembly = new Map<string, { number: number; title: string; description?: string | null }[]>();
  for (const item of allAgendaItems) {
    if (!item.assemblyId) continue;
    const list = agendaByAssembly.get(item.assemblyId) ?? [];
    list.push({ number: item.number, title: item.title, description: item.description });
    agendaByAssembly.set(item.assemblyId, list);
  }
  for (const [, list] of agendaByAssembly) {
    list.sort((a, b) => a.number - b.number);
  }

  // Calculate Compliance & Pending Verbals
  const pendingVerbals: any[] = [];
  const complianceErrors: any[] = [];

  // Group admissions/resignations by date to see missing chunks of verbals
  const unlinkedAdmissionsByDate = new Map<string, { id: string; name: string; canBeRemoved: boolean }[]>();
  const unlinkedResignationsByDate = new Map<string, string[]>();

  for (const m of membershipEvents) {
    // Check Admissions
    if (m.admission && !m.admissionAssemblyId) {
      const list = unlinkedAdmissionsByDate.get(m.admission) ?? [];
      list.push({ id: m.personId, name: `${m.firstName} ${m.lastName}`, canBeRemoved: !!m.canBeRemoved });
      unlinkedAdmissionsByDate.set(m.admission, list);
    }
    // Check Resignations
    if (m.resignation && !m.exitAssemblyId) {
      const list = unlinkedResignationsByDate.get(m.resignation) ?? [];
      list.push(`${m.firstName} ${m.lastName}`);
      unlinkedResignationsByDate.set(m.resignation, list);
    }

    // Stealth Changes Check: did a member change happen between a meeting convocation and its held date?
    for (const a of assemblies) {
      const convDate = a.convocationDate;
      const firstCall = a.firstCallDate;
      if (convDate && firstCall && convDate < firstCall) {
        const assemblyInfo = buildAssemblyLabel(a);
        const checkStealth = (memberDate: string | null, type: string) => {
          if (memberDate && memberDate > convDate && memberDate < firstCall) {
            complianceErrors.push({
              id: `stealth-${m.id}-${type}-${a.id}`,
              type: 'compliance_error',
              label: `Stealth ${type}: ${m.firstName} ${m.lastName}`,
              labelKey: 'timeline.complianceErrors.stealthChange',
              labelParams: { type, name: `${m.firstName} ${m.lastName}` },
              start: memberDate,
              end: memberDate,
              errorType: 'stealth_change',
              affectedAssemblyId: a.id,
              affectedAssemblyName: assemblyInfo.label,
              descriptionKey: 'timeline.complianceErrors.descriptionStealthChange',
              descriptionParams: {
                type,
                convocationDate: convDate,
                sessionDate: firstCall,
                assemblyName: assemblyInfo.label
              }
            });
          }
        };
        checkStealth(m.admission, 'admission');
        checkStealth(m.resignation, 'resignation');
      }
    }
  }

  // Collect all anchored person IDs to fetch retention reasons
  const anchoredPersonIds = new Set<string>();
  for (const list of unlinkedAdmissionsByDate.values()) {
    for (const p of list) {
      if (!p.canBeRemoved) anchoredPersonIds.add(p.id);
    }
  }

  let retentionReasonsByPerson: Record<string, string[]> = {};
  if (anchoredPersonIds.size > 0) {
    const { getRetentionReasons } = await import('../lib/retention');
    retentionReasonsByPerson = await getRetentionReasons(db, Array.from(anchoredPersonIds));
  }

  // Create "Pending Verbal" entries for unlinked groups
  for (const [date, payload] of unlinkedAdmissionsByDate) {
    const isAllRemovable = payload.length > 0 && payload.every(p => p.canBeRemoved);
    const isNoneRemovable = payload.length > 0 && payload.every(p => !p.canBeRemoved);
    const severity = isAllRemovable ? 'low' : (isNoneRemovable ? 'critical' : 'warning');
    
    const anchoredMembers = payload.filter(p => !p.canBeRemoved).map(p => ({
      name: p.name,
      reasons: retentionReasonsByPerson[p.id] || []
    }));
    
    const removableNames = payload.filter(p => p.canBeRemoved).map(p => p.name);
    const names = payload.map(p => p.name);

    pendingVerbals.push({
      id: `pending-adm-${date}`,
      type: 'pending_verbal',
      label: `Missing minutes: ${names.length} admission${names.length > 1 ? 's' : ''}`,
      labelKey: 'timeline.pendingVerbals.admission',
      labelParams: { count: names.length },
      start: date,
      end: date,
      subType: 'member_admission',
      affectedNames: names,
      severity,
      anchoredMembers,
      removableNames,
      descriptionKey: 'timeline.pendingVerbals.descriptionAdmission',
      descriptionParams: { names: names.join(', ') }
    });
  }
  for (const [date, names] of unlinkedResignationsByDate) {
    pendingVerbals.push({
      id: `pending-res-${date}`,
      type: 'pending_verbal',
      label: `Missing minutes: ${names.length} resignation${names.length > 1 ? 's' : ''}`,
      labelKey: 'timeline.pendingVerbals.resignation',
      labelParams: { count: names.length },
      start: date,
      end: date,
      subType: 'member_resignation',
      affectedNames: names,
      descriptionKey: 'timeline.pendingVerbals.descriptionResignation',
      descriptionParams: { names: names.join(', ') }
    });
  }

  const events = [
    ...assemblies.map(v => {
      const isHeld = v.assemblyStatus === 'held';
      const hasLinks = v.googleDocsLink || v.pdfLink;
      const isMissingVerbal = isHeld && !hasLinks;
      const assemblyInfo = buildAssemblyLabel(v);

      return {
        id: v.id,
        type: 'assembly' as const,
        label: assemblyInfo.label,
        labelKey: assemblyInfo.labelKey,
        labelParams: assemblyInfo.params,
        start: v.firstCallDate ?? v.convocationDate ?? v.createdAt,
        end: v.firstCallDate ?? v.convocationDate ?? v.createdAt,
        subType: v.type,
        status: v.assemblyStatus,
        totalNumber: v.totalNumber,
        referenceNumber: v.referenceNumber,
        referenceYear: v.referenceYear,
        googleDocsLink: v.googleDocsLink ?? undefined,
        pdfLink: v.pdfLink ?? undefined,
        location: v.location,
        mode: v.mode,
        presidentId: v.presidentId,
        agendaItems: agendaByAssembly.get(v.id) ?? [],
        complianceStatus: isMissingVerbal ? 'warning' : 'ok',
        errorDetailsKey: isMissingVerbal ? 'timeline.complianceErrors.missingDocumentLink' : undefined
      };
    }),
    ...pendingVerbals,
    ...complianceErrors,
    // Admissions
    ...membershipEvents.map(m => ({
      id: `${m.id}-admission`,
      type: 'member_admission' as const,
      label: `Admission: ${m.firstName} ${m.lastName}`,
      labelKey: 'timeline.membershipEvents.admission',
      labelParams: { name: `${m.firstName} ${m.lastName}` },
      start: m.admission,
      end: m.admission,
      linkedAssemblyId: m.admissionAssemblyId
    })),
    // Resignations (only if exists)
    ...membershipEvents.filter(m => m.resignation).map(m => ({
      id: `${m.id}-resignation`,
      type: 'member_resignation' as const,
      label: `Resignation: ${m.firstName} ${m.lastName}`,
      labelKey: 'timeline.membershipEvents.resignation',
      labelParams: { name: `${m.firstName} ${m.lastName}` },
      start: m.resignation!,
      end: m.resignation!,
      linkedAssemblyId: m.exitAssemblyId
    }))
  ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return c.json({
    events,
    membershipHistory: membershipEvents
  });
});

export default timelineRouter;
