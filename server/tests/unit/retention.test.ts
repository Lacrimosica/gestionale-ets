import { describe, it, expect } from 'vitest';
import { retentionReasonsFor, retentionFlagsFor, type RetentionFacts } from '../../src/lib/retention';

const TODAY = '2026-06-01';

const noFacts = (): RetentionFacts => ({
  runtsAssemblyIds: new Set(),
  attendances: [],
  volunteerPeriods: [],
  memberPeriods: [],
  boardTerms: [],
  complianceRoles: [],
});

const basePerson = {
  id: 'p1',
  isInVolunteerRegistryPhysical: null,
  inLibroVolontariCartaceo: null,
  volunteerRegistryEndDate: null,
  libroVolontariEndDate: null,
};

const completeProfile = { taxId: 'X', email: 'e@x.it', phone: '1', isPresumedNonExistent: 0 };

describe('retention decision', () => {
  it('a person with no anchors can be removed', () => {
    const reasons = retentionReasonsFor(basePerson, noFacts(), TODAY);
    expect(reasons).toEqual([]);
    expect(retentionFlagsFor(completeProfile, reasons)).toEqual({
      appearsInRunts: 0, canBeRemoved: 1, needsRegularization: 0,
    });
  });

  it('attending a RUNTS-deposited assembly anchors the record', () => {
    const facts = { ...noFacts(), runtsAssemblyIds: new Set(['a1']), attendances: [{ personId: 'p1', assemblyId: 'a1' }] };
    const reasons = retentionReasonsFor(basePerson, facts, TODAY);
    expect(reasons).toEqual(['timeline.retentionReasons.runts']);
    expect(retentionFlagsFor(completeProfile, reasons).appearsInRunts).toBe(1);
  });

  it('attending an assembly that is not deposited does not anchor', () => {
    const facts = { ...noFacts(), attendances: [{ personId: 'p1', assemblyId: 'a1' }] };
    expect(retentionReasonsFor(basePerson, facts, TODAY)).toEqual([]);
  });

  it('volunteer registry anchors while active and for ten years after its end', () => {
    const inRegistry = { ...basePerson, isInVolunteerRegistryPhysical: 1 };
    expect(retentionReasonsFor(inRegistry, noFacts(), TODAY)).toEqual(['timeline.retentionReasons.libroVolontariActive']);
    expect(retentionReasonsFor({ ...inRegistry, volunteerRegistryEndDate: '2020-01-01' }, noFacts(), TODAY))
      .toEqual(['timeline.retentionReasons.libroVolontariRetention']);
    expect(retentionReasonsFor({ ...inRegistry, volunteerRegistryEndDate: '2010-01-01' }, noFacts(), TODAY)).toEqual([]);
  });

  it('falls back to legacy registry columns', () => {
    const legacy = { ...basePerson, inLibroVolontariCartaceo: 1, libroVolontariEndDate: '2020-01-01' };
    expect(retentionReasonsFor(legacy, noFacts(), TODAY)).toEqual(['timeline.retentionReasons.libroVolontariRetention']);
  });

  it('ongoing periods, board terms and roles anchor; ended ones do not', () => {
    const facts: RetentionFacts = {
      ...noFacts(),
      volunteerPeriods: [{ personId: 'p1', exitDate: null }],
      memberPeriods: [{ personId: 'p1', resignationDate: '2026-12-31' }],
      boardTerms: [{ personId: 'p1', startDate: '2025-01-01', endDate: null }],
      complianceRoles: [{ personId: 'p1', endDate: '2020-01-01' }],
    };
    expect(retentionReasonsFor(basePerson, facts, TODAY)).toEqual([
      'timeline.retentionReasons.activeVolunteer',
      'timeline.retentionReasons.activeMember',
      'timeline.retentionReasons.activeBoard',
    ]);
  });

  it('a board term that has not started yet does not anchor', () => {
    const facts = { ...noFacts(), boardTerms: [{ personId: 'p1', startDate: '2027-01-01', endDate: null }] };
    expect(retentionReasonsFor(basePerson, facts, TODAY)).toEqual([]);
  });

  it('facts about other people are ignored', () => {
    const facts = { ...noFacts(), volunteerPeriods: [{ personId: 'p2', exitDate: null }] };
    expect(retentionReasonsFor(basePerson, facts, TODAY)).toEqual([]);
  });

  it('anchored records with incomplete profiles need regularization, except ghosts', () => {
    const reasons = ['timeline.retentionReasons.activeVolunteer'] as const;
    expect(retentionFlagsFor({ ...completeProfile, phone: null }, [...reasons]).needsRegularization).toBe(1);
    expect(retentionFlagsFor({ ...completeProfile, phone: null, isPresumedNonExistent: 1 }, [...reasons]).needsRegularization).toBe(0);
    expect(retentionFlagsFor(completeProfile, [...reasons])).toEqual({
      appearsInRunts: 0, canBeRemoved: 0, needsRegularization: 0,
    });
  });
});
