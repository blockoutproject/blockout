import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '../..');

function markdownFiles(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return path.endsWith('.md') ? [path] : [];
  return readdirSync(path).flatMap((entry) => markdownFiles(join(path, entry)));
}

const files = [
  join(workspaceRoot, 'README.md'),
  join(workspaceRoot, 'CLAUDE.md'),
  ...markdownFiles(join(workspaceRoot, 'docs')),
  ...markdownFiles(join(workspaceRoot, '.agents')),
];

const failures = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const link = match[1].replace(/^<|>$/g, '').split('#', 1)[0];
    if (
      !link ||
      /^(?:https?:|mailto:|#)/.test(link) ||
      link.includes('{') ||
      link.includes('}')
    ) {
      continue;
    }

    const target = resolve(dirname(file), decodeURIComponent(link));
    if (!existsSync(target)) {
      failures.push(
        `${relative(workspaceRoot, file)}: missing local link target ${link}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Documentation local links are valid.');
}
