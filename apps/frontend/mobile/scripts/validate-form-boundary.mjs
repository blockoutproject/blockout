import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = join(mobileRoot, 'src');

const legacyFormikYupFiles = new Set([
  'src/components/club/ClubForm.tsx',
  'src/components/division/DivisionForm.tsx',
  'src/components/match/form/MatchLiveLinkForm.tsx',
  'src/components/match/form/MatchLiveLinkReportForm.tsx',
  'src/components/pool/PoolForm.tsx',
  'src/components/report/ReportForm.tsx',
  'src/components/team/TeamForm.tsx',
  'src/components/user/ProfileForm.tsx',
]);

const centralFormApi = 'src/forms/index.ts';
const generatedWireSchemas = 'src/api/generated/mobile-gateway/schemas/';
const modernFormPackages = ['react-hook-form', '@hookform/resolvers', 'zod'];
const legacyFormPackages = ['formik', 'yup'];
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const importPattern =
  /(?:\bfrom\s+|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

const failures = [];
const observedLegacyFiles = new Set();

for (const file of walk(sourceRoot)) {
  const relativeFile = relative(mobileRoot, file).replaceAll('\\', '/');
  const source = readFileSync(file, 'utf8');

  for (const packageName of importedPackages(source)) {
    if (matchesPackage(packageName, legacyFormPackages)) {
      observedLegacyFiles.add(relativeFile);
      if (!legacyFormikYupFiles.has(relativeFile)) {
        failures.push(
          `${relativeFile}: new ${packageName} import is forbidden; use src/forms/index.ts`,
        );
      }
    }

    if (
      matchesPackage(packageName, modernFormPackages) &&
      relativeFile !== centralFormApi &&
      !(packageName === 'zod' && relativeFile.startsWith(generatedWireSchemas))
    ) {
      failures.push(
        `${relativeFile}: import ${packageName} through src/forms/index.ts`,
      );
    }
  }
}

for (const legacyFile of legacyFormikYupFiles) {
  if (!observedLegacyFiles.has(legacyFile)) {
    failures.push(
      `${legacyFile}: remove this migrated file from the Formik/Yup allowlist`,
    );
  }
}

if (failures.length > 0) {
  console.error('Mobile form boundary validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Mobile form boundary is valid (${legacyFormikYupFiles.size} transition-only Formik/Yup forms).`,
  );
}

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (sourceExtensions.has(extension(entry.name))) files.push(path);
  }
  return files;
}

function extension(fileName) {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index);
}

function importedPackages(source) {
  const imports = [];
  for (const match of source.matchAll(importPattern)) imports.push(match[1]);
  return imports;
}

function matchesPackage(importedPackage, packageNames) {
  return packageNames.some(
    (packageName) =>
      importedPackage === packageName ||
      importedPackage.startsWith(`${packageName}/`),
  );
}
