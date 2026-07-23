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

- [x] **REF-029 — Establish the clean mobile architecture foundation**
  - Keep Expo Router files limited to route registration, navigation, layouts, and top-level screen composition.
  - Place route-owned screens under `modules/<feature>/ui` and place only proven cross-feature infrastructure under
    `shared`.
  - Isolate HTTP mechanics, configuration, providers, theme, reusable UI primitives, and cross-feature hooks without
    changing feature behavior or transport models.
  - Preserve every route, screen, API call, native adapter, local store, platform-specific implementation, and visible
    behavior characterized by REF-028.
  - Keep Android and iOS as the supported product surfaces and use Web only as a phone-sized local verification
    surface. Do not introduce contract generation, new product behavior, GitFlow, CI, deployment, or production
    changes.
  - Evidence: all 14 product route files now delegate to feature-owned screens, while shared HTTP mechanics,
    configuration, providers, theme, hooks, navigation, and UI primitives have explicit ownership. Nx typecheck, all 10
    Jest characterization tests, and the Web, iOS, and Android Expo exports pass. Chrome at 390 x 844 preserves the
    sign-in, guest onboarding, and search flow, including the already documented browser-only CORS failure.

- [x] **REF-030 — Enable secure authenticated local mobile testing**
  - Create a dedicated same-tenant Auth0 SPA for the local React Native Web verification surface while preserving the
    existing native client and supported Android/iOS behavior.
  - Use the official Auth0 SPA SDK with Authorization Code and PKCE, a configurable shared API audience, in-memory token
    storage, exact localhost callback/origin allowlists, and no authentication bypass.
  - Validate issuer and audience at the mobile gateway, expose CORS only to explicitly configured local origins, and
    remove request or authentication logs that could disclose tokens, headers, payloads, or identity details.
  - Keep all secrets and test-user credentials outside Git, document the same-tenant risk and public-repository rules,
    and verify local credential clearing through a focused adapter test, plus sign-in, an authenticated gateway flow,
    and SSO logout in a phone-sized browser session.
  - Evidence (2026-07-21): reproducible npm installation, 14 mobile tests, mobile typecheck, Web export, and all 27 mobile
    gateway tests pass. Chrome at 390 x 844 completes Universal Login, one authenticated current-user request, profile
    loading, and SSO logout. Runtime checks return `401` without a token, allow only the configured localhost CORS
    origin, and reject an unrelated origin. The production dependency audit retains four pre-existing high-severity
    findings outside the added Auth0 client path; no credential, token, ignored environment file, or test database is
    retained.

- [x] **REF-031 — Audit the Expo application against current mobile best practices**
  - Audit the live application with the Blockout mobile policy, Expo guidance, Vercel React Native best practices, and
    Vercel composition patterns without performing a broad refactor.
  - Record the strengths, concrete correctness and dependency risks, and a short ordered remediation roadmap.
  - Install only the two relevant Vercel companion skills in the repository and route future mobile work to them.
  - Evidence: mobile typecheck, all 14 Jest tests, and Web export pass. Expo Doctor passes 15 of 18 checks and identifies
    Metro/native dependency duplication and compatible-package drift. The non-operational lint gate, one Rules of Hooks
    violation, session/network ownership issues, and remaining feature-ownership work are documented without changing
    runtime code.

- [x] **REF-032 — Restore mobile correctness and static quality gates**
  - Add the standard Expo ESLint configuration and an Nx lint target.
  - Fix only proven Hooks, leaked-render, and directly related correctness violations, with focused regression tests.
  - Evidence: the Expo flat configuration and explicit Nx target pass with zero errors and a capped baseline of 63
    inherited warnings. All unsafe JSX falsy conditions are explicitly boolean, onboarding indicators keep stable Hook
    ownership when the step count changes, and push registration no longer calls a provider Hook from a utility.
    Mobile typecheck, all 15 Jest tests, and the 3,335-module Web export pass.

- [x] **REF-033 — Reconcile Expo and native dependencies**
  - Align the compatible Expo 54 patch set, Metro resolution, and direct dependency ownership.
  - Remove only proven unused dependencies, resolve actionable production audit paths, and certify Android/iOS builds.
  - Evidence: Expo owns Metro resolution through its SDK 54 default configuration and experimental autolinking module
    resolution, while Nx continues to own project orchestration. A clean install, Expo dependency check, and all 18 Expo
    Doctor checks pass with one native dependency tree. Mobile lint, typecheck, all 15 Jest tests, Web export, Android
    debug assembly, and an unsigned iOS Simulator build pass. The production audit has no high or critical finding;
    only proven-unused native packages were removed.

- [x] **REF-034 — Upgrade the mobile application to Expo SDK 55**
  - Upgrade Expo through an Nx `install` target that delegates directly to the Expo CLI from the application root,
    keeping Nx as the thin project and task orchestrator while Expo remains authoritative for SDK-compatible React,
    React Native, Metro, autolinking, and native packages.
  - Adopt the stable Expo 55 dependency set and React Native 0.83 without changing application behavior, opting into
    Hermes v1, or performing unrelated mobile cleanup. Keep every directly used native dependency owned by the mobile
    application and prove that each provider library supports the New Architecture required by SDK 55.
  - Keep Metro on Expo's default monorepo-aware configuration and do not restore `withNxMetro`. Remove the SDK 54-only
    explicit autolinking experiment. Retain the minimal default Metro file because Nx 23.1 uses its presence to
    discover the Expo project even though Expo 55 no longer needs custom monorepo resolution.
  - Preserve the Nx Expo plugin and its inferred start, export, and native run targets. Override only `install` and
    `prebuild` with thin `nx:run-commands` targets because the Nx 23.1 executors behind those inferred targets are
    deprecated and the install executor targets the workspace root instead of the application package.
  - Require a clean install, Expo dependency check, all Expo Doctor checks, one native dependency tree, lint,
    typecheck, all mobile tests, Web export, a clean prebuild, Android and iOS builds, and simulator startup evidence.
    Leave REF-034 unchecked if any Auth0, notifications, maps, ads, purchases, updates, or navigation boundary cannot be
    certified without a behavior workaround.
  - Evidence (2026-07-21): Expo 55.0.28, React 19.2.0, and React Native 0.83.6 resolve from one native tree after a clean
    lockfile regeneration and `npm ci`. The Expo online dependency check and all 19 Expo Doctor checks pass; forcing the
    0.83.10 value advertised only by the package-local prebuild table instead created a duplicate and failed Doctor, so
    the online certified 0.83.6 matrix remains authoritative. Production audit reports 19 moderate, 0 high, and 0
    critical findings. Nx project discovery, lint with 0 errors and the capped 63-warning baseline, typecheck, all 15
    Jest tests, the 3,148-module Web export, and a clean Expo prebuild pass. Android debug assembly completes 1,019
    tasks, the unsigned iOS Simulator build succeeds with 144 installed pods, and the generated development client is
    installed and launched on an iPhone 17 Pro simulator. Generated Android and iOS projects remain ignored.

- [x] **REF-035 — Stabilize mobile session and network state**
  - Separate stable session actions from changing state, establish React Query mobile lifecycle defaults, and remove
    duplicate local ownership of server facts.
  - Validate required configuration at startup while preserving Auth0, guest, maintenance, and update behavior.
  - Evidence (2026-07-21): session actions and state now use separate contexts, shared Query defaults follow native
    focus and Expo network changes, and pool/team follow state is owned by the Query cache with optimistic rollback.
    Required common and platform-specific public configuration fails fast at startup. Nx lint completes with 0 errors
    and 56 inherited warnings, typecheck passes, and all 24 Jest tests pass across 8 suites. Expo dependency validation
    and all 19 Expo Doctor checks pass; the 3,154-module Web export, clean prebuild, 1,019-task Android debug build,
    CocoaPods resolution with 145 pods, and unsigned iOS Simulator build pass. The iOS development client installs and
    launches on an iPhone 17 Pro simulator. Production audit remains at 19 moderate, 0 high, and 0 critical findings;
    its available fixes require incompatible dependency downgrades or forced upgrades. Generated native projects
    remain ignored and untracked.

- [x] **REF-036 — Complete feature-owned mobile slices**
  - Move one coherent feature at a time from legacy root folders into its module and shared boundaries.
  - Unify theme ownership and improve measured list, image, accessibility, naming, and component-composition issues
    without a mass rewrite or premature native-control replacement.
  - Consolidate repeated forms, feedback, sheets, actions, entity presentation, search, and list patterns only when
    their semantics and behavior are equivalent. Normalize insignificant visual drift to shared semantic tokens, but
    preserve meaningful product differences as explicit variants or feature-owned composition.
  - Keep shared APIs concrete and simple: do not introduce speculative helpers, complex generic typing, configuration
    frameworks, or wrapper layers whose cognitive cost exceeds the duplication they remove.
  - Apply the mobile testing policy in every slice: protect observable behavior with co-located Jest/RNTL tests, add
    stable feature-owned `testID` values only at useful structural boundaries, and keep roles and accessible names as
    the preferred selectors.
  - Execute and publish the following behavior-preserving slices in order:
    - [x] establish the single theme owner, provisional semantic tokens, and the consolidation register;
    - [x] move notifications into a complete feature boundary and apply proven list, image, and accessibility fixes;
    - [x] move reporting and establish shared form and bottom-sheet foundations from existing consumers;
    - [x] move teams and pools together, sharing their equivalent entity presentation while keeping feature behavior
          explicit;
    - [x] move clubs, search, followed entities, and team lists into coherent discovery boundaries;
    - [x] move matches, rankings, and the feed, optimizing lists only where measurements or stable semantics justify it;
    - [x] move user, session, onboarding, application status, configuration, and internal administration flows;
    - [x] remove empty legacy roots, correct naming and remaining unsafe types, complete accessibility checks, and
          publish the final consolidation register.
  - Evidence (2026-07-21): active routes now compose feature-owned modules while the mobile gateway, common storage,
    concrete cross-feature types, and proven UI foundations live under `shared`. Advertising, subscription, PDF, and
    application-version behavior have explicit module owners; the unused confirmation helper and all active legacy-root
    imports are gone. The final unsafe-type scan is empty, API error payloads require feature-level narrowing, and the
    mobile lint target accepts zero warnings. Accessible roles and names remain the primary test surface, with literal
    IDs only on useful feature/domain boundaries. Typecheck and lint pass, and all 52 Jest/RNTL tests pass across 26
    suites without snapshots or test-only production paths. The final Web export and repository integrity checks pass;
    the Maaatch comparison confirms the same simple route/module/shared ownership without copying its Web code.

