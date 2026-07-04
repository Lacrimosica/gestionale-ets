import * as fs from 'fs';
import * as path from 'path';
import { getMiniflareRawDB } from './miniflare-context';

// Local/dev uses the dev migration set (baseline 0000 + incrementals), matching
// `npm run db:reset:local` (drizzle.config.ts resolves ENVIRONMENT=dev here).
const MIGRATIONS_DIR = path.join(__dirname, '../../drizzle/migrations/dev');
const SEEDS_DIR = path.join(__dirname, '../../drizzle/seeds/common');

// D1 protects its internal bookkeeping tables (_cf_*, d1_*, sqlite_*) with an
// authorizer — attempting to DROP them raises SQLITE_AUTH. Only touch app tables.
const isAppTable = (name: string) =>
  !name.startsWith('_cf_') && !name.startsWith('d1_') && !name.startsWith('sqlite_') && !name.startsWith('_litestream');

// D1 runs each prepared statement in its own session, so `PRAGMA foreign_keys`
// won't persist to later DROPs. Drop in repeated passes instead: any table
// blocked by an inbound FK this pass becomes droppable once its dependents go.
async function dropAppTables(db: D1Database, tables: string[]) {
  let remaining = tables.filter(isAppTable);
  while (remaining.length > 0) {
    const stillBlocked: string[] = [];
    for (const table of remaining) {
      try {
        await db.prepare(`DROP TABLE IF EXISTS "${table}"`).run();
      } catch (err) {
        if (!(err as Error).message?.includes('FOREIGN KEY')) throw err;
        stillBlocked.push(table);
      }
    }
    if (stillBlocked.length === remaining.length) {
      throw new Error(`Cannot drop tables (FK cycle?): ${stillBlocked.join(', ')}`);
    }
    remaining = stillBlocked;
  }
}

export async function resetTestDatabase() {
  const db = getMiniflareRawDB();

  // Get list of all tables
  const tables: string[] = [];
  const result = await db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type='table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name;`,
    )
    .all<{ name: string }>();

  for (const row of result.results || []) {
    tables.push(row.name);
  }

  await dropAppTables(db, tables);

  // Re-apply all migrations in order
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    const filePath = path.join(MIGRATIONS_DIR, migrationFile);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await db.prepare(statement).run();
      } catch (err) {
        console.error(`Error in migration ${migrationFile}:`, err);
        throw err;
      }
    }
  }

  // Seed lookup tables
  const seedFiles = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.sql')).sort();

  for (const seedFile of seedFiles) {
    const filePath = path.join(SEEDS_DIR, seedFile);
    const sql = fs.readFileSync(filePath, 'utf-8');

    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await db.prepare(statement).run();
      } catch (err) {
        // Ignore duplicate key errors in seeds (idempotent)
        if (!(err as Error).message?.includes('UNIQUE constraint failed')) {
          console.error(`Error in seed ${seedFile}:`, err);
          throw err;
        }
      }
    }
  }
}

export async function cleanupTestDatabase() {
  const db = getMiniflareRawDB();

  const result = await db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type='table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name;`,
    )
    .all<{ name: string }>();

  const tables: string[] = (result.results || []).map((row) => row.name);

  await dropAppTables(db, tables);
}
