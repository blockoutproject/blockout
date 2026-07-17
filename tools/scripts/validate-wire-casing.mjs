import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);
const defaultRoot = path.resolve(scriptDir, '../..');
const camelCasePattern = /^[a-z][A-Za-z0-9]*$/;
const snakeCasePattern = /^[a-z][a-z0-9]*_[a-z0-9_]+$/;
const allowedTopLevelKeys = new Set([
  'version',
  'v1Adapters',
  'databaseColumns',
  'pythonIdentifiers',
  'externalVendorPayloads',
]);
const allowedVendorKinds = new Set(['direct-http', 'object-keys']);

function relative(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

async function listFiles(root, predicate = () => true) {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const entryPath = path.join(root, entry.name);
        if (entry.isDirectory()) return listFiles(entryPath, predicate);
        return entry.isFile() && predicate(entryPath) ? [entryPath] : [];
      }),
  );
  return nested.flat();
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function walk(value, visitor, pointer = '') {
  if (value === null || typeof value !== 'object') return;
  visitor(value, pointer);
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      walk(entry, visitor, `${pointer}/${index}`),
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    walk(
      child,
      visitor,
      `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`,
    );
  }
}

export function collectContractViolations(document, file = 'fixture.json') {
  const violations = [];
  let wireNames = 0;
  walk(document, (value, pointer) => {
    const eventContract =
      file.startsWith('events/') || file.includes('/events/');
    const protocolHeaders =
      eventContract &&
      (file.includes('/headers/') || pointer.split('/').includes('headers'));
    if (
      !protocolHeaders &&
      !Array.isArray(value) &&
      value.properties &&
      typeof value.properties === 'object'
    ) {
      for (const propertyName of Object.keys(value.properties)) {
        wireNames += 1;
        if (!camelCasePattern.test(propertyName)) {
          violations.push(
            `${file}${pointer}/properties/${propertyName}: non-camelCase property`,
          );
        }
      }
    }
    if (
      !Array.isArray(value) &&
      ['query', 'path', 'cookie'].includes(value.in) &&
      typeof value.name === 'string'
    ) {
      wireNames += 1;
      if (!camelCasePattern.test(value.name)) {
        violations.push(
          `${file}${pointer}/name: non-camelCase ${value.in} parameter "${value.name}"`,
        );
      }
    }
  });
  return { violations, wireNames };
}

