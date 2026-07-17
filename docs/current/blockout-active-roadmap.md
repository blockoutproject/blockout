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

- [x] MRG-301 Build the deployed REST wire inventory from the MRG-250 field-lineage evidence, recording each owner,
      caller, method, path, parameter, security rule, request, response, error, pagination, multipart behavior, and
      current snake_case/camelCase name without treating Springdoc output as the target source.
  - Evidence: `docs/migration/mrg-301-deployed-rest-wire-inventory.md` freezes all 130 current operations across 35
    controllers as 80 owner-service and 50 BFF boundaries, with exact parameters, security, callers, shapes, error,
    pagination, multipart, casing, field-registry, and unknown-external-caller evidence; source reconciliation finds
    130 unique inventory rows, zero explicit operation IDs, and no search-worker controller. Prettier, local-link
    validation, Maaatch structure comparison, diff checks, and the backend Maven package build pass with tests
    intentionally skipped for this documentation-only task.
- [x] MRG-302 Inventory every RabbitMQ exchange, routing key, producer, consumer, event class, serialized payload, retry
      assumption, and casing rule separately from REST contracts.
  - Evidence: `docs/migration/mrg-302-deployed-rabbitmq-wire-inventory.md` freezes four topic exchanges, 11 producer
    keys, ten dead-letter keys, 19 primary queues, ten DLQs, 29 bindings, ten publisher methods, 14 listeners, five
    unconsumed primary queues, 25 routed event-class copies, producer failure/transaction gaps, consumer
    acknowledgement and retry assumptions, and exact camelCase converter fixtures plus current `__TypeId__` headers;
    it records the two inequivalent cross-service queue declarations and keeps broker/runtime facts explicit without
    changing topology or runtime code. Prettier, local-link validation, Maaatch structure comparison, diff checks, and
    the backend Maven package build pass with tests intentionally skipped for this documentation-only task.
- [x] MRG-303 Inventory every handwritten backend HTTP client, Expo API module, scraper request builder, Jackson naming
      setting or annotation, and case-conversion dependency; assign each one to a future generated or external adapter.
  - Evidence: `docs/migration/mrg-303-handwritten-client-casing-inventory.md` assigns 25 internal backend client
    classes, 14 external integrations, 48 Expo API methods, 24 Blockout and 11 provider scraper calls, 12 global
    `SNAKE_CASE` settings, and all 327 `@JsonProperty` sites to generated, external, or gated-removal owners; it adds
    the missing MRG-376 config-service slice and clarifies MRG-801 removal of the standalone `local-compose` CI job.
    Source reconciliation, Prettier, local-link validation, Maaatch structure comparison, diff checks, and the full
    backend Maven package build pass with tests intentionally skipped for this documentation-only task.
- [x] MRG-304 Publish the cutover matrix for standalone and monorepo coexistence from the approved MRG-268 architecture,
      including per-boundary compatibility, deployment order, rollback, and the exact point where temporary snake_case
      reads and duplicated legacy shapes can be removed.
  - Evidence: `docs/migration/mrg-304-contract-coexistence-cutover-matrix.md` fixes REST v1/v2 and RabbitMQ v1/v2
    coexistence for all 130 operations, 11 routes, and 19 queues, with provider-first task ownership, rollback,
    telemetry, and 30-day removal gates; Prettier, docs links, Maaatch comparison, diff checks, and the backend Maven
    package baseline pass with runtime checks intentionally skipped for this documentation-only task.
- [x] MRG-305 Define the Blockout fragment layout for shared schemas, internal service APIs, and the mobile-gateway BFF
      under `libs/shared/contracts/specs/source/**`, retaining Blockout service ownership and Expo terminology.
  - Evidence: `libs/shared/contracts/specs/source/README.md` fixes the deterministic shared, service-owned internal API,
    and Expo-facing `mobile-gateway` layout, fragment roles, bundle ownership, closed boundaries, and later generation
    owners without introducing placeholder contracts; Prettier, documentation links, Maaatch comparison, the contracts
    Nx project/typecheck, the no-source-JSON guard, and diff checks pass.
- [x] MRG-306 Port Maaatch's deterministic OpenAPI bundle generator with Blockout service names and output paths.
  - Evidence: `libs/shared/contracts/specs/scripts/bundle-openapi.mjs` ports deterministic fragment discovery, reference
    closure, tag filtering, and stable JSON output while enforcing the approved Blockout owner names and progressive
    no-source state; `@blockout/contracts:generate-openapi-bundles` owns the Nx inputs and
    `generated/specs/*.json` outputs. Node syntax, the uncached no-placeholder generation, contracts typecheck,
    documentation links, Maaatch comparison, formatting, and diff checks pass.
- [x] MRG-307 Port and adapt Maaatch's bundle tests for missing references, transitive schemas, stable ordering, shared
      enums, and deterministic output.
  - Evidence: `bundle-openapi.test.mjs` adds four passing workspace and temporary-fixture tests covering the progressive
    no-source state, top-level stable enums, shared and service schema closure, unused-schema exclusion, lexical path
    and component order, byte-identical repeated generation, and missing transitive references; the uncached
    `@blockout/contracts:test` target is enforced by both shadow CI workflows. Formatting, Nx project discovery, and
    diff checks pass.
- [x] MRG-308 Add source-contract lint that rejects snake_case property and Blockout-owned query names, duplicate
      operation IDs, inline stable enums, ambiguous DTO suffixes, and undocumented exceptions.
  - Evidence: `lint-openapi-source.mjs` and its five passing tests enforce canonical property/query names, owner-local
    operation ID uniqueness, shared top-level enums, explicit schema roles, and exact task-owned compatibility
    exceptions; malformed, duplicate, and stale exceptions fail. The cached `lint-openapi-source` Nx target and both
    shadow CI workflows enforce the empty current exception registry; the full nine-test contract suite, formatting,
    Nx discovery, documentation links, Maaatch comparison, typecheck, and diff checks pass.
- [x] MRG-309 Introduce generated OpenAPI bundles under `libs/shared/contracts/generated/specs/**` and prove two clean
      generations produce no diff.
  - Evidence: 12 minimal OpenAPI 3.0.3 source shells and their committed generated bundles cover shared, every REST
    owner, and the Expo-facing `mobile-gateway` without inventing operations, business schemas, security, or runtime
    authority. The generator now cleans its owned output, the bundle suite rejects stale artifacts, and both shadow CI
    workflows regenerate and require a clean generated tree; source lint, nine tests, two consecutive generations,
    formatting, documentation links, Maaatch comparison, typecheck, shell-shape checks, and diff checks pass.
- [x] MRG-310 Port Maaatch's generated `schemaMappings` synchronizer and protect its backend parent block from manual
      edits.
  - Evidence: the uncached `@blockout/contracts:sync-backend-schema-mappings` target derives a lexically ordered,
    duplicate-free `com.blockout.shared.model` mapping block from shared source schemas, handles the progressive empty
    source state, and rejects missing or repeated protection markers. Four synchronizer tests, the composite
    `generate-contracts` target, both shadow CI workflows, a dormant Maven plugin-management anchor, two clean syncs,
    contract tests/lint/generation, Maven baseline compilation, formatting, documentation links, Maaatch comparison,
    Nx discovery/typecheck, and diff checks pass without generating service APIs.
- [x] MRG-311 Configure the backend parent plugin management, Java type mappings, generated-source ownership, and
      shared generator options without generating service APIs yet.
  - Evidence: the backend parent now pins compiler, OpenAPI Generator, and build-helper plugins in dormant
    `pluginManagement`; shares Java 21 annotation processors, generator test/documentation suppression, tag/union/
    nullable/discriminator defaults, and `DateTime` to `Instant` mappings; and reserves module-local
    `target/generated-sources/openapi/<boundary>` ownership. Effective-POM inspection proves no OpenAPI or build-helper
    execution is active, no generated Java directory is created, and the unchanged 13-module Maven reactor packages;
    contract generation, formatting, documentation links, Maaatch comparison, Nx discovery/typecheck, and diff checks
    pass.
- [x] MRG-312 Add the backend `shared-models` module for generated shared enums and rare technical primitives, then
      compile it in the Maven reactor.
  - Evidence: `apps/backend/shared-models` is a model-only OpenAPI Generator module sourced exclusively from the
    committed shared bundle, overrides parent `schemaMappings` to generate the owning shared types, and registers only
    its module-local generated Java directory. The parent reactor and dependency management expose the module without
    adding it to any service prematurely; the current empty shared catalog generates no invented types. Two clean
    contract generations, targeted shared-model generation, the 14-module Maven package, formatting, documentation
    links, Maaatch comparison, Nx discovery, generated-source/status inspection, and diff checks pass.
- [x] MRG-313 Select the Expo-compatible TypeScript client and contract-schema generator, including React Query
      integration, auth/error mutator, output ownership, caching, formatting, generated-file policy, and the mobile
      form target.
  - Evidence: the approved decision pins Orval `8.22.0`, Zod `4.4.3`, React Hook Form `7.72.0`, and resolvers `5.2.2`;
    fixes mobile-owned Axios/TanStack generation, mutator and cache boundaries; separates wire, form, and request
    shapes; replaces Formik/Yup progressively through the legal pilot and MRG-507–516; and records per-form parity
    gates. Architecture, mobile policy, skill routing, documentation links, roadmap ownership, formatting,
    documentation validation, Maaatch comparison, unchanged backend packaging, and diff checks pass without changing
    dependencies, generated artifacts, Expo source, or runtime behavior.
