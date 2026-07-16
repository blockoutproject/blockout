# Blockout Active Migration Roadmap

Last updated: 2026-07-17.

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

- [x] MRG-251 Define the read-only service audit template: endpoint and event entrypoints, DTO and entity fields,
      producer/consumer lineage, validation, persistence, conversions, annotations, duplicated types, and tests.
  - Evidence: `docs/migration/backend-contract-data-audit-template.md` defines evidence statuses, field classifications,
    per-operation and per-field matrices, conversion and persistence inventories, BFF call graphs, parity evidence,
    completion gates, and the handoff to target-architecture approval without changing runtime code.
- [x] MRG-252 Audit `config-service` field by field, including direct entity responses, multipart JSON parsing, scraper
      configuration consumers, and the distinction between API, application, and persistence shapes.
  - Evidence: `docs/migration/backend-contract-audits/mrg-252-config-service.md` inventories all 16 operations, five
    persistence families, every field and duplicate consumer shape, casing and multipart conversions, BFF/worker/Expo
    and scraper lineage, validation, errors, caches, tests, unknowns, and provisional MRG-268 ownership without runtime
    changes.
- [x] MRG-253 Audit `clubs-service` field by field, including multipart create/update flows, S3 ownership, scraper calls,
      entity construction, event publication, and mobile-gateway consumers.
  - Evidence: `docs/migration/backend-contract-audits/mrg-253-clubs-service.md` inventories all six REST operations,
    multipart and per-field semantics, direct entity construction, PostgreSQL/S3/Mapbox ownership, RabbitMQ and
    deactivation flows, scraper/worker/BFF/Expo copies and conversions, aggregation call graphs, casing, validation,
    errors, tests, unknowns, and provisional MRG-268 roles without runtime changes.
- [x] MRG-254 Audit `teams-service` field by field, including multipart updates, entity construction, follower counts,
      club/division dependencies, events, scraper calls, and mobile-gateway consumers.
  - Evidence: `docs/migration/backend-contract-audits/mrg-254-teams-service.md` inventories all eight REST operations,
    entity and multipart fields, filters, S3, follower consistency, RabbitMQ/deactivation flows, duplicated enums and
    DTOs, scraper/worker/BFF/Expo lineage, aggregation fan-out, validation, tests, unknowns, and provisional MRG-268
    roles without runtime changes.
- [x] MRG-255 Audit `pools-service` field by field, including entity construction, follower counts, filters, events,
      scraper calls, and mobile-gateway consumers.
  - Evidence: `docs/migration/backend-contract-audits/mrg-255-pools-service.md` inventories all seven REST operations,
    direct entity and update fields, persistence, followers, cascades, scraper reactivation, worker/search projections,
    BFF/notification/Expo lineage, casing, duplication, validation, tests, unknowns, and provisional target roles without
    runtime changes.
- [x] MRG-256 Audit `competition-service` field by field, including association persistence, ranking calculations, bulk
      deactivation events, scraper calls, and every BFF ranking projection consumer.
  - Evidence: `docs/migration/backend-contract-audits/mrg-256-competition-service.md` inventories all eight operations,
    24 association fields, 17-stat replacement, add/reactivate and bulk cascades, event consumers, scraper calculations,
    BFF ranking/fan-out projections, casing, validation, tests, unknowns, and provisional target roles without runtime
    changes.
- [x] MRG-257 Audit `matches-service` field by field, including match entities, day/page projections, live links, live
      summaries, moderation/report flows, events, scraper calls, and every BFF consumer.
  - Evidence: `docs/migration/backend-contract-audits/mrg-257-matches-service.md` inventories all 16 REST operations,
    match/day/live/report fields, result transitions, pagination, live policies and moderation states, three unconsumed
    deactivation queues, notification events, scraper transport/cache behavior, BFF fan-out and projection drift,
    Expo/TanStack consumers, casing, validation, tests, unknowns, and provisional target roles without runtime changes.
- [x] MRG-258 Audit `users-service` field by field, including the existing mappers, direct entity responses, Auth0
      identity, favorites, S3 ownership, events, and mobile-gateway consumers.
  - Evidence: `docs/migration/backend-contract-audits/mrg-258-users-service.md` inventories all nine REST operations,
    user/favorite fields, mixed mapper/entity responses, Auth0 token/link/role/delete flows, S3 multipart ownership,
    distributed follower counters/events, notification projections, BFF/Expo session and deletion behavior, casing,
    privacy, validation, tests, unknowns, and provisional target roles without runtime changes.
