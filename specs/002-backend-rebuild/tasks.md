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