- [x] **REF-037 — Certify the cleaned mobile application**
  - Run the complete static, test, Web phone-size, simulator, and available physical-device/provider verification matrix.
  - Record external evidence gaps explicitly; never add an authentication or provider bypass to close them.
  - Evidence: clean npm installation, Expo dependency validation, Expo Doctor 19/19, Nx typecheck, zero-warning lint,
    all 52 tests across 26 suites, and the 3,149-module Web export pass. Chrome proves the landing, guest, onboarding,
    and guest search paths at 390 by 844; the Expo-documented import-meta transform fixes the Zustand development-bundle
    failure without a Metro alias or dependency patch. Clean prebuild, CocoaPods resolution, the 733-task Android debug
    build, and the targeted unsigned iOS Simulator build pass. The iOS development client installs, stays live, loads
    Metro, and reaches the real Google Mobile Ads consent and RevenueCat provider paths. No Android device was connected,
    the physical iPhone was offline, the local APIs were stopped, and signed-device Auth0, push, ATT, SecureStore,
    purchase, map, and media evidence remains explicitly outstanding without any bypass. Generated native projects
    remain ignored and untracked; the production audit remains at 19 moderate, 0 high, and 0 critical findings.

## Contract-first adoption

Contract-first generation will replace the handwritten transport boundaries of the existing V1 API in place. It must
not introduce V2 routes, controllers, DTO names, aliases, or a parallel API path.

Before a boundary is generated, every active handwritten DTO in that vertical must already match the owning service's
recommended role name, shape, field semantics, nullability, and nesting. Characterization and parity checks must prove
that no legacy duplicate or migration-only DTO remains. Generation then changes imports and removes the superseded
handwritten types; it must not hide a simultaneous transport or business refactor.

- [x] **REF-038 — Establish the Nx and uv Python workspace**
  - Replace the two isolated scraper environments with one Python 3.12 uv workspace containing `club-scraper`,
    `competition-scraper`, and the tracked shared contract-client package scaffold.
  - Pin uv and `@nxlv/python` 22.2.2 after proving local compatibility with the current Nx graph. Keep the plugin limited
    to environment activation, project targets, packaging, and dependency edges; do not enable experimental dependency
    inference or source-rewriting sync generators.
  - Commit one root `uv.lock`, ignore the single root `.venv`, and remove each `requirements.txt` only after dependency,
    test, scraper, and container parity passes.
  - Evidence: npm installs cleanly; the pinned plugin adds one moderate transitive audit finding but no high or critical
    vulnerability. uv resolves and synchronizes all three members from one lockfile, Nx exposes both scraper-to-client
    edges, and the private wheel builds. Both simple multi-stage images preserve Python 3.12, `/app`, `TZ=UTC`, and the
    existing command; runtime imports and no-network starts pass without uv or test tools in either final image.

- [x] **REF-039 — Migrate the club scraper's external transport to HTTPX**
  - Replace only handwritten FFVB network access with one correctly scoped `httpx.AsyncClient` per scraper run.
  - Preserve URLs, query parameters, headers, redirects, timeout intent, error semantics, parsing, and scheduling. Do not
    rewrite Blockout API calls that will be replaced by generated clients.
  - Prove behavior with the captured real FFVB pages, focused transport tests, the complete club scraper suite, and an
    available read-only provider smoke.
  - Evidence: one run-scoped HTTPX client now owns FFVB access while the temporary internal Blockout adapter remains on
    aiohttp. HTTPX MockTransport covers form encoding, Windows-1252 decoding, timeout, and retries; all 40 tests pass,
    and a live read-only FFVB address-book request parses club `0015372` successfully.

- [x] **REF-040 — Migrate the competition scraper's external transport to HTTPX**
  - Move FFVB and LNV CSV, XML, and HTML retrieval to a correctly scoped `httpx.AsyncClient` without changing provider
    parsing, competition selection, persistence order, or the existing XML outage tolerance.
  - Preserve the current retry and failure behavior rather than adding a generic transport framework. Share code with
    the club scraper only where the two proven policies are genuinely identical.
  - Validate against the real departmental, regional, national, and professional fixtures, both scraper suites, and
    available read-only provider smokes before removing superseded HTTP dependencies.
  - Evidence: one run-scoped HTTPX client now retrieves FFVB and LNV GET documents and FFVB form exports without
    changing parsers or owner-write ordering. MockTransport protects retry, encoding, timeout, and form behavior; all
    71 competition tests pass. Live read-only smokes pass for the national FFVB index, a real FFVB CSV export, and the
    LNV DataProject page. The known unavailable LNV XML endpoints were not changed or used as an adoption gate.

- [x] **REF-041 — Establish deterministic OpenAPI code generation**
  - Mirror Maaatch's ownership model: keep authoritative fragments in `libs/shared/contracts/specs/source/**` and write
    ignored bundled specifications to `libs/shared/contracts/generated/specs/**`.
  - Generate the Python models and asynchronous clients with OpenAPI Generator CLI 7.22.0, using the stable Python
    generator's `httpx` library inside the private `libs/shared/python-contract-clients` wheel. Track only handwritten
    packaging and generation configuration; ignore its generated package sources.
  - Use the same pinned OpenAPI Generator version through Maven for Java. Keep the model-only shared artifact at
    `apps/backend/shared-models`, generate its sources under `target/generated-sources/openapi/**`, and generate every
    server interface or service-to-service client under the owning consumer Maven module's `target/**`.
  - Reserve Orval for the TypeScript mobile client, generated under
    `apps/frontend/mobile/src/shared/generated/**` from the mobile-gateway contract. TypeScript never consumes an
    internal service contract directly, and no generated Java or TypeScript source is stored in `libs/shared`.
  - Generate contract enums from OpenAPI and keep application-only enums in their owning application. Use semantic
    names such as `ClubInternalRequest` and `ClubInternalResponse`; do not encode migration versions in class names.
  - Add a readiness inventory that rejects a vertical whose handwritten DTOs still diverge from the recommended role
    names or the owner model. Generated adoption is limited to import replacement and deletion of those proven mirrors.
  - Keep Maaatch's Nx contract target names: `test`, `generate-openapi-bundles`,
    `sync-backend-schema-mappings`, and `generate-contracts`. Generation, test, and build targets for an output remain
    on the project that owns that generated output, and cleanup uses each official generator's native mechanism.
  - Require two clean identical generations, build/import tests from a clean checkout, and a guard rejecting any
    tracked generated artifact.
  - Use default generator templates initially. Do not add custom templates, wrapper frameworks, or handwritten patches
    to generated code.
  - Evidence: the contract project has the same four Nx target names and the same three contract scripts as Maaatch.
    OpenAPI Generator 7.22.0 produces identical ignored bundles, Java enums, Python enums, and asynchronous HTTPX code
    over two clean runs; the Java artifact builds, and the Python wheel installs and imports from an isolated Python
    3.12 environment. `npm ci`, uv lock/sync, the Nx scraper-to-client edges, contract guards, both scraper suites,
    mobile lint/typecheck and all 52 mobile tests pass. The Java 21 reactor compiles every service and passes all
    non-context tests; the inherited local databases still prevent context smokes because their applied Flyway
    checksums predate the imported migration files. npm reports no high or critical vulnerability, and Git tracks no
    generated output.

- [x] **REF-042 — Simplify the contract generation foundation**
  - Audit every configuration introduced by REF-041 against Maaatch and the official Nx, Maven, OpenAPI Generator, uv,
    and Orval documentation.
  - Remove the npm OpenAPI Generator wrapper, its security-only overrides, the speculative readiness inventory, and
    redundant validation or generator options. Keep the official Python CLI in the Python package that owns it.
  - Keep Nx as a thin orchestrator and retain only the source layout, model/client generation, native generator cleanup,
    deterministic outputs, and zero-tracked-generation guard required by the planned vertical migrations.
  - Evidence: the npm OpenAPI wrapper, root wrapper configuration, wrapper-only override, speculative readiness file,
    redundant CLI validation, and unused Python client dependencies are removed. The official PyPI CLI is pinned in the
    existing uv development group, and the shared Python generation now emits only the two enum models and their model
    package initializer while retaining the generator's native cleanup manifest.
  - `npm ci`, the high-severity audit gate, uv lock/sync checks, two identical clean generations, the Java shared-model
    build, the minimal Python wheel build and isolated import, all 111 scraper tests, mobile lint/typecheck, and all 52
    mobile tests pass. The Nx contract target names remain aligned with Maaatch and Git tracks no generated artifact.
  - Follow-up evidence: the Blockout router now uses Maaatch's `references/contract-first.md` structure and its complete
    boundary rules, adapted only for Blockout's mobile, Python, Java 21, V1 camelCase, and local-enum ownership. The
    obsolete router `agents` metadata and Ruff's redundant `.venv` exclusion are removed. A post-adoption comparison
    confirms that the contract targets, native Maven generation, declarative Python generation, ignored outputs, and
    future Orval boundary already conform, so no additional codegen abstraction or script is introduced.

