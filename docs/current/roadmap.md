# Blockout Roadmap

- [x] **BOOT-001 — Import standalone Blockout applications into a functional Nx monorepo**
- [x] **BASE-001 — Add safe application-local environment examples**

## Current refactor

- [x] **REF-001 — Define the refactor direction and inventory JSON boundaries**
  - Record Maaatch as the read-only reference for structure and naming.
  - Classify application-owned REST, internal, message, scraper, and mobile JSON boundaries.
  - Exclude database, configuration, protocol, and provider-owned names.

- [x] **REF-002 — Characterize the JSON flows before changing them**
  - Add focused serialization and client-boundary tests for representative backend, gateway, worker, scraper, and mobile
    flows.
  - Cover the scraper status check and one write payload for each scraper without calling production systems.
  - Preserve current behavior so the camelCase migration has an executable baseline.

- [x] **REF-003 — Migrate Blockout-owned JSON fields to camelCase**
  - Change all in-repository producers and consumers together: Java services, gateway, worker, Python scrapers, and Expo
    mobile.
  - Keep the existing V1 routes and controllers; do not create V2 endpoints, aliases, contract sources, or generated
    code.
  - Leave external provider payloads and non-JSON infrastructure names unchanged.
  - Remove the global snake_case serialization settings and explicit application-owned snake_case mappings once no
    longer needed.

- [x] **REF-004 — Validate both scrapers against the local application stack**
  - Start the required infrastructure and APIs with local configuration.
  - Exercise each scraper through status retrieval, representative parsing, and application API writes using controlled
    non-production inputs.
  - Verify persisted results, service health, logs, metrics, and the absence of unintended external writes.
  - Record missing credentials or unavailable external fixtures honestly; do not weaken the functional gate.

- [x] **REF-005 — Make the Blockout HTTP contract natively camelCase**
  - Use camelCase directly in Java, Python, and TypeScript transport models and query parameters.
  - Remove generic case-conversion utilities and retain only type serialization required for values such as dates and
    enums.
  - Preserve provider-owned payloads and non-HTTP infrastructure names.

- [x] **REF-006 — Establish a green local verification baseline**
  - Fix the imported mobile type errors without changing application behavior.
  - Keep the search worker context test isolated from startup jobs and external systems.
  - Validate the complete Maven reactor, mobile typecheck, and a gateway-to-service local smoke.

- [x] **REF-007 — Refactor clubs-service and establish authoritative Club ownership**
  - Separate handwritten Club HTTP models, API mapping, application commands and views, persistence, messaging, storage,
    and geocoding using the Maaatch naming approach.
  - Make `clubs-service` the owner of the complete Club representation and align its complete mirrors in the gateway,
    search worker, club scraper, and mobile application.
  - Keep lifecycle events and search documents as explicit purpose-specific projections rather than expanding them into
    duplicate Club resources.
  - Protect create, update, image, deactivation, camelCase, consumer deserialization, and scraper write behavior with
    focused tests and a local authenticated smoke.

- [x] **REF-008 — Establish Blockout repository agent skills**
  - Add the repository-local agent entrypoints and applicable Maaatch-derived engineering policies for the current Nx,
    Java, Python, Expo, persistence, REST, logging, testing, documentation, and local-runtime stack.
  - Keep the guidance concise and routed by task signal instead of loading every policy for every change.
  - Explicitly defer contract-first/code generation and GitFlow/GitHub Project governance to later authorized tasks.

- [x] **REF-009 — Apply Blockout best practices to the Club slice**
  - Reload the new `blockout-best-practices` skill and audit only the files introduced or changed by REF-007.
  - Correct concrete architecture, naming, documentation, REST-error, and test-policy gaps without changing the Club
    resource fields, V1 routes, or another service.
  - Re-run the Club and affected-consumer verification baseline, then leave subsequent roadmap tasks to use the new
    repository knowledge.

- [x] **REF-010 — Refactor config-service and establish authoritative configuration ownership**
  - Separate handwritten configuration HTTP models, API mapping, application commands and views, persistence, and
    division image storage using the Maaatch naming approach.
  - Make `config-service` authoritative for app status, divisions, legal documents, raw division mappings, and scraper
    statuses, and align only their complete gateway, mobile, and scraper mirrors.
  - Preserve the V1 routes, native camelCase transport, multipart behavior, database schema, scraper behavior, and
    production behavior with focused service and consumer tests.

