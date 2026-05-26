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
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, inArray, and } from 'drizzle-orm';
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

const todayIso = () => new Date().toISOString().split('T')[0];

/**
 * Add ten years to an ISO date string and return the resulting ISO date string.
 */
const addTenYears = (isoDate: string): string => {
  const d = new Date(isoDate);
  d.setFullYear(d.getFullYear() + 10);
  return d.toISOString().split('T')[0];
};

/**
 * Recompute retention flags for the given person IDs (or all people if omitted).
 */
export const recomputeRetentionFlags = async (
  db: DB,
  personIds?: string[],
  orgId?: string,
): Promise<void> => {
  const today = todayIso();

  // Load all people (or the requested subset)
  const people = personIds
    ? await (orgId
        ? db.select().from(person).where(eq(person.orgId, orgId)).all().then((rows) => rows.filter((p) => personIds.includes(p.id)))
        : db.select().from(person).all().then((rows) => rows.filter((p) => personIds.includes(p.id)))
      )
    : await (orgId
        ? db.select().from(person).where(eq(person.orgId, orgId)).all()
        : db.select().from(person).all()
      );

  if (people.length === 0) return;

  const ids = people.map((p) => p.id);

  // ── Load all supporting data in parallel ────────────────────────────────
  const [
    runtsAssemblies,
    allAttendances,
    vPeriods,
    mPeriods,
    boardMemberships,
    cRoles,
  ] = await Promise.all([
    // Assemblies deposited on RUNTS
    orgId
      ? db.select({ id: assembly.id })
          .from(assembly)
          .where(and(eq(assembly.depositedOnRunts, 1), eq(assembly.orgId, orgId)))
          .all()
      : db.select({ id: assembly.id })
          .from(assembly)
          .where(eq(assembly.depositedOnRunts, 1))
          .all(),

    // Attendance for those people
    ids.length > 0
      ? db.select().from(attendance).all().then((rows) => rows.filter((a) => ids.includes(a.personId)))
      : Promise.resolve([]),

    // Volunteer periods for those people
    ids.length > 0
      ? db.select().from(volunteerPeriod).all().then((rows) => rows.filter((v) => ids.includes(v.personId)))
      : Promise.resolve([]),

    // Member periods for those people
    ids.length > 0
      ? db.select().from(memberPeriod).all().then((rows) => rows.filter((m) => ids.includes(m.personId)))
      : Promise.resolve([]),

    // Board memberships (need generation dates for active check)
    db
      .select({ member: boardMember, generation: boardGeneration })
      .from(boardMember)
      .innerJoin(boardGeneration, eq(boardMember.generationId, boardGeneration.id))
      .all()
      .then((rows) => rows.filter((r) => ids.includes(r.member.personId))),

    // Compliance roles for those people
    ids.length > 0
      ? db.select().from(complianceRole).all().then((rows) => rows.filter((r) => ids.includes(r.personId)))
      : Promise.resolve([]),
  ]);

  const runtsAssemblyIds = new Set(runtsAssemblies.map((a) => a.id));

  // ── Compute and persist flags for each person ────────────────────────────
  for (const p of people) {
    // 1. appears_in_runts_verbale
    const appearsInRunts = allAttendances.some(
      (a) => a.personId === p.id && runtsAssemblyIds.has(a.assemblyId),
    ) ? 1 : 0;

    // 2. Libro volontari anchor
    //    Anchored if: the person IS in the libro AND (no end date OR end date + 10 years is still in the future)
    let libroAnchored = false;
    // Phase 5: Use new column name with fallback to old name
    const inVolunteerRegistry = (p.isInVolunteerRegistryPhysical ?? p.inLibroVolontariCartaceo) === 1;
    const registryEndDate = p.volunteerRegistryEndDate ?? p.libroVolontariEndDate;
    if (inVolunteerRegistry) {
      if (!registryEndDate) {
        libroAnchored = true; // still active — no end date
      } else {
        const retentionDeadline = addTenYears(registryEndDate);
        libroAnchored = retentionDeadline > today;
      }
    }

    // 3. Active roles
    const hasActiveVolunteer = vPeriods.some(
      (v) => v.personId === p.id && (!v.exitDate || v.exitDate >= today),
    );
    const hasActiveMember = mPeriods.some(
      (m) => m.personId === p.id && (!m.resignationDate || m.resignationDate >= today),
    );
    const hasActiveBoard = boardMemberships.some((bm) => {
      if (bm.member.personId !== p.id) return false;
      const start = bm.generation.startDate;
      const end = bm.generation.endDate;
      return (!start || start <= today) && (!end || end >= today);
    });
    const hasActiveRole = cRoles.some(
      (r) => r.personId === p.id && (!r.endDate || r.endDate >= today),
    );

    const isAnchored =
      appearsInRunts === 1 ||
      libroAnchored ||
      hasActiveVolunteer ||
      hasActiveMember ||
      hasActiveBoard ||
      hasActiveRole;

    const canBeRemoved = isAnchored ? 0 : 1;

    // 4. needs_regularization: anchored but profile incomplete (ghosts are exempt)
    const profileIncomplete =
      !p.taxId ||
      !p.email ||
      !p.phone;

    const needsRegularization = (!isAnchored || p.isPresumedNonExistent === 1) ? 0 : profileIncomplete ? 1 : 0;

    // Persist
    // Phase 5: Update both old and new column names during transition
    await db
      .update(person)
      .set({
        appearsInRuntsVerbale: appearsInRunts,
        appearsInRuntsProceedings: appearsInRunts,
        canBeRemoved,
        needsRegularization,
        updatedAt: new Date().toISOString(),
      })
      .where(orgId ? and(eq(person.id, p.id), eq(person.orgId, orgId)) : eq(person.id, p.id))
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
  orgId?: string,
): Promise<void> => {
  const attendees = await (orgId
    ? db
        .select({ personId: attendance.personId })
        .from(attendance)
        .where(and(eq(attendance.assemblyId, assemblyId), eq(attendance.orgId, orgId)))
        .all()
    : db
        .select({ personId: attendance.personId })
        .from(attendance)
        .where(eq(attendance.assemblyId, assemblyId))
        .all()
  );

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
  orgId?: string,
): Promise<Record<string, string[]>> => {
  if (personIds.length === 0) return {};

  const today = todayIso();
  const people = await (orgId
    ? db.select().from(person).where(eq(person.orgId, orgId)).all().then((rows) => rows.filter((p) => personIds.includes(p.id)))
    : db.select().from(person).all().then((rows) => rows.filter((p) => personIds.includes(p.id)))
  );

  const [
    runtsAssemblies,
    allAttendances,
    vPeriods,
    mPeriods,
    boardMemberships,
    cRoles,
  ] = await Promise.all([
    orgId
      ? db.select({ id: assembly.id }).from(assembly).where(and(eq(assembly.depositedOnRunts, 1), eq(assembly.orgId, orgId))).all()
      : db.select({ id: assembly.id }).from(assembly).where(eq(assembly.depositedOnRunts, 1)).all(),
    db.select().from(attendance).all().then((rows) => rows.filter((a) => personIds.includes(a.personId))),
    db.select().from(volunteerPeriod).all().then((rows) => rows.filter((v) => personIds.includes(v.personId))),
    db.select().from(memberPeriod).all().then((rows) => rows.filter((m) => personIds.includes(m.personId))),
    db.select({ member: boardMember, generation: boardGeneration })
      .from(boardMember)
      .innerJoin(boardGeneration, eq(boardMember.generationId, boardGeneration.id))
      .all()
      .then((rows) => rows.filter((r) => personIds.includes(r.member.personId))),
    db.select().from(complianceRole).all().then((rows) => rows.filter((r) => personIds.includes(r.personId))),
  ]);

  const runtsAssemblyIds = new Set(runtsAssemblies.map((a) => a.id));
  const reasonsByPerson: Record<string, string[]> = {};

  for (const p of people) {
    const reasons: string[] = [];

    if (allAttendances.some((a) => a.personId === p.id && runtsAssemblyIds.has(a.assemblyId))) {
      reasons.push('timeline.retentionReasons.runts');
    }

    // Phase 5: Use new column name with fallback to old name
    const inVolunteerRegistry2 = (p.isInVolunteerRegistryPhysical ?? p.inLibroVolontariCartaceo) === 1;
    const registryEndDate2 = p.volunteerRegistryEndDate ?? p.libroVolontariEndDate;
    if (inVolunteerRegistry2) {
      if (!registryEndDate2) {
        reasons.push('timeline.retentionReasons.libroVolontariActive');
      } else {
        const retentionDeadline = addTenYears(registryEndDate2);
        if (retentionDeadline > today) {
          reasons.push('timeline.retentionReasons.libroVolontariRetention');
        }
      }
    }

    if (vPeriods.some((v) => v.personId === p.id && (!v.exitDate || v.exitDate >= today))) {
      reasons.push('timeline.retentionReasons.activeVolunteer');
    }
    if (mPeriods.some((m) => m.personId === p.id && (!m.resignationDate || m.resignationDate >= today))) {
      reasons.push('timeline.retentionReasons.activeMember');
    }
    if (boardMemberships.some((bm) => {
      if (bm.member.personId !== p.id) return false;
      const start = bm.generation.startDate;
      const end = bm.generation.endDate;
      return (!start || start <= today) && (!end || end >= today);
    })) {
      reasons.push('timeline.retentionReasons.activeBoard');
    }
    if (cRoles.some((r) => r.personId === p.id && (!r.endDate || r.endDate >= today))) {
      reasons.push('timeline.retentionReasons.activeRole');
    }

    reasonsByPerson[p.id] = reasons;
  }

  return reasonsByPerson;
};
