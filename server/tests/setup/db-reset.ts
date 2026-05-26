import * as fs from 'fs';
import * as path from 'path';
import { getMiniflareDB } from './miniflare-context';

const MIGRATIONS_DIR = path.join(__dirname, '../../drizzle/migrations');
const SEEDS_DIR = path.join(__dirname, '../../drizzle/seeds/common');

export async function resetTestDatabase() {
  const db = getMiniflareDB();

  // Get list of all tables
  const tables: string[] = [];
  const result = await db.all(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name;
  `);

  for (const row of result.results || []) {
    tables.push(row.name as string);
  }

  // Drop tables in reverse order (to handle FKs)
  for (const table of tables.reverse()) {
    await db.run(`DROP TABLE IF EXISTS "${table}"`);
  }

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
        await db.run(statement);
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
        await db.run(statement);
      } catch (err) {
        // Ignore duplicate key errors in seeds (idempotent)
        if (!err.message?.includes('UNIQUE constraint failed')) {
          console.error(`Error in seed ${seedFile}:`, err);
          throw err;
        }
      }
    }
  }
}

export async function cleanupTestDatabase() {
  const db = getMiniflareDB();

  const result = await db.all(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name;
  `);

  const tables: string[] = (result.results || []).map((row) => row.name as string);

  for (const table of tables.reverse()) {
    await db.run(`DROP TABLE IF EXISTS "${table}"`);
  }
}