- [x] MRG-259 Audit `reports-service` field by field, separating Blockout request/response contracts from multipart,
      S3, GitHub, and Discord vendor shapes.
  - Evidence: `docs/migration/backend-contract-audits/mrg-259-reports-service.md` inventories both REST boundaries,
    every Blockout/multipart/S3/GitHub/Discord field, BFF/Expo casing and consumers, side-effect ordering, validation,
    security leaks, tests, unknowns, and provisional target roles without runtime changes.
- [x] MRG-260 Audit `notification-service` field by field, including REST DTOs, direct persistence projections, Expo
      vendor payloads, event consumers, pagination, token ownership, and mobile-gateway consumers.
  - Evidence: `docs/migration/backend-contract-audits/mrg-260-notification-service.md` inventories all REST, event,
    persistence, Expo, BFF, and mobile fields; token ownership, delivery consistency, pagination, casing, mapper and
    compatibility gaps; existing tests, unknowns, and provisional target roles without runtime changes.
- [x] MRG-261 Audit `search-service` field by field, including search document DTOs, query/filter semantics, empty-result
      behavior, Elasticsearch ownership, and mobile-gateway consumers.
  - Evidence: `docs/migration/backend-contract-audits/mrg-261-search-service.md` inventories all internal and BFF
    operations, query/filter/result/index fields, Elasticsearch ownership, ordering, bounds, empty/error behavior,
    casing, copied DTOs, Expo consumers, tests, unknowns, and provisional roles without runtime changes.
- [x] MRG-262 Audit `search-worker` field by field, including copied service DTOs, cache bootstrap clients, event
      payloads, index documents, scheduled jobs, and Elasticsearch write ownership.
  - Evidence: `docs/migration/backend-contract-audits/mrg-262-search-worker.md` inventories every HTTP snapshot, copied
    DTO field, event payload, cache projection, scheduler, index document and mapping, Rabbit acknowledgement path,
    casing bridge, write-consistency risk, missing parity test, unknown, and provisional target role without runtime
    changes; Prettier, local-link validation, the Maaatch structure comparison, diff checks, and the Maven package build
    pass.
- [x] MRG-263 Audit the `mobile-gateway` public and secure facade operation by operation, mapping each controller, copied
      downstream DTO, handwritten client, error translation, auth rule, and Expo caller.
  - Evidence: `docs/migration/backend-contract-audits/mrg-263-mobile-gateway-facade.md` inventories all 50 public and
    secure operations, 11 handwritten clients, 52 DTOs and eight enums, incoming and downstream auth selection, casing
    bridges, multipart/binary behavior, error translation, cache boundaries, every Expo API entry and proven caller,
    unused/type-drift cases, unknowns, and provisional contract-first roles without runtime changes; Prettier,
    local-link validation, diff checks, the Maaatch structure comparison, and the Maven package build pass. The sole
    context-load test remains pre-existingly coupled to a missing `AUTH0_ISSUER` fixture.
- [x] MRG-264 Audit `mobile-gateway` configuration, user, report, search, and notification orchestration, documenting
      every aggregation, pass-through, fallback, duplicated field, and frontend-visible reason for each projection.
  - Evidence: `docs/migration/backend-contract-audits/mrg-264-gateway-config-user-report-search-notification.md`
    reconstructs all 30 configuration, user, report, search, and notification facade operations; their exact single-
    owner relays or notification fan-out; auth, cache, multipart, casing, null, fallback, error, and logging behavior; every
    copied, derived, unused-looking, or drifted field; and every proven Expo purpose without runtime changes. Prettier,
    local-link validation, the Maaatch structure comparison, diff checks, and the Maven package build pass. The sole
    gateway context-load test remains pre-existingly coupled to a missing `AUTH0_ISSUER` fixture.
- [x] MRG-265 Audit `mobile-gateway` club, team, and pool aggregation call graphs, including fan-out cardinality,
      ordering, null handling, enrichment rules, repeated lookups, temporary fields, and exact Expo field consumers.
  - Evidence: `docs/migration/backend-contract-audits/mrg-265-gateway-club-team-pool-aggregations.md` reconstructs all
    nine club, team, and pool facade operations; exact cold/cache-aware fan-out formulas; ordering, deduplication,
    null, missing, inactive, and partial-result behavior; mutable enrichment and cache risks; update/multipart paths;
    copied, derived, compatibility, and unused-looking fields; and every proven Expo consumer without runtime changes.
    Prettier, local-link validation, the Maaatch structure comparison, diff checks, and the Maven package build pass.
    Tests remain skipped because this audit changes documentation only; the sole gateway context-load test is already
    documented as coupled to a missing `AUTH0_ISSUER` fixture.
