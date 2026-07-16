import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '../..');
const skillRoot = join(workspaceRoot, '.agents/skills/blockout-best-practices');
const referencesRoot = join(skillRoot, 'references');

const requiredReferences = [
  'backend-java-policy.md',
  'baseline-v1-policy.md',
  'code-documentation-policy.md',
  'contract-first.md',
  'environment-configuration-policy.md',
  'figma-policy.md',
  'flyway.md',
  'frontend-mobile-policy.md',
  'git-workflow.md',
  'github-roadmap-governance.md',
  'github-roadmap-lifecycle.md',
  'github-roadmap-operations.md',
  'github-roadmap-policy.md',
  'java-testing-policy.md',
  'jpa-persistence-policy.md',
  'logging-policy.md',
  'mapping-policy.md',
  'nx-workspace-policy.md',
  'production-migration-policy.md',
  'python-scraper-policy.md',
  'rest-endpoint-policy.md',
  'rest-pagination-policy.md',
];

const expectedCurrentDocuments = [
  'blockout-active-roadmap.md',
  'blockout-agent-brief.md',
  'blockout-product-runtime-context.md',
];

const expectedComposeFiles = [
  'docker-compose.app.yml',
  'docker-compose.third-party.yml',
  'pgadmin/servers.json',
];

const forbiddenPatterns = [
  ['Maaatch npm scope', /@maaatch\//],
  ['Maaatch Java package', /com\.maaatch/],
  ['Maaatch repository slug', /maaatch\/maaatch/],
  ['nonexistent Blockout web project', /@blockout\/web/],
  ['nonexistent Blockout web path', /apps\/frontend\/web/],
  ['nonexistent Blockout BFF path', /apps\/backend\/bff/],
];

const failures = [];

for (const name of requiredReferences) {
  const path = join(referencesRoot, name);
  if (!existsSync(path)) failures.push(`Missing required reference: ${name}`);
}

const skillContent = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8');
for (const match of skillContent.matchAll(/references\/([a-z0-9-]+\.md)/g)) {
  if (!existsSync(join(referencesRoot, match[1]))) {
    failures.push(`SKILL.md routes to missing reference: ${match[1]}`);
  }
}

const currentDocuments = relativeFiles(join(workspaceRoot, 'docs/current'));
compareExactSet('docs/current', currentDocuments, expectedCurrentDocuments);

const composeFiles = relativeFiles(join(workspaceRoot, 'infra/compose'));
compareExactSet('infra/compose', composeFiles, expectedComposeFiles);

for (const file of markdownFiles(skillRoot)) {
  const content = readFileSync(file, 'utf8');
  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(content)) {
      failures.push(`${relative(workspaceRoot, file)}: ${label}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    'Agent foundation, current docs, and Compose topology are valid.',
  );
}

function compareExactSet(label, actual, expected) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);

  for (const path of expected) {
    if (!actualSet.has(path)) failures.push(`${label}: missing ${path}`);
  }

  for (const path of actual) {
    if (!expectedSet.has(path)) failures.push(`${label}: unexpected ${path}`);
  }
}

function markdownFiles(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return path.endsWith('.md') ? [path] : [];
  return readdirSync(path).flatMap((entry) => markdownFiles(join(path, entry)));
}

function relativeFiles(root, path = root) {
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .flatMap((entry) => {
      const child = join(path, entry);
      return statSync(child).isDirectory()
        ? relativeFiles(root, child)
        : [relative(root, child)];
    })
    .sort();
}
