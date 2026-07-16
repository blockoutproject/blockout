import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '../..');
const ignoredDirectories = new Set([
  '.expo',
  '.git',
  '.nx',
  '.venv',
  '__pycache__',
  'dist',
  'node_modules',
  'target',
]);

function walk(directory, extensions) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory)
    .filter((entry) => !ignoredDirectories.has(entry))
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? walk(path, extensions) : [path];
    })
    .filter((path) => extensions.some((extension) => path.endsWith(extension)));
}

function variablesFrom(files, patterns) {
  const variables = new Set();

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern)) {
        variables.add(match[1]);
      }
    }
  }

  return variables;
}

function exampleVariables(examplePath) {
  const content = readFileSync(examplePath, 'utf8');
  return new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
      .filter(Boolean),
  );
}

function validate(owner, files, patterns) {
  const examplePath = join(owner, '.env.example');
  if (!existsSync(examplePath)) {
    return [`${relative(workspaceRoot, owner)}: missing .env.example`];
  }

  const expected = variablesFrom(files, patterns);
  const documented = exampleVariables(examplePath);
  return [...expected]
    .filter((variable) => !documented.has(variable))
    .sort()
    .map(
      (variable) =>
        `${relative(workspaceRoot, owner)}/.env.example: missing ${variable}`,
    );
}

const failures = [];
const backendRoot = join(workspaceRoot, 'apps/backend');

for (const entry of readdirSync(backendRoot)) {
  const owner = join(backendRoot, entry);
  if (!statSync(owner).isDirectory()) continue;

  failures.push(
    ...validate(
      owner,
      walk(join(owner, 'src/main/resources'), ['.yaml', '.yml', '.properties']),
      [/\$\{([A-Z][A-Z0-9_]*)/g],
    ),
  );
}

for (const scraper of ['club-scraper', 'competition-scraper']) {
  const owner = join(workspaceRoot, 'apps/scrapers', scraper);
  failures.push(
    ...validate(owner, walk(owner, ['.py']), [
      /os\.getenv\(\s*['"]([A-Z][A-Z0-9_]*)['"]/g,
      /os\.environ(?:\.get)?\(\s*['"]([A-Z][A-Z0-9_]*)['"]/g,
      /os\.environ\[\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\]/g,
    ]),
  );
}

const mobileRoot = join(workspaceRoot, 'apps/frontend/mobile');
failures.push(
  ...validate(mobileRoot, walk(mobileRoot, ['.js', '.mjs', '.ts', '.tsx']), [
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
  ]),
);

const composeRoot = join(workspaceRoot, 'infra/compose');
failures.push(
  ...validate(composeRoot, walk(composeRoot, ['.yml', '.yaml']), [
    /\$\{([A-Z][A-Z0-9_]*)/g,
  ]),
);

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Environment examples cover every referenced runtime variable.');
}
