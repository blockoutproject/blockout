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

async function listHandwrittenJavaFiles(directory, root = directory) {
  if (!existsSync(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const entryPath = path.join(directory, entry.name);
    const relativePath = relative(root, entryPath);
    if (entry.isDirectory()) {
      if (
        entry.name === 'target' ||
        relativePath === 'event-contracts/src/generated' ||
        relativePath.includes('/src/generated/')
      ) {
        continue;
      }
      files.push(...(await listHandwrittenJavaFiles(entryPath, root)));
    } else if (entry.isFile() && entry.name.endsWith('.java')) {
      files.push(entryPath);
    }
  }

  return files;
}

export function stripJavaNonCode(source) {
  const output = [...source];
  let index = 0;
  let state = 'code';

  const blank = (position) => {
    if (output[position] !== '\n' && output[position] !== '\r') {
      output[position] = ' ';
    }
  };

  while (index < source.length) {
    if (state === 'code') {
      if (source.startsWith('//', index)) {
        blank(index);
        blank(index + 1);
        index += 2;
        state = 'line-comment';
      } else if (source.startsWith('/*', index)) {
        blank(index);
        blank(index + 1);
        index += 2;
        state = 'block-comment';
      } else if (source.startsWith('"""', index)) {
        blank(index);
        blank(index + 1);
        blank(index + 2);
        index += 3;
        state = 'text-block';
      } else if (source[index] === '"') {
        blank(index);
        index += 1;
        state = 'string';
      } else if (source[index] === "'") {
        blank(index);
        index += 1;
        state = 'character';
      } else {
        index += 1;
      }
      continue;
    }

    if (state === 'line-comment') {
      if (source[index] === '\n' || source[index] === '\r') {
        state = 'code';
      } else {
        blank(index);
      }
      index += 1;
      continue;
    }

    if (state === 'block-comment') {
      if (source.startsWith('*/', index)) {
        blank(index);
        blank(index + 1);
        index += 2;
        state = 'code';
      } else {
        blank(index);
        index += 1;
      }
      continue;
    }

    if (state === 'text-block') {
      if (source.startsWith('"""', index)) {
        blank(index);
        blank(index + 1);
        blank(index + 2);
        index += 3;
        state = 'code';
      } else {
        blank(index);
        index += 1;
      }
      continue;
    }

    if (source[index] === '\\') {
      blank(index);
      if (index + 1 < source.length) blank(index + 1);
      index += 2;
    } else {
      const terminator = state === 'string' ? '"' : "'";
      const closesLiteral = source[index] === terminator;
      blank(index);
      index += 1;
      if (closesLiteral) state = 'code';
    }
  }

  return output.join('');
}

export function findHandwrittenEnumDeclarations(source) {
  const code = stripJavaNonCode(source);
  const declarations = [];
  const pattern = /\benum\s+([A-Za-z_$][\w$]*)/g;

  for (const match of code.matchAll(pattern)) {
    declarations.push({
      name: match[1],
      line: code.slice(0, match.index).split('\n').length,
    });
  }

  return declarations;
}

export async function validateBackendEnumsGenerated(root = defaultRoot) {
  const backendRoot = path.join(root, 'apps/backend');
  const javaFiles = await listHandwrittenJavaFiles(backendRoot);
  const errors = [];

  for (const file of javaFiles) {
    const source = await readFile(file, 'utf8');
    for (const declaration of findHandwrittenEnumDeclarations(source)) {
      errors.push(
        `${relative(root, file)}:${declaration.line}: handwritten enum ${declaration.name} must be defined under libs/shared/contracts/specs/source/shared/schemas and generated`,
      );
    }
  }

  if (javaFiles.length === 0) {
    errors.push('No handwritten backend Java source files were inspected');
  }

  return { errors, javaFiles: javaFiles.length };
}

const invokedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]) === scriptFile
  : false;

if (invokedDirectly) {
  const result = await validateBackendEnumsGenerated();
  if (result.errors.length > 0) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(
      `Generated backend enum ownership passed (${result.javaFiles} handwritten Java files, zero enum declarations).`,
    );
  }
}