- [x] **REF-043 — Migrate the Club contract as the first generated vertical**
  - Define the single authoritative Club schemas and internal operations from the behavior already established by the
    club refactor, resolving every active handwritten copy against the owner model.
  - Make `clubs-service` implement generated Java interfaces and models, and replace the club scraper's handwritten
    Blockout transport with the generated asynchronous Python client behind one thin configuration/error adapter.
  - Migrate active Java internal consumers in the same vertical so they derive from the same schema source. Preserve
    routes, camelCase JSON, persistence, error behavior, and scraper results; the mobile keeps consuming only its
    gateway boundary until REF-053/054.
  - Evidence: one Club OpenAPI source now generates the `clubs-service` server interface and models, adapter-local
    models for `mobile-gateway` and `search-worker`, and the private wheel's asynchronous HTTPX client. Handwritten
    Club transport mirrors are removed; the scraper maps generated transport models immediately to its idiomatic
    application model, while the gateway retains its separate public response until REF-053.
  - Two clean generations have identical hashes, the generated wheel builds and installs in an isolated Python 3.12
    environment, uv lock/sync passes, all 38 club-scraper tests pass, and all 52 impacted Java non-context tests pass on
    Java 21. The Club context smoke remains blocked only by the pre-existing local Flyway V1-V3 checksum mismatch
    already recorded by REF-041/042; no database repair or migration change is part of this task. Git tracks no
    generated output.

- [x] **REF-044 — Migrate the Config and Division contracts**
  - Generate the configuration and Division internal boundaries owned by `config-service`, including the Python clients
    needed by both scrapers.
  - Replace handwritten transport DTOs and calls only after characterization proves identical scheduling, season,
    division, format, gender, and scraper-name behavior.
  - Evidence: one Config OpenAPI source now owns the existing app-status, Division, legal-document,
    raw-division-mapping, and scraper-status V1 routes. `config-service` implements its generated server interfaces,
    `mobile-gateway` and `search-worker` consume generated adapter-local models, and both scrapers use the generated
    asynchronous HTTPX clients. The former handwritten Config transport DTOs and scraper transport mirrors are
    removed, while gateway public DTOs remain intentionally separate until the public-boundary migration.
  - The shared contract now owns `ScraperNameEnum`; format and gender keep their existing shared ownership. Scheduling,
    season classification, multipart Division requests, `Instant` app-status values, routes, camelCase JSON, and public
    gateway behavior remain unchanged. Two clean generations have the same hash; the contract guards, uv lock check,
    39 club-scraper tests, 70 competition-scraper tests, Ruff checks, and the targeted Java 21 reactor pass. Git tracks
    no generated source.

- [x] **REF-045 — Migrate the Team contract**
  - Establish Team schemas from the authoritative `teams-service` model and shared Club and Division references.
  - Adopt generated Java models/interfaces and the competition scraper's generated asynchronous client while preserving
    create, update, deactivate, follow, lookup, and ingestion behavior.
  - Evidence: one Team OpenAPI source now owns the existing V1 routes and camelCase create, update, and response models.
    `teams-service` implements the generated server interface, `mobile-gateway` and `search-worker` consume generated
    adapter-local models, and the competition scraper uses the generated asynchronous HTTPX client while keeping its
    idiomatic application model separate. Handwritten Team transport mirrors were removed; shared format and gender
    enums remain generated from their existing shared schemas.
  - Team creation, multipart update, lookup, deactivation, follower operations, ingestion, and gateway/search mappings
    retain their existing behavior. Two clean generations have identical hashes; uv lock, Ruff, the contract guards,
    70 competition-scraper tests, 5 generated-client tests, and the targeted clean Java 21 reactor pass. Git tracks no
    generated source.

- [x] **REF-046 — Migrate the Pool contract**
  - Establish Pool schemas from the authoritative `pools-service` model and shared Division, format, and gender schemas.
  - Replace handwritten server and scraper transport types with generated boundaries while preserving standings,
    activation, season, ingestion, and lookup behavior.
  - Evidence: one Pool OpenAPI source owns the existing V1 routes and camelCase create, update, and response models.
    `pools-service` implements the generated server interface, gateway and search adapters consume generated local
    models, and the competition scraper uses the generated asynchronous HTTPX client. Its application layer now uses a
    transport-independent, idiomatic Python `Pool` model; handwritten Pool transport mirrors are removed.
  - Pool creation, update, lookup, deactivation, follower operations, activation, standings, season reconciliation, and
    ingestion retain their existing behavior. Clean contract/client generation, uv lock, Ruff, 70 scraper tests,
    6 generated-client tests, contract guards, and the targeted Java 21 reactor pass. Git tracks no generated output.

- [x] **REF-047 — Migrate the Competition contract**
  - Generate the competition-service boundary used by ingestion and downstream services from one authoritative contract.
  - Preserve cascade commands, external identifiers, season semantics, transaction boundaries, and existing routes; do
    not introduce a parallel API version or speculative event redesign.
  - Evidence: one Competition OpenAPI source owns all existing V1 association routes, cascade requests, ranking models,
    and camelCase payloads. `competition-service` implements the generated server interface, `mobile-gateway` maps
    generated adapter-local models, and the competition scraper uses the generated asynchronous HTTPX client.
    Handwritten transport DTOs were removed; scraper association state and calculated statistics are now idiomatic,
    transport-independent Python application models.
  - Association creation, lookup, ranking updates, bulk cascade commands, season behavior, and existing Rabbit messages
    remain unchanged. Contract guards, deterministic generation, the locked uv workspace, Ruff, 70 scraper tests,
    7 generated-client tests, and the targeted Java 21 reactor pass. Git tracks no generated source. The unrelated
    application-context test remains blocked by the pre-existing checksum of the local Competition Flyway database;
    no database repair was performed by this contract task.

- [x] **REF-048 — Migrate the Match contract**
  - Generate Match requests, responses, enums, and clients from the authoritative `matches-service` model.
  - Preserve score, status, date, team, pool, ingestion, follow, and feed behavior across the competition scraper,
    services, gateway, and search consumers.
  - Evidence: one Match OpenAPI source now owns every existing V1 match, day-group, live-link moderation, and internal
    test route with native camelCase payloads. `matches-service` implements the generated server interfaces,
    `mobile-gateway` maps generated adapter-local models, and the competition scraper uses the generated asynchronous
    HTTPX client while keeping its idiomatic application Match model separate.
  - Handwritten Match transport DTOs were removed from the owner and scraper. Match status, live provider, and live-link
    status are generated shared transport enums; the services retain their distinct application enums behind explicit
    mappers. Score, date, pool/team identity, live-link security, ingestion ordering, routes, and public gateway models
    remain unchanged. Two clean generations have the same hash; `uv` 0.11.29 lock/sync, the wheel build, contract
    guards, Ruff, 70 scraper tests, 8 generated-client tests, and 12 targeted Java 21 tests pass. Git tracks no generated
    source. The complete reactor still stops on the pre-existing Club Flyway V1-V3 checksum mismatch; no database repair
    was performed by this contract task.

- [x] **REF-049 — Migrate the User contract**
  - Generate the users-service transport boundary while keeping Auth0 identity, guest behavior, preferences, and public
    repository safety unchanged.
  - Remove handwritten User transport copies only after service, gateway, and mobile-facing behavior passes unchanged.
  - Evidence: one User OpenAPI source now owns every existing V1 profile and favorite route, including the multipart
    update boundary and native camelCase payloads. `users-service` implements the generated server interfaces;
    `mobile-gateway`, `matches-service`, and `notification-service` consume generated adapter-local models. The gateway
    still exposes its existing public User DTOs through an explicit mapper, so internal contracts do not leak into the
    mobile boundary.
  - Handwritten internal User transport copies were removed after the owner and all active consumers passed. The shared
    generated `EntityTypeEnum` owns the transport values while each application's business enum remains local behind a
    mapper. Auth0 subjects, guest creation, preferences, favorite behavior, routes, security scopes, and external
    providers remain unchanged. Two clean Java generations have the same hash; contract guards, targeted Java 21 tests,
    and consumer serialization tests pass. Git tracks no generated source.

- [x] **REF-050 — Migrate the Notification contract**
  - Generate notification requests, responses, preferences, and enums while retaining provider implementations behind
    handwritten adapters.
  - Preserve push registration, delivery decisions, read state, and error behavior without activating external sends.
  - Evidence: one Notification OpenAPI source now owns all six existing V1 inbox and push-token routes with native
    camelCase payloads. `notification-service` implements generated server interfaces and `mobile-gateway` consumes
    generated adapter-local models, converting them to transport-independent application views before enrichment and
    to the existing public mobile responses afterward. Handwritten internal Notification transport copies were removed.
  - Device platform, notification type, and notification target type are generated shared transport enums; provider and
    persistence-only status remains an application enum. The current application contains no preference endpoint or
    preference transport model, so none was invented. Expo/Auth0 providers, delivery orchestration, token ownership,
    read/open/delete semantics, routes, scopes, and error status behavior remain unchanged, and no external send was
    performed. Two clean Java generations have the same hash; contract guards, targeted Java 21 tests, gateway mapper
    tests, push-token behavior, and consumer serialization pass. Git tracks no generated source.

- [x] **REF-051 — Migrate the Report contract**
  - Generate report transport models and operations while keeping report destinations and external providers isolated.
  - Preserve creation, validation, attachment, status, and gateway behavior without sending production reports.
  - Evidence: one Report OpenAPI source now owns the existing V1 multipart creation route with native camelCase data.
    `reports-service` implements the generated server interface and `mobile-gateway` consumes generated adapter-local
    models through an explicit mapper while retaining its existing public request and response models.
  - The shared generated `ReportTypeEnum` owns the transport values. The provider-derived report state remains a string
    instead of introducing a speculative enum. Handwritten internal Report transport copies were removed; GitHub,
    Discord, and S3 adapters, validation, attachments, route, status mapping, and error behavior remain unchanged, and
    no external report was sent. Two clean Java generations have the same hash; contract guards and 15 targeted Java 21
    tests pass. Git tracks no generated source.

