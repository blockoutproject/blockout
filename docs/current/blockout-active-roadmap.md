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
- `mobile-gateway` currently contains 52 DTO classes among 111 Java classes and no mapper package; outside
  `users-service`, the audited deployables likewise contain no mapper classes.
- DTO names and shapes are copied across service, worker, and gateway modules, while several controllers expose JPA
  entities directly and BFF aggregation services construct large enriched response DTOs inside orchestration loops.
- Eleven backend modules depend on Springdoc for implementation-derived API documentation; no backend module currently
  configures OpenAPI Generator from an authoritative source contract.
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
- [x] MRG-110 Correct TanStack ownership and add backend data-boundary audits before contract reconstruction.
  - Evidence: TanStack remains mobile-owned for the single Expo application, and service/BFF DTO, entity, mapper,
    duplication, field-lineage, and aggregation audits now precede generated contract and Java restructuring work.

## Phase MRG-200 — Workspace Skeleton

- [x] MRG-201 Create the Maaatch-shaped `packages`, `libs`, and `scripts` roots.
  - Evidence: `packages`, `libs/react`, `libs/shared`, and `scripts` are present at the workspace root.
- [x] MRG-202 Reserve `libs/shared/contracts` as the future contract source boundary.
  - Evidence: Nx discovers `@blockout/contracts` and its inferred `typecheck` target passes.
- [x] MRG-203 Keep TanStack Query owned by `apps/frontend/mobile` and introduce a mobile-local query client/provider
      boundary prepared for Orval-generated clients without changing runtime defaults.
  - Evidence: `TanstackQueryProvider` owns the unchanged singleton client inside mobile; Nx discovery, mobile typecheck,
    Expo Android/iOS export, formatting, docs, structural comparison, and diff checks pass.
- [x] MRG-204 Align `nx.json` named inputs, root TypeScript references, workspace ownership, and generators while
      retaining the Expo plugin instead of Next.js.
  - Evidence: Nx retains Expo, TypeScript, and Maven plugins; generator defaults preserve the test-free workspace
    policy; root references target only mobile and contracts; direct React generator ownership, sync, dry-runs,
    discovery, typechecks, formatting, documentation, structural comparison, and diff checks pass.
- [x] MRG-205 Align root documentation and agent entrypoints with Maaatch; keep only technology-required extra files.
  - Evidence: `README.md`, `CLAUDE.md`, `DESIGN.md`, and the documentation index route the same repository roles.
- [x] MRG-206 Add a repeatable structural comparison command under `scripts`.
  - Evidence: `scripts/compare-maaatch-structure.mjs` validates the live Maaatch checkout without modifying either repo.
- [x] MRG-207 Align Maaatch's local log collector without adding a local observability stack.
  - Evidence: `npm run local:logs -- --help` passes and all configured processes write to one Git-ignored JSONL file.

## Phase MRG-250 — Backend Contract And Data-Boundary Audit

- [ ] MRG-251 Define the read-only service audit template: endpoint and event entrypoints, DTO and entity fields,
      producer/consumer lineage, validation, persistence, conversions, annotations, duplicated types, and tests.
- [ ] MRG-252 Audit `config-service` field by field, including direct entity responses, multipart JSON parsing, scraper
      configuration consumers, and the distinction between API, application, and persistence shapes.
- [ ] MRG-253 Audit `clubs-service` field by field, including multipart create/update flows, S3 ownership, scraper calls,
      entity construction, event publication, and mobile-gateway consumers.
- [ ] MRG-254 Audit `teams-service` field by field, including multipart updates, entity construction, follower counts,
      club/division dependencies, events, scraper calls, and mobile-gateway consumers.
- [ ] MRG-255 Audit `pools-service` field by field, including entity construction, follower counts, filters, events,
      scraper calls, and mobile-gateway consumers.
- [ ] MRG-256 Audit `competition-service` field by field, including association persistence, ranking calculations, bulk
      deactivation events, scraper calls, and every BFF ranking projection consumer.
- [ ] MRG-257 Audit `matches-service` field by field, including match entities, day/page projections, live links, live
      summaries, moderation/report flows, events, scraper calls, and every BFF consumer.
- [ ] MRG-258 Audit `users-service` field by field, including the existing mappers, direct entity responses, Auth0
      identity, favorites, S3 ownership, events, and mobile-gateway consumers.
