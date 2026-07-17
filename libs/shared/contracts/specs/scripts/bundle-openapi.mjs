import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const specsDir = path.resolve(__dirname, '..');
const sourceDir = path.join(specsDir, 'source');
const generatedSpecsDir = path.resolve(__dirname, '../../generated/specs');

const servicesDir = path.join(sourceDir, 'services');
const sharedBaseFile = path.join(sourceDir, 'shared', 'base.json');
const sharedSchemasDir = path.join(sourceDir, 'shared', 'schemas');
const schemaRefPattern = /^#\/components\/schemas\/(.+)$/;
const blockoutServiceNames = new Set([
  'clubs',
  'competition',
  'config',
  'matches',
  'mobile-gateway',
  'notification',
  'pools',
  'reports',
  'search',
  'teams',
  'users',
]);

async function pathExists(candidate) {
  try {
    await readFile(candidate);
    return true;
  } catch {
    return false;
  }
}

async function dirExists(dir) {
  try {
    await readdir(dir);
    return true;
  } catch {
    return false;
  }
}

async function loadJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function loadDirAsMap(dir) {
  if (!(await dirExists(dir))) {
    return {};
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const map = {};
  for (const filename of files) {
    const content = await loadJson(path.join(dir, filename));
    Object.assign(map, content);
  }

  return map;
}

function collectSchemaRefs(value, refs = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSchemaRefs(item, refs);
    }
    return refs;
  }

  if (!value || typeof value !== 'object') {
    return refs;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (key === '$ref' && typeof nested === 'string') {
      const match = schemaRefPattern.exec(nested);
      if (match?.[1]) {
        refs.add(match[1]);
      }
      continue;
    }
    collectSchemaRefs(nested, refs);
  }

  return refs;
}

function resolveSchemas(paths, allSchemas, baseComponents = {}) {
  const required = collectSchemaRefs([paths, baseComponents]);
  const queue = [...required];
  const resolved = {};

  while (queue.length > 0) {
    const schemaName = queue.shift();
    if (!schemaName || resolved[schemaName]) {
      continue;
    }

    const schema = allSchemas[schemaName];
    if (!schema) {
      throw new Error(`Missing schema "${schemaName}"`);
    }

    resolved[schemaName] = schema;

    for (const nested of collectSchemaRefs(schema)) {
      if (!resolved[nested]) {
        queue.push(nested);
      }
    }
  }

  return resolved;
}

function resolveSchemasFromRoots(rootSchemaNames, allSchemas) {
  const queue = [...rootSchemaNames];
  const resolved = {};

  while (queue.length > 0) {
    const schemaName = queue.shift();
    if (!schemaName || resolved[schemaName]) {
      continue;
    }

    const schema = allSchemas[schemaName];
    if (!schema) {
      throw new Error(`Missing schema "${schemaName}"`);
    }

    resolved[schemaName] = schema;

    for (const nested of collectSchemaRefs(schema)) {
      if (!resolved[nested]) {
        queue.push(nested);
      }
    }
  }

  return resolved;
}

function resolveTags(paths, baseTags = []) {
  const used = new Set();
  for (const pathItem of Object.values(paths)) {
    for (const operation of Object.values(pathItem)) {
      for (const tag of operation.tags ?? []) {
        used.add(tag);
      }
    }
  }
  return baseTags.filter((tag) => used.has(tag.name));
}

function mergeComponentRegistries(sharedComponents = {}, ownerComponents = {}) {
  const merged = {};
  const registryNames = [
    ...new Set([
      ...Object.keys(sharedComponents),
      ...Object.keys(ownerComponents),
    ]),
  ];

  for (const registryName of registryNames) {
    const sharedRegistry = sharedComponents[registryName] ?? {};
    const ownerRegistry = ownerComponents[registryName] ?? {};

    if (
      !sharedRegistry ||
      Array.isArray(sharedRegistry) ||
      typeof sharedRegistry !== 'object' ||
      !ownerRegistry ||
      Array.isArray(ownerRegistry) ||
      typeof ownerRegistry !== 'object'
    ) {
      throw new Error(`Component registry "${registryName}" must be an object`);
    }

    for (const componentName of Object.keys(ownerRegistry)) {
      if (Object.hasOwn(sharedRegistry, componentName)) {
        throw new Error(
          `Duplicate component "${registryName}.${componentName}" in shared and owner base documents`,
        );
      }
    }

    merged[registryName] = {
      ...sharedRegistry,
      ...ownerRegistry,
    };
  }

  return merged;
}

