// Pure planning/SQL logic for scripts/link-legacy-agenda-members.mjs.
// No I/O here so it can be unit-tested (tests/unit/legacy-agenda-members.test.ts).

/**
 * Normalise a display name for matching: Unicode NFC, trim, collapse internal
 * whitespace, case-insensitive. Accents are kept on purpose — "Nicolò" and
 * "Nicolo" may be different people, and a wrong link is worse than no link.
 * @param {string} name
 */
export const normalizeName = (name) =>
  String(name).normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('it');

/**
 * @typedef {{ id: string, org_id: string, workflow_data: string | null }} AgendaItemRow
 * @typedef {{ id: string, org_id: string, first_name: string, last_name: string }} PersonRow
 * @typedef {{ agenda_item_id: string, person_id: string }} LinkRow
 * @typedef {{ itemId: string, orgId: string, name: string, reason: 'no_match' | 'ambiguous' | 'invalid_json', personIds: string[] }} Unresolved
 * @typedef {{ itemId: string, orgId: string, originalWorkflowData: string, newWorkflowData: string | null, linkPersonIds: string[], matched: Array<{ name: string, personId: string }>, remainingNames: string[] }} ItemPlan
 */

/**
 * Decide, per agenda item, which legacy names can be linked to a person.
 *
 * A name is linked only when exactly one person in the item's own org has that
 * normalised "First Last". Matched names are removed from workflow_data.members;
 * ambiguous/unmatched names stay there (the UI keeps showing them read-only).
 *
 * @param {{ items: AgendaItemRow[], people: PersonRow[], links?: LinkRow[] }} input
 * @returns {{ plans: ItemPlan[], unresolved: Unresolved[] }}
 */
export const planLegacyLinks = ({ items, people, links = [] }) => {
  /** @type {Map<string, string[]>} key `${orgId}\u0000${normalisedName}` -> person ids */
  const peopleByName = new Map();
  for (const p of people) {
    const key = `${p.org_id}\u0000${normalizeName(`${p.first_name} ${p.last_name}`)}`;
    const ids = peopleByName.get(key) ?? [];
    ids.push(p.id);
    peopleByName.set(key, ids);
  }

  /** @type {Map<string, Set<string>>} */
  const linkedByItem = new Map();
  for (const l of links) {
    const set = linkedByItem.get(l.agenda_item_id) ?? new Set();
    set.add(l.person_id);
    linkedByItem.set(l.agenda_item_id, set);
  }

  /** @type {ItemPlan[]} */
  const plans = [];
  /** @type {Unresolved[]} */
  const unresolved = [];

  for (const item of items) {
    if (!item.workflow_data) continue;
    let data;
    try {
      data = JSON.parse(item.workflow_data);
    } catch {
      unresolved.push({ itemId: item.id, orgId: item.org_id, name: '', reason: 'invalid_json', personIds: [] });
      continue;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.members)) continue;

    const names = data.members.filter((m) => typeof m === 'string' && m.trim() !== '');
    if (names.length === 0) continue;

    const alreadyLinked = linkedByItem.get(item.id) ?? new Set();
    const linkPersonIds = [];
    const matched = [];
    const remainingNames = [];

    for (const name of names) {
      const ids = peopleByName.get(`${item.org_id}\u0000${normalizeName(name)}`) ?? [];
      if (ids.length === 1) {
        matched.push({ name, personId: ids[0] });
        // Already linked (or listed twice): the name is represented, just drop it.
        if (!alreadyLinked.has(ids[0]) && !linkPersonIds.includes(ids[0])) linkPersonIds.push(ids[0]);
      } else {
        remainingNames.push(name);
        unresolved.push({
          itemId: item.id,
          orgId: item.org_id,
          name,
          reason: ids.length === 0 ? 'no_match' : 'ambiguous',
          personIds: ids,
        });
      }
    }

    if (matched.length === 0) continue;

    const next = { ...data };
    // Keep non-string junk untouched alongside the unresolved names; only matched names go.
    const otherEntries = data.members.filter((m) => !(typeof m === 'string' && m.trim() !== ''));
    const keptMembers = [...remainingNames, ...otherEntries];
    if (keptMembers.length > 0) next.members = keptMembers;
    else delete next.members;

    plans.push({
      itemId: item.id,
      orgId: item.org_id,
      originalWorkflowData: item.workflow_data,
      newWorkflowData: Object.keys(next).length > 0 ? JSON.stringify(next) : null,
      linkPersonIds,
      matched,
      remainingNames,
    });
  }

  return { plans, unresolved };
};