- [x] MRG-266 Audit `mobile-gateway` competition, match, and live aggregation call graphs, including pagination,
      ranking assembly, fan-out cardinality, partial failure, ordering, and exact Expo field consumers.
  - Evidence: `docs/migration/backend-contract-audits/mrg-266-gateway-competition-match-live-aggregations.md`
    reconstructs all ten match-facing facade operations; exact list/detail/moderation fan-out; date pagination and its
    empty-continuation loss; ranking and signed-PDF assembly; ordering, bounds, silent drops, null/failure behavior;
    live relays/history; copied, derived, compatibility, and unused fields; and every proven Expo consumer without
    runtime changes. Prettier, local-link validation, the Maaatch structure comparison, diff checks, and the Maven
    package build pass. Tests remain skipped because this audit changes documentation only; the sole gateway
    context-load test remains coupled to a missing `AUTH0_ISSUER` fixture.
- [x] MRG-267 Produce the cross-service type and field-lineage matrix, classifying every duplicate or unused-looking
      field as required, derived, compatibility-only, vendor-owned, persistence-only, event-only, or removable.
  - Evidence: `docs/migration/backend-contract-audits/mrg-267-cross-service-type-field-lineage-matrix.md` consolidates
    all 15 service, worker, gateway, Expo, scraper, event, store, and vendor audits into 19 duplicate-type families,
    boundary-local field classifications, canonical camelCase ownership, removal gates, and the MRG-268 decision
    handoff without runtime changes; Prettier, local-link validation, the Maaatch structure comparison, diff checks,
    and the full backend Maven package build pass with tests intentionally skipped for this documentation-only task.
- [x] MRG-268 Approve the target service-by-service data architecture and migration sequence for generated API DTOs,
      application commands/views/records, domain concepts, JPA entities, event payloads, mappers, and BFF projections.
  - Evidence: `docs/architecture/blockout-backend-contract-data-architecture.md` approves the boundary taxonomy,
    service and workflow targets, camelCase compatibility sequence, mapper ownership, event/outbox posture, Expo and
    Python rules, and legal-document pilot; this roadmap adds the detailed MRG-357 through MRG-375 and MRG-422 through
    MRG-430 slices. Prettier, local-link validation, Maaatch structure comparison, diff checks, and the backend Maven
    package build pass with tests intentionally skipped; mobile exports, scraper builds, and runtime tests remain
    skipped because this task changes architecture documentation and task structure only.

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
- [ ] MRG-327 Define and bundle the `mobile-gateway` configuration, user, report, search, and notification BFF contracts
      from the approved aggregation audits, with workflow projections distinct from internal-service DTOs.
- [ ] MRG-357 Define and bundle the `mobile-gateway` club, team, and pool BFF contracts, retaining only consumer-backed
      enriched fields and explicit ordering, missing-data, privacy, and partial-result semantics.
- [ ] MRG-358 Define and bundle the `mobile-gateway` competition, match, and live BFF contracts, separating list,
      detail, history, moderation, ranking, pagination, signed-link, and partial-result projections.
- [ ] MRG-328 Configure the approved Expo generator and Nx target to produce transport clients, DTOs, and Zod contract
      schemas from the mobile-gateway bundle without importing React Native UI or form concerns into generated code.
- [ ] MRG-329 Adapt and activate Maaatch's Zod guidance for generated Expo contract validation while retaining the
      existing Formik/Yup form stack until a separately planned form migration is justified.
- [ ] MRG-330 Configure the approved scraper client/model generation path from the internal service bundles and keep
      generated code isolated from scraper parsing, scheduling, and domain models.
- [ ] MRG-331 Configure generated Spring interfaces and models for `config-service`, then migrate legal-document read
      and update through generated DTOs, role-owned application records, entity mapping, canonical camelCase,
      Problem Details compatibility, and rollback evidence.
- [ ] MRG-332 Replace handwritten `mobile-gateway` access to the MRG-331 slice with its generated internal client and
      prove request, response, error, auth, and casing parity.
- [ ] MRG-333 Replace the matching Expo handwritten call with the generated BFF client and generated contract schema,
      retaining module view-model and query ownership.
