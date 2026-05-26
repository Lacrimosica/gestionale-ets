#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('╭─ Staging Database Reset Script ──────────────╮');
console.log('│                                               │');
console.log('│ Database: gestionale-ets-db-staging           │');
console.log('│ Environment: STAGING (REMOTE)                 │');
console.log('│                                               │');
console.log('╰───────────────────────────────────────────────╯\n');

console.log('⚠️  WARNING: This will DROP ALL TABLES from staging!\n');

// Step 1: Get all table names
console.log('Step 1: Fetching table list...');
let tables = [];
try {
  const result = execSync(
    `wrangler d1 execute gestionale-ets-db-staging --remote --env staging --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );

  // wrangler outputs to stdout which includes some text before JSON
  const jsonMatch = result.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error(`✗ No JSON found in output`);
    process.exit(1);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const data = Array.isArray(parsed) ? parsed[0] : parsed;

  // Filter out only _cf_KV (system table we can't drop)
  // We WILL drop d1_migrations and sqlite_sequence so they're fresh
  const systemTables = ['_cf_KV'];
  tables = data.results
    .map(row => row.name)
    .filter(name => !systemTables.includes(name))
    .reverse();  // Drop in reverse order (child tables first)

  console.log(`✓ Found ${tables.length} tables to drop\n`);
} catch (err) {
  console.error(`✗ Failed to fetch tables`);
  console.error(err.message);
  process.exit(1);
}

// Step 2: Drop all tables (retry loop to handle FK constraints)
if (tables.length > 0) {
  console.log('Step 2: Dropping all tables...');
  try {
    let remaining = [...tables];
    let attempts = 0;
    const maxAttempts = 50;

    while (remaining.length > 0 && attempts < maxAttempts) {
      attempts++;
      console.log(`  Attempt ${attempts}/${maxAttempts}: ${remaining.length} tables remaining...`);

      const failed = [];
      for (const table of remaining) {
        try {
          execSync(
            `wrangler d1 execute gestionale-ets-db-staging --remote --env staging --command "DROP TABLE IF EXISTS \\"${table}\\";"`,
            { stdio: 'pipe', encoding: 'utf-8' }
          );
          process.stdout.write('.');
        } catch (dropErr) {
          failed.push(table);
          process.stdout.write('x');
        }
      }
      console.log();

      if (failed.length === 0) {
        break;
      }
      remaining = failed;
    }

    // d1_migrations has internal constraints, Drizzle will manage it
    const internalTables = ['d1_migrations', 'sqlite_sequence'];
    const undroppable = remaining.filter(t => !internalTables.includes(t));

    if (remaining.length === 0) {
      console.log(`✓ All ${tables.length} tables dropped\n`);
    } else if (undroppable.length === 0) {
      console.log(`✓ User tables dropped\n`);
    } else {
      console.error(`✗ Could not drop ${undroppable.length} tables after ${maxAttempts} attempts`);
      console.error(`Failed: ${undroppable.join(', ')}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n✗ Failed to drop tables (exit code: ${err.status})`);
    process.exit(1);
  }
}

// Step 3: Clear sqlite_sequence (can't be dropped, but can be emptied)
console.log('Step 3: Clearing sqlite_sequence...');
try {
  execSync(
    `wrangler d1 execute gestionale-ets-db-staging --remote --env staging --command "DELETE FROM sqlite_sequence;"`,
    { stdio: 'pipe', encoding: 'utf-8' }
  );
  console.log('✓ Sequence table cleared\n');
} catch (err) {
  // Ignore errors
  console.log('⊘ Sequence table already empty\n');
}

// Step 4: Apply migrations
console.log('Step 4: Applying schema migrations...');
try {
  execSync('wrangler d1 migrations apply gestionale-ets-db-staging --remote --env staging', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'staging', ENVIRONMENT: 'staging' }
  });
  console.log('✓ Schema migrations applied\n');
} catch (err) {
  console.error(`✗ Failed to apply migrations (exit code: ${err.status})`);
  process.exit(1);
}

// Step 5: Apply common seeds
console.log('Step 5: Applying common seeds...');
try {
  execSync('node scripts/apply-seeds.mjs drizzle/seeds/common', {
    stdio: 'inherit',
    env: { ...process.env, DB_NAME: 'gestionale-ets-db-staging', REMOTE: 'true', ENV: 'staging', NODE_ENV: 'staging', ENVIRONMENT: 'staging' }
  });
  console.log('✓ Common seeds applied\n');
} catch (err) {
  console.error(`✗ Failed to apply common seeds (exit code: ${err.status})`);
  process.exit(1);
}


console.log('╭─ Reset Complete ───────────────────────────────╮');
console.log('│                                                 │');
console.log('│ Staging database cleared.                       │');
console.log('│ All tables dropped.                             │');
console.log('│                                                 │');
console.log('╰─────────────────────────────────────────────────╯\n');
