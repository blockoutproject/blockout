# Tasks: Executable Backend Foundation

Source: approved plan.md and spec.md. This increment covers infrastructure prerequisites and the technical portion of US8; no other story is represented as delivered.

## Phase 1: Setup

- [x] T001 Integrate the identical Liquibase reference and Blockout lifecycle profile in .agents/skills/blockout-best-practices/.
- [x] T002 Add four narrow modules, dependency configuration and test discovery in apps/backend/pom.xml and apps/backend/{core-service,core-worker,jobs,migrations}/pom.xml.

## Phase 2: Foundational

- [x] T003 Write migration/privilege evidence in apps/backend/migrations/src/test/.
- [x] T004 Implement XML baseline and Dockerized Liquibase in apps/backend/migrations/.
- [x] T005 Write transactional publication, concurrency, expiry and effect tests in apps/backend/jobs/src/test/.
- [x] T006 Implement jobs, canonical payloads, leases, retries and schema readiness in apps/backend/jobs/src/main/.
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
- [ ] T023 Validate profile delivery, generation, complete reactor/workspace, Nx graph and isolated images/smoke in apps/backend/, libs/shared/contracts/ and scripts/backend-foundation/; record results on its PR.

## Phase 7: US1 — Server-Verified Pro Access

Depends on the delivered profile increment. Independent outcome: local Pro decisions follow current provider evidence and bounded outage grace; authenticated webhooks reconcile safely. Native client continuity is not claimed.

- [ ] T024 [US1] Define subscription response/refresh/webhook contracts in libs/shared/contracts/specs/source/services/core/ and specs/002-backend-rebuild/contracts/.
- [ ] T025 [US1] Write clock-based policy and PostgreSQL evidence/coalescing/receipt tests in apps/backend/identity/src/test/.
- [ ] T026 [US1] Implement evidence, pending revisions and webhook receipt schema in apps/backend/migrations/ and owner persistence/policies in apps/backend/identity/.
- [ ] T027 [US1] Write RevenueCat V2 pagination/environment/gives_access/promotion/rate/failure tests in apps/backend/identity/src/test/.
- [ ] T028 [US1] Implement bounded read-only RevenueCat integration and live-lease reconciliation in apps/backend/identity/ and apps/backend/core-worker/.
- [ ] T029 [US1] Write HMAC/replay/transfer and API ownership/error tests in apps/backend/core-service/src/test/.
- [ ] T030 [US1] Implement subscription HTTP/refresh/webhook adapters and atomic first-profile refresh publication in apps/backend/core-service/ and apps/backend/identity/.
- [ ] T031 [US1] Add periodic bounded reconciliation, stale-proof/job diagnostics and operational validation in apps/backend/core-worker/, infra/compose/backend/ and specs/002-backend-rebuild/quickstart.md.
- [ ] T032 Validate full subscription delivery and isolated smoke through apps/backend/ and scripts/backend-foundation/; report external controlled-account evidence separately on the PR.

## Identity Dependencies and Delivery Strategy

Profiles: T015–T016 precede T017–T018; T019–T020 can proceed independently of persistence after T016; T021–T022 consume both boundaries; T023 closes the first independently reviewed issue. Subscriptions T024–T032 depend on that first delivery. Do not publish an unhandled subscription job in the profile-only issue. Tasks are grouped into two issues as explicitly requested, rather than one issue per checkbox. T001–T014 remain the foundation tasks above; IDs are never reused.