- [x] MRG-314 Decide whether the two Python scrapers use a generated Python client, generated models with handwritten
      transport, or a typed handwritten adapter; define packaging, async support, auth, multipart, and retry criteria.
  - Evidence: the approved decision selects OpenAPI Generator `7.23.0` through CLI `2.39.1`, six service bundles in one
    local generated-source wheel, thin scraper-owned adapters, generated camelCase aliases, separate
    Blockout/provider transports, scraper-owned Auth0, generated multipart, no Blockout retry, safe error mapping,
    root-context image installation, and a 24-operation proof gate. A same-day transport amendment selects the
    generator's asynchronous `httpx` library after a real Clubs-contract proof; it supersedes MRG-330's interim
    `asyncio` output through MRG-378 before MRG-348/349. Architecture, scraper policy, documentation links, roadmap
    ownership, formatting, documentation validation, Maaatch comparison, unchanged backend packaging, and diff checks
    passed without changing runtime during the original decision task.
- [x] MRG-315 Select and document the authoritative event-contract format and generator strategy for RabbitMQ payloads;
      do not model asynchronous messaging as fake OpenAPI endpoints.
  - Evidence: the approved decision selects AsyncAPI `3.0.0` JSON, parser `3.6.0`, Modelina `5.10.1`, local-only
    deployable roots and a component catalog, deterministic bundles, Java 21 records in
    `com.blockout.events.v2.model`, a fixed v2 envelope and AMQP metadata without `__TypeId__`, hermetic Maven
    compilation, and the unchanged MRG-304 topology/exclusions. Architecture, contract-first policy, MRG-302 routing,
    documentation links, roadmap ownership, formatting, documentation validation, Maaatch comparison, unchanged
    backend packaging, and diff checks pass without creating event source, generated records, broker topology,
    publishers, listeners, outboxes, deployments, or runtime behavior.
- [x] MRG-316 Add shared REST primitives for Problem Details errors, security, pagination, bounded lists, identifiers,
      dates, and shared enums before service-specific schemas duplicate them.
  - Evidence: the authoritative shared catalog now contains `ProblemDetail`, `PageInfo`, UUID/numeric identifier and
    calendar/UTC date aliases, the exact twelve approved enum wires, Bearer JWT security, request correlation, bounded
    page parameters, and reusable `400`/`401`/`403`/`404`/`409`/`413`/`500` Problem Details responses. All eleven
    deployable bundles inherit the shared component and schema registries without allowing owner shadowing; typed owner-local
    `*ListResponse` and `*PageResponse` rules avoid an unsafe generic item bag. Eighteen sorted backend mappings use
    generated shared models or validated native Java types, 17 contract tests and source lint pass, two generations are
    clean, documentation and Maaatch structure checks pass, and the unchanged backend reactor packages successfully.
- [x] MRG-317 Define and bundle the `config-service` contract from its approved audit using only required wire fields and
      canonical camelCase names, without changing runtime behavior.
  - Evidence: the authoritative config source and generated bundle reconcile all sixteen MRG-301 operations across app
    status, divisions, legal documents, raw division mappings, and scraper statuses under `/api/v2/config/**`. Fourteen
    owner schemas retain only consumer-backed fields, typed bounded-list wrappers, operation-specific nullable update
    semantics, scoped security, and canonical multipart JSON/image parts; persistence-only fields and legacy casing are
    absent. Eighteen contract tests cover the exact operation IDs, scopes, public legal read, response fields, lists,
    multipart parts, and legal error compatibility; source lint, deterministic generation, documentation and Maaatch
    structure checks, and the unchanged backend reactor package successfully without modifying runtime code.
- [x] MRG-318 Define and bundle the `clubs-service` contract from its approved audit using only required camelCase wire
      fields, including multipart operations.
  - Evidence: the authoritative clubs source and generated bundle reconcile all six MRG-301 operations under
    `/api/v2/clubs/**`. Four owner schemas retain thirteen proven club, contact, location, lifecycle, image, and derived
    coordinate fields while omitting persistence timestamps; creation excludes the currently dropped address, update
    replaces the ambiguous logo URL sentinel with required `removeLogo`, and typed JSON/image multipart parts cover
    both writes. The growing list uses shared paging and stable name/identifier ordering with explicit legacy
    aggregation parity, while the logo read preserves authenticated plain-text and empty outcomes. Nineteen contract
    tests cover exact operation IDs, scopes, fields, page parameters, multipart shapes, logo intent, and response
    statuses; source lint, deterministic generation, documentation and Maaatch structure checks, and the unchanged
    backend reactor package successfully without modifying runtime code.
- [x] MRG-319 Define and bundle the `teams-service` contract from its approved audit using only required camelCase wire
      fields, including multipart operations.
  - Evidence: the authoritative teams source and generated bundle reconcile all eight MRG-301 operations under
    `/api/v2/teams/**`. Five owner schemas retain thirteen proven owner fields, isolate nine caller-owned creation
    fields, define partial update plus required `removeLogo`, and provide typed paged team and club-ID collections with
    deterministic ordering and explicit legacy aggregation. Shared format/gender enums and numeric identifiers replace
    local copies; follower mutations keep their scope and user identity but return canonical `204` instead of an unused
    entity body, with v1 `200` compatibility retained for later adapters. Twenty contract tests cover exact operation
    IDs, scopes, fields, pagination, repeated IDs, multipart parts, logo intent, and follower responses; source lint,
    deterministic generation, documentation and Maaatch structure checks, and the unchanged backend reactor package
    successfully without modifying runtime code.
- [x] MRG-320 Define and bundle the `pools-service` contract from its approved audit using only required camelCase wire
      fields.
  - Evidence: the authoritative pools source and generated bundle reconcile all seven MRG-301 operations under
    `/api/v2/pools/**`. Four owner schemas retain thirteen proven owner fields, isolate ten caller-owned creation
    fields, and define an eleven-field partial update whose explicit `active` intent separates reactivation and
    deactivation from ordinary changes. Shared format/gender enums and numeric identifiers replace local copies; the
    growing list uses shared paging plus stable season/name/identifier ordering and explicit legacy aggregation.
    Follower mutations keep their scope and user identity but return canonical `204` instead of an unused entity body,
    with v1 `200` compatibility retained for later adapters. Twenty-one contract tests cover exact operation IDs,
    scopes, fields, pagination, repeated IDs, lifecycle intent, and follower responses; source lint, deterministic
    generation, documentation and Maaatch structure checks, and the unchanged backend reactor package successfully
    without modifying runtime code.
- [x] MRG-321 Define and bundle the `competition-service` contract from its approved audit using only required
      camelCase wire fields and explicit ranking semantics.
  - Evidence: the authoritative competition source and generated bundle reconcile all eight MRG-301 operations under
    `/api/v2/competitions/**`. Nine owner schemas retain the twenty-one required association/statistics fields, require
    all seventeen values for full snapshot replacement, name the three missing-ID lifecycle commands accurately, and
    omit persistence-only identity and timestamps. Association and pool-ranking collections use shared pages and
    stable identifiers; competition-service owns the ranking policy of points descending, penalty ascending, wins and
    coefficients descending, then team ID ascending as a deterministic tie-breaker. Add/reactivate retains its two
    required scopes and audited history/club behavior, while empty lifecycle commands return canonical `204` with v1
    `200` compatibility retained. Twenty-two contract tests cover exact operation IDs, scopes, fields, full snapshot,
    pages, lifecycle requests/statuses, and ranking order; source lint, deterministic generation, documentation and
    Maaatch structure checks, and the unchanged backend reactor package successfully without modifying runtime code.
- [x] MRG-322 Define and bundle the `matches-service` contract from its approved audit using only required camelCase
      wire fields, including day pages, live links, and live summaries.
  - Evidence: the authoritative matches source and generated bundle reconcile all sixteen MRG-301 operations under
    `/api/v2/matches/**` across owner match/day, live/moderation, and internal-test families. Seventeen owner schemas
    separate scraper commands, owner snapshots, detail/live projection, grouped day cursor, moderation/history pages,
    live commands/results, missing-code lifecycle input, and REST-only test triggers while keeping AsyncAPI event
    authority. Server identity/status/lifecycle/timestamps are absent from writes; detail omits persistence state,
    history drops route-duplicated match ID, and moderation documents the actual filter/representative behavior without
    promising an absent time window. Existing match/live policies and transitions remain unchanged, while growing
    collections page with explicit legacy aggregation and bulk deactivation returns canonical `204` with v1 `200`
    compatibility. Twenty-three contract tests cover exact operation IDs, fields, scopes, paging/grouping, live result,
    report constraints, moderation semantics, lifecycle status, and event-source separation; source lint,
    deterministic generation, documentation and Maaatch structure checks, and the unchanged backend reactor package
    successfully without modifying runtime code.
