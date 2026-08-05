import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const nxCli = path.join(workspaceRoot, "node_modules/nx/dist/bin/nx.js");

function affectedContainers(file) {
  const output = execFileSync(
    process.execPath,
    [
      nxCli,
      "show",
      "projects",
      "--affected",
      `--files=${file}`,
      "--with-target=docker:build",
      "--json",
    ],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
    },
  );

  return JSON.parse(output).sort();
}

test("Nx selects only containers affected by representative changes", () => {
  assert.deepEqual(
    affectedContainers(
      "apps/backend/clubs-service/src/main/java/com/blockout/clubs/ClubsApplication.java",
    ),
    ["@blockout/clubs-service"],
  );

  assert.deepEqual(affectedContainers("apps/backend/shared-models/pom.xml"), [
    "@blockout/competition-service",
    "@blockout/config-service",
    "@blockout/matches-service",
    "@blockout/mobile-gateway",
    "@blockout/notification-service",
    "@blockout/pools-service",
    "@blockout/reports-service",
    "@blockout/search-service",
    "@blockout/search-worker",
    "@blockout/teams-service",
    "@blockout/users-service",
  ]);

  assert.deepEqual(affectedContainers(".dockerignore"), [
    "@blockout/club-scraper",
    "@blockout/clubs-service",
    "@blockout/competition-scraper",
    "@blockout/competition-service",
    "@blockout/config-service",
    "@blockout/matches-service",
    "@blockout/mobile-gateway",
    "@blockout/notification-service",
    "@blockout/pools-service",
    "@blockout/reports-service",
    "@blockout/search-service",
    "@blockout/search-worker",
    "@blockout/teams-service",
    "@blockout/users-service",
  ]);

  assert.deepEqual(
    affectedContainers("docs/current/blockout-product-runtime-context.md"),
    [],
  );
});
