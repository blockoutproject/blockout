# Tasks: Backend Foundation, Identity and FFVB

Source: [plan.md](plan.md), [spec.md](spec.md) and the [requirement mapping](coverage.md#planned-increment-boundaries). T001–T014 cover executable infrastructure, T015–T023 business-profile recreation, and T024–T032 server-verified subscription evidence. These are independently verifiable server increments, not completion of US1 or US8. Native continuity and the remaining stories require subsequent plans/tasks. GitHub owns reviews, merge state and acceptance evidence.

Behavior-preserving policy work is directly sourced by [maintenance #239](https://github.com/blockoutproject/blockout/issues/239), under constitution V: dependency checks, standard validation, shared problem codes, inactive core transport, logging/monitoring and code documentation across the replacement. It supports these increments without authorizing new subscription or sporting behavior. Its scope and evidence live on the issue/PR; it does not reuse product task IDs.

## Phase 1: Setup

- [x] T001 Integrate the identical Liquibase reference and Blockout lifecycle profile in .agents/skills/blockout-best-practices/.
- [x] T002 Add four narrow modules, dependency configuration and test discovery in apps/backend/pom.xml and apps/backend/{core-service,core-worker,jobs,migrations}/pom.xml.

## Phase 2: Foundational

- [x] T003 Write migration/privilege evidence in apps/backend/migrations/src/test/.
- [x] T004 Implement XML baseline and Dockerized Liquibase in apps/backend/migrations/.
- [x] T005 Write transactional publication, concurrency, expiry and effect tests in apps/backend/jobs/src/test/.
- [x] T006 Implement jobs, JSON payload deduplication, leases, retries and schema readiness in apps/backend/jobs/src/main/.
- [x] T007 Write authentication and JWKS boundary tests in apps/backend/core-service/src/test/.
- [x] T008 Implement secure API assembly and private management in apps/backend/core-service/src/main/.

## Phase 3: US8 — Executable Opening Prerequisites

Goal: migrate a fresh isolated database and start both processes with recoverable work. Independent proof: real PostgreSQL integration tests plus Docker smoke. Full US8 production cutover remains outside this increment.

- [x] T009 [US8] Write bounded execution/recovery tests in apps/backend/core-worker/src/test/.
- [x] T010 [US8] Implement worker lifecycle, leases, deadlines and metrics in apps/backend/core-worker/src/main/.
- [x] T011 [US8] Add isolated Compose/bootstrap, lifecycle/build/smoke commands and monitoring rules in infra/compose/ and scripts/backend-foundation/.
- [x] T012 [US8] Add three immutable-revision image builds and Nx targets in apps/backend/{core-service,core-worker,migrations}/.
- [x] T013 [US8] Separate buildable replacement images from production targets in .github/workflows/ci.yml.

## Phase 4: Verification

- [x] T014 Run focused/full validation, Docker smoke, and review all foundation sources against specs/002-backend-rebuild/quickstart.md; record evidence on the issue/PR.

## Dependencies and Implementation Strategy

T001–T002 precede migrations T003–T004, then jobs T005–T006. API T007–T008 and worker T009–T010 consume the completed jobs boundary and can be developed independently. Runtime T011–T012 and CI T013 precede T014. Tests are written before their owning implementation. A single coherent issue groups T001–T014 as explicitly requested; no placeholder issues for deferred stories.

The first executable milestone is a successful migration and healthy API/worker. Completion additionally requires lease/crash/security evidence; startup alone is insufficient. Parallel opportunity after T006: API tests/assembly and worker tests/assembly affect separate modules.

## Phase 5: Identity Setup

- [x] T015 Extend approved identity design and source-first user contracts in specs/002-backend-rebuild/ and libs/shared/contracts/specs/source/services/core/.
- [x] T016 Add the identity Maven/Nx library and consumer dependencies in apps/backend/{pom.xml,identity,core-service,core-worker}/.

## Phase 6: US1 — Business Profile Recreation

Independent outcome: a valid canonical Auth0 user creates one fresh profile/billing binding through V2; concurrent or repeated requests return the same ID. No mobile or subscription-state delivery is implied.

- [x] T017 [US1] Write PostgreSQL creation, null-email, collision, rollback and privilege tests in apps/backend/identity/src/test/ and apps/backend/migrations/src/test/.
- [x] T018 [US1] Implement native identity schema, generation readiness and atomic profile persistence in apps/backend/migrations/, infra/compose/backend/ and apps/backend/identity/.
- [x] T019 [P] [US1] Write controlled Auth0 provider/token/failure/privacy tests in apps/backend/identity/src/test/.
- [x] T020 [US1] Implement read-only Auth0 bootstrap, bounded credentials cache and typed configuration in apps/backend/identity/src/main/.
- [x] T021 [US1] Write user-JWT, machine/client rejection, profile response/error and side-effect-free GET tests in apps/backend/core-service/src/test/.
- [x] T022 [US1] Implement generated V2 current-user adapters and owner configuration in apps/backend/core-service/src/main/.
- [x] T023 Validate profile delivery, generation, complete reactor/workspace, Nx graph and isolated images/smoke in apps/backend/, libs/shared/contracts/ and scripts/backend-foundation/; record results on its PR.

## Phase 7: US1 — Server-Verified Pro Access

Depends on the delivered profile increment. Independent outcome: local Pro decisions follow current provider evidence and bounded outage grace; authenticated webhooks reconcile safely. Native client continuity is not claimed.

- [x] T024 [US1] Define subscription response/refresh/webhook contracts in libs/shared/contracts/specs/source/services/core/ and specs/002-backend-rebuild/contracts/.
- [x] T025 [US1] Write clock-based policy and PostgreSQL evidence/coalescing/receipt tests in apps/backend/identity/src/test/.
- [x] T026 [US1] Implement evidence, pending revisions and webhook receipt schema in apps/backend/migrations/ and owner persistence/policies in apps/backend/identity/.
- [x] T027 [US1] Write RevenueCat V2 pagination/environment/gives_access/promotion/rate/failure tests in apps/backend/identity/src/test/.
- [x] T028 [US1] Implement bounded read-only RevenueCat integration and live-lease reconciliation in apps/backend/identity/ and apps/backend/core-worker/.
- [x] T029 [US1] Write webhook-authorization/replay/transfer and API ownership/error tests in apps/backend/core-service/src/test/.
- [x] T030 [US1] Implement subscription HTTP/refresh/webhook adapters and atomic first-profile refresh publication in apps/backend/core-service/ and apps/backend/identity/.
- [x] T031 [US1] Add periodic bounded reconciliation, stale-proof/job diagnostics and operational validation in apps/backend/core-worker/, infra/compose/backend/ and specs/002-backend-rebuild/quickstart.md.
- [x] T032 Validate full subscription delivery and isolated smoke through apps/backend/ and scripts/backend-foundation/; report external controlled-account evidence separately on the PR.

## Identity Dependencies and Delivery Strategy

Profiles: T015–T016 precede T017–T018; T019–T020 can proceed independently of persistence after T016; T021–T022 consume both boundaries; T023 closes the first independently reviewed issue. Subscriptions T024–T032 depend on that first delivery. Do not publish an unhandled subscription job in the profile-only issue. Tasks are grouped into two issues as explicitly requested, rather than one issue per checkbox. T001–T014 remain the foundation tasks above; IDs are never reused.

## Phase 8: US3/US7 — FFVB Reference and Administration

Independent outcome: administrators configure FFVB and explicit division mappings; contextual sports
identities persist correctly in PostgreSQL. Imports and public consultation remain later deliveries.

- [ ] T033 [US3] Align accepted matching semantics and all FFVB artifacts in specs/002-backend-rebuild/ and docs/architecture/.
- [ ] T034 [US7] Define source-first FFVB administration/configuration contracts and shared enums in libs/shared/contracts/specs/source/.
- [ ] T035 [US3] Add sports Maven/Nx module and write reference identity/uniqueness tests in apps/backend/sports/ and apps/backend/pom.xml.
- [ ] T036 [US3] Implement generation-5 native reference/configuration schema, grants and persistence in apps/backend/{sports,migrations}/ and infra/compose/backend/.
- [ ] T037 [US7] Write and implement active local ADMIN verification plus grant/revoke operation in apps/backend/identity/ and scripts/backend-foundation/.
- [ ] T038 [US7] Write administration HTTP/authorization/validation tests in apps/backend/core-service/src/test/.
- [ ] T039 [US7] Implement configuration/division/mapping application operations, generated controllers and MapStruct adapters in apps/backend/{sports,core-service}/.
- [ ] T040 [US7] Add core Python generation and verify Java/Python/TypeScript consumers, ArchUnit and Nx in libs/shared/python-contract-clients/ and apps/backend/.
- [ ] T041 Validate reference/admin schema privileges, full backend/workspace and Docker runtime with scripts/backend-foundation/; review all changed files and record evidence on the PR.

## Phase 9: US3 — Durable FFVB Collection and Publication

Depends on T041 and its reviewed delivery. Independent outcome: complete controlled FFVB observations
publish recoverably without partial calendars or fabricated standings.

- [ ] T042 [US3] Define cycle/discovery/observation/status/retry contracts and component enums in libs/shared/contracts/specs/source/services/core/.
- [ ] T043 [US3] Write complete controlled discovery/composition/calendar/standing and historical-path parity fixtures/tests in apps/backend/competition-scraper/tests/.
- [ ] T044 [US3] Implement replacement scraper composition root, reusable pure parsing, aliases, cadence, bounded HTTP and cached serialized M2M in apps/backend/competition-scraper/scraper/.
- [ ] T045 [US3] Write PostgreSQL receipt/idempotency/order/lease/reconciliation tests in apps/backend/sports/src/test/.
- [ ] T046 [US3] Add typed sporting and technical observation/cycle/snapshot/event tables and generation compatibility in apps/backend/migrations/ and apps/backend/sports/.
- [ ] T047 [US3] Implement atomic reception, cycle configuration capture/discovery/closure, durable jobs and M2M scope enforcement in apps/backend/{sports,core-service}/.
- [ ] T048 [US3] Implement fenced publication, contextual matching, date precision, typed scores/official standings, safe absences and durable events in apps/backend/sports/.
- [ ] T049 [US3] Implement worker handlers, exhausted-job admin replay and safe diagnostics in apps/backend/{core-worker,core-service,sports}/.
- [ ] T050 [US3] Add bounded publication/freshness/mapping/conflict metrics and Prometheus/Grafana panels in apps/backend/sports/ and infra/compose/backend/.
- [ ] T051 Validate generated consumers, full reactor/scraper/workspace and controlled Docker collection/restart/replay with scripts/backend-foundation/; record under-five-minute controlled publication separately from peak qualification.

## Phase 10: US2/US3 — Public Sports Consultation

Depends on T051 and its reviewed delivery. Independent outcome: public catalog and calendars expose
current published truth with explicit unknown times, official standings and reliable continuation.

- [ ] T052 [US2] Define pool/team/match/standing and discriminated schedule/page contracts in libs/shared/contracts/specs/source/services/core/.
- [ ] T053 [US2] Write four-zone temporal, DST, ordering, pagination, expired/incompatible cursor and targeted revision tests in apps/backend/sports/src/test/.
- [ ] T054 [US2] Implement coherent-read projections and existing-library signed cursors with targeted calendar revisions in apps/backend/sports/.
- [ ] T055 [US3] Implement generated public pool/team/match/standing HTTP adapters and negative/read-only tests in apps/backend/core-service/.
- [ ] T056 [US2] Regenerate and verify all consumer boundaries without mobile cutover in libs/shared/{contracts,python-contract-clients}/ and apps/frontend/mobile/.
- [ ] T057 Validate full Maven/scraper/workspace, end-to-end controlled Docker smoke and actual Grafana collection with scripts/backend-foundation/; perform final requirement/diff review on the PR.

## FFVB Dependencies and Strategy

T033 precedes T034; T035 tests precede T036; T037 and T038 precede T039. T040/T041 validate
the first issue. T042–T051 form the second issue; T052–T057 form the third. Existing task IDs
are unchanged. No imports are started before reference administration is reviewed, and no public
consultation is claimed before durable publication. PostgreSQL schema tests and HTTP contract tests
are independent validation opportunities once their common contracts are defined.
