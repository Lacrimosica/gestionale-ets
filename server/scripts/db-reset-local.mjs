#!/usr/bin/env node

import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

const dbName = 'gestionale-ets-db';
const globalWranglerStateDir = join(homedir(), '.wrangler', 'state', 'v3', 'd1');
const projectWranglerStateDir = join(resolve('.'), '.wrangler', 'state', 'v3', 'd1');

console.log('╭─ Local Database Reset Script ──────────────────╮');
console.log('│                                                  │');
console.log(`│ Database: ${dbName.padEnd(38)} │`);
console.log('│                                                  │');
console.log('╰──────────────────────────────────────────────────╯\n');

// Step 1: Delete local D1 state (both global and project-local)
console.log('Step 1: Clearing local D1 state...');
try {
  rmSync(globalWranglerStateDir, { recursive: true, force: true });
  console.log(`✓ Cleared: ${globalWranglerStateDir}`);
} catch (err) {
  console.warn(`⚠ Could not clear global state directory (may not exist yet): ${err.message}`);
}
try {
  rmSync(projectWranglerStateDir, { recursive: true, force: true });
  console.log(`✓ Cleared: ${projectWranglerStateDir}\n`);
} catch (err) {
  console.warn(`⚠ Could not clear project state directory (may not exist yet): ${err.message}\n`);
}

// Step 2: Apply schema migrations
console.log('Step 2: Applying schema migrations...');
try {
  execSync(`wrangler d1 migrations apply ${dbName} --local`, {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development', ENVIRONMENT: 'dev' }
  });
  console.log('✓ Schema migrations applied\n');
} catch (err) {
  console.error(`✗ Failed to apply migrations (exit code: ${err.status})`);
  process.exit(1);
}

// Step 3: Apply common seeds
console.log('Step 3: Applying common seeds...');
try {
  execSync('node scripts/apply-seeds.mjs drizzle/seeds/common', {
    stdio: 'inherit',
    env: { ...process.env, DB_NAME: dbName, NODE_ENV: 'development', ENVIRONMENT: 'dev' }
  });
  console.log('✓ Common seeds applied\n');
} catch (err) {
  console.error(`✗ Failed to apply common seeds (exit code: ${err.status})`);
  process.exit(1);
}

// Step 4: Apply dev seeds
console.log('Step 4: Applying development seeds...');
try {
  execSync('node scripts/apply-seeds.mjs drizzle/seeds/dev', {
    stdio: 'inherit',
    env: { ...process.env, DB_NAME: dbName, NODE_ENV: 'development', ENVIRONMENT: 'dev' }
  });
  console.log('✓ Development seeds applied\n');
} catch (err) {
  console.error(`✗ Failed to apply dev seeds (exit code: ${err.status})`);
  process.exit(1);
}

console.log('╭─ Reset Complete ───────────────────────────────╮');
console.log('│                                                  │');
console.log('│ Local database is ready for development.         │');
console.log('│ Run: npm run dev                                 │');
console.log('│                                                  │');
console.log('╰──────────────────────────────────────────────────╯\n');
