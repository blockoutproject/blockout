import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

import {
  BUNDLE_ROOT,
  DEPLOYABLE_NAMES,
  JAVA_OUTPUT_ROOT,
  SOURCE_ROOT,
  parseAsyncApiFile,
  readJson,
  resolveLocalReferences,
  stableJson,
} from './event-contract-utils.mjs';

const require = createRequire(import.meta.url);
const lifecycleFile = path.join(SOURCE_ROOT, 'shared/schemas/lifecycle.json');
const catalogFile = path.join(SOURCE_ROOT, 'catalog.json');
const generatedPackage = path.join(
  JAVA_OUTPUT_ROOT,
  'com/blockout/events/v2/model',
);

test('pins the approved parser and Modelina versions exactly', () => {
  assert.equal(require('@asyncapi/parser/package.json').version, '3.6.0');
  assert.equal(require('@asyncapi/modelina/package.json').version, '5.10.1');
});

test('validates local-only AsyncAPI 3 sources and committed resolved bundles', async () => {
  const sourceFiles = [
    catalogFile,
    ...DEPLOYABLE_NAMES.map((name) =>
      path.join(SOURCE_ROOT, 'deployables', `${name}.json`),
    ),
  ];
  for (const source of sourceFiles) {
    await parseAsyncApiFile(source);
    const serialized = JSON.stringify(await readJson(source));
    assert.doesNotMatch(serialized, /"\$ref":"(?:https?|registry):/);
    const output = path.join(BUNDLE_ROOT, path.basename(source));
    await parseAsyncApiFile(output);
    assert.doesNotMatch(await readFile(output, 'utf8'), /"\$ref"/);
    assert.equal(
      await readFile(output, 'utf8'),
      stableJson(await resolveLocalReferences(source)),
    );
  }
});

test('keeps the catalog component-only and the six lifecycle envelopes exact', async () => {
  const catalog = await readJson(catalogFile);
  assert.equal(catalog.asyncapi, '3.0.0');
  assert.equal(catalog.channels, undefined);
  assert.equal(catalog.operations, undefined);
  assert.equal(catalog.servers, undefined);
  assert.equal(Object.keys(catalog.components.messages).length, 6);
  assert.equal(Object.keys(catalog.components.schemas).length, 14);

  const definitions = (await readJson(lifecycleFile)).$defs;
  const common = definitions.EventEnvelope;
  const eventNames = Object.keys(definitions).filter((name) =>
    /V2Event$/.test(name),
  );
  assert.equal(eventNames.length, 6);
  for (const name of eventNames) {
    assert.deepEqual(
      Object.keys(definitions[name].properties).sort(),
      Object.keys(common.properties).sort(),
      name,
    );
    assert.deepEqual(definitions[name].required, common.required, name);
    assert.equal(definitions[name].properties.schemaVersion.const, '2.0.0');
    assert.equal(definitions[name].additionalProperties, false);
  }
  assert.deepEqual(definitions.EventType.enum, [
    'CLUB_UPSERT',
    'TEAM_UPSERT',
    'POOL_UPSERT',
    'CLUB_DEACTIVATED',
    'TEAM_DEACTIVATED',
    'POOL_DEACTIVATED',
  ]);
});

test('reconciles all eleven routes and nineteen primary queues without orphan activation', async () => {
  const catalog = await readJson(catalogFile);
  const routes = catalog['x-blockout-route-reconciliation'];
  const queues = catalog['x-blockout-queue-reconciliation'];
  assert.deepEqual(Object.keys(routes).sort(), [
    'EV-CD',
    'EV-CU',
    'EV-MF',
    'EV-ML',
    'EV-PD',
    'EV-PF',
    'EV-PU',
    'EV-TD',
    'EV-TF',
    'EV-TPD',
    'EV-TU',
  ]);
  assert.deepEqual(
    Object.keys(queues),
    Array.from(
      { length: 19 },
      (_, index) => `Q-${String(index + 1).padStart(2, '0')}`,
    ),
  );
  assert.deepEqual(
    Object.entries(routes)
      .filter(([, value]) => value.disposition === 'active')
      .map(([id]) => id)
      .sort(),
    ['EV-CD', 'EV-CU', 'EV-PD', 'EV-PU', 'EV-TD', 'EV-TU'],
  );
  assert.deepEqual(
    ['Q-11', 'Q-12', 'Q-13', 'Q-16', 'Q-17'].map(
      (id) => queues[id].disposition,
    ),
    ['excluded', 'excluded', 'excluded', 'excluded', 'excluded'],
  );
  assert.equal(routes['EV-TPD'].route, null);

  const roots = await Promise.all(
    DEPLOYABLE_NAMES.map((name) =>
      readJson(path.join(SOURCE_ROOT, 'deployables', `${name}.json`)),
    ),
  );
  const activeAddresses = new Set(
    (
      await Promise.all(
        roots.flatMap((root) =>
          Object.values(root.channels).map(async (reference) => {
            const [file, fragment] = reference.$ref.split('#');
            const channelFile = path.resolve(SOURCE_ROOT, 'deployables', file);
            const channelDocument = await readJson(channelFile);
            return fragment
              .slice(1)
              .split('/')
              .filter(Boolean)
              .reduce((value, part) => value[part], channelDocument).address;
          }),
        ),
      )
    ).flat(),
  );
  assert.deepEqual([...activeAddresses].sort(), [
    'club.deactivation.v2',
    'club.upsert.v2',
    'pool.deactivation.v2',
    'pool.upsert.v2',
    'team.deactivation.v2',
    'team.upsert.v2',
  ]);
  const declaredQueues = roots.flatMap(
    (root) => root['x-blockout-primary-queues'] ?? [],
  );
  assert.equal(declaredQueues.length, 10);
  assert.equal(new Set(declaredQueues).size, 10);
  assert.ok(!JSON.stringify(roots).includes('teambypool.deactivation.v2'));
});

test('commits generated Java 21 records with no runtime framework leakage', async () => {
  const files = (await readdir(generatedPackage))
    .filter((name) => name.endsWith('.java'))
    .sort();
  assert.equal(files.length, 13);
  assert.deepEqual(files, [
    'ClubDeactivationV2Event.java',
    'ClubDeactivationV2Payload.java',
    'ClubUpsertV2Event.java',
    'ClubUpsertV2Payload.java',
    'EventType.java',
    'PoolDeactivationV2Event.java',
    'PoolDeactivationV2Payload.java',
    'PoolUpsertV2Event.java',
    'PoolUpsertV2Payload.java',
    'TeamDeactivationV2Event.java',
    'TeamDeactivationV2Payload.java',
    'TeamUpsertV2Event.java',
    'TeamUpsertV2Payload.java',
  ]);
  const source = await Promise.all(
    files.map((file) => readFile(path.join(generatedPackage, file), 'utf8')),
  );
  for (const java of source) {
    assert.match(java, /package com\.blockout\.events\.v2\.model;/);
    assert.match(java, /Generated by @asyncapi\/modelina 5\.10\.1/);
    assert.doesNotMatch(
      java,
      /Spring|lombok|jakarta\.persistence|MapStruct|JsonProperty|JsonAlias|PropertyNamingStrategies|__TypeId__/,
    );
  }
  for (const java of source.filter(
    (value) => !value.includes('enum EventType'),
  )) {
    assert.match(java, /public record /);
  }
  const generator = await readFile(
    path.join(SOURCE_ROOT, '../scripts/generate-java-events.mjs'),
    'utf8',
  );
  assert.match(generator, /collectionType: 'List'/);
  assert.match(generator, /modelType: 'record'/);
});

test('locks golden camelCase bodies, AMQP properties, and stable headers', async () => {
  const fixtures = await readJson(
    path.join(SOURCE_ROOT, '../tests/golden/lifecycle.json'),
  );
  const definitions = (await readJson(lifecycleFile)).$defs;
  assert.equal(Object.keys(fixtures).length, 6);
  for (const [name, fixture] of Object.entries(fixtures)) {
    const schema = definitions[name];
    assert.ok(schema, name);
    assert.deepEqual(
      Object.keys(fixture.body).sort(),
      Object.keys(schema.properties).sort(),
      name,
    );
    const payloadName = `${name.replace(/V2Event$/, '')}V2Payload`;
    assert.deepEqual(
      Object.keys(fixture.body.payload).sort(),
      Object.keys(definitions[payloadName].properties).sort(),
      name,
    );
    assert.equal(fixture.amqpProperties.messageId, fixture.body.eventId);
    assert.equal(fixture.amqpProperties.type, fixture.body.eventType);
    assert.equal(fixture.amqpProperties.timestamp, fixture.body.occurredAt);
    assert.equal(
      fixture.amqpProperties.correlationId,
      fixture.body.correlationId,
    );
    assert.equal(
      fixture.headers['x-blockout-schema-version'],
      fixture.body.schemaVersion,
    );
    assert.equal(fixture.headers['x-blockout-producer'], fixture.body.producer);
    assert.equal(
      fixture.headers['x-blockout-ordering-key'],
      fixture.body.orderingKey,
    );
    assert.equal(
      fixture.headers['x-blockout-aggregate-version'],
      fixture.body.aggregateVersion,
    );
    assert.ok(!JSON.stringify(fixture).includes('__TypeId__'));
    assert.deepEqual(findUnderscoredKeys(fixture.body), []);
  }
});

function findUnderscoredKeys(value, found = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => findUnderscoredKeys(item, found));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key.includes('_')) found.push(key);
      findUnderscoredKeys(item, found);
    }
  }
  return found;
}
