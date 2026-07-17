import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectContractViolations,
  collectTypeScriptSnakeKeys,
  validateAllowlistShape,
  validateRepository,
} from './validate-wire-casing.mjs';

test('accepts canonical REST and event wire names', () => {
  const result = collectContractViolations({
    properties: { requestId: { type: 'string' } },
    parameter: { in: 'query', name: 'pageSize' },
  });
  assert.deepEqual(result.violations, []);
  assert.equal(result.wireNames, 2);
});

test('excludes approved AMQP protocol headers from JSON key casing', () => {
  const result = collectContractViolations(
    { properties: { 'x-blockout-schema-version': { type: 'string' } } },
    'events/source/shared/headers/blockout-v2-headers.json',
  );
  assert.deepEqual(result.violations, []);
  assert.equal(result.wireNames, 0);
});

test('rejects snake_case REST and event wire names', () => {
  const result = collectContractViolations({
    properties: { request_id: { type: 'string' } },
    parameter: { in: 'query', name: 'page_size' },
  });
  assert.equal(result.violations.length, 2);
});

test('finds TypeScript snake_case object keys without flagging identifiers', () => {
  assert.deepEqual(
    collectTypeScriptSnakeKeys(
      'const request_id = 1; const body = { request_id: request_id };',
    ),
    [{ file: 'fixture.ts', key: 'request_id', line: 1 }],
  );
});

test('rejects allowlist category expansion', () => {
  const errors = validateAllowlistShape({
    version: 1,
    v1Adapters: { snakeCaseMappers: [], snakeCaseRequestParameters: [] },
    databaseColumns: { javaAnnotations: [] },
    pythonIdentifiers: { roots: [] },
    externalVendorPayloads: [],
    broadException: {},
  });
  assert.ok(errors.includes('Unknown allowlist category: broadException'));
});

test('current repository satisfies the complete wire casing guard', async () => {
  const summary = await validateRepository();
  assert.ok(summary.contractWireNames > 0);
  assert.equal(summary.v1Mappers, 12);
  assert.ok(summary.pythonWireNames > 0);
});
