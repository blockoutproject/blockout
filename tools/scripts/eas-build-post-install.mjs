/**
 * This script is used to patch the '@nx/expo' package to work with EAS Build.
 * It is run as a eas-build-post-install script in the 'package.json' of expo app.
 * It is executed as 'node tools/scripts/eas-build-post-install.mjs <workspace root> <project root>'
 * It will create a symlink from the project's node_modules to the workspace's node_modules.
 */

import { spawnSync } from 'node:child_process';
import { symlinkSync, existsSync } from 'node:fs';
import { join } from 'path';

const [workspaceRoot, projectRoot] = process.argv.slice(2);

if (existsSync(join(workspaceRoot, 'node_modules'))) {
  console.log('Symlink already exists');
} else {
  symlinkSync(
    join(projectRoot, 'node_modules'),
    join(workspaceRoot, 'node_modules'),
    'dir',
  );
  console.log('Symlink created');
}

const generation = spawnSync(
  'npm',
  ['exec', 'nx', 'run', '@blockout/mobile:codegen', '--skip-nx-cache'],
  {
    cwd: workspaceRoot,
    stdio: 'inherit',
  },
);

if (generation.status !== 0) {
  process.exit(generation.status ?? 1);
}

console.log('Generated mobile contract clients from authoritative sources.');
