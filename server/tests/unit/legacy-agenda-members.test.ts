import { describe, it, expect } from 'vitest';
import { normalizeName, planLegacyLinks, buildSql } from '../../scripts/lib/legacy-agenda-members.mjs';

const person = (id: string, org: string, first: string, last: string) =>
  ({ id, org_id: org, first_name: first, last_name: last });
const item = (id: string, org: string, data: unknown) =>
  ({ id, org_id: org, workflow_data: typeof data === 'string' ? data : JSON.stringify(data) });

describe('legacy agenda member linking', () => {
  it('normalises whitespace and case but keeps accents', () => {
    expect(normalizeName('  Mario   ROSSI ')).toBe('mario rossi');
    expect(normalizeName('Nicolò Bianchi')).not.toBe(normalizeName('Nicolo Bianchi'));
  });

  it('links unique same-org matches and removes only those names', () => {
    const { plans, unresolved } = planLegacyLinks({
      items: [item('i1', 'org1', { members: ['mario  rossi', 'Anna Verdi', 'Luca Neri', 'Ignoto'], voting: [1] })],
      people: [
        person('p1', 'org1', 'Mario', 'Rossi'),
        person('p2', 'org1', 'Anna', 'Verdi'),
        person('p3', 'org1', 'Anna', 'Verdi'), // homonym -> ambiguous
        person('p4', 'org2', 'Luca', 'Neri'), // other org -> no match
      ],
    });

    expect(plans).toHaveLength(1);
    expect(plans[0].linkPersonIds).toEqual(['p1']);
    expect(JSON.parse(plans[0].newWorkflowData!)).toEqual({ members: ['Anna Verdi', 'Luca Neri', 'Ignoto'], voting: [1] });
    expect(unresolved.map((u) => [u.name, u.reason])).toEqual([
      ['Anna Verdi', 'ambiguous'],
      ['Luca Neri', 'no_match'],
      ['Ignoto', 'no_match'],
    ]);
  });

  it('drops the members key (or the whole object) once every name is linked', () => {
    const people = [person('p1', 'org1', 'Mario', 'Rossi')];
    const withVoting = planLegacyLinks({ items: [item('i1', 'org1', { members: ['Mario Rossi'], voting: [] })], people });
    expect(withVoting.plans[0].newWorkflowData).toBe('{"voting":[]}');
    const onlyMembers = planLegacyLinks({ items: [item('i1', 'org1', { members: ['Mario Rossi'] })], people });
    expect(onlyMembers.plans[0].newWorkflowData).toBeNull();
  });

  it('does not re-link people already in the junction, but still clears their names', () => {
    const { plans } = planLegacyLinks({
      items: [item('i1', 'org1', { members: ['Mario Rossi', 'Mario Rossi'] })],
      people: [person('p1', 'org1', 'Mario', 'Rossi')],
      links: [{ agenda_item_id: 'i1', person_id: 'p1' }],
    });
    expect(plans[0].linkPersonIds).toEqual([]);
    expect(plans[0].newWorkflowData).toBeNull();
  });

  it('skips items without legacy names and reports invalid JSON', () => {
    const { plans, unresolved } = planLegacyLinks({
      items: [item('a', 'org1', { budgetYear: 2025 }), item('b', 'org1', { members: [] }), item('c', 'org1', '{oops')],
      people: [],
    });
    expect(plans).toEqual([]);
    expect(unresolved).toEqual([{ itemId: 'c', orgId: 'org1', name: '', reason: 'invalid_json', personIds: [] }]);
  });

  it('emits guarded, quote-escaped SQL', () => {
    const { plans } = planLegacyLinks({
      items: [item('i1', 'org1', { members: ["Gianni D'Amico"] })],
      people: [person('p1', 'org1', 'Gianni', "D'Amico")],
    });
    const sql = buildSql(plans, { now: '2026-01-01T00:00:00.000Z', uuid: () => 'u1' });
    expect(sql).toContain('NOT EXISTS (SELECT 1 FROM agenda_item_person');
    expect(sql).toMatch(/UPDATE agenda_item SET workflow_data = NULL WHERE id = 'i1' AND org_id = 'org1' AND workflow_data = '\{"members":\["Gianni D''Amico"\]\}';/);
    // A newline in a name must not escape the SQL comment.
    const evil = planLegacyLinks({
      items: [item('i2', 'org1', { members: ['Mario\nRossi'] })],
      people: [person('p2', 'org1', 'Mario', 'Rossi')],
    });
    const evilSql = buildSql(evil.plans, { now: 'n', uuid: () => 'u2' });
    expect(evilSql.split('\n').filter((l) => l.startsWith('-- agenda_item'))).toEqual(['-- agenda_item i2: Mario Rossi']);
    // Inserts must run before the update that changes the guarded value.
    expect(sql.indexOf('INSERT')).toBeLessThan(sql.indexOf('UPDATE'));
  });
});
