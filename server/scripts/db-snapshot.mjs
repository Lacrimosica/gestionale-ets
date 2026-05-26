#!/usr/bin/env node

import { execSync } from 'child_process';
import { rmSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbName = 'gestionale-ets-db';
const wranglerStateDir = join(homedir(), '.wrangler', 'state', 'v3', 'd1');
const snapshotFile = join(__dirname, '..', 'drizzle', 'snapshot', 'schema.sql');

console.log('╭─ Database Schema Snapshot Generator ───────────╮');
console.log('│                                                  │');
console.log(`│ Database: ${dbName.padEnd(38)} │`);
console.log('│                                                  │');
console.log('╰──────────────────────────────────────────────────╯\n');

// Step 1: Clear local state
console.log('Step 1: Clearing local D1 state...');
try {
  rmSync(wranglerStateDir, { recursive: true, force: true });
  console.log(`✓ Cleared: ${wranglerStateDir}\n`);
} catch (err) {
  console.warn(`⚠ Could not clear state directory: ${err.message}\n`);
}

// Step 2: Apply schema migrations (no seeds)
console.log('Step 2: Applying schema migrations...');
try {
  execSync(`wrangler d1 migrations apply ${dbName} --local`, {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✓ Schema migrations applied\n');
} catch (err) {
  console.error(`✗ Failed to apply migrations (exit code: ${err.status})`);
  process.exit(1);
}

// Step 3: Query schema from sqlite_master
console.log('Step 3: Extracting schema from database...');
try {
  const output = execSync(
    `wrangler d1 execute ${dbName} --local --json --command "SELECT sql FROM sqlite_master WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%' AND name != 'd1_migrations' AND sql IS NOT NULL ORDER BY name;"`,
    { encoding: 'utf-8', env: { ...process.env, NODE_ENV: 'production' } }
  );

  const rawResult = JSON.parse(output);
  const queryResult = Array.isArray(rawResult) ? rawResult[0] : rawResult;
  const statements = queryResult.results
    .filter((row) => row.sql)
    .map((row) => row.sql);

  if (statements.length === 0) {
    console.error('✗ No schema found in database');
    process.exit(1);
  }

  console.log(`✓ Found ${statements.length} schema object(s)\n`);

  // Step 4: Write snapshot
  console.log(`Step 4: Writing snapshot to ${snapshotFile}...`);
  const header = `-- Database Schema Snapshot
-- Generated: ${new Date().toISOString()}
--
-- This file represents the current state of all tables and indexes.
-- Use for fresh local database setup via: wrangler d1 execute ... --file schema.sql
--
-- DO NOT edit manually. Regenerate with: npm run db:snapshot

`;

  const content = header + statements.join(';\n') + ';\n';
  writeFileSync(snapshotFile, content, 'utf-8');

  const size = (content.length / 1024).toFixed(1);
  console.log(`✓ Snapshot written (${size} KB)\n`);
} catch (err) {
  console.error(`✗ Failed to extract schema: ${err.message}`);
  console.error(`Exit code: ${err.status || 'unknown'}`);
  process.exit(1);
}

console.log('╭─ Snapshot Complete ───────────────────────────╮');
console.log('│                                                │');
console.log(`│ Schema snapshot: drizzle/snapshot/schema.sql  │`);
console.log('│                                                │');
console.log('│ Use for fresh setups:                          │');
console.log('│ $ wrangler d1 execute DB --file schema.sql    │');
console.log('│                                                │');
console.log('╰────────────────────────────────────────────────╯\n');
