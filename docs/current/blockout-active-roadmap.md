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
- The migration owner authorizes evidence-based roadmap maintenance whenever live repository evidence exposes a
  missing dependency, unsafe order, or insufficient task granularity. Perform that maintenance as one focused
  roadmap-editing iteration; never use it to skip work, mark implementation complete, or execute a newly added task in
  the same iteration.
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
- All twelve Spring modules configure Jackson `SNAKE_CASE`; ten modules also contain about 327 explicit Jackson naming
  annotations, with 220 concentrated in `mobile-gateway`.
- The Expo HTTP boundary currently snake-cases requests and camel-cases responses globally, while both Python scrapers
  send Blockout-owned query and JSON payload keys directly in snake_case.
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
- [x] MRG-006 Reconcile the two excluded legacy working-tree changes before their deployable source freeze.
  - Evidence: the monorepo mirrors both preserved 2026/2027 legacy deltas; targeted compile, scraper syntax, docs, and
    diff checks pass.

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
- [x] MRG-105 Expand `frontend-mobile-policy.md` to the same architectural depth as Maaatch's frontend policy while
      replacing web-only rules with Expo and React Native equivalents.
  - Evidence: the mobile policy now covers Expo-native layering, state, UI, security, and validation; docs links and
    the Maaatch structural comparison pass.
- [x] MRG-106 Align every generic skill present in Maaatch that applies to Expo/React or shared TypeScript code; record
      Next.js- or shadcn-only skills as non-applicable rather than copying them blindly.
  - Evidence: applicable React skills are present with Expo scope, and structural comparison enforces explicit
    `MATCH` or `NONAPP` classifications for every Maaatch generic skill.
- [x] MRG-107 Establish one temporary local-roadmap task runbook while GitHub acquisition and merge remain dormant.
  - Evidence: `docs/runbooks/tasks/execution.md` selects one item, enforces Plan mode, validates it, and pushes `main`.
- [x] MRG-108 Correct dependency order and expand contract-first adaptation into independently verifiable tasks.
  - Evidence: final cleanup now follows architecture activation, while REST, event, backend, Expo, scraper, camelCase,
    generated-client, and no-diff work have explicit gates adapted from Maaatch.

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

- [ ] MRG-301 Inventory every deployed REST operation and record its owner, caller, method, path, parameters, security,
      request, success shape, errors, pagination, multipart behavior, and current snake_case/camelCase wire names.
- [ ] MRG-302 Inventory every RabbitMQ exchange, routing key, producer, consumer, event class, serialized payload, retry
      assumption, and casing rule separately from REST contracts.
- [ ] MRG-303 Inventory every handwritten backend HTTP client, Expo API module, scraper request builder, Jackson naming
      setting or annotation, and case-conversion dependency; assign each one to a future generated or external adapter.
- [ ] MRG-304 Publish the cutover matrix for standalone and monorepo coexistence, including per-boundary compatibility,
      deployment order, rollback, and the exact point where temporary snake_case reads can be removed.
  - Execution mode: PLAN_REQUIRED
- [ ] MRG-305 Define the Blockout fragment layout for shared schemas, internal service APIs, and the mobile-gateway BFF
      under `libs/shared/contracts/specs/source/**`, retaining Blockout service ownership and Expo terminology.
- [ ] MRG-306 Port Maaatch's deterministic OpenAPI bundle generator with Blockout service names and output paths.
- [ ] MRG-307 Port and adapt Maaatch's bundle tests for missing references, transitive schemas, stable ordering, shared
      enums, and deterministic output.
- [ ] MRG-308 Add source-contract lint that rejects snake_case property and Blockout-owned query names, duplicate
      operation IDs, inline stable enums, ambiguous DTO suffixes, and undocumented exceptions.
- [ ] MRG-309 Introduce generated OpenAPI bundles under `libs/shared/contracts/generated/specs/**` and prove two clean
      generations produce no diff.
- [ ] MRG-310 Port Maaatch's generated `schemaMappings` synchronizer and protect its backend parent block from manual
      edits.
- [ ] MRG-311 Configure the backend parent plugin management, Java type mappings, generated-source ownership, and
      shared generator options without generating service APIs yet.
- [ ] MRG-312 Add the backend `shared-models` module for generated shared enums and rare technical primitives, then
      compile it in the Maven reactor.