/** @param {string | null} value */
const sqlString = (value) => (value === null ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`);

/**
 * Turn a plan into reviewable SQLite statements.
 *
 * Every statement is guarded on the item's workflow_data still being exactly
 * what was planned against, so running the file late (after someone edited the
 * item) or twice is a no-op for that item instead of clobbering newer data.
 * Inserts come before the update because the update changes the guarded value.
 *
 * @param {ItemPlan[]} plans
 * @param {{ now: string, uuid: () => string }} deps
 * @returns {string}
 */
export const buildSql = (plans, { now, uuid }) => {
  const lines = [
    '-- Link legacy agenda member names to people (generated by scripts/link-legacy-agenda-members.mjs).',
    `-- Generated at ${now}. Review before running; safe to re-run (guarded statements).`,
    '',
  ];
  for (const plan of plans) {
    const guard = `EXISTS (SELECT 1 FROM agenda_item WHERE id = ${sqlString(plan.itemId)} AND org_id = ${sqlString(plan.orgId)} AND workflow_data = ${sqlString(plan.originalWorkflowData)})`;
    // Names are user data: strip control characters so one can't end the comment and inject SQL.
    const label = plan.matched.map((m) => m.name).join(', ').replace(/[\u0000-\u001f\u007f]/g, ' ');
    lines.push(`-- agenda_item ${plan.itemId}: ${label}`);
    for (const personId of plan.linkPersonIds) {
      lines.push(
        'INSERT INTO agenda_item_person (id, org_id, agenda_item_id, person_id, role, created_at) ' +
        `SELECT ${sqlString(uuid())}, ${sqlString(plan.orgId)}, ${sqlString(plan.itemId)}, ${sqlString(personId)}, NULL, ${sqlString(now)} ` +
        `WHERE ${guard} AND NOT EXISTS (SELECT 1 FROM agenda_item_person WHERE agenda_item_id = ${sqlString(plan.itemId)} AND person_id = ${sqlString(personId)});`,
      );
    }
    lines.push(
      `UPDATE agenda_item SET workflow_data = ${sqlString(plan.newWorkflowData)} ` +
      `WHERE id = ${sqlString(plan.itemId)} AND org_id = ${sqlString(plan.orgId)} AND workflow_data = ${sqlString(plan.originalWorkflowData)};`,
    );
    lines.push('');
  }
  return lines.join('\n');
};

/**
 * Human-readable summary for the terminal.
 * @param {{ plans: ItemPlan[], unresolved: Unresolved[] }} result
 */
export const formatReport = ({ plans, unresolved }) => {
  const out = [];
  const links = plans.reduce((n, p) => n + p.linkPersonIds.length, 0);
  out.push(`Items to update: ${plans.length}  |  new links: ${links}  |  names left as text: ${unresolved.length}`);
  for (const p of plans) {
    out.push(`  item ${p.itemId} (org ${p.orgId})`);
    for (const m of p.matched) out.push(`    linked   "${m.name}" -> ${m.personId}`);
  }
  if (unresolved.length > 0) {
    out.push('Left unchanged (fix by picking people in the assembly page):');
    for (const u of unresolved) {
      const detail = u.reason === 'ambiguous' ? ` (${u.personIds.length} people: ${u.personIds.join(', ')})` : '';
      out.push(`  item ${u.itemId} (org ${u.orgId}): ${u.reason}${u.name ? ` "${u.name}"` : ''}${detail}`);
    }
  }
  return out.join('\n');
};
