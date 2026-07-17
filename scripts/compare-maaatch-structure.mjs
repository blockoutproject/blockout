#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

const blockoutRoot = resolve(import.meta.dirname, '..');
const maaatchRoot = resolve(
  process.argv[2] ?? process.env.MAAATCH_REPOSITORY ?? '',
);

if (!process.argv[2] && !process.env.MAAATCH_REPOSITORY) {
  console.error(
    'Usage: npm run compare:maaatch -- /absolute/path/to/maaatch\n' +
      '   or: MAAATCH_REPOSITORY=/absolute/path/to/maaatch npm run compare:maaatch',
  );
  process.exit(2);
}

if (!existsSync(join(maaatchRoot, 'nx.json'))) {
  console.error(`Maaatch repository not found at ${maaatchRoot}`);
  process.exit(2);
}

const failures = [];
const exactRoots = [
  '.agents/skills',
  'apps/backend',
  'apps/frontend',
  'docs/architecture',
  'docs/current',
  'docs/decisions',
  'docs/releases',
  'docs/runbooks',
  'infra/compose',
  'libs/react',
  'libs/shared',
  'packages',
  'scripts',
  'tools/local-logs',
];

console.log('EXACT ROOTS');
for (const path of exactRoots) {
  const inMaaatch = existsSync(join(maaatchRoot, path));
  const inBlockout = existsSync(join(blockoutRoot, path));
  const status = inMaaatch && inBlockout ? 'MATCH' : 'GAP';
  console.log(`${status.padEnd(7)} ${path}`);
  if (inMaaatch && !inBlockout) failures.push(`Missing shared root: ${path}`);
}

const policyRenames = new Map([
  ['frontend-web-policy.md', 'frontend-mobile-policy.md'],
  ['liquibase.md', 'flyway.md'],
]);
const maaatchReferences = filenames(
  join(maaatchRoot, '.agents/skills/maaatch-best-practices/references'),
).map((name) => policyRenames.get(name) ?? name);
const blockoutReferences = new Set(
  filenames(
    join(blockoutRoot, '.agents/skills/blockout-best-practices/references'),
  ),
);

console.log('\nPOLICY TOPOLOGY');
for (const name of maaatchReferences) {
  const present = blockoutReferences.has(name);
  console.log(`${(present ? 'MATCH' : 'GAP').padEnd(7)} ${name}`);
  if (!present) failures.push(`Missing Maaatch-equivalent policy: ${name}`);
}

console.log('\nTECHNOLOGY VARIANTS');
console.log(
  'VARIANT frontend-web-policy.md -> frontend-mobile-policy.md (Expo)',
);
console.log('VARIANT liquibase.md -> flyway.md (production migration engine)');
console.log('VARIANT apps/frontend/web -> apps/frontend/mobile');
console.log(
  'VARIANT no Python Nx plugin -> explicit scraper project.json files',
);

const nonApplicableGenericSkills = new Map([
  ['next-best-practices', 'Next.js runtime and App Router are absent'],
  ['shadcn', 'shadcn, Tailwind, and DOM registries are absent'],
  ['web-design-guidelines', 'browser-only interface review'],
]);
const deferredGenericSkills = new Map([
  [
    'zod',
    'mobile Zod is active; skill adoption is intentionally re-audited by MRG-505',
  ],
]);
const maaatchGenericSkills = directories(
  join(maaatchRoot, '.agents/skills'),
).filter((name) => name !== 'maaatch-best-practices');
const blockoutSkills = new Set(
  directories(join(blockoutRoot, '.agents/skills')),
);

console.log('\nGENERIC SKILLS');
for (const name of maaatchGenericSkills) {
  const deferredReason = deferredGenericSkills.get(name);
  if (deferredReason && !blockoutSkills.has(name)) {
    console.log(`DEFER   ${name} (${deferredReason})`);
    continue;
  }

  const nonApplicableReason = nonApplicableGenericSkills.get(name);
  if (nonApplicableReason) {
    console.log(`NONAPP  ${name} (${nonApplicableReason})`);
    if (blockoutSkills.has(name)) {
      failures.push(
        `Non-applicable generic skill copied into Blockout: ${name}`,
      );
    }
    continue;
  }

  const present = blockoutSkills.has(name);
  console.log(`${(present ? 'MATCH' : 'GAP').padEnd(7)} ${name}`);
  if (!present) failures.push(`Missing applicable generic skill: ${name}`);
}

console.log('\nBLOCKOUT-ONLY SURFACES');
console.log('VARIANT apps/scrapers (two explicit Python deployables)');
console.log('TEMP    docs/migration (removed or archived after cutover)');
console.log('TEMP    docs/current/blockout-active-roadmap.md');

if (failures.length > 0) {
  console.error(`\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('\nShared structural foundation is present.');
}

function filenames(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((entry) => statSync(join(path, entry)).isFile())
    .sort();
}

function directories(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((entry) => statSync(join(path, entry)).isDirectory())
    .sort();
}