- [x] **REF-011 — Refactor teams-service and establish authoritative Team ownership**
  - Separate handwritten Team transport, application, persistence, messaging, and image-storage boundaries.
  - Align complete Team mirrors while preserving V1 routes, schema, events, scraper writes, and runtime behavior.

- [x] **REF-012 — Refactor pools-service and establish authoritative Pool ownership**
  - Separate handwritten Pool transport, application, persistence, and messaging boundaries.
  - Align complete Pool mirrors while preserving V1 routes, schema, events, scraper writes, and runtime behavior.

- [x] **REF-013 — Refactor competition-service and establish authoritative Competition ownership**
  - Separate Competition transport, application, persistence, cascade, and messaging boundaries.
  - Align complete Competition mirrors while preserving V1 routes, schema, events, scraper writes, and runtime behavior.

- [x] **REF-014 — Refactor users-service and establish authoritative User ownership**
  - Separate user, follow, provider, persistence, and messaging responsibilities behind explicit boundaries.
  - Align complete user mirrors while preserving V1 routes, schema, Auth0 behavior, events, and runtime behavior.

- [x] **REF-015 — Refactor matches-service and establish authoritative Match ownership**
  - Separate Match transport, application, persistence, moderation, provider, and messaging boundaries.
  - Align complete Match mirrors while preserving V1 routes, schema, events, scraper writes, and runtime behavior.

- [x] **REF-016 — Refactor notification-service and establish authoritative Notification ownership**
  - Separate notification transport, application, persistence, event-consumer, Auth0, and Expo boundaries.
  - Align complete notification mirrors while preserving V1 routes, schema, queues, provider behavior, and runtime
    behavior.

- [x] **REF-017 — Refactor reports-service and isolate report providers**
  - Separate report transport, application assembly, GitHub, and Discord boundaries.
  - Preserve V1 routes, provider payloads, PDF behavior, and runtime behavior with focused tests.

- [x] **REF-018 — Refactor search-service and establish authoritative search API ownership**
  - Separate search transport, application queries, and Elasticsearch read boundaries.
  - Preserve V1 routes, index/query semantics, result shapes, and runtime behavior with focused tests.

- [x] **REF-019 — Refactor search-worker and isolate indexing boundaries**
  - Separate event consumers, application projections, service clients, caches, jobs, and Elasticsearch writes.
  - Preserve queues, document/index semantics, startup behavior, and runtime behavior with focused tests.

- [x] **REF-020 — Refactor mobile-gateway as the final handwritten BFF boundary**
  - Separate mobile-facing APIs, orchestration, internal clients, provider adapters, security, and transport mirrors.
  - Align every complete owner mirror while preserving V1 mobile routes, caching, provider behavior, and runtime
    behavior.

- [x] **REF-021 — Establish Python scraper architecture and testing policies**
  - Define a simple typed application/domain/infrastructure structure, async ownership, error discipline, provider
    isolation, concise Python documentation, and exact internal model ownership.
  - Require offline characterization, differential parity, internal contract tests, and controlled local smokes before
    replacing any scraper behavior.

- [x] **REF-022 — Characterize the complete club scraper**
  - Protect provider parsing, normalization, retries, authentication, status gating, concurrency, scheduling, metrics,
    internal requests, idempotent writes, and supported failure outcomes without changing production code.

- [x] **REF-023 — Refactor the club scraper with differential parity**
  - Replace characterized seams one at a time with a typed Python package and explicit application, domain, Blockout,
    FFVB, scheduling, configuration, and observability boundaries.
  - Preserve every characterized runtime behavior and exact Java-owner internal transport mirror; remove legacy paths
    only after offline parity and a controlled local smoke.

- [x] **REF-024 — Characterize the complete competition scraper**
  - Protect departmental, regional, national, and professional provider flows; HTML, XML, and CSV parsing; aliases,
    source priority, statistics, retries, concurrency, scheduling, authentication, internal writes, and failure
    isolation.
  - Do not restructure production code or activate contract generation in this task.

