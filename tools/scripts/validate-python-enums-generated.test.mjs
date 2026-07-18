import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findHandwrittenPythonEnums,
  validatePythonEnumsGenerated,
} from './validate-python-enums-generated.mjs';

test('ignores enum names in comments and strings', () => {
  const source = `
# from enum import Enum
text = "class Hidden(Enum): pass"
description = '''IntEnum is mentioned here'''
`;

  assert.deepEqual(findHandwrittenPythonEnums(source), []);
});

test('rejects handwritten enum bases with their lines', () => {
  const source = `from enum import Enum, IntEnum as IntegerEnum
import enum

class First(Enum):
    pass

class Second(enum.StrEnum):
    pass

class Third(IntegerEnum):
    pass

class Fourth(custom.Enum):
    pass
`;

  assert.deepEqual(findHandwrittenPythonEnums(source), [
    { kind: 'enum declaration First', line: 4 },
    { kind: 'enum declaration Second', line: 7 },
    { kind: 'enum declaration Third', line: 10 },
    { kind: 'enum declaration Fourth', line: 13 },
  ]);
});

test('validates the live scraper source tree', async () => {
  const result = await validatePythonEnumsGenerated();
  assert.deepEqual(result.errors, []);
  assert.ok(result.pythonFiles > 50);
});
