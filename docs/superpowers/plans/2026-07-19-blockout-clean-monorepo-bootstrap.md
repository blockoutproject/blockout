# Blockout Clean Monorepo Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset Blockout and import the clean standalone applications into a simple, functional Nx monorepo.

**Architecture:** Nx orchestrates the native Maven, Expo, Python, and Docker commands. Application code is copied unchanged from recorded standalone commits; only repository location, root orchestration, local Compose, and minimal documentation are added.

**Tech Stack:** Nx 23.1.0, Maven, Java 21, Spring Boot 3.4.5, Expo 54, React Native 0.81.5, Python 3.12, Docker Compose.

---

## Source map

| Source | Commit | Target |
| --- | --- | --- |
| `blockout-api-clubs` | `4655f7de69df9854a35a7062cb60b65293e5ce42` | `apps/backend/clubs-service` |
| `blockout-api-competition` | `7e88fd34f0270dbbfc5a9f0be5d7bc295df9746c` | `apps/backend/competition-service` |
| `blockout-api-config` | `e2cfcf383cdc59c8466850518438c834a7b7c244` | `apps/backend/config-service` |
| `blockout-api-matches` | `dcf4f00599636ab25a33cacfd0c9ee477d651e45` | `apps/backend/matches-service` |
| `blockout-api-notifications` | `cef516fd2b15d308f308b8b2d8169c3bce6abae5` | `apps/backend/notification-service` |
| `blockout-api-pools` | `cc412b7b66c5fcb6be583fee1a3508cd3f926a99` | `apps/backend/pools-service` |
| `blockout-api-reports` | `5ee565bda73087a70b6f747162dca3d89493f87c` | `apps/backend/reports-service` |
| `blockout-api-search` | `1af0a2b2bd8537aba1c1e3838b145d760d916dea` | `apps/backend/search-service` |
| `blockout-api-teams` | `e70603fa1524b6bc0b13624195fda229e15ee686` | `apps/backend/teams-service` |
| `blockout-api-users` | `f4693e1141a2b55910bde7149c5489face9987cf` | `apps/backend/users-service` |
| `blockout-mobile-gateway` | `665e206fc82453e076c186be99d89f59c79da0f9` | `apps/backend/mobile-gateway` |
| `blockout-worker-search` | `6b8dff9f7df7e9a7d069271d59404714498f1bdc` | `apps/backend/search-worker` |
| `blockout-scraper-clubs` | `29efabe975c3222aae14a7253aa627d39c61a693` | `apps/backend/club-scraper` |
| `blockout-scraper` | `01d05346b7a8f81b00ad16f0618cb55060f111e8` | `apps/backend/competition-scraper` |
| `blockout-mobile-app` | `cfff3d7b9ade0e89f21af12cb21e4f0ba2902119` | `apps/frontend/mobile` |
| `blockout-pgadmin` | `1e62dc36c1a11b66edd7e448a96ed1db5315120e` | Compose reference only |

### Task 1: Reset to a minimal Nx shell

**Files:**
- Retain: `docs/current/blockout-clean-bootstrap-design.md`
- Retain: `docs/superpowers/plans/2026-07-19-blockout-clean-monorepo-bootstrap.md`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `nx.json`
- Create: `pom.xml`
- Create: `.gitignore`
- Create: `.dockerignore`
- Create: `.editorconfig`
- Create: `AGENTS.md`
- Create: `README.md`
- Delete: every previous MRG, generated contract, application, workflow, skill, and migration file

- [ ] Confirm the sixteen source repositories are clean and still point to the commits in the source map.
- [ ] Run `git rm -r -- .`, preview ignored removals with `git clean -ndx`, then run `git clean -fdx` inside `blockout`.
- [ ] Restore the approved design and this plan from local `HEAD`.
- [ ] Create a private npm workspace named `@blockout/source` with workspaces `apps/frontend/*` and dev dependencies `nx`, `@nx/workspace`, `@nx/js`, `@nx/react`, `@nx/expo`, and `@nx/maven`, all at `23.1.0`, plus TypeScript `~5.9.2`.
- [ ] Configure only `@nx/expo/plugin` and `@nx/maven` in `nx.json`; prefix Maven targets with `mvn-`. Do not add Nx Cloud or a Python plugin.
- [ ] Create root Maven aggregator `com.blockout:blockout:0.0.1-SNAPSHOT` with module `apps/backend` and `dev.nx.maven:nx-maven-plugin:0.0.17`.
- [ ] Create concise ignore files, editor settings, README, and AGENTS guidance. No `.github`, CI, GitFlow, deployment, or contract-first files.
- [ ] Run `npm install`, `npm audit --audit-level=high`, `git diff --check`, then commit `chore: reset Blockout to clean Nx workspace` and push `main`.

### Task 2: Import the Java backend

**Files:**
- Create: `apps/backend/pom.xml`
- Create: the twelve Java targets from the source map
- Create: one `project.json` per Java target

