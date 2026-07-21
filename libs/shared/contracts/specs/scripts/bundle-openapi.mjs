import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const specsDir = path.resolve(scriptDir, '..');
const sourceDir = path.join(specsDir, 'source');
const generatedSpecsDir = path.resolve(specsDir, '../generated/specs');
const servicesDir = path.join(sourceDir, 'services');
const sharedBaseFile = path.join(sourceDir, 'shared/base.json');
const sharedSchemasDir = path.join(sourceDir, 'shared/schemas');
const readinessFile = path.join(specsDir, 'adoption-readiness.json');
const schemaRefPattern = /^#\/components\/schemas\/(.+)$/;

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function directories(dir) {
  try {
    return (await readdir(dir, {withFileTypes: true}))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function loadJsonDirectory(dir) {
  let entries;
  try {
    entries = await readdir(dir, {withFileTypes: true});
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }

  const result = {};
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  for (const filename of files) {
    const document = await readJson(path.join(dir, filename));
    for (const [name, value] of Object.entries(document)) {
      if (Object.hasOwn(result, name)) {
        throw new Error(`Duplicate component or path "${name}" in ${dir}`);
      }
      result[name] = value;
    }
  }

  return result;
}

function collectSchemaReferences(value, references = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSchemaReferences(item, references);
    }
    return references;
  }

  if (!value || typeof value !== 'object') {
    return references;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (key === '$ref' && typeof nested === 'string') {
      const match = schemaRefPattern.exec(nested);
      if (match?.[1]) {
        references.add(match[1]);
      }
    } else {
      collectSchemaReferences(nested, references);
    }
  }

  return references;
}

function resolveSchemas(roots, availableSchemas) {
  const queue = [...collectSchemaReferences(roots)];
  const resolved = {};

  while (queue.length > 0) {
    const schemaName = queue.shift();
    if (!schemaName || resolved[schemaName]) {
      continue;
    }

    const schema = availableSchemas[schemaName];
    if (!schema) {
      throw new Error(`Missing schema "${schemaName}"`);
    }
    resolved[schemaName] = schema;

    for (const nested of collectSchemaReferences(schema)) {
      if (!resolved[nested]) {
        queue.push(nested);
      }
    }
  }

  return resolved;
}

function usedTags(paths, availableTags = []) {
  const names = new Set();
  for (const pathItem of Object.values(paths)) {
    for (const operation of Object.values(pathItem)) {
      for (const tag of operation.tags ?? []) {
        names.add(tag);
      }
    }
  }
  return availableTags.filter((tag) => names.has(tag.name));
}

async function writeContract({baseFile, paths = {}, schemas, outputFile}) {
  const base = await readJson(baseFile);
  const {openapi, info, servers, tags = [], components = {}, ...rest} = base;
  const contract = {
    openapi,
    info,
    servers,
    tags: usedTags(paths, tags),
    ...rest,
    paths,
    components: {...components, schemas},
  };

  await mkdir(path.dirname(outputFile), {recursive: true});
  await writeFile(outputFile, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
  console.log(`Contract written to ${outputFile}`);
}

async function bundle() {
  const sharedSchemas = await loadJsonDirectory(sharedSchemasDir);
  const readiness = await readJson(readinessFile);

  for (const service of await directories(servicesDir)) {
    const adoption = readiness[service];
    if (!adoption) {
      throw new Error(`Service contract "${service}" is missing from adoption-readiness.json`);
    }
    if (adoption.status !== 'ready' || adoption.evidence.length === 0) {
      throw new Error(`Service contract "${service}" has not passed the DTO readiness gate`);
    }

    const serviceDir = path.join(servicesDir, service);
    const paths = await loadJsonDirectory(path.join(serviceDir, 'paths'));
    const serviceSchemas = await loadJsonDirectory(path.join(serviceDir, 'schemas'));
    const base = await readJson(path.join(serviceDir, 'base.json'));
    const availableSchemas = {...sharedSchemas, ...serviceSchemas};

    await writeContract({
      baseFile: path.join(serviceDir, 'base.json'),
      paths,
      schemas: resolveSchemas([paths, base.components ?? {}], availableSchemas),
      outputFile: path.join(generatedSpecsDir, `${service}.json`),
    });
  }

  await writeContract({
    baseFile: sharedBaseFile,
    schemas: sharedSchemas,
    outputFile: path.join(generatedSpecsDir, 'shared.json'),
  });
}

try {
  await bundle();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