async function buildContract({
  baseFile,
  pathsDir,
  outputFile,
  allSchemas,
  rootSchemaNames,
  inheritedComponents,
}) {
  const base = await loadJson(baseFile);
  const paths = pathsDir ? await loadDirAsMap(pathsDir) : (base.paths ?? {});
  const {
    openapi,
    info,
    servers,
    components: baseComponents,
    ...restBase
  } = base;
  const mergedBaseComponents = inheritedComponents
    ? mergeComponentRegistries(inheritedComponents, baseComponents ?? {})
    : (baseComponents ?? {});
  const schemas = rootSchemaNames
    ? resolveSchemasFromRoots(rootSchemaNames, allSchemas)
    : resolveSchemas(paths, allSchemas, mergedBaseComponents);
  const tags = pathsDir
    ? resolveTags(paths, base.tags ?? [])
    : (base.tags ?? []);
  delete restBase.tags;
  delete restBase.paths;

  const contract = {
    openapi,
    info,
    servers,
    tags,
    ...restBase,
    paths,
    components: { ...mergedBaseComponents, schemas },
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
  console.log(`Contract written to ${outputFile}`);
}

async function discoverServices() {
  if (!(await dirExists(servicesDir))) {
    return [];
  }

  const entries = await readdir(servicesDir, { withFileTypes: true });
  const services = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const service of services) {
    if (!blockoutServiceNames.has(service)) {
      throw new Error(`Unknown Blockout contract owner "${service}"`);
    }
  }

  return services;
}

async function bundle() {
  const sharedSchemas = await loadDirAsMap(sharedSchemasDir);
  const sharedSchemaNames = Object.keys(sharedSchemas).sort((a, b) =>
    a.localeCompare(b),
  );
  const services = await discoverServices();
  const hasSharedBase = await pathExists(sharedBaseFile);
  const sharedBase = hasSharedBase ? await loadJson(sharedBaseFile) : {};
  const sharedComponents = sharedBase.components ?? {};
  await rm(generatedSpecsDir, { recursive: true, force: true });

  for (const service of services) {
    const serviceDir = path.join(servicesDir, service);
    const serviceBaseFile = path.join(serviceDir, 'base.json');
    if (!(await pathExists(serviceBaseFile))) {
      throw new Error(`Missing base document for service "${service}"`);
    }
    const serviceSchemas = await loadDirAsMap(path.join(serviceDir, 'schemas'));
    const allSchemas = mergeComponentRegistries(
      { schemas: sharedSchemas },
      { schemas: serviceSchemas },
    ).schemas;

    await buildContract({
      baseFile: serviceBaseFile,
      pathsDir: path.join(serviceDir, 'paths'),
      outputFile: path.join(generatedSpecsDir, `${service}.json`),
      allSchemas,
      inheritedComponents: sharedComponents,
    });
  }

  if (sharedSchemaNames.length > 0 && !hasSharedBase) {
    throw new Error('Shared schemas require source/shared/base.json');
  }

  if (hasSharedBase) {
    await buildContract({
      baseFile: sharedBaseFile,
      outputFile: path.join(generatedSpecsDir, 'shared.json'),
      rootSchemaNames: sharedSchemaNames,
      allSchemas: sharedSchemas,
    });
  }

  if (services.length === 0 && !hasSharedBase) {
    console.log('No OpenAPI source documents found; nothing to bundle.');
  }
}

try {
  await bundle();
} catch (error) {
  console.error(error);
  process.exit(1);
}