- [x] MRG-323 Define and bundle the `users-service` contract from its approved audit using only required camelCase wire
      fields and current authentication semantics.
  - Evidence: the authoritative users source and generated bundle reconcile all nine MRG-301 operations under
    `/api/v2/users/**` across account, identity-role, and favorite families. The canonical account view uses the local
    positive numeric Blockout identifier and retains only seven proven fields; Auth0 subjects remain limited to audited
    identity/profile compatibility while names, phone, active/update state, JPA relationships, and favorite persistence
    fields stay out of v2. Profile multipart uses explicit `removePicture` intent instead of the legacy picture URL
    echo/null protocol, and favorite reads use a stable shared page with reduced entries while v1 retains its current
    unpaged adapter. Bearer scopes, type-dependent team/pool follow scopes, exact API-key override, the unbound Auth0
    update path, idempotent follow outcomes, Auth0-first deletion, and distributed/storage behavior remain explicit and
    unchanged. Twenty-four contract tests cover exact operation IDs, security schemes/scopes, UUID identity, minimal
    fields, multipart image intent, favorite paging/query casing, no-op statuses, and preserved authorization/deletion
    semantics; source lint, deterministic generation, documentation and Maaatch structure checks, and the unchanged
    backend reactor package successfully without modifying runtime code.
- [x] MRG-324 Define and bundle the `reports-service` contract from its approved audit, separating required Blockout
      camelCase payloads from GitHub and Discord vendor adapters.
  - Evidence: the authoritative reports source and generated bundle define the single audited
    `POST /api/v2/reports` operation with bearer authentication, `create:reports`, a canonical JSON `data` part, and
    repeated binary `images`. The Blockout command contains only the nine consumer-backed camelCase context fields,
    uses the shared report enum and canonical optional numeric user ID, and excludes caller-controlled attachment URLs. The
    Blockout result retains only issue number, public URL, and title; GitHub IDs/state/SDK shapes, labels/Markdown, S3
    storage objects, Discord payloads, and provider configuration remain adapter-owned and absent from OpenAPI. Current
    sequential upload, GitHub create/update, best-effort Discord, partial-success, empty-image, missing count/idempotency,
    and file/request-limit behavior remains documented and unchanged. Twenty-five contract tests cover the exact
    operation, scope, command fields/requiredness, multipart shape, minimal result, provider-model exclusion, statuses,
    and side-effect policy; source lint, deterministic generation, documentation and Maaatch structure checks, and the
    unchanged backend reactor package successfully without modifying runtime code.
- [x] MRG-325 Define and bundle the `notification-service` REST contract from its approved audit, keeping RabbitMQ event
      contracts in their separately selected source format.
  - Evidence: the authoritative notification source and generated bundle reconcile all six MRG-301 operations under
    `/api/v2/notifications/**` across current-user inbox, state mutation, deletion, unread-count, and push-token
    families. The generated inbox view replaces direct JPA exposure with nine role-owned camelCase fields, makes
    `divisionId` an explicit enrichment input instead of exporting generic metadata, and omits recipient/target storage
    keys and read/open persistence timestamps. The stable page uses `items + pageInfo`, retains the mobile default of
    20, adds validation and a created-time/identity tie-breaker, while the isolated v1 adapter keeps its legacy wrapper,
    query name, cursor fields, and current ordering until cutover. Unread count is explicit, repeated read/open/delete
    404 behavior remains documented, and push registration uses the canonical numeric user ID plus required token, shared
    platform enum, and device identifier without hiding the existing path-ownership gap. Expo provider models,
    delivery-ledger/follower persistence, and every RabbitMQ/AsyncAPI artifact remain outside OpenAPI. Twenty-six
    contract tests cover operation IDs, scopes, schemas, page semantics, mutation outcomes, token validation, numeric ID
    identity, provider/event exclusions, source lint, and deterministic generation; documentation and Maaatch structure
    checks and the unchanged backend reactor package successfully without modifying runtime code.
- [x] MRG-326 Define and bundle the `search-service` contract from its approved audit using only required camelCase wire
      fields; classify `search-worker` as an event consumer rather than inventing REST behavior.
  - Evidence: the authoritative search source and generated bundle reconcile the three MRG-301 club, team, and pool
    reads under `/api/v2/search/**` with authenticated no-scope access, canonical `divisionId`, and shared format/gender
    filter enums. Three owner-local bounded `ListResponse` shapes replace raw arrays and Elasticsearch documents while
    retaining the five-item random blank-query branch, twenty-item relevance branch, current analyzer/filter/order,
    hidden-store-failure empty result, and nullable source behavior. Result items keep only proven mobile card, label,
    image, and navigation inputs; short names, team club copies, filter-only division IDs, phantom division colors,
    `all`, `name_suggest`, mappings, credentials, and worker cache/event shapes remain outside REST. The documentation
    explicitly keeps `search-worker` controller-free as a generated-client/event consumer and Elasticsearch projection
    owner. Twenty-seven contract tests cover the exact operations, authentication, camelCase parameters, shared enums,
    bounded wrappers, reduced nullable fields, empty/failure semantics, and absence of worker/store/event leakage;
    source lint, deterministic generation, documentation and Maaatch structure checks, and the unchanged backend reactor
    package successfully without modifying runtime code.
- [x] MRG-327 Define and bundle the `mobile-gateway` configuration, user, report, search, and notification BFF contracts
      from the approved aggregation audits, with workflow projections distinct from internal-service DTOs.
  - Evidence: the authoritative mobile-gateway source and generated bundle reconcile all 30 MRG-301 relay operations
    allocated by MRG-304 across fifteen configuration, five account/favorite, one report, three search, and six
    notification workflows. Exact public/secure v2 paths and bearer behavior, camelCase query and multipart fields,
    typed bounded lists, notification `items + pageInfo`, explicit `unreadCount`, canonical numeric local user ID, explicit
    picture intent, and reduced Expo projections replace copied internal DTOs without exposing persistence, vendor,
    Elasticsearch, cache, delivery, or event models. The documentation preserves v1 raw arrays, snake_case, `count`,
    `nextPage`, status, auth, cache, null, fallback, and partial-failure behavior for later compatibility adapters.
    Twenty-eight contract tests cover the exact operation set, security split, schemas, wrappers, multipart shapes,
    identity, casing, workflow fields, and leakage exclusions; source lint and deterministic generation pass without
    changing runtime code.
- [x] MRG-357 Define and bundle the `mobile-gateway` club, team, and pool BFF contracts, retaining only consumer-backed
      enriched fields and explicit ordering, missing-data, privacy, and partial-result semantics.
  - Evidence: the mobile-gateway source and generated bundle add all nine MRG-301/MRG-304 club, team, and pool facade
    operations as workflow-owned v2 projections, bringing the BFF bundle to 39 operations. Direct club profiles restore
    owner-backed nullable address and enforce phone exclusion; detail, summary, nested-pool, division, ranking, and
    update-result roles are distinct and omit embedded clubs, audit/lifecycle fields, unused compatibility fields, and
    server-only ranking inputs. Typed list wrappers retain deduplication, silent missing/inactive omission, nullable
    division enrichment, no partial marker, downstream/set-derived non-guaranteed order, full-detail failure, inactive
    pool reads, and exact-tie behavior without inferring a correction. Club/team multipart commands use canonical JSON
    plus explicit logo intent and pool updates use a narrow JSON command. Twenty-nine contract tests cover the exact
    operation/security matrix, projection fields, privacy, nullability, list and ranking semantics, repeated IDs,
    multipart inputs, and separation from downstream DTOs; source lint passes across 132 fragments without runtime
    changes.
- [x] MRG-358 Define and bundle the `mobile-gateway` competition, match, and live BFF contracts, separating list,
      detail, history, moderation, ranking, pagination, signed-link, and partial-result projections.
  - Evidence: the mobile-gateway source and generated bundle add the final eleven MRG-301/MRG-304 facade operations,
    bringing the BFF contract to all 50 inventoried operations across public match days/detail, secure live commands,
    paged history/moderation, and signed federation PDF continuation. Twenty-three new workflow-owned schemas separate
    list rows, detail teams/pools/divisions, match-only ranking, signed documents, live commands/results, history, and
    moderation cards without reusing downstream DTOs. The grouped day cursor preserves date-count pagination,
    terminal-empty behavior, status-dependent order, silent pool/day drops, nullable missing team sides, and no partial
    marker; detail remains all-or-error and exact ranking ties remain unspecified. History and moderation use canonical
    pages with explicit v1 aggregation, existing order/tie gaps, filter/representative mismatch, silent catalog drops,
    and no invented omission count. Binary PDF continuation is `no-store` and keeps vendor payloads adapter-local.
    Thirty contract tests cover the exact 50-operation/security matrix, casing, fields, cursor/pages, partial behavior,
    ranking, commands, report constraints, and signed response; source lint passes across 137 fragments without runtime
    changes.