- [ ] MRG-259 Audit `reports-service` field by field, separating Blockout request/response contracts from multipart,
      S3, GitHub, and Discord vendor shapes.
- [ ] MRG-260 Audit `notification-service` field by field, including REST DTOs, direct persistence projections, Expo
      vendor payloads, event consumers, pagination, token ownership, and mobile-gateway consumers.
- [ ] MRG-261 Audit `search-service` field by field, including search document DTOs, query/filter semantics, empty-result
      behavior, Elasticsearch ownership, and mobile-gateway consumers.
- [ ] MRG-262 Audit `search-worker` field by field, including copied service DTOs, cache bootstrap clients, event
      payloads, index documents, scheduled jobs, and Elasticsearch write ownership.
- [ ] MRG-263 Audit the `mobile-gateway` public and secure facade operation by operation, mapping each controller, copied
      downstream DTO, handwritten client, error translation, auth rule, and Expo caller.
- [ ] MRG-264 Audit `mobile-gateway` configuration, user, report, search, and notification orchestration, documenting
      every aggregation, pass-through, fallback, duplicated field, and frontend-visible reason for each projection.
- [ ] MRG-265 Audit `mobile-gateway` club, team, and pool aggregation call graphs, including fan-out cardinality,
      ordering, null handling, enrichment rules, repeated lookups, temporary fields, and exact Expo field consumers.
- [ ] MRG-266 Audit `mobile-gateway` competition, match, and live aggregation call graphs, including pagination,
      ranking assembly, fan-out cardinality, partial failure, ordering, and exact Expo field consumers.
- [ ] MRG-267 Produce the cross-service type and field-lineage matrix, classifying every duplicate or unused-looking
      field as required, derived, compatibility-only, vendor-owned, persistence-only, event-only, or removable.
- [ ] MRG-268 Approve the target service-by-service data architecture and migration sequence for generated API DTOs,
      application commands/views/records, domain concepts, JPA entities, event payloads, mappers, and BFF projections.
  - Execution mode: PLAN_REQUIRED

## Phase MRG-300 — Contract-First Foundation

- [ ] MRG-301 Build the deployed REST wire inventory from the MRG-250 field-lineage evidence, recording each owner,
      caller, method, path, parameter, security rule, request, response, error, pagination, multipart behavior, and
      current snake_case/camelCase name without treating Springdoc output as the target source.
- [ ] MRG-302 Inventory every RabbitMQ exchange, routing key, producer, consumer, event class, serialized payload, retry
      assumption, and casing rule separately from REST contracts.
- [ ] MRG-303 Inventory every handwritten backend HTTP client, Expo API module, scraper request builder, Jackson naming
      setting or annotation, and case-conversion dependency; assign each one to a future generated or external adapter.
- [ ] MRG-304 Publish the cutover matrix for standalone and monorepo coexistence from the approved MRG-268 architecture,
      including per-boundary compatibility, deployment order, rollback, and the exact point where temporary snake_case
      reads and duplicated legacy shapes can be removed.
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
- [ ] MRG-317 Define and bundle the `config-service` contract from its approved audit using only required wire fields and
      canonical camelCase names, without changing runtime behavior.
- [ ] MRG-318 Define and bundle the `clubs-service` contract from its approved audit using only required camelCase wire
      fields, including multipart operations.
- [ ] MRG-319 Define and bundle the `teams-service` contract from its approved audit using only required camelCase wire
      fields, including multipart operations.
- [ ] MRG-320 Define and bundle the `pools-service` contract from its approved audit using only required camelCase wire
      fields.
- [ ] MRG-321 Define and bundle the `competition-service` contract from its approved audit using only required
      camelCase wire fields and explicit ranking semantics.
- [ ] MRG-322 Define and bundle the `matches-service` contract from its approved audit using only required camelCase
      wire fields, including day pages, live links, and live summaries.
- [ ] MRG-323 Define and bundle the `users-service` contract from its approved audit using only required camelCase wire
      fields and current authentication semantics.
- [ ] MRG-324 Define and bundle the `reports-service` contract from its approved audit, separating required Blockout
      camelCase payloads from GitHub and Discord vendor adapters.
- [ ] MRG-325 Define and bundle the `notification-service` REST contract from its approved audit, keeping RabbitMQ event
      contracts in their separately selected source format.
- [ ] MRG-326 Define and bundle the `search-service` contract from its approved audit using only required camelCase wire
      fields; classify `search-worker` as an event consumer rather than inventing REST behavior.