- [x] **REF-052 — Migrate the Search contract and worker consumers**
  - Generate the search-service API boundary and replace search-worker transport copies with models derived from the
    same Club, Team, Pool, Competition, and Match schema sources.
  - Preserve indexing, filtering, ranking, reconciliation, and error behavior; do not perform an index cutover or any
    production Elasticsearch operation.
  - Evidence: one Search OpenAPI source now owns the three existing V1 Club, Team, and Pool search routes and their
    camelCase response models. `search-service` implements the generated server interfaces; `mobile-gateway` reads
    generated adapter-local models and maps them to its unchanged public responses. The shared generated Format and
    Gender enums retain the same JSON values at the transport boundary.
  - `search-worker` keeps its generated Club, Team, Pool, and Division HTTP models from the corresponding authoritative
    service contracts. It has no Competition or Match HTTP projection source, so no unused client or speculative model
    was added. Its application projection models and messaging payloads remain handwritten behind the adapter boundary.
    Handwritten Search response copies were removed from the owner. Index documents, filters, ranking, caches,
    reconciliation, listeners, error handling, and Elasticsearch configuration remain unchanged; no live index,
    cutover, or production operation was performed. Two clean Java generations have the same hash; contract guards and
    25 targeted Java 21 tests pass. Git tracks no generated source.

- [x] **REF-053 — Migrate the mobile gateway contract**
  - Define the authoritative mobile-facing OpenAPI contract and make `mobile-gateway` implement its generated Java
    interfaces and DTOs while keeping aggregation logic handwritten and explicit.
  - Preserve every mobile route and camelCase payload. Reuse internal generated clients without exposing internal DTOs
    directly through the mobile boundary.
  - Evidence: one mobile-gateway OpenAPI V1 source now owns all 44 existing routes and 50 operations. The 15 feature
    controllers implement generated interfaces and expose only official public request and response names; no public
    schema contains `Internal`. Generated DTOs map to small application commands and views before orchestration, while
    generated owner-service `*InternalRequest` and `*InternalResponse` types remain confined to infrastructure
    adapters. All superseded handwritten public gateway DTOs were removed.
  - Routes, camelCase fields, multipart part names, aggregation, caches, Auth0 enforcement, signed FFVB links, and
    provider behavior remain unchanged. Two complete generations have the same hash; six contract guards and all 40
    gateway Java 21 tests pass. Both scraper suites also pass all 108 tests, including their generated-internal-contract
    architecture guards. Generated files remain ignored and untracked.

- [x] **REF-054 — Align documentation, logging, mapping, and testing policies**
  - Align Blockout code-documentation, Java testing, and mapping guidance with the corresponding Maaatch policies while
    preserving Python and Expo-specific testing rules.
  - Add one explicit Blockout logging policy for the current Java JSON-console, Python scraper observability, and Expo
    error-handling boundaries. Do not import Maaatch tracing, file logging, GitFlow, or product-specific conventions.
  - Route the four policy families from `blockout-best-practices` and define one conservative empty-directory rule:
    remove stale packages and use `.gitkeep` only for an explicitly accepted architectural location awaiting its first
    implementation.
  - Evidence: the Blockout skill now routes mapping as a first-class boundary. Code documentation and Java testing use
    the Maaatch contract and naming discipline adapted to Java 21, Python 3.12, and Expo; the new cross-language mapping
    policy defines boundary-local ownership and structural MapStruct use without forcing it over aggregation. Logging is
    explicitly Blockout-owned: Java structured JSON stdout, scraper observability, and safe Expo provider diagnostics,
    with no Maaatch tracing, local-file, GitFlow, or product convention imported. Prettier and `git diff --check` pass;
    no runtime source or generated file changed.

- [x] **REF-055 — Apply policies and clean Java application structures**
  - Audit every handwritten Java service and test against the documentation, logging, mapping, testing, and backend
    structure policies. Put API, application, persistence, provider, and generated-client mappings at their owning
    boundaries; use MapStruct for structural mappings and retain manual mapping for explicit aggregation or decisions.
  - Remove empty legacy packages and obsolete mapper locations. Keep only intentionally empty current-architecture
    locations with `.gitkeep`. Preserve contracts, routes, events, persistence, provider behavior, and runtime semantics.
  - Compile and test each affected module, then run the backend reactor because the shared mapper build configuration is
    cross-service.
  - Evidence: all handwritten Java trees and tests were inspected. Empty legacy packages were removed from the local
    workspace and no speculative empty package justified a `.gitkeep`. Mobile-gateway API mappers now live in their
    feature `api/mappers` packages; straightforward config, competition, notification, pool, and search mappings use
    MapStruct 1.6.3, while aggregation, multipart, provider, and generated-constructor decisions remain explicit manual
    mappings. Controller overrides and touched boundaries follow the documentation policy. Test class names now use the
    declared `UnitTest` or `SmokeTest` suffixes. Logs no longer expose complete internal URLs, notification contents,
    device tokens, attachment names, provider response bodies, or exception-message fields, and routine reads are kept
    at `DEBUG`. The complete reactor compiles, including tests, and all non-smoke backend tests pass across 14 modules.
    The full smoke invocation reaches PostgreSQL but the existing local clubs database is rejected by Flyway because its
    applied V1-V3 checksums predate the current migration files; no destructive repair or data reset was performed.
    Generated sources remain ignored and untracked, and `git diff --check` passes.

- [x] **REF-056 — Apply policies and clean Python scraper structures**
  - Audit both scrapers against the documentation, logging, mapping, testing, and scraper architecture policies.
    Generated internal DTOs remain confined to `infrastructure/blockout`; provider records, domain values, and
    application orchestration remain distinct and explicitly mapped.
  - Remove empty or obsolete directories and retain no speculative provider/test package skeleton. Preserve parsing,
    scheduling, retries, ordering, writes, fixtures, and all runtime behavior.
  - Run Ruff checks, syntax checks, both complete suites, architecture guards, and disabled-startup/import checks.
  - Evidence: both scraper trees now use the same documented process, application, domain, provider, Blockout adapter,
    scheduling, and observability boundaries. Generated internal models and clients remain confined to
    `infrastructure/blockout`; mapping to handwritten domain values stays explicit and local to that adapter. Touched
    modules now carry concise PEP 257 documentation, environment selection no longer prints local file paths, and both
    processes configure their existing JSON logger from bootstrap. Logs retain actions, provider families, technical
    identifiers, status, attempts, and durations without serializing provider URLs, club/team names, payloads, or raw
    exception messages. The unused arbitrary-object log serializer was removed. No empty or speculative directory
    remains and no `.gitkeep` is justified. Ruff format and lint checks pass, compileall and import-only startup checks
    pass, the 37 club tests and 71 competition tests pass, including both architecture guards and all authentic provider
    fixtures. Generated sources remain ignored and untracked, and `git diff --check` passes.

- [x] **REF-057 — Apply policies and clean Expo mobile structure**
  - Audit the mobile application against the documentation, logging, mapping, testing, and Expo policies. Keep route
    files thin, feature presentation models local, transport mapping at the API boundary, and shared code limited to
    active cross-feature use.
  - Remove obsolete or empty route, module, model, utility, and test directories. Keep a `.gitkeep` only for an explicit
    accepted location awaiting implementation; do not prepare speculative feature trees.
  - Preserve navigation, Auth0, native behavior, API traffic, styling, accessibility, and tests. Run format, lint,
    typecheck, Jest, and Web export; run a native check only if a native boundary changes.
  - Evidence: all 298 TypeScript source files and 26 co-located test suites were included in the structure audit. No
    empty source, asset, plugin, or test directory remains, and no speculative location justifies a `.gitkeep`; ignored
    application-local Expo and Web export caches were removed after validation. Route ownership, active feature-local
    presentation models, and boundary-local handwritten transport mapping remain unchanged pending REF-058. Routine UI
    diagnostics and the duplicate advertising failure log were removed; the two remaining console warnings belong to
    native provider boundaries and expose no URL, payload, credential, or raw exception. No generic logger or mapping
    abstraction was introduced. Nx lint and typecheck pass, all 26 Jest suites and 52 tests pass, and the 3,148-module
    Expo Web export succeeds. No native boundary changed, so no native rebuild was required; `git diff --check` passes.

- [x] **REF-058 — Adopt the generated mobile TypeScript client**
  - Generate the mobile client and models with Orval from the gateway contract into
    `apps/frontend/mobile/src/shared/generated/**`, then replace handwritten Axios transport and duplicate mobile DTOs
    feature by feature.
  - Keep TanStack Query ownership, Expo session behavior, error presentation, accessibility, and all existing tests;
    generated source remains application-local and outside Git.
  - Evidence: the mobile now owns one Maaatch-aligned Orval configuration using the official `fetch`, `tags`, `clean`,
    schema-output, custom-mutator, and body-only response options. Its Nx `codegen` target depends on the authoritative
    mobile-gateway bundle and is a prerequisite of lint, typecheck, tests, and Web export. The 50 public V1 operations
    generate 15 tag-scoped endpoint files and 73 model files, all ignored and untracked. Every handwritten mobile
    request, response, and transport enum was replaced by the generated official name; only genuine presentation
    values such as ranking highlights, legal route selection, and enum labels remain local. The nine feature API
    adapters now call generated operations, while the former Axios registry, base client, `qs`, handwritten multipart
    helper, and duplicate transport files were removed. One small `expo/fetch` mutator preserves the 20-second timeout,
    secure-route token injection, public-route isolation, `ApiError`, unauthorized cleanup, JSON/text/blob handling,
    and `204` semantics. Four focused tests cover public repeated query parameters, secure authentication, gateway
    problems, and safe transport failures. Two clean generations have the identical
    `5412392890cddf1b466f68a41b534ee34614df81` aggregate hash. All six contract tests, mobile lint with zero warnings,
    typecheck, 27 Jest suites and 56 tests pass; the 3,138-module Expo Web export succeeds. No generated file is tracked,
    no empty legacy model directory remains, and `git diff --check` passes.