- [x] MRG-328 Pin Orval `8.22.0` and add the mobile `codegen` Nx target after BFF bundle generation. Generate committed,
      formatted, deterministic mobile-gateway models under `src/api/generated/mobile-gateway/models`, tag-split React
      Query operations/hooks with Axios under `endpoints`, and a second Zod output with `.zod.ts` suffix under
      `schemas`, all with `clean: true`; keep `src/api/core/orvalAxios.ts` handwritten and preserve the singleton
      QueryClient and its current defaults.
  - Evidence: the mobile workspace pins Orval `8.22.0`; `@blockout/mobile:codegen` depends on the canonical contract
    bundle and emits 127 models plus 12 tag-split React Query/Axios endpoint files and 12 `.zod.ts` wire-schema files,
    covering all 50 unique mobile-gateway operation IDs. Every one of the 151 committed artifacts carries the Orval
    generated-file header, and two forced generations produced identical SHA-256 sets. The handwritten
    `orvalAxios.ts` uses the existing gateway base URL, Auth0 supplier/one-`401` cleanup path, repeated parameters,
    20-second timeout, cancellation, body extraction, `ApiError`, and Problem Details metadata without casing, retry,
    invalidation, or a second QueryClient; existing callers remain on their current transport. CI regenerates and
    rejects a diff. Per MRG-313, the generated wire schemas remain unimported and excluded from application typecheck
    until MRG-329 installs Zod directly. Contract tests (30), source lint (137 fragments), mobile typecheck, combined
    Android/iOS Expo export, documentation links, Maaatch structure comparison, and the unchanged 14-module backend
    package baseline all pass.
- [x] MRG-329 Pin React Hook Form `7.72.0`, `@hookform/resolvers` `5.2.2`, and Zod `4.4.3`; create the allowlisted
      `src/forms/index.ts` mobile API; adapt proven common primitives to `fieldState.error`/`isTouched`; require
      `Controller` or `useController` for native fields; and prohibit new Formik/Yup forms while leaving unmigrated
      forms operational until MRG-516.
  - Evidence: the mobile package pins the three approved runtime versions exactly, and `src/forms/index.ts` exposes
    only the MRG-313 value/type allowlist; it does not expose `register`, DOM helpers, components, or form policy. The
    generated `.zod.ts` wire schemas now participate in a forced full TypeScript build. `Field` and `FieldError` accept
    React Hook Form-compatible `fieldState.error.message`/`fieldState.isTouched` while retaining their legacy
    `error`/`touched` fallback, so no existing form or sheet behavior changes. The Nx/CI form-boundary guard fixes the
    exact nine transition-only Formik/Yup files, rejects any new legacy import, and requires all handwritten RHF,
    resolver, and Zod imports to pass through the central API; a negative direct-import probe failed as expected. The
    mobile policy and architecture now record the active stack, while generic Zod-skill adoption remains explicitly
    deferred to MRG-505. Clean install, form guard, deterministic Orval guard, contract tests (30), source lint (137
    fragments), forced mobile typecheck, combined Android/iOS Expo export, documentation links, Maaatch structure
    comparison, and the unchanged 14-module backend package baseline all pass.
- [x] MRG-330 Pin `@openapitools/openapi-generator-cli` `2.39.1` and OpenAPI Generator `7.23.0`; generate Python 3.12
      `asyncio` clients for config, clubs, teams, pools, competition, and matches into committed
      `blockout-contract-clients` `src/**`; expose `@blockout/contracts:generate-python-clients`; build one local wheel;
      switch both scraper Docker targets to root context and install it; and prove two-run no-diff plus all 24
      Blockout operations, JSON/list/query/path/`204`/multipart/Auth0/proxy/timeout/no-retry/error/lifecycle fixtures.
  - Evidence: the workspace pins CLI `2.39.1` and generator `7.23.0`; six stable configurations generate 149 committed
    Python 3.12 `asyncio` files in the one private `blockout-contract-clients` wheel, and two clean executions produce
    the same SHA-256 source digest. The audited operation manifest resolves six club and eighteen competition scraper
    calls to asynchronous generated methods. Nine focused fixtures prove camelCase aliases, list/query/path/`204`,
    generated multipart file handling, per-call Bearer refresh, `trust_env`, connector limit 20, 10/60-second timeout
    profiles, proxy propagation, no Blockout retry, safe Problem Details mapping, explicit close, and adapter
    isolation. Both scraper-owned factories preserve the handwritten runtime boundary for MRG-348/349; their Nx and
    shadow-CI image builds now use the monorepo root, build/install the local wheel on Python 3.12, and retain the
    existing entry points. Generated imports, Python syntax, wheel construction, contract docs, and baseline checks
    pass without changing any current scraper call or provider retry.
- [x] MRG-331 Configure generated Spring interfaces and models for `config-service`, then migrate legal-document read
      and update through generated DTOs, role-owned application records, entity mapping, canonical camelCase,
      Problem Details compatibility, and rollback evidence.
  - Evidence: `config-service` now generates its Spring v2 boundary from the authoritative config bundle and implements
    `CFG-08`/`CFG-09` through adapter-owned generated DTOs, strict API/persistence MapStruct mappers, one application
    command/snapshot use case, and a persistence-only entity. The isolated v1 adapter preserves the complete snake_case
    entity-shaped body, exact GET lookup, normalized PUT lookup, null-preserving partial updates, legacy error/security
    handling, and all current BFF callers; the v2 route emits the generated canonical body and Problem Details with
    stable codes and request IDs. Structured compatibility telemetry records route version, operation, status class,
    latency, safe request ID, Problem Details code, and legacy parse failures without payloads. Eight focused tests,
    all 30 contract tests, documentation validation, Maaatch structural comparison, whitespace checks, and the full
    14-module Maven package pass. `docs/migration/mrg-331-legal-document-runtime-migration.md` owns provider-first
    deployment and rollback evidence; no consumer, database, event, production, or standalone repository changed.
- [x] MRG-332 Replace handwritten `mobile-gateway` access to the MRG-331 slice with its generated internal client and
      prove request, response, error, auth, and casing parity.
  - Evidence: `mobile-gateway` now generates its Spring v2 server boundary and config-service Java client from the
    committed bundles. `BFF-P-05` and `BFF-S-07` map generated transports immediately through strict MapStruct adapters
    to workflow-owned records; preserve forwarded-user versus M2M auth, timeouts, null partial updates, camelCase
    success bodies, scoped Problem Details, request IDs, and compatibility telemetry; and isolate the complete
    entity-shaped v1 snake_case response in an explicitly named legacy client. Eleven focused tests, all 30 contract
    tests, source lint, deterministic Orval regeneration, mobile typecheck, documentation validation, Maaatch
    comparison, whitespace checks, and the full 14-module Maven package pass. The generated legal Expo output is only
    retagged and remains unused until MRG-333. A user-requested Python generator re-evaluation also adds MRG-378:
    standard generated async `httpx` will replace MRG-330's interim `asyncio` output before scraper runtime migration;
    no scraper source, generated Python artifact, production, standalone repository, or Maaatch file changed.
- [x] MRG-333 Replace the legal-document Expo handwritten call with the generated BFF client and wire schema, then
      migrate `LegalDocumentForm` as the first complete React Hook Form/Zod pilot. Preserve title, version, Markdown
      content, exact messages, external submit registration, footer state, reset behavior, view-model/query ownership,
      and a typed transform into the generated request.
  - Evidence: the legal read hook now owns the existing one-hour cache policy while consuming the generated Orval v2
    operation, query key, response model, and generated Zod wire schema. Its explicit projection removes obsolete v1
    persistence/audit fields and provides controlled strings for nullable wire values. `LegalDocumentForm` uses
    React Hook Form `Controller`, a handwritten Zod schema with the exact three French messages and no added trim, and
    a named transform into `UpdateMobileLegalDocumentRequest` validated by the generated update schema before the
    generated mutation. External submit registration, validity/loading footer state, resource reset, touched errors,
    Markdown input, haptics, toast, refetch, and close-after-success remain owned by the existing mobile workflow. The
    two handwritten legal methods are removed from `ConfigApi`; its other v1 operations are untouched. Seven focused
    contract tests, the eight-file transition guard, mobile typecheck, Android/iOS exports, deterministic codegen,
    documentation validation, Maaatch comparison, and whitespace checks pass. No server, production, standalone,
    scraper, event, database, or Maaatch file changed.
- [x] MRG-377 Normalize the OpenAPI source syntax after the complete legal-document generator pilot and before any
      remaining service runtime migration. Inline positive numeric identifiers as standard `integer`/`int64` schemas
      with their constraint instead of exporting `NumericIdentifier`; remove `x-java-type`, `x-required-scope`,
      `x-required-scopes`, and `x-required-scopes-by-entity-type`; derive Java scalar mappings only from standard
      OpenAPI type/format pairs; retain standard bearer security, explicit auth/error responses, and runtime-owned
      authorization rules; regenerate every REST bundle and committed JavaScript/Python client output; and prove
      deterministic generation, unchanged wire/auth behavior, no scalar wrapper model, and Maaatch-style source
      syntax. This normalization may not reopen any approved payload, route, scope, or coexistence decision.
  - Evidence: all positive numeric identifiers are now inline standard `integer`/`int64` scalars with `minimum: 1`;
    the shared wrapper and every `x-java-type`/custom scope extension are removed from source and generated bundles.
    Backend scalar mappings derive from standard formats, and regenerated Java, Orval/Zod, and official OpenAPI
    Generator Python outputs use native `Long`, `number`, and `int` shapes without handwritten client code. The 130
    operation contract suite, standard Bearer/error guards, two-run artifact hashes, Python 3.12 tests and wheel,
    mobile typecheck and Android/iOS export, complete 14-module Maven package, documentation validation, Maaatch
    comparison, and whitespace checks pass. Runtime authorization, v1/v2 coexistence, scrapers, events, databases,
    production, standalone repositories, and Maaatch remain unchanged; MRG-378 still owns the generated async `httpx`
    transport switch before scraper migration.
