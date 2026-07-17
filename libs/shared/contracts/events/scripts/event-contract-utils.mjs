import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { DiagnosticSeverity, Parser, fromFile } from '@asyncapi/parser';

export const EVENT_ROOT = path.resolve('libs/shared/contracts/events');
export const SOURCE_ROOT = path.join(EVENT_ROOT, 'source');
export const BUNDLE_ROOT = path.resolve(
  'libs/shared/contracts/generated/events',
);
export const JAVA_OUTPUT_ROOT = path.resolve(
  'apps/backend/event-contracts/src/generated/java',
);
export const JAVA_PACKAGE = 'com.blockout.events.v2.model';
export const DEPLOYABLE_NAMES = [
  'clubs-service',
  'competition-service',
  'matches-service',
  'notification-service',
  'pools-service',
  'search-worker',
  'teams-service',
  'users-service',
];

const documentCache = new Map();

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function parseAsyncApiFile(file) {
  const result = await fromFile(new Parser(), file).parse();
  const errors = result.diagnostics.filter(
    (diagnostic) => diagnostic.severity === DiagnosticSeverity.Error,
  );
  if (!result.document || errors.length > 0) {
    const details = errors.map(
      (diagnostic) =>
        `${diagnostic.path?.join('.') ?? '<root>'}: ${diagnostic.message}`,
    );
    throw new Error(
      `AsyncAPI validation failed for ${path.relative(process.cwd(), file)}\n${details.join('\n')}`,
    );
  }
  if (result.document.version() !== '3.0.0') {
    throw new Error(
      `${path.relative(process.cwd(), file)} must use AsyncAPI 3.0.0.`,
    );
  }
  return result.document;
}

export async function resolveLocalReferences(file) {
  return resolveNode(await loadDocument(file), path.resolve(file), []);
}

async function loadDocument(file) {
  const absolute = path.resolve(file);
  if (!documentCache.has(absolute)) {
    documentCache.set(absolute, readJson(absolute));
  }
  return documentCache.get(absolute);
}

async function resolveNode(node, currentFile, stack) {
  if (Array.isArray(node)) {
    return Promise.all(
      node.map((item) => resolveNode(item, currentFile, stack)),
    );
  }
  if (!node || typeof node !== 'object') {
    return node;
  }
  if ('$ref' in node) {
    if (Object.keys(node).length !== 1) {
      throw new Error(
        `Reference siblings are forbidden in ${path.relative(process.cwd(), currentFile)}.`,
      );
    }
    const reference = node.$ref;
    if (
      typeof reference !== 'string' ||
      /^[a-z][a-z0-9+.-]*:/i.test(reference)
    ) {
      throw new Error(
        `Remote or invalid reference is forbidden: ${String(reference)}`,
      );
    }
    const [relativeFile, fragment = ''] = reference.split('#', 2);
    const targetFile = relativeFile
      ? path.resolve(path.dirname(currentFile), relativeFile)
      : currentFile;
    const identity = `${targetFile}#${fragment}`;
    if (stack.includes(identity)) {
      throw new Error(
        `Cyclic reference detected: ${[...stack, identity].join(' -> ')}`,
      );
    }
    const target = resolvePointer(await loadDocument(targetFile), fragment);
    return resolveNode(target, targetFile, [...stack, identity]);
  }
  return Object.fromEntries(
    await Promise.all(
      Object.entries(node).map(async ([key, value]) => [
        key,
        await resolveNode(value, currentFile, stack),
      ]),
    ),
  );
}

function resolvePointer(document, fragment) {
  if (!fragment) {
    return document;
  }
  if (!fragment.startsWith('/')) {
    throw new Error(`Only JSON Pointer fragments are supported: #${fragment}`);
  }
  return fragment
    .slice(1)
    .split('/')
    .map((part) =>
      decodeURIComponent(part).replaceAll('~1', '/').replaceAll('~0', '~'),
    )
    .reduce((value, part) => {
      if (!value || typeof value !== 'object' || !(part in value)) {
        throw new Error(`Unresolved JSON Pointer fragment: #${fragment}`);
      }
      return value[part];
    }, document);
}

export function stableJson(value) {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeys(value[key])]),
  );
}
