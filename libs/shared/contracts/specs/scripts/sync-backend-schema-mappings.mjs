import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultSharedSchemasDir = path.resolve(
  __dirname,
  '../source/shared/schemas',
);
const defaultBackendPomFile = path.resolve(
  __dirname,
  '../../../../../apps/backend/pom.xml',
);
const markerStart = '<!-- BEGIN generated schemaMappings -->';
const markerEnd = '<!-- END generated schemaMappings -->';
const sharedModelPackage = 'com.blockout.shared.model';

function countOccurrences(content, value) {
  return content.split(value).length - 1;
}

async function listSchemaFiles(dir) {
  try {
    return (await readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

const standardJavaScalarTypes = new Map([
  ['integer:int32', 'java.lang.Integer'],
  ['integer:int64', 'java.lang.Long'],
  ['number:float', 'java.lang.Float'],
  ['number:double', 'java.lang.Double'],
  ['string:date', 'java.time.LocalDate'],
  ['string:date-time', 'java.time.Instant'],
  ['string:uuid', 'java.util.UUID'],
]);

function standardJavaType(schema) {
  if (Object.hasOwn(schema ?? {}, 'x-java-type')) {
    throw new Error('Non-standard x-java-type metadata is forbidden');
  }

  const key = `${schema?.type ?? ''}:${schema?.format ?? ''}`;
  return standardJavaScalarTypes.get(key);
}

async function loadSchemaMappings(dir) {
  const schemaOwners = new Map();
  const schemaMappings = new Map();

  for (const filename of await listSchemaFiles(dir)) {
    const file = path.join(dir, filename);
    const content = JSON.parse(await readFile(file, 'utf8'));

    if (
      content === null ||
      Array.isArray(content) ||
      typeof content !== 'object'
    ) {
      throw new Error(`Shared schema fragment must be an object: ${file}`);
    }

    for (const [schemaName, schema] of Object.entries(content)) {
      const previousOwner = schemaOwners.get(schemaName);
      if (previousOwner) {
        throw new Error(
          `Duplicate shared schema ${schemaName} in ${previousOwner} and ${filename}`,
        );
      }

      schemaOwners.set(schemaName, filename);
      schemaMappings.set(
        schemaName,
        standardJavaType(schema) ?? `${sharedModelPackage}.${schemaName}`,
      );
    }
  }

  return [...schemaMappings.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

function buildSchemaMappingsBlock(schemaMappings) {
  return [
    '            <!-- BEGIN generated schemaMappings -->',
    '            <schemaMappings>',
    ...schemaMappings.map(
      ([schemaName, javaType]) =>
        `              <schemaMapping>${schemaName}=${javaType}</schemaMapping>`,
    ),
    '            </schemaMappings>',
    '            <!-- END generated schemaMappings -->',
  ].join('\n');
}

function replaceGeneratedBlock(content, replacement) {
  if (
    countOccurrences(content, markerStart) !== 1 ||
    countOccurrences(content, markerEnd) !== 1
  ) {
    throw new Error(
      'Expected exactly one generated schemaMappings block in apps/backend/pom.xml',
    );
  }

  const startIndex = content.indexOf(markerStart);
  const endIndex = content.indexOf(markerEnd);

  if (endIndex < startIndex) {
    throw new Error(
      'Generated schemaMappings markers are out of order in apps/backend/pom.xml',
    );
  }

  const blockStart = content.lastIndexOf('\n', startIndex) + 1;
  const endLineBreak = content.indexOf('\n', endIndex);
  const blockEnd = endLineBreak === -1 ? content.length : endLineBreak + 1;

  return `${content.slice(0, blockStart)}${replacement}\n${content.slice(blockEnd)}`;
}

export async function syncBackendSchemaMappings(
  sharedSchemasDir = defaultSharedSchemasDir,
  backendPomFile = defaultBackendPomFile,
) {
  const schemaMappings = await loadSchemaMappings(sharedSchemasDir);
  const pomContent = await readFile(backendPomFile, 'utf8');
  const updatedPomContent = replaceGeneratedBlock(
    pomContent,
    buildSchemaMappingsBlock(schemaMappings),
  );

  if (updatedPomContent !== pomContent) {
    await writeFile(backendPomFile, updatedPomContent, 'utf8');
  }

  return schemaMappings.map(([schemaName]) => schemaName);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const [
    sharedSchemasDir = defaultSharedSchemasDir,
    backendPomFile = defaultBackendPomFile,
  ] = process.argv.slice(2);

  try {
    const schemaNames = await syncBackendSchemaMappings(
      sharedSchemasDir,
      backendPomFile,
    );
    console.log(
      `Synced ${schemaNames.length} schema mapping(s) to ${backendPomFile}`,
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