- [x] **REF-059 — Certify and clean the complete contract-first application**
  - Remove superseded handwritten transport DTOs, internal HTTP clients, obsolete dependencies, and compatibility-only
    names only after every consumer uses the generated boundary.
  - Prove clean deterministic generation, zero tracked generated files, wheel and Java artifact builds, both scraper
    suites, all backend reactors, the gateway, the mobile static/test/Web/native matrix, and a complete local functional
    flow from providers through persistence to the mobile application.
  - Record unavailable signed-device or external-provider evidence without adding authentication, network, storage, or
    production bypasses.
  - Evidence: the remaining handwritten Competition ranking mirrors in `mobile-gateway` and Team and Pool HTTP mirrors
    in `notification-service` were removed. Generated transport types stay confined to adapters and are reduced to
    application-owned views. Two clean generations produced the same
    `0ee68453658c644cd9db579a5008f6793f99c23c332db3545f751fc11ad7a7ce` aggregate hash, and no generated file is tracked.
    Contract tests, the Python wheel and isolated import, all 108 scraper tests, all 13 Java artifacts and backend test
    reports, mobile lint/typecheck, all 27 Jest suites and 56 tests, Web export, Expo Doctor, clean native prebuild, and
    unsigned Android and iOS Simulator builds pass. A disposable-database flow proved an authentic FFVB fixture through
    generated Python clients, fresh Flyway persistence, Java adapters backed by generated contract models, the gateway,
    generated Orval transport, and the Expo Web team screen. The databases and generated native projects were removed
    afterward; existing volumes were untouched. Signed-device and production evidence remains unavailable and no bypass
    was added. Full evidence is recorded in [the REF-059 certification](./ref-059-certification.md).

- [x] **REF-060 — Prepare the repository for public release**
  - Audit the tracked tree, ignored local environments, generated outputs, signing material, public mobile identifiers,
    documentation, and repository history without exposing secret values.
  - Provide a concise public README, documentation index, vulnerability reporting path, and honest license boundary.
  - Correct only concrete public-bootstrap and local-environment gaps. Keep GitFlow, CI, deployment, production behavior,
    repository visibility, external credential rotation, and destructive history rewriting outside this task.
  - Prove lockfile installation, the Nx graph, contract guards, the complete Maven package, affected tests, documentation
    formatting, ignored-file ownership, and a secret scan from a clean tracked-tree export.
  - Evidence: all 15 deployables have aligned safe examples and ignored owner-readable local environments. The obsolete
    notification Auth0 role variable was removed; Expo enhanced push security is optional and covered by a focused test;
    both scraper `serve` targets now select `.env.local`. The current tracked tree contains no private credential and
    Gitleaks reports only eight expected public mobile identifiers. The construction history contains one legacy Auth0
    credential candidate, so publication requires the planned clean repository initialization and provider rotation if
    that registration still exists; REF-060 performs neither destructive operation. The public README, documentation
    index, security reporting path, history boundary, and no-license status are explicit. From an indexed clean-tree
    export, `npm ci`, uv lock and sync, OpenAPI generation, all 20 Nx projects, six contract guards, and all 13 Maven
    artifacts pass. Both scraper suites retain 108 passing tests, documentation and diff checks pass, and npm audit has
    no high or critical finding. Full evidence is recorded in
    [the REF-060 public release readiness record](./ref-060-public-release-readiness.md).

- [x] **REF-061 — Capture the complete mobile visual baseline**
  - Treat the currently shipped native application as the visual and behavioral baseline. Exercise iOS and Android,
    then inspect React Native Web only at representative mobile viewports to catalogue platform gaps rather than infer a
    desktop design.
  - Record every reachable screen and meaningful loading, empty, error, disabled, sheet, toast, authenticated, and guest
    state with sanitized test data. Use the authenticated test account without recording credentials or personal data.
  - Inventory existing visual values, theme tokens, component families, duplicate buttons, pills, cards, fields,
    feedback patterns, component props, file names, and exports. Distinguish feature-owned composition from genuinely
    shared primitives.
  - Produce the authoritative screen/state matrix and the proposed Figma token and component scope. Do not change the
    application, correct Web rendering, or create Figma foundations before this discovery record is complete.
  - Evidence: the complete route and feature surface was inventoried into an authoritative screen/state matrix, and
    the existing theme, visual values, shared component consumers, prop pressure, duplication, file naming, and exports
    were measured from handwritten production source. Chrome exercised sanitized guest, search, feedback, and Auth0
    handoff states at `390 x 844`; fresh official Expo 55 clients built and launched on a Pixel 7 and iPhone 17 Pro and
    exposed the native consent entry without changing consent. A later authenticated revalidation ran with every local
    Java service available and proved the official Auth0 administrator flow, all four internal-tool permissions, and
    the raw-division mapping search/empty state. It corrected only two Web adapter defects: permission discovery now
    uses the platform Auth0 adapter, and sheet searches use the regular React Native input on Web while keeping the
    native bottom-sheet input on iOS and Android. Focused permission tests and a browser smoke cover the corrections.
    The Chrome extension did not honor the requested phone viewport for the authenticated pass, so it is structural
    evidence rather than a replacement for the existing mobile captures. The approved Figma foundation/component
    scope, feature-versus-shared ownership, and remaining external evidence gaps are recorded in
    [the REF-061 mobile visual baseline](./ref-061-mobile-visual-baseline.md). No Figma object changed.

