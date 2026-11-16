/**
 * Retention recompute logic.
 *
 * Three derived flags are stored on the person row and must be kept in sync:
 *   appears_in_runts_verbale  — attended at least one assembly that has been deposited on RUNTS
 *   can_be_removed            — no legal obligation to retain the record
 *   needs_regularization      — cannot be removed but has incomplete profile data
 *
 * Call recomputeRetentionFlags() whenever:
 *   - an assembly's deposited_on_runts or runts_deposit_date changes
 *   - attendance records are created or deleted for a RUNTS-deposited assembly
 *   - a person's in_libro_volontari_* fields change
 *   - volunteer/member/board/compliance-role periods change
 *   - the "recompute all" button is pressed
 *
 * Every load is scoped to one organization in SQL: retention decisions must never
 * read or write another tenant's records.
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import {
  person,
  assembly,
  attendance,
  volunteerPeriod,
  memberPeriod,
  boardMember,
  boardGeneration,
  complianceRole,
} from '../db/schema';

type DB = ReturnType<typeof drizzle>;

type Person = typeof person.$inferSelect;

/** Per-org facts the retention decision depends on, already narrowed to the people in scope. */
export type RetentionFacts = {
  runtsAssemblyIds: Set<string>;
  attendances: Array<{ personId: string; assemblyId: string }>;
  volunteerPeriods: Array<{ personId: string; exitDate: string | null }>;
  memberPeriods: Array<{ personId: string; resignationDate: string | null }>;
  boardTerms: Array<{ personId: string; startDate: string | null; endDate: string | null }>;
  complianceRoles: Array<{ personId: string; endDate: string | null }>;
};

export type RetentionReason =
  | 'timeline.retentionReasons.runts'
  | 'timeline.retentionReasons.libroVolontariActive'
  | 'timeline.retentionReasons.libroVolontariRetention'
  | 'timeline.retentionReasons.activeVolunteer'
  | 'timeline.retentionReasons.activeMember'
  | 'timeline.retentionReasons.activeBoard'
  | 'timeline.retentionReasons.activeRole';

const todayIso = () => new Date().toISOString().split('T')[0];

/**
 * Add ten years to an ISO date string and return the resulting ISO date string.
 */
const addTenYears = (isoDate: string): string => {
  const d = new Date(isoDate);
  d.setFullYear(d.getFullYear() + 10);
  return d.toISOString().split('T')[0];
};

const isOngoing = (endDate: string | null, today: string) => !endDate || endDate >= today;

/**
 * Decide why a person must be retained. An empty list means the record can be removed.
 */
export const retentionReasonsFor = (
  p: Pick<
    Person,
    'id' | 'isInVolunteerRegistryPhysical' | 'inLibroVolontariCartaceo' | 'volunteerRegistryEndDate' | 'libroVolontariEndDate'
  >,
  facts: RetentionFacts,
  today: string,
): RetentionReason[] => {
  const reasons: RetentionReason[] = [];

  if (facts.attendances.some((a) => a.personId === p.id && facts.runtsAssemblyIds.has(a.assemblyId))) {
    reasons.push('timeline.retentionReasons.runts');
  }

  // Phase 5: new column name with fallback to the old one
  const inVolunteerRegistry = (p.isInVolunteerRegistryPhysical ?? p.inLibroVolontariCartaceo) === 1;
  const registryEndDate = p.volunteerRegistryEndDate ?? p.libroVolontariEndDate;
  if (inVolunteerRegistry) {
    if (!registryEndDate) {
      reasons.push('timeline.retentionReasons.libroVolontariActive');
    } else if (addTenYears(registryEndDate) > today) {
      reasons.push('timeline.retentionReasons.libroVolontariRetention');
    }
  }

  if (facts.volunteerPeriods.some((v) => v.personId === p.id && isOngoing(v.exitDate, today))) {
    reasons.push('timeline.retentionReasons.activeVolunteer');
  }
  if (facts.memberPeriods.some((m) => m.personId === p.id && isOngoing(m.resignationDate, today))) {
    reasons.push('timeline.retentionReasons.activeMember');
  }
  if (facts.boardTerms.some((b) =>
    b.personId === p.id && (!b.startDate || b.startDate <= today) && isOngoing(b.endDate, today),
  )) {
    reasons.push('timeline.retentionReasons.activeBoard');
  }
  if (facts.complianceRoles.some((r) => r.personId === p.id && isOngoing(r.endDate, today))) {
    reasons.push('timeline.retentionReasons.activeRole');
  }

  return reasons;
};

/**
 * Derive the stored flags from a person's retention reasons.
 */
export const retentionFlagsFor = (
  p: Pick<Person, 'taxId' | 'email' | 'phone' | 'isPresumedNonExistent'>,
  reasons: RetentionReason[],
) => {
  const isAnchored = reasons.length > 0;
  const profileIncomplete = !p.taxId || !p.email || !p.phone;
  return {
    appearsInRunts: reasons.includes('timeline.retentionReasons.runts') ? 1 : 0,
    canBeRemoved: isAnchored ? 0 : 1,
    // Ghost records (presumed non-existent) are exempt from regularization
    needsRegularization: !isAnchored || p.isPresumedNonExistent === 1 ? 0 : profileIncomplete ? 1 : 0,
  };
};

