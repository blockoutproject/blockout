---
description: "Implementation tasks for F13 shared quality, operations and delivery"
---

# Tasks: F13 shared quality, operations and delivery

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md) and [quickstart.md](quickstart.md).

**Prerequisites**: Accepted owning artifacts, [constitution](../../.specify/memory/constitution.md) and [agent guidance](../../AGENTS.md). The selected versions and approved design remain the baseline; runtime, provider and native qualifications are outstanding.

**Tests**: The specification explicitly requires qualification in A01–A24, FR-018 and the success criteria. Included automated tests are written first and must exhibit a meaningful failure before their associated implementation. Manual/native/provider cases are prepared before the affected setup and executed only with their actual prerequisites and authorization; inability to execute is not passing evidence.

**Organization**: Native setup and foundational phases precede one phase per specification user story, in priority order. US7 remains US7 and precedes P2 US6. F13 provides common mechanisms and cross-owner qualification; business behavior remains with its owning feature. No application code or provider configuration is executed by the task-generation request itself.

## Format: `[ID] [P?] [Story] Description`

- **[P]** identifies distinct-file work that can run together once its prerequisites are complete.
- **[USn]** retains the owning specification's story identifier.
- Paths describe the future implementation or the existing qualification source to execute. All boxes start unchecked.

## Path Conventions

- Backend: `apps/backend/src/main/java/com/blockout/backend/`, corresponding `src/test/java/`, and `src/main/resources/`.
- Collector: `apps/collector/src/main/java/com/blockout/collector/` and corresponding `src/test/java/`.
- Mobile: `apps/mobile/src/app/` for thin routes, `src/features/` for owners and `src/shared/` only for identical active technical/UI responsibilities; focused tests live in the owning `__tests__/` directory.
- Canonical HTTP roots: `contracts/http/{mobile,ingestion,legacy-mobile}/openapi.yaml`; generated Java stays in owning Maven `target/`, mobile output in ignored `apps/mobile/.generated/`.
- Native delivery/operations configuration: `.github/workflows/`, `infra/dokploy/`, `infra/observability/` and concise actual-operation instructions in `infra/operations/README.md`. These instructions are not a second specification, plan or task catalogue.

F13's data model contains logical responsibilities, not generic tables to scaffold. Its field/lifecycle constraints quoted below remain literal; domain schemas and their full constraints stay with their owners.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize only the three selected applications and their executable development checks.

- [x] T001 Initialize Node 24/npm workspaces and Nx 23.3 in `package.json`, `package-lock.json`, `nx.json` and `.gitignore`; use ordinary Maven/npm targets, ignore generated/build/local-secret outputs, and add no Nx Cloud, platform plugin or empty shared package.
- [x] T002 [P] Create the Java 25/Temurin Maven reactor in `pom.xml`, `.mvn/`, `mvnw`, `apps/backend/pom.xml` and `apps/collector/pom.xml`, with launchers at `apps/backend/src/main/java/com/blockout/backend/BackendApplication.java` and `apps/collector/src/main/java/com/blockout/collector/CollectorApplication.java`; use Spring Boot 4.1.1 dependency management and populated feature packages only.
- [x] T003 [P] Initialize the native Expo SDK 58 / React Native 0.88 / React 19.3.0 application in `apps/mobile/package.json`, `apps/mobile/app.config.ts`, `apps/mobile/tsconfig.json` and `apps/mobile/src/app/_layout.tsx`; use thin Expo Router composition and no web target, mock identity provider or generated business screens.
- [x] T004 Configure PostgreSQL 18.6 infrastructure in `compose.yaml` and safe per-application examples in `apps/backend/.env.example`, `apps/collector/.env.example` and `apps/mobile/.env.example`; document actual environment loading, separate application/migration roles and host-run application development, with no collector database credentials.
- [x] T005 Configure JUnit/Surefire/Failsafe and PostgreSQL Testcontainers in `pom.xml`, `apps/backend/pom.xml` and `apps/collector/pom.xml`, plus Jest Expo/React Native Testing Library in `apps/mobile/jest.config.cjs` and `apps/mobile/package.json`; discover the installed skills' test suffixes, add native npm/Maven formatting/lint/typecheck targets and no additional E2E framework.
- [x] T006 Update `README.md`, `AGENTS.md`, `.github/workflows/ci.yml` and `apps/backend/project.json`, `apps/collector/project.json` and `apps/mobile/project.json` with the commands/paths actually created by T001–T005; run them from a clean checkout while preserving documentation checks, the `verify` gate and develop-only promotion to main. Deliver this with the first executable change; PRs/merges start no deployment or EAS build.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Provide the generated HTTP boundary and native database configuration used by all F13 stories; no domain behavior or external activation belongs to this checkpoint.

**Critical prerequisite**: Complete this bounded foundation before F13 story implementation. This checkpoint does not require completed F13 operations or all consumer features.