- [x] MRG-376 Migrate the remaining `config-service` app-status, division, raw-mapping, and scraper-status generated
      server boundaries with application records, entity mappings, compatibility, and the search-worker generated
      snapshot client; leave BFF, Expo, and scraper caller cutovers to MRG-343, MRG-344, MRG-348, and MRG-349.
  - Evidence: all 14 remaining config-service operations now implement generated v2 Spring interfaces through
    feature-owned commands/views, strict MapStruct API and persistence mappings, dedicated JPA entities, shared enums,
    a division logo intent/storage port, canonical Problem Details, and per-operation coexistence telemetry. Isolated
    adapter-local v1 snake_case records preserve list/entity shapes, scopes, null semantics, multipart behavior,
    reactivation, soft deletion, raw entity-shaped creation, scraper upsert, and legacy errors without entity exposure
    or handwritten Jackson annotations. The raw update source now correctly permits omission or explicit null to
    unmap fields instead of generating contradictory `@NotNull` validation; the config bundle, official generated
    Python model, and wheel are regenerated. Search-worker now uses the official generated Java `DivisionsClient`,
    existing Auth0 bearer transport, normalized v2 base URL, and an immediate immutable `DivisionSnapshot` projection;
    its handwritten config client and annotated DTO are removed. The 19 impacted Java behavior tests, 30 contract
    tests, OpenAPI lint, nine Python 3.12 client tests, deterministic bundle/model regeneration, complete 14-module
    backend package, documentation links, Maaatch comparison, Prettier, and whitespace checks pass. Mobile-gateway,
    Expo, scraper runtime calls, databases, events, standalone repositories, production, and Maaatch remain unchanged.
- [x] MRG-334 Migrate `clubs-service` generated server boundaries and internal generated clients, including multipart
      mapping and temporary compatibility defined by MRG-304.
  - Evidence: all six club operations now implement generated v2 Spring interfaces through feature-owned create and
    update commands, `ClubView`/`ClubPage`, a dedicated JPA entity, strict MapStruct API and persistence mappings,
    explicit logo intent, an S3 port, progressive Problem Details, and per-operation coexistence telemetry. The
    isolated v1 adapter retains snake_case records, entity-shaped audit fields, scopes, authenticated unscoped logo
    reads, list shape, null-preserving updates, logo removal/replacement semantics, reactivation, soft deletion,
    storage ordering, errors, and the unversioned club upsert event without exposing entities or handwritten Jackson
    annotations.
    Search-worker now uses the official generated Java `ClubsClient`, existing Auth0 bearer transport, normalized v2
    base URL, complete page aggregation, and immediate immutable minimal snapshots; its handwritten club client and
    annotated copied DTO are removed. The 15 impacted Java tests, 30 contract tests, 136-fragment OpenAPI lint,
    complete 14-module Maven package, documentation links, Maaatch comparison, Prettier, and whitespace checks pass.
    Mobile-gateway, Expo, Python scrapers, databases, event topology, standalone repositories, production, Maaatch,
    Orval settings, and Python generator settings remain unchanged.
- [x] MRG-335 Migrate `teams-service` generated server boundaries and internal generated clients, including multipart
      mapping and temporary compatibility defined by MRG-304.
  - Evidence: all eight team operations now implement generated v2 Spring interfaces through feature-owned canonical
    and legacy create commands, null-preserving updates, `TeamView`/paged projections, a dedicated JPA entity, strict
    MapStruct mappings, explicit logo intent, an S3 port, follower commands, progressive Problem Details, and
    per-operation coexistence telemetry. The isolated v1 adapter retains snake_case records, direct entity-shaped
    creation and defaults, audit fields, complete list shapes, filters, ordering, logo behavior, scopes, full follower
    responses, soft/cascade deactivation, errors, and the unversioned upsert event without entity exposure or
    handwritten Jackson annotations. Search-worker, notification-service, and users-service now use official
    generated Java team clients with their existing Auth0 transports, normalized v2 URLs, immediate immutable
    projections, complete worker page aggregation, canonical `userId`, and generated `204` follower calls; three
    handwritten clients and two copied DTOs are removed. The 17 new targeted Java tests plus six retained worker tests,
    contract/lint, full backend, documentation, Maaatch comparison, Prettier, and whitespace checks pass.
    Mobile-gateway, Expo, Python scrapers, databases, event topology, standalone repositories, production, Maaatch,
    Blockout Orval settings, and Python generator settings remain unchanged.
- [x] MRG-336 Migrate `pools-service` generated server boundaries and internal generated clients with parity evidence.
  - Evidence: all seven pool operations now implement generated v2 Spring interfaces through feature-owned canonical
    and legacy create commands, null-preserving updates, `PoolView`/paged projections, a dedicated JPA entity, strict
    MapStruct mappings, follower commands, progressive Problem Details, and per-operation coexistence telemetry. The
    isolated v1 adapter retains snake_case records, direct entity-shaped creation and defaults, audit fields, complete
    list shape, filters, ordering, scopes, full follower responses, zero-floor decrements, soft/cascade deactivation,
    errors, nullable legacy event enums, and the unversioned upsert event without entity exposure or handwritten
    Jackson annotations. Search-worker, notification-service, and users-service now use official generated Java pool
    clients with their existing Auth0 transports, normalized v2 URLs, immediate immutable projections, complete
    worker page aggregation, canonical `userId`, and generated `204` follower calls; three handwritten clients and two
    copied DTOs are removed. The 15 new targeted Java tests plus retained client tests, contract/lint, full backend,
    documentation, Maaatch comparison, Prettier, and whitespace checks pass. Mobile-gateway, Expo, Python scrapers,
    databases, event topology, standalone repositories, production, Maaatch, Blockout Orval settings, and Python
    generator settings remain unchanged.
- [x] MRG-337 Migrate `competition-service` association and statistics generated server boundaries and internal clients,
      preserving full-snapshot, validation, persistence, and reactivation behavior.
  - Evidence: `COMP-01`, `COMP-02`, `COMP-03`, and `COMP-07` now implement generated v2 Spring interfaces through an
    explicit add/reactivate command, complete seventeen-field statistics snapshot, role-owned view/page records, strict
    API and persistence MapStruct mappings, a dedicated JPA entity, progressive Problem Details, and per-operation
    coexistence telemetry. The isolated v1 adapter retains snake_case, unpaged arrays, direct 200 responses,
    entity-shaped identity/audit fields without entity exposure, original scopes and errors, zero-state creation,
    stored club identity, historical statistics, reactivation, and nullable full-replacement failure behavior.
    Ranking and lifecycle behavior remain v1-only behind separate services for MRG-359/360. Repository reconciliation
    proves there is no in-scope backend Java client: mobile-gateway and scraper caller migrations remain assigned to
    MRG-368 and MRG-348/349. Eleven focused tests plus contract/lint, full backend, documentation, Maaatch comparison,
    Prettier, and whitespace checks pass. Contracts, generated artifacts, databases, events, BFF, Expo, scrapers,
    standalone repositories, production, Maaatch, Blockout Orval settings, and Python generator settings are unchanged.
- [x] MRG-359 Migrate `competition-service` ranking boundaries through one owner projection and ordering policy, with
      exact BFF/Expo ordering and tie parity.
  - Evidence: `COMP-08` now implements the generated v2 ranking interface through immutable application views, a
    pool-group page, strict MapStruct mapping, and one service-owned ordering policy. Pool groups sort by `poolId`;
    complete nested rankings preserve the current BFF keys—points, penalty, wins, set coefficient, and point
    coefficient—then use `teamId` as the deterministic tie-breaker. The isolated unpaged v1 adapter invokes the same
    projection and retains snake_case without the two former service transport DTOs or handwritten Jackson
    annotations. Mobile-gateway and Expo remain on v1 for MRG-368 and MRG-346. Five new targeted tests plus the eleven
    retained competition tests, contract/lint, full backend, documentation, Maaatch comparison, Prettier, and
    whitespace checks pass. Contracts, committed generated artifacts, databases, events, BFF, Expo, scrapers,
    standalone repositories, production, Maaatch, Blockout Orval settings, and Python generator settings are
    unchanged.
- [x] MRG-360 Migrate `competition-service` bulk lifecycle and cascade boundaries, preserving missing-ID, zero-item,
      deactivation, transaction, and rollback behavior without activating absent consumers.
  - Evidence: `COMP-04`, `COMP-05`, and `COMP-06` now implement the generated v2 lifecycle interface through strict
    generated-request mapping, defensive set-owned commands, a transactional bulk service, an explicit cascade plan
    and service, and an application event port. Canonical requests use camelCase, validate identifiers, preserve empty
    no-ops and duplicate semantics, and return `204`; the isolated v1 adapter retains snake_case and empty `200`
    responses. Existing unversioned Rabbit payloads, routing keys, cascade eligibility, mixed candidates, zero-row
    early returns, publisher-failure rollback behavior, and listener gaps remain unchanged. Competition and club
    scrapers stay on v1 for MRG-349 and MRG-348. Ten new targeted tests plus the sixteen retained competition tests,
    contract/lint, full backend, documentation, Maaatch comparison, Prettier, and whitespace checks pass. Contracts,
    committed generated artifacts, databases, queues, listeners, BFF, Expo, scrapers, standalone repositories,
    production, Maaatch, Blockout Orval settings, and Python generator settings are unchanged.
