#!/usr/bin/env node
// Rewrites raw Tailwind palette classes to theme token scales (see "Theme tokens" in
// docs/brand/README.md). Usage: node scripts/theme-codemod.mjs <file-or-dir>... [--dry]
//
//   slate/gray/zinc/stone → neutral     blue/indigo → accent      red/rose → danger
//   amber/yellow/orange   → warning     emerald/green/teal → success
//   cyan/sky → info                     purple/violet/fuchsia → special
//
// text-white becomes text-fg (theme foreground), except in a class string that also has
// a solid coloured background (bg-<colour>-500..800), where white text is intentional.
// Those kept occurrences are listed so a human can double-check them.
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const FAMILY = {
  slate: 'neutral', gray: 'neutral', zinc: 'neutral', stone: 'neutral',
  blue: 'accent', indigo: 'accent',
  red: 'danger', rose: 'danger',
  amber: 'warning', yellow: 'warning', orange: 'warning',
  emerald: 'success', green: 'success', teal: 'success',
  cyan: 'info', sky: 'info',
  purple: 'special', violet: 'special', fuchsia: 'special',
};
const UTIL = 'bg|text|border(?:-[trblxy])?|ring(?:-offset)?|from|via|to|divide|placeholder|outline|fill|stroke|shadow|decoration|caret|accent';
export const PALETTE_RE = new RegExp(
  `(?<![\\w-])(${UTIL})-(${Object.keys(FAMILY).join('|')})-(50|100|200|300|400|500|600|700|800|900|950)(?![\\w-])`,
  'g',
);
// Chromatic backgrounds only: white text on a neutral (grey) background is theme text.
const CHROMATIC = [
  ...Object.keys(FAMILY).filter((f) => FAMILY[f] !== 'neutral'),
  ...new Set(Object.values(FAMILY).filter((t) => t !== 'neutral')),
].join('|');
const SOLID_BG_RE = new RegExp(`(?<![\\w-])(?:[a-z-]+:)?bg-(?:${CHROMATIC})-(?:500|600|700|800)(?![\\w/-])`);

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const targets = args.filter((a) => a !== '--dry');
if (!targets.length) {
  console.error('usage: node scripts/theme-codemod.mjs <file-or-dir>... [--dry]');
  process.exit(1);
}

const files = [];
const walk = (p) => {
  if (statSync(p).isDirectory()) readdirSync(p).forEach((e) => walk(join(p, e)));
  else if (/\.(tsx?|jsx?)$/.test(p)) files.push(p);
};
targets.forEach(walk);

// The class string around an index: bounded by the nearest quote/backtick on that line.
const segmentAt = (line, idx) => {
  let start = idx;
  while (start > 0 && !`'"\``.includes(line[start - 1])) start--;
  let end = idx;
  while (end < line.length && !`'"\``.includes(line[end])) end++;
  return line.slice(start, end);
};

let totalPalette = 0;
let totalFg = 0;
const kept = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let palette = 0;
  let fg = 0;
  const out = src.split('\n').map((line, i) => {
    let next = line.replace(PALETTE_RE, (_, util, fam, step) => {
      palette++;
      return `${util}-${FAMILY[fam]}-${step}`;
    });
    next = next.replace(/(?<![\w-])text-white(?![\w/-])/g, (m, offset) => {
      if (SOLID_BG_RE.test(segmentAt(next, offset))) {
        kept.push(`${relative(process.cwd(), file)}:${i + 1}`);
        return m;
      }
      fg++;
      return 'text-fg';
    });
    return next;
  });
  if (palette || fg) {
    console.log(`${relative(process.cwd(), file)}: ${palette} palette, ${fg} text-white→text-fg`);
    if (!dry) writeFileSync(file, out.join('\n'));
  }
  totalPalette += palette;
  totalFg += fg;
}
console.log(`\n${dry ? '[dry run] ' : ''}${totalPalette} palette classes, ${totalFg} text-white→text-fg in ${files.length} files`);
if (kept.length) {
  console.log(`\ntext-white kept on solid coloured backgrounds (check these):\n  ${kept.join('\n  ')}`);
}
