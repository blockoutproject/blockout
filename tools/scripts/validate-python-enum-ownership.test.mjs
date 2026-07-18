import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findContractEnumMirrors,
  findPythonEnumDeclarations,
  validatePythonEnumOwnership,
} from './validate-python-enum-ownership.mjs';

const contractEnums = [
  {
    name: 'FormatEnum',
    members: [
      { name: 'FOUR', value: 'FOUR' },
      { name: 'SIX', value: 'SIX' },
    ],
  },
];

test('parses Python enums without matching comments or strings', () => {
  const source = `
# class Hidden(Enum): pass
text = "class AlsoHidden(IntEnum): pass"
from enum import IntEnum

class DataSourcePriority(IntEnum):
    DB = 0
    FFVB = 1
`;

  assert.deepEqual(findPythonEnumDeclarations(source), [
    {
      line: 6,
      members: [
        { name: 'DB', value: 0 },
        { name: 'FFVB', value: 1 },
      ],
      name: 'DataSourcePriority',
    },
  ]);
});

test('allows an application enum that has no contract owner', () => {
  const source = `from enum import IntEnum

class DataSourcePriority(IntEnum):
    DB = 0
    FFVB = 1
    LNV_XML = 2
    LNV_HTML = 3
`;

  assert.deepEqual(findContractEnumMirrors(source, contractEnums), []);
});

test('rejects a handwritten enum with the contract concept name', () => {
  const source = `from enum import Enum

class Format(Enum):
    UNKNOWN = "UNKNOWN"
`;

  assert.deepEqual(findContractEnumMirrors(source, contractEnums), [
    {
      contract: 'FormatEnum',
      kind: 'contract enum name mirror Format',
      line: 3,
    },
  ]);
});

test('rejects a renamed handwritten enum with the contract members and values', () => {
  const source = `import enum

class LocalShape(enum.StrEnum):
    FOUR = "FOUR"
    SIX = "SIX"
`;

  assert.deepEqual(findContractEnumMirrors(source, contractEnums), [
    {
      contract: 'FormatEnum',
      kind: 'contract enum value mirror LocalShape',
      line: 3,
    },
  ]);
});

test('validates the live scraper source tree against live contract enums', async () => {
  const result = await validatePythonEnumOwnership();
  assert.deepEqual(result.errors, []);
  assert.ok(result.contractEnums > 10);
  assert.ok(result.pythonFiles > 50);
});
