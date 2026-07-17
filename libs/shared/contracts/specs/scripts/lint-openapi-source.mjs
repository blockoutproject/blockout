import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultSourceDir = path.resolve(__dirname, '../source');
const defaultExceptionsFile = path.resolve(
  __dirname,
  '../lint-exceptions.json',
);
const sourceDir = path.resolve(process.argv[2] ?? defaultSourceDir);
const exceptionsFile = path.resolve(process.argv[3] ?? defaultExceptionsFile);
const specsDir = path.dirname(sourceDir);

const knownRules = new Set([
  'operation-id-unique',
  'schema-role-name',
  'stable-enum-component',
  'wire-name-camel-case',
]);
const ambiguousSchemaSuffixes = [
  'ApiModel',
  'DTO',
  'DataTransferObject',
  'Dto',
  'Entity',
  'Model',
];
const camelCasePattern = /^[a-z][A-Za-z0-9]*$/;
const taskPattern = /^MRG-\d+$/;

function escapePointerToken(token) {
  return token.replaceAll('~', '~0').replaceAll('/', '~1');
}

function childPointer(pointer, token) {
  return `${pointer}/${escapePointerToken(String(token))}`;
}

async function readDirOrEmpty(dir, options) {
  try {
    return await readdir(dir, options);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function listJsonFiles(dir) {
  const entries = await readDirOrEmpty(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (entry) => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return listJsonFiles(entryPath);
        }
        return entry.isFile() && entry.name.endsWith('.json')
          ? [entryPath]
          : [];
      }),
  );
  return nested.flat();
}

async function loadJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function walk(value, visitor, pointer = '') {
  if (!value || typeof value !== 'object') {
    return;
  }

  visitor(value, pointer);
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walk(item, visitor, childPointer(pointer, index)),
    );
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    walk(child, visitor, childPointer(pointer, key));
  }
}

function relativeFile(file) {
  return path.relative(specsDir, file).split(path.sep).join('/');
}

function contractOwner(file) {
  const relative = path.relative(sourceDir, file).split(path.sep);
  return relative[0] === 'services' && relative[1] ? relative[1] : 'shared';
}

function validTopLevelSharedEnum(file, document, pointer, value) {
  const relative = path.relative(sourceDir, file).split(path.sep).join('/');
  const [componentName] = Object.keys(document);
  return (
    Object.keys(document).length === 1 &&
    relative === `shared/schemas/${componentName}.json` &&
    componentName.endsWith('Enum') &&
    pointer === `/${componentName}` &&
    Array.isArray(value.enum)
  );
}

function collectFileViolations(file, document, operationIds) {
  const violations = [];
  const fileName = relativeFile(file);
  const owner = contractOwner(file);

  if (fileName.includes('/schemas/')) {
    for (const componentName of Object.keys(document)) {
      const suffix = ambiguousSchemaSuffixes.find((candidate) =>
        componentName.endsWith(candidate),
      );
      if (suffix) {
        violations.push({
          rule: 'schema-role-name',
          file: fileName,
          pointer: `/${escapePointerToken(componentName)}`,
          message: `Schema "${componentName}" uses ambiguous suffix "${suffix}"`,
        });
      }
    }
  }

  walk(document, (value, pointer) => {
    if (!Array.isArray(value) && value.properties) {
      for (const propertyName of Object.keys(value.properties)) {
        if (!camelCasePattern.test(propertyName)) {
          violations.push({
            rule: 'wire-name-camel-case',
            file: fileName,
            pointer: childPointer(
              childPointer(pointer, 'properties'),
              propertyName,
            ),
            message: `Property "${propertyName}" is not canonical camelCase`,
          });
        }
      }
    }

    if (
      !Array.isArray(value) &&
      value.in === 'query' &&
      typeof value.name === 'string' &&
      !camelCasePattern.test(value.name)
    ) {
      violations.push({
        rule: 'wire-name-camel-case',
        file: fileName,
        pointer: childPointer(pointer, 'name'),
        message: `Query parameter "${value.name}" is not canonical camelCase`,
      });
    }

    if (
      !Array.isArray(value) &&
      Object.hasOwn(value, 'enum') &&
      !validTopLevelSharedEnum(file, document, pointer, value)
    ) {
      violations.push({
        rule: 'stable-enum-component',
        file: fileName,
        pointer,
        message:
          'Enum values must use one named component under shared/schemas',
      });
    }

    if (
      !Array.isArray(value) &&
      typeof value.operationId === 'string' &&
      value.operationId.length > 0
    ) {
      const key = `${owner}:${value.operationId}`;
      const first = operationIds.get(key);
      if (first) {
        violations.push({
          rule: 'operation-id-unique',
          file: fileName,
          pointer: childPointer(pointer, 'operationId'),
          message: `Operation ID "${value.operationId}" duplicates ${first.file}${first.pointer}`,
        });
      } else {
        operationIds.set(key, {
          file: fileName,
          pointer: childPointer(pointer, 'operationId'),
        });
      }
    }
  });

  return violations;
}