- [x] MRG-338 Migrate `matches-service` match core and day-page generated boundaries and internal clients with date,
      pagination, ordering, status, null, and scraper parity.
  - Evidence: `MATCH-01` through `MATCH-06` now implement the generated `MatchesApi` and `MatchDaysApi` through
    role-owned commands, snapshots and grouped-day views, strict MapStruct mapping, one transactional application
    service, stable owner pagination, Paris-local day assembly, progressive Problem Details, and compatibility
    telemetry. The isolated v1 adapter retains snake_case, unpaged scraper reads, `size`, empty `200` lifecycle
    responses, active/audit fields, null behavior, one-way finishing, event-before-save order, empty-day cursor
    behavior, and newest-active-link enrichment. Five superseded core DTOs are removed. No in-scope backend Java
    client exists; mobile-gateway and the competition scraper remain assigned to MRG-368 and MRG-349. Thirteen focused
    tests plus contract/lint, full backend, documentation, Maaatch comparison, Prettier, and whitespace checks pass.
    Contracts, committed generated artifacts, databases, event topology, BFF, Expo, scrapers, standalone repositories,
    production, Maaatch, Blockout Orval settings, and Python generator settings are unchanged.
- [x] MRG-361 Migrate `matches-service` live command, response, and history boundaries while preserving ownership,
      quota, state-transition, provider, ordering, and compatibility behavior.
  - Evidence: `MATCH-08` through `MATCH-10` now implement separate generated `MatchLiveLinkHistoryApi` and
    `MatchLiveLinksApi` boundaries through an explicit command, result/history views, one transactional application
    service, strict persistence/API mappers, stable newest-first history pagination, progressive Problem Details, and
    compatibility telemetry. Ownership, seven-day account age, exact provider hosts, AALNV exclusion, publication
    window, per-match and daily quotas, active/pending/expired/deactivated transitions, no-ops, event timing, and v1
    response fields remain intact. The v1 adapter retains unpaged snake_case history. Matches-service now generates
    `UserAccountsClient`, normalizes versioned user URLs, and immediately reduces the canonical response to a minimal
    snapshot. The provider-first gate keeps an isolated JsonNode-based v1 adapter primary until MRG-339 activates the
    generated caller and deletes that adapter; no fallback or dual call is added. Reporting and moderation are
    isolated under their own generated tags for MRG-362. Three live DTOs, two copied user DTOs, and the two generic
    handwritten client classes are removed. Thirteen new targeted Java tests plus thirteen retained matches tests,
    ten Python generated-client tests, thirty contract tests, contract/lint, full backend,
    documentation, Maaatch comparison, Prettier, and whitespace checks pass. Databases, event topology, BFF, Expo,
    scraper runtime, standalone repositories, production, Maaatch, Blockout Orval settings, and Python generator
    settings are unchanged.
- [x] MRG-362 Migrate `matches-service` moderation and live-report boundaries with explicit commands, views, validation,
      representative-selection, filter, error, and concurrency parity.
  - Evidence: `MATCH-07` and `MATCH-11` through `MATCH-14` now implement the generated `MatchModerationApi` and
    `MatchLiveLinkReportsApi` through role-owned query/page/view, decision and report commands, two transactional
    application services, strict persistence/API mapping, and progressive Problem Details. The status filter still
    tests all history while the displayed link keeps the audited status-priority selection; v2 pages only after that
    selection, while the isolated v1 adapter remains an unpaged snake_case array with legacy-only fields. Approval,
    rejection, reactivation, duplicate-report no-op, three/ten-report auto-hide thresholds, error outcomes, Auth0
    ownership, and concurrent uniqueness-failure rollback remain intact. The two Lombok/Jackson DTOs and two former
    transport-centric services are removed. Thirteen targeted tests plus the retained matches tests, contract/lint,
    full backend, documentation, Maaatch comparison, Prettier, and whitespace checks pass. Contracts, committed
    generated artifacts, databases, events, BFF, Expo, scrapers, standalone repositories, production, Maaatch,
    Blockout Orval settings, and Python generator settings are unchanged.
- [x] MRG-339 Migrate `users-service` account and profile generated boundaries and clients, keeping the positive numeric local identity,
      Auth0 resolution, image intent, authentication, and current behavior explicit; then activate matches-service's
      staged generated `UserAccountsClient` and remove its temporary `LegacyCurrentUserAdapter` after provider-first
      parity and rollback proof.
  - Evidence: `USER-01` through `USER-05` now implement generated `UserAccountsApi` through role-owned account/favorite
    views, update command, explicit keep/remove/replace image intent, strict entity/API mappers, progressive Problem
    Details, and payload-free compatibility telemetry. The isolated v1 adapter preserves snake_case, scopes, nulls,
    Auth0 behavior, multipart semantics, full account fields, reduced read favorites, entity-shaped update/ensure
    favorites, and Auth0-first deletion. Database and Java evidence corrected the unimplemented UUID assumption: every
    current local-user wire now uses standard inline positive `integer`/`int64`, with Auth0 subjects kept at identity
    edges and no custom scalar or vendor extension. Six superseded DTO/mapper/image classes and the mixed controller are
    removed. Matches-service now uses only its generated `UserAccountsClient`; its temporary JsonNode v1 adapter is
    deleted with provider-first rollback documented. Twelve users tests, all 38 retained non-context matches tests,
    thirty contract tests, source lint, deterministic bundle/Orval generation, mobile typecheck and Android/iOS exports,
    full backend packaging, documentation, Maaatch comparison, Prettier, and whitespace checks pass. Databases, events,
    BFF runtime, scraper runtime, standalone repositories, production, Maaatch, Blockout Orval settings, and Python
    generator settings are unchanged.
- [x] MRG-363 Migrate `users-service` favorite commands and projections, making favorites the canonical source while
      retaining counter, optimistic UI, and event compatibility.
  - Evidence: `USER-07` through `USER-09` now implement generated `UserFavoritesApi` through favorite-owned command,
    immutable view/page, transactional application service, strict persistence/API mapping, progressive Problem
    Details, and payload-free compatibility telemetry. The isolated v1 adapter preserves its unpaged entity-shaped
    snake_case array, query names, optional filter, repository order, scopes, statuses, errors, and idempotent no-op
    behavior without exposing JPA entities. Users-service uses only generated team/pool follower clients and the dead
    generic HTTP client is removed. Canonical favorite rows remain authoritative while the exact local row, remote
    counter, then legacy event sequence and Expo optimistic contract remain unchanged; outbox and reconciliation are
    explicitly deferred. Twenty-two users tests, generated server/client compilation, contract/lint, full backend,
    documentation, Maaatch comparison, Prettier, and whitespace checks pass. Contracts, generated artifacts,
    databases, event formats/topology, BFF, Expo, scrapers, standalone repositories, production, Maaatch, Blockout
    Orval settings, and Python generator settings are unchanged.
- [x] MRG-364 Migrate `users-service` identity-link, account-deletion, and storage boundaries behind explicit Auth0 and
      S3 adapters without changing current deletion, retention, or authentication behavior.
  - Evidence: `USER-04` through `USER-06` now cross application-owned identity/profile ports, with Auth0 SDK models
    confined to `Auth0IdentityProvider`, S3 requests confined to `S3ProfileImageStorage`, and the generated
    `UserIdentityApi` activated behind a dedicated v2 controller. Same-email linking, field-limited synchronization,
    pseudo generation, Auth0-first deletion, one legacy delete event per favorite, local deletion, profile-image
    delete-before-upload, foreign-URL handling, retained data, scopes, and provider failure windows remain unchanged.
    The isolated v1 internal filter retains exact API-key matching and plain-text errors while v2 uses stable Problem
    Details. The mixed `UserService` and generic S3 client are removed without adding compensation, retry, outbox,
    cleanup, deployment, or production authority. Thirty-nine users tests, thirty contract tests, source confinement,
    generated compilation, full 14-module backend packaging, documentation, Maaatch comparison, Prettier, and
    whitespace checks pass; `docs/migration/mrg-364-users-identity-storage-runtime-migration.md` records the parity,
    rollback, retention, and temporary coexistence-name gates.
- [x] MRG-340 Migrate `reports-service` generated server boundaries and internal generated clients while preserving
      explicit GitHub and Discord vendor adapters.
  - Evidence: `REPORT-01` now implements generated `ReportsApi` through an application-owned command, attachment and
    result, explicit submission/storage/issue/notifier ports, strict MapStruct mapping, progressive Problem Details,
    and payload-free compatibility telemetry. The isolated v1 controller retains its exact multipart string part,
    arbitrary string user identity, provider-shaped snake_case response, status, scope, attachment URLs, and error
    behavior through an adapter-local mapper. S3, GitHub SDK, and Discord webhook models are confined to explicit
    provider adapters; upload, issue creation, image append, and best-effort notification ordering remains unchanged.
    Reports-service has no downstream Blockout REST dependency, so no internal client was invented; the generated BFF
    reports client remains assigned to MRG-343. Seventeen reports tests, thirty contract tests, generated compilation,
    source-confinement checks, full 14-module backend packaging, documentation, Maaatch comparison, Prettier, and
    whitespace checks pass. Contracts, committed generated artifacts, databases, events, BFF, Expo, scrapers,
    standalone repositories, production, Maaatch, Blockout Orval settings, and Python generator settings are
    unchanged.
