import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const scrapersRoot = path.join(repositoryRoot, 'apps/scrapers');
const sharedSchemasRoot = path.join(
  repositoryRoot,
  'libs/shared/contracts/specs/source/shared/schemas',
);

const astReader = String.raw`
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

def constant_value(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, (str, int, float, bool, type(None))):
        return node.value
    if (
        isinstance(node, ast.UnaryOp)
        and isinstance(node.op, ast.USub)
        and isinstance(node.operand, ast.Constant)
        and isinstance(node.operand.value, (int, float))
    ):
        return -node.operand.value
    return None

declarations = []
for node in ast.walk(tree):
    if not isinstance(node, ast.ClassDef):
        continue
    is_enum = any(
        isinstance(base, ast.Name) and (base.id in enum_types or base.id in direct_aliases)
        or isinstance(base, ast.Attribute) and base.attr in enum_types
        for base in node.bases
    )
    if not is_enum:
        continue
    members = []
    for statement in node.body:
        if (
            isinstance(statement, ast.Assign)
            and len(statement.targets) == 1
            and isinstance(statement.targets[0], ast.Name)
        ):
            value = constant_value(statement.value)
            if value is not None:
                members.append({"name": statement.targets[0].id, "value": value})
        elif isinstance(statement, ast.AnnAssign) and isinstance(statement.target, ast.Name):
            value = constant_value(statement.value)
            if value is not None:
                members.append({"name": statement.target.id, "value": value})
    declarations.append({"line": node.lineno, "members": members, "name": node.name})

print(json.dumps(sorted(declarations, key=lambda item: item["line"])))
`;

export function findPythonEnumDeclarations(source) {
  const result = spawnSync('python3', ['-c', astReader], {
    input: source,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'Python AST validation failed');
  }
  return JSON.parse(result.stdout);
}

function normalizeConceptName(name) {
  return name
    .replace(/Enum$/, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toLowerCase();
}

function generatedMemberName(value) {
  const normalized = String(value)
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return /^[0-9]/.test(normalized) ? `_${normalized}` : normalized;
}

function enumFingerprint(members) {
  return JSON.stringify(
    [...members]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(({ name, value }) => [name, value]),
  );
}

export function findContractEnumMirrors(source, contractEnums) {
  const declarations = findPythonEnumDeclarations(source);
  const findings = [];

  for (const declaration of declarations) {
    const nameOwner = contractEnums.find(
      (contractEnum) =>
        normalizeConceptName(contractEnum.name) ===
        normalizeConceptName(declaration.name),
    );
    if (nameOwner) {
      findings.push({
        contract: nameOwner.name,
        kind: `contract enum name mirror ${declaration.name}`,
        line: declaration.line,
      });
      continue;
    }

    if (declaration.members.length === 0) continue;
    const fingerprint = enumFingerprint(declaration.members);
    const valueOwner = contractEnums.find(
      (contractEnum) => enumFingerprint(contractEnum.members) === fingerprint,
    );
    if (valueOwner) {
      findings.push({
        contract: valueOwner.name,
        kind: `contract enum value mirror ${declaration.name}`,
        line: declaration.line,
      });
    }
  }

  return findings;
}

async function listFiles(directory, predicate) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '__pycache__' || entry.name === '.venv') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath, predicate)));
    } else if (entry.isFile() && predicate(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

export async function loadContractEnums(root = sharedSchemasRoot) {
  const files = await listFiles(root, (file) => file.endsWith('.json'));
  const contractEnums = [];

  for (const file of files.sort()) {
    const document = JSON.parse(await readFile(file, 'utf8'));
    for (const [name, schema] of Object.entries(document)) {
      if (!name.endsWith('Enum') || !Array.isArray(schema.enum)) continue;
      const declaredNames = schema['x-enum-varnames'];
      const memberNames =
        Array.isArray(declaredNames) &&
        declaredNames.length === schema.enum.length
          ? declaredNames
          : schema.enum.map(generatedMemberName);
      contractEnums.push({
        name,
        members: schema.enum.map((value, index) => ({
          name: memberNames[index],
          value,
        })),
      });
    }
  }

  return contractEnums.sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export async function validatePythonEnumOwnership(
  root = scrapersRoot,
  schemasRoot = sharedSchemasRoot,
) {
  const [files, contractEnums] = await Promise.all([
    listFiles(root, (file) => file.endsWith('.py')),
    loadContractEnums(schemasRoot),
  ]);
  const errors = [];

  for (const file of files.sort()) {
    const source = await readFile(file, 'utf8');
    for (const finding of findContractEnumMirrors(source, contractEnums)) {
      errors.push(
        `${path.relative(repositoryRoot, file)}:${finding.line}: ${finding.kind} duplicates ${finding.contract}`,
      );
    }
  }

  return {
    contractEnums: contractEnums.length,
    errors,
    pythonFiles: files.length,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await validatePythonEnumOwnership();
  if (result.errors.length > 0) {
    console.error('Python enum ownership validation failed:');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Python enum ownership passed (${result.pythonFiles} scraper files, ${result.contractEnums} contract enums).`,
    );
  }
}
