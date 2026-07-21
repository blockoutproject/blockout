import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '../../../../..');
const contractsRoot = path.resolve(scriptDir, '../..');
const bundleScript = path.join(scriptDir, 'bundle-openapi.mjs');

async function jsonFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, {withFileTypes: true});
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(dir, entry.name);
      return entry.isDirectory() ? jsonFiles(entryPath) : [entryPath];
    }),
  );
  return files.flat().filter((file) => file.endsWith('.json')).sort();
}

function enumLocations(value, pointer = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => enumLocations(item, `${pointer}/${index}`));
  }
  if (!value || typeof value !== 'object') {
    return [];
  }

  const current = Object.hasOwn(value, 'enum') ? [pointer] : [];
  return current.concat(
    Object.entries(value).flatMap(([key, child]) => enumLocations(child, `${pointer}/${key}`)),
  );
}

test('workspace fragments produce the shared OpenAPI bundle', async () => {
  const result = spawnSync(process.execPath, [bundleScript], {cwd: workspaceRoot, encoding: 'utf8'});
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const bundle = JSON.parse(
    await readFile(path.join(contractsRoot, 'generated/specs/shared.json'), 'utf8'),
  );
  assert.equal(bundle.openapi, '3.0.3');
  assert.deepEqual(Object.keys(bundle.components.schemas), ['FormatEnum', 'GenderEnum']);
});

test('shared schemas contain only reusable named transport enums', async () => {
  const sharedDir = path.join(contractsRoot, 'specs/source/shared/schemas');
  for (const file of await jsonFiles(sharedDir)) {
    const document = JSON.parse(await readFile(file, 'utf8'));
    const name = path.basename(file, '.json');
    assert.deepEqual(Object.keys(document), [name]);
    assert.ok(name.endsWith('Enum'));
    assert.deepEqual(enumLocations(document), [`/${name}`]);
  }
});

test('service schemas contain no handwritten inline transport enum', async () => {
  const servicesDir = path.join(contractsRoot, 'specs/source/services');
  const inlineEnums = [];
  for (const file of await jsonFiles(servicesDir)) {
    if (!file.includes(`${path.sep}schemas${path.sep}`)) {
      continue;
    }
    const document = JSON.parse(await readFile(file, 'utf8'));
    inlineEnums.push(...enumLocations(document).map((pointer) => `${file}${pointer}`));
  }
  assert.deepEqual(inlineEnums, []);
});

test('code generators use their pinned versions', async () => {
  const config = JSON.parse(await readFile(path.join(workspaceRoot, 'openapitools.json'), 'utf8'));
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, 'package.json'), 'utf8'));
  assert.equal(config['generator-cli'].version, '7.22.0');
  assert.equal(packageJson.devDependencies.orval, '8.22.0');
});

test('generated artifacts are not tracked by Git', () => {
  const tracked = execFileSync('git', ['ls-files'], {cwd: workspaceRoot, encoding: 'utf8'})
    .trim()
    .split('\n')
    .filter(Boolean);
  const generated = tracked.filter(
    (file) =>
      file.startsWith('libs/shared/contracts/generated/') ||
      /^libs\/shared\/python-contract-clients\/src\/blockout_contract_clients\/[^/]+\//.test(file) ||
      file.startsWith('apps/frontend/mobile/src/shared/generated/') ||
      file.includes('/target/generated-sources/openapi/'),
  );
  assert.deepEqual(generated, []);
});
