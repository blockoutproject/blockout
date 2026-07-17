import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { syncBackendSchemaMappings } from './sync-backend-schema-mappings.mjs';

const pomTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <configuration>
            <!-- BEGIN generated schemaMappings -->
            <schemaMappings>
              <schemaMapping>StaleEnum=com.blockout.shared.model.StaleEnum</schemaMapping>
            </schemaMappings>
            <!-- END generated schemaMappings -->
  </configuration>
</project>
`;

async function withFixture(run) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), 'blockout-schema-mappings-'),
  );
  const schemas = path.join(root, 'schemas');
  const pom = path.join(root, 'pom.xml');

  try {
    await mkdir(schemas, { recursive: true });
    await writeFile(pom, pomTemplate, 'utf8');
    await run({ root, schemas, pom });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('writes sorted Blockout shared-model mappings and is idempotent', async () => {
  await withFixture(async ({ schemas, pom }) => {
    await writeFile(
      path.join(schemas, 'z-last.json'),
      JSON.stringify({
        ZetaEnum: { type: 'string' },
        AlphaEnum: { type: 'string' },
      }),
      'utf8',
    );
    await writeFile(
      path.join(schemas, 'a-first.json'),
      JSON.stringify({
        MiddleEnum: { type: 'string' },
        UuidIdentifier: {
          type: 'string',
          format: 'uuid',
          'x-java-type': 'java.util.UUID',
        },
      }),
      'utf8',
    );

    assert.deepEqual(await syncBackendSchemaMappings(schemas, pom), [
      'AlphaEnum',
      'MiddleEnum',
      'UuidIdentifier',
      'ZetaEnum',
    ]);

    const first = await readFile(pom, 'utf8');
    assert.match(
      first,
      /AlphaEnum=com\.blockout\.shared\.model\.AlphaEnum[\s\S]*MiddleEnum=com\.blockout\.shared\.model\.MiddleEnum[\s\S]*ZetaEnum=com\.blockout\.shared\.model\.ZetaEnum/,
    );
    assert.match(first, /UuidIdentifier=java\.util\.UUID/);

    await syncBackendSchemaMappings(schemas, pom);
    assert.equal(await readFile(pom, 'utf8'), first);
  });
});

test('removes stale mappings when the shared schema directory is absent', async () => {
  await withFixture(async ({ root, pom }) => {
    const missingSchemas = path.join(root, 'missing');

    assert.deepEqual(await syncBackendSchemaMappings(missingSchemas, pom), []);
    const content = await readFile(pom, 'utf8');
    assert.doesNotMatch(content, /StaleEnum/);
    assert.match(content, /<schemaMappings>\n            <\/schemaMappings>/);
  });
});

test('rejects duplicate shared schema ownership', async () => {
  await withFixture(async ({ schemas, pom }) => {
    await writeFile(
      path.join(schemas, 'one.json'),
      JSON.stringify({ SharedEnum: {} }),
      'utf8',
    );
    await writeFile(
      path.join(schemas, 'two.json'),
      JSON.stringify({ SharedEnum: {} }),
      'utf8',
    );

    await assert.rejects(
      syncBackendSchemaMappings(schemas, pom),
      /Duplicate shared schema SharedEnum in one\.json and two\.json/,
    );
  });
});

test('rejects an invalid explicit Java type mapping', async () => {
  await withFixture(async ({ schemas, pom }) => {
    await writeFile(
      path.join(schemas, 'invalid.json'),
      JSON.stringify({
        InvalidIdentifier: {
          type: 'string',
          'x-java-type': 'java.util.UUID</schemaMapping>',
        },
      }),
      'utf8',
    );

    await assert.rejects(
      syncBackendSchemaMappings(schemas, pom),
      /Invalid x-java-type for shared schema InvalidIdentifier/,
    );
  });
});

test('requires exactly one ordered protected block', async () => {
  await withFixture(async ({ schemas, pom }) => {
    await writeFile(pom, '<project/>\n', 'utf8');

    await assert.rejects(
      syncBackendSchemaMappings(schemas, pom),
      /Expected exactly one generated schemaMappings block/,
    );
  });
});
