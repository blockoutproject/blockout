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
const sharedSchemasDir = path.join(sourceDir, 'shared/schemas');
const expectedSharedEnums = {
  ConsumedEventClaimEnum: ['CLAIMED', 'DUPLICATE'],
  ConsumedEventResultEnum: ['APPLIED', 'DUPLICATE'],
  DevicePlatformEnum: ['IOS', 'ANDROID', 'WEB', 'UNKNOWN'],
  EntityEventActionEnum: ['CREATED', 'DELETED'],
  EntityTypeEnum: ['TEAM', 'POOL'],
  FavoriteEventActionEnum: ['FOLLOWED', 'UNFOLLOWED'],
  FollowerCountDeltaEnum: ['INCREMENT', 'DECREMENT'],
  FollowerProjectionActionEnum: ['FOLLOW', 'UNFOLLOW'],
  FollowerProjectionMutationEnum: ['APPLIED', 'UNCHANGED'],
  FormatEnum: ['SIX', 'FOUR', 'TWO'],
  GenderEnum: ['M', 'F', 'O'],
  ImageChangeModeEnum: ['KEEP', 'REMOVE', 'REPLACE'],
  LiveLinkStatusEnum: [
    'ACTIVE',
    'DEACTIVATED',
    'BANNED',
    'EXPIRED',
    'PENDING',
    'REJECTED',
  ],
  LiveProviderEnum: ['YOUTUBE', 'TWITCH', 'FACEBOOK'],
  MatchLiveLinkDecisionEnum: ['APPROVE', 'REJECT', 'REACTIVATE'],
  MatchStatusEnum: ['UPCOMING', 'FINISHED'],
  NotificationStatusEnum: [
    'SENT',
    'PENDING',
    'DELIVERED',
    'FAILED',
    'SENT_NO_TOKEN',
  ],
  NotificationTargetTypeEnum: ['MATCH', 'GENERIC'],
  NotificationTypeEnum: [
    'MATCH_FINISHED',
    'MATCH_LIVE_LINK_CREATED',
    'GENERIC',
  ],
  ReportTypeEnum: ['DISPLAY_BUG', 'DATA_ERROR', 'LOGO', 'LIVE', 'OTHER'],
  ScraperNameEnum: ['SCRAPER', 'SCRAPER_CLUBS'],
};

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

function findForbiddenContractSyntax(value, pointer = '') {
  if (!value || typeof value !== 'object') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenContractSyntax(item, `${pointer}/${index}`),
    );
  }

  const forbiddenKeys = new Set([
    'x-java-type',
    'x-required-scope',
    'x-required-scopes',
    'x-required-scopes-by-entity-type',
  ]);

  return Object.entries(value).flatMap(([key, child]) => {
    const childPointer = `${pointer}/${key}`;
    const current =
      forbiddenKeys.has(key) ||
      (key === '$ref' && child === '#/components/schemas/NumericIdentifier')
        ? [childPointer]
        : [];
    return [...current, ...findForbiddenContractSyntax(child, childPointer)];
  });
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
    assert.equal(
      Object.hasOwn(bundle.components.schemas, 'NumericIdentifier'),
      false,
    );
    assert.deepEqual(findForbiddenContractSyntax(bundle), []);

    if (bundleFile !== 'shared.json') {
      assert.deepEqual(bundle.components.securitySchemes?.bearerAuth, {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });
      assert.equal(bundle.components.parameters?.Page?.name, 'page');
      assert.equal(bundle.components.parameters?.PageSize?.name, 'pageSize');
      assert.equal(
        bundle.components.responses?.BadRequestProblem?.content?.[
          'application/problem+json'
        ]?.schema?.$ref,
        '#/components/schemas/ProblemDetail',
      );
      assert.equal(typeof bundle.components.schemas.ProblemDetail, 'object');
    }
  }
});