- [x] MRG-341 Migrate `notification-service` inbox and page read boundaries with generated clients, stable ordering,
      standard target pagination, legacy continuation compatibility, and BFF enrichment parity.
  - Evidence: `NOTIF-01` now implements only the generated `NotificationInboxPagesApi` through an immutable inbox
    snapshot/page, canonical page policy, strict persistence/API mapping, progressive Problem Details, and payload-free
    compatibility telemetry. Canonical pages use bounded `pageSize`, stable `createdAt DESC, id DESC` ordering, and an
    explicit nullable `divisionId` derived from defensively copied metadata for later BFF enrichment. The isolated v1
    adapter retains the entity-shaped fourteen-field snake_case item, `notifications`/`has_next`/`next_page` wrapper,
    unbounded size handling, and historical created-at-only ordering. A generated users-service client immediately
    reduces `/api/v2/users/me` to the local user ID; the generic HTTP client and copied user/page DTOs are removed. The
    global notification Jackson snake-case strategy is removed, while v1 list serialization and the still-deferred
    push-token request use one local compatibility mapper. OpenAPI tags now separate page, mutation, and push-token
    generated interfaces without changing paths, fields, statuses, security, or payloads, preventing MRG-341 from
    activating MRG-365 defaults. Twenty notification tests, thirty contract tests, two deterministic generations,
    source confinement, generated server/client compilation, full 14-module backend packaging, documentation,
    Maaatch comparison, Prettier, and whitespace checks pass. Databases, events, BFF, Expo, scrapers, standalone
    repositories, production, Maaatch, Blockout Orval settings, and Python generator settings are unchanged;
    `docs/migration/mrg-341-notification-inbox-runtime-migration.md` records parity, rollback, deferred mutation
    ownership, and the temporary `Legacy*`/`*V2*` source-name retirement gates.
- [x] MRG-365 Migrate `notification-service` push-token, unread, read, opened, and delete boundaries with current-user
      ownership, validation, device lifecycle, response, and compatibility evidence.
  - Evidence: `NOTIF-02` through `NOTIF-06` now implement the generated mutation and push-token interfaces through
    current-user inbox mutation use cases, an immutable push registration command, strict generated/legacy mapping,
    persistence ports, progressive Problem Details, and the compatibility telemetry introduced by MRG-341. Unread v2
    returns `unreadCount` while v1 retains `unread`; read, opened, and delete preserve ownership-scoped, state-sensitive
    `204`/`404` results and one UTC mutation instant. Canonical push input validates positive identity, token, shared
    platform, and device fields while the isolated v1 adapter retains snake_case and historical permissive failure
    paths. Token reattachment, blank-device preservation, user/device rotation, reactivation, duplicate cleanup, and
    creation order remain unchanged. The caller-selected push `userId` authorization defect is explicitly retained
    because the approved MRG-325/MRG-304 path freezes it; correction requires a separate coordinated contract/security
    task. The old unread and push DTOs and mixed registration method are removed; delivery token resolution and
    provider deactivation remain assigned to MRG-366. Thirty-one notification tests, thirty contract tests, clean
    generated compilation, source confinement, full 14-module backend packaging, documentation, Maaatch comparison,
    Prettier, and whitespace checks pass. Contracts, generated artifacts, databases, events, BFF, Expo, scrapers,
    standalone repositories, production, Maaatch, Orval, and Python generation are unchanged;
    `docs/migration/mrg-365-notification-mutation-token-runtime-migration.md` records parity, rollback, security debt,
    device lifecycle, and temporary coexistence-name retirement gates.
- [ ] MRG-366 Separate and migrate `notification-service` delivery-state inputs from provider ticket/receipt models,
      preserving current send, retry, invalid-token, and incomplete-receipt behavior until separately changed.
- [ ] MRG-342 Migrate `search-service` generated server boundaries and internal generated clients with parity evidence.
- [ ] MRG-343 Migrate remaining `mobile-gateway` configuration, user, report, search, and notification relay workflows
      to generated clients and BFF interfaces with workflow-owned commands, views, mappers, and compatibility.
- [ ] MRG-367 Migrate `mobile-gateway` club, team, and pool workflows to generated clients and BFF interfaces with
      immutable projections, explicit privacy, ordering, cache, fan-out, and missing-data policy.
- [ ] MRG-368 Migrate `mobile-gateway` competition, match, and live workflows to generated clients and BFF interfaces
      with separate list, detail, ranking, history, moderation, signed-link, and partial-result projections.
- [ ] MRG-344 Migrate Expo authentication and remaining configuration modules to generated BFF clients and wire
      schemas, preserving handwritten query/view-model policy; do not opportunistically migrate remaining forms, which
      are owned by MRG-510 and MRG-511.
- [ ] MRG-345 Migrate Expo club, team, and pool modules to generated BFF clients and wire schemas, preserving
      handwritten query/view-model and multipart policy; defer editable forms to MRG-507–509.
- [ ] MRG-346 Migrate Expo competition and match modules to generated BFF clients and wire schemas, preserving
      handwritten pagination, projection, cache, and mutation policy; defer editable live forms to MRG-512–513.
- [ ] MRG-347 Migrate Expo user, search, notification, and report modules to generated BFF clients and wire schemas,
      preserving handwritten query/view-model, optimistic, image, and multipart policy; defer editable profile and
      report forms to MRG-514–515.
- [ ] MRG-378 Replace MRG-330's interim generated `asyncio`/aiohttp clients with OpenAPI Generator's standard
      asynchronous `httpx` library before any scraper call migration. Regenerate all six committed packages; replace
      the generated wheel's aiohttp/aiohttp-retry transport dependencies with the supported httpx dependency; adapt
      both scraper-owned Blockout factories without changing provider aiohttp sessions; and re-prove all 24 operation
      methods, canonical aliases, multipart JSON/files, per-call Auth0 Bearer refresh, `trust_env`, proxy, connection
      limits, operation-family timeouts, cancellation, explicit close, safe errors, zero automatic retry, wheel/image
      builds, generated-file guards, and two-run determinism. Do not write models, endpoints, serialization, auth, or
      transport by hand and do not use custom generator templates.
- [ ] MRG-348 After MRG-378, migrate the `club-scraper`'s six audited Blockout operations to thin adapters over the
      fully generated `httpx` clients, preserving Python snake_case application identifiers, Auth0 refresh,
      `trust_env`, connection limits/timeouts, multipart files, errors, scheduling, and provider aiohttp behavior;
      remove only migrated handwritten wire conversion.
- [ ] MRG-349 After MRG-378, migrate the `competition-scraper`'s eighteen audited Blockout operations to thin adapters
      over the fully generated `httpx` clients, preserving Python snake_case application identifiers, Auth0 refresh,
      `trust_env`, connection limits/timeouts, multipart files, errors, scheduling/concurrency, and provider aiohttp
      behavior; remove only migrated handwritten wire conversion.
- [ ] MRG-350 Pin parser `3.6.0` and Modelina `5.10.1`; create local-reference AsyncAPI `3.0.0` source/bundles, the
      component-only generation catalog, deterministic targets, and `apps/backend/event-contracts`; generate committed
      Java 21 records with `modelType: "record"`, `collectionType: "List"`, and package
      `com.blockout.events.v2.model`; then add audited club/team/pool lifecycle payloads and reconcile all 11 routes/19
      queues, including no EV-TPD/Q-11–Q-13/Q-16–Q-17 v2 activation.
- [ ] MRG-369 Add the audited favorite/follow `EventType` values, AsyncAPI payloads, generated records, publisher and
      consumer adapter mappings, canonical positive numeric user IDs, idempotent/rebuildable projections, compatibility,
      reconciliation, golden JSON, and rollback without changing the MRG-315 envelope/tooling/topology.
- [ ] MRG-370 Add the audited match-finished/live-link `EventType` values, AsyncAPI payloads, generated records,
      publisher and consumer adapter mappings, acknowledgement/order/version parity, notification-owned Q-14/Q-15 v2
      declarations, golden JSON, and rollback without changing the MRG-315 envelope/tooling/topology.
- [ ] MRG-371 Introduce transactional outboxes for clubs, teams, pools, and competition with one event UUID, semantic
      schema version, ordering metadata, idempotent per-v1/v2 publication, shared `x-blockout-event-id`, observation,
      cleanup, and per-service rollback; prohibit direct dual-publish.
- [ ] MRG-372 Introduce transactional outboxes for matches and users plus event-ID deduplication for migrated consumers,
      preserving current queue, acknowledgement, retry, requeue, and DLQ behavior; emit v2 AMQP properties/headers
      without `__TypeId__` and run v1/v2 side-effect consumers only through the MRG-304 paused cutover sequence.
- [ ] MRG-351 Remove global Jackson `SNAKE_CASE` and slice-owned Blockout annotations from config, clubs, teams, and
      pools canonical v2 paths only after every v2 caller uses camelCase; retain the isolated v1 transport adapters
      and their adapter-local snake_case mapper until the MRG-304 production-retirement gate.
