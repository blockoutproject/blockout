import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
} from 'node:fs';
import path from 'node:path';

const separator = process.argv.indexOf('--');
const requestedPaths = process.argv.slice(2, separator);
const command = process.argv.slice(separator + 1);

if (separator < 3 || command.length === 0) {
  console.error(
    'Usage: node tools/scripts/verify-generated-output-determinism.mjs <path> [...] -- <command> [args...]',
  );
  process.exit(2);
}

const root = process.cwd();

function collect(target) {
  const metadata = lstatSync(target);
  if (metadata.isDirectory()) {
    return readdirSync(target)
      .filter((entry) => entry !== '__pycache__')
      .sort((left, right) => left.localeCompare(right))
      .flatMap((entry) => collect(path.join(target, entry)));
  }
  if (target.endsWith('.pyc')) return [];
  const relativePath = path.relative(root, target).split(path.sep).join('/');
  const content = metadata.isSymbolicLink()
    ? Buffer.from(`symlink:${readlinkSync(target)}`)
    : readFileSync(target);
  return [[relativePath, createHash('sha256').update(content).digest('hex')]];
}

function manifest() {
  const missing = requestedPaths.filter(
    (requestedPath) => !existsSync(path.resolve(root, requestedPath)),
  );
  if (missing.length > 0) {
    console.error(`Missing generated artifact paths: ${missing.join(', ')}`);
    process.exit(1);
  }
  return requestedPaths
    .flatMap((requestedPath) => collect(path.resolve(root, requestedPath)))
    .sort(([left], [right]) => left.localeCompare(right));
}

const first = manifest();
const rerun = spawnSync(command[0], command.slice(1), {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, NX_SKIP_NX_CACHE: 'true' },
  stdio: 'inherit',
});
if (rerun.status !== 0) process.exit(rerun.status ?? 1);
const second = manifest();

if (JSON.stringify(first) !== JSON.stringify(second)) {
  const firstMap = new Map(first);
  const secondMap = new Map(second);
  const changed = [...new Set([...firstMap.keys(), ...secondMap.keys()])]
    .filter((file) => firstMap.get(file) !== secondMap.get(file))
    .sort((left, right) => left.localeCompare(right));
  console.error(
    'Generated output is not deterministic across two uncached runs:',
  );
  for (const file of changed) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`Generated output is deterministic (${first.length} files).`);
