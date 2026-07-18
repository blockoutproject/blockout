import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { lstat, readFile, readdir, readlink } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const requestedPaths = process.argv.slice(2);

if (requestedPaths.length === 0) {
  console.error(
    'Usage: node tools/scripts/generated-artifact-manifest.mjs <path> [...]',
  );
  process.exit(2);
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

async function collect(file) {
  const metadata = await lstat(file);
  if (metadata.isDirectory()) {
    const entries = (await readdir(file)).filter(
      (entry) => entry !== '__pycache__',
    );
    const nested = await Promise.all(
      entries
        .sort((left, right) => left.localeCompare(right))
        .map((entry) => collect(path.join(file, entry))),
    );
    return nested.flat();
  }
  if (file.endsWith('.pyc')) return [];
  if (metadata.isSymbolicLink()) {
    return [
      {
        file,
        content: Buffer.from(`symlink:${await readlink(file)}`),
      },
    ];
  }
  if (metadata.isFile()) return [{ file, content: await readFile(file) }];
  return [];
}

const missing = requestedPaths.filter(
  (requestedPath) => !existsSync(path.resolve(root, requestedPath)),
);
if (missing.length > 0) {
  console.error(`Missing generated artifact paths: ${missing.join(', ')}`);
  process.exit(1);
}

const files = (
  await Promise.all(
    requestedPaths.map((requestedPath) =>
      collect(path.resolve(root, requestedPath)),
    ),
  )
)
  .flat()
  .sort((left, right) =>
    relative(left.file).localeCompare(relative(right.file)),
  );

if (files.length === 0) {
  console.error(
    'No generated artifacts were found beneath the requested paths.',
  );
  process.exit(1);
}

for (const { file, content } of files) {
  const digest = createHash('sha256').update(content).digest('hex');
  console.log(`${digest}  ${relative(file)}`);
}