- [x] **REF-025 — Refactor the competition scraper with differential parity**
  - Replace the characterized legacy path one seam at a time with a single application-local `scraper` package and
    explicit application, provider, Blockout, configuration, scheduling, and observability boundaries.
  - Preserve REF-024 behavior and exact handwritten Java-owner internal mirrors; use only authentic source-derived
    provider fixtures and remove the legacy path only after complete offline parity and controlled startup evidence.
  - Evidence: all 55 offline characterization and contract tests pass; Ruff, compileall, Nx targets, the production
    image
    build, runtime imports, and an isolated no-network startup smoke pass. The legacy paths and unused local contract
    enum
    copies are removed, and the authentic fixture provenance is recorded beside the test corpus.

- [x] **REF-026 — Harden competition provider parsing and ingestion**
  - Replace ASP.NET index traversal with one-pass typed LNV parsing and pool-local owner indexes, while preserving
    source
    priority and write semantics.
  - Introduce typed FFVB discovery, calendar, and ranking records; share league ingestion without hiding
    provider-specific
    discovery rules.
  - Honor provider encodings and HTTPS, distinguish complete snapshots from unavailable or invalid responses, and allow
    destructive cleanup only after a complete source observation.
  - Prove parity against authentic FFVB/LNV fixtures and the current public page structures without writing to external
    systems. Keep the temporarily unavailable LNV XML path unchanged.
  - Evidence: 69 offline tests pass over five departmental, five regional, five national, and three professional real
    source-derived cases. Current read-only provider smoke returns 13/67/29 FFVB discoveries, 132 complete 3MA rows, and
    4/4/165 LNV HTML matches. Nx, Ruff, compileall, image build, imports, and no-network image smoke pass. Local owner
    API
    reads pass, including the authenticated `SCRAPER` status request used by the competition scraper.

- [x] **REF-027 — Certify competition scraper persistence end to end**
  - Exercise one authentic departmental, regional, and national FFVB source plus the three professional LNV HTML pages
    against the local owner APIs and disposable local records.
  - Verify persisted pools, teams, associations, and matches, then repeat identical input to prove idempotence and use
    an
    incomplete observation to prove destructive reconciliation remains disabled.
  - Keep the unavailable LNV XML path unchanged and uncalled, restore the local scraper status, and remove only the
    records created by this validation.
  - Evidence: six real-source flows persisted 6 pools, 63 teams and associations, and 477 matches through the local
    APIs.
    The three Data Project pages added 4/165/4 live codes; repeated input produced an identical state; the incomplete
    EFA
    export preserved disposable sentinels. Two discovered defects are covered by authentic regression tests: nested
    FFVB calendar rows cannot become rankings, and absent rankings cannot overwrite association statistics. All 71
    scraper tests, Ruff, compileall, Nx targets, image build/import, cleanup, and status-preservation checks pass.

- [x] **REF-028 — Characterize the mobile application across web and native**
  - Inventory the current Expo Router flows, gateway contracts, local stores, authentication, notifications, purchases,
    advertising, maps, media, and other native-only boundaries without changing product behavior.
  - Use React Native Web as a local characterization surface for render, navigation, and HTTP flows; it is not a new
    supported product platform and no web deployment is introduced.
  - Add focused Jest/React Native Testing Library coverage for stable behavior, then verify the available iOS simulator
    and Android emulator surfaces. Record unavailable native infrastructure honestly instead of weakening the gate.
  - Preserve the current routes, UI, APIs, native behavior, and handwritten models. Keep contract-first, code
    generation,
    GitFlow, CI, deployment, and production changes deferred.
  - Evidence: clean npm installation and a deduplicated native dependency tree pass; Nx typecheck, 10 focused Jest
    tests,
    and the Expo Web export pass. Chrome renders and navigates the guest/search/profile flow at 390 x 844. Fresh iOS
    and Android debug builds install and launch on their simulators, with Android remaining alive after startup. Native
    boundaries, browser CORS, provider credentials, physical-device gaps, and the inherited audit findings are recorded
    in the mobile characterization document.

The Java and Python scraper refactors and their local persistence certification are complete.
Contract-first adoption, code generation, Python packaging/toolchain migration, GitFlow, CI, deployment, and production
changes remain deferred.
