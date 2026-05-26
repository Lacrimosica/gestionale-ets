#!/usr/bin/env node

import { execSync } from 'child_process';
import { readdirSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// Get directory from argument
const seedDir = process.argv[2];
if (!seedDir) {
  console.error('Usage: node apply-seeds.mjs <seed-directory>');
  console.error('Example: node apply-seeds.mjs drizzle/seeds/common');
  process.exit(1);
}

const dbName = process.env.DB_NAME || 'gestionale-ets-db';
const isLocal = !process.env.REMOTE;

const fullPath = resolve(seedDir);
console.log(`Applying seeds from: ${fullPath}`);

// Check if directory exists
if (!existsSync(fullPath)) {
  console.warn(`⚠ Seed directory does not exist: ${fullPath}`);
  console.warn('Skipping seed application (this is OK if no seeds are needed yet).\n');
  process.exit(0);
}

// Read all .sql files in order
let files;
try {
  files = readdirSync(fullPath)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('.'))
    .sort();
} catch (err) {
  console.error(`✗ Failed to read seed directory: ${err.message}`);
  process.exit(1);
}

if (files.length === 0) {
  console.log('No seed files found.');
  process.exit(0);
}

console.log(`Found ${files.length} seed file(s):\n`);

for (const file of files) {
  const filePath = join(fullPath, file);
  const stat = statSync(filePath);
  if (!stat.isFile()) continue;

  const size = (stat.size / 1024).toFixed(1);
  console.log(`  • ${file} (${size} KB)`);
}

console.log('\nApplying seeds...\n');

// Apply each seed file via wrangler
let appliedCount = 0;
for (const file of files) {
  const filePath = join(fullPath, file);
  const flags = isLocal ? '--local' : `--remote --env ${process.env.ENV || 'production'}`;

  try {
    console.log(`  Applying ${file}...`);
    execSync(`wrangler d1 execute ${dbName} ${flags} --file "${filePath}"`, {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    appliedCount++;
    console.log(`  ✓ ${file}\n`);
  } catch (err) {
    console.error(`\n✗ Failed to apply ${file}`);
    console.error(`Exit code: ${err.status}`);
    process.exit(1);
  }
}

console.log(`\n✓ Applied ${appliedCount} seed file(s) successfully`);
