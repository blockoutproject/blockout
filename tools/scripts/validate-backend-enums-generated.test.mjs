import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findHandwrittenEnumDeclarations,
  validateBackendEnumsGenerated,
} from './validate-backend-enums-generated.mjs';

test('ignores enum text outside Java code', () => {
  const source = `
// enum CommentedOut { VALUE }
/* enum BlockCommentedOut { VALUE } */
final class Example {
  private final String ordinary = "enum InAString { VALUE }";
  private final String text = """
      enum InATextBlock { VALUE }
      """;
  private final char quote = '\\'';
}
`;

  assert.deepEqual(findHandwrittenEnumDeclarations(source), []);
});

test('rejects standalone and nested handwritten enums with their lines', () => {
  const source = `package com.blockout.example;

enum First { VALUE }
record Container() {
  public enum Nested { VALUE }
}
`;

  assert.deepEqual(findHandwrittenEnumDeclarations(source), [
    { name: 'First', line: 3 },
    { name: 'Nested', line: 5 },
  ]);
});

test('validates the live backend source tree', async () => {
  const result = await validateBackendEnumsGenerated();
  assert.deepEqual(result.errors, []);
  assert.ok(result.javaFiles > 500);
});
