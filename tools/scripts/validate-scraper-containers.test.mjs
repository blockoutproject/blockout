import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const scrapers = [
  {
    directory: 'apps/scrapers/club-scraper',
    packageName: 'blockout-club-scraper',
  },
  {
    directory: 'apps/scrapers/competition-scraper',
    packageName: 'blockout-competition-scraper',
  },
];

async function read(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), 'utf8');
}

for (const scraper of scrapers) {
  test(`${scraper.packageName} keeps the simple two-stage container shape`, async () => {
    const dockerfile = await read(`${scraper.directory}/Dockerfile`);
    const stages = dockerfile.match(/^FROM\s+/gm) ?? [];
    const commands = dockerfile.match(/^RUN\s+/gm) ?? [];
    const runtime = dockerfile.slice(dockerfile.lastIndexOf('FROM '));

    assert.equal(stages.length, 2);
    assert.equal(commands.length, 1);
    assert.match(dockerfile, /^FROM python:3\.12-alpine AS builder$/m);
    assert.match(
      dockerfile,
      /^COPY --from=ghcr\.io\/astral-sh\/uv:0\.11\.29 \/uv \/bin\/uv$/m,
    );
    assert.equal(
      dockerfile.match(
        new RegExp(
          `^RUN uv sync --locked --package ${scraper.packageName} --no-dev --no-editable$`,
          'gm',
        ),
      )?.length,
      1,
    );
    assert.doesNotMatch(dockerfile, /^FROM ghcr\.io\/astral-sh\/uv:/m);
    assert.doesNotMatch(dockerfile, /\bnx\b/i);
    assert.doesNotMatch(runtime, /\buv\b/);
    assert.match(runtime, /^WORKDIR \/app$/m);
    assert.match(runtime, /TZ=UTC/);
    assert.match(runtime, /^CMD \["python", "main\.py"\]$/m);
  });

  test(`${scraper.packageName} excludes unused test tools from runtime dependencies`, async () => {
    const pyproject = await read(`${scraper.directory}/pyproject.toml`);

    for (const dependency of ['pytest', 'aioresponses', 'faker']) {
      assert.doesNotMatch(pyproject, new RegExp(`"${dependency}==`));
    }
    assert.doesNotMatch(pyproject, /^\[dependency-groups\]/m);
  });
}
