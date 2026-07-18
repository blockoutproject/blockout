import { spawnSync } from 'node:child_process';

const generatedPythonPrefix =
  'libs/shared/contracts/clients/python/src/blockout_contract_clients/';

const tracked = spawnSync('git', ['ls-files', '-z'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

if (tracked.status !== 0) {
  process.stderr.write(tracked.stderr);
  process.exit(tracked.status ?? 1);
}

const violations = tracked.stdout
  .split('\0')
  .filter(Boolean)
  .filter(
    (file) =>
      file.startsWith('generated/') ||
      file.includes('/generated/') ||
      file.startsWith(generatedPythonPrefix),
  )
  .sort((left, right) => left.localeCompare(right));

if (violations.length > 0) {
  console.error('Generated artifacts must not be tracked by Git:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('No generated contract artifact is tracked by Git.');
