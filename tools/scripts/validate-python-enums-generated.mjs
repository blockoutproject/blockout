import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const scrapersRoot = path.join(repositoryRoot, 'apps/scrapers');

const astGuard = String.raw`
import ast
import json
import sys

source = sys.stdin.read()
tree = ast.parse(source)
enum_types = {"Enum", "IntEnum", "StrEnum"}
direct_aliases = set()

for node in ast.walk(tree):
    if isinstance(node, ast.ImportFrom) and node.module == "enum":
        for alias in node.names:
            if alias.name in enum_types:
                direct_aliases.add(alias.asname or alias.name)

findings = []
for node in ast.walk(tree):
    if not isinstance(node, ast.ClassDef):
        continue
    is_enum = any(
        isinstance(base, ast.Name) and base.id in enum_types | direct_aliases
        or isinstance(base, ast.Attribute)
        and base.attr in enum_types
        for base in node.bases
    )
    if is_enum:
        findings.append({"kind": f"enum declaration {node.name}", "line": node.lineno})

print(json.dumps(sorted(findings, key=lambda item: item["line"])))
`;

export function findHandwrittenPythonEnums(source) {
  const result = spawnSync('python3', ['-c', astGuard], {
    input: source,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'Python AST validation failed');
  }
  return JSON.parse(result.stdout);
}

async function listPythonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '__pycache__' || entry.name === '.venv') {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listPythonFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith('.py')) {
      files.push(entryPath);
    }
  }
  return files;
}

export async function validatePythonEnumsGenerated(root = scrapersRoot) {
  const files = await listPythonFiles(root);
  const errors = [];
  for (const file of files.sort()) {
    const source = await readFile(file, 'utf8');
    for (const finding of findHandwrittenPythonEnums(source)) {
      errors.push(
        `${path.relative(repositoryRoot, file)}:${finding.line}: ${finding.kind}`,
      );
    }
  }
  return { errors, pythonFiles: files.length };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await validatePythonEnumsGenerated();
  if (result.errors.length > 0) {
    console.error('Handwritten Python enums are forbidden in scraper sources:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Validated ${result.pythonFiles} scraper Python files.`);
  }
}
