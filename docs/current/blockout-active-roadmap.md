# Blockout Active Migration Roadmap

Last updated: 2026-07-16.

This roadmap is the temporary source of truth for migrating Blockout to the Maaatch monorepo structure and operating
model. It replaces GitHub task planning only for this migration. Once the final GitFlow phase is complete, active task
state moves to GitHub and this file becomes a historical migration record.

## Rules

- Maaatch is the structural reference. A difference must be a documented technology variant or an open migration task.
- Preserve current production behavior until each deployable completes its own cutover.
- Complete and validate one item before checking it off.
- Add evidence as one short indented line below the completed item.
- Unmarked pending items use `DEFAULT_EXECUTION`. A pending item that requires Codex Plan mode has the exact indented
  metadata `- Execution mode: PLAN_REQUIRED`.
- Do not use this roadmap to authorize product behavior changes.
- Do not reset Git history, disable standalone workflows, publish production images, or call Dokploy before the owning
  phase explicitly opens that action.

## Current Evidence

- The monorepo contains the Expo application, twelve Spring Boot modules, and two Python scrapers.
- The Maven reactor compiles and all twelve backend Dockerfiles build complete images from `apps/backend`.
- Both scraper images build, mobile typecheck and Expo exports pass, and local Compose configuration resolves.
- Monorepo CI is shadow-only. It does not publish images or call Dokploy.
- The GitHub repository currently has no Actions secrets, variables, or environments.
- Standalone repositories still publish the fourteen production images and call their own Dokploy webhook.
- Two uncommitted legacy changes were intentionally excluded and require explicit reconciliation before source freeze:
  `blockout-mobile-gateway/.../FfvbPublicController.java` and `blockout-scraper/scrapers/pro_scraper.py`.

## Phase MRG-000 — Migration Control Plane

- [x] MRG-001 Establish this local migration roadmap as the temporary task authority.
  - Evidence: this file is routed by the repository skill, brief, README, and documentation index.
- [x] MRG-002 Keep production deployment authority in the standalone repositories.
  - Evidence: monorepo workflows remain shadow-only and contain no image publication or Dokploy call.
- [x] MRG-003 Document the current Docker Hub image map and Dokploy gap in the cutover runbook.
  - Evidence: `docs/migration/monorepo-cutover.md` owns the per-deployable cutover and rollback gates.
- [x] MRG-004 Add an automated Maaatch-versus-Blockout structural inventory that classifies exact matches, technology
      variants, migration gaps, and intentionally deferred surfaces.
  - Evidence: `npm run compare:maaatch -- <path>` reports shared roots, policies, variants, and deferred skills.
- [x] MRG-005 Define the completion evidence format used by every later phase.
  - Evidence: completed items use one indented `Evidence:` line naming the durable source or successful check.
- [ ] MRG-006 Reconcile the two excluded legacy working-tree changes before their deployable source freeze.
  - Execution mode: PLAN_REQUIRED

## Phase MRG-100 — Agentic Foundation

- [x] MRG-101 Make `blockout-best-practices` the repository router and activate local-roadmap migration mode.
  - Evidence: the skill routes migration work to this roadmap and keeps GitHub Roadmap operations dormant.
- [x] MRG-102 Import and adapt the Maaatch core policies for backend architecture, code documentation, contract-first,
      Java testing, JPA, mapping, REST endpoints, and pagination.
  - Evidence: the Maaatch-equivalent references are present, adapted to Blockout, and have valid local links.
- [x] MRG-103 Preserve explicit technology variants for Expo, Python scrapers, Flyway, environments, Nx, and Dokploy.
  - Evidence: the router names each variant and routes it to a dedicated Blockout reference.
- [x] MRG-104 Align Maaatch's Figma, logging, Git workflow, Roadmap operations, lifecycle, and governance references.
  - Evidence: the full reference set is present with an explicit dormant marker on future GitHub workflows.
- [ ] MRG-105 Expand `frontend-mobile-policy.md` to the same architectural depth as Maaatch's frontend policy while
      replacing web-only rules with Expo and React Native equivalents.
- [ ] MRG-106 Align every generic skill present in Maaatch that applies to Expo/React or shared TypeScript code; record
      Next.js- or shadcn-only skills as non-applicable rather than copying them blindly.
