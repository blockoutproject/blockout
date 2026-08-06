const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const packageRoot = join(process.cwd(), "node_modules/@nx/maven");
const packageJsonPath = join(packageRoot, "package.json");
const executorPath = join(
  packageRoot,
  "dist/executors/maven/maven-batch.impl.js",
);

const original =
  "const javaArgs = ['-jar', batchRunnerJar, `--workspaceRoot=${devkit_1.workspaceRoot}`];";
const patched =
  "const javaArgs = ['-XX:ActiveProcessorCount=1', '-jar', batchRunnerJar, `--workspaceRoot=${devkit_1.workspaceRoot}`];";

const { version } = JSON.parse(readFileSync(packageJsonPath, "utf8"));
if (version !== "23.1.0") {
  throw new Error(
    `Unsupported @nx/maven version ${version}; review the temporary batch runner patch before upgrading.`,
  );
}

const executor = readFileSync(executorPath, "utf8");
if (executor.includes(patched)) {
  console.log("Nx Maven batch runner patch already applied.");
} else {
  const firstOccurrence = executor.indexOf(original);
  if (
    firstOccurrence === -1 ||
    firstOccurrence !== executor.lastIndexOf(original)
  ) {
    throw new Error("Unexpected @nx/maven batch runner spawn signature.");
  }

  // Temporary workaround for https://github.com/nrwl/nx/pull/34046.
  // This JVM-only option does not propagate to Maven test JVMs.
  writeFileSync(executorPath, executor.replace(original, patched));
  console.log("Applied the temporary Nx Maven batch runner patch.");
}
