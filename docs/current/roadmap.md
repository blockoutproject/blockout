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

- [ ] **REF-048 — Migrate the Match contract**
  - Generate Match requests, responses, enums, and clients from the authoritative `matches-service` model.
  - Preserve score, status, date, team, pool, ingestion, follow, and feed behavior across the competition scraper,
    services, gateway, and search consumers.

- [ ] **REF-049 — Migrate the User contract**
  - Generate the users-service transport boundary while keeping Auth0 identity, guest behavior, preferences, and public
    repository safety unchanged.
  - Remove handwritten User transport copies only after service, gateway, and mobile-facing behavior passes unchanged.

- [ ] **REF-050 — Migrate the Notification contract**
  - Generate notification requests, responses, preferences, and enums while retaining provider implementations behind
    handwritten adapters.
  - Preserve push registration, delivery decisions, read state, and error behavior without activating external sends.

- [ ] **REF-051 — Migrate the Report contract**
  - Generate report transport models and operations while keeping report destinations and external providers isolated.
  - Preserve creation, validation, attachment, status, and gateway behavior without sending production reports.

- [ ] **REF-052 — Migrate the Search contract and worker consumers**
  - Generate the search-service API boundary and replace search-worker transport copies with models derived from the
    same Club, Team, Pool, Competition, and Match schema sources.
  - Preserve indexing, filtering, ranking, reconciliation, and error behavior; do not perform an index cutover or any
    production Elasticsearch operation.

- [ ] **REF-053 — Migrate the mobile gateway contract**
  - Define the authoritative mobile-facing OpenAPI contract and make `mobile-gateway` implement its generated Java
    interfaces and DTOs while keeping aggregation logic handwritten and explicit.
  - Preserve every mobile route and camelCase payload. Reuse internal generated clients without exposing internal DTOs
    directly through the mobile boundary.

- [ ] **REF-054 — Adopt the generated mobile TypeScript client**
  - Generate the mobile client and models with Orval from the gateway contract into
    `apps/frontend/mobile/src/shared/generated/**`, then replace handwritten Axios transport and duplicate mobile DTOs
    feature by feature.
  - Keep TanStack Query ownership, Expo session behavior, error presentation, accessibility, and all existing tests;
    generated source remains application-local and outside Git.

- [ ] **REF-055 — Certify and clean the complete contract-first application**
  - Remove superseded handwritten transport DTOs, internal HTTP clients, obsolete dependencies, and compatibility-only
    names only after every consumer uses the generated boundary.
  - Prove clean deterministic generation, zero tracked generated files, wheel and Java artifact builds, both scraper
    suites, all backend reactors, the gateway, the mobile static/test/Web/native matrix, and a complete local functional
    flow from providers through persistence to the mobile application.
  - Record unavailable signed-device or external-provider evidence without adding authentication, network, storage, or
    production bypasses.

The Java and Python scraper refactors and their local persistence certification are complete.
The mobile behavior baseline and handwritten architecture are complete. REF-038 through REF-055 now define the
sequential contract-first adoption path. GitFlow, CI, deployment, and production changes remain deferred.
