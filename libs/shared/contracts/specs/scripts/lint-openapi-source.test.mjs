import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptFile = path.join(__dirname, 'lint-openapi-source.mjs');

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function createFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'blockout-openapi-lint-'));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const fixtureScript = path.join(root, 'scripts/lint-openapi-source.mjs');
  await mkdir(path.dirname(fixtureScript), { recursive: true });
  await copyFile(scriptFile, fixtureScript);

  return {
    root,
    script: fixtureScript,
    sourceDir: path.join(root, 'source'),
    exceptionsFile: path.join(root, 'lint-exceptions.json'),
  };
}

function runLint(fixture) {
  return spawnSync(
    process.execPath,
    [fixture.script, fixture.sourceDir, fixture.exceptionsFile],
    { cwd: fixture.root, encoding: 'utf8' },
  );
}

test('workspace source passes the canonical lint policy', () => {
  const result = spawnSync(process.execPath, [scriptFile], {
    cwd: path.resolve(__dirname, '../../../../..'),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /OpenAPI source lint passed/);
});

test('valid fixture allows owner-local operation IDs and shared enums', async (t) => {
  const fixture = await createFixture(t);
  await writeJson(fixture.exceptionsFile, { exceptions: [] });
  await writeJson(
    path.join(fixture.sourceDir, 'shared/schemas/FormatEnum.json'),
    { FormatEnum: { type: 'string', enum: ['SIX_VS_SIX'] } },
  );
  await writeJson(
    path.join(
      fixture.sourceDir,
      'services/clubs/schemas/ClubInternalResponse.json',
    ),
    {
      ClubInternalResponse: {
        type: 'object',
        properties: {
          clubId: { type: 'string' },
          format: { $ref: '#/components/schemas/FormatEnum' },
        },
      },
    },
  );
  await writeJson(
    path.join(fixture.sourceDir, 'services/clubs/paths/clubs.json'),
    {
      '/api/v2/clubs': {
        get: {
          operationId: 'listClubs',
          parameters: [
            { name: 'pageSize', in: 'query', schema: { type: 'integer' } },
          ],
        },
      },
    },
  );
  await writeJson(
    path.join(fixture.sourceDir, 'services/mobile-gateway/paths/clubs.json'),
    {
      '/api/v2/clubs': {
        get: { operationId: 'listClubs' },
      },
    },
  );

  const result = runLint(fixture);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /4 fragments, 0 exceptions/);
});

test('invalid fixture reports every canonical source violation', async (t) => {
  const fixture = await createFixture(t);
  await writeJson(fixture.exceptionsFile, { exceptions: [] });
  await writeJson(
    path.join(fixture.sourceDir, 'services/clubs/schemas/ClubDTO.json'),
    {
      ClubDTO: {
        type: 'object',
        properties: {
          team_id: { type: 'string' },
          state: { type: 'string', enum: ['ACTIVE'] },
        },
      },
    },
  );
  await writeJson(
    path.join(fixture.sourceDir, 'services/clubs/paths/a-clubs.json'),
    {
      '/api/v2/clubs': {
        get: {
          operationId: 'listClubs',
          parameters: [
            { name: 'page_size', in: 'query', schema: { type: 'integer' } },
          ],
        },
      },
    },
  );
  await writeJson(
    path.join(fixture.sourceDir, 'services/clubs/paths/b-clubs.json'),
    {
      '/api/v2/clubs/search': {
        get: { operationId: 'listClubs' },
      },
    },
  );

  const result = runLint(fixture);
  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /\[schema-role-name\].*ClubDTO/);
  assert.match(result.stderr, /\[wire-name-camel-case\].*team_id/);
  assert.match(result.stderr, /\[wire-name-camel-case\].*page_size/);
  assert.match(result.stderr, /\[stable-enum-component\]/);
  assert.match(result.stderr, /\[operation-id-unique\].*listClubs/);
});

test('an exact documented exception suppresses only its violation', async (t) => {
  const fixture = await createFixture(t);
  const schemaFile = path.join(
    fixture.sourceDir,
    'services/clubs/schemas/ClubInternalResponse.json',
  );
  await writeJson(schemaFile, {
    ClubInternalResponse: {
      type: 'object',
      properties: { legacy_id: { type: 'string' } },
    },
  });
  await writeJson(fixture.exceptionsFile, {
    exceptions: [
      {
        id: 'legacy-club-id',
        rule: 'wire-name-camel-case',
        file: 'source/services/clubs/schemas/ClubInternalResponse.json',
        pointer: '/ClubInternalResponse/properties/legacy_id',
        reason: 'Temporary read compatibility for the deployed v1 club wire.',
        ownerTask: 'MRG-351',
        removeByTask: 'MRG-352',
      },
    ],
  });

  const result = runLint(fixture);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /1 fragments, 1 exceptions/);
});

test('stale and malformed exceptions fail the lint', async (t) => {
  const fixture = await createFixture(t);
  await writeJson(
    path.join(
      fixture.sourceDir,
      'services/clubs/schemas/ClubInternalResponse.json',
    ),
    {
      ClubInternalResponse: {
        type: 'object',
        properties: { clubId: { type: 'string' } },
      },
    },
  );
  await writeJson(fixture.exceptionsFile, {
    exceptions: [
      {
        id: 'stale-club-id',
        rule: 'wire-name-camel-case',
        file: 'source/services/clubs/schemas/ClubInternalResponse.json',
        pointer: '/ClubInternalResponse/properties/legacy_id',
        reason: 'Temporary read compatibility for the deployed v1 club wire.',
        ownerTask: 'MRG-351',
        removeByTask: 'MRG-352',
      },
    ],
  });

  const staleResult = runLint(fixture);
  assert.notEqual(
    staleResult.status,
    0,
    `${staleResult.stdout}\n${staleResult.stderr}`,
  );
  assert.match(staleResult.stderr, /\[unused-exception\] stale-club-id/);

  await writeJson(fixture.exceptionsFile, {
    exceptions: [
      {
        id: 'malformed-club-id',
        rule: 'wire-name-camel-case',
        file: 'source/services/clubs/schemas/ClubInternalResponse.json',
        pointer: '/ClubInternalResponse/properties/legacy_id',
        reason: 'Too short',
        ownerTask: 'MRG-351',
      },
    ],
  });
  const malformedResult = runLint(fixture);
  assert.notEqual(
    malformedResult.status,
    0,
    `${malformedResult.stdout}\n${malformedResult.stderr}`,
  );
  assert.match(malformedResult.stderr, /Invalid OpenAPI lint exceptions/);
  assert.match(malformedResult.stderr, /removeByTask/);
  assert.match(malformedResult.stderr, /reason must explain/);

  const duplicateException = {
    id: 'duplicate-club-id',
    rule: 'wire-name-camel-case',
    file: 'source/services/clubs/schemas/ClubInternalResponse.json',
    pointer: '/ClubInternalResponse/properties/legacy_id',
    reason: 'Temporary read compatibility for the deployed v1 club wire.',
    ownerTask: 'MRG-351',
    removeByTask: 'MRG-352',
  };
  await writeJson(fixture.exceptionsFile, {
    exceptions: [
      duplicateException,
      { ...duplicateException, id: 'duplicate-club-id-copy' },
    ],
  });
  const duplicateResult = runLint(fixture);
  assert.notEqual(
    duplicateResult.status,
    0,
    `${duplicateResult.stdout}\n${duplicateResult.stderr}`,
  );
  assert.match(
    duplicateResult.stderr,
    /duplicates an existing rule\/file\/pointer/,
  );
});