- [ ] MRG-327 Define and bundle the complete `mobile-gateway` BFF contract from the approved aggregation audits, with
      UI-facing projections distinct from internal-service DTOs and every retained enriched field justified by a real
      frontend contract.
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

- [ ] MRG-401 Establish the implementation slice rule from MRG-268: migrate one service feature at a time, keep generated
      DTOs at adapters, and require behavioral parity before removing any legacy type or field.
- [ ] MRG-402 Restructure `config-service` into explicit API, application, domain where justified, and persistence
      boundaries with role-owned records and mappers.
- [ ] MRG-403 Restructure `clubs-service` into explicit API, application, domain, persistence, S3, scraper-facing, and
      event boundaries with role-owned records and mappers.
- [ ] MRG-404 Restructure `teams-service` into explicit API, application, domain, persistence, S3, scraper-facing, and
      event boundaries with role-owned records and mappers.
- [ ] MRG-405 Restructure `pools-service` into explicit API, application, domain, persistence, scraper-facing, and event
      boundaries with role-owned records and mappers.
- [ ] MRG-406 Restructure `competition-service` association, ranking, bulk-command, persistence, and event boundaries
      with role-owned records, projectors, policies, and mappers.
- [ ] MRG-407 Restructure `matches-service` match, day projection, live-link, moderation/report, persistence, and event
      boundaries with role-owned records, projectors, policies, and mappers.
- [ ] MRG-408 Restructure `users-service` account, favorites, Auth0, S3, persistence, and event boundaries; retain and
      relocate existing mappers only where their source/target ownership remains correct.
- [ ] MRG-409 Restructure `reports-service` Blockout API, application flow, attachment storage, GitHub, and Discord
      adapters without leaking vendor DTOs into application contracts.
- [ ] MRG-410 Restructure `notification-service` notification, token, projection, pagination, Expo adapter, persistence,
      and event boundaries with role-owned records and mappers.
- [ ] MRG-411 Restructure `search-service` query, filter, search-view, and Elasticsearch adapter boundaries without
      changing result ordering or empty-result behavior.
- [ ] MRG-412 Restructure `search-worker` cache bootstrap, scheduled jobs, event consumers, index projections, and
      Elasticsearch adapters without reusing generated transport DTOs as worker domain models.
- [ ] MRG-413 Replace `mobile-gateway` copied downstream DTOs and generic client services with generated client adapters
      that map immediately to workflow-owned application inputs and views.
- [ ] MRG-414 Restructure `mobile-gateway` configuration, user, report, search, and notification facade workflows with
      thin controllers, named orchestration, explicit projections, and API mappers.
- [ ] MRG-415 Restructure `mobile-gateway` club, team, and pool facade workflows with dedicated projectors or projection
      services, explicit fan-out policy, stable ordering, and response mappers.
- [ ] MRG-416 Restructure `mobile-gateway` competition, match, and live facade workflows with dedicated projectors or
      projection services, explicit pagination/fan-out policy, partial-failure semantics, and response mappers.
- [ ] MRG-417 Remove fields, handwritten DTO copies, conversion helpers, and temporary compatibility shapes only after
      the MRG-267 lineage and migrated contract consumers prove they are unused.
- [ ] MRG-418 Add strict service-local MapStruct configuration where structural mapping benefits from it; keep manual
      mapping only for real aggregation, policy, or non-trivial transformation logic.
- [ ] MRG-419 Align code documentation and existing behavioral mapper/projection tests incrementally in every touched
      service; do not add source-scanning tests or tests that only restate framework wiring.
- [ ] MRG-420 Preserve Flyway and audit each service migration history before moving persistence types or changing any
      schema mapping; package restructuring alone must not alter database structure.
- [ ] MRG-421 Add dedicated test configuration and disposable dependencies, then require reactor `verify`, rebuild all
      backend images, and smoke production-shaped environment contracts.

## Phase MRG-500 — Mobile Architecture

- [ ] MRG-501 Audit the Expo application against Maaatch frontend boundaries adapted for React Native.
- [ ] MRG-502 Separate generated API clients, application modules, view models, forms, navigation, and infrastructure.
- [ ] MRG-503 Keep TanStack and Orval integration mobile-owned while moving only proven framework-neutral React
      primitives to `libs/react`; do not create a shared library for a single consumer.
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