- [ ] Extract each exact commit with `git -C ../<source> archive <commit> | tar -x -C <target>`.
- [ ] Delete imported nested `.github` directories and standalone `docker-compose.yml` files. Change no Java, resource, migration, POM dependency, or Dockerfile content.
- [ ] Create `apps/backend/pom.xml` as a Spring Boot `3.4.5`/Java `21` aggregator listing only the twelve Java directories. Do not make the child POMs inherit from it.
- [ ] Give each Java project a namespaced Nx name matching its directory, for example `@blockout/clubs-service`, without overriding inferred Maven targets.
- [ ] Run `mvn -f pom.xml clean test`, `NX_DAEMON=false npm exec nx show projects`, and inspect one inferred Java project.
- [ ] Build the twelve Dockerfiles with their service directories as contexts.
- [ ] Run `git diff --check`, commit `chore: import standalone backend applications`, and push `main`.

### Task 3: Import the Expo mobile application

**Files:**
- Create: `apps/frontend/mobile/**`
- Create: `apps/frontend/mobile/project.json`
- Modify: root `package-lock.json`
- Delete: `apps/frontend/mobile/package-lock.json` after root lock generation

- [ ] Extract mobile commit `cfff3d7b9ade0e89f21af12cb21e4f0ba2902119` with `git archive`.
- [ ] Delete only nested `.github`; preserve application source, `app.json`, native projects, assets, `google-services.json`, and dependency declarations.
- [ ] Add Nx name `@blockout/mobile` without changing bundle identifiers, package name, scheme, EAS project ID, plugins, routes, or runtime configuration.
- [ ] Run root `npm install`, delete the nested lockfile, and run root `npm install` again so only `package-lock.json` at the repository root remains.
- [ ] Run `npm exec nx show project @blockout/mobile`, Expo public config, TypeScript check, and Android export. Record an existing source failure instead of refactoring product code.
- [ ] Run `git diff --check`, commit `chore: import standalone Expo application`, and push `main`.

### Task 4: Import the Python scrapers

**Files:**
- Create: `apps/backend/club-scraper/**`
- Create: `apps/backend/competition-scraper/**`
- Create: one `project.json` per scraper

- [ ] Extract both recorded scraper commits with `git archive`.
- [ ] Delete only nested `.github` and standalone Compose files; retain current `requirements.txt`, Dockerfiles, imports, and runtime code.
- [ ] Add explicit `nx:run-commands` targets named `serve`, `syntax-check`, and `docker-build`, with each command running from its scraper directory.
- [ ] Use `python3.12 main.py`, `python3.12 -m compileall -q .`, and the native Docker build. Do not introduce uv, `pyproject.toml`, a Python Nx plugin, or generated clients.
- [ ] Run both syntax checks and Docker builds. Verify `/app`, `TZ=UTC`, and `CMD ["python","main.py"]`.
- [ ] Run `git diff --check`, commit `chore: import standalone Python scrapers`, and push `main`.

### Task 5: Add simple local infrastructure

**Files:**
- Create: `infra/compose/docker-compose.app.yml`
- Create: `infra/compose/docker-compose.third-party.yml`
- Create: `infra/compose/pgadmin/servers.json`

- [ ] Create PostgreSQL services for pools `5432`, teams `5433`, matches `5434`, competition `5435`, users `5436`, clubs `5437`, config `5438`, and notification `5439` on `blockout-network`.
- [ ] Create only RabbitMQ (`5672`, `15672`), Elasticsearch `8.15.5` (`9200`), and pgAdmin (`5050`) in the third-party file.
- [ ] Do not import application containers, Portainer, Loki, Promtail, Prometheus, Grafana, Nginx, Kibana, or Gluetun.
- [ ] Register the eight databases in `servers.json` without passwords.
- [ ] Run `docker compose ... config --quiet`, start the combined files, and verify database health plus the three third-party processes.
- [ ] Commit `chore: add simple local Blockout infrastructure` and push `main`.

### Task 6: Document and validate BOOT-001

**Files:**
- Create: `docs/README.md`
- Create: `docs/current/source-baseline.md`
- Create: `docs/current/roadmap.md`
- Create: `docs/runbooks/local-development.md`
- Modify: `README.md`

- [ ] Document the sixteen source SHAs, project mapping, application ports, database ports, and native commands.
- [ ] Create a roadmap containing exactly one checkbox: `BOOT-001 — Import standalone Blockout applications into a functional Nx monorepo`.
- [ ] Document local Maven, Expo, Python, Docker, and Compose usage with placeholder environment values only.
- [ ] Run `npm ci`, npm audit, the Maven reactor tests, Nx project discovery, mobile config/typecheck/export, scraper syntax checks, fourteen image builds, and Compose validation.
- [ ] Smoke-start what can run with local non-secret values. Record external credential limitations honestly; do not rewrite applications to improve the smoke.
- [ ] Scan tracked files for `.env`, caches, build output, generated contracts, workflows, private keys, credentials, and `/Users/legel/` paths. Public mobile identifiers remain because they are runtime client configuration.
- [ ] Check `BOOT-001` only when all imported projects build and the known runtime limitations are documented.
- [ ] Remove this temporary implementation plan if it adds no value to the future public tree; retain the approved design and factual source baseline.
- [ ] Run `git diff --check`, inspect the complete staged diff, commit `chore: complete clean Blockout monorepo bootstrap`, push `main`, verify `HEAD == origin/main`, and stop.

## Stop boundary

Do not create the public repository, choose a license for the user, add GitFlow or CI, deploy, generate contracts, upgrade dependencies, refactor application code, or begin another roadmap task.
