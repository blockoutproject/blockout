import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  BUNDLE_ROOT,
  DEPLOYABLE_NAMES,
  SOURCE_ROOT,
  parseAsyncApiFile,
  resolveLocalReferences,
  stableJson,
} from './event-contract-utils.mjs';

await mkdir(BUNDLE_ROOT, { recursive: true });

const sources = [
  ['catalog', path.join(SOURCE_ROOT, 'catalog.json')],
  ...DEPLOYABLE_NAMES.map((name) => [
    name,
    path.join(SOURCE_ROOT, 'deployables', `${name}.json`),
  ]),
];

for (const [name, source] of sources) {
  await parseAsyncApiFile(source);
  const bundle = await resolveLocalReferences(source);
  const output = path.join(BUNDLE_ROOT, `${name}.json`);
  await writeFile(output, stableJson(bundle));
  await parseAsyncApiFile(output);
  console.log(`Event contract written to ${output}`);
}
