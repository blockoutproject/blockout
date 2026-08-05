import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const allContainers = [
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
];

function nxJson(args) {
  const output = execFileSync("npm", ["exec", "--", "nx", ...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  return JSON.parse(output);
}

function affectedContainers(file) {
  return nxJson([
    "show",
    "projects",
    "--affected",
    `--files=${file}`,
    "--with-target=docker:build",
    "--json",
  ]).sort();
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

  assert.deepEqual(
    affectedContainers(
      "libs/shared/contracts/specs/source/shared/schemas/identifier.json",
    ),
    allContainers,
  );

  assert.deepEqual(affectedContainers(".dockerignore"), allContainers);

  assert.deepEqual(
    affectedContainers("docs/current/blockout-product-runtime-context.md"),
    [],
  );
});

test("Docker builds preserve inferred tasks before contract preparation", () => {
  const project = nxJson([
    "show",
    "project",
    "@blockout/club-scraper",
    "--json",
  ]);

  assert.deepEqual(project.targets["docker:build"].dependsOn, [
    "build",
    "^build",
    {
      projects: "@blockout/contracts",
      target: "prepare-consumers",
    },
  ]);
});