- [ ] MRG-313 Select the Expo-compatible TypeScript client and contract-schema generator, including React Query
      integration, auth/error mutator, output ownership, caching, formatting, and generated-file policy.
  - Execution mode: PLAN_REQUIRED
- [ ] MRG-314 Decide whether the two Python scrapers use a generated Python client, generated models with handwritten
      transport, or a typed handwritten adapter; define packaging, async support, auth, multipart, and retry criteria.
  - Execution mode: PLAN_REQUIRED
- [ ] MRG-315 Select and document the authoritative event-contract format and generator strategy for RabbitMQ payloads;
      do not model asynchronous messaging as fake OpenAPI endpoints.
  - Execution mode: PLAN_REQUIRED
- [ ] MRG-316 Add shared REST primitives for Problem Details errors, security, pagination, bounded lists, identifiers,
      dates, and shared enums before service-specific schemas duplicate them.
- [ ] MRG-317 Define and bundle the `config-service` contract from production evidence using canonical camelCase wire
      names, without changing runtime behavior.
- [ ] MRG-318 Define and bundle the `clubs-service` contract from production evidence using canonical camelCase wire
      names, including multipart operations.
- [ ] MRG-319 Define and bundle the `teams-service` contract from production evidence using canonical camelCase wire
      names, including multipart operations.
- [ ] MRG-320 Define and bundle the `pools-service` contract from production evidence using canonical camelCase wire
      names.
- [ ] MRG-321 Define and bundle the `competition-service` contract from production evidence using canonical camelCase
      wire names.
- [ ] MRG-322 Define and bundle the `matches-service` contract from production evidence using canonical camelCase wire
      names, including live-link and live-summary projections.
- [ ] MRG-323 Define and bundle the `users-service` contract from production evidence using canonical camelCase wire
      names and current authentication semantics.
- [ ] MRG-324 Define and bundle the `reports-service` contract from production evidence, separating Blockout camelCase
      payloads from GitHub and Discord vendor payload adapters.
- [ ] MRG-325 Define and bundle the `notification-service` REST contract from production evidence, keeping RabbitMQ
      event contracts in their separately selected source format.
- [ ] MRG-326 Define and bundle the `search-service` contract from production evidence using canonical camelCase wire
      names; classify `search-worker` as an event consumer rather than inventing REST behavior.
- [ ] MRG-327 Define and bundle the complete `mobile-gateway` BFF contract from production evidence, with UI-facing
      projections distinct from internal-service DTOs.
- [ ] MRG-328 Configure the approved Expo generator and Nx target to produce transport clients, DTOs, and Zod contract
      schemas from the mobile-gateway bundle without importing React Native UI or form concerns into generated code.
- [ ] MRG-329 Adapt and activate Maaatch's Zod guidance for generated Expo contract validation while retaining the
      existing Formik/Yup form stack until a separately planned form migration is justified.
- [ ] MRG-330 Configure the approved scraper client/model generation path from the internal service bundles and keep
      generated code isolated from scraper parsing, scheduling, and domain models.
- [ ] MRG-331 Configure generated Spring interfaces and models for `config-service`, map them at the API boundary, and
      migrate one low-risk vertical slice to camelCase with compatibility and rollback evidence.
- [ ] MRG-332 Replace handwritten `mobile-gateway` access to the MRG-331 slice with its generated internal client and
      prove request, response, error, auth, and casing parity.
- [ ] MRG-333 Replace the matching Expo handwritten call with the generated BFF client and generated contract schema,
      retaining module view-model and query ownership.
- [ ] MRG-334 Migrate `clubs-service` generated server boundaries and internal generated clients, including multipart
      mapping and temporary compatibility defined by MRG-304.
- [ ] MRG-335 Migrate `teams-service` generated server boundaries and internal generated clients, including multipart
      mapping and temporary compatibility defined by MRG-304.
- [ ] MRG-336 Migrate `pools-service` generated server boundaries and internal generated clients with parity evidence.
- [ ] MRG-337 Migrate `competition-service` generated server boundaries and internal generated clients with parity
      evidence.
- [ ] MRG-338 Migrate `matches-service` generated server boundaries and internal generated clients with parity evidence.
- [ ] MRG-339 Migrate `users-service` generated server boundaries and internal generated clients without changing Auth0
      ownership or authentication behavior.