- [ ] MRG-334 Migrate `clubs-service` generated server boundaries and internal generated clients, including multipart
      mapping and temporary compatibility defined by MRG-304.
- [ ] MRG-335 Migrate `teams-service` generated server boundaries and internal generated clients, including multipart
      mapping and temporary compatibility defined by MRG-304.
- [ ] MRG-336 Migrate `pools-service` generated server boundaries and internal generated clients with parity evidence.
- [ ] MRG-337 Migrate `competition-service` association and statistics generated server boundaries and internal clients,
      preserving full-snapshot, validation, persistence, and reactivation behavior.
- [ ] MRG-359 Migrate `competition-service` ranking boundaries through one owner projection and ordering policy, with
      exact BFF/Expo ordering and tie parity.
- [ ] MRG-360 Migrate `competition-service` bulk lifecycle and cascade boundaries, preserving missing-ID, zero-item,
      deactivation, transaction, and rollback behavior without activating absent consumers.
- [ ] MRG-338 Migrate `matches-service` match core and day-page generated boundaries and internal clients with date,
      pagination, ordering, status, null, and scraper parity.
- [ ] MRG-361 Migrate `matches-service` live command, response, and history boundaries while preserving ownership,
      quota, state-transition, provider, ordering, and compatibility behavior.
- [ ] MRG-362 Migrate `matches-service` moderation and live-report boundaries with explicit commands, views, validation,
      representative-selection, filter, error, and concurrency parity.
- [ ] MRG-339 Migrate `users-service` account and profile generated boundaries and clients, keeping local UUID identity,
      Auth0 resolution, image intent, authentication, and current behavior explicit.
- [ ] MRG-363 Migrate `users-service` favorite commands and projections, making favorites the canonical source while
      retaining counter, optimistic UI, and event compatibility.
- [ ] MRG-364 Migrate `users-service` identity-link, account-deletion, and storage boundaries behind explicit Auth0 and
      S3 adapters without changing current deletion, retention, or authentication behavior.
- [ ] MRG-340 Migrate `reports-service` generated server boundaries and internal generated clients while preserving
      explicit GitHub and Discord vendor adapters.
- [ ] MRG-341 Migrate `notification-service` inbox and page read boundaries with generated clients, stable ordering,
      standard target pagination, legacy continuation compatibility, and BFF enrichment parity.
- [ ] MRG-365 Migrate `notification-service` push-token, unread, read, opened, and delete boundaries with current-user
      ownership, validation, device lifecycle, response, and compatibility evidence.
- [ ] MRG-366 Separate and migrate `notification-service` delivery-state inputs from provider ticket/receipt models,
      preserving current send, retry, invalid-token, and incomplete-receipt behavior until separately changed.
- [ ] MRG-342 Migrate `search-service` generated server boundaries and internal generated clients with parity evidence.
- [ ] MRG-343 Migrate remaining `mobile-gateway` configuration, user, report, search, and notification relay workflows
      to generated clients and BFF interfaces with workflow-owned commands, views, mappers, and compatibility.
- [ ] MRG-367 Migrate `mobile-gateway` club, team, and pool workflows to generated clients and BFF interfaces with
      immutable projections, explicit privacy, ordering, cache, fan-out, and missing-data policy.
- [ ] MRG-368 Migrate `mobile-gateway` competition, match, and live workflows to generated clients and BFF interfaces
      with separate list, detail, ranking, history, moderation, signed-link, and partial-result projections.
- [ ] MRG-344 Migrate Expo authentication and configuration modules to generated BFF clients and contract schemas.
- [ ] MRG-345 Migrate Expo club, team, and pool modules to generated BFF clients and contract schemas.
- [ ] MRG-346 Migrate Expo competition and match modules to generated BFF clients and contract schemas.
- [ ] MRG-347 Migrate Expo user, search, notification, and report modules to generated BFF clients and contract schemas.
- [ ] MRG-348 Migrate `club-scraper` Blockout API boundaries to canonical camelCase using the approved generated or typed
      adapter while preserving Python snake_case identifiers and external federation payloads.
- [ ] MRG-349 Migrate `competition-scraper` Blockout API boundaries to canonical camelCase using the approved generated
      or typed adapter while preserving Python snake_case identifiers and external federation payloads.
