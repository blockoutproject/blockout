import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectV1IsolationViolations,
  validateV1AdapterIsolation,
} from './validate-v1-adapter-isolation.mjs';

test('accepts an isolated v1 adapter mapped to application roles', () => {
  const source = `
package com.blockout.example.api.v1;

import com.blockout.example.application.ExampleService;

@RequestMapping("/api/v1/examples")
final class LegacyExampleController {}
`;

  assert.deepEqual(
    collectV1IsolationViolations(
      source,
      'apps/backend/example/src/main/java/com/blockout/example/api/v1/LegacyExampleController.java',
    ),
    [],
  );
});

test('rejects generated and v2 imports from a v1 adapter', () => {
  const source = `
package com.blockout.example.api.v1;

import com.blockout.generated.example.api.ExamplesApi;
import com.blockout.example.api.v2.ExampleApiMapper;
`;

  const violations = collectV1IsolationViolations(
    source,
    'apps/backend/example/src/main/java/com/blockout/example/api/v1/LegacyExampleController.java',
  );
  assert.equal(violations.length, 2);
});

test('rejects a v2 adapter importing a v1 transport type', () => {
  const source = `
package com.blockout.example.api.v2;

import com.blockout.example.api.v1.LegacyExampleResponse;
`;

  assert.equal(
    collectV1IsolationViolations(
      source,
      'apps/backend/example/src/main/java/com/blockout/example/api/v2/ExampleController.java',
    ).length,
    1,
  );
});

test('rejects a v1 route outside an isolated v1 package', () => {
  const source = `
package com.blockout.example.api;

@RequestMapping(value = "/api/v1/examples")
final class ExampleController {}
`;

  assert.equal(
    collectV1IsolationViolations(
      source,
      'apps/backend/example/src/main/java/com/blockout/example/api/ExampleController.java',
    ).length,
    1,
  );
});

test('validates the live backend source tree', async () => {
  const result = await validateV1AdapterIsolation();
  assert.deepEqual(result.errors, []);
  assert.ok(result.javaFiles > 500);
  assert.ok(result.v1Files > 50);
  assert.ok(result.v1Routes > 20);
});
