/**
 * Nightly reset for the public demo.
 *
 * Deployed as its own worker (wrangler.demo-reset.toml) whose only D1 binding is
 * the demo database. It is deliberately not part of the main app bundle, so the
 * wipe logic can never run against staging or production.
 */
import demoSeed from '../drizzle/seeds/demo/01_demo_data.sql';

type Env = { DB: D1Database };

/**
 * Data tables in foreign-key-safe delete order. Lookup tables (statuses, types,
 * modes) and d1_migrations are left alone.
 */
export const DEMO_DATA_TABLES = [
  'agenda_item_person',
  'attendance',
  'agenda_item',
  'document_generation_log',
  'convocation',
  'compliance_document_flag',
  'consent_record',
  'compliance_document',
  'compliance_role',
  'alert_suppression',
  'board_member',
  'member_period',
  'volunteer_period',
  'assembly',
  'board_generation',
  'invite',
  'organization_address',
  'convocation_modality_option',
  'organization_setting',
  'user_setting',
  'organization_user',
  'audit_event',
  'setup_attempt',
  'person',
  'user',
  'organization',
] as const;

/** Split the generated seed (one statement per line) into executable statements. */
export function seedStatements(seedSql: string): string[] {
  return seedSql
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('--'));
}

/**
 * Wipe all demo data and load the fictional seed. Runs as one D1 batch, which is
 * atomic: if any statement fails, the demo keeps its previous state.
 */
export async function resetDemoDatabase(db: D1Database, seedSql: string = demoSeed): Promise<void> {
  const statements = [
    ...DEMO_DATA_TABLES.map((table) => db.prepare(`DELETE FROM ${table}`)),
    ...seedStatements(seedSql).map((stmt) => db.prepare(stmt)),
  ];
  await db.batch(statements);
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(resetDemoDatabase(env.DB));
  },
};