- [x] MRG-107 Establish one temporary local-roadmap task runbook while GitHub acquisition and merge remain dormant.
  - Evidence: `docs/runbooks/tasks/execution.md` selects one item, enforces Plan mode, validates it, and pushes `main`.
- [ ] MRG-109 Remove temporary migration exceptions from the router after the target architecture is active.

## Phase MRG-200 — Workspace Skeleton

- [x] MRG-201 Create the Maaatch-shaped `packages`, `libs`, and `scripts` roots.
  - Evidence: `packages`, `libs/react`, `libs/shared`, and `scripts` are present at the workspace root.
- [x] MRG-202 Reserve `libs/shared/contracts` as the future contract source boundary.
  - Evidence: Nx discovers `@blockout/contracts` and its inferred `typecheck` target passes.
- [ ] MRG-203 Introduce `libs/react/tanstack` and move the mobile query client/provider without changing runtime
      defaults.
- [ ] MRG-204 Align `nx.json` named inputs, root TypeScript references, workspace ownership, and generators while
      retaining the Expo plugin instead of Next.js.
- [x] MRG-205 Align root documentation and agent entrypoints with Maaatch; keep only technology-required extra files.
  - Evidence: `README.md`, `CLAUDE.md`, `DESIGN.md`, and the documentation index route the same repository roles.
- [x] MRG-206 Add a repeatable structural comparison command under `scripts`.
  - Evidence: `scripts/compare-maaatch-structure.mjs` validates the live Maaatch checkout without modifying either repo.
- [x] MRG-207 Align Maaatch's local log collector without adding a local observability stack.
  - Evidence: `npm run local:logs -- --help` passes and all configured processes write to one Git-ignored JSONL file.

## Phase MRG-300 — Contract-First Foundation

- [ ] MRG-301 Inventory every currently deployed REST endpoint, request/response shape, event payload, and mobile API
      client source without changing behavior.
- [ ] MRG-302 Define the Blockout shared OpenAPI fragment layout under `libs/shared/contracts/specs/source/**`.
- [ ] MRG-303 Port Maaatch's deterministic bundle generator and tests with Blockout service names.
- [ ] MRG-304 Introduce generated bundles as outputs and prove regeneration is deterministic.
- [ ] MRG-305 Configure the backend parent for OpenAPI generation and future shared generated models.
- [ ] MRG-306 Configure Expo-compatible client generation and isolate generated clients from mobile view models.
- [ ] MRG-307 Migrate one low-risk API end to end before converting the remaining services.
- [ ] MRG-308 Add contract generation and no-diff checks to local verification and CI.
- [ ] MRG-309 Mark each service contract-authoritative only after source, generated backend, generated client, and runtime
      parity have all been proven.

## Phase MRG-400 — Backend Architecture

- [ ] MRG-401 Audit every service against the Maaatch feature-first Java policy without editing production behavior.
- [ ] MRG-402 Define Blockout service ownership, shared-model boundaries, and mobile-gateway facade responsibilities.
- [ ] MRG-403 Plan service-by-service package migrations from technical bags to feature-first roles.
- [ ] MRG-404 Align DTO, application, domain, persistence, mapper, endpoint, error, and pagination boundaries.
- [ ] MRG-405 Align code documentation and existing-test conventions incrementally per touched module.
- [ ] MRG-406 Preserve Flyway as the production-safe technology variant and audit every migration history before
      package/schema changes.
- [ ] MRG-407 Add dedicated test configuration and disposable dependencies so the reactor can safely require `verify`.
- [ ] MRG-408 Rebuild and smoke every backend image with production-shaped environment contracts.

## Phase MRG-500 — Mobile Architecture

- [ ] MRG-501 Audit the Expo application against Maaatch frontend boundaries adapted for React Native.
- [ ] MRG-502 Separate generated API clients, application modules, view models, forms, navigation, and infrastructure.
- [ ] MRG-503 Move reusable React/TanStack ownership to `libs/react` where behavior can remain identical.
- [ ] MRG-504 Define the Blockout mobile architecture and design-system source documents.
- [ ] MRG-505 Align React, effect, schema validation, logging, and documentation skills with the mobile stack.
- [ ] MRG-506 Prove Android and iOS exports, online EAS builds, credentials, updates, and installed-device smoke flows.