- [x] **REF-062 — Build the Blockout foundations in Figma**
  - Create or select one Blockout mobile design-system file and implement the approved primitive and semantic variables
    for the existing dark experience: color, typography, spacing, sizing, radii, borders, effects, icon sizes, safe areas,
    touch targets, and mobile layout constraints.
  - Normalize accidental near-duplicates using a small coherent scale while preserving Blockout's identity. Do not
    invent a light theme, desktop product, new brand, or speculative token taxonomy.
  - Document foundations in Figma, bind semantic variables to primitives, set appropriate scopes and code syntax, and
    validate every foundation page before any component is created.
  - Evidence: the canonical
    [`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file now owns the five policy
    lifecycle pages. Its documented dark-only foundation contains 40 exact color primitives, 41 semantic aliases, 36
    dimension variables, 27 typography variables, 12 text styles, five elevation styles, and eight gradient or pool
    paint styles. All 144 variables have platform code syntax; non-primitive scopes are complete, every semantic alias
    resolves, all 81 swatches are variable-bound, the 1,280-pixel documentation grids wrap without overflow, and no
    placeholder remains. Safe areas stay runtime inputs, Inter is only the neutral Figma representation of platform
    system fonts, and no light theme, desktop product, runtime source, generated file, or provider state changed. The
    architecture and durable node evidence are recorded in
    [the REF-062 Figma foundations record](./ref-062-figma-foundations.md).

- [x] **REF-063 — Build the Blockout component library in Figma**
  - Create only the component families proven by REF-061, in dependency order. Cover the required variants and states
    for controls, pills, fields, cards, feedback, navigation, sheets, and other repeated patterns without reproducing
    feature-specific screens as generic components.
  - Use Auto Layout, Figma variables, explicit component properties, accessible contrast and touch targets, and bounded
    variant sets. Avoid boolean-prop matrices, cosmetic one-off variants, detached copies, and speculative components.
  - Document usage and validate the structure and rendered appearance of each component before proceeding to the next.
    The result is Blockout's own small mobile component library, not a React Native imitation of shadcn.
  - Evidence: the canonical Figma file now contains nine documented component sets and 48 bounded variants for actions,
    chips, fields, cards, feedback, entity rows, navigation items, screen headers, and sheets. All families use Auto
    Layout, semantic foundation variables, and explicit component properties; `Sheet` composes the existing `Field`
    and `Action` masters. The final 1,440-by-5,605 page audit reports no placeholder, unnamed generic node, or duplicate
    component-set name. Visual review also removed a default frame fill and loading-metadata leak from `Entity Row`.
    No feature-specific screen, desktop variant, runtime source, generated artifact, provider setting, or production
    behavior changed. Full ownership and validation evidence is recorded in
    [the REF-063 Figma component library record](./ref-063-figma-components.md).

- [x] **REF-064 — Reconstruct the mobile screen specifications in Figma**
  - Reconstruct every screen and state from the REF-061 matrix using the approved foundations and components. Preserve
    the current product, copy, information hierarchy, navigation intent, and native identity while resolving accidental
    spacing, alignment, sizing, and component inconsistencies.
  - Model representative mobile widths and the real iOS/Android distinctions. Record Web compatibility expectations,
    but do not design a 1920-by-1080 desktop application.
  - Review the complete screen set against the running native application and close every unexplained gap. At completion,
    Figma becomes the visual authority for the implementation refactor; the application remains the functional authority.
  - Evidence: `30 - Ready for Development` now contains all 39 screen rows and 210 named state labels from REF-061,
    grouped into five mobile domains. Twenty-one frames use `iOS 393` and eighteen use `Android 411`; every frame records its
    observed, certified, or source-reconstructed evidence and follows the canonical domain/screen/viewport/state name.
    The consent, map, and PDF surfaces are explicit provider boundaries, Auth0 remains a handoff, and no desktop product
    was invented. The final 1,440-by-9,006 structural audit reports no placeholder, duplicate screen key, or immediate
    overflow. These compact frames are specification coverage rather than full-height runtime reproductions. No Expo
    source, API contract, generated artifact, provider configuration, deployment, or production state changed. Full
    scope and validation evidence is recorded in
    [the REF-064 Figma screen certification](./ref-064-figma-screen-certification.md).

- [x] **REF-064A — Reconcile the canonical Web mobile and iOS screens in Figma**
  - Compare the running application with the canonical file and replace specification-only claims with complete,
    implementation-ready screen compositions. Preserve current behavior, copy, information hierarchy, native identity,
    provider ownership, and the small local Blockout component system.
  - Exercise React Native Web at a phone viewport and the iOS simulator. Do not launch or test Android in this task for
    resource reasons; treat Android as an explicit parity assumption with iOS and never describe it as observed or
    certified evidence.
  - Normalize only proven visual drift: spacing, radii, typography, component proportions, and repeated states. Use the
    Apple library only for genuine iOS system or provider boundaries; keep Blockout controls local. Do not modify Expo
    runtime source, contracts, generated artifacts, providers, deployment, or production state.
  - Certify only full compositions with matching runtime evidence. Record inaccessible data, authentication, provider,
    or native states as blocked instead of manufacturing fixtures or visual proof. Update the Figma policy and this
    roadmap with the exact nodes, viewports, states, validation results, and remaining limitations.
  - Evidence: five complete authenticated iOS compositions now cover populated home, club information, team empty,
    pool ranking, and finished match states in canonical rows `114:1218`, `114:1228`, `116:1275`, `116:1285`, and
    `116:1295`. Every `393 x 852` screen has zero descendant overflow and uses semantic color variables. The filtered
    match endpoint returns HTTP `200` after a focused contract-completeness correction; the bottom-sheet native crash
    is resolved by the compatible patch release. Web evidence unavailable after restart is marked rather than invented,
    Android was not launched, and the subsequent native-only decision is isolated in REF-065A. Full evidence is in
    [the REF-064A canonical runtime reconciliation](./ref-064a-canonical-runtime-reconciliation.md).

- [x] **REF-065 — Establish the Expo UI and component policy**
  - Rewrite the mobile policy from the certified Figma system, current Expo and React Native guidance, and the existing
    Blockout architecture. Define token ownership, local versus shared components, component composition, styling,
    accessibility, responsive behavior, exports, and visual validation without introducing a generic design framework.
  - Standardize handwritten file names as kebab-case, exported React components and types as PascalCase, and hooks,
    functions, props, and variables as camelCase. Preserve Expo Router special names and generated-source ownership.
  - Prefer direct named component exports and explicit imports over a global registry or large barrel. Require small
    finite variants instead of prop proliferation, keep one-off layout composition local, and promote UI to
    `src/shared/ui` only when active reuse or an application-wide invariant is proven.
  - Align the mobile testing policy with the new visual boundary: user-visible behavior remains covered by Jest and React
    Native Testing Library, while Figma comparisons and platform captures prove appearance. Do not add pixel snapshots,
    test-only production branches, or a second UI/test framework.
  - Evidence: the Expo policy now makes iOS and Android the only product surfaces; assigns semantic tokens to
    `src/shared/theme`; defines the feature-to-shared promotion gate, reusable screen-shell boundary, finite variants,
    native styling, accessibility, responsive behavior, kebab-case handwritten files, direct named exports, and narrow
    public entry points; and prohibits Tailwind, prop-heavy abstractions, primitive wrappers, registries, factories,
    configuration-driven generic screens, and broad barrels. The testing policy keeps Jest and React Native Testing
    Library responsible for observable behavior while exact Figma nodes and native captures own visual proof. The Figma
    policy now excludes React Native Web from current certification.

- [x] **REF-065A — Remove the React Native Web surface**
  - Make Android and iOS the only supported product surfaces before implementing the Figma system. Remove the Expo Web
    target, Web-only scripts, dependencies, configuration, OAuth environment values, platform adapters, fallbacks,
    tests, and active documentation when they have no native consumer. Keep Metro and every dependency required by the
    native Expo toolchain; determine removals from the current Expo dependency graph instead of guessing.
  - Delete Web-specific branches and files only after their native behavior is represented directly and simply. Keep
    shared generated API clients, feature boundaries, Auth0 native login, provider ownership, and Android/iOS behavior
    unchanged. Do not replace removed Web code with compatibility helpers or dormant abstractions.
  - Remove Web lanes and Web certification claims from the canonical Figma file and current visual documentation.
    Preserve only truthful historical notes needed to explain the removal. Update `.env.example` files and ignored
    `.env.local` files together without committing credentials.
  - Validate Expo Doctor, formatting, lint, typecheck, Jest, an unsigned iOS build/launch, and an unsigned Android build.
    Prove that no supported Nx target, application dependency, runtime branch, environment variable, test, or current
    policy still advertises React Native Web. Commit and push this task separately before REF-066.
  - Evidence: Expo now declares only iOS and Android; Nx exposes a native dev-client `serve` target and no Web export;
    browser-only Auth0, storage, notification, consent, interstitial, map, dependency, script, environment, and test
    surfaces are removed without replacing them with compatibility code. Expo Doctor passes all 19 checks, the mobile
    lint/typecheck/Jest baseline passes 27 suites and 53 tests, both unsigned native builds install and load their Metro
    bundles, and the ignored `.env.local` contains no browser client setting. Figma contains zero Web code syntax across
    146 variables, zero Web comparison lane, and only the native map states that remain supported.

- [x] **REF-065B — Rebuild the faithful native Figma system**
  - Use the current authenticated iOS application at `393 x 852` and its runtime source as the visual evidence for the
    native product. Use only the iOS simulator for capture, comparison, and Figma synchronization. Android remains a
    supported runtime with technical validation, but do not launch it or treat it as a second visual authority here.
  - Rebuild `10 - Foundations`, `20 - Components`, and the canonical compositions on `30 - Ready for Development` as an
    editable native design system: exact semantic palettes, typography, spacing, radii, borders, effects, gradients,
    assets, component responsibilities, variants, states, safe areas, and layouts. Match Maaatch's disciplined library
    structure without importing shadcn, copying Maaatch product UI, or adding a generic component framework.
  - Treat fidelity as the default. Normalize only small incidental differences to reusable tokens; when normalization
    would visibly change the shipped application, preserve the current native result and document the exception.
    Reuse safe repository assets when practical and use explicit image placeholders otherwise.
  - Build screens from component instances where a reusable responsibility is proven. Keep one-off business
    composition local, keep component APIs finite and understandable, and remove inaccurate, duplicated, obsolete, or
    detached Figma structures only after the replacement is verified.
  - Audit variables, styles, components, variants, bindings, instance linkage, names, bounds, fonts, placeholders, and
    representative iOS screenshots. Record exact node IDs, intentional normalization, remaining provider or physical-
    device limits, and sanitized evidence. Commit and push this task separately, then stop before REF-066.
  - Evidence: the canonical file retains 146 scoped native variables, 12 text styles, five effect styles, and eight
    paint styles; `20 - Components` now contains 14 component sets and 71 variants with no standalone component,
    duplicate family, unstyled text, or unbound solid paint. Five authenticated `393 x 852` compositions use 18 linked
    instances across `Hero`, `Match Row`, `Ranking Row`, `Feedback`, and `Bottom Navigation`; all canonical text uses
    `SF Pro` or the intentional `Outfit` wordmark, and no screen overflows. Only the iOS simulator and existing
    authenticated iOS evidence informed the visual synchronization; Android was not launched. Provider overlays and the
    physical-device-only notification path remain explicit limits. Exact nodes and normalization decisions are recorded
    in [the REF-065B faithful native Figma system record](./ref-065b-faithful-native-figma-system.md).

- [x] **REF-065C — Refine iOS fidelity and component hierarchy in Figma**
  - Use only the iPhone 17 Pro simulator at `393 x 852`, current Expo source, and authenticated iOS evidence to correct
    remaining alignment, border, radius, spacing, typography, and component-geometry differences. Android remains a
    supported technical target but is not launched, captured, or used as visual authority.
  - Replace the single component canvas with a compact Maaatch-aligned page hierarchy:
    `20 - Actions & Inputs` owns `Action`, `Chip`, `Field`, and `Search`; `21 - Content & Data` owns `Card`,
    `Entity Row`, `Hero`, `Match Row`, and `Ranking Row`; `22 - Feedback & Overlays` owns `Feedback` and `Sheet`;
    `23 - Navigation` owns `Navigation Item`, `Screen Header`, and `Bottom Navigation`. Add separator pages around the
    component group while preserving `00 - Cover`, `10 - Foundations`, `30 - Ready for Development`, and
    `40 - Shipped`.
  - Keep each master and its documentation together. Correct shared visuals at the semantic token or main-component
    level before adjusting compositions, so instances inherit the result. Do not add a generic mobile framework,
    speculative variants, detached copies, or per-screen compensation for a shared defect.
  - In every canonical iOS composition, replace a repeated visual responsibility with an instance of its isolated
    master when a matching family exists. Preserve genuinely one-off business compositions locally. Verify labels,
    variants, component properties, instance lineage, fonts, bounds, and screenshots after each replacement.
  - Audit the final page order, category ownership, component IDs, bindings, instance counts, detached equivalents,
    representative `393 x 852` screenshots, and intentional local exceptions. Document exact evidence, commit and push
    REF-065C separately, then stop before REF-066.
  - Evidence: the canonical Figma file now uses four categorized component pages bounded by separators, with every
    master colocated with its guidance. Fifteen component sets expose 74 variants, including the source-backed
    `Follow Action` and `Screen Header / Entity` additions. Runtime geometry was corrected at the master level for
    actions, chips, search, headers, heroes, match rows, ranking rows, feedback, and navigation. The five canonical
    `393 x 852` iOS compositions contain 45 linked instances across shared headers, chips, actions, tabs, heroes,
    feedback, match rows, ranking rows, and bottom navigation. The only immediate overflows are the Club map content
    below the scroll viewport and the Team ranking tab beyond the horizontal tab viewport, matching the native
    scrollable responsibilities. Android was not launched or used as visual evidence. Exact nodes and validation are
    recorded in
    [the REF-065C Figma fidelity and component hierarchy record](./ref-065c-figma-fidelity-and-component-hierarchy.md).

- [x] **REF-065D — Certify the remaining iOS compositions in Figma**
  - Use only the running iPhone 17 Pro simulator, current Expo source, and canonical `393 x 852` viewport to certify
    sign-in, empty club search, guest profile, legal-document sheet, and authenticated administrator profile. Do not
    launch Android or Web, add an authentication bypass, expose credentials, change runtime code, or modify production
    state.
  - Correct shared differences at the semantic-token or categorized master level first. Add only source-backed
    responsibilities missing from the library, keep one-off business composition local, and require every reusable
    responsibility in the five screens to remain a linked instance.
  - Replace a `Validation pending` label only after current simulator evidence, exact-screen screenshot review, font,
    bounds, binding, instance-lineage, and category-ownership checks pass. Sanitize account and legal contact data in
    the public design record.
  - Document exact screen, label, token, and component nodes plus provider-owned limitations. Commit and push REF-065D
    separately, then stop before REF-066.
  - Evidence: all five `393 x 852` compositions now have dated validation labels and zero missing font. Source-backed
    corrections add `radius/card`, `surface/selected`, and `radius/hero`; the categorized library contains 17 component
    sets and 81 variants, including Menu Row, Guest Upsell Card, and the two-item guest navigation family. The screens
    contain 24 linked top-level instances, have no unexplained overflow, and expose no runtime identity data. Ranking
    positions and points, plus match times and scores, are centered in their shared masters. Exact icons come from the
    pinned Expo icon dependency; 194 visible icon roots stay within their boxes and no text approximation remains. The
    non-native blue active-navigation outline is removed from all eight master variants while the selected pill keeps
    the native `#5f5f5f` semantic border. All eleven canonical iOS frames received a structural regression audit, and
    five sensitive compositions received fresh full-frame renders. Android and Web were not launched. Exact evidence
    and the provider-owned variable-font diagnostic are recorded in
    [the REF-065D iOS pending screen certification](./ref-065d-ios-pending-screen-certification.md).

- [x] **REF-065E — Reconcile the iOS Sign in screen pixel by pixel**
  - Compare only `Access / Sign in / iOS 393` with the running iPhone 17 Pro simulator and its current Expo source.
  - Correct shared tokens or component masters before local composition, then verify assets, icons, typography, colors,
    spacing, alignment, radii, borders, safe areas, bounds, bindings, and instance lineage.
  - Record exact evidence, regression-check only affected shared consumers, publish this task alone, and stop before
    REF-065F.
  - Evidence: the canonical `393 x 852` Sign in composition now matches a fresh iPhone 17 Pro capture and the current
    Expo source. Shared Action and Chip masters expose exact source icons through instance swaps, a reusable iOS
    status-bar master owns system chrome, and all four MaterialCommunityIcons vectors come from the pinned application
    dependency. Chip content is centered from its shared master, while the primary Action carries the native dark icon,
    label metrics, and elevation. The screen has zero detached icon overlay, non-native blue stroke, or invented home
    indicator. Its geometry, typography, copy, borders, radii, safe area, and alignment were measured at exact nodes,
    and a complete Auth0 connect-then-disconnect cycle succeeded against the local gateway after the required Java
    services were restarted. No runtime source, credential, provider configuration, Android, Web, production state, or
    later screen changed. Exact evidence is recorded in
    [the REF-065E iOS sign-in fidelity record](./ref-065e-ios-sign-in-fidelity.md).

- [x] **REF-065F — Establish the Pill and Gradient Pill component families in Figma**
  - Treat the current Expo `InfoPillGradient` implementation as the runtime authority while keeping this task
    Figma-only. Represent its two structural branches as separate, categorized component sets: `Pill` for the
    non-gradient surface and `Gradient Pill` for gradient-border and gradient-filled treatments.
  - Give both families the source-backed `Small`, `Medium`, and `Large` sizes; centered auto-layout; label; optional
    left and right icon swaps from the pinned Expo icon libraries; optional red-dot indicator; and `Default`, `Pressed`,
    and `Disabled` states. Keep `Border` and `Filled` as a treatment axis only on `Gradient Pill`; do not preserve an
    invented generic `Selected` state.
  - Reuse the existing semantic variables for colors, typography, spacing, radii, borders, opacity, and gradients,
    adding only a genuinely missing semantic variable. Keep the variant matrices bounded, document the mapping from
    the single Expo component to the two Figma families, and avoid exposing arbitrary runtime style overrides as
    component properties.
  - Replace affected canonical Figma usages with linked instances, without detaching content or changing their current
    appearance. Validate every variant structurally and visually, regression-check the Sign in screen and representative
    solid, gradient-border, gradient-filled, interactive, icon, and indicator consumers, document exact evidence, and
    stop before REF-065G. No Expo source, Android, Web, runtime behavior, credential, provider, or production state
    changes.
  - Evidence: `Pill` now exposes 9 source-backed variants and `Gradient Pill` exposes 18, with bounded size, state,
    treatment, icon-swap, label, and indicator properties. The exact Ionicons chevron joins the existing pinned
    MaterialCommunityIcons masters; every family reuses existing semantic variables and gradient styles. Seventeen
    canonical solid-pill consumers retain linked instance lineage, no detached pill or chip equivalent remains, and
    representative solid, gradient-border, gradient-filled, pressed, icon, and indicator instances pass structural and
    visual checks. The Sign in regression render remains unchanged. No application source or runtime surface changed.
    Exact nodes and validation are recorded in
    [the REF-065F Figma Pill families record](./ref-065f-figma-pill-families.md).

- [x] **REF-065G — Reconcile the populated iOS Search screen pixel by pixel**
  - Compare only the authenticated default Team search state with an empty query and populated results against the
    running iPhone 17 Pro simulator and its current Expo source.
  - Apply proven shared corrections at their token or component master, validate the complete screen, and stop before
    REF-065H.
  - Evidence: the canonical frame now uses linked shared iOS status bar, `Pill`, `Search`, `Select Filter`,
    `Gradient Pill`, `Team Result Card`, and premium Search-active Bottom Navigation instances. Five result-card
    instances reproduce the live local results with source-derived geometry and a non-sensitive captured team logo.
    Exact Expo MaterialCommunityIcons vectors own the four filters; the provider development control remains excluded.
    The complete Java/native stack is running and retained for the following tasks; the
    required gateway, config, search, and Metro paths are healthy, with `pools-service` on its owned port `8081` and
    Metro on `8100`. No runtime source, credential, Android, Web, provider, or production behavior changed. Exact nodes
    and validation are recorded in
    [the REF-065G iOS populated Search fidelity record](./ref-065g-ios-populated-search-fidelity.md).

- [x] **REF-065H — Reconcile the iOS Guest profile screen pixel by pixel**
  - Compare only `Profile / Guest / iOS 393` with the running iPhone 17 Pro simulator and its current Expo source.
  - Apply proven shared corrections at their token or component master, validate the complete screen, and stop before
    REF-065I.
  - Evidence: the canonical frame now uses linked shared iOS status bar, Profile Header, Guest Upsell Card, legal menu
    rows, and Guest Bottom Navigation instances. The profile-specific shared header reproduces the adjacent title and
    report action, while the shared active navigation avatar uses the exact committed Expo asset. Geometry, typography,
    colors, borders, radii, safe areas, bounds, and instance lineage pass full-frame and structural comparison against
    the live guest state on the iPhone 17 Pro simulator. The provider development control and invented home indicator
    remain excluded. The complete native stack remains running for REF-065I. No runtime source, credential, Android,
    Web, provider, or production behavior changed. Exact nodes and validation are recorded in
    [the REF-065H iOS guest profile fidelity record](./ref-065h-ios-guest-profile-fidelity.md).

- [x] **REF-065I — Reconcile the iOS Administrator profile screen pixel by pixel**
  - Compare only `Profile / Administrator / iOS 393` with the running iPhone 17 Pro simulator and its current Expo
    source.
  - Apply proven shared corrections at their token or component master, validate the complete screen, and stop before
    REF-065J.
  - Evidence: the canonical frame now uses linked shared iOS status bar, Administrator Profile Header, Profile Hero,
    legal row, account action, and premium Bottom Navigation instances. The profile header is a bounded shared family;
    the new shared Profile Hero composes the existing Hero foundation without screen-local overlays. The exact current
    profile visual and content replace placeholder data, while the shared Profile-active navigation master owns the
    authenticated avatar. Geometry, typography, colors, borders, radii, safe areas, bounds, and instance lineage pass
    full-frame and structural comparison against the live administrator session on the iPhone 17 Pro simulator. The
    provider development control and invented home indicator remain excluded. The complete authenticated native stack
    remains running for REF-065J. No runtime source, credential, Android, Web, provider, or production behavior changed.
    Exact nodes and validation are recorded in
    [the REF-065I iOS administrator profile fidelity record](./ref-065i-ios-administrator-profile-fidelity.md).

- [x] **REF-065J — Reconcile the iOS empty authenticated Home screen pixel by pixel**
  - Compare only `Home / Authenticated empty / iOS 393` with the running iPhone 17 Pro simulator and its current Expo
    source.
  - Apply proven shared corrections at their token or component master, validate the complete screen, and stop before
    REF-065K.
  - Evidence: the canonical frame now contains only linked shared iOS status bar, Upcoming Feed Header, No matches, and
    premium Home-active Bottom Navigation instances. The shared feed header owns the complete source-backed brand,
    entitlement, tabs, and actions below the current iPhone safe area. The current administrator has followed entities,
    so the authenticated shell and navigation were revalidated live while the empty content was verified against its
    prior authenticated native observation and current Expo EmptyState/StateCard source; user data was not mutated to
    manufacture the state. The shared navigation family now owns the source avatar behavior in active and inactive
    states. Bounds and instance lineage pass structural review, with no provider development control or invented home
    indicator. The complete native stack remains running for REF-065K. No runtime source, credential, Android, Web,
    provider, user data, or production behavior changed. Exact nodes and validation are recorded in
    [the REF-065J iOS empty authenticated Home fidelity record](./ref-065j-ios-empty-authenticated-home-fidelity.md).

- [x] **REF-065K — Reconcile the iOS populated authenticated Home screen pixel by pixel**
  - Compare only `Home / Authenticated populated / iOS 393` with the running iPhone 17 Pro simulator and its current Expo
    source.
  - Apply proven shared corrections at their token or component master, validate the complete screen, and stop before
    REF-065L.
  - Evidence: the canonical frame now reproduces the live authenticated administrator feed with the real visible dates,
    pool, teams, logos, match times, and clipped continuation beneath the floating navigation. New categorized
    `Match Date Header / Feed` and `Pool Header / Match Feed` masters own the source-backed compositions, while every
    visible match remains linked to the shared Upcoming Match Row. Home and away names are centered horizontally and
    vertically within their own team zones across every Match Row state. The pool title-subtitle block is centered
    vertically against its header and division logo. The exact pinned MaterialCommunityIcons calendar and Ionicons
    chevron are retained, long team names reproduce native auto-shrinking, and the app shell remains linked to the
    shared iOS status, feed header, and premium Home-active navigation masters. Geometry, typography, images, borders,
    radii, bounds, missing fonts, icon ownership, and instance lineage pass structural and full-frame review.
    The complete native stack remains running for REF-065L. No runtime source, credential, Android, Web, provider, user
    data, or production behavior changed. Exact nodes and validation are recorded in
    [the REF-065K iOS populated authenticated Home fidelity record](./ref-065k-ios-populated-authenticated-home-fidelity.md).

- [x] **REF-065L — Reconcile the iOS Club information screen pixel by pixel**
  - Compare only `Club / Information / iOS 393` with the running iPhone 17 Pro simulator and its current Expo source.
  - Apply proven shared corrections at their token or component master, validate the complete screen, and stop before
    REF-065M.
  - Evidence: the canonical frame now reproduces the authenticated VOLLEY-BALL PEXINOIS NIORT information route with
    its real logo, editable full-width Hero, current club name, exact tabs, email, website, city, two-line address, map
    action, and clipped native map-provider surface. The shared Title Hero variants now follow the current Expo
    composition. A categorized Club Info Row set exposes only source-shaped `Single` and `Double` layouts, exact pinned
    icon swaps, optional chevrons, and text properties; all five screen rows remain linked to it. Shared iOS status,
    Screen Header, segment Navigation Items, and premium Home-active Bottom Navigation own the shell. The provider
    development control and invented home indicator remain excluded. Geometry, typography, images, borders, radii,
    scroll clipping, missing fonts, icon ownership, and instance lineage pass structural and full-frame review. The
    complete native stack remains running for REF-065M. No runtime source, credential, Android, Web, provider, club
    data, or production behavior changed. Exact nodes and validation are recorded in
    [the REF-065L iOS Club information fidelity record](./ref-065l-ios-club-information-fidelity.md).

- [x] **REF-065M — Reconcile the populated iOS Team matches screen pixel by pixel**
  - Compare only `Team / Upcoming matches / iOS 393` with a real populated team in the running iPhone 17 Pro simulator
    and its current Expo source.
  - Apply proven shared corrections at their token or component master, validate the complete screen, and stop before
    REF-065N.
  - Evidence: the obsolete empty-state expectation was replaced by the current populated VOLLEY-BALL PEXINOIS NIORT
    route and its three visible upcoming matches. The canonical screen now uses the real team, pool, opponent, date,
    time, and logo data. Shared Match Date Header, double-line Pool Header, and Upcoming Match Row masters own the
    repeated feed structures; team names and the pool title-metadata block are centered on both axes where the native
    source does so. The obsolete logo-slot placeholder terminology was removed from the Match Row master. Linked
    status, entity header, Pills, Follow Action, Navigation Items, exact pinned icons, and premium Home-active Bottom
    Navigation own the remaining composition. Geometry, typography, images, borders, radii, clipping, missing fonts,
    component properties, and instance lineage pass structural and full-frame review. The complete native stack remains
    running for REF-065N. No runtime source, credential, Android, Web, provider, team data, match data, or production
    behavior changed. Exact nodes and validation are recorded in
    [the REF-065M iOS populated Team matches fidelity record](./ref-065m-ios-populated-team-matches-fidelity.md).

- [x] **REF-065N — Reconcile the iOS Pool ranking screen pixel by pixel**
  - Compare only `Pool / Ranking / iOS 393` with the running iPhone 17 Pro simulator and its current Expo source.
  - Apply proven shared corrections at their token or component master, validate the complete screen, and stop before
    REF-065O.
  - Evidence: the obsolete Normandie sample was replaced by the real populated pool 1755 and its first six current
    ranking teams. Linked status, entity header, Pills, Follow Action, Navigation Items, double-line Pool Header, exact
    pinned icons, and premium Home-active Bottom Navigation own the shell and repeated structures. The shared Ranking
    Row set now follows the source `flex: 1` team zone, transparent standard rank, division-colored points badge, and
    centered rank and point contents. All six linked row instances carry the real team names, logos, statistics, and
    points; fitted font sizes are limited to the long names that iOS shrinks. The card uses the source vertical
    auto-layout, gap, padding, border, radius, clipping, and variable row heights. Geometry, typography, images,
    alignment, missing fonts, component properties, and instance lineage pass structural and full-frame review. The
    complete native stack remains running for REF-065O. No runtime source, credential, Android, Web, provider, pool
    data, ranking data, or production behavior changed. Exact nodes and validation are recorded in
    [the REF-065N iOS Pool ranking fidelity record](./ref-065n-ios-pool-ranking-fidelity.md).

- [x] **REF-065O — Reconcile the iOS finished Match screen pixel by pixel**
  - Compare only `Match / Finished / iOS 393` with the running iPhone 17 Pro simulator and its current Expo source.
  - Apply proven shared corrections at their token or component master, validate the complete screen, and stop before
    REF-065P.
  - Evidence: the canonical frame now reproduces the real finished Évreux versus ASPTT ROUEN MSA VB match 127797 with
    its 3–0 result, set scores, date, time, venue, team logos, division artwork, pool metadata, and available document
    actions. A shared Match Screen Header variant and four categorized Match detail masters own the summary, replay,
    score, and information compositions; every visible card remains a linked instance. Transparent artwork uses the
    native white rounded surfaces, the score and set contents are centered, and the visible ranking continuation
    remains linked to the double-line Pool Header. Exact pinned MaterialCommunityIcons own the native metadata actions,
    while the shared Ionicons forward-chevron master was corrected from the pinned font glyph and remains linked in
    every action Pill. Linked iOS status and premium Home-active Bottom Navigation own the shell. Geometry, typography,
    images, borders, radii, clipping, missing fonts, icon ownership, component properties, and instance lineage pass
    structural and full-frame review. The complete native stack remains running for REF-065P. No runtime source,
    credential, Android, Web, provider, match data, document token, or production behavior changed. Exact nodes and
    validation are recorded in
    [the REF-065O iOS finished Match fidelity record](./ref-065o-ios-finished-match-fidelity.md).

- [ ] **REF-065P — Reconcile the iOS Legal document sheet pixel by pixel**
  - Compare only `Legal / Imprint sheet / iOS 393` with the running iPhone 17 Pro simulator and its current Expo source.
  - Apply proven shared corrections at their token or component master, validate the complete screen, and stop before
    REF-066.

- [ ] **REF-066 — Adopt the tokens and shared UI foundation in Expo**
  - Implement the certified Figma tokens in the existing theme boundary and replace duplicated low-level UI with the
    approved shared primitives. Migrate real consumers as each primitive is introduced; do not add unused component
    skeletons or a code-generation layer for styles.
  - Keep component APIs small and composable, preserve accessibility and interaction behavior, and rename touched files
    according to REF-065. Remove superseded token values and duplicate components only after every consumer is migrated.
  - Validate each shared component against Figma and its previous iOS rendering, then run focused tests, the complete
    mobile static/test baseline, and the relevant Android technical checks without Android visual synchronization.

- [ ] **REF-067 — Align the application shell and entry flows**
  - Apply the certified tokens and components to navigation, session, sign-in, onboarding, app-status, loading, and other
    application-shell states. Preserve Auth0, redirects, tabs, safe areas, keyboard behavior, haptics, and native
    navigation semantics.
  - Compare every migrated state with its Figma frame on iOS. Preserve native safe areas and system presentation, keep
    Android behavior technically validated, and retain focused behavior tests.

- [ ] **REF-068 — Align discovery and competition reading flows**
  - Migrate feed, search, followed content, clubs, teams, pools, matches, rankings, and their loading, empty, error, list,
    card, profile, map, and tab states to the certified design system.
  - Consolidate repeated read-pattern components only where REF-061 and Figma prove the same responsibility. Keep
    feature composition local when data or interaction semantics differ despite a similar appearance.
  - Preserve generated API clients, TanStack Query behavior, list performance, navigation, advertising boundaries, and
    native map behavior while validating each slice against Figma on iOS and keeping Android technically green.

- [ ] **REF-069 — Align account, write, moderation, and support flows**
  - Migrate profile, notifications, entity forms, follow actions, reports, live-link moderation, raw division mapping,
    administration, legal documents, PDF, subscriptions, sheets, validation, toasts, and destructive confirmations.
  - Reuse the certified field, action, feedback, sheet, and pill families without flattening distinct business actions
    into generic prop-heavy components. Preserve Formik/Yup behavior, permissions, provider boundaries, mutation and
    rollback semantics, and accessibility.
  - Validate success, validation, loading, error, disabled, cancellation, and destructive states against Figma on iOS;
    retain the Android technical baseline without a second visual synchronization pass.

- [ ] **REF-070 — Certify and clean the complete mobile design system**
  - Exercise the full screen matrix against the final Figma frames on the representative iOS simulator. Resolve
    unexplained alignment, clipping, safe-area, keyboard, typography, and responsive differences on that visual
    authority while retaining Android build and behavior validation.
  - Remove obsolete styles, tokens, duplicate components, incompatible file names, unused props, temporary comparison
    artifacts, and empty directories. Prove that every remaining shared component has active consumers and one clear
    responsibility.
  - Run mobile formatting, lint, typecheck, Jest, Expo Doctor, and the relevant unsigned native builds. Record unavailable
    physical-device or provider evidence honestly and do not add production bypasses.

- [ ] **REF-071 — Make the search projection cache idempotent**
  - Correct the `search-worker` cache ownership defect that currently passes a cache-owned team list to `upsertTeams`
    and then appends to that same list while iterating it, causing a `ConcurrentModificationException` during club
    reprojection and scheduled index rebuilds.
  - Keep one cached team per identifier, return stable read snapshots, separate cache mutation from dependency
    reprojection, and remove deactivated teams from both the index and the cache. Do not redesign search contracts,
    messaging, Elasticsearch documents, or production scheduling in this task.
  - Prove repeated team upserts, club reprojection, team deactivation, startup cache initialization, scheduled full
    rebuilds, and RabbitMQ failure routing with the real in-memory cache rather than mocks alone. Verify that rebuilds
    complete without duplicates or partially refreshed indexes.

The Java and Python scraper refactors and their local persistence certification are complete.
The mobile behavior and contract-first transport baselines are complete. REF-061 through REF-070 now define the visual
capture, Figma design-system, policy, implementation, and certification path that must finish before public release.
REF-071 records the deferred `search-worker` cache correction discovered while restoring representative local data.
GitFlow, CI, deployment, production changes, repository publication, credential rotation, and license selection remain
deferred.
