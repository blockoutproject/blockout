import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);
const defaultRoot = path.resolve(scriptDir, '../..');

function relative(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

async function listFiles(root) {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const entryPath = path.join(root, entry.name);
        if (entry.isDirectory()) return listFiles(entryPath);
        return entry.isFile() && entry.name.endsWith('.java')
          ? [entryPath]
          : [];
      }),
  );
  return nested.flat();
}

export function collectV1IsolationViolations(source, file = 'Fixture.java') {
  const violations = [];
  const packageName = source.match(/^package\s+([\w.]+);/m)?.[1];
  if (!packageName) return [`${file}: Java package declaration is missing`];

  const v1Package = /(?:^|\.)v1(?:\.|$)/.test(packageName);
  const v2Package = /(?:^|\.)v2(?:\.|$)/.test(packageName);
  const v1Path = file.split('/').includes('v1');
  const imports = [...source.matchAll(/^import\s+([\w.]+);/gm)].map(
    (match) => match[1],
  );

  if (v1Package && !v1Path) {
    violations.push(`${file}: v1 package is outside a physical v1 directory`);
  }
  if (v1Path && !v1Package) {
    violations.push(
      `${file}: physical v1 directory does not declare a v1 package`,
    );
  }
  if (v1Package) {
    for (const imported of imports) {
      if (/(?:^|\.)generated(?:\.|$)/.test(imported)) {
        violations.push(
          `${file}: v1 adapter imports generated canonical type ${imported}`,
        );
      }
      if (/(?:^|\.)v2(?:\.|$)/.test(imported)) {
        violations.push(
          `${file}: v1 adapter imports v2 adapter type ${imported}`,
        );
      }
    }
  }
  if (v2Package) {
    for (const imported of imports) {
      if (/(?:^|\.)v1(?:\.|$)/.test(imported)) {
        violations.push(
          `${file}: v2 adapter imports v1 adapter type ${imported}`,
        );
      }
    }
  }

  const ownsV1Route = /@RequestMapping\s*\([^)]*["']\/api\/v1(?:\/|["'])/s.test(
    source,
  );
  if (ownsV1Route && !v1Package) {
    violations.push(
      `${file}: /api/v1 controller route is outside a v1 package`,
    );
  }

  return violations;
}

export async function validateV1AdapterIsolation(root = defaultRoot) {
  const javaFiles = await listFiles(path.join(root, 'apps/backend'));
  const mainFiles = javaFiles.filter(
    (file) => file.includes('/src/main/java/') && !file.includes('/target/'),
  );
  const errors = [];
  let v1Files = 0;
  let v1Routes = 0;

  for (const file of mainFiles) {
    const fileName = relative(root, file);
    const source = await readFile(file, 'utf8');
    if (/^package\s+[\w.]*\.v1(?:\.|;)/m.test(source)) v1Files += 1;
    if (/@RequestMapping\s*\([^)]*["']\/api\/v1(?:\/|["'])/s.test(source)) {
      v1Routes += 1;
    }
    errors.push(...collectV1IsolationViolations(source, fileName));
  }

  if (v1Files === 0) errors.push('No isolated v1 adapter files were inspected');
  if (v1Routes === 0)
    errors.push('No isolated /api/v1 controller routes were inspected');

  return { errors, javaFiles: mainFiles.length, v1Files, v1Routes };
}

const invokedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]) === scriptFile
  : false;

if (invokedDirectly) {
  const result = await validateV1AdapterIsolation();
  if (result.errors.length > 0) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(
      `V1 adapter isolation passed (${result.javaFiles} Java files, ${result.v1Files} v1 adapter files, ${result.v1Routes} v1 controller routes).`,
    );
  }
}