- [ ] MRG-340 Migrate `reports-service` generated server boundaries and internal generated clients while preserving
      explicit GitHub and Discord vendor adapters.
- [ ] MRG-341 Migrate `notification-service` REST boundaries and internal generated clients with parity evidence.
- [ ] MRG-342 Migrate `search-service` generated server boundaries and internal generated clients with parity evidence.
- [ ] MRG-343 Migrate every remaining `mobile-gateway` endpoint to generated internal clients, generated BFF interfaces,
      explicit mappers, and canonical camelCase payloads.
- [ ] MRG-344 Migrate Expo authentication and configuration modules to generated BFF clients and contract schemas.
- [ ] MRG-345 Migrate Expo club, team, and pool modules to generated BFF clients and contract schemas.
- [ ] MRG-346 Migrate Expo competition and match modules to generated BFF clients and contract schemas.
- [ ] MRG-347 Migrate Expo user, search, notification, and report modules to generated BFF clients and contract schemas.
- [ ] MRG-348 Migrate `club-scraper` Blockout API boundaries to canonical camelCase using the approved generated or typed
      adapter while preserving Python snake_case identifiers and external federation payloads.
- [ ] MRG-349 Migrate `competition-scraper` Blockout API boundaries to canonical camelCase using the approved generated
      or typed adapter while preserving Python snake_case identifiers and external federation payloads.
- [ ] MRG-350 Define, generate where approved, and migrate every RabbitMQ event contract producer and consumer with
      compatibility, ordering, retry, and rollback evidence.
- [ ] MRG-351 Remove global Jackson `SNAKE_CASE` configuration service by service after all callers for each boundary
      use canonical camelCase.
- [ ] MRG-352 Remove legacy `@JsonProperty`, `@JsonAlias`, and naming adapters used only for Blockout snake_case;
      retain documented annotations only at genuine vendor or compatibility boundaries.
- [ ] MRG-353 Remove Expo request/response case transformation, `transformCase`, and obsolete case-conversion packages
      after every generated BFF client is active.
- [ ] MRG-354 Add a repository-wide allowlisted guard proving Blockout-owned REST, event, Expo, and scraper wire keys are
      camelCase while database columns, Python identifiers, and external vendor payloads remain out of scope.
- [ ] MRG-355 Add complete contract generation, backend generation, Expo generation, scraper generation when selected,
      formatting, compilation, and deterministic no-diff checks to local verification.
- [ ] MRG-356 Mark each REST and event boundary contract-authoritative only after source, generated artifacts, mappers,
      all consumers, runtime parity, compatibility removal, and rollback evidence are complete.

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
- [ ] MRG-505 Re-audit and adapt Maaatch React, effect, Zod, logging, and documentation skills after the generated-client
      architecture is active; keep Next.js, shadcn, and web-only guidance explicitly non-applicable.
- [ ] MRG-506 Prove Android and iOS exports, online EAS builds, credentials, updates, and installed-device smoke flows.

## Phase MRG-600 — Scraper Architecture

- [ ] MRG-601 Audit both scrapers for shared boundaries, generated-client ownership, configuration, scheduling, proxy
      behavior, Blockout camelCase wire contracts, and external federation adapters.
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
- [ ] MRG-802 Enforce the Phase MRG-300 generation and deterministic no-diff matrix in CI for contracts, backend, Expo,
      and the approved scraper/event generators.
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
- [ ] MRG-109 Remove temporary migration exceptions from the router after the target architecture is active.
- [ ] MRG-1003 Reset or recreate the GitHub repository history only after an explicit backup and final user approval.
- [ ] MRG-1004 Configure `develop`, branch protection, labels, issue templates, Roadmap Project, and GitHub Environments to
      match Maaatch.
- [ ] MRG-1005 Activate Maaatch-equivalent discovery, acquisition, execution, ready-drain, review, and merge rules.
- [ ] MRG-1006 Move active task state from this file to GitHub and mark this roadmap complete.

## Completion Definition

The migration is complete only when Blockout has the Maaatch structural and agentic model, documented technology
variants, deterministic contract generation, validated runtime behavior, per-deployable production cutovers, a proven
rollback path, and the Maaatch GitFlow active on the clean repository history.