export function collectTypeScriptSnakeKeys(source, file = 'fixture.ts') {
  const findings = [];
  const pattern =
    /(?:^|[,{]\s*)(?:['"])?([a-z][a-z0-9]*_[a-z0-9_]+)(?:['"])?\s*:/gm;
  for (const match of source.matchAll(pattern)) {
    findings.push({
      file,
      key: match[1],
      line: lineNumber(source, match.index ?? 0),
    });
  }
  return findings;
}

export function validateAllowlistShape(allowlist) {
  const errors = [];
  for (const key of Object.keys(allowlist ?? {})) {
    if (!allowedTopLevelKeys.has(key))
      errors.push(`Unknown allowlist category: ${key}`);
  }
  for (const key of allowedTopLevelKeys) {
    if (!Object.hasOwn(allowlist ?? {}, key))
      errors.push(`Missing allowlist category: ${key}`);
  }
  if (allowlist?.version !== 1) errors.push('Allowlist version must be 1');
  if (!Array.isArray(allowlist?.v1Adapters?.snakeCaseMappers)) {
    errors.push('v1Adapters.snakeCaseMappers must be an array');
  }
  if (!Array.isArray(allowlist?.v1Adapters?.snakeCaseRequestParameters)) {
    errors.push('v1Adapters.snakeCaseRequestParameters must be an array');
  }
  if (!Array.isArray(allowlist?.databaseColumns?.javaAnnotations)) {
    errors.push('databaseColumns.javaAnnotations must be an array');
  }
  if (!Array.isArray(allowlist?.pythonIdentifiers?.roots)) {
    errors.push('pythonIdentifiers.roots must be an array');
  }
  if (!Array.isArray(allowlist?.externalVendorPayloads)) {
    errors.push('externalVendorPayloads must be an array');
  } else {
    const seen = new Set();
    allowlist.externalVendorPayloads.forEach((entry, index) => {
      if (!entry?.path || typeof entry.path !== 'string') {
        errors.push(`externalVendorPayloads[${index}].path must be a string`);
      }
      if (!allowedVendorKinds.has(entry?.kind)) {
        errors.push(`externalVendorPayloads[${index}].kind is not allowed`);
      }
      if (typeof entry?.reason !== 'string' || entry.reason.length < 20) {
        errors.push(`externalVendorPayloads[${index}].reason is too short`);
      }
      if (entry?.kind === 'object-keys' && !Array.isArray(entry.keys)) {
        errors.push(`externalVendorPayloads[${index}].keys must be an array`);
      }
      const identity = `${entry?.kind}:${entry?.path}`;
      if (seen.has(identity))
        errors.push(`Duplicate external vendor entry: ${identity}`);
      seen.add(identity);
    });
  }
  return errors;
}

async function validateContracts(root, errors, summary) {
  const contractRoots = [
    'libs/shared/contracts/specs/source',
    'libs/shared/contracts/generated/specs',
    'libs/shared/contracts/events/source',
    'libs/shared/contracts/generated/events',
  ];
  for (const contractRoot of contractRoots) {
    const files = await listFiles(path.join(root, contractRoot), (file) =>
      file.endsWith('.json'),
    );
    if (files.length === 0)
      errors.push(`${contractRoot}: no contract files found`);
    for (const file of files) {
      const fileName = relative(root, file);
      const document = JSON.parse(await readFile(file, 'utf8'));
      const result = collectContractViolations(document, fileName);
      errors.push(...result.violations);
      summary.contractFiles += 1;
      summary.contractWireNames += result.wireNames;
    }
  }
}

async function validateBackend(root, allowlist, errors, summary) {
  const javaFiles = await listFiles(
    path.join(root, 'apps/backend'),
    (file) =>
      file.includes('/src/main/java/') &&
      file.endsWith('.java') &&
      !file.includes('/target/') &&
      !file.includes('/src/generated/'),
  );
  const observedMappers = new Set();
  const observedParameters = new Set();
  const mapperAllowlist = new Set(allowlist.v1Adapters.snakeCaseMappers);
  const parameterAllowlist = new Set(
    allowlist.v1Adapters.snakeCaseRequestParameters,
  );
  const vendorFiles = new Set(
    allowlist.externalVendorPayloads.map((entry) => entry.path),
  );
  const databaseAnnotations =
    allowlist.databaseColumns.javaAnnotations.join('|');
  const databasePattern = new RegExp(
    `@(?:${databaseAnnotations})\\b[^;\\n]*["']([a-z][a-z0-9]*_[a-z0-9_]+)["']`,
    'g',
  );
  const requestPattern =
    /@(RequestParam|RequestPart|PathVariable|RequestHeader)\([^\n]*["']([a-z][a-z0-9]*_[a-z0-9_]+)["']/g;

  for (const file of javaFiles) {
    const fileName = relative(root, file);
    const source = await readFile(file, 'utf8');
    if (source.includes('PropertyNamingStrategies.SNAKE_CASE')) {
      if (mapperAllowlist.has(fileName)) observedMappers.add(fileName);
      else
        errors.push(
          `${fileName}: SNAKE_CASE mapper is outside the v1 adapter allowlist`,
        );
    }
    const namingAnnotation = source.match(/@Json(?:Property|Alias|Naming)\b/);
    if (namingAnnotation && !vendorFiles.has(fileName)) {
      errors.push(
        `${fileName}: Jackson naming annotation is not an allowlisted vendor boundary`,
      );
    }
    for (const match of source.matchAll(requestPattern)) {
      if (parameterAllowlist.has(fileName)) observedParameters.add(fileName);
      else
        errors.push(
          `${fileName}:${lineNumber(source, match.index ?? 0)}: snake_case request name "${match[2]}"`,
        );
    }
    summary.databaseNames += [...source.matchAll(databasePattern)].length;
  }

  for (const file of mapperAllowlist) {
    if (!observedMappers.has(file))
      errors.push(`${file}: stale or missing v1 mapper allowlist entry`);
  }
  for (const file of parameterAllowlist) {
    if (!observedParameters.has(file))
      errors.push(
        `${file}: stale or missing v1 request-parameter allowlist entry`,
      );
  }
  if (summary.databaseNames === 0)
    errors.push('No allowlisted database column names were observed');

  const resourceFiles = await listFiles(
    path.join(root, 'apps/backend'),
    (file) =>
      file.includes('/src/main/resources/') &&
      /\.(?:ya?ml|properties)$/.test(file),
  );
  for (const file of resourceFiles) {
    const source = await readFile(file, 'utf8');
    if (
      /property-naming-strategy|PropertyNamingStrategies\.SNAKE_CASE/.test(
        source,
      )
    ) {
      errors.push(
        `${relative(root, file)}: global snake_case configuration is forbidden`,
      );
    }
  }
  summary.v1Mappers = observedMappers.size;
  summary.v1RequestFiles = observedParameters.size;
}

async function validateExpo(root, allowlist, errors, summary, vendorUsage) {
  const mobileRoot = path.join(root, 'apps/frontend/mobile');
  const sourceFiles = await listFiles(path.join(mobileRoot, 'src'), (file) =>
    /\.(?:ts|tsx)$/.test(file),
  );
  const vendorKeyMap = new Map();
  for (const entry of allowlist.externalVendorPayloads.filter(
    (item) => item.kind === 'object-keys',
  )) {
    vendorKeyMap.set(entry.path, new Set(entry.keys));
  }
  for (const file of sourceFiles) {
    const fileName = relative(root, file);
    const source = await readFile(file, 'utf8');
    if (!fileName.includes('/generated/')) {
      for (const finding of collectTypeScriptSnakeKeys(source, fileName)) {
        if (vendorKeyMap.get(fileName)?.has(finding.key)) {
          vendorUsage.add(`object-keys:${fileName}:${finding.key}`);
        } else {
          errors.push(
            `${fileName}:${finding.line}: snake_case object key "${finding.key}"`,
          );
        }
      }
    }
    if (/\bfetch\s*\(/.test(source)) {
      const entry = allowlist.externalVendorPayloads.find(
        (item) => item.kind === 'direct-http' && item.path === fileName,
      );
      if (entry) vendorUsage.add(`direct-http:${fileName}`);
      else
        errors.push(
          `${fileName}: direct fetch must be an explicit external vendor boundary`,
        );
    }
    if (
      fileName.includes('/generated/') &&
      /^\s*(?:readonly\s+)?["']?([a-z][a-z0-9]*_[a-z0-9_]+)["']?\??\s*:/m.test(
        source,
      )
    ) {
      errors.push(
        `${fileName}: generated Expo model contains a snake_case property`,
      );
    }
  }

  const prohibitedFiles = [
    path.join(mobileRoot, 'package.json'),
    path.join(root, 'package-lock.json'),
    ...sourceFiles,
  ];
  const prohibited =
    /camelcase-keys|snakecase-keys|axios-case-converter|transformCase|appendJsonSnake/;
  for (const file of prohibitedFiles) {
    const source = await readFile(file, 'utf8');
    if (prohibited.test(source))
      errors.push(
        `${relative(root, file)}: obsolete case-conversion mechanism found`,
      );
  }
  summary.expoSourceFiles = sourceFiles.length;
}

async function validatePython(root, allowlist, errors, summary, vendorUsage) {
  const generatedRoot = path.join(
    root,
    'libs/shared/contracts/clients/python/src/blockout_contract_clients',
  );
  const generatedFiles = await listFiles(generatedRoot, (file) =>
    file.endsWith('.py'),
  );
  const wirePatterns = [
    /alias\s*=\s*["']([^"']+)["']/g,
    /_query_params\.append\(\(["']([^"']+)["']/g,
    /_path_params\[["']([^"']+)["']\]/g,
  ];
  for (const file of generatedFiles) {
    const source = await readFile(file, 'utf8');
    for (const pattern of wirePatterns) {
      for (const match of source.matchAll(pattern)) {
        summary.pythonWireNames += 1;
        if (!camelCasePattern.test(match[1])) {
          errors.push(
            `${relative(root, file)}:${lineNumber(source, match.index ?? 0)}: generated Python wire name "${match[1]}"`,
          );
        }
      }
    }
  }
  if (summary.pythonWireNames === 0)
    errors.push('No generated Python wire names were inspected');

  const scraperFiles = await listFiles(
    path.join(root, 'apps/scrapers'),
    (file) => file.endsWith('.py') && !file.includes('/__pycache__/'),
  );
  const directHttpPattern =
    /(?:requests\.(?:get|post|put|patch|delete)|(?:self\.)?(?:session|client|scraper\.session)\.(?:get|post|put|patch|delete)|\.session\.(?:get|post|put|patch|delete))\s*\(/;
  for (const file of scraperFiles) {
    const fileName = relative(root, file);
    const source = await readFile(file, 'utf8');
    if (directHttpPattern.test(source)) {
      const entry = allowlist.externalVendorPayloads.find(
        (item) => item.kind === 'direct-http' && item.path === fileName,
      );
      if (entry) vendorUsage.add(`direct-http:${fileName}`);
      else
        errors.push(
          `${fileName}: direct HTTP is outside the external vendor allowlist`,
        );
    }
    const vendorKeys = allowlist.externalVendorPayloads.find(
      (item) => item.kind === 'object-keys' && item.path === fileName,
    )?.keys;
    for (const key of vendorKeys ?? []) {
      if (source.includes(`"${key}"`) || source.includes(`'${key}'`)) {
        vendorUsage.add(`object-keys:${fileName}:${key}`);
      }
    }
    if (
      fileName.includes('/api/') &&
      !fileName.endsWith('/auth0.py') &&
      !fileName.endsWith('/blockout_client.py')
    ) {
      if (!source.includes('blockout_contract_clients')) {
        errors.push(
          `${fileName}: Blockout scraper API adapter does not use generated clients`,
        );
      }
    }
  }

  let pythonIdentifierCount = 0;
  for (const configuredRoot of allowlist.pythonIdentifiers.roots) {
    const files = await listFiles(path.join(root, configuredRoot), (file) =>
      file.endsWith('.py'),
    );
    if (files.length === 0)
      errors.push(
        `${configuredRoot}: Python identifier allowlist root is empty`,
      );
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      pythonIdentifierCount += [
        ...source.matchAll(/\b[a-z][a-z0-9]*_[a-z0-9_]+\b/g),
      ].length;
    }
  }
  if (pythonIdentifierCount === 0)
    errors.push('No allowlisted Python identifiers were observed');
  summary.pythonIdentifiers = pythonIdentifierCount;
  summary.pythonFiles = generatedFiles.length + scraperFiles.length;
}

async function validateAllowlistUsage(root, allowlist, errors, vendorUsage) {
  for (const file of [
    ...allowlist.v1Adapters.snakeCaseMappers,
    ...allowlist.v1Adapters.snakeCaseRequestParameters,
    allowlist.databaseColumns.migrationRoot,
    ...allowlist.pythonIdentifiers.roots,
    ...allowlist.externalVendorPayloads.map((entry) => entry.path),
  ]) {
    if (!existsSync(path.join(root, file)))
      errors.push(`${file}: allowlist path does not exist`);
  }
  for (const entry of allowlist.externalVendorPayloads) {
    if (
      entry.kind === 'direct-http' &&
      !vendorUsage.has(`direct-http:${entry.path}`)
    ) {
      errors.push(`${entry.path}: stale direct-http vendor allowlist entry`);
    }
    for (const key of entry.keys ?? []) {
      if (!vendorUsage.has(`object-keys:${entry.path}:${key}`)) {
        errors.push(`${entry.path}: stale vendor key allowlist entry "${key}"`);
      }
    }
  }
}

export async function validateRepository(root = defaultRoot) {
  const allowlistPath = path.join(root, 'tools/wire-casing-allowlist.json');
  const allowlist = JSON.parse(await readFile(allowlistPath, 'utf8'));
  const errors = validateAllowlistShape(allowlist);
  const summary = {
    contractFiles: 0,
    contractWireNames: 0,
    v1Mappers: 0,
    v1RequestFiles: 0,
    databaseNames: 0,
    expoSourceFiles: 0,
    pythonFiles: 0,
    pythonWireNames: 0,
    pythonIdentifiers: 0,
    vendorExceptions: allowlist.externalVendorPayloads.length,
  };
  const vendorUsage = new Set();

  await validateContracts(root, errors, summary);
  await validateBackend(root, allowlist, errors, summary);
  await validateExpo(root, allowlist, errors, summary, vendorUsage);
  await validatePython(root, allowlist, errors, summary, vendorUsage);
  await validateAllowlistUsage(root, allowlist, errors, vendorUsage);

  if (errors.length > 0) {
    throw new Error(`Wire casing guard failed:\n- ${errors.join('\n- ')}`);
  }
  return summary;
}

if (path.resolve(process.argv[1] ?? '') === scriptFile) {
  validateRepository()
    .then((summary) => {
      console.log(
        `Wire casing guard passed (${summary.contractFiles} contract files, ` +
          `${summary.contractWireNames} contract wire names, ${summary.v1Mappers} v1 mappers, ` +
          `${summary.v1RequestFiles} v1 request files, ${summary.databaseNames} database names, ` +
          `${summary.expoSourceFiles} Expo files, ${summary.pythonWireNames} Python wire names, ` +
          `${summary.vendorExceptions} vendor exceptions).`,
      );
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