## Phase MRG-600 — Scraper Architecture

- [ ] MRG-601 Audit both scrapers for shared boundaries, configuration ownership, scheduling, proxy behavior, and API
      contracts.
- [ ] MRG-602 Keep explicit Nx projects unless an evidenced Python workspace decision replaces them.
- [ ] MRG-603 Pin and validate Python dependencies and base images in a behavior-preserving change.
- [ ] MRG-604 Add real behavioral tests and safe fixture-based scraper validation.
- [ ] MRG-605 Build and smoke both images with production-shaped configuration before cutover.

## Phase MRG-700 — Local Runtime And Developer Workflow

- [x] MRG-701 Centralize Compose exactly under `infra/compose` with the two Compose files and pgAdmin registration.
  - Evidence: `infra/compose` contains only the two Compose files and `pgadmin/servers.json`; Compose config passes.
- [x] MRG-702 Remove Nginx, Kibana, VPN, Portainer, and local observability services not present in the Maaatch model.
  - Evidence: Compose contains only Blockout databases, RabbitMQ, Elasticsearch, and pgAdmin.
- [x] MRG-703 Keep application processes outside Compose and use Compose only for local dependencies.
  - Evidence: neither Compose file defines a Spring, Expo, or scraper process.
- [x] MRG-704 Add `scripts/verify-ci-pr-local.sh` as the local equivalent of Blockout shadow CI.
  - Evidence: the executable script passes shell syntax and help validation.
- [ ] MRG-705 Start the complete local dependency stack and smoke every service directly on its historical port.
- [ ] MRG-706 Align local developer commands and README after contract and library projects exist.

## Phase MRG-800 — CI And Quality Gates

- [ ] MRG-801 Align CI job structure with Maaatch while retaining Expo and scraper-specific jobs.
- [ ] MRG-802 Add contract generation and deterministic no-diff validation.
- [ ] MRG-803 Upgrade backend CI from compile-only to verified tests after test infrastructure is reliable.
- [ ] MRG-804 Add actual backend image builds for changed deployables rather than Dockerfile syntax checks only.
- [ ] MRG-805 Remove the `setup-python@v5` deprecation warning.
- [ ] MRG-806 Make the local verification script and CI execute the same authoritative commands.

## Phase MRG-900 — Production Cutover

- [ ] MRG-901 Create a protected GitHub Environment or distinct secret namespace for each deployable.
- [ ] MRG-902 Add one manual, path-scoped shadow publication workflow for a low-risk service.
- [ ] MRG-903 Publish an immutable `monorepo-<sha>` candidate without replacing `latest` or calling Dokploy.
- [ ] MRG-904 Smoke the candidate on a non-routing target and prove rollback.
- [ ] MRG-905 Cut over one deployable at a time, preserving its historical image name and webhook isolation.
- [ ] MRG-906 Repeat source freeze, candidate, smoke, cutover, observation, and rollback proof for all fourteen images.
- [ ] MRG-907 Complete the separate EAS/mobile release cutover.
- [ ] MRG-908 Disable standalone workflows only after their monorepo replacements are observed successfully.

## Phase MRG-1000 — Clean History And Maaatch GitFlow

- [ ] MRG-1001 Confirm every structural, contract, runtime, CI, and production cutover gate is complete.
- [ ] MRG-1002 Archive the temporary migration evidence and remove migration-only exceptions.
- [ ] MRG-1003 Reset or recreate the GitHub repository history only after an explicit backup and final user approval.
- [ ] MRG-1004 Configure `develop`, branch protection, labels, issue templates, Roadmap Project, and GitHub Environments to
      match Maaatch.
- [ ] MRG-1005 Activate Maaatch-equivalent discovery, acquisition, execution, ready-drain, review, and merge rules.
- [ ] MRG-1006 Move active task state from this file to GitHub and mark this roadmap complete.

## Completion Definition

The migration is complete only when Blockout has the Maaatch structural and agentic model, documented technology
variants, deterministic contract generation, validated runtime behavior, per-deployable production cutovers, a proven
rollback path, and the Maaatch GitFlow active on the clean repository history.
