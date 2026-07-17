import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, '../../../../../..');
const clientsRoot = path.resolve(scriptDirectory, '..');
const outputDirectory = path.join(clientsRoot, 'src');
const generator = path.join(
  workspaceRoot,
  'node_modules',
  '.bin',
  'openapi-generator-cli',
);
const configurations = [
  'config-service.json',
  'clubs-service.json',
  'teams-service.json',
  'pools-service.json',
  'competition-service.json',
  'matches-service.json',
];

function normalizeGeneratedText(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      normalizeGeneratedText(entryPath);
      continue;
    }
    if (!entry.name.endsWith('.py') && !entry.name.endsWith('.md')) {
      continue;
    }
    const source = readFileSync(entryPath, 'utf8');
    const normalized = `${source.replace(/[ \t]+$/gm, '').trimEnd()}\n`;
    writeFileSync(entryPath, normalized);
  }
}

rmSync(outputDirectory, { recursive: true, force: true });

for (const configuration of configurations) {
  const result = spawnSync(
    generator,
    ['generate', '-c', path.join(clientsRoot, 'config', configuration)],
    {
      cwd: workspaceRoot,
      encoding: 'utf8',
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

rmSync(path.join(outputDirectory, '.openapi-generator'), {
  recursive: true,
  force: true,
});
rmSync(path.join(outputDirectory, '.openapi-generator-ignore'), {
  force: true,
});
rmSync(path.join(outputDirectory, 'blockout_contract_clients', '__init__.py'), {
  force: true,
});
normalizeGeneratedText(outputDirectory);