/**
 * Load the org's people (optionally narrowed to `personIds`) and the facts their
 * retention depends on. Every query is filtered by org in SQL.
 */
const loadRetentionInputs = async (
  db: DB,
  orgId: string,
  personIds?: string[],
): Promise<{ people: Person[]; facts: RetentionFacts }> => {
  const wanted = personIds ? new Set(personIds) : null;
  const inScope = (id: string) => !wanted || wanted.has(id);

  const [orgPeople, runtsAssemblies, attendances, vPeriods, mPeriods, boardTerms, cRoles] = await Promise.all([
    db.select().from(person).where(eq(person.orgId, orgId)).all(),
    db.select({ id: assembly.id }).from(assembly)
      .where(and(eq(assembly.orgId, orgId), eq(assembly.depositedOnRunts, 1))).all(),
    db.select({ personId: attendance.personId, assemblyId: attendance.assemblyId }).from(attendance)
      .where(eq(attendance.orgId, orgId)).all(),
    db.select({ personId: volunteerPeriod.personId, exitDate: volunteerPeriod.exitDate }).from(volunteerPeriod)
      .where(eq(volunteerPeriod.orgId, orgId)).all(),
    db.select({ personId: memberPeriod.personId, resignationDate: memberPeriod.resignationDate }).from(memberPeriod)
      .where(eq(memberPeriod.orgId, orgId)).all(),
    db.select({ personId: boardMember.personId, startDate: boardGeneration.startDate, endDate: boardGeneration.endDate })
      .from(boardMember)
      .innerJoin(boardGeneration, eq(boardMember.generationId, boardGeneration.id))
      .where(and(eq(boardMember.orgId, orgId), eq(boardGeneration.orgId, orgId))).all(),
    db.select({ personId: complianceRole.personId, endDate: complianceRole.endDate }).from(complianceRole)
      .where(eq(complianceRole.orgId, orgId)).all(),
  ]);

  // Person-id narrowing stays in JS: D1 caps bound parameters per statement, so a
  // large IN (...) list would fail, and the org-scoped sets are already small.
  return {
    people: orgPeople.filter((p) => inScope(p.id)),
    facts: {
      runtsAssemblyIds: new Set(runtsAssemblies.map((a) => a.id)),
      attendances: attendances.filter((a) => inScope(a.personId)),
      volunteerPeriods: vPeriods.filter((v) => inScope(v.personId)),
      memberPeriods: mPeriods.filter((m) => inScope(m.personId)),
      boardTerms: boardTerms.filter((b) => inScope(b.personId)),
      complianceRoles: cRoles.filter((r) => inScope(r.personId)),
    },
  };
};

/**
 * Recompute retention flags for the given person IDs (or every person in the org if omitted).
 */
export const recomputeRetentionFlags = async (
  db: DB,
  personIds: string[] | undefined,
  orgId: string,
): Promise<void> => {
  const { people, facts } = await loadRetentionInputs(db, orgId, personIds);
  if (people.length === 0) return;

  const today = todayIso();
  const now = new Date().toISOString();

  for (const p of people) {
    const flags = retentionFlagsFor(p, retentionReasonsFor(p, facts, today));
    // Phase 5: update both old and new column names during transition
    await db
      .update(person)
      .set({
        appearsInRuntsVerbale: flags.appearsInRunts,
        appearsInRuntsProceedings: flags.appearsInRunts,
        canBeRemoved: flags.canBeRemoved,
        needsRegularization: flags.needsRegularization,
        updatedAt: now,
      })
      .where(and(eq(person.id, p.id), eq(person.orgId, orgId)))
      .run();
  }
};

/**
 * Recompute retention flags for all people who attended a specific assembly.
 * Used after toggling deposited_on_runts on an assembly.
 */
export const recomputeRetentionForAssembly = async (
  db: DB,
  assemblyId: string,
  orgId: string,
): Promise<void> => {
  const attendees = await db
    .select({ personId: attendance.personId })
    .from(attendance)
    .where(and(eq(attendance.assemblyId, assemblyId), eq(attendance.orgId, orgId)))
    .all();

  const personIds = [...new Set(attendees.map((a) => a.personId))];
  if (personIds.length > 0) {
    await recomputeRetentionFlags(db, personIds, orgId);
  }
};

/**
 * Get localized translation keys explaining why a person cannot be removed.
 * Returns a map of personId -> string[].
 */
export const getRetentionReasons = async (
  db: DB,
  personIds: string[],
  orgId: string,
): Promise<Record<string, string[]>> => {
  if (personIds.length === 0) return {};

  const { people, facts } = await loadRetentionInputs(db, orgId, personIds);
  const today = todayIso();

  const reasonsByPerson: Record<string, string[]> = {};
  for (const p of people) {
    reasonsByPerson[p.id] = retentionReasonsFor(p, facts, today);
  }
  return reasonsByPerson;
};
