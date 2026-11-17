#!/usr/bin/env node
// Fails if raw Tailwind palette classes (bg-slate-900, text-blue-400, …) appear in
// client/src outside the not-yet-migrated paths in theme-colors-allowlist.json.
// Components must use the theme token scales instead (docs/brand/README.md).
// Fix offenders with: node scripts/theme-codemod.mjs <path>
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientDir = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(clientDir, 'src');
const allowlist = JSON.parse(readFileSync(new URL('./theme-colors-allowlist.json', import.meta.url), 'utf8')).paths;

const RAW = /(?<![\w-])(?:bg|text|border(?:-[trblxy])?|ring(?:-offset)?|from|via|to|divide|placeholder|outline|fill|stroke|shadow|decoration|caret|accent)-(?:slate|gray|zinc|stone|blue|indigo|red|rose|amber|yellow|orange|emerald|green|teal|cyan|sky|purple|violet|fuchsia)-(?:50|100|200|300|400|500|600|700|800|900|950)(?![\w-])/g;

const isAllowed = (rel) => allowlist.some((p) => rel === p || rel.startsWith(p.endsWith('/') ? p : `${p}/`));

const offenders = [];
const walk = (p) => {
  if (statSync(p).isDirectory()) return readdirSync(p).forEach((e) => walk(join(p, e)));
  if (!/\.(tsx?|jsx?|css)$/.test(p)) return;
  const rel = relative(srcDir, p).split(sep).join('/');
  if (isAllowed(rel)) return;
  readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
    const hits = line.match(RAW);
    if (hits) offenders.push(`src/${rel}:${i + 1}  ${[...new Set(hits)].join(' ')}`);
  });
};
walk(srcDir);

if (offenders.length) {
  console.error(`Raw palette colour classes found (use theme tokens instead):\n  ${offenders.join('\n  ')}`);
  console.error('\nFix with: node scripts/theme-codemod.mjs <path>');
  process.exit(1);
}
console.log('Theme colours: no raw palette classes outside the allowlist.');
