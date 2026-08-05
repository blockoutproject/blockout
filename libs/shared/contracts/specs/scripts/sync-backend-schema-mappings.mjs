import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sharedSchemasDir = path.resolve(scriptDir, "../source/shared/schemas");
const backendPom = path.resolve(
  scriptDir,
  "../../../../../apps/backend/pom.xml",
);
const markerStart = "<!-- BEGIN generated schemaMappings -->";
const markerEnd = "<!-- END generated schemaMappings -->";
const checkOnly = process.argv.includes("--check");

async function schemaNames() {
  const files = (await readdir(sharedSchemasDir))
    .filter((file) => file.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));
  const names = [];
  for (const file of files) {
    names.push(
      ...Object.keys(
        JSON.parse(await readFile(path.join(sharedSchemasDir, file), "utf8")),
      ),
    );
  }
  return names.sort((left, right) => left.localeCompare(right));
}

function mappingBlock(names) {
  return [
    "                        <!-- BEGIN generated schemaMappings -->",
    "                        <schemaMappings>",
    ...names.map(
      (name) =>
        `                            <schemaMapping>${name}=com.blockout.shared.model.${name}</schemaMapping>`,
    ),
    "                        </schemaMappings>",
    "                        <!-- END generated schemaMappings -->",
  ].join("\n");
}

try {
  const pom = await readFile(backendPom, "utf8");
  const start = pom.indexOf(markerStart);
  const end = pom.indexOf(markerEnd);
  if (start === -1 || end < start) {
    throw new Error(
      "Could not find schemaMappings markers in apps/backend/pom.xml",
    );
  }

  const blockStart = pom.lastIndexOf("\n", start) + 1;
  const endOfLine = pom.indexOf("\n", end);
  const blockEnd = endOfLine === -1 ? pom.length : endOfLine + 1;
  const updated = `${pom.slice(0, blockStart)}${mappingBlock(await schemaNames())}\n${pom.slice(blockEnd)}`;
  if (updated !== pom) {
    if (checkOnly) {
      throw new Error(
        "Backend schema mappings are stale. Run the sync-backend-schema-mappings target and commit the result.",
      );
    }
    await writeFile(backendPom, updated, "utf8");
  }
  console.log(
    checkOnly
      ? "Backend schema mappings are fresh"
      : `Schema mappings synced to ${backendPom}`,
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
