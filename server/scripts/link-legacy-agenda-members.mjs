#!/usr/bin/env node
/**
 * One-off: link legacy agenda member names to people.
 *
 * Older versions stored agenda members as plain names in
 * agenda_item.workflow_data.members. This finds names that match exactly one
 * person in the same org (normalised "First Last": trimmed, spaces collapsed,
 * case-insensitive) and produces SQL that links them in agenda_item_person and
 * removes the matched names from workflow_data. Ambiguous/unmatched names are
 * left as text and listed in the report.
 *
 * The script only READS the database (SELECTs via `wrangler d1 execute`). It
 * never writes: with --apply it writes a SQL file for you to review and run.
 * That keeps a human in the loop for staging/production and leaves an audit
 * trail of exactly what changed.
 *
 * Usage (from server/):
 *   # 1. Dry run: report only, nothing written
 *   node scripts/link-legacy-agenda-members.mjs -- gestionale-ets-db --local
 *   node scripts/link-legacy-agenda-members.mjs -- gestionale-ets-db-staging --remote --env staging
 *
 *   # 2. Write the SQL file (still changes nothing in the DB)
 *   node scripts/link-legacy-agenda-members.mjs --apply --out legacy-links.sql -- gestionale-ets-db-staging --remote --env staging
 *
 *   # 3. Review legacy-links.sql, then run it yourself with the same target
 *   npx wrangler d1 execute gestionale-ets-db-staging --remote --env staging --file legacy-links.sql
 *
 * Everything after `--` is passed to `wrangler d1 execute` as the target
 * (database name plus --local / --remote / --env ...). The SQL is guarded, so
 * re-running it, or running it after someone edited an item, is safe.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { planLegacyLinks, buildSql, formatReport } from './lib/legacy-agenda-members.mjs';

const usage = () => {
  console.error('Usage: node scripts/link-legacy-agenda-members.mjs [--apply] [--out file.sql] -- <database> [--local | --remote] [--env <env>]');
  process.exit(1);
};

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (sep === -1 || sep === argv.length - 1) usage();
const own = argv.slice(0, sep);
const target = argv.slice(sep + 1);

let apply = false;
let out = null;
for (let i = 0; i < own.length; i++) {
  if (own[i] === '--apply') apply = true;
  else if (own[i] === '--out') out = own[++i];
  else usage();
}
if (out === undefined) usage();
if (!target.includes('--local') && !target.includes('--remote')) {
  // wrangler's default target has changed between versions; make the choice explicit.
  console.error('Pass --local or --remote after `--` so the target database is explicit.');
  process.exit(1);
}

const query = (sql) => {
  const raw = execFileSync('npx', ['wrangler', 'd1', 'execute', ...target, '--json', '--command', sql], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
  });
  const parsed = JSON.parse(raw);
  return (Array.isArray(parsed) ? parsed : [parsed]).flatMap((r) => r.results ?? []);
};

console.error(`Reading from: wrangler d1 execute ${target.join(' ')}`);
// The LIKE is only a prefilter; JSON is parsed and checked properly in planLegacyLinks.
const items = query(`SELECT id, org_id, workflow_data FROM agenda_item WHERE workflow_data LIKE '%"members"%'`);
const people = query('SELECT id, org_id, first_name, last_name FROM person');
const links = query('SELECT agenda_item_id, person_id FROM agenda_item_person');

const result = planLegacyLinks({ items, people, links });
console.log(formatReport(result));

if (!apply) {
  console.log('\nDRY RUN: nothing written. Re-run with --apply to write the SQL file.');
  process.exit(0);
}
if (result.plans.length === 0) {
  console.log('\nNothing to link; no SQL file written.');
  process.exit(0);
}

const file = resolve(out ?? `legacy-agenda-members-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
if (existsSync(file)) {
  console.error(`Refusing to overwrite existing file: ${file}`);
  process.exit(1);
}
writeFileSync(file, buildSql(result.plans, { now: new Date().toISOString(), uuid: randomUUID }));
console.log(`\nWrote ${file}`);
console.log(`Review it, then run:\n  npx wrangler d1 execute ${target.join(' ')} --file ${file}`);
