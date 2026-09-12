# Tasks: Executable Backend Foundation

Source: approved plan.md and spec.md. This increment covers infrastructure prerequisites and the technical portion of US8; no other story is represented as delivered.

## Phase 1: Setup

- [ ] T001 Integrate the identical Liquibase reference and Blockout lifecycle profile in .agents/skills/blockout-best-practices/.
- [ ] T002 Add four narrow modules, dependency configuration and test discovery in apps/backend/pom.xml and apps/backend/backend-*/pom.xml.

## Phase 2: Foundational

- [ ] T003 Write migration/privilege evidence in apps/backend/backend-migrations/src/test/.
- [ ] T004 Implement XML baseline and Dockerized Liquibase in apps/backend/backend-migrations/.
- [ ] T005 Write transactional publication, concurrency, expiry and effect tests in apps/backend/backend-jobs/src/test/.
- [ ] T006 Implement jobs, canonical payloads, leases, retries and schema readiness in apps/backend/backend-jobs/src/main/.
- [ ] T007 Write authentication and JWKS boundary tests in apps/backend/backend-api/src/test/.
- [ ] T008 Implement secure API assembly and private management in apps/backend/backend-api/src/main/.

## Phase 3: US8 — Executable Opening Prerequisites

Goal: migrate a fresh isolated database and start both processes with recoverable work. Independent proof: real PostgreSQL integration tests plus Docker smoke. Full US8 production cutover remains outside this increment.

- [ ] T009 [US8] Write bounded execution/recovery tests in apps/backend/backend-worker/src/test/.
- [ ] T010 [US8] Implement worker lifecycle, leases, deadlines and metrics in apps/backend/backend-worker/src/main/.
- [ ] T011 [US8] Add isolated Compose/bootstrap, lifecycle/build/smoke commands and monitoring rules in infra/compose/ and scripts/backend-foundation/.
- [ ] T012 [US8] Add three immutable-revision image builds and Nx targets in apps/backend/backend-*/.
- [ ] T013 [US8] Separate buildable replacement images from production targets in .github/workflows/ci.yml.

## Phase 4: Verification

- [ ] T014 Run focused/full validation, Docker smoke, and review all foundation sources against specs/002-backend-rebuild/quickstart.md; record evidence on the issue/PR.

## Dependencies and Implementation Strategy

T001–T002 precede migrations T003–T004, then jobs T005–T006. API T007–T008 and worker T009–T010 consume the completed jobs boundary and can be developed independently. Runtime T011–T012 and CI T013 precede T014. Tests are written before their owning implementation. A single coherent issue groups T001–T014 as explicitly requested; no placeholder issues for deferred stories.

The first executable milestone is a successful migration and healthy API/worker. Completion additionally requires lease/crash/security evidence; startup alone is insufficient. Parallel opportunity after T006: API tests/assembly and worker tests/assembly affect separate modules.
