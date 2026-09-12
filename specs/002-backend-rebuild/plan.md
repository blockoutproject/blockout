# Implementation Plan: Executable Backend Foundation

**Branch**: `tech/234-backend-foundation` | **Date**: 2026-09-12 | **Spec**: [Backend rebuild](spec.md)

## Summary

Implement the approved first infrastructure increment of US8, with authentication prerequisites for US1 and durable processing prerequisites for US3/US5. This plan does not deliver the complete rebuild or authorize production cutover. API and worker share a transactional PostgreSQL job library. A separate Dockerized Liquibase process creates the fresh schema before either application starts.

## Technical Context

- Java 25, Spring Boot 4.1.0, PostgreSQL 17, Liquibase 5.0.3, Maven and Nx.
- Four reactor modules: backend-api, backend-worker, backend-jobs, backend-migrations. No legacy shared-model dependency or speculative business modules.
- Spring JDBC owns explicit queue SQL; Liquibase XML native changes own schema construction.
- JUnit, AssertJ, Testcontainers PostgreSQL and Failsafe integration/smoke tests.
- Linux Docker deployment artifacts; isolated local Compose proof only. No production publication/deployment.
- Initial API/worker connection budgets 10/6; worker concurrency 2. These are local defaults, not Sunday capacity evidence.
- UTC instants, database clock for leases, injectable application clock and monotonic execution deadlines.

## Constitution Check

- I: approved specification remains behavioral authority; this increment is foundation only (FR-050, FR-053, D01–D03/D11/D12), not completion of US8 cutover.
- II: no sporting, identity or billing owner is introduced. Jobs are technical state.
- III: no UI impact; Figma gate is not applicable to this increment.
- IV: no product contract changes or generated files committed. Future /api/v2 contracts remain source-first.
- V: alternatives and verification are in research.md; operational status/evidence belongs in GitHub. No constitutional exceptions.

## Project Structure

- `apps/backend/backend-api`: secured HTTP assembly and private management endpoints.
- `apps/backend/backend-worker`: bounded leased execution and process health.
- `apps/backend/backend-jobs`: job publication, persistence, configuration and schema readiness shared by both runtimes.
- `apps/backend/backend-migrations`: XML baseline, image and PostgreSQL migration tests.
- `infra/compose/docker-compose.backend.yml`: isolated database/migration/API/worker topology.
- `scripts/backend-foundation/`: image build, local lifecycle and smoke commands.
- Skill references: identical portable Liquibase policy plus Blockout-specific profile and validation-policy link bridge.

## Schema Lifecycle

Use db/changelog/db.changelog-master.xml including 001-init.xml. Until the new monolith first reaches production, edit native XML createTable/constraint/index definitions directly and explicitly recreate disposable local databases. Never erase data on ordinary startup or clear checksums to bypass drift. After the first production release, applied changes become immutable and append-only migrations own compatibility/backfill/recovery.

Liquibase runs in a versioned one-shot image, receives migration credentials only at runtime and must finish successfully before API/worker become available. Application credentials have no DDL. SQL bootstrap owns database roles and schema namespace; Liquibase owns tables/keys/indexes/grants. Native changes are preferred; PostgreSQL GRANT statements are a documented SQL exception because Liquibase Community has no equivalent grant change.

## Runtime and Security

JWT signature RS256, issuer, audience, expiry/not-before and 60-second skew; cached JWKS with controlled rotation/outage tests. Stateless bearer API, deny unregistered routes, method security available to future owners, safe RFC problem responses, no product probe endpoint. Management is on a distinct private port, exposing health and Prometheus only. Liveness never depends on providers; readiness depends on database/schema and worker scheduler progress.

JVM stdout uses structured UTC logs without payloads/identity claims. Metrics use bounded job types/states; no IDs as labels. Resource limits and SQL timeouts are explicit. Unknown job types use a single bounded metric category.

## Durable Work

See data-model.md and contracts/foundation.md for publication, leases, retry and effect semantics. No network call holds a queue reservation transaction. A transactional SQL effect verifies/fences the lease and commits with success; external effects require their own idempotency in future adapters. Five attempts, 5/30/120/600-second jittered retry delays, 60-second leases renewed every 20 seconds, two-minute execution deadline, 30-second graceful stop. Success retention is seven days; dead work requires explicit operator intervention.

## Build and Verification

Native Maven modules and inferred Nx targets; explicit uncached image targets. Images share APP_REVISION. CI builds replacement images but filters them out of production deployment selection. Existing workflows continue to validate the whole workspace. Fresh migration, no-op rerun, invalid change, concurrent lock, schema readiness, SQL privileges, transactional deduplication, crash recovery, stale lease fencing, security/JWKS and timezone scenarios are required. Synthetic handlers and additive evolution fixtures remain test-only.

## Delivery Boundaries

No old database purge, Auth0/RevenueCat mutation, existing API rename, mobile change, search implementation, load qualification or VPS deployment. Next increment prioritizes paid identity continuity, then a full sporting ingestion/read path. This plan and tasks cover only the approved foundation; remaining user stories need their own subsequent design and delivery.
