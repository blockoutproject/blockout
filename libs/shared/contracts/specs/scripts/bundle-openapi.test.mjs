import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, '../../../../..');
const scriptFile = path.join(__dirname, 'bundle-openapi.mjs');
const rootSpecsDir = path.resolve(__dirname, '..');
const generatedSpecsDir = path.resolve(__dirname, '../../generated/specs');
const sourceDir = path.resolve(__dirname, '../source');
const servicesDir = path.join(sourceDir, 'services');

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

async function expectedBundleFiles() {
  const entries = await readDirOrEmpty(servicesDir, { withFileTypes: true });
  const services = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${entry.name}.json`)
    .sort((a, b) => a.localeCompare(b));

  const shared = existsSync(path.join(sourceDir, 'shared/base.json'))
    ? ['shared.json']
    : [];
  return [...services, ...shared].sort((a, b) => a.localeCompare(b));
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function listJsonFiles(dir) {
  const entries = await readDirOrEmpty(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listJsonFiles(entryPath);
      }
      return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
    }),
  );

  return files.flat();
}

function findInlineEnums(value, pointer = '') {
  if (!value || typeof value !== 'object') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findInlineEnums(item, `${pointer}/${index}`),
    );
  }

  const nestedInlineEnums = Object.entries(value).flatMap(([key, child]) =>
    findInlineEnums(child, `${pointer}/${key}`),
  );

  return Object.hasOwn(value, 'enum')
    ? [pointer, ...nestedInlineEnums]
    : nestedInlineEnums;
}

function isTopLevelEnumComponent(document, pointer) {
  const [componentName] = Object.keys(document);

  return (
    Object.keys(document).length === 1 &&
    pointer === `/${componentName}` &&
    componentName.endsWith('Enum') &&
    Array.isArray(document[componentName]?.enum)
  );
}

async function createFixtureProject(t) {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'blockout-openapi-'));
  t.after(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  const fixtureScriptFile = path.join(
    projectRoot,
    'specs/scripts/bundle-openapi.mjs',
  );
  await mkdir(path.dirname(fixtureScriptFile), { recursive: true });
  await copyFile(scriptFile, fixtureScriptFile);

  return {
    projectRoot,
    scriptFile: fixtureScriptFile,
    specsDir: path.join(projectRoot, 'specs'),
    sourceDir: path.join(projectRoot, 'specs/source'),
    generatedSpecsDir: path.join(projectRoot, 'generated/specs'),
  };
}

function runBundle(bundleScriptFile, cwd = workspaceRoot) {
  return spawnSync(process.execPath, [bundleScriptFile], {
    cwd,
    encoding: 'utf8',
  });
}

test('workspace source state bundles without placeholder output', async () => {
  await rm(generatedSpecsDir, { recursive: true, force: true });

  const result = runBundle(scriptFile);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const expectedFiles = await expectedBundleFiles();
  const actualFiles = (await readDirOrEmpty(generatedSpecsDir))
    .filter((file) => file.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));
  assert.deepEqual(actualFiles, expectedFiles);

  for (const bundleFile of expectedFiles) {
    const generatedFile = path.join(generatedSpecsDir, bundleFile);
    const rootSpecFile = path.join(rootSpecsDir, bundleFile);
    const bundle = await readJson(generatedFile);

    assert.equal(
      existsSync(rootSpecFile),
      false,
      `${bundleFile} must not be generated in specs/`,
    );
    assert.equal(typeof bundle.openapi, 'string');
    assert.equal(typeof bundle.info?.title, 'string');
    assert.equal(typeof bundle.paths, 'object');
    assert.equal(typeof bundle.components?.schemas, 'object');
  }
});

test('workspace stable enums remain named top-level components', async () => {
  const sourceFiles = await listJsonFiles(sourceDir);
  const inlineEnumLocations = [];

  for (const sourceFile of sourceFiles) {
    const document = await readJson(sourceFile);
    const inlineEnums = findInlineEnums(document).filter(
      (pointer) => !isTopLevelEnumComponent(document, pointer),
    );

    inlineEnumLocations.push(
      ...inlineEnums.map(
        (pointer) => `${path.relative(workspaceRoot, sourceFile)}${pointer}`,
      ),
    );
  }

  assert.deepEqual(
    inlineEnumLocations.sort((a, b) => a.localeCompare(b)),
    [],
  );
});

test('fixture bundles transitive schemas, shared enums, and stable output', async (t) => {
  const fixture = await createFixtureProject(t);

  await writeJson(path.join(fixture.sourceDir, 'shared/base.json'), {
    openapi: '3.1.0',
    info: { title: 'Blockout Shared API', version: '2.0.0' },
    paths: {},
  });
  await writeJson(
    path.join(fixture.sourceDir, 'shared/schemas/FormatEnum.json'),
    { FormatEnum: { type: 'string', enum: ['SIX_VS_SIX', 'FOUR_VS_FOUR'] } },
  );
  await writeJson(
    path.join(fixture.sourceDir, 'shared/schemas/SharedEnvelope.json'),
    {
      SharedEnvelope: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/SharedId' },
        },
      },
    },
  );
  await writeJson(
    path.join(fixture.sourceDir, 'shared/schemas/SharedId.json'),
    { SharedId: { type: 'string', format: 'uuid' } },
  );
  await writeJson(path.join(fixture.sourceDir, 'shared/schemas/TraceId.json'), {
    TraceId: { type: 'string' },
  });
  await writeJson(
    path.join(fixture.sourceDir, 'shared/schemas/UnusedShared.json'),
    { UnusedShared: { type: 'object' } },
  );

  const clubsDir = path.join(fixture.sourceDir, 'services/clubs');
  await writeJson(path.join(clubsDir, 'base.json'), {
    openapi: '3.1.0',
    info: { title: 'Blockout Clubs Internal API', version: '2.0.0' },
    servers: [{ url: 'http://clubs-service:8080' }],
    tags: [{ name: 'clubs' }, { name: 'unused' }],
    components: {
      parameters: {
        TraceIdHeader: {
          name: 'x-request-id',
          in: 'header',
          schema: { $ref: '#/components/schemas/TraceId' },
        },
      },
    },
  });
  await writeJson(path.join(clubsDir, 'paths/a-club-detail.json'), {
    '/api/v2/clubs/{clubId}': {
      get: {
        operationId: 'getClub',
        tags: ['clubs'],
        responses: { 204: { description: 'No content' } },
      },
    },
  });
  await writeJson(path.join(clubsDir, 'paths/z-club-list.json'), {
    '/api/v2/clubs': {
      get: {
        operationId: 'listClubs',
        tags: ['clubs'],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ClubInternalListResponse',
                },
              },
            },
          },
        },
      },
    },
  });
  await writeJson(
    path.join(clubsDir, 'schemas/ClubInternalListResponse.json'),
    {
      ClubInternalListResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/ClubInternalResponse' },
          },
          envelope: { $ref: '#/components/schemas/SharedEnvelope' },
        },
      },
    },
  );
  await writeJson(path.join(clubsDir, 'schemas/ClubInternalResponse.json'), {
    ClubInternalResponse: {
      type: 'object',
      properties: {
        id: { $ref: '#/components/schemas/SharedId' },
        format: { $ref: '#/components/schemas/FormatEnum' },
      },
    },
  });
  await writeJson(path.join(clubsDir, 'schemas/UnusedClub.json'), {
    UnusedClub: { type: 'object' },
  });

  const firstResult = runBundle(fixture.scriptFile, fixture.projectRoot);
  assert.equal(
    firstResult.status,
    0,
    `${firstResult.stdout}\n${firstResult.stderr}`,
  );
  const firstClubs = await readFile(
    path.join(fixture.generatedSpecsDir, 'clubs.json'),
    'utf8',
  );
  const firstShared = await readFile(
    path.join(fixture.generatedSpecsDir, 'shared.json'),
    'utf8',
  );
  await writeJson(path.join(fixture.generatedSpecsDir, 'stale.json'), {
    stale: true,
  });

  const secondResult = runBundle(fixture.scriptFile, fixture.projectRoot);
  assert.equal(
    secondResult.status,
    0,
    `${secondResult.stdout}\n${secondResult.stderr}`,
  );
  assert.equal(
    await readFile(path.join(fixture.generatedSpecsDir, 'clubs.json'), 'utf8'),
    firstClubs,
  );
  assert.equal(
    await readFile(path.join(fixture.generatedSpecsDir, 'shared.json'), 'utf8'),
    firstShared,
  );

  const generatedFiles = (await readdir(fixture.generatedSpecsDir)).sort(
    (a, b) => a.localeCompare(b),
  );
  assert.deepEqual(generatedFiles, ['clubs.json', 'shared.json']);
  assert.equal(existsSync(path.join(fixture.specsDir, 'clubs.json')), false);

  const clubs = JSON.parse(firstClubs);
  assert.deepEqual(Object.keys(clubs.paths), [
    '/api/v2/clubs/{clubId}',
    '/api/v2/clubs',
  ]);
  assert.deepEqual(clubs.tags, [{ name: 'clubs' }]);
  assert.deepEqual(
    Object.keys(clubs.components.schemas).sort((a, b) => a.localeCompare(b)),
    [
      'ClubInternalListResponse',
      'ClubInternalResponse',
      'FormatEnum',
      'SharedEnvelope',
      'SharedId',
      'TraceId',
    ],
  );
  assert.equal(Object.hasOwn(clubs.components.schemas, 'UnusedClub'), false);

  const shared = JSON.parse(firstShared);
  assert.deepEqual(Object.keys(shared.components.schemas), [
    'FormatEnum',
    'SharedEnvelope',
    'SharedId',
    'TraceId',
    'UnusedShared',
  ]);
  assert.deepEqual(shared.components.schemas.FormatEnum.enum, [
    'SIX_VS_SIX',
    'FOUR_VS_FOUR',
  ]);
});

test('fixture bundling fails on a missing transitive schema', async (t) => {
  const fixture = await createFixtureProject(t);

  await writeJson(path.join(fixture.sourceDir, 'shared/base.json'), {
    openapi: '3.1.0',
    info: { title: 'Blockout Shared API', version: '2.0.0' },
    paths: {},
  });
  await mkdir(path.join(fixture.sourceDir, 'shared/schemas'), {
    recursive: true,
  });

  const clubsDir = path.join(fixture.sourceDir, 'services/clubs');
  await writeJson(path.join(clubsDir, 'base.json'), {
    openapi: '3.1.0',
    info: { title: 'Blockout Clubs Internal API', version: '2.0.0' },
  });
  await writeJson(path.join(clubsDir, 'paths/clubs.json'), {
    '/api/v2/clubs': {
      get: {
        operationId: 'listClubs',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ClubInternalListResponse',
                },
              },
            },
          },
        },
      },
    },
  });
  await writeJson(
    path.join(clubsDir, 'schemas/ClubInternalListResponse.json'),
    {
      ClubInternalListResponse: {
        type: 'object',
        properties: {
          items: { $ref: '#/components/schemas/MissingClubResponse' },
        },
      },
    },
  );

  const result = runBundle(fixture.scriptFile, fixture.projectRoot);
  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /Missing schema "MissingClubResponse"/);
  assert.equal(
    existsSync(path.join(fixture.generatedSpecsDir, 'clubs.json')),
    false,
  );
});