- [ ] MRG-350 Establish the generated event foundation selected by MRG-315, then migrate club, team, and pool lifecycle
      event contracts with canonical camelCase, versioning, compatibility, ordering, retry, and rollback evidence.
- [ ] MRG-369 Migrate favorite and follow event contracts and projections with canonical user UUIDs, idempotency,
      compatibility, reconciliation, and rollback evidence.
- [ ] MRG-370 Migrate match-finished and live-link event contracts and consumers with versioning, compatibility,
      acknowledgement, ordering, retry, and rollback evidence.
- [ ] MRG-371 Introduce transactional outboxes for clubs, teams, pools, and competition with event IDs, schema versions,
      idempotent publication, observation, cleanup, and per-service rollback.
- [ ] MRG-372 Introduce transactional outboxes for matches and users plus event-ID deduplication for migrated consumers,
      preserving existing queue, retry, requeue, and DLQ behavior.
- [ ] MRG-351 Remove global Jackson `SNAKE_CASE` and slice-owned Blockout annotations from config, clubs, teams, and
      pools only after every caller for those boundaries uses canonical camelCase.
- [ ] MRG-373 Remove global Jackson `SNAKE_CASE` and slice-owned Blockout annotations from competition, matches, and
      users only after every caller for those boundaries uses canonical camelCase.
- [ ] MRG-374 Remove global Jackson `SNAKE_CASE` and slice-owned Blockout annotations from reports, notifications,
      search-service, and search-worker only after every caller uses canonical camelCase.
- [ ] MRG-375 Remove global Jackson `SNAKE_CASE` and slice-owned Blockout annotations from `mobile-gateway` only after
      every generated downstream and Expo boundary uses canonical camelCase.
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
- [ ] MRG-406 Restructure `competition-service` association, statistics snapshot, bulk-command, and persistence
      boundaries with validated commands, role-owned views, dedicated entities, and structural mappers.
- [ ] MRG-422 Consolidate `competition-service` ranking, lifecycle, cascade, and event internals behind one ranking
      policy/projector, explicit transaction ownership, lifecycle services, and outbox adapters.
- [ ] MRG-407 Restructure `matches-service` match core, day projection, and persistence boundaries with separate
      commands, views, entities, projectors, and mappers.
- [ ] MRG-423 Restructure `matches-service` live-link decision, state, history, provider, and event internals while
      keeping live policy owned by the service and enrichment owned by the BFF.
- [ ] MRG-424 Restructure `matches-service` moderation and live-report internals into explicit commands, views,
      policies, entities, projections, and adapter mappings.
- [ ] MRG-408 Restructure `users-service` account, profile, local identity, Auth0, S3, and persistence boundaries;
      retain and relocate existing mappers only where their source/target ownership remains correct.
- [ ] MRG-425 Restructure `users-service` favorite internals as the canonical source and make team, pool, and
      notification follower state explicit derived, idempotent, rebuildable projections.
- [ ] MRG-426 Restructure `users-service` deletion and storage orchestration with explicit application plans, identity
      and object-storage ports, retention behavior, transaction ownership, and event/outbox adapters.
- [ ] MRG-409 Restructure `reports-service` Blockout API, application flow, attachment storage, GitHub, and Discord
      adapters without leaking vendor DTOs into application contracts.
- [ ] MRG-410 Restructure `notification-service` inbox, token, pagination, and persistence boundaries with role-owned
      commands, page views, entities, and mappers.
- [ ] MRG-427 Restructure `notification-service` delivery decisions, delivery ledger, retry state, and Expo provider
      adapter without leaking provider tickets or receipts into application contracts.
- [ ] MRG-428 Restructure `notification-service` event and follower projection internals as idempotent, rebuildable
      consumers with explicit reconciliation, deduplication, acknowledgement, and rollback policy.
- [ ] MRG-411 Restructure `search-service` query, filter, search-view, and Elasticsearch adapter boundaries without
      changing result ordering or empty-result behavior.
- [ ] MRG-412 Restructure `search-worker` bootstrap, schedules, generated client adapters, and immutable cache snapshots
      without reusing generated transport DTOs as worker domain models.
- [ ] MRG-429 Restructure `search-worker` event-consumer and incremental-projection internals with versioned event
      inputs, idempotency, stale-write protection, cache consistency, and reconciliation evidence.
- [ ] MRG-430 Implement versioned Elasticsearch index documents, validation, atomic alias swaps, bounded rollback-index
      retention, cleanup, and failed-rebuild reconciliation behind explicit worker application operations.
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