test('workspace config contract reconciles the sixteen audited operations', async () => {
  const config = await readJson(path.join(generatedSpecsDir, 'config.json'));
  const operations = Object.entries(config.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  const expectedOperations = {
    'DELETE /api/v2/config/divisions/{id}': 'deactivateDivision',
    'GET /api/v2/config/app-status': 'getAppStatus',
    'GET /api/v2/config/divisions': 'listDivisions',
    'GET /api/v2/config/divisions/{id}': 'getDivision',
    'GET /api/v2/config/legal/{type}': 'getLegalDocument',
    'GET /api/v2/config/raw-divisions': 'listRawDivisionMappings',
    'GET /api/v2/config/raw-divisions/{id}': 'getRawDivisionMapping',
    'GET /api/v2/config/scrapers/status': 'listScraperStatuses',
    'GET /api/v2/config/scrapers/{name}/status': 'getScraperStatus',
    'POST /api/v2/config/divisions': 'createDivision',
    'POST /api/v2/config/raw-divisions': 'createRawDivisionMapping',
    'PUT /api/v2/config/app-status': 'updateAppStatus',
    'PUT /api/v2/config/divisions/{id}': 'updateDivision',
    'PUT /api/v2/config/legal/{type}': 'updateLegalDocument',
    'PUT /api/v2/config/raw-divisions/{id}': 'updateRawDivisionMapping',
    'PUT /api/v2/config/scrapers/{name}/enabled': 'updateScraperEnabled',
  };

  assert.deepEqual(
    Object.fromEntries(
      operations
        .map(({ key, operation }) => [key, operation.operationId])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    expectedOperations,
  );
  assert.equal(
    new Set(operations.map(({ operation }) => operation.operationId)).size,
    16,
  );

  assert.deepEqual(
    config.paths['/api/v2/config/legal/{type}'].get.security,
    [],
  );
  assert.deepEqual(config.security, [{ bearerAuth: [] }]);

  const expectedResponseFields = {
    AppStatusInternalResponse: [
      'forceUpdateMessage',
      'imageUrl',
      'lastUpdate',
      'maintenance',
      'message',
      'minVersionAndroid',
      'minVersionIos',
      'storeUrlAndroid',
      'storeUrlIos',
    ],
    DivisionInternalResponse: [
      'active',
      'firstGradientColor',
      'id',
      'logoUrl',
      'mainColor',
      'name',
      'secondGradientColor',
      'thirdGradientColor',
    ],
    LegalDocumentInternalResponse: ['content', 'title', 'type', 'version'],
    RawDivisionMappingInternalResponse: [
      'divisionId',
      'format',
      'gender',
      'id',
      'leagueCode',
      'rawDivisionName',
      'season',
    ],
    ScraperStatusInternalResponse: ['enabled', 'name'],
  };
  for (const [schemaName, expectedFields] of Object.entries(
    expectedResponseFields,
  )) {
    assert.deepEqual(
      Object.keys(config.components.schemas[schemaName].properties).sort(
        (left, right) => left.localeCompare(right),
      ),
      expectedFields,
    );
  }

  for (const schemaName of [
    'DivisionInternalListResponse',
    'RawDivisionMappingInternalListResponse',
    'ScraperStatusInternalListResponse',
  ]) {
    assert.deepEqual(
      Object.keys(config.components.schemas[schemaName].properties),
      ['items'],
    );
    assert.deepEqual(config.components.schemas[schemaName].required, ['items']);
  }

  const createDivisionMultipart =
    config.paths['/api/v2/config/divisions'].post.requestBody.content[
      'multipart/form-data'
    ];
  assert.equal(
    createDivisionMultipart.schema.properties.data.$ref,
    '#/components/schemas/CreateDivisionInternalRequest',
  );
  assert.equal(
    createDivisionMultipart.encoding.data.contentType,
    'application/json',
  );
  assert.equal(
    createDivisionMultipart.schema.properties.image.format,
    'binary',
  );

  assert.deepEqual(
    Object.keys(
      config.paths['/api/v2/config/legal/{type}'].get.responses,
    ).sort(),
    ['200', '500'],
  );
});

test('workspace clubs contract reconciles the six audited operations', async () => {
  const clubs = await readJson(path.join(generatedSpecsDir, 'clubs.json'));
  const operations = Object.entries(clubs.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  const expectedOperations = {
    'DELETE /api/v2/clubs/{id}': 'deactivateClub',
    'GET /api/v2/clubs': 'listClubs',
    'GET /api/v2/clubs/{id}': 'getClub',
    'GET /api/v2/clubs/{id}/logo': 'getClubLogo',
    'POST /api/v2/clubs': 'createClub',
    'PUT /api/v2/clubs/{id}': 'updateClub',
  };

  assert.deepEqual(
    Object.fromEntries(
      operations
        .map(({ key, operation }) => [key, operation.operationId])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    expectedOperations,
  );
  assert.equal(
    new Set(operations.map(({ operation }) => operation.operationId)).size,
    6,
  );

  assert.deepEqual(clubs.security, [{ bearerAuth: [] }]);

  assert.deepEqual(
    Object.keys(clubs.components.schemas.ClubInternalResponse.properties).sort(
      (left, right) => left.localeCompare(right),
    ),
    [
      'active',
      'address',
      'city',
      'email',
      'id',
      'latitude',
      'logoUrl',
      'longitude',
      'name',
      'phoneNumber',
      'postalCode',
      'rawName',
      'website',
    ],
  );
  assert.deepEqual(
    Object.keys(clubs.components.schemas.ClubInternalPageResponse.properties),
    ['items', 'pageInfo'],
  );

  const createFields = Object.keys(
    clubs.components.schemas.CreateClubInternalRequest.properties,
  ).sort((left, right) => left.localeCompare(right));
  assert.deepEqual(createFields, [
    'city',
    'email',
    'id',
    'name',
    'phoneNumber',
    'postalCode',
    'rawName',
    'website',
  ]);
  assert.deepEqual(
    clubs.components.schemas.CreateClubInternalRequest.required,
    ['id', 'rawName', 'name'],
  );

  const updateSchema = clubs.components.schemas.UpdateClubInternalRequest;
  assert.deepEqual(
    Object.keys(updateSchema.properties).sort((left, right) =>
      left.localeCompare(right),
    ),
    [
      'address',
      'city',
      'email',
      'name',
      'phoneNumber',
      'postalCode',
      'rawName',
      'removeLogo',
      'website',
    ],
  );
  assert.deepEqual(updateSchema.required, ['removeLogo']);

  const listParameters = clubs.paths['/api/v2/clubs'].get.parameters.map(
    (parameter) => parameter.$ref,
  );
  assert.deepEqual(listParameters, [
    '#/components/parameters/ClubIds',
    '#/components/parameters/ClubActive',
    '#/components/parameters/Page',
    '#/components/parameters/PageSize',
  ]);
  assert.equal(clubs.components.parameters.ClubIds.explode, true);

  for (const [method, expectedSchema] of [
    ['post', 'CreateClubInternalRequest'],
    ['put', 'UpdateClubInternalRequest'],
  ]) {
    const operationPath =
      method === 'post' ? '/api/v2/clubs' : '/api/v2/clubs/{id}';
    const multipart =
      clubs.paths[operationPath][method].requestBody.content[
        'multipart/form-data'
      ];
    assert.equal(
      multipart.schema.properties.data.$ref,
      `#/components/schemas/${expectedSchema}`,
    );
    assert.equal(multipart.encoding.data.contentType, 'application/json');
    assert.equal(multipart.schema.properties.image.format, 'binary');
  }

  const logoResponses = clubs.paths['/api/v2/clubs/{id}/logo'].get.responses;
  assert.deepEqual(Object.keys(logoResponses).sort(), [
    '200',
    '204',
    '401',
    '404',
    '500',
  ]);
  assert.equal(
    logoResponses['200'].content['text/plain'].schema.type,
    'string',
  );
});

test('workspace teams contract reconciles the eight audited operations', async () => {
  const teams = await readJson(path.join(generatedSpecsDir, 'teams.json'));
  const operations = Object.entries(teams.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  const expectedOperations = {
    'DELETE /api/v2/teams/{id}': 'deactivateTeam',
    'GET /api/v2/teams': 'listTeams',
    'GET /api/v2/teams/club-ids': 'listTeamClubIds',
    'GET /api/v2/teams/{id}': 'getTeam',
    'POST /api/v2/teams': 'createTeam',
    'POST /api/v2/teams/{teamId}/followers/decrement': 'decrementTeamFollowers',
    'POST /api/v2/teams/{teamId}/followers/increment': 'incrementTeamFollowers',
    'PUT /api/v2/teams/{id}': 'updateTeam',
  };

  assert.deepEqual(
    Object.fromEntries(
      operations
        .map(({ key, operation }) => [key, operation.operationId])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    expectedOperations,
  );
  assert.equal(
    new Set(operations.map(({ operation }) => operation.operationId)).size,
    8,
  );

  assert.deepEqual(teams.security, [{ bearerAuth: [] }]);

  assert.deepEqual(
    Object.keys(teams.components.schemas.TeamInternalResponse.properties).sort(
      (left, right) => left.localeCompare(right),
    ),
    [
      'active',
      'clubId',
      'divisionId',
      'followersCount',
      'format',
      'gender',
      'id',
      'leagueCode',
      'logoUrl',
      'name',
      'rawName',
      'season',
      'shortName',
    ],
  );

  const createSchema = teams.components.schemas.CreateTeamInternalRequest;
  assert.deepEqual(
    Object.keys(createSchema.properties).sort((left, right) =>
      left.localeCompare(right),
    ),
    [
      'clubId',
      'divisionId',
      'format',
      'gender',
      'leagueCode',
      'name',
      'rawName',
      'season',
      'shortName',
    ],
  );
  assert.deepEqual(createSchema.required, [
    'clubId',
    'rawName',
    'name',
    'shortName',
    'leagueCode',
    'divisionId',
    'season',
    'format',
    'gender',
  ]);

  const updateSchema = teams.components.schemas.UpdateTeamInternalRequest;
  assert.deepEqual(
    Object.keys(updateSchema.properties).sort((left, right) =>
      left.localeCompare(right),
    ),
    [
      'active',
      'clubId',
      'divisionId',
      'format',
      'gender',
      'leagueCode',
      'name',
      'rawName',
      'removeLogo',
      'season',
      'shortName',
    ],
  );
  assert.deepEqual(updateSchema.required, ['removeLogo']);

  for (const schemaName of [
    'TeamInternalPageResponse',
    'TeamClubIdPageResponse',
  ]) {
    assert.deepEqual(
      Object.keys(teams.components.schemas[schemaName].properties),
      ['items', 'pageInfo'],
    );
  }

  assert.deepEqual(
    teams.paths['/api/v2/teams'].get.parameters.map(
      (parameter) => parameter.$ref,
    ),
    [
      '#/components/parameters/DivisionId',
      '#/components/parameters/TeamFormat',
      '#/components/parameters/TeamGender',
      '#/components/parameters/TeamSeason',
      '#/components/parameters/TeamClubId',
      '#/components/parameters/TeamIds',
      '#/components/parameters/TeamActive',
      '#/components/parameters/Page',
      '#/components/parameters/PageSize',
    ],
  );
  assert.equal(teams.components.parameters.TeamIds.explode, true);

  const updateMultipart =
    teams.paths['/api/v2/teams/{id}'].put.requestBody.content[
      'multipart/form-data'
    ];
  assert.equal(
    updateMultipart.schema.properties.data.$ref,
    '#/components/schemas/UpdateTeamInternalRequest',
  );
  assert.equal(updateMultipart.encoding.data.contentType, 'application/json');
  assert.equal(updateMultipart.schema.properties.image.format, 'binary');

  for (const action of ['increment', 'decrement']) {
    const followerOperation =
      teams.paths[`/api/v2/teams/{teamId}/followers/${action}`].post;
    assert.deepEqual(Object.keys(followerOperation.responses).sort(), [
      '204',
      '401',
      '403',
      '404',
      '500',
    ]);
  }
  assert.equal(teams.components.parameters.FollowerUserId.name, 'userId');
  assert.equal(teams.components.parameters.FollowerUserId.required, true);
});

test('workspace pools contract reconciles the seven audited operations', async () => {
  const pools = await readJson(path.join(generatedSpecsDir, 'pools.json'));
  const operations = Object.entries(pools.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  const expectedOperations = {
    'DELETE /api/v2/pools/{id}': 'deactivatePool',
    'GET /api/v2/pools': 'listPools',
    'GET /api/v2/pools/{id}': 'getPool',
    'POST /api/v2/pools': 'createPool',
    'POST /api/v2/pools/{poolId}/followers/decrement': 'decrementPoolFollowers',
    'POST /api/v2/pools/{poolId}/followers/increment': 'incrementPoolFollowers',
    'PUT /api/v2/pools/{id}': 'updatePool',
  };

  assert.deepEqual(
    Object.fromEntries(
      operations
        .map(({ key, operation }) => [key, operation.operationId])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    expectedOperations,
  );
  assert.equal(
    new Set(operations.map(({ operation }) => operation.operationId)).size,
    7,
  );

  assert.deepEqual(pools.security, [{ bearerAuth: [] }]);

  assert.deepEqual(
    Object.keys(pools.components.schemas.PoolInternalResponse.properties).sort(
      (left, right) => left.localeCompare(right),
    ),
    [
      'active',
      'divisionId',
      'followersCount',
      'format',
      'gender',
      'id',
      'leagueCode',
      'leagueName',
      'name',
      'poolCode',
      'rawName',
      'season',
      'shortName',
    ],
  );

  const createSchema = pools.components.schemas.CreatePoolInternalRequest;
  assert.deepEqual(
    Object.keys(createSchema.properties).sort((left, right) =>
      left.localeCompare(right),
    ),
    [
      'divisionId',
      'format',
      'gender',
      'leagueCode',
      'leagueName',
      'name',
      'poolCode',
      'rawName',
      'season',
      'shortName',
    ],
  );
  assert.deepEqual(createSchema.required, [
    'poolCode',
    'leagueCode',
    'season',
    'leagueName',
    'rawName',
    'name',
    'shortName',
    'divisionId',
    'format',
    'gender',
  ]);

  const updateSchema = pools.components.schemas.UpdatePoolInternalRequest;
  assert.deepEqual(
    Object.keys(updateSchema.properties).sort((left, right) =>
      left.localeCompare(right),
    ),
    [
      'active',
      'divisionId',
      'format',
      'gender',
      'leagueCode',
      'leagueName',
      'name',
      'poolCode',
      'rawName',
      'season',
      'shortName',
    ],
  );
  assert.deepEqual(updateSchema.required, undefined);
  assert.equal(updateSchema.properties.active.nullable, true);

  assert.deepEqual(
    Object.keys(pools.components.schemas.PoolInternalPageResponse.properties),
    ['items', 'pageInfo'],
  );
  assert.deepEqual(
    pools.paths['/api/v2/pools'].get.parameters.map(
      (parameter) => parameter.$ref,
    ),
    [
      '#/components/parameters/PoolLeagueCode',
      '#/components/parameters/PoolSeason',
      '#/components/parameters/PoolActive',
      '#/components/parameters/PoolIds',
      '#/components/parameters/Page',
      '#/components/parameters/PageSize',
    ],
  );
  assert.equal(pools.components.parameters.PoolIds.explode, true);

  for (const action of ['increment', 'decrement']) {
    const followerOperation =
      pools.paths[`/api/v2/pools/{poolId}/followers/${action}`].post;
    assert.deepEqual(Object.keys(followerOperation.responses).sort(), [
      '204',
      '401',
      '403',
      '404',
      '500',
    ]);
  }
  assert.equal(pools.components.parameters.FollowerUserId.name, 'userId');
  assert.equal(pools.components.parameters.FollowerUserId.required, true);
});

test('workspace competition contract reconciles the eight audited operations', async () => {
  const competition = await readJson(
    path.join(generatedSpecsDir, 'competition.json'),
  );
  const operations = Object.entries(competition.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  assert.deepEqual(
    Object.fromEntries(
      operations
        .map(({ key, operation }) => [key, operation.operationId])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    {
      'GET /api/v2/competitions/pools/{poolId}/teams':
        'listCompetitionAssociationsByPool',
      'GET /api/v2/competitions/teams/{teamId}/pools':
        'listCompetitionAssociationsByTeam',
      'GET /api/v2/competitions/teams/{teamId}/pools-with-ranking':
        'listPoolRankingsByTeam',
      'POST /api/v2/competitions/pools/{poolId}/teams/{teamId}':
        'addOrReactivateCompetitionAssociation',
      'PUT /api/v2/competitions/clubs/bulk-deactivate':
        'bulkDeactivateCompetitionClubs',
      'PUT /api/v2/competitions/pools/bulk-deactivate':
        'bulkDeactivateCompetitionPools',
      'PUT /api/v2/competitions/pools/{poolId}/teams/bulk-deactivate':
        'bulkDeactivateCompetitionTeamsByPool',
      'PUT /api/v2/competitions/pools/{poolId}/teams/{teamId}/stats':
        'replaceCompetitionStatistics',
    },
  );
  assert.equal(
    new Set(operations.map(({ operation }) => operation.operationId)).size,
    8,
  );
  assert.deepEqual(competition.security, [{ bearerAuth: [] }]);

  const addOperation =
    competition.paths['/api/v2/competitions/pools/{poolId}/teams/{teamId}']
      .post;
  assert.equal(
    addOperation.parameters[0].$ref,
    '#/components/parameters/AssociationClubId',
  );
  assert.equal(
    competition.components.parameters.AssociationClubId.name,
    'clubId',
  );

  const associationFields = Object.keys(
    competition.components.schemas.CompetitionAssociationInternalResponse
      .properties,
  ).sort((left, right) => left.localeCompare(right));
  assert.deepEqual(associationFields, [
    'active',
    'clubId',
    'coefPoints',
    'coefSets',
    'losses',
    'lossesOneToThree',
    'lossesTwoToThree',
    'lossesZeroToThree',
    'lostPoints',
    'lostSets',
    'played',
    'points',
    'pointsPenalty',
    'poolId',
    'teamId',
    'wins',
    'winsThreeToOne',
    'winsThreeToTwo',
    'winsThreeToZero',
    'wonPoints',
    'wonSets',
  ]);

  const statistics =
    competition.components.schemas.CompetitionStatisticsSnapshotInternalRequest;
  assert.equal(Object.keys(statistics.properties).length, 17);
  assert.equal(statistics.required.length, 17);
  assert.deepEqual(
    [...statistics.required].sort((left, right) => left.localeCompare(right)),
    Object.keys(statistics.properties).sort((left, right) =>
      left.localeCompare(right),
    ),
  );

  for (const [operationPath, schemaName] of [
    [
      '/api/v2/competitions/pools/{poolId}/teams/bulk-deactivate',
      'MissingTeamIdsInternalRequest',
    ],
    [
      '/api/v2/competitions/pools/bulk-deactivate',
      'MissingPoolIdsInternalRequest',
    ],
    [
      '/api/v2/competitions/clubs/bulk-deactivate',
      'MissingClubIdsInternalRequest',
    ],
  ]) {
    const operation = competition.paths[operationPath].put;
    assert.equal(
      operation.requestBody.content['application/json'].schema.$ref,
      `#/components/schemas/${schemaName}`,
    );
    assert.deepEqual(Object.keys(operation.responses).sort(), [
      '204',
      '400',
      '401',
      '403',
      '500',
    ]);
  }

  for (const operationPath of [
    '/api/v2/competitions/pools/{poolId}/teams',
    '/api/v2/competitions/teams/{teamId}/pools',
    '/api/v2/competitions/teams/{teamId}/pools-with-ranking',
  ]) {
    assert.deepEqual(
      competition.paths[operationPath].get.parameters.map(
        (parameter) => parameter.$ref,
      ),
      ['#/components/parameters/Page', '#/components/parameters/PageSize'],
    );
  }

  assert.deepEqual(
    Object.keys(
      competition.components.schemas.TeamRankingInternalResponse.properties,
    ).sort((left, right) => left.localeCompare(right)),
    [
      'coefPoints',
      'coefSets',
      'losses',
      'played',
      'points',
      'pointsPenalty',
      'teamId',
      'wins',
    ],
  );
  assert.match(
    competition.components.schemas.PoolRankingInternalResponse.description,
    /points descending.*pointsPenalty ascending.*teamId ascending/,
  );
});

test('workspace matches contract reconciles the sixteen audited operations', async () => {
  const matches = await readJson(path.join(generatedSpecsDir, 'matches.json'));
  const operations = Object.entries(matches.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  assert.deepEqual(
    Object.fromEntries(
      operations
        .map(({ key, operation }) => [key, operation.operationId])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    {
      'DELETE /api/v2/matches/{matchId}/live-link': 'deleteMatchLiveLink',
      'GET /api/v2/matches': 'listMatches',
      'GET /api/v2/matches/day-groups': 'listMatchDayGroups',
      'GET /api/v2/matches/live-moderation': 'listMatchesForLiveModeration',
      'GET /api/v2/matches/{id}': 'getMatch',
      'GET /api/v2/matches/{matchId}/live-links': 'listMatchLiveLinkHistory',
      'POST /api/v2/matches': 'createMatch',
      'POST /api/v2/matches/internal/test/emit-finished':
        'emitCustomMatchFinishedTestEvent',
      'POST /api/v2/matches/internal/test/{id}/emit-finished':
        'emitPersistedMatchFinishedTestEvent',
      'POST /api/v2/matches/live-links/{liveLinkId}/approve':
        'approveMatchLiveLink',
      'POST /api/v2/matches/live-links/{liveLinkId}/reactivate':
        'reactivateMatchLiveLink',
      'POST /api/v2/matches/live-links/{liveLinkId}/reject':
        'rejectMatchLiveLink',
      'POST /api/v2/matches/{matchId}/live-link': 'upsertMatchLiveLink',
      'POST /api/v2/matches/{matchId}/live-link/report': 'reportMatchLiveLink',
      'PUT /api/v2/matches/pools/{poolId}/bulk-deactivate':
        'bulkDeactivateMatchesByPool',
      'PUT /api/v2/matches/{id}': 'updateMatch',
    },
  );
  assert.equal(
    new Set(operations.map(({ operation }) => operation.operationId)).size,
    16,
  );
  assert.deepEqual(matches.security, [{ bearerAuth: [] }]);

  assert.deepEqual(
    Object.keys(
      matches.components.schemas.MatchInternalResponse.properties,
    ).sort((left, right) => left.localeCompare(right)),
    [
      'active',
      'firstReferee',
      'id',
      'leagueCode',
      'liveCode',
      'matchCode',
      'matchDate',
      'poolId',
      'score',
      'season',
      'secondReferee',
      'set',
      'status',
      'teamIdA',
      'teamIdB',
      'venue',
    ],
  );
  for (const schemaName of [
    'CreateMatchInternalRequest',
    'UpdateMatchInternalRequest',
  ]) {
    const schema = matches.components.schemas[schemaName];
    assert.equal(Object.keys(schema.properties).length, 13);
    assert.deepEqual(schema.required, [
      'matchCode',
      'leagueCode',
      'poolId',
      'teamIdA',
      'teamIdB',
      'matchDate',
      'season',
    ]);
    assert.equal(schema.properties.status, undefined);
    assert.equal(schema.properties.active, undefined);
  }
  assert.equal(
    Object.keys(
      matches.components.schemas.MatchDetailInternalResponse.properties,
    ).length,
    18,
  );

  assert.deepEqual(
    matches.paths['/api/v2/matches/day-groups'].get.parameters.map(
      (parameter) => parameter.$ref,
    ),
    [
      '#/components/parameters/Page',
      '#/components/parameters/DayPageSize',
      '#/components/parameters/MatchPoolIds',
      '#/components/parameters/MatchTeamIds',
      '#/components/parameters/MatchStatus',
      '#/components/parameters/MatchActive',
    ],
  );
  assert.deepEqual(
    Object.keys(matches.components.schemas.MatchDayPageResponse.properties),
    ['dayMatches', 'hasNext', 'nextPage'],
  );
  assert.equal(
    matches.paths['/api/v2/matches/pools/{poolId}/bulk-deactivate'].put
      .responses['204'].description,
    'Lifecycle command completed.',
  );

  for (const schemaName of [
    'MatchInternalPageResponse',
    'MatchLiveModerationPageResponse',
    'MatchLiveLinkHistoryPageResponse',
  ]) {
    assert.deepEqual(
      Object.keys(matches.components.schemas[schemaName].properties),
      ['items', 'pageInfo'],
    );
  }
  assert.deepEqual(
    Object.keys(matches.components.schemas.MatchLiveLinkResult.properties),
    ['matchId', 'provider', 'url', 'status'],
  );
  assert.equal(
    matches.components.schemas.MatchLiveLinkHistoryItem.properties.matchId,
    undefined,
  );
  assert.equal(
    matches.components.schemas.ReportMatchLiveLinkInternalRequest.properties
      .reason.minLength,
    10,
  );
  assert.equal(
    matches.components.schemas.ReportMatchLiveLinkInternalRequest.properties
      .reason.maxLength,
    500,
  );
  assert.match(
    matches.paths['/api/v2/matches/live-moderation'].get.description,
    /no unimplemented time window/,
  );
  assert.match(
    matches.components.schemas.EmitFinishedTestInternalRequest.description,
    /AsyncAPI/,
  );
});

test('workspace users contract reconciles the nine audited operations', async () => {
  const users = await readJson(path.join(generatedSpecsDir, 'users.json'));
  const operations = Object.entries(users.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  assert.deepEqual(
    Object.fromEntries(
      operations
        .map(({ key, operation }) => [key, operation.operationId])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    {
      'DELETE /api/v2/users/favorites/follow': 'unfollowEntity',
      'DELETE /api/v2/users/me': 'deleteCurrentUser',
      'GET /api/v2/users/me': 'getCurrentUser',
      'GET /api/v2/users/{auth0Id}': 'getUserByAuth0Id',
      'GET /api/v2/users/{userId}/favorites': 'listUserFavorites',
      'POST /api/v2/users/favorites/follow': 'followEntity',
      'POST /api/v2/users/internal/{auth0Id}/assign-default-role':
        'assignDefaultUserRole',
      'PUT /api/v2/users/me': 'ensureCurrentUser',
      'PUT /api/v2/users/{auth0Id}': 'updateUserByAuth0Id',
    },
  );
  assert.equal(
    new Set(operations.map(({ operation }) => operation.operationId)).size,
    9,
  );
  assert.deepEqual(users.security, [{ bearerAuth: [] }]);
  assert.deepEqual(
    users.paths['/api/v2/users/internal/{auth0Id}/assign-default-role'].post
      .security,
    [{ internalApiKey: [] }],
  );
  assert.equal(
    users.components.securitySchemes.internalApiKey.name,
    'X-API-KEY',
  );

  const account = users.components.schemas.UserAccountInternalResponse;
  assert.deepEqual(Object.keys(account.properties), [
    'id',
    'auth0Id',
    'email',
    'pseudo',
    'pictureUrl',
    'createdAt',
    'favorites',
  ]);
  assert.deepEqual(account.properties.id, {
    type: 'integer',
    format: 'int64',
    minimum: 1,
  });
  for (const removedField of [
    'firstName',
    'lastName',
    'phoneNumber',
    'active',
    'lastUpdate',
  ]) {
    assert.equal(account.properties[removedField], undefined);
  }

  const profileRequest =
    users.components.schemas.UpdateUserProfileInternalRequest;
  assert.deepEqual(Object.keys(profileRequest.properties), [
    'pseudo',
    'removePicture',
  ]);
  assert.deepEqual(profileRequest.required, ['removePicture']);
  assert.equal(profileRequest.properties.pictureUrl, undefined);
  const updateMultipart =
    users.paths['/api/v2/users/{auth0Id}'].put.requestBody.content[
      'multipart/form-data'
    ];
  assert.deepEqual(Object.keys(updateMultipart.schema.properties), [
    'data',
    'image',
  ]);
  assert.equal(updateMultipart.encoding.data.contentType, 'application/json');

  assert.deepEqual(
    Object.keys(users.components.schemas.UserFavoriteSummary.properties),
    ['entityType', 'entityId'],
  );
  assert.deepEqual(
    Object.keys(users.components.schemas.UserFavoritePageResponse.properties),
    ['items', 'pageInfo'],
  );
  assert.deepEqual(users.components.parameters.UserId.schema, {
    type: 'integer',
    format: 'int64',
    minimum: 1,
  });
  assert.deepEqual(
    users.paths['/api/v2/users/{userId}/favorites'].get.parameters.map(
      (parameter) => parameter.$ref,
    ),
    [
      '#/components/parameters/FavoriteEntityType',
      '#/components/parameters/Page',
      '#/components/parameters/PageSize',
    ],
  );
  assert.equal(
    users.paths['/api/v2/users/favorites/follow'].post.responses['204']
      .description,
    'Favorite present or already present.',
  );
  assert.equal(
    users.paths['/api/v2/users/favorites/follow'].delete.responses['204']
      .description,
    'Favorite absent or removed.',
  );
  assert.match(
    users.paths['/api/v2/users/{auth0Id}'].put.description,
    /without adding a path-subject comparison/,
  );
  assert.match(
    users.paths['/api/v2/users/me'].delete.description,
    /Auth0-first/,
  );
});

test('workspace reports contract separates Blockout and vendor roles', async () => {
  const reports = await readJson(path.join(generatedSpecsDir, 'reports.json'));
  const operations = Object.entries(reports.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  assert.deepEqual(
    Object.fromEntries(
      operations.map(({ key, operation }) => [key, operation.operationId]),
    ),
    { 'POST /api/v2/reports': 'createReport' },
  );
  assert.deepEqual(reports.security, [{ bearerAuth: [] }]);

  const command = reports.components.schemas.CreateReportInternalRequest;
  assert.deepEqual(Object.keys(command.properties), [
    'type',
    'title',
    'description',
    'appVersion',
    'userId',
    'userName',
    'screen',
    'deviceModel',
    'os',
  ]);
  assert.deepEqual(command.required, [
    'type',
    'title',
    'description',
    'userName',
    'screen',
    'os',
  ]);
  assert.equal(command.properties.attachmentImageUrls, undefined);
  assert.equal(
    command.properties.type.$ref,
    '#/components/schemas/ReportTypeEnum',
  );
  assert.deepEqual(command.properties.userId, {
    type: 'integer',
    format: 'int64',
    minimum: 1,
    nullable: true,
  });

  const multipart =
    reports.paths['/api/v2/reports'].post.requestBody.content[
      'multipart/form-data'
    ];
  assert.deepEqual(Object.keys(multipart.schema.properties), [
    'data',
    'images',
  ]);
  assert.equal(multipart.encoding.data.contentType, 'application/json');
  assert.deepEqual(multipart.schema.properties.images.items, {
    type: 'string',
    format: 'binary',
  });

  const result = reports.components.schemas.ReportCreatedInternalResponse;
  assert.deepEqual(Object.keys(result.properties), [
    'number',
    'htmlUrl',
    'title',
  ]);
  assert.equal(result.properties.id, undefined);
  assert.equal(result.properties.state, undefined);
  assert.deepEqual(result.required, ['number', 'htmlUrl', 'title']);
  assert.deepEqual(
    Object.keys(reports.components.schemas).filter((name) =>
      /GitHub|Discord|S3/.test(name),
    ),
    [],
  );
  assert.deepEqual(
    Object.keys(reports.paths['/api/v2/reports'].post.responses),
    ['201', '400', '401', '403', '413', '500'],
  );
  assert.match(
    reports.paths['/api/v2/reports'].post.description,
    /best-effort Discord notification.*partial-success/,
  );
});

test('workspace notification contract reconciles REST without event or provider leakage', async () => {
  const notification = await readJson(
    path.join(generatedSpecsDir, 'notification.json'),
  );
  const operations = Object.entries(notification.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  assert.deepEqual(
    Object.fromEntries(
      operations
        .map(({ key, operation }) => [key, operation.operationId])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    {
      'DELETE /api/v2/notifications/{id}': 'deleteCurrentUserNotification',
      'GET /api/v2/notifications': 'listCurrentUserNotifications',
      'GET /api/v2/notifications/unread-count':
        'getCurrentUserUnreadNotificationCount',
      'POST /api/v2/notifications/users/{userId}/push-tokens':
        'registerUserPushToken',
      'POST /api/v2/notifications/{id}/opened':
        'markCurrentUserNotificationOpened',
      'POST /api/v2/notifications/{id}/read': 'markCurrentUserNotificationRead',
    },
  );
  assert.equal(
    new Set(operations.map(({ operation }) => operation.operationId)).size,
    6,
  );
  assert.deepEqual(notification.paths['/api/v2/notifications'].get.tags, [
    'NotificationInboxPages',
  ]);
  for (const operation of [
    notification.paths['/api/v2/notifications/unread-count'].get,
    notification.paths['/api/v2/notifications/{id}/read'].post,
    notification.paths['/api/v2/notifications/{id}/opened'].post,
    notification.paths['/api/v2/notifications/{id}'].delete,
  ]) {
    assert.deepEqual(operation.tags, ['NotificationInboxMutations']);
  }
  assert.deepEqual(notification.security, [{ bearerAuth: [] }]);

  const item = notification.components.schemas.NotificationInternalResponse;
  assert.deepEqual(Object.keys(item.properties), [
    'id',
    'type',
    'title',
    'body',
    'deepLink',
    'divisionId',
    'isRead',
    'isOpened',
    'createdAt',
  ]);
  for (const excludedField of [
    'userId',
    'targetType',
    'targetId',
    'metadata',
    'readAt',
    'openedAt',
  ]) {
    assert.equal(item.properties[excludedField], undefined);
  }
  assert.equal(
    item.properties.type.$ref,
    '#/components/schemas/NotificationTypeEnum',
  );
  assert.equal(item.properties.divisionId.nullable, true);

  const page = notification.components.schemas.NotificationInternalPageResponse;
  assert.deepEqual(Object.keys(page.properties), ['items', 'pageInfo']);
  assert.equal(
    notification.components.parameters.NotificationPageSize.schema.default,
    20,
  );
  assert.equal(
    notification.components.parameters.NotificationPageSize.schema.maximum,
    100,
  );
  assert.deepEqual(notification.components.parameters.UserId.schema, {
    type: 'integer',
    format: 'int64',
    minimum: 1,
  });
  assert.deepEqual(
    Object.keys(
      notification.components.schemas.UnreadNotificationCountInternalResponse
        .properties,
    ),
    ['unreadCount'],
  );

  const tokenRequest =
    notification.components.schemas.RegisterPushTokenInternalRequest;
  assert.deepEqual(Object.keys(tokenRequest.properties), [
    'expoPushToken',
    'platform',
    'deviceId',
  ]);
  assert.deepEqual(tokenRequest.required, [
    'expoPushToken',
    'platform',
    'deviceId',
  ]);
  assert.equal(
    tokenRequest.properties.platform.$ref,
    '#/components/schemas/DevicePlatformEnum',
  );
  assert.deepEqual(
    Object.keys(notification.components.schemas).filter((name) =>
      /Event|Rabbit|ExpoMessage|ExpoTicket|NotificationSend|Follower/.test(
        name,
      ),
    ),
    [],
  );
  assert.match(
    notification.paths['/api/v2/notifications/{id}/read'].post.description,
    /already marked read returns 404/,
  );
  assert.match(
    notification.paths['/api/v2/notifications/users/{userId}/push-tokens'].post
      .description,
    /does not compare userId with the authenticated subject/,
  );
});

test('workspace search contract exposes bounded results without worker leakage', async () => {
  const search = await readJson(path.join(generatedSpecsDir, 'search.json'));
  const operations = Object.entries(search.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  assert.deepEqual(
    Object.fromEntries(
      operations.map(({ key, operation }) => [key, operation.operationId]),
    ),
    {
      'GET /api/v2/search/clubs': 'searchClubs',
      'GET /api/v2/search/teams': 'searchTeams',
      'GET /api/v2/search/pools': 'searchPools',
    },
  );
  assert.deepEqual(search.security, [{ bearerAuth: [] }]);

  assert.equal(search.components.parameters.SearchQuery.required, true);
  assert.equal(
    search.components.parameters.SearchQuery.schema.minLength,
    undefined,
  );
  assert.equal(
    search.components.parameters.SearchDivisionId.name,
    'divisionId',
  );
  assert.equal(
    search.components.parameters.SearchFormat.schema.$ref,
    '#/components/schemas/FormatEnum',
  );
  assert.equal(
    search.components.parameters.SearchGender.schema.$ref,
    '#/components/schemas/GenderEnum',
  );
  assert.deepEqual(
    search.paths['/api/v2/search/teams'].get.parameters.map(
      (parameter) => parameter.$ref,
    ),
    [
      '#/components/parameters/SearchQuery',
      '#/components/parameters/SearchSeason',
      '#/components/parameters/SearchDivisionId',
      '#/components/parameters/SearchFormat',
      '#/components/parameters/SearchGender',
    ],
  );

  const expectedFields = {
    ClubSearchInternalResult: ['id', 'name', 'logoUrl', 'city'],
    TeamSearchInternalResult: [
      'id',
      'name',
      'logoUrl',
      'divisionName',
      'format',
      'gender',
      'season',
    ],
    PoolSearchInternalResult: [
      'id',
      'name',
      'divisionName',
      'leagueCode',
      'leagueName',
      'season',
      'format',
      'gender',
      'logoUrl',
    ],
  };
  for (const [schemaName, fields] of Object.entries(expectedFields)) {
    assert.deepEqual(
      Object.keys(search.components.schemas[schemaName].properties),
      fields,
    );
  }
  for (const excludedField of [
    'shortName',
    'clubId',
    'clubName',
    'clubCity',
    'divisionId',
    'divisionMainColor',
    'all',
    'nameSuggest',
  ]) {
    assert.equal(
      search.components.schemas.TeamSearchInternalResult.properties[
        excludedField
      ],
      undefined,
    );
  }
  assert.equal(
    search.components.schemas.TeamSearchInternalResult.properties.name.nullable,
    true,
  );
  assert.equal(
    search.components.schemas.PoolSearchInternalResult.properties.format
      .nullable,
    true,
  );

  for (const listSchemaName of [
    'ClubSearchInternalListResponse',
    'TeamSearchInternalListResponse',
    'PoolSearchInternalListResponse',
  ]) {
    const listSchema = search.components.schemas[listSchemaName];
    assert.deepEqual(Object.keys(listSchema.properties), ['items']);
    assert.equal(listSchema.properties.items.maxItems, 20);
    assert.equal(listSchema.properties.pageInfo, undefined);
  }
  assert.deepEqual(
    Object.keys(search.components.schemas).filter((name) =>
      /Event|Cache|Document|Elasticsearch|Index|Worker/.test(name),
    ),
    [],
  );
  assert.deepEqual(
    Object.keys(search.paths['/api/v2/search/clubs'].get.responses),
    ['200', '400', '401', '500'],
  );
  assert.match(
    search.paths['/api/v2/search/clubs'].get.description,
    /Elasticsearch failures remain indistinguishable from an empty successful result/,
  );
});

test('workspace mobile gateway contract owns the thirty relay workflow operations', async () => {
  const gateway = await readJson(
    path.join(generatedSpecsDir, 'mobile-gateway.json'),
  );
  const operations = Object.entries(gateway.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  const relayTags = new Set([
    'MobileConfiguration',
    'MobileLegalDocuments',
    'MobileUsers',
    'MobileReports',
    'MobileSearch',
    'MobileNotifications',
  ]);
  const relayOperations = operations.filter(({ operation }) =>
    operation.tags.some((tag) => relayTags.has(tag)),
  );
  const expectedOperations = {
    'DELETE /api/v2/mobile/secure/config/divisions/{id}':
      'deactivateMobileDivision',
    'DELETE /api/v2/mobile/secure/favorites/follow': 'unfollowMobileEntity',
    'DELETE /api/v2/mobile/secure/notifications/{id}':
      'deleteMobileNotification',
    'DELETE /api/v2/mobile/secure/users/me': 'deleteCurrentMobileUser',
    'GET /api/v2/mobile/public/config/app-status': 'getMobileAppStatus',
    'GET /api/v2/mobile/public/config/divisions': 'listMobileDivisions',
    'GET /api/v2/mobile/public/config/divisions/{id}': 'getMobileDivision',
    'GET /api/v2/mobile/public/config/legal/{type}': 'getMobileLegalDocument',
    'GET /api/v2/mobile/public/search/clubs': 'searchMobileClubs',
    'GET /api/v2/mobile/public/search/pools': 'searchMobilePools',
    'GET /api/v2/mobile/public/search/teams': 'searchMobileTeams',
    'GET /api/v2/mobile/secure/config/raw-divisions':
      'listMobileRawDivisionMappings',
    'GET /api/v2/mobile/secure/config/raw-divisions/{id}':
      'getMobileRawDivisionMapping',
    'GET /api/v2/mobile/secure/config/scrapers/status':
      'listMobileScraperStatuses',
    'GET /api/v2/mobile/secure/notifications': 'listMobileNotifications',
    'GET /api/v2/mobile/secure/notifications/unread-count':
      'getMobileUnreadNotificationCount',
    'POST /api/v2/mobile/public/reports': 'createMobileReport',
    'POST /api/v2/mobile/secure/config/divisions': 'createMobileDivision',
    'POST /api/v2/mobile/secure/config/raw-divisions':
      'createMobileRawDivisionMapping',
    'POST /api/v2/mobile/secure/favorites/follow': 'followMobileEntity',
    'POST /api/v2/mobile/secure/notifications/{id}/opened':
      'markMobileNotificationOpened',
    'POST /api/v2/mobile/secure/notifications/{id}/read':
      'markMobileNotificationRead',
    'POST /api/v2/mobile/secure/notifications/users/{userId}/push-tokens':
      'registerMobilePushToken',
    'PUT /api/v2/mobile/secure/config/app-status': 'updateMobileAppStatus',
    'PUT /api/v2/mobile/secure/config/divisions/{id}': 'updateMobileDivision',
    'PUT /api/v2/mobile/secure/config/legal/{type}':
      'updateMobileLegalDocument',
    'PUT /api/v2/mobile/secure/config/raw-divisions/{id}':
      'updateMobileRawDivisionMapping',
    'PUT /api/v2/mobile/secure/config/scrapers/{name}/enabled':
      'updateMobileScraperEnabled',
    'PUT /api/v2/mobile/secure/users/me': 'ensureCurrentMobileUser',
    'PUT /api/v2/mobile/secure/users/{auth0Id}': 'updateMobileUser',
  };
  assert.deepEqual(
    Object.fromEntries(
      relayOperations
        .map(({ key, operation }) => [key, operation.operationId])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    expectedOperations,
  );
  assert.equal(relayOperations.length, 30);
  assert.equal(
    new Set(relayOperations.map(({ operation }) => operation.operationId)).size,
    30,
  );

  assert.deepEqual(gateway.security, [{ bearerAuth: [] }]);
  const publicOperations = relayOperations.filter(({ key }) =>
    key.includes('/api/v2/mobile/public/'),
  );
  assert.equal(publicOperations.length, 8);
  for (const { operation } of publicOperations) {
    assert.deepEqual(operation.security, []);
  }
  for (const { key, operation } of relayOperations.filter(({ key }) =>
    key.includes('/api/v2/mobile/secure/'),
  )) {
    assert.equal(operation.security, undefined, key);
  }

  assert.deepEqual(
    Object.keys(gateway.components.schemas).filter((name) =>
      name.endsWith('InternalResponse'),
    ),
    [],
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileUser.properties),
    ['id', 'auth0Id', 'email', 'pseudo', 'pictureUrl', 'favorites'],
  );
  assert.deepEqual(gateway.components.schemas.MobileUser.properties.id, {
    type: 'integer',
    format: 'int64',
    minimum: 1,
  });
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileUserFavorite.properties),
    ['entityType', 'entityId'],
  );
  assert.equal(
    gateway.components.parameters.MobileFavoriteEntityType.name,
    'entityType',
  );
  assert.equal(
    gateway.components.parameters.MobileFavoriteEntityId.name,
    'entityId',
  );

  const userMultipart =
    gateway.paths['/api/v2/mobile/secure/users/{auth0Id}'].put.requestBody
      .content['multipart/form-data'];
  assert.equal(
    userMultipart.schema.properties.data.$ref,
    '#/components/schemas/UpdateMobileUserRequest',
  );
  assert.equal(userMultipart.encoding.data.contentType, 'application/json');
  assert.deepEqual(
    Object.keys(gateway.components.schemas.UpdateMobileUserRequest.properties),
    ['pseudo', 'removePicture'],
  );

  const reportMultipart =
    gateway.paths['/api/v2/mobile/public/reports'].post.requestBody.content[
      'multipart/form-data'
    ];
  assert.equal(
    reportMultipart.schema.properties.data.$ref,
    '#/components/schemas/CreateMobileReportRequest',
  );
  assert.equal(reportMultipart.schema.properties.images.type, 'array');
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileReportCreated.properties),
    ['number', 'htmlUrl', 'title'],
  );

  for (const listSchemaName of [
    'MobileDivisionListResponse',
    'MobileRawDivisionMappingListResponse',
    'MobileScraperStatusListResponse',
    'MobileClubSearchListResponse',
    'MobileTeamSearchListResponse',
    'MobilePoolSearchListResponse',
  ]) {
    assert.deepEqual(
      Object.keys(gateway.components.schemas[listSchemaName].properties),
      ['items'],
    );
  }
  assert.deepEqual(
    Object.keys(
      gateway.components.schemas.MobileNotificationPageResponse.properties,
    ),
    ['items', 'pageInfo'],
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileNotification.properties),
    ['id', 'title', 'body', 'deepLink', 'createdAt', 'divisionLogoUrl'],
  );
  assert.deepEqual(
    Object.keys(
      gateway.components.schemas.MobileUnreadNotificationCount.properties,
    ),
    ['unreadCount'],
  );
  assert.deepEqual(gateway.components.parameters.MobileUserId.schema, {
    type: 'integer',
    format: 'int64',
    minimum: 1,
  });
  assert.deepEqual(
    Object.keys(
      gateway.components.schemas.RegisterMobilePushTokenRequest.properties,
    ),
    ['expoPushToken', 'platform', 'deviceId'],
  );
  assert.deepEqual(
    Object.keys(
      gateway.paths[
        '/api/v2/mobile/secure/notifications/users/{userId}/push-tokens'
      ].post.responses,
    ),
    ['202', '400', '401', '404', '500'],
  );

  const teamSearch = gateway.paths['/api/v2/mobile/public/search/teams'].get;
  assert.deepEqual(
    teamSearch.parameters.map((parameter) => parameter.$ref),
    [
      '#/components/parameters/MobileSearchQuery',
      '#/components/parameters/MobileSeason',
      '#/components/parameters/MobileSearchDivisionId',
      '#/components/parameters/MobileSearchFormat',
      '#/components/parameters/MobileSearchGender',
    ],
  );
  assert.equal(
    gateway.components.parameters.MobileSearchDivisionId.name,
    'divisionId',
  );
  assert.match(
    gateway.paths['/api/v2/mobile/public/search/clubs'].get.description,
    /v1 adapter preserves its current empty-to-204 behavior/,
  );

  assert.deepEqual(
    Object.keys(gateway.components.schemas).filter((name) =>
      /GitHub|Discord|S3|Elasticsearch|IndexDocument|Cache|ExpoMessage|Ticket|Delivery|Entity/.test(
        name,
      ),
    ),
    ['EntityTypeEnum'],
  );
});

test('workspace mobile gateway contract separates the nine club team and pool workflows', async () => {
  const gateway = await readJson(
    path.join(generatedSpecsDir, 'mobile-gateway.json'),
  );
  const workflowTags = new Set(['MobileClubs', 'MobileTeams', 'MobilePools']);
  const operations = Object.entries(gateway.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  const workflowOperations = operations.filter(({ operation }) =>
    operation.tags.some((tag) => workflowTags.has(tag)),
  );
  assert.deepEqual(
    Object.fromEntries(
      workflowOperations
        .map(({ key, operation }) => [key, operation.operationId])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    {
      'GET /api/v2/mobile/public/clubs/{id}': 'getMobileClub',
      'GET /api/v2/mobile/public/pools/by-ids': 'listMobilePoolsByIds',
      'GET /api/v2/mobile/public/pools/{id}': 'getMobilePool',
      'GET /api/v2/mobile/public/teams/by-club/{clubId}':
        'listMobileTeamsByClub',
      'GET /api/v2/mobile/public/teams/by-ids': 'listMobileTeamsByIds',
      'GET /api/v2/mobile/public/teams/{id}': 'getMobileTeam',
      'PUT /api/v2/mobile/secure/clubs/{id}': 'updateMobileClub',
      'PUT /api/v2/mobile/secure/pools/{id}': 'updateMobilePool',
      'PUT /api/v2/mobile/secure/teams/{id}': 'updateMobileTeam',
    },
  );
  assert.equal(workflowOperations.length, 9);
  for (const { key, operation } of workflowOperations) {
    if (key.includes('/public/')) {
      assert.deepEqual(operation.security, []);
    } else {
      assert.equal(operation.security, undefined);
    }
  }

  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileClubDetail.properties),
    [
      'id',
      'rawName',
      'name',
      'address',
      'city',
      'email',
      'website',
      'logoUrl',
      'latitude',
      'longitude',
    ],
  );
  assert.equal(
    gateway.components.schemas.MobileClubDetail.properties.phoneNumber,
    undefined,
  );
  for (const compatibilityField of [
    'postalCode',
    'active',
    'createdAt',
    'lastUpdate',
  ]) {
    assert.equal(
      gateway.components.schemas.MobileClubDetail.properties[
        compatibilityField
      ],
      undefined,
    );
  }
  assert.deepEqual(
    Object.keys(gateway.components.schemas.UpdateMobileClubRequest.properties),
    ['name', 'removeLogo'],
  );

  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileTeamDetail.properties),
    [
      'id',
      'clubId',
      'name',
      'shortName',
      'rawName',
      'format',
      'gender',
      'season',
      'followersCount',
      'division',
      'logoUrl',
      'pools',
    ],
  );
  assert.equal(
    gateway.components.schemas.MobileTeamDetail.properties.club,
    undefined,
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileTeamPool.properties),
    [
      'id',
      'leagueCode',
      'leagueName',
      'shortName',
      'gender',
      'ranking',
      'division',
    ],
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobilePoolDetail.properties),
    [
      'id',
      'season',
      'leagueCode',
      'leagueName',
      'name',
      'shortName',
      'rawName',
      'gender',
      'followersCount',
      'ranking',
      'division',
    ],
  );
  assert.notDeepEqual(
    gateway.components.schemas.MobileTeamPool,
    gateway.components.schemas.MobilePoolDetail,
  );

  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileRankingTeam.properties),
    [
      'id',
      'shortName',
      'logoUrl',
      'points',
      'played',
      'wins',
      'losses',
      'latitude',
      'longitude',
    ],
  );
  for (const serverOnlyRankingField of [
    'name',
    'pointsPenalty',
    'coefSets',
    'coefPoints',
  ]) {
    assert.equal(
      gateway.components.schemas.MobileRankingTeam.properties[
        serverOnlyRankingField
      ],
      undefined,
    );
  }
  assert.match(
    gateway.components.schemas.MobileRankingTeam.description,
    /exact ties retain unspecified source order/,
  );

  assert.equal(
    gateway.components.schemas.MobileTeamSummary.properties.division.nullable,
    true,
  );
  assert.equal(
    gateway.components.schemas.MobilePoolSummary.properties.division.nullable,
    true,
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileTeamListResponse.properties),
    ['items'],
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobilePoolListResponse.properties),
    ['items'],
  );
  assert.equal(gateway.components.parameters.MobileIds.explode, true);
  assert.equal(gateway.components.parameters.MobileIds.schema.minItems, 1);
  assert.deepEqual(gateway.components.parameters.MobileIds.schema.items, {
    type: 'integer',
    format: 'int64',
    minimum: 1,
  });
  assert.match(
    gateway.paths['/api/v2/mobile/public/teams/by-ids'].get.description,
    /silently omits missing or inactive teams/,
  );
  assert.match(
    gateway.paths['/api/v2/mobile/public/pools/by-ids'].get.description,
    /no partial-result marker/,
  );

  const clubMultipart =
    gateway.paths['/api/v2/mobile/secure/clubs/{id}'].put.requestBody.content[
      'multipart/form-data'
    ];
  const teamMultipart =
    gateway.paths['/api/v2/mobile/secure/teams/{id}'].put.requestBody.content[
      'multipart/form-data'
    ];
  assert.equal(
    clubMultipart.schema.properties.data.$ref,
    '#/components/schemas/UpdateMobileClubRequest',
  );
  assert.equal(
    teamMultipart.schema.properties.data.$ref,
    '#/components/schemas/UpdateMobileTeamRequest',
  );
  assert.equal(clubMultipart.encoding.data.contentType, 'application/json');
  assert.equal(teamMultipart.encoding.data.contentType, 'application/json');
  assert.deepEqual(
    Object.keys(gateway.components.schemas.UpdateMobileTeamRequest.properties),
    ['name', 'shortName', 'removeLogo'],
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.UpdateMobilePoolRequest.properties),
    ['name', 'shortName'],
  );
});

test('workspace mobile gateway contract separates the eleven match live moderation and signed document workflows', async () => {
  const gateway = await readJson(
    path.join(generatedSpecsDir, 'mobile-gateway.json'),
  );
  const workflowTags = new Set([
    'MobileMatches',
    'MobileMatchLiveLinks',
    'MobileMatchModeration',
    'MobileFederationDocuments',
  ]);
  const operations = Object.entries(gateway.paths).flatMap(
    ([operationPath, pathItem]) =>
      Object.entries(pathItem)
        .filter(([method]) => method !== 'parameters')
        .map(([method, operation]) => ({
          key: `${method.toUpperCase()} ${operationPath}`,
          operation,
        })),
  );
  const workflowOperations = operations.filter(({ operation }) =>
    operation.tags.some((tag) => workflowTags.has(tag)),
  );

  assert.deepEqual(
    Object.fromEntries(
      workflowOperations
        .map(({ key, operation }) => [key, operation.operationId])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    {
      'DELETE /api/v2/mobile/secure/matches/{matchId}/live-link':
        'deleteMobileMatchLiveLink',
      'GET /api/v2/mobile/public/ffvb/pdf/{token}': 'getMobileFederationPdf',
      'GET /api/v2/mobile/public/matches': 'listMobileMatchDays',
      'GET /api/v2/mobile/public/matches/{id}': 'getMobileMatch',
      'GET /api/v2/mobile/secure/matches/live-moderation':
        'listMobileMatchesForLiveModeration',
      'GET /api/v2/mobile/secure/matches/{matchId}/live-links':
        'listMobileMatchLiveLinkHistory',
      'POST /api/v2/mobile/secure/matches/live-links/{id}/approve':
        'approveMobileMatchLiveLink',
      'POST /api/v2/mobile/secure/matches/live-links/{id}/reactivate':
        'reactivateMobileMatchLiveLink',
      'POST /api/v2/mobile/secure/matches/live-links/{id}/reject':
        'rejectMobileMatchLiveLink',
      'POST /api/v2/mobile/secure/matches/{matchId}/live-link':
        'upsertMobileMatchLiveLink',
      'POST /api/v2/mobile/secure/matches/{matchId}/live-link/report':
        'reportMobileMatchLiveLink',
    },
  );
  assert.equal(workflowOperations.length, 11);
  assert.equal(operations.length, 50);
  assert.equal(
    new Set(operations.map(({ operation }) => operation.operationId)).size,
    50,
  );

  for (const { key, operation } of workflowOperations) {
    if (key.includes('/public/')) {
      assert.deepEqual(operation.security, [], key);
    } else {
      assert.equal(operation.security, undefined, key);
    }
  }

  const matchList = gateway.paths['/api/v2/mobile/public/matches'].get;
  assert.deepEqual(
    matchList.parameters.map(({ $ref }) => $ref),
    [
      '#/components/parameters/Page',
      '#/components/parameters/MobileMatchDayPageSize',
      '#/components/parameters/MobileMatchPoolIds',
      '#/components/parameters/MobileMatchTeamIds',
      '#/components/parameters/MobileMatchStatus',
    ],
  );
  assert.equal(
    gateway.components.parameters.MobileMatchDayPageSize.name,
    'pageSize',
  );
  assert.equal(
    gateway.components.parameters.MobileMatchDayPageSize.schema.default,
    4,
  );
  assert.equal(gateway.components.parameters.MobileMatchStatus.required, true);
  assert.equal(gateway.components.parameters.MobileMatchPoolIds.explode, true);
  assert.equal(gateway.components.parameters.MobileMatchTeamIds.explode, true);
  assert.deepEqual(
    Object.keys(
      gateway.components.schemas.MobileMatchDayPageResponse.properties,
    ),
    ['dayMatches', 'hasNext', 'nextPage'],
  );
  assert.match(
    gateway.components.schemas.MobileMatchDayPageResponse.description,
    /forces hasNext false and nextPage null/,
  );
  assert.match(
    gateway.components.schemas.MobileMatchPoolGroup.properties.matches
      .description,
    /no immutable-ID tie-breaker/,
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileMatchListItem.properties),
    ['id', 'matchDate', 'set', 'status', 'liveUrl', 'teamA', 'teamB'],
  );
  assert.equal(
    gateway.components.schemas.MobileMatchListItem.properties.teamA.nullable,
    true,
  );
  assert.equal(
    gateway.components.schemas.MobileMatchListItem.properties.teamB.nullable,
    true,
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileMatchListTeam.properties),
    ['shortName', 'logoUrl'],
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileMatchListPool.properties),
    ['id', 'leagueCode', 'leagueName', 'shortName', 'gender', 'division'],
  );

  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileMatchDetail.properties),
    [
      'id',
      'matchDate',
      'set',
      'score',
      'status',
      'venue',
      'firstReferee',
      'secondReferee',
      'liveUrl',
      'liveProvider',
      'liveOwnerAuth0Id',
      'teamA',
      'teamB',
      'pool',
      'signedDocuments',
    ],
  );
  for (const compatibilityField of [
    'liveCode',
    'season',
    'liveOwnerUsername',
    'matchAddressPdfUrl',
    'matchSheetPdfUrl',
  ]) {
    assert.equal(
      gateway.components.schemas.MobileMatchDetail.properties[
        compatibilityField
      ],
      undefined,
    );
  }
  assert.deepEqual(
    Object.keys(
      gateway.components.schemas.MobileMatchSignedDocuments.properties,
    ),
    ['addressPdfUrl', 'sheetPdfUrl'],
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileMatchDetailTeam.properties),
    ['id', 'name', 'shortName', 'logoUrl'],
  );
  assert.deepEqual(
    Object.keys(gateway.components.schemas.MobileMatchRankingTeam.properties),
    ['id', 'shortName', 'logoUrl', 'points', 'played', 'wins', 'losses'],
  );
  for (const rankingInternalField of [
    'name',
    'pointsPenalty',
    'coefSets',
    'coefPoints',
    'latitude',
    'longitude',
  ]) {
    assert.equal(
      gateway.components.schemas.MobileMatchRankingTeam.properties[
        rankingInternalField
      ],
      undefined,
    );
  }
  assert.match(
    gateway.components.schemas.MobileMatchDetailPool.properties.ranking
      .description,
    /Exact ties retain unspecified association order/,
  );

  const history =
    gateway.paths['/api/v2/mobile/secure/matches/{matchId}/live-links'].get;
  const moderation =
    gateway.paths['/api/v2/mobile/secure/matches/live-moderation'].get;
  assert.deepEqual(
    history.parameters.map(({ $ref }) => $ref),
    ['#/components/parameters/Page', '#/components/parameters/PageSize'],
  );
  assert.deepEqual(
    moderation.parameters.map(({ $ref }) => $ref),
    [
      '#/components/parameters/MobileLiveLinkStatus',
      '#/components/parameters/Page',
      '#/components/parameters/PageSize',
    ],
  );
  for (const pageSchemaName of [
    'MobileMatchLiveLinkHistoryPageResponse',
    'MobileMatchModerationPageResponse',
  ]) {
    assert.deepEqual(
      Object.keys(gateway.components.schemas[pageSchemaName].properties),
      ['items', 'pageInfo'],
    );
  }
  assert.equal(
    gateway.components.schemas.MobileMatchLiveLinkHistoryItem.properties
      .matchId,
    undefined,
  );
  assert.deepEqual(
    Object.keys(
      gateway.components.schemas.MobileMatchLiveLinkHistoryItem.properties,
    ),
    [
      'id',
      'provider',
      'url',
      'status',
      'reportCount',
      'ownerAuth0Id',
      'createdAt',
      'lastUpdate',
    ],
  );
  assert.deepEqual(
    Object.keys(
      gateway.components.schemas.MobileMatchModerationItem.properties,
    ),
    [
      'id',
      'matchDate',
      'season',
      'set',
      'lastLiveLinkStatus',
      'lastLiveLinkCreatedAt',
      'teamA',
      'teamB',
      'pool',
    ],
  );
  assert.match(moderation.description, /silently drop rows/);
  assert.match(
    gateway.components.schemas.MobileMatchModerationItem.description,
    /different historical link/,
  );

  assert.deepEqual(
    Object.keys(
      gateway.components.schemas.UpsertMobileMatchLiveLinkRequest.properties,
    ),
    ['url'],
  );
  assert.deepEqual(
    Object.keys(
      gateway.components.schemas.MobileMatchLiveLinkResult.properties,
    ),
    ['matchId', 'provider', 'url', 'status'],
  );
  assert.equal(
    gateway.components.schemas.ReportMobileMatchLiveLinkRequest.properties
      .reason.minLength,
    10,
  );
  assert.equal(
    gateway.components.schemas.ReportMobileMatchLiveLinkRequest.properties
      .reason.maxLength,
    500,
  );

  const pdf = gateway.paths['/api/v2/mobile/public/ffvb/pdf/{token}'].get;
  assert.equal(
    pdf.responses['200'].content['application/pdf'].schema.format,
    'binary',
  );
  assert.equal(
    pdf.responses['200'].headers['Cache-Control'].schema.pattern,
    '^no-store$',
  );
  assert.equal(
    pdf.responses['502'].$ref,
    '#/components/responses/MobileFederationBadGatewayProblem',
  );

  const workflowJson = JSON.stringify(workflowOperations);
  for (const legacyName of ['pool_ids', 'team_ids', 'next_page']) {
    assert.equal(workflowJson.includes(legacyName), false, legacyName);
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

test('workspace shared catalog keeps the approved schemas and enum wires', async () => {
  const expectedTechnicalSchemas = [
    'CalendarDate',
    'PageInfo',
    'ProblemDetail',
    'UtcDateTime',
    'UuidIdentifier',
  ];
  const schemaFiles = (await readdir(sharedSchemasDir))
    .filter((filename) => filename.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));
  const expectedSchemaNames = [
    ...Object.keys(expectedSharedEnums),
    ...expectedTechnicalSchemas,
  ].sort((a, b) => a.localeCompare(b));

  assert.deepEqual(
    schemaFiles,
    expectedSchemaNames.map((schemaName) => `${schemaName}.json`),
  );

  for (const [schemaName, expectedValues] of Object.entries(
    expectedSharedEnums,
  )) {
    const fragment = await readJson(
      path.join(sharedSchemasDir, `${schemaName}.json`),
    );
    assert.deepEqual(fragment[schemaName].enum, expectedValues);
  }
});

test('fixture bundles transitive schemas, shared enums, and stable output', async (t) => {
  const fixture = await createFixtureProject(t);

  await writeJson(path.join(fixture.sourceDir, 'shared/base.json'), {
    openapi: '3.1.0',
    info: { title: 'Blockout Shared API', version: '2.0.0' },
    paths: {},
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      parameters: {
        Page: {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', minimum: 0 },
        },
      },
      responses: {
        BadRequestProblem: {
          description: 'Bad request',
          content: {
            'application/problem+json': {
              schema: { $ref: '#/components/schemas/ProblemDetail' },
            },
          },
        },
      },
    },
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
  await writeJson(
    path.join(fixture.sourceDir, 'shared/schemas/ProblemDetail.json'),
    { ProblemDetail: { type: 'object' } },
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
      'ProblemDetail',
      'SharedEnvelope',
      'SharedId',
      'TraceId',
    ],
  );
  assert.equal(Object.hasOwn(clubs.components.schemas, 'UnusedClub'), false);
  assert.deepEqual(clubs.components.securitySchemes, {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  });
  assert.deepEqual(Object.keys(clubs.components.parameters), [
    'Page',
    'TraceIdHeader',
  ]);
  assert.equal(
    clubs.components.responses.BadRequestProblem.content[
      'application/problem+json'
    ].schema.$ref,
    '#/components/schemas/ProblemDetail',
  );

  const shared = JSON.parse(firstShared);
  assert.deepEqual(Object.keys(shared.components.schemas), [
    'FormatEnum',
    'ProblemDetail',
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

test('fixture bundling rejects owner overrides of shared components', async (t) => {
  const fixture = await createFixtureProject(t);

  await writeJson(path.join(fixture.sourceDir, 'shared/base.json'), {
    openapi: '3.1.0',
    info: { title: 'Blockout Shared API', version: '2.0.0' },
    paths: {},
    components: {
      parameters: {
        Page: {
          name: 'page',
          in: 'query',
          schema: { type: 'integer' },
        },
      },
    },
  });

  const clubsDir = path.join(fixture.sourceDir, 'services/clubs');
  await writeJson(path.join(clubsDir, 'base.json'), {
    openapi: '3.1.0',
    info: { title: 'Blockout Clubs Internal API', version: '2.0.0' },
    components: {
      parameters: {
        Page: {
          name: 'pageNumber',
          in: 'query',
          schema: { type: 'integer' },
        },
      },
    },
  });

  const result = runBundle(fixture.scriptFile, fixture.projectRoot);
  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(
    result.stderr,
    /Duplicate component "parameters\.Page" in shared and owner base documents/,
  );
});

test('fixture bundling rejects owner overrides of shared schemas', async (t) => {
  const fixture = await createFixtureProject(t);

  await writeJson(path.join(fixture.sourceDir, 'shared/base.json'), {
    openapi: '3.1.0',
    info: { title: 'Blockout Shared API', version: '2.0.0' },
    paths: {},
  });
  await writeJson(
    path.join(fixture.sourceDir, 'shared/schemas/ProblemDetail.json'),
    { ProblemDetail: { type: 'object' } },
  );

  const clubsDir = path.join(fixture.sourceDir, 'services/clubs');
  await writeJson(path.join(clubsDir, 'base.json'), {
    openapi: '3.1.0',
    info: { title: 'Blockout Clubs Internal API', version: '2.0.0' },
  });
  await writeJson(path.join(clubsDir, 'schemas/ProblemDetail.json'), {
    ProblemDetail: { type: 'string' },
  });

  const result = runBundle(fixture.scriptFile, fixture.projectRoot);
  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(
    result.stderr,
    /Duplicate component "schemas\.ProblemDetail" in shared and owner base documents/,
  );
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