- [x] T007 Configure lint-then-bundle of the three existing roots in `contracts/http/project.json` and `.redocly.yaml`, and OpenAPI Generator 7.26.0 in `apps/backend/pom.xml` and `apps/collector/pom.xml`; emit separate backend interface/model packages for mobile, ingestion and legacy-mobile, and the ingestion `restclient` consumer into ignored Maven `target/generated-sources/` directories. Use supported Boot 4/Jackson 3/Bean Validation options and explicit additional-property policies; no custom templates or generated project scaffolds.
- [x] T008 Configure Orval 8.41.0 in `apps/mobile/orval.config.ts` and `apps/mobile/package.json` to generate Query functions/types and Zod schemas from the same mobile bundle into ignored `apps/mobile/.generated/`; select Fetch, runtime validation and `includeZodSchemaInArguments` for the focused mutator. Generate no client for already-distributed V1 binaries.
- [x] T009 [P] Write failing request-binding/error tests in `apps/backend/src/test/java/com/blockout/backend/shared/http/ContractBoundaryWebMvcTest.java` against generated canonical request/response types and test-scoped adapters; cover omitted/null/empty, nested unknown requests, valid additive responses, enum/date validity, multipart, 204, 415, safe Problem Details and applicable no-store/Accept-Patch/Location headers. Do not add production fixture endpoints.
- [x] T010 [P] Exercise generated-client boundary tests in `apps/collector/src/test/java/com/blockout/collector/ingestion/GeneratedClientIntegrationTest.java` using a controlled HTTP server; cover valid nullable/additive responses, native decoding errors, bounded waits and uncertain write failure without automatic business replay. Match the accepted collector enforcement limits in [interface decisions](contracts/README.md#source-composition-and-generated-outputs), without freezing decoder gaps as required behavior.
- [x] T011 [P] Write failing generated-schema/transport tests in `apps/mobile/src/shared/api/__tests__/api-fetch.test.ts`; call a generated mobile consumer and cover validation exactly once, missing required success schema, malformed JSON, invalid known fields, additive responses, safe error profiles, 204/binary handling, cancellation and timeout without mutation replay.
- [x] T012 Implement shared Jackson/Bean Validation and RFC 9457 translation in `apps/backend/src/main/java/com/blockout/backend/config/HttpConfiguration.java` and `apps/backend/src/main/java/com/blockout/backend/shared/http/ApiExceptionHandler.java`; make T009 pass using canonical types/headers, no competing error-code catalogue or handwritten transport mirrors. Domain exceptions/extensions and resource authorization remain with their owners.
- [x] T013 [P] Configure the generated ingestion RestClient at `apps/collector/src/main/java/com/blockout/collector/ingestion/IngestionClientConfiguration.java`; make T010 pass with native bounded transport and generated Jackson decoding, keeping provider acquisition retries separate and adding no response validator, generated-code patches or silent enum fallback.
- [x] T014 [P] Implement the focused generated mutator in `apps/mobile/src/shared/api/api-fetch.ts`; make T011 pass before Query admission, preserve caller cancellation, resolve backend URI references on the configured origin, and never forward credentials/bypass headers to an external origin. Do not turn validation failure or an uncertain write into success or replay.
- [x] T015 Write failing database-startup/role tests in `apps/backend/src/test/java/com/blockout/backend/config/DatabaseConfigurationIntegrationTest.java` with PostgreSQL 18.6 and isolated test fixtures; prove explicit migration execution, application schema validation without initialization, and refusal of schema writes by application credentials.
- [x] T016 Configure `apps/backend/src/main/resources/application.yaml` and `apps/backend/src/main/resources/db/changelog/db.changelog-master.xml` for separate Liquibase XML execution, Hibernate validation and disabled SQL initialization; keep Liquibase outside the application runtime. Domain owners add their actual tables to the mutable initial baseline; freeze it at the first preproduction/production version, then append immutable migrations. Make T015 pass without a synthetic production table, reset or checksum clearing.
- [x] T017 Extend `.github/workflows/ci.yml`, `contracts/http/project.json` and `apps/backend/project.json`, `apps/collector/project.json` and `apps/mobile/project.json` to lint/bundle, generate, compile/typecheck and run T009–T015 through the actual consumers. Qualify clean deterministic regeneration and ignored outputs when introducing or changing a generator or its configuration, following [Contract boundary](quickstart.md#contract-boundary). Qualify required generator shapes before adoption; do not treat schema lint or generated default methods as application behavior.

**Checkpoint**: Generated consumers, shared transport and schema-startup checks pass locally/CI. Feature owners can use the foundation without waiting for monitoring, restoration or cutover completion.

---

## Phase 3: User Story 1 — Consult correct, current authorised data (Priority: P1) 🎯 MVP

**Goal**: Provide the shared validated, bounded read/cache behavior and qualify current sporting views through their owners.

**Scope**: FR-001–005, FR-008; A01–A03; SC-001–002.

**Independent Test**: With controlled responses, a failed refresh retains authorized data and never becomes an empty success or reconnect replay; with the implemented owners, a correction and restriction govern consulted/refreshed views, and supplier failure preserves accepted sporting truth.

### Tests and qualification cases for User Story 1

- [x] T018 [P] [US1] Write failing Query behavior tests in `apps/mobile/src/shared/query/__tests__/query-client.test.ts` for offline read/write attempts, reconnect/focus, failed refresh with retained data and explicit retry; exercise native Query behavior with validated fixtures rather than assertions on configuration spelling.
- [x] T019 [P] [US1] Prepare the bounded A02/A03 integrated cases in `specs/003-shared-quality/quickstart.md#data-and-schema`, referencing the F01/F02/F03/F04 owning scenarios and actual test entry points when available. Preserve the data-model constraints verbatim: “Backend alone commits; preserve current accepted state against old work.” and “Supplier unavailability/unreadable material is not absence.”

### Implementation and qualification for User Story 1

- [x] T020 [US1] Configure native Query defaults in `apps/mobile/src/shared/query/query-client.ts` and compose the provider in `apps/mobile/src/app/_layout.tsx`; make T018 pass with `networkMode: 'always'`, retries and implicit focus/reconnection refresh off, no persistent business cache, and feature-owned approved refresh/expiry policies.
- [x] T021 [US1] Qualify A01–A03 through the implemented F01/F02/F03/F04 paths using `specs/003-shared-quality/quickstart.md#data-and-schema` and the owning automated suites; verify correction/visibility before projection catch-up and retained data after supplier failure. Record actual outcomes in the delivery evidence; domain owners fix their semantics, and no load/latency/propagation benchmark is added.

**Checkpoint**: US1 is complete only when its independent test has actual evidence. Unavailable owner/runtime/provider inputs leave the affected tasks pending; continue unrelated ready work using the dependencies below.

---

## Phase 4: User Story 2 — Understand incidents and intervene without mandatory on-call duty (Priority: P1)

**Goal**: Expose meaningful private diagnostics and native external alerts that support ordinary manual investigation.

**Scope**: FR-006–014; A04–A07; SC-003–004.

**Independent Test**: On an authorized isolated deployment, lose API/database/host access and exercise partial, paused, missing and failed domain observations; verify bounded native health, grouped private alerts and distinct alert closure/business recovery.

### Tests and qualification cases for User Story 2

- [x] T022 [P] [US2] Write failing native health/security tests in `apps/backend/src/test/java/com/blockout/backend/config/HealthEndpointIntegrationTest.java` and `apps/backend/src/test/java/com/blockout/backend/config/HealthIntegrationTest.java`; cover anonymous main-port `/health`, aggregate-only 200/503, database failure, refusing readiness and unknown status, bounded waiting and denial of other Actuator diagnostics. Prepare the maintenance integration case in [quickstart](quickstart.md#delivery-and-operations) for execution with F12 T021's actual admission filter and the isolated T032 candidate; those integrated proofs remain pending their owning implementations.
- [x] T023 [P] [US2] Write focused telemetry-safety tests in `apps/backend/src/test/java/com/blockout/backend/config/LoggingIntegrationTest.java` and `apps/collector/src/test/java/com/blockout/collector/config/LoggingIntegrationTest.java` using harmless fixtures; reject credentials, payloads and personal context, with only the accepted F05 original-target exception in private logs, never labels/Discord.
- [x] T024 [P] [US2] Write failing event/breadcrumb filtering tests in `apps/mobile/src/shared/observability/__tests__/sentry.test.ts` for JavaScript errors, URLs/query strings and messages, and test the supported native capture configuration at its own boundary. The JavaScript filter does not process native reports. Preserve useful safe failure context with replay/tracing/profiling disabled, without console payload dumps; actual native emitted-data privacy is qualified by T033 before activation.
- [x] T025 [P] [US2] Prepare actual host-loss, no-data, partial-stage and native firing/group/reminder/resolution cases in `specs/003-shared-quality/quickstart.md#delivery-and-operations`; identify harmless fixtures and expected evidence before enabling external monitoring, without a recurring benchmark or incident ledger.

### Implementation and qualification for User Story 2

- [x] T026 [US2] Configure Spring Boot Actuator's native readiness group in `apps/backend/src/main/resources/application.yaml` and `apps/backend/src/main/java/com/blockout/backend/config/SecurityConfiguration.java`: include `readinessState,db`, `additional-path=server:/health`, hidden details/components, membership validation, order `down,out-of-service,unknown,up` and explicit 503 mappings for all non-UP states. Make T022 pass; add no controller, custom indicator or generated health client.
- [x] T027 [US2] Configure native structured SLF4J output and ordinary HTTP/JVM/pool metrics in `apps/backend/src/main/resources/application.yaml` and `apps/collector/src/main/resources/application.yaml`, making T023 pass. Domain owners emit stage/scope/outcome/last-success/partial counts at the meaningful boundary; preserve “Never-run, awaiting eligibility and paused are not successful executions.” No shared incident table or logging facade.
- [x] T028 [US2] Configure ordinary Docker logs/metrics collection in `infra/observability/config.alloy` and `infra/observability/compose.yaml`; use native Grafana Cloud integration, private credentials and bounded metric labels. Document environment separation and manual setup in `infra/observability/README.md`; preserve “Logs retain 14 days.” and verify the current Free allowances before authorized activation.
- [x] T029 [US2] Record and, when authorized, apply native Grafana external checks/alert rules/contact-point settings in `infra/observability/README.md`: one European probe per environment, production every minute and preproduction every five minutes, F01-owned thresholds, no-data not healthy, meaningful grouping, five-day reminders and native private Discord firing/resolution. Exclude backup alerts and personal references; native closure never asserts business repair.
- [x] T030 [US2] Configure Sentry Free in `apps/mobile/src/shared/observability/sentry.ts`, `apps/mobile/app.config.ts` and `apps/mobile/src/app/_layout.tsx`, with source-map support and T024 filtering. Limit the configured capture surface to JS errors/native crashes, keeping secrets outside the repository. Complete the local configuration/filtering boundary here; operational sending remains disabled until T033 demonstrates FR-013 privacy and symbolication. Separately authorized T033 runs use harmless isolated fixtures to obtain that evidence; they do not authorize general activation. A JavaScript filter or server-side scrubbing alone cannot satisfy the native-data exclusions.
- [x] T031 [US2] Write concise investigation/intervention guidance in `infra/observability/README.md` referencing current owner observations and F05's private cleanup procedure; distinguish detection, alert, intervention and observed recovery. Preserve the accepted unlogged post-commit crash gap and no guaranteed response time; do not build an exhaustive failure catalogue.
- [ ] T032 [US2] Run the prepared external-probe and native alert cases from T025 against the authorized isolated server candidate; record observed grouping/reminder configuration, host-loss/no-data behavior and domain evidence using `specs/003-shared-quality/quickstart.md#delivery-and-operations`. A healthy Alloy process or resolved alert alone does not pass the proof.
- [ ] T033 [US2] Qualify a harmless symbolicated JS error and native crash on both platform builds through `specs/003-shared-quality/quickstart.md#delivery-and-operations`; inspect actual emitted fields and source maps, retain only safe evidence, and leave unavailable device/provider results explicitly pending.

**Checkpoint**: US2 is complete only when its independent test has actual evidence. Unavailable owner/runtime/provider inputs leave the affected tasks pending; continue unrelated ready work using the dependencies below.

---

## Phase 5: User Story 3 — Preserve rights and action effects (Priority: P1)

**Goal**: Provide shared token/transport controls and qualify owner-defined authorization and session isolation without creating a second identity or entitlement owner.

**Scope**: FR-015–019; A08–A10; SC-005.

**Independent Test**: Reject visitor, invalid-token, wrong-client/scope and wrong-owner calls without prohibited effects, within F05's accepted token-validity/account-return limits; delay an A response across A → B and A → guest → A, fail logout, and lose a mutation response without replay.

### Tests and qualification cases for User Story 3

- [x] T034 [P] [US3] Write failing JWT/security tests in `apps/backend/src/test/java/com/blockout/backend/config/SecurityWebMvcTest.java` for signature, issuer, environment audience, expiry, client and scope; verify 401 with Bearer challenge versus authenticated 403 and denied effects, using controlled principals and generated-interface test adapters.
- [x] T035 [P] [US3] Write failing standard OAuth-client tests in `apps/collector/src/test/java/com/blockout/collector/ingestion/IngestionAuthenticationIntegrationTest.java`; prove environment-specific M2M audience/scopes, in-memory reuse up to actual expiry, bounded renewal failure and no business-write replay.
- [x] T036 Exercise actual native identity/private-cache separation in `apps/mobile/src/shared/query/__tests__/session-isolation.test.tsx`: A/B own different React clients, a detached mutation retains only its old client, public startup survives, and the credential handoff rejects another principal. Keep no persistent business cache or queued write; same-account stale completion needs no epoch guarantee.
- [ ] T037 [P] [US3] Prepare owner-integrated refusal/uncertainty scenarios in `specs/003-shared-quality/quickstart.md#authorization-and-session`; use the exact F05/F09/F12 tolerances and domain outcomes, including F10's allowed explicit resend/manual duplicate handling. Preserve “JWT claims do not replace owner checks.”

### Implementation and qualification for User Story 3

- [x] T038 [US3] Configure ordinary Spring Security JWT validation in `apps/backend/src/main/java/com/blockout/backend/config/SecurityConfiguration.java` and `apps/backend/src/main/java/com/blockout/backend/config/SecurityProperties.java`, making T034 pass. Keep current account/resource/grant checks with F05/F12/domain use cases; preserve public health and legal exceptions without a broad administrative-path bypass or global revocation claim.
- [x] T039 [US3] Configure standard Spring OAuth client machinery in `apps/collector/src/main/java/com/blockout/collector/ingestion/IngestionAuthenticationConfiguration.java` and `apps/collector/.env.example`, making T035 pass with the accepted nominal 24-hour token reuse but actual expiry authoritative; add no shared token database.
- [x] T040 Compose the process public access client above F05's subject-keyed private QueryClient lifetime in `apps/mobile/src/app/_layout.tsx` and its identity provider. Use native generated keys, standard read recovery, non-retrying immediate mutations and the original-principal credential handoff. Remove generation prefixes, subscribe/bindSessionQueries and transport result epochs. F14 initialization and actual global SDK ordering remain with their owning features.
- [ ] T041 [US3] Run T037 with implemented F05/F09/F12 and the affected domain use cases via `specs/003-shared-quality/quickstart.md#authorization-and-session`; verify current authorization, no effects on refusal, original-account targeting and bounded uncertain outcomes. Preserve the data-model rule “Provider SDK remains authority with its accepted cache/refresh rules; no second PostgreSQL entitlement projection or new tolerance.” Preserve “No email-based merge.”; F05's provider identity and F12's current grants remain the business authorities.
- [ ] T042 [US3] Qualify actual environment-specific native sign-in/renewal/logout and delayed callbacks on both phones using `specs/005-accounts-identity/quickstart.md#authentication-and-isolation` and F13's authorization scenarios; include F12 cold-start admission and F14 initialization, record actual build/device evidence, and authorize destructive provider cases separately.

**Checkpoint**: US3 is complete only when its independent test has actual evidence. Unavailable owner/runtime/provider inputs leave the affected tasks pending; continue unrelated ready work using the dependencies below.

---

## Phase 6: User Story 4 — Recover complete state after interrupted processing (Priority: P1)

**Goal**: Qualify ordinary owner recovery and provide usable instructions without adding a recovery subsystem.

**Scope**: FR-019–021; A11–A13; SC-005.

**Independent Test**: Interrupt acceptance/projection work, keep accepted partial success, retry through the existing owner mechanism and verify current restrictions, stable identity and complete replacement.

### Tests and qualification cases for User Story 4

- [x] T043 [US4] Prepare A11–A13 cross-owner interruption cases in `specs/003-shared-quality/quickstart.md#data-and-schema`, referencing F01/F02 ordinary passes, F04 projection replacement and F07 announcement facts. Use controlled stale/partial inputs; preserve “Previous usable results survive incomplete rebuilds, but current restrictions always apply.”

### Implementation and qualification for User Story 4

- [x] T044 [US4] Document actual authorized rerun/rebuild and uncertainty checks in `infra/operations/README.md`, referring to owner entry points and latest-useful outcomes; distinguish acquisition, integration and projection, keep accepted partial results, and add no checkpoints, retry ledger or new job/lock service.
- [x] T045 [US4] Execute T043 through the implemented F01/F02/F04/F07 paths and their owning tests, as identified in `specs/003-shared-quality/quickstart.md#data-and-schema`; verify stale observations cannot restore restricted data, incomplete generations never replace usable search, and ordinary rebuild does not recreate consumed announcements. Record F07's accepted restoration-duplicate limit.

**Checkpoint**: US4 is complete only when its independent test has actual evidence. Unavailable owner/runtime/provider inputs leave the affected tasks pending; continue unrelated ready work using the dependencies below.

---

## Phase 7: User Story 5 — Restore retained data and files (Priority: P1)

**Goal**: Package and qualify manual delivery, independent native backups and the initial isolated restore, with current rights reconciled before reopening.

**Scope**: FR-022–028; A14–A18; SC-006.

**Independent Test**: A controlled failed migration blocks restart without data loss; an authorized initial restore recovers expected database/image associations and exposes gaps, and an incompatible older image is refused.

### Tests and qualification cases for User Story 5

- [x] T046 [P] [US5] Prepare failed-migration, serialized delivery and compatible/incompatible rollback cases in `specs/003-shared-quality/quickstart.md#delivery-and-operations`, using a harmless disposable migration fixture and exact candidate revisions/digests; no real environment is reset.
- [ ] T047 [P] [US5] Prepare dummy-credential cases for the known command/error/log redaction paths in `infra/dokploy/README.md` before selecting a corrected Dokploy release; define safe expected observations and authorization for an isolated check. The inspected 0.30.8 is not proof of a fix, and real V2 S3 credentials must remain unused until qualification succeeds.
- [x] T048 [US5] Prepare the initial isolated restore cases in `specs/003-shared-quality/quickstart.md#initial-restore-and-activation-condition`: database roles, F02 corrections, F05 accounts, F06 follows, F12 grants/settings, image bytes/associations, F04 rebuild and current F05/F09/F11/F07 obligations. Keep F10 GitHub attachments outside the PostgreSQL proof and leave unavailable evidence pending.

### Implementation and qualification for User Story 5

- [x] T049 [US5] Add source-built non-root application images in `apps/backend/Dockerfile`, `apps/collector/Dockerfile` and the dedicated `apps/backend/Dockerfile.migration`, with an appropriate root `.dockerignore`; include reproducible generation and locked Maven inputs, required runtime files and shutdown behavior, with no secrets or dependency on developer-built artifacts.
- [x] T050 [US5] Configure `infra/dokploy/compose.yaml` and safe `infra/dokploy/.env.example` for separate environments and exact image digests; PostgreSQL stays outside the release application. Configure native health checks, explicit writer services and one-off migration execution; collector has no database credentials, and the backend cannot modify schema.
- [x] T051 [US5] Create manual-only server/mobile/both preparation in `.github/workflows/prepare-release.yml` and `apps/mobile/eas.json`; require an exact source revision, publish backend/collector/migration images to GHCR, retain native digests/build IDs and qualify preproduction. Use the separate “Blockout Preprod” variant and production-identity store builds, with F14 owning existing identifiers/signing continuity and no OTA.
- [x] T052 [US5] Create manual production promotion in `.github/workflows/promote-release.yml` and `infra/dokploy/README.md`; after authorized develop-to-main promotion, compare source content with the qualified candidate and require production-environment approval. Promote identical digests/build IDs, serialize deployment without cancelling migrations, and document the literal pull → stop writers → migrate → start/wait command and manual F12 maintenance prerequisites.
- [ ] T053 [US5] Build/smoke the images and execute T046 in isolated preproduction using `infra/dokploy/compose.yaml` and `specs/003-shared-quality/quickstart.md#delivery-and-operations`; prove migration failure blocks restart, roles/volumes remain intact, no automatic rollback occurs, and compatibility is checked before an older image is used. Real deployments need their environment authorization.
- [ ] T054 [US5] Select and verify a corrected Dokploy release with T047's dummy-credential cases in an authorized isolated environment; record safe version/results in `infra/dokploy/README.md`. A missing or failed masking proof directly blocks T055 and its dependent restoration proof, not local code or other independent qualification; introduce no fork, custom sanitizer or notification-only workaround.
- [ ] T055 [US5] After T054 succeeds and activation is authorized, configure native per-environment Dokploy PostgreSQL backups and private external S3 in `infra/dokploy/README.md`: every 30 minutes, SSE-S3, scoped access and 30-day lifecycle, with count cleanup disabled. Preserve “S3 expires copies using the 30-day rule; no exact deletion-at-720-hours guarantee.” Add no backup alerts, dashboard, verification schedule, versioning or replication.
- [x] T056 [US5] Write the concise manual restore/rollback procedure in `infra/operations/README.md`; restore native logical dumps, recreate intended database ownership/ACLs, recover separately owned provider/deployment configuration and apply current rights/erasure/expiry before access or sends reopen. Preserve “Presence does not mean validated restoration.” and F10's provider-only recovery boundary.
- [ ] T057 [US5] Perform the one initial isolated restoration from T048 after native backups, representative owner data/images and permissions are available, following `specs/003-shared-quality/quickstart.md#initial-restore-and-activation-condition`; make original storage unavailable to the check, compare recovered bytes/associations, rebuild derivatives and record actual scope, gaps and duration privately in appropriate delivery evidence. No recurring drill or loss/time guarantee.
- [ ] T058 [US5] Qualify the actual production mobile binary in the store test circuits using `apps/mobile/eas.json` and `specs/003-shared-quality/quickstart.md#delivery-and-operations`; verify compatibility with admitted earlier clients and preserve the exact build for later explicitly authorized release. Coordinate actual downloadable availability and retirement with F14; preproduction builds do not replace this proof.

**Checkpoint**: US5 is complete only when its independent test has actual evidence. Unavailable owner/runtime/provider inputs leave the affected tasks pending; continue unrelated ready work using the dependencies below.

---

## Phase 8: User Story 7 — Preserve logo associations during transition (Priority: P1)

**Goal**: Provide F13's protection/verification handoff to F14 without duplicating transition export or import work.

**Scope**: FR-024, FR-032; A22; SC-008.

**Independent Test**: For a controlled set with a certain identity, ambiguous association and missing file, retain explicit outcomes and actual bytes; no ambiguous association is applied and missing bytes cannot authorize a reset.

### Tests and qualification cases for User Story 7

- [x] T059 [US7] Prepare the controlled A22 cases in `specs/003-shared-quality/quickstart.md#initial-restore-and-activation-condition`, linking the F02 image/identity rules and F14 protected-logo procedure; preserve “Missing bytes do not authorize reset.” and “No identity by name-only matching.” An old URL alone is not retained bytes; “This manual scope concerns club logos only; F14 decides concrete transition records and procedures, with F02 identity rules.”

### Implementation and qualification for User Story 7

- [x] T060 [US7] Add the protection handoff in `infra/operations/README.md` referencing F14's existing preservation/reassociation steps: independently retained bytes and exact source associations, certain matches, private unmatched cases and missing-file refusal. Do not create a second exporter, migration store or general customization transfer.
- [x] T061 [US7] Verify the controlled A22 outcomes using `specs/014-v1-v2-transition/quickstart.md` and the implemented F02 image paths; record F13's observed retention/restore scope in the authorized private delivery evidence. F14 still owns live preservation and cutover authorization; synthetic evidence cannot certify production retention or authorize a reset.

**Checkpoint**: US7 is complete only when its independent test has actual evidence. Unavailable owner/runtime/provider inputs leave the affected tasks pending; continue unrelated ready work using the dependencies below.

---

## Phase 9: User Story 6 — Use the application with the phone’s capabilities (Priority: P2)

**Goal**: Provide the Figma-derived native UI foundation and qualify faithful, system-themed, French and accessible states across its real consumers.

**Scope**: FR-008, FR-029–031, FR-033–035; A19–A21, A23–A24; SC-007, SC-009.

**Independent Test**: Compare exact approved references on both native platforms, change system appearance during use and exercise accessibility, image permissions and failed requests; preserve the current input/navigation and truthful owner states.

### Tests and qualification cases for User Story 6

- [x] T062 [P] [US6] Write failing behavioral tests in `apps/mobile/src/shared/components/__tests__/image-field.test.tsx` for native selection/cancel/denial, preview, replacement/removal, single/multiple inputs, errors and caller-owned labels/meaning; preserve “PNG/JPEG, at most 5 MiB under accepted upload rules.” without imposing profile cropping on sporting/support consumers.
- [x] T063 [P] [US6] Write failing semantic interaction tests in `apps/mobile/src/shared/components/__tests__/request-feedback.test.tsx` for the actually reused loading/error/retry composition, French safe messages and accessible names/roles/states; retain feature-owned empty/retained/refused/uncertain behavior instead of creating a generic screen-state engine.
- [x] T064 [P] [US6] Write failing appearance behavior tests in `apps/mobile/src/shared/theme/__tests__/theme-provider.test.tsx`: initial light/dark, native scheme changes with a mounted form/sheet, absent-scheme fallback and preserved input/navigation. Exercise independent sporting/motion inputs and caller-supplied Pro presentation changes without importing F09 internals or duplicating its session logic; no theme preference is stored.
- [x] T065 [P] [US6] Reconcile the initial shared-control interaction tests in `apps/mobile/src/shared/components/__tests__/button.test.tsx`, `icon-button.test.tsx`, `text-field.test.tsx` and `sheet.test.tsx` with the approved presentation change: names/roles/states, disabled/busy activation, input/error semantics, short-sheet action/close intent and caller-owned state. Observe meaningful failing cases before the affected implementation. Keep useful button/field/theme cases; test ordinary form and confirmation behavior at their actual owner rather than adding an artificial shared wrapper or snapshot-only coverage. Native geometry, focus, keyboard and system-dialog behavior remain T066/T069 device evidence.
- [x] T066 [P] [US6] Prepare A19–A21/A23–A24 cases in `specs/003-shared-quality/quickstart.md#native-mobile-and-approved-design`, selecting exact UI Library and owning Product Design references for controls, short sheets, ordinary forms and native confirmations. Include library publication/instance synchronization, live system-theme changes, both themes, narrow width, enlarged text, VoiceOver/TalkBack, reduced motion, keyboard/back/safe areas, image denial and current-account Pro accent removal. This task prepares cases, not their execution or design approval; browser/Jest checks remain distinct from device evidence.

### Implementation and qualification for User Story 6

- [x] T067 [US6] Project approved Figma variables/aliases/modes and text styles into `apps/mobile/src/shared/theme/tokens.ts`, with private primitives, a limited semantic API and concise source references; bundle the required Outfit faces in `apps/mobile/assets/fonts/` through `apps/mobile/app.config.ts` and the compatible Expo font dependency in `apps/mobile/package.json`. Preserve source dimensions, spacing, type and effects; keep platform/motion/context/membership axes distinct and F02/F09 ownership under `plan.md#tokens-and-appearance`. Do not derive values from screenshots, create a token generator or initialize a separate UI package.
- [x] T068 [US6] After T067, implement the sole system-theme owner in `apps/mobile/src/shared/theme/theme-provider.tsx`, composed in `apps/mobile/src/app/_layout.tsx`; configure automatic native appearance in `apps/mobile/app.config.ts` and the compatible `expo-system-ui` dependency in `apps/mobile/package.json`. Make T064 pass through native `useColorScheme`, preserving mounted state on changes/foreground return, with no selector, persistent preference or duplicated feature resolution.
- [x] T069 [US6] After T068, implement and qualify the first reusable controls in `apps/mobile/src/shared/components/button.tsx`, `icon-button.tsx`, `text-field.tsx` and `sheet.tsx`, making the revised T065 pass. Sheet content remains short and uses the documented native route without keyboard forms, custom sizing, providers or gesture/focus repair. Exercise ordinary form routes and direct `Alert.alert` confirmation through temporary development examples, without creating a speculative `FormScreen`/dialog abstraction or implementing future business owners. Use tokens, `StyleSheet.create`, explicit limited props and consistent composition; verify Outfit and T066’s exact design/native cases. Remove temporary production-route mounts before delivery. Complete this task when its required outcomes pass on the declared FR-029 minimum/latest runtime matrix, using the documented compatible simulator substitution if needed. The scoped live Dynamic Type limitation follows T077 independently and does not block this task or its consumers; preserve its failed observation. T070–T073 keep their separate scope.
- [x] T070 [US6] After T069, implement the shared native image field in `apps/mobile/src/shared/components/image-field.tsx`, making T062 pass with the approved tokens/controls, ordinary Expo selection/preparation boundaries and explicit caller props. Owners keep multiplicity, validation, profile square preparation, logo automatic-restoration meaning and support-file handling; URL-only media stays URL-only.
- [x] T071 [US6] After T069, implement reused request feedback in `apps/mobile/src/shared/components/request-feedback.tsx`, making T063 pass with current tokens/controls and approved French content. Preserve feature-owned outcome/retry decisions, focus/reading order and at least 44 logical-point targets; add no generic screen-state engine.
- [ ] T072 [US6] Qualify the one image field through implemented F05 profile, F02 sporting and F10 support forms using their owning quickstarts and `specs/003-shared-quality/quickstart.md#native-mobile-and-approved-design`; verify distinct constraints, failed preparation and current-session invalidation without copying owner upload/persistence work. Preserve “Owner validates permission and association; bytes and relationship commit together.” for applicable PostgreSQL images and the F10 storage exception.
- [ ] T073 [US6] Run T066 incrementally on actual iOS/Android builds using `specs/003-shared-quality/quickstart.md#native-mobile-and-approved-design`: compare each implemented shared control and owner pattern/screen with its exact Figma variant, qualify live appearance/accessibility and extend F09's existing session tests for accent invalidation. Verify F12 gates/retry/store handoff, readable essential content and honest offline states with the implemented owners. Review comparable component structure, narrow APIs and actual token/composition reuse. Record SDK/dependency versions, final Android floor, qualified devices and justified native adaptations; material design changes retain the existing approval gate. Leave unavailable consumers/proofs pending and block only affected adoption on failed native compatibility.

- [ ] T077 [US6] Requalify live iOS system text enlargement when a supported Expo/React Native correction is available, using `specs/003-shared-quality/quickstart.md#native-presentation-qualification`. Repeat the reproduced live size-change, keyboard-dismissal and later-layout sequence and compare cold launch at enlarged text. Record the actual compatible versions and result; add no remount, manual font/layout calculation or dependency patch. This follow-up is not a prerequisite for T069, T070 or T071.

**Checkpoint**: US6 is complete only when its independent test has actual evidence. Unavailable owner/runtime/provider inputs leave the affected tasks pending; continue unrelated ready work using the dependencies below.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Reconcile the implemented foundation and its actual evidence without claiming blocked external qualifications complete.

- [ ] T074 Update `README.md`, `AGENTS.md`, `specs/003-shared-quality/quickstart.md`, `infra/operations/README.md` and `infra/observability/README.md` to the actual commands, owner links and applicable operating state; preserve native artifact responsibilities and keep runtime results in the delivery/test tools rather than a second task or architecture catalogue.
- [ ] T075 Run the actual repository formatting/lint/typecheck, Maven/mobile/contract checks and `git diff --check` from `README.md`; verify generated outputs/secrets stay ignored and touched handwritten code follows its documentation/language/testing skills. Run broader integration only where changed boundaries require it, retaining unavailable native/provider evidence explicitly.
- [ ] T076 Review remaining qualification prerequisites against `specs/003-shared-quality/quickstart.md`, `specs/014-v1-v2-transition/quickstart.md` and the owning delivery records; leave incomplete tasks unchecked, confirm no speculative recovery/performance/availability/backup-monitoring work was introduced, and present the bounded F13 result for review without authorizing production/store operations.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup**: T001 first; T002 and T003 can run together. T004–T006 use those application paths. T006 accompanies the first executable delivery, not a later documentation-only cleanup.
- **Foundational**: T007–T008 establish generated inputs. T009–T011 can be written together before T012–T014; T013/T014 can run together after their respective tests. T015 precedes T016. T017 verifies the complete foundation.
- **User stories**: All use T017. Their ready work follows specification priority, while the concrete dependencies below allow independent increments. Completion of all F13 stories is not a prerequisite for domain implementation.
- **Polish**: T074–T076 reconcile the delivered scope and its remaining evidence. They cannot mark an unexecuted qualification complete.

### User Story Dependencies

| Story | Shared work available early                                                                                                            | Actual prerequisites for the remaining proof                                                                                                                                                                                                                                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1   | T018–T020 establish Query behavior; T019 prepares owner integration cases.                                                             | T021 needs implemented F01 stage outcomes, F02 writes/visibility, F03 reads and F04 projection. A configured cache alone does not complete US1.                                                                                                                                                                                                                     |
| US2   | T022–T031 establish health, safe telemetry, native configuration and operating instructions.                                           | T026 precedes T038 because they share security wiring. T032 uses the isolated server candidate from T049–T053, authorized Grafana/Discord settings and the relevant owner diagnostics. T033 needs actual platform builds and authorized Sentry configuration.                                                                                                       |
| US3   | T034–T039 establish shared token controls; T036 can use controlled session inputs.                                                     | T040 needs F05's native SDK/session owner and F14's early credential initialization, not final cutover. T041/T042 need implemented F05/F09/F12 and the affected protected domain operations.                                                                                                                                                                        |
| US4   | T043/T044 prepare bounded recovery cases and ordinary operation instructions.                                                          | T045 needs implemented F01/F02/F04/F07 recovery/announcement boundaries; it adds no competing recovery implementation.                                                                                                                                                                                                                                              |
| US5   | T046–T053 provide cases, images and manual delivery; T048 prepares restoration.                                                        | T053 needs an authorized isolated environment and F12 operator access where maintenance is exercised. T054's verified masking fix gates T055 only. T057 needs T055/T056, representative F02/F05/F12 data/images and F04/F07/current-rights reconciliation. T058 uses the actual production-identity build and authorized store test access; F14 owns public launch. |
| US7   | T059/T060 define the protection handoff without performing an export.                                                                  | T061 needs F02's implemented image rules and F14's controlled preservation/reassociation path. Live retention/reset/cutover stay with F14.                                                                                                                                                                                                                          |
| US6   | T062–T066 prepare tests/cases; T067 tokens/fonts → T068 appearance → T069 initial controls. T070 image field and T071 feedback follow. | Owning patterns/screens wait only for their actual UI and business inputs. T072 needs T070/T071 plus F05/F02/F10 forms. T073 starts with available controls, then needs actual F09/F12 and owner journeys/platform builds for complete proof; it is not a prerequisite for creating those consumers.                                                                |

The owners' accepted plans are already available. Refer to their current native tasks when produced; no future task ID is invented here. Implement each owning responsibility once:

- [F01](../001-source-acquisition/plan.md) / [F02](../002-sporting-data/plan.md): collection, sporting writes, persistence/images and current restrictions.
- [F03](../007-sporting-consultation/plan.md) / [F04](../008-search-discovery/plan.md) / [F06](../009-following-personal-feed/plan.md): consultation, projection, follows and their refresh/visibility rules.
- [F05](../005-accounts-identity/plan.md): Auth0 SDK/account lifecycle and the native identity/private-client lifetime; [F09](../006-pro-subscriptions/plan.md): native entitlements.
- [F07](../011-notifications-delivery/plan.md) / [F08](../010-live-contributions-moderation/plan.md): announcement, expiry, delivery and moderation limits.
- [F10](../012-reports-feature-suggestions/plan.md) / [F11](../004-advertising-privacy-legal/plan.md): private support, legal content and privacy/erasure obligations.
- [F12](../013-administration-app-configuration/plan.md): current grants, admission/gate logic and operator preparation.
- [F14](../014-v1-v2-transition/plan.md): pre-Auth0 initialization, continuity, logo protection and release/cutover.

### Dependency Graph

```text
Setup T001–T006 → Foundation T007–T017
Foundation → US1 core T018–T020 → owning features → US1 proof T021
Foundation → US2 configuration T022–T031 → authorized server/native inputs → T032–T033
Foundation → US3 controls T034–T039 → F05/F12/F14 inputs → T040–T042
Foundation → US4 preparation T043–T044 → owner recovery paths → T045
Foundation → US5 packaging/delivery T046–T053
T047 cases → T054 verified masking → T055 backups → T057 restore qualification
T056 restore instructions and F02/F04/F05/F06/F07/F09/F11/F12 inputs → T057
Production build/store inputs → T058
Foundation → US7 handoff T059–T060 → F02/F14 controlled proof → T061
Foundation → US6 tests/cases T062–T066; T067 tokens/fonts → T068 appearance → T069 controls
T069 → T070 image field and T071 feedback → owning patterns → screens with business inputs
Implemented controls + owning forms/journeys/native builds → US6 proofs T072–T073
Delivered increments and explicit remaining limits → T074–T076
```

T056's restore instructions can be prepared before activation; only T057 needs an actual backup. Missing masking evidence blocks T055, not server packaging or other stories. F14 initialization is an early mobile dependency, not a reason to wait for store retirement. F13's local transport/cache/configuration work is usable before cross-feature or external qualifications complete.

### Within Each User Story

Write the included automated tests first, establish meaningful failures, implement the corresponding behavior and rerun them. Prepare manual/native cases before the affected operations; execute them against their actual authorized inputs. Use native library configuration before a focused adapter, and reopen only the owning decision if a required qualification fails.

Serialize edits to shared files: `apps/mobile/src/app/_layout.tsx` (T003/T020/T030/T040/T068), backend `application.yaml` (T016/T026/T027), `SecurityConfiguration.java` (T026/T038), `infra/observability/README.md` (T028/T029/T031), `infra/dokploy/README.md` (T047/T052/T054/T055), `infra/operations/README.md` (T044/T056/T060), `apps/mobile/app.config.ts` and `apps/mobile/package.json` (setup/native dependencies/T067/T068), and the shared quickstart. Story independence does not permit concurrent edits to the same file.

### Parallel Opportunities

Only the marked batches below are independent within their prepared context. Additional concurrency must respect real inputs and shared files; no separate orchestration or staffing workflow is required.

## Parallel Examples by User Story

- **Setup/foundation**: T002 + T003 after T001; T009 + T010 + T011 after generation inputs; T013 + T014 after their tests.
- **US1**: T018 (Query tests) + T019 (owner qualification cases). T020 follows T018; T021 waits for the actual owners.
- **US2**: T022 + T023 + T024 + T025 cover separate test/configuration sources. Keep subsequent shared application/security/layout edits serialized.
- **US3**: T034 + T035 + T036 + T037 cover distinct boundary tests/cases. T040 remains dependent on its native identity/initialization owners.
- **US4**: No independent intra-story batch is claimed: prepare T043, document the corresponding operations in T044, then run T045 when its owners exist. Unrelated ready work in other stories can continue.
- **US5**: T046 (delivery cases) + T047 (masking cases); T048 also edits the quickstart and must be serialized with T046. Lack of masking proof does not delay independent packaging/delivery.
- **US7**: No independent intra-story batch is claimed: T059 → T060 → T061. F14's live operations are not implicitly started by that sequence.
- **US6**: T062 + T063 + T064 + T065 + T066 prepare distinct tests/cases. T067 → T068 → T069 establish the common UI; T070 (image field) and T071 (feedback) may then progress in distinct files. T072/T073 need implemented consumers and native builds; serialize their shared qualification sources.

## Implementation Strategy

### MVP First (User Story 1)

1. Deliver T001–T017 with real executable checks and no domain scaffolding beyond active consumers.
2. Deliver T018–T020 as the first useful shared Query increment.
3. Once the owning sporting implementation exists, execute T021 and validate US1 independently. The earlier shared increment alone is not the full US1 acceptance.
4. Use controlled demonstrations while broader qualifications remain pending. Public V2 release still requires the accepted F14 and owning-feature obligations.

### Incremental Delivery

Deliver common controls and corresponding tests in coherent increments, then integrate the actual owning features and qualify the affected story. US6 may start after T017 without waiting for observability, backups or cutover: shared UI is not an additional Foundational phase blocking all F13 stories. Tokens/fonts/theme precede shared controls; each owner then builds its patterns and screens after the specific UI and business dependencies. Do not require the complete library or all T073 evidence before the first functional screen. Keep manual operations, native-device evidence and activation prerequisites attached to their concrete tasks rather than blocking every unrelated increment. Story priority does not remove lower-priority launch obligations.

### Parallel Team Strategy

When parallel work is explicitly authorized, use the distinct-file batches above. Keep one writer for shared configuration and entry points; complete owner integration before claiming cross-feature proof. No extra issue-per-task rule or global acceptance phase is introduced.

## Notes

- Keep [Spec Kit's installed task/implementation procedures](../../.agents/skills/speckit-tasks/SKILL.md) authoritative. [AGENTS.md](../../AGENTS.md#select-by-task) selects the applicable technical, testing, documentation and delivery skills.
- Preserve native mechanisms and accepted manual/exceptional recovery. FR-001–003 and FR-006–007 are exclusions, not work deferred to performance, capacity or monthly-availability tasks.
- A fake/mocked boundary, formatted document or successful schema check proves only that boundary. Production generation/compilation, native builds, providers, deployment, backup restoration and live logo retention remain unchecked until performed.
- No credentials, real private cleanup references, support attachments or provider payloads belong in public fixtures or reports. Use harmless fixtures and the authorized private delivery tools for sensitive evidence.
- Update native task completion only from actual results. Commit coherent work under the issue-owned delivery policy; this task file authorizes neither a merge nor a production/provider operation by itself.

## Authorized SDK maintenance

- [x] T078 Upgrade `apps/mobile/package.json`, the workspace overrides/lockfile and affected native configuration to Expo SDK 58 with its supported React Native/React and testing dependencies. Remove superseded scene/Kotlin workarounds, adapt strict native types and Router draft-discard handling, and reconcile affected specifications/plans without changing accepted product behavior. Run repository verification, Expo Doctor and regenerated iOS/Android builds; requalify the F12 component on Android API 29/API 37 and iOS 27.1, retaining the separately deferred oldest-iOS proof. Record actual results and remaining limits in the owning quickstarts.

## Authorized frontend state maintenance

- [x] T079 Reconcile frontend state decisions in [research](research.md#frontend-state-ownership) with their actual native owner and lifetime. Remove the session UUID store, retained editor registries, command recovery protocol and monotone admission/read overlays; preserve original-principal dispatch, route-local revision baselines, active personal-content expiry and global SDK ordering.

## Authorized frontend mutation maintenance

- [x] T080 Use generated server reads and resource/selection keys in the current private client, ordinary native Query recovery and explicit native/media exceptions. Replace public projection-edit graphs and transactional zone replacement with owner-local refresh. Keep sensitive-data refusal/expiry and the owning sparse-page/native qualifications explicit.
- [x] T081 Use ordinary useMutation with complete event-owned intent and mutation-option invalidation. Remove generic command/draft recovery stores and effect-triggered writes; retain server revisions/permissions, useful route-local input and submitted-file ownership. A failed acknowledgement permits an explicit retry without an automatic replay or verification protocol.
- [x] T082 Normalize local persistence, native image selection and destination handoffs at their actual owner; audit SDK synchronization, purchase, restoration and advertising exceptions without inventing retries, queues or provider changes. Preserve the accepted ImagePicker limitation in [prepared-image research](research.md#prepared-images-and-request-handles).
- [x] T083 Reconcile the changed visible conventions in the designated prototype and live Figma sources, retaining existing components and the applicable design approval boundary; deliver any linked changes as draft PRs without merging.
- [x] T084 Verify all inventory families through observable transitions, review every modified test against its canonical testing examples, independently search remaining variants, run the actual affected repository checks and native evidence, and deliver the complete application draft PR with accurate evidence limits.

## Repeated interaction consistency (US6; FR-036–FR-037)

- [x] T085 Inventory every delivered mobile route, repeated intent, shared owner and consumer; reconcile the simple conventions in F13 spec/plan and independently identify omitted and non-reloadable cases.
- [x] T086 Implement native pull-to-refresh through existing scroll/list owners and reloadable collection, sporting, account and administration consumers, including empty/error states, with focused regression tests for preserved drafts, read scope and pending operations. The Search gesture delivered in this earlier task is superseded by T113; blocking-error/initial-loading refresh is superseded by T170.
- [x] T087 Align save, cancel, close, back, confirmation, detail, retry and continuation behavior at shared owners and all delivered consumers; cover dirty exits, misleading retries, action feedback and native semantics with meaningful regression tests.
- [x] T088 Independently verify all comparable cases, review changed tests against canonical examples, run affected repository checks and exercise real iOS/Android interaction states; record evidence and unavailable scope in the existing quickstart.
- [x] T089 Reconcile the resulting conventions into the designated Figma library and product screens using live components, then the designated prototype; verify owner/consumer consistency and deliver linked draft PRs per repository without merge. The [qualification](quickstart.md#repeated-interaction-qualification) links the native evidence, Figma publication receipt and companion draft PR.

## Screen-state consistency (US6; FR-038)

- [x] T090 Inventory all delivered routes, screen states, layout/component owners and competing consumers under FR-038; reconcile the shared grammar in `spec.md` and `plan.md`, preserving current domain safeguards and recording unfinished journeys separately.
- [x] T091 Normalize shared feedback and useful-area placement in `apps/mobile/src/shared/components/` and the existing feature shells; remove concurrent error/empty presentations and cover meaningful shared behavior with semantic tests.
- [x] T092 Apply the grammar to every delivered consumer in `apps/mobile/src/features/` and `src/app/`, covering access precedence, initial versus refresh/pagination progress, retained content, empty results, pending actions and domain success/uncertainty; add focused regressions where behavior changes.
- [x] T093 Independently review all changed consumers and handwritten tests, run repository/mobile verification and observe affected actual native screens on iOS/Android, themes and accessibility variants; record observed, failed and unobserved states in the existing quickstart.
- [x] T094 Reconcile the verified components and states into live Figma UI Library/Product Design instances, then the designated prototype, with no intentionally divergent affected representation; deliver linked draft PRs per changed repository and representative runtime evidence without merge. The [qualification](quickstart.md#screen-state-consistency-qualification) links native evidence, the Figma publication receipt, the companion prototype PR and their explicit observation limits.

## Owner clarification: adaptable state cards and internal references

- [x] T095 Reconcile the clarified FR-038/A27 in `spec.md`, `plan.md` and `research.md`, with one adaptable illustrated card, opaque refused reads and event-owned toasts; update the dependent F04 wording and analyze the scoped artifact set.
- [x] T096 Restore the shared `StateCard` anatomy and thin error/empty variants in `apps/mobile/src/shared/components/state-card.tsx`; remove bare request-error and denied-access presentations and migrate every delivered consumer while preserving skeletons, drafts and authorization guards.
- [x] T097 Correct read, media, refresh and submission feedback in `apps/mobile/src/features/`; independently review changed handwritten tests and qualify the actual native card/toast boundaries on iOS/Android, including themes and enlarged content. Record observed and unobserved states in `quickstart.md`.
- [x] T098 Reconcile the shared Figma State Card family and affected Product Design instances after native verification, then the designated prototype; verify initial versus retained-media failures and remove obsolete alternative presentations without changing unrelated designs.
- [x] T099 Deliver the corrected candidates through the existing linked draft PRs without merge; publish representative runtime evidence, verify the final revisions and converge the scoped FR-038/A27 work without claiming unrelated F13 tasks complete.
- [x] T100 Replace GitHub issue references throughout `specs/` with repository-relative references to their owning Spec Kit artifacts under [agent guidance](../../AGENTS.md). Preserve substantive decisions and evidence limits; retain all other references, including technical documentation, Figma, source code, delivery evidence and functional URL data. Verify internal targets and formatting without creating another documentation catalogue.

## Shared native composition (US6; FR-030, FR-034–FR-038)

**Scope**: The [common composition](plan.md#shared-page-composition) unifies every comparable delivered page, form, list, detail, section, modal and selector while preserving the accepted card/toast grammar and domain safeguards. The [qualification](quickstart.md#shared-composition-qualification) owns execution scenarios and evidence limits. Existing unfinished business/provider qualifications remain separate.

- [x] T101 [US6] Reconcile the complete current consumer inventory and minimal grammar in `specs/003-shared-quality/plan.md` and `research.md`, deriving from `spec.md`; inspect actual library ownership and tokens, record concrete exceptions at their owners, and analyze the scoped spec/plan/tasks before code changes. Preserve the merged card/toast corrections and verify current revisions/concurrent work in both authorized repositories.
- [x] T102 [US6] Add or adapt focused behavioral regressions in the affected `apps/mobile/src/shared/components/__tests__/` and feature `__tests__/` suites before the corresponding behavior changes: state/read precedence, retained draft and content, safe retry, pending controls, refresh/pagination failure and meaningful navigation/selection. Reuse the actual Query/RHF owners; do not replace native geometry evidence with style snapshots or tests mirroring JSX structure.
- [x] T103 [US6] Implement the focused `Page`, `PageContent` and `PageScrollView` exports in `apps/mobile/src/shared/components/page.tsx`; align `form-scroll-view.tsx`, `screen-state.tsx` and `shared/theme/tokens.ts` with the minimal common geometry and semantic token contract. Keep `PageHeader` explicit, native refresh/list/keyboard behavior direct, and request/form state outside these pieces. Remove competing shared values and document only necessary platform adaptations.
- [x] T104 [P] [US6] Migrate all collection and sporting-administration consumers under `apps/mobile/src/features/collection/` and `sporting-administration/` to the common pieces, including forms, list pages, details, sections and selectors. Remove `PreparationPage` and `EditorPage` implementations/APIs and compensating styles; preserve source/provider coordination, revision checks, retained RHF drafts and uncertain-command guards.
- [x] T105 [P] [US6] Migrate all sporting consultation and discovery consumers under `apps/mobile/src/features/sporting/` and `discovery/` to the common pieces. Remove the `ResourcePage` shell/API while retaining genuinely sporting content at its owner; preserve native list virtualization, active-scope refresh, cursor ownership, initial/new-search cards, pagination toasts and media authorization behavior.
- [x] T106 [P] [US6] Migrate all remaining comparable consumers under `apps/mobile/src/features/` and development compositions, including account/profile, application configuration, onboarding/age/admission, Pro, sheets and selectors. Reuse the common owners, remove parallel styles/APIs and keep full-width illustrated content, short native sheets and SDK-owned presentation only for their documented actual need.
- [x] T107 [US6] Complete the cross-feature responsibility pass in `apps/mobile/src/shared/` and `features/`: restore direct TanStack Query, RHF, Expo Router and SDK ownership wherever the inventory finds duplicated request/form/navigation state; migrate every affected consumer and remove superseded wrappers, effects, caches or protocols. In the profile form, use RHF reactive values/reset options instead of an effect that mirrors accepted values, preserving dirty intent and owned files. Share the identical metadata/image multipart construction at its existing transport responsibility, and use ordinary rejected promises for discovery failures instead of another result protocol. Decouple shared selector presentation from router actions and unify repeated field-message/media-preview anatomy without hiding domain validation or authorization. Preserve independently justified session, revision, draft and command-safety lifetimes and reconcile their existing inventories in `research.md`.
- [x] T108 [US6] Independently review every changed handwritten source and test against its applicable skills/canonical examples, search for residual old owners/variants and unexplained token differences, and run the affected README/Nx verification plus formatting/link/diff checks. Repair findings in their owning files; reconcile `plan.md`, `research.md` and `quickstart.md` with the verified implementation instead of claiming structural parity from passing tests alone.
- [x] T109 [US6] Exercise the actual application compositions on reused compatible iOS/Android clients with explicit agent-device sessions using `quickstart.md#shared-composition-qualification`: navigation, useful area, both themes, narrow screens, enlarged text, keyboard, scroll/virtualization, read/mutation transitions and preserved drafts. Record captured revisions, actual devices, passed/failed/unobserved states and controlled/provider boundaries without treating simulations as live-provider success.
- [x] T110 [US6] After the application verification, reconcile the affected live components, tokens, instances and screens in the designated Blockout UI Library and Product Design. Verify structural relationships and visual intent, including horizontal/vertical state centering in the remaining useful area after independent context/controls, width containment and reachable overflow; publish/synchronize relevant library changes and record exact nodes/receipt evidence in `quickstart.md`. Remove obsolete duplicate or unreachable state scenes: each retained Error/Empty card, toast and recovery action must correspond to its owning read/action condition and a valid journey trigger. Keep specified future journeys distinct from native qualification; retain no intentionally divergent affected representation.
- [x] T111 [US6] After T110, align all affected owners/consumers and semantic tokens in the designated `blockoutproject/product-prototype` repository, preserving its current merged corrections and concurrent work. Run its applicable checks and representative browser observations, record actual evidence separately from native/provider results, and prepare its linked draft PR without merge.
- [x] T112 [US6] Deliver the necessary linked draft PRs with representative running-revision capture attachments and independent code/test review; update this task status and `quickstart.md` with exact final revisions/results. Verify no former system remains in an affected consumer and run scoped `speckit-converge`, appending and completing any remaining work before reporting this composition pass complete. Do not close unrelated F13 qualifications or merge either PR.
- [x] T113 [US6] Apply the clarified read triggers and terminal-list presentation across the existing owners: remove Search pull-to-refresh without removing safe initial-card retry, native Query retention or pagination retry; remove refresh buttons and “Fin des résultats” messages from affected consumers. Preserve mutation and explicit-refresh failure toasts, retained authorized content/drafts and command-specific uncertainty guards; pagination feedback now follows T143's shared compact footer; do not invent a Search background refresh trigger or toast. Add focused behavior tests, verify the native follow-up on iOS/Android, then reconcile its Figma and prototype states in the authorized application → Figma → prototype order. Record revised evidence and superseded gesture scenarios in `quickstart.md`; T110–T112 cannot complete while this clarification leaves an affected representation divergent.

- [x] T114 [US6] Keep bounded PageContent separate from growing native list content in `shared/components/page.tsx`; preserve virtualized-list growth and remove the Profile footer compensation. Verify the changed owner with the mobile checks and reused iOS/Android clients, then reconcile the Figma/prototype allocation of the useful state area after context/controls. Record current revisions and limits; complete T110–T112 only after this centering follow-up and all affected consumers agree.

**Order**: T101 precedes implementation. T102's relevant regression cases precede each corresponding change. T103 establishes the shared contracts; T104–T106 then run in parallel only with disjoint files. T107's distinct profile-form, multipart, discovery-request and shared-control changes can run alongside T103–T106 when file ownership is assigned explicitly; overlapping consumer edits wait for integration rather than creating a blanket phase barrier. T108–T109 establish code/test and native evidence before T110; T111 follows the verified Figma representation. T113 qualifies the subsequent interaction clarification, and T114 qualifies bounded-content ownership and centering through the same native-first sequence before T110–T112 can complete. T112 requires all affected representations and consumers to agree. Shared files and desktop/device UI operations remain serialized.

## Common backend composition

**Scope**: Preserve US1/US3/US4 and FR-004–FR-005, FR-008, FR-013, FR-015–FR-021 through the [common backend composition](plan.md#common-backend-composition). This maintenance covers implemented code and direct consumers, not unfinished business journeys or provider qualification.

- [x] T115 Reconcile the implemented capability inventory and minimal responsibility grammar in `specs/003-shared-quality/plan.md` and `research.md`; verify current revisions, concurrent work and retained native corrections, then analyze the scoped artifacts before implementation.
- [x] T116 [P] Characterize actual MVC query binding, then unify the five generated query enum types at `apps/backend/src/main/java/com/blockout/backend/shared/http/`; remove redundant feature converter configurations, local formatter and enum reparse, preserving exact contract values, omission/default behavior and safe errors.
- [x] T117 [P] Characterize image policy boundaries, then share ImageIO detection, header-before-raster validation and resource lifetime in `apps/backend/src/main/java/com/blockout/backend/shared/image/`; migrate profile, sporting and support consumers, remove the old validator and preserve their different limits, error classifications, metadata and original-byte policies.
- [x] T118 [P] Move the provider-page observation and page-reading seam to `apps/collector/src/main/java/com/blockout/collector/acquisition/application/`; migrate discovery, qualification, FFVB/LNV adapters and tests, removing the infrastructure-owned response without changing observation provenance or HTTP behavior.
- [x] T119 [P] Restore F02 ownership of visible seasonal selection through `apps/backend/src/main/java/com/blockout/backend/sporting/application/` and the existing `sporting/infrastructure/JpaSportingReadStore.java`, without a separate selection bean; compose `following/infrastructure/JpaFollowReadStore.java` with native scalar Criteria without importing sporting infrastructure. Verify the real PostgreSQL season/default/visibility cases before and after.
- [x] T120 [P] Batch current sporting summary hydration in `apps/backend/src/main/java/com/blockout/backend/sporting/` and migrate `search/application/HydrateSearch.java`; reuse existing single/list consumers where their meaning matches, remove redundant per-candidate reads and avoid image BLOB loading. Verify real PostgreSQL query counts and accepted corrected/hidden/clubless result cases.
- [x] T121 [P] Consolidate read/replacement of one follow relation in `apps/backend/src/main/java/com/blockout/backend/following/application/` only where lock order, collaborators and admission are identical; remove obsolete service/guard APIs and migrate all HTTP/test consumers while retaining the distinct eligibility API and transaction semantics.
- [x] T122 [P] Give search aliases one owner in `apps/backend/src/main/java/com/blockout/backend/search/infrastructure/SearchIndexProperties.java` and share the actual calendar threshold knowledge at `sporting/application/MatchPresentation.java`; migrate query/publication and SQL/presentation consumers without changing native aliases or time boundaries.
- [x] T123 Independently review all changed handwritten code and tests against their applicable skills/canonical examples; run meaningful scoped regressions, full README/CI verification and affected opt-in boundaries, and inspect all comparable consumers for residual duplicate owners. Record passed/failed/unavailable evidence in `specs/003-shared-quality/quickstart.md` and reconcile affected feature plans.
- [x] T124 Deliver the complete backend composition through draft PRs with exact revisions, concise responsibility/simplification evidence and links to owning artifacts; run scoped `speckit-converge` and complete any remaining revised-consumer or indispensable-verification work. Keep unrelated native/provider qualifications open and do not merge.

**Order**: T115 precedes code. Each T116–T122 starts with its meaningful boundary regressions. Parallel work uses explicitly disjoint files: T119/T120 share sporting persistence and run under one owner; T121 overlaps T119's following tests and waits for those edits. T122's calendar part waits for T120's sporting files, while its search alias part is independent. T123/T124 follow integrated implementation and all required evidence.

## Phase 11: Convergence

- [x] T125 Strengthen `apps/backend/src/test/java/com/blockout/backend/search/application/SearchCurrentDataIntegrationTest.java` with distinct seasons, divisions and clubs in the existing one-versus-twenty statement-count regression per the common composition plan's batched-parent guarantee and Constitution V (partial).
- [x] T126 Move mechanical `MatchInput`/schedule mapping from `sporting/infrastructure/JpaConsultationStore.java` into the existing `SportingPersistenceMapper.java`, reusing its classification mapping and retaining public calendar values per Constitution V and the common composition plan (partial).
- [x] T127 Retain the safe technical exception type at the existing `search/infrastructure/OpenSearchEngine.java` failure owner, without payloads or duplicate logs, per FR-013 (partial).
- [x] T128 Return the existing application read value directly from the LNV image reader, remove its redundant record and migrate the reader/test consumers per Constitution V and the F01 application-owned observation decision (partial). The current implementation is `LnvObservationReader.image` under [F01 collector simplification](../001-source-acquisition/tasks.md#phase-12-collector-responsibility-simplification).
- [x] T129 Apply focused Lombok construction/accessor conventions to the touched discovery/support classes and MVC test adapters, and remove the orphan constructor annotation from `ValidateSportingImage.java`, preserving visibility and injection semantics per Constitution V (partial).
- [x] T130 Correct the touched sporting, discovery, contribution-fixture and collector Javadocs to state actual transaction/lock, content-refusal and operational-failure contracts per the common composition plan's preserved boundaries (partial).
- [x] T131 Separate independent following scenarios and explicit test phases, and clarify the touched scenario/helper names across MVC, follow concurrency, search hydration and LNV caching tests per the common composition qualification and Constitution V (partial).

## Phase 12: Native navigation and scroll integration (US6; FR-030, FR-034, FR-036, FR-039)

- [x] T132 Inventory implemented tab/list/header consumers, current Query/Router owners and the accepted trial; record scoped adoption decisions in plan.md and research.md without implementing unfinished Home content.
- [x] T133 [P] Add meaningful navigation, active-scope Query, refresh/retention and individually virtualized calendar regressions at the existing test owners. Keep native geometry evidence separate and doubles limited to their actual boundary.
- [x] T134 Adopt selected runtime dependencies and root GestureHandlerRootView; implement shared paging, measured clipped header, opaque-to-blur backdrop, tab presentation and native refresh-prop forwarding using supported APIs.
- [x] T135 [P] Migrate Team, Pool, Club and SportingCalendar to shared composition and official adapters; preserve tab identities, complete-day/pool/match order, active-only reads, one follow action, season state and first-page refresh. Remove SportingPager and duplicated toolbar/header paths.
- [x] T136 [P] Migrate Search's resource panels while preserving RHF text, per-resource filters, Query context, infinite traversal, visit return and absence of refresh. Inactive/neighbor scenes must not introduce reads or retries.
- [x] T137 [P] Apply accepted bottom motion through Expo Router triggers, shared tokens and native measurements; preserve history, badges, guest destinations, scaling and draft guards. Reuse presentation for existing standalone Home controls without implementing its feed.
- [x] T138 Integrate fixed scrolling chrome at comparable existing header/list owners, keeping bounded forms and unbounded lists distinct and preserving keyboard, safe-area, refresh and feedback behavior. Add no universal page state/format engine.
- [x] T139 Independently review touched code/tests and removed paths; run configured formatting/lint/types/tests/exports/Doctor and report failed or unavailable checks without exclusions or unrelated upgrades.
- [x] T140 Qualify actual compositions on compatible iOS/Android clients with controlled boundaries: gestures, collapse/fixed blur, dates, pagination/refresh, reduced motion, themes, enlarged text, keyboard and Router draft/history safeguards. Record actual build/OS matrix and unsupported floors in quickstart.md.
- [x] T141 Reconcile owning artifacts and qualification, run scoped convergence, and deliver a clean draft PR to develop with representative running-revision captures. Keep unrelated feature/provider qualifications open; no merge.
- [x] T142 Apply the owner-corrected floating bottom capsule with one measured tab-scoped inset and shared trailing native spacers; preserve safe areas, modal coverage, keyboard handling, Router guards and existing padding. Requalify content scrolling behind the bar and final-item reachability on iOS/Android, including enlarged two-row navigation, before final delivery.
- [x] T143 Apply automatic native end-of-list continuation to every existing infinite Query list (Search, Inbox, calendars, source children and collection results), with active/focus/authority/fetch/error guards. Share the pending footer loader and explicit failed-page retry while retaining loaded authorized rows/cursors, preserving full initial-read error cards and native refresh without ordinary refresh buttons. The compact failure message from this completed delivery is superseded by T152’s event-owned toast; remove normal continuation controls and duplicate feedback; apply the same convention to every comparable current and future list. Update meaningful feature regressions and native representative continuation/error evidence without custom scroll/cache recovery.
- [x] T144 Align the existing SDK 58 dependencies through Expo's standard install/fix workflow and npm deduplication; verify reproducible installation and unsuppressed Expo Doctor 20/20. Regenerate and rebuild both native clients after the Gesture Handler version change, run representative paging/collapse/refresh smokes and the configured mobile checks, then reconcile current decisions and version-scoped evidence. Keep the separately tracked live text-size limitation outside this maintenance scope; introduce no dependency patch, override or check exclusion.

**Order**: T132 precedes implementation. T133's relevant regressions precede each corresponding change. T134 establishes presentation APIs; T135–T137 may run with disjoint ownership. T138 follows established boundaries; T142 follows the bottom navigation owner; T143 adopts the clarified list behavior. Their fresh checks precede T141 delivery. T139–T141 qualify the final integrated tree. Device operations remain serialized per device. No task closes unrelated release/provider qualifications.

## Phase 13: Remaining backend responsibility consumers

**Scope**: Apply the existing [common composition](plan.md#common-backend-composition) to the remaining implemented consumers after the [F01 obsolete constructor removal](../001-source-acquisition/research.md#current-state-restart-and-manual-operations). Preserve earlier completed work and unrelated qualification limits.

- [x] T145 Establish the current compatible base and review implemented backend families against `plan.md#common-backend-composition`, owning specifications and preserved removal decisions; record only demonstrated residual responsibilities in `plan.md` and `research.md`.
- [x] T146 [P] Extend scalar match presentation batches in `apps/backend/src/main/java/com/blockout/backend/sporting/` to detail/calendar/inbox consumers; remove the redundant per-match presentation path and unused team/club fetch joins. Protect current names/logos, visibility, complete-day order and repeatable-read semantics with real PostgreSQL tests under `apps/backend/src/test/java/com/blockout/backend/sporting/`.
- [x] T147 [P] Resolve the admitted target once in `apps/backend/src/main/java/com/blockout/backend/collection/application/service/RecordCollectionResults.java`, reuse its attribution, and migrate `CollectionStore`, its JPA adapter/repository and the equivalent parent-calendar fallback in `CollectionCycleAccess.java`. Remove replaced boolean target queries while preserving bounded multi-pool reads, role admission, rollback, fences and initial reconstruction; verify at the existing unit/PostgreSQL owners.
- [x] T148 [P] Align `access/application/ReadAccessConfiguration.java` with `CurrentPermissions.requireForRead`, preserving mutation locks; expose optional current identity from `accounts/api/CurrentAccount.java` and migrate `following/api/FollowingRequest.java` without changing 404/403/503 semantics. Verify HTTP refusal and real persisted grant/locking behavior in the owning tests.
- [x] T149 Independently review every touched handwritten source/test and deletion, run the meaningful focused checks followed by README/CI verification, and reconcile owner plans and `quickstart.md#common-backend-composition` with passed, failed and unavailable evidence.
- [x] T150 Run scoped `speckit-converge` against this composition, complete any identified gaps and deliver the issue-owned branch as a draft PR to `develop`, linked to preceding deliveries, with preserved branch protections and no merge.

**Order**: T145 precedes implementation. T146 (sporting), T147 (collection) and T148 (access/accounts/following) have disjoint write ownership. Regression scenarios precede each relevant removal. T149 follows integrated changes; T150 follows verification and independent review. No task implements unfinished business/provider qualification.

## Phase 14: Native application and representation coherence (US6)

**Scope**: Finish the authorized [shared composition](plan.md#shared-page-composition) and [feedback grammar](spec.md#functional-requirements) in the existing application, then live Figma owners/instances, then the designated prototype. Preserve earlier delivery and unfinished feature/provider qualifications.

- [x] T151 [US6] Establish the current compatible branch/worktree/PR base; reconcile the explicit pagination-toast instruction in `spec.md`, `plan.md`, `research.md` and the dependent `../008-search-discovery/` artifacts without changing managed Spec Kit imports.
- [x] T152 [US6] Protect and migrate `apps/mobile/src/shared/components/list-continuation.tsx` and its discovery, sporting, notifications and collection consumers to event-owned pagination error toasts, retained authorized rows and safe explicit retry; keep Query ownership and automatic-continuation guards.
- [x] T153 [P] [US6] Correct comparable search-heading spacing and useful-area Error/Empty placement in the existing `apps/mobile/src/features/discovery/`, sporting Club and shared sheet/selector compositions; preserve native list, safe-area, keyboard, form/draft and authorization owners. Add meaningful regressions at the touched existing test owners.
- [x] T154 [US6] Independently review changed handwritten code/tests and deletions; run configured mobile verification and repository checks, and qualify actual owner journeys on compatible iOS/Android development clients with themes, compact screens, enlarged text, keyboard and scrolling. Record exact revisions, representative captures and evidence limits in `quickstart.md`.
- [x] T155 [US6] After native stabilization, reconcile live owners/instances, variants, tokens, auto-layout and useful-area states in Blockout UI Library and Blockout Product Design, then migrate affected consumers in product-prototype; preserve documented historical explorations and unfinished feature distinctions.
- [x] T156 [US6] Independently review all three representations, run scoped convergence against `spec.md`, `plan.md` and this task section, complete discovered gaps and deliver linked issue-owned draft PRs with exact-revision evidence and unchanged branch protections; no merge.

**Order**: T151 precedes edits. T152 and T153 use explicitly disjoint file ownership; regression cases precede their behavioral changes. T154 stabilizes the native implementation before T155 writes shared representations. Figma writes are serialized. T156 requires the integrated result; no unrelated feature or qualification task is completed by this pass.

## Phase 15: Convergence

- [x] T157 Align the existing React Native patch in `apps/mobile/package.json` and `package-lock.json` with the installed Expo SDK recommendation, using the standard Expo installation workflow; preserve all unrelated versions and check exclusions. Rebuild both ignored native clients and rerun mobile verification before T154 native evidence, per the plan's supported platform baseline and README verification (partial).

## Phase 16: Convergence

- [x] T158 Reuse the existing standings useful-viewport placement at the shared native paging owner in `apps/mobile/src/shared/components/paged-tabs.tsx` and migrate comparable Club/calendar/tab states. RNCT’s collapse reserve must not enlarge the area in which an Error/Empty card centers; preserve its scrolling min-height, existing header measurements, bottom-navigation clearance and enlarged-content overflow. Review and requalify actual iOS/Android states after the change, per FR-038 and `plan.md#shared-page-composition` (partial).

## Phase 17: Native safe-area adaptation follow-up (US6)

- [x] T159 [US6] Apply the approved minimum top clearance and external capsule safe spacing at the existing `apps/mobile/src/shared/components/{page,paged-tabs,scroll-chrome}.tsx` and `apps/mobile/src/app/(ordinary)/(tabs)/_layout.tsx` owners, per FR-034/FR-039 and [native safe-area research](research.md#native-safe-area-adaptation). Preserve explicit top/bottom ownership, native measurements and navigation/draft behavior. Independently review the changes and meaningful regressions, run affected mobile checks, and qualify zero/asymmetric-inset iPhone Duo and ordinary iOS/Android layouts before recording exact evidence in `quickstart.md`. Reconcile only demonstrated representation impacts; introduce no device detection, component, token, dependency or navigation migration.

## Phase 18: Account states, basic lists and contextual sheet sizing (US6)

**Scope**: A29/A30, FR-038/FR-040 and SC-010; [Account and shared-owner reconciliation](plan.md#account-state-and-basic-list-reconciliation). Preserve the earlier native and representation deliveries. The owner selects native → Figma → prototype for these exact corrections.

- [x] T160 [US6] Reconcile current F05/F09/F13 intent and derived artifacts before implementing whole-body Account loading/blocking states, destination-owned Pro recovery, disabled future entries, common basic lists and content-fitting sheets. Use the installed Living Spec procedure and analyze affected coverage; do not alter managed imports or unrelated approvals.
- [x] T161 [P] [US6] At the existing Account overview/editor, Pro destination and their test owners, reproduce and remove fragmented initial identity/photo/error/session compositions. Reveal the usable page together, retain legitimate guest navigation and preserve admitted drafts, refresh feedback, current-session authority and uncertain commands. F05/F09 own their implementation details.
- [x] T162 [P] [US6] Reuse `shared/components/entry-row.tsx` with a concrete `entry-group.tsx` and migrate legal, My account and administration plus the affected season/search radio rows to the same padding/separator anatomy. Planned Account destinations are non-navigable under their applicable visibility rules. Remove superseded administration-card/selection styles after consumer migration and test disabled/navigation semantics. F12 [T047](../013-administration-app-configuration/tasks.md#direct-profile-operational-navigation) owns direct granted operational destinations instead of the Profile technical-index shortcut.
- [x] T163 [P] [US6] Adopt intrinsic native `fitToContents` sizing at `shared/components/sheet.tsx` and affected route layouts. Migrate the Home season selector to the existing Router presenter, lifting its single choice owner only as far as the two Home routes require. Preserve selection/reset, Query/session lifecycle, close/dismiss and scrolling final actions; add no height controller or callback parameters.
- [x] T164 [US6] Independently review all touched handwritten code/tests/deletions and run configured mobile/repository checks. Qualify actual iOS/Android Account loading/error/retry/editing and short/overflowing sheets, themes, compact layout, enlarged text and keyboard as applicable; publish revision-linked native captures and honest limits in `quickstart.md`.
- [x] T165 [US6] After native stabilization, reconcile live published library owners and Account Product Design instances, remove obsolete compositions and repair current references; then migrate the designated prototype and verify matching journeys/states. Serialize Figma writes, preserve unrelated changes and distinguish native/design/browser evidence.
- [x] T166 [US6] Run scoped convergence, complete uncovered work and deliver the linked existing draft PRs with final checks, representative attachments and unchanged branch protections. No merge, provider activation, legal publication, account erasure or unbuilt domain acceptance.

**Order**: T160 precedes behavior changes. T161–T163 use disjoint owners and regression cases before their respective changes. T164 stabilizes native behavior before T165 representation writes. T166 follows integrated review and verification.

## Phase 19: Native Home header retreat (US6)

- [x] T167 [US6] Apply A31 at `apps/mobile/src/shared/components/paged-tabs.tsx`: preserve clipping under fixed navigation, but let Home’s sole collapsible brand fade through the transparent top area using RNCT collapse progress on the UI thread. Preserve sticky controls, safe-area geometry, scrolling and current navigation; add no device rule, state mirror, dependency or height engine. Independently review the bounded source change, run affected mobile checks and observe partial/full collapse plus restoration on the compatible Android and Duo clients before recording exact evidence. This owner-requested follow-up is native-only; do not reopen Figma or prototype.

## Phase 20: Native fitting-state scroll follow-up (US6)

- [x] T168 [US6] Apply A32 at `apps/mobile/src/shared/components/paged-tabs.tsx` and the existing calendar, Club teams, Search and standings consumers. Use RNCT's public composition to omit only the artificial collapse reserve when no usable rows remain, preserve intrinsic overflow and native refresh outside Search, and keep loaded/retained lists unchanged. Independently review the bounded projection and affected tests; qualify fitting Error/Empty, enlarged text and retry, entry after a loaded collapsed tab, populated scrolling and refresh on compatible iOS/Android clients. Record exact scope and limits in `quickstart.md`; this follow-up is native-only.

## Phase 21: Native Home pager tab consistency (US6)

- [x] T169 [US6] Apply A33 at `apps/mobile/src/features/following/screens/personal-screen.tsx`: compose the existing RNCT-backed `PagerTabBar` beside the season selector when Home's pager is mounted, preserving selection identities, Query/session/season ownership and the non-paged admission presentation. Independently review the bounded change and affected user-interaction tests; qualify tap/swipe behavior on compatible Android and Duo clients, including enlarged labels and reduced motion where available. Record exact evidence and limits in `quickstart.md`. Add no custom indicator synchronization; this follow-up is native-only and does not reopen Figma/prototype.

## Phase 22: Native blocking-error recovery (US6)

- [x] T170 [US6] Apply A34 to the existing native read owners that combine initial/full-body Error feedback with `DataRefreshControl`: omit the control until accepted content is usable, leaving Retry as the sole blocking-error action. Preserve successful Empty refresh, retained authorized content/toasts, Search's exception and command/session guards. Reproduce the affected recovery boundary with meaningful tests before changing its owner, independently review source/tests, qualify Error drag versus Retry and accepted-content refresh on Android/Duo, then record exact evidence and scoped convergence. Use ordinary composition with no new recovery or gesture engine; this follow-up is native-only.

## Phase 23: Content-free tab feedback and shared header material (US6)

- [x] T171 [US6] Apply A35 at `apps/mobile/src/features/following/screens/personal-screen.tsx`: replace the undelivered Following tab's blank scrollable body with `PagedStateScrollView`, `ScreenState` and the existing unavailable card, without fake reads, Empty success, Retry or refresh. Reproduce the visible selection/season/read behavior in the existing Home tests, review source/documentation/tests and qualify the fitting state on both native clients. This does not complete F06's follow-list tasks.
- [x] T172 [US6] Record the owner's A36 choice after the supplied recording, RNCT source, V1 and platform-pattern analysis: retain shared collapse and correct the visual material instead of implementing independent-header memory. At `shared/components/paged-tabs.tsx`, let each mounted fitting-feedback scene withhold its existing blur target through a private presentation callback, reusing ScrollBackdrop's opaque canvas fallback. Keep both feedback branches, the library pager, offsets, Query scope, refresh and overflow unchanged. Independently review the bounded change and qualify actual loaded→feedback→loaded material on Android/Duo, including native pending/empty/error observations and enlarged feedback reachability where applicable.
- [x] T173 [US6] Reuse the same feedback composition for the actual undelivered Pool Map and Club categories without an available season. Keep true injected content and Club Infos on their normal material; do not invent a map read, successful empty follows, Retry or business journey. Reproduce the affected rendering/read boundaries in the current sporting tests, run affected then complete mobile checks, update bounded qualification and deliver in the existing draft PR without a merge. This pass remains native-only.

## Phase 24: Proportionate native implementation review (US6)

- [x] T174 Review the delivered native composition against Constitution V and the existing feature requirements. Remove inaccessible administrative/collection read branches and duplicate local rendering, centralize the identical division-catalogue grant rule at its access owner and type the existing format label contract without assertions. Retain justified native adapters, Query/form ownership, current authority, refresh and pagination safeguards. Correct contradictory Search/admission documentation, independently review source and useful tests, run complete mobile checks and record bounded native evidence in `quickstart.md`. Reuse the existing draft PR without a merge; [F09 T047](../006-pro-subscriptions/tasks.md#phase-11-current-native-outcomes-after-route-removal) owns the Pro callback correction found during this review.

## Phase 25: Native navigation and scroll polish (US6)

- [x] T175 Apply A37 at the existing selection, Notifications refresh and shared scroll/backdrop owners. Use Reanimated timing for measured selection, gesture-owned native refresh progress, hidden native indicator props and canvas edge blending with installed SVG support. Preserve Router, Query, reduced motion, safe areas and shared collapse. Reproduce focus-versus-pull behavior before correction, review the integrated changes with KISS, run mobile checks and qualify actual Android/Duo motion, notification entry/manual refresh and header edges. Record bounded revision-linked evidence and preserve unavailable provider/accessibility qualifications. [F03 T062](../007-sporting-consultation/tasks.md#phase-10-match-presentation-follow-up) owns match-specific fidelity.