function validateExceptions(document) {
  const errors = [];
  if (
    !document ||
    typeof document !== 'object' ||
    !Array.isArray(document.exceptions)
  ) {
    return {
      exceptions: [],
      errors: ['lint-exceptions.json must contain an exceptions array'],
    };
  }

  const seenIds = new Set();
  const seenMatches = new Set();
  document.exceptions.forEach((exception, index) => {
    const location = `exceptions[${index}]`;
    const requiredStrings = [
      'id',
      'rule',
      'file',
      'pointer',
      'reason',
      'ownerTask',
      'removeByTask',
    ];
    for (const field of requiredStrings) {
      if (
        typeof exception?.[field] !== 'string' ||
        exception[field].trim().length === 0
      ) {
        errors.push(`${location}.${field} must be a non-empty string`);
      }
    }

    if (typeof exception?.id === 'string') {
      if (seenIds.has(exception.id)) {
        errors.push(`${location}.id duplicates "${exception.id}"`);
      }
      seenIds.add(exception.id);
    }
    if (
      typeof exception?.rule === 'string' &&
      !knownRules.has(exception.rule)
    ) {
      errors.push(`${location}.rule is unknown: "${exception.rule}"`);
    }
    if (
      typeof exception?.reason === 'string' &&
      exception.reason.trim().length < 20
    ) {
      errors.push(`${location}.reason must explain the compatibility need`);
    }
    for (const field of ['ownerTask', 'removeByTask']) {
      if (
        typeof exception?.[field] === 'string' &&
        !taskPattern.test(exception[field])
      ) {
        errors.push(`${location}.${field} must be an MRG task identifier`);
      }
    }

    const matchKey = `${exception?.rule}|${exception?.file}|${exception?.pointer}`;
    if (seenMatches.has(matchKey)) {
      errors.push(`${location} duplicates an existing rule/file/pointer match`);
    }
    seenMatches.add(matchKey);
  });

  return { exceptions: document.exceptions, errors };
}

async function lint() {
  const files = await listJsonFiles(sourceDir);
  const operationIds = new Map();
  const violations = [];

  for (const file of files) {
    violations.push(
      ...collectFileViolations(file, await loadJson(file), operationIds),
    );
  }

  const exceptionDocument = existsSync(exceptionsFile)
    ? await loadJson(exceptionsFile)
    : { exceptions: [] };
  const { exceptions, errors: exceptionErrors } =
    validateExceptions(exceptionDocument);
  if (exceptionErrors.length > 0) {
    throw new Error(
      `Invalid OpenAPI lint exceptions:\n${exceptionErrors.map((error) => `- ${error}`).join('\n')}`,
    );
  }

  const usedExceptions = new Set();
  const activeViolations = violations.filter((violation) => {
    const matches = exceptions.filter(
      (exception) =>
        exception.rule === violation.rule &&
        exception.file === violation.file &&
        exception.pointer === violation.pointer,
    );
    if (matches.length === 1) {
      usedExceptions.add(matches[0].id);
      return false;
    }
    return true;
  });
  const unusedExceptions = exceptions.filter(
    (exception) => !usedExceptions.has(exception.id),
  );

  const failures = [
    ...activeViolations.map(
      (violation) =>
        `[${violation.rule}] ${violation.file}${violation.pointer}: ${violation.message}`,
    ),
    ...unusedExceptions.map(
      (exception) =>
        `[unused-exception] ${exception.id}: ${exception.rule} ${exception.file}${exception.pointer}`,
    ),
  ].sort((a, b) => a.localeCompare(b));

  if (failures.length > 0) {
    throw new Error(`OpenAPI source lint failed:\n${failures.join('\n')}`);
  }

  console.log(
    `OpenAPI source lint passed (${files.length} fragments, ${usedExceptions.size} exceptions).`,
  );
}

try {
  await lint();
} catch (error) {
  console.error(error);
  process.exit(1);
}