- [ ] MRG-373 Remove global Jackson `SNAKE_CASE` and slice-owned Blockout annotations from competition, matches, and
      users canonical v2 paths only after every v2 caller uses camelCase; retain the isolated v1 transport adapters
      required by MRG-304.
- [ ] MRG-374 Remove global Jackson `SNAKE_CASE` and slice-owned Blockout annotations from reports, notifications,
      search-service, and search-worker canonical v2 paths only after every v2 caller uses camelCase; retain isolated
      v1 adapters and vendor-native mappings.
- [ ] MRG-375 Remove global Jackson `SNAKE_CASE` and slice-owned Blockout annotations from `mobile-gateway` only after
      every generated downstream and Expo v2 boundary uses canonical camelCase; keep the BFF v1 adapter available for
      every still-supported mobile version.
- [ ] MRG-352 Remove legacy `@JsonProperty`, `@JsonAlias`, and naming adapters used only for Blockout snake_case;
      retain documented annotations only at genuine vendor boundaries and retain snake_case conversion only inside
      the explicit MRG-304 v1 transport adapters.
- [ ] MRG-353 Remove Expo request/response case transformation, `transformCase`, and obsolete case-conversion packages
      after every generated BFF v2 client is active; legacy mobile releases continue through the server-side v1 BFF
      adapter rather than a converter in the current Expo release. Do not combine this casing cleanup with any form
      migration.
- [ ] MRG-354 Add a repository-wide allowlisted guard proving Blockout-owned REST, event, Expo, and scraper wire keys are
      camelCase while explicitly allowlisting only isolated v1 adapters, database columns, Python identifiers, and
      external vendor payloads.
- [ ] MRG-355 Add complete contract generation, backend generation, committed Orval operation/model/Zod generation,
      scraper generation when selected, event generation, formatting, compilation, two-run deterministic no-diff and
      generated-file-edit guards, plus v1-adapter isolation checks to local verification.
- [ ] MRG-356 Mark each REST and event boundary contract-authoritative only after source, generated artifacts, mappers,
      all canonical consumers, runtime parity, rollback evidence, and canonical-conversion cleanup are complete; the
      separately isolated v1 adapter may remain until the MRG-304 30-day production-retirement gate.

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
      the MRG-267 lineage and migrated canonical consumers prove they are unused; preserve adapter-local v1 transport
      records and mappings until the final MRG-304 retirement gate.
- [ ] MRG-418 Add strict service-local MapStruct configuration where structural mapping benefits from it; keep manual
      mapping only for real aggregation, policy, or non-trivial transformation logic.
- [ ] MRG-419 Align code documentation and existing behavioral mapper/projection tests incrementally in every touched
      service; do not add source-scanning tests or tests that only restate framework wiring.
- [ ] MRG-420 Preserve Flyway and audit each service migration history before moving persistence types or changing any
      schema mapping; package restructuring alone must not alter database structure.
- [ ] MRG-421 Add dedicated test configuration and disposable dependencies, then require reactor `verify`, rebuild all
      backend images, and smoke production-shaped environment contracts.

## Phase MRG-500 — Mobile Architecture

- [ ] MRG-501 Audit the Expo application against Maaatch frontend boundaries adapted for React Native, including an
      editable-form inventory with current defaults, reset, validation, touched/submitted, external-submit, image,
      multipart, selector, color, haptic, server-error, and `canSubmit` behavior.
- [ ] MRG-502 Separate generated API clients, application modules, view models, handwritten form schemas/transforms,
      generated request types, navigation, and infrastructure without performing an intermediate Formik migration or
      using wire DTOs as form state.
- [ ] MRG-503 Keep TanStack and Orval integration mobile-owned while moving only proven framework-neutral React
      primitives to `libs/react`; keep the QueryClient, Axios mutator, generated outputs, React Hook Form/Zod API, and
      mobile form primitives in the sole mobile application.
- [ ] MRG-504 Define the Blockout mobile architecture, design-system, generated-client, and React Native form source
      documents, including controlled-field and bottom-sheet contracts.
- [ ] MRG-507 Migrate `ClubForm` to React Hook Form/Zod, preserving name trimming, logo selection/manipulation, image
      preview, multipart bytes, haptics, create/update defaults, reset, errors, and submission behavior.
- [ ] MRG-508 Migrate `TeamForm` to React Hook Form/Zod, preserving name, short name, logo, preview, multipart,
      create/update defaults, reset, errors, and submission behavior.
- [ ] MRG-509 Migrate `PoolForm` to React Hook Form/Zod, preserving name, short name, trimming, footer state,
      create/update defaults, reset, errors, and submission behavior.
- [ ] MRG-510 Migrate `DivisionForm` to React Hook Form/Zod, preserving create/update semantics, logo, four colors,
      color pickers, preview, `accentColor`, footer state, reset, errors, and submission behavior.
- [ ] MRG-511 Migrate `RawDivisionMappingForm` from manual state to React Hook Form/Zod, preserving nullable values,
      three selectors, division loading, defaults, reset, errors, and current submission behavior.
- [ ] MRG-512 Migrate `MatchLiveLinkForm` to React Hook Form/Zod, preserving URL, time window, create/update mode, copy,
      exact errors, haptics, reset, and submission gating.
- [ ] MRG-513 Migrate `MatchLiveLinkReportForm` to React Hook Form/Zod, preserving reason constraints/messages, touched
      errors, external submission, reset, loading, and disabled behavior. Keep `MatchLiveLinkDeleteForm` as a
      handwritten fieldless confirmation flow.
- [ ] MRG-514 Migrate `ProfileForm` to React Hook Form/Zod, preserving username trimming/constraints, image selection,
      preview, multipart, defaults/reset, and profile conflict `409` placement through `setError`.
- [ ] MRG-515 Migrate `ReportForm` to React Hook Form/Zod, preserving context-derived type, title, description, multiple
      images, multipart, guest/user identity, filter synchronization, defaults/reset, errors, and submission behavior.
- [ ] MRG-516 Remove Formik, Yup, remaining imports and obsolete helpers after all editable forms migrate; add a
      repository guard that rejects their reintroduction without changing product behavior.
- [ ] MRG-505 Re-audit and adapt Maaatch React, effect, Zod, logging, and documentation skills after the generated-client
      and form architecture is active and Formik/Yup are gone; keep Next.js, shadcn, DOM, and web-only guidance
      explicitly non-applicable.
- [ ] MRG-506 Prove final Android and iOS typecheck/exports, online EAS builds, credentials, updates, installed-device
      smoke flows, form parity, and absence of Formik/Yup after MRG-501–504 and MRG-507–516 complete.

## Phase MRG-600 — Scraper Architecture

- [ ] MRG-601 Audit both scrapers after generated-client migration for common adapter reuse, generated-type isolation,
      wheel ownership, configuration, scheduling/concurrency, separate Blockout/provider sessions, proxy/timeouts,
      camelCase wire aliases, Auth0, errors, and all eleven external federation/provider calls.
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

- [ ] MRG-801 Align CI job structure with Maaatch while retaining Expo and scraper-specific jobs; remove the standalone
      `local-compose` job from pull-request and push workflows, keep Compose config validation in the local verifier,
      and retain it in CI only as a step of a general repository/infrastructure job when current evidence justifies it.
- [ ] MRG-802 Enforce the Phase MRG-300 generation and deterministic no-diff matrix in CI for contracts, backend, Expo,
      the six pinned Python async `httpx` clients/common wheel, and AsyncAPI/Modelina event generation; include local
      reference validation, 11-route/19-queue reconciliation, deterministic bundles/Java records, golden event JSON, hermetic
      event-contracts compilation, forbidden annotation/`__TypeId__` guards, Python 3.12 imports/syntax, adapter
      isolation, wheel installation, and both root-context scraper images.
- [ ] MRG-803 Upgrade backend CI from compile-only to verified tests after test infrastructure is reliable.
- [ ] MRG-804 Add actual backend image builds for changed deployables rather than Dockerfile syntax checks only.
- [ ] MRG-805 Remove the `setup-python@v5` deprecation warning.
- [ ] MRG-806 Make the local verification script and CI execute the same authoritative commands.

## Phase MRG-900 — Production Cutover

- [ ] MRG-901 Capture the required read-only deployment and RabbitMQ snapshot from MRG-304, then create a protected
      GitHub Environment or distinct secret namespace for each deployable only after its activation unknowns close.
- [ ] MRG-902 Add one manual, path-scoped shadow publication workflow for a low-risk service.
- [ ] MRG-903 Publish an immutable `monorepo-<sha>` candidate without replacing `latest` or calling Dokploy.
- [ ] MRG-904 Smoke the candidate on a non-routing target and prove rollback.
- [ ] MRG-905 Cut over one deployable at a time, preserving its historical image name and webhook isolation.
- [ ] MRG-906 Repeat source freeze, candidate, smoke, cutover, observation, and rollback proof for all fourteen images.
- [ ] MRG-907 Complete the separate EAS/mobile release cutover.
- [ ] MRG-908 Disable standalone workflows only after their monorepo replacements are observed successfully.
- [ ] MRG-909 Retire REST v1 adapters and event v1 routes only after MRG-905 through MRG-908, every production caller
      migration, mobile-store minimum-version gate, empty and unacknowledged-free legacy queues, and 30 consecutive
      days of zero v1 REST and event use; require explicit production authorization.

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
