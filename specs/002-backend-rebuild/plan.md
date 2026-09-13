# Implementation Plan: Backend Foundation and Identity

**Spec**: [Backend rebuild](spec.md) | **Architecture**: [Replacement decisions](../../docs/architecture/backend-rebuild-architecture.md)

## Summary

Derive three bounded increments from the complete rebuild specification: executable infrastructure, business-profile recreation, then server-verified subscription evidence. The infrastructure supplies prerequisites for US8 and durable work for US3/US5; the two identity increments cover server prerequisites of US1. None alone completes a whole user story or authorizes production cutover. [Coverage](coverage.md#planned-increment-boundaries) maps requirements to these tasks and identifies the later work.

Core-service and core-worker are the two Spring Boot executables. Jobs, identity and logging are in-process libraries, not additional services; migrations is the separate Dockerized Liquibase job. Both executables share one release revision and PostgreSQL database.

## Technical Context

- Java 25, Spring Boot 4.1.0, PostgreSQL 17, Liquibase 5.0.3, Maven and Nx.
- Six replacement reactor modules: core-service, core-worker, jobs, identity, logging, migrations. The API also consumes shared-models for generated transport enums only; application/domain modules do not depend on it. No speculative business modules.
- Spring JDBC owns explicit queue SQL; Liquibase XML native changes own schema construction.
- JUnit, AssertJ, Testcontainers PostgreSQL and Failsafe integration/smoke tests.
- Linux Docker deployment artifacts; isolated local Compose proof only. No production publication/deployment.
- Initial API/worker connection budgets 10/6; worker concurrency 2. These are local defaults, not Sunday capacity evidence.
- UTC instants, database clock for leases, injectable application clock and monotonic execution deadlines.

## Constitution Check

- I: spec.md remains behavioral authority for all eight stories. The selected server increments cover profile recreation, billing continuity prerequisites and isolated operations; native continuity, sporting behavior and cutover remain later work.
- II: identity owns profiles, external identities and billing associations; the subscription increment extends that same owner. Jobs and logging are technical libraries. Generated transport types stay in core-service adapters, never in application/domain libraries.
- III: these increments introduce no screen or session-provider integration. Material UI work still requires approved Figma evidence before its plan is finalized.
- IV: current-user and subsequent subscription contracts are source-first under libs/shared/contracts/specs/source/services/core/. Generated Java/TypeScript projections remain ignored, and changed consumers must be verified.
- V: research.md records decisions, alternatives and verification. Tasks derive from this plan; behavior-preserving policy work is independently sourced by [maintenance #239](https://github.com/blockoutproject/blockout/issues/239). Execution evidence and approvals belong in GitHub. No constitutional exceptions.

## Project Structure

- `apps/backend/core-service`: secured HTTP assembly and private management endpoints.
- `apps/backend/core-worker`: bounded leased execution and process health.
- `apps/backend/jobs`: job publication, persistence, configuration and schema readiness shared by both runtimes.
- `apps/backend/identity`: user and subscription ownership exposed through application contracts; providers and PostgreSQL remain private adapters.
- `apps/backend/logging`: Spring Boot stack-trace formatting and diagnostic privacy shared by both executables.
- `apps/backend/migrations`: XML baseline, image and PostgreSQL migration tests.
- `infra/compose/docker-compose.backend.yml`: isolated database/migration/API/worker topology.
- `scripts/backend-foundation/`: image build, local lifecycle and smoke commands.
- Skill references: identical portable Liquibase policy plus Blockout-specific profile and validation-policy link bridge.

Each shared module owns one business or technical capability and uses populated role packages. Application roots contain only process entry points. The API separates security HTTP translation from configuration; the worker separates application outcome handling and telemetry from its scheduling adapter; jobs expose application ports implemented by PostgreSQL infrastructure. Spring wiring and typed properties live in `config`. Future business owners add feature packages with their own roles when their behavior exists; there is no speculative domain/shared tree.

## Schema Lifecycle

Use db/changelog/db.changelog-master.xml including 001-init.xml. Until the new monolith first reaches production, edit native XML createTable/constraint/index definitions directly and explicitly recreate disposable local databases. Never erase data on ordinary startup or clear checksums to bypass drift. After the first production release, applied changes become immutable and append-only migrations own compatibility/backfill/recovery.

Liquibase runs in a versioned one-shot image, receives migration credentials only at runtime and must finish successfully before API/worker become available. Application credentials have no DDL. SQL bootstrap owns database roles and schema namespace; Liquibase owns tables/keys/indexes/grants. Native changes are preferred; PostgreSQL GRANT statements are a documented SQL exception because Liquibase Community has no equivalent grant change.

## Runtime and Security

JWT signature RS256, issuer, audience, mandatory expiry/optional not-before and 60-second skew; cached JWKS with controlled rotation/outage tests. Stateless bearer API, deny unregistered routes, method security available to future owners, safe RFC problem responses, no product probe endpoint. Management is on a distinct private port, exposing health and Prometheus only. Liveness never depends on providers; readiness depends on database/schema and worker scheduler progress.

JVM stdout uses ECS structured logs with UTC instants independent of the host timezone, without payloads/identity claims. Both executables use Spring Boot ECS formatting and the shared StackTracePrinter extension. Native error.type identifies the original exception; error.message is excluded. StandardStackTracePrinter prints types and frames, including causal frames, with a type-only formatter and no suppressed failures. There is no fabricated throwable or handwritten traversal. Outages log one transition until recovery; successful jobs produce metrics without per-record log noise. Metrics use bounded outcomes, states and schema names; no IDs as labels. Resource limits and SQL timeouts are explicit. Unknown job types use a single bounded metric category.

## Durable Work

See data-model.md and contracts/foundation.md for publication, leases, retry and effect semantics. No network call holds a queue reservation transaction. A transactional SQL effect verifies/fences the lease and commits with success; external effects require their own idempotency in future adapters. Five attempts, 5/30/120/600-second jittered retry delays, 60-second leases renewed every 20 seconds, two-minute execution deadline, 30-second graceful stop. Success retention is seven days; dead work requires explicit operator intervention.

## Build and Verification

Native Maven modules and inferred Nx targets; explicit uncached image targets. Images share APP_REVISION. CI builds replacement images but filters them out of production deployment selection. Existing workflows continue to validate the whole workspace. Fresh migration, no-op rerun, invalid change, concurrent lock, schema readiness, SQL privileges, transactional deduplication, crash recovery, stale lease fencing, security/JWKS and timezone scenarios are required. Synthetic handlers and additive evolution fixtures remain test-only.

## Delivery Boundaries

The three increments contain no old database purge, Auth0/RevenueCat mutation, existing API rename, screen cutover, search implementation, load qualification or VPS deployment. The inactive generated core transport adapter is a prerequisite for later mobile integration, not a change to current screen routing.

T001–T014 define executable infrastructure; T015–T023 define profile recreation and unchanged billing bindings; T024–T032 define subscription evidence and reconciliation. Their verification gates are independent. A passing profile delivery does not establish subscription or native continuity. Later sporting, search, community, mobile and release increments require their own accepted design and task derivation from the existing specification. Issue/PR evidence establishes delivery status; this plan describes scope.

## Identity and Subscription Increment

Implement US1 server prerequisites (FR-004, FR-006–008 and the identity portion of FR-005), preserving the foundation above. The accepted delivery has two ordered issues: profiles/identity first, then RevenueCat evidence/webhooks. Mobile reset, SDK integration, voluntary linking, profile editing/deletion, staff grants, protected sporting routes and production opening remain separate. Neither issue claims complete US1/native continuity.

### Authority and invariants

The human confirms existing affected accounts were linked in Auth0 before RevenueCat adoption. Preserve tenant, canonical subjects, existing links, RevenueCat project and entitlement. Never replace the RevenueCat customer ID with the new business UUID. There is no account migration, email-based merge, linking, account deletion or transfer API in this increment. Future mobile purchases/restores require login; the target is RevenueCat's standard user-triggered restore behavior. Production settings are inspected before any separately authorized change; backend login never restores purchases.

### Structure and persistence

Add `apps/backend/identity`, a Maven library shared by core-service/core-worker with user and subscription feature/application/domain/infrastructure packages only as behavior needs them. Core-service owns generated HTTP adapters; worker owns handler assembly. Use Spring JDBC, owner application transactions, constructor injection, typed configuration and explicit outcomes. Provider calls happen outside SQL transactions. No new executable, network service, legacy model dependency or UI.

Native Liquibase XML extends the mutable creation baseline. Add the identity namespace through the existing schema/role bootstrap and least-privilege grants. Increment schema generation and readiness to reject the old baseline. Use UUID business keys and Instant/timestamptz. Emails are nullable attributes, not unique identity keys. No raw tokens, provider response dumps, receipts or financial records are persisted.

### First delivery: profiles and identities

`POST /api/v2/users/me` accepts no actor/body and creates a profile once, returning 201 with Location or 200 when already present. `GET /api/v2/users/me` is side-effect free and returns 404 when no profile exists. Both require a valid user JWT from an allowlisted native client (`azp`); reject machine identities and client-credentials grants. API-boundary extraction passes `(issuer, subject)` into application operations. No role provisioning is performed.

A lookup hit never calls Auth0. A miss reads only the configured Auth0 Management API exact subject using client credentials with read:users only; validate the response subject equals the requested identity. Read failure creates nothing. Atomically create profile, unique external identity and RevenueCat binding; a concurrent winner is reread. Profile attributes preserve the existing initial pseudonym rules and useful fields, allowing absent email/name/phone/picture. Pseudonym uniqueness uses an explicit normalized key with database arbitration. Local creation/updated dates are fresh; no historical age or favorite/media migration.

First delivery creates the billing binding but does not publish unhandled RevenueCat jobs or expose subscription endpoints. The second delivery adds initial job publication in the same creation transaction. It must also bootstrap reconciliation for profiles created by the first delivery.

Configuration is validated once at Spring startup using Bean Validation annotations: required values, HTTP(S) URL syntax, native clients and billing environment. Production deployment supplies HTTPS issuer, JWKS and Management API endpoints for one tenant, with machine credentials held only in secrets; local tests supply HTTP URLs without an additional application flag. Spring Security owns JWT audience validation and the client-credentials token exchange, including standard form encoding and token-response conversion. The adapter adds the Auth0 Management API audience and read:users scope. Provider profiles use a typed Jackson record with nullable, size-constrained attributes validated before persistence. Token cache uses bounded expiry and synchronized renewal. A token with no usable lifetime is rejected and paused rather than repeatedly renewed; Spring's one-second fallback is not a usable Auth0 cache lifetime. Token failures and shared provider failures (401/403, 429, network and server failures) pause new Auth0 calls per API process, starting at five seconds and doubling up to five minutes. A later Retry-After or X-RateLimit-Reset deadline takes precedence. Only a successful profile read resets the progression; successful token issuance alone does not. A provider-rejected cached token is discarded for renewal after the pause; a late rejection cannot discard a newer token. Missing individual users do not pause other lookups. Credentials and pause state are never persisted, and no background retry is scheduled. Bounded counters distinguish actual token/profile requests, issued tokens, rate limits and suppressed calls. Connect/read timeouts are 3/5 seconds; no unbounded retries. Only safe provider error codes and durations reach diagnostics. API and worker hold no DDL privileges; worker only reads user/binding data in the first delivery.

### Second delivery: server Pro evidence

GET `/api/v2/users/me/subscription` reads local evidence; POST `/api/v2/users/me/subscription-refreshes` coalesces refresh requests and returns 202 with Location and retry timing. State is active/grace/inactive/unknown, with verification time, reliable access bound, refresh state and safe failure code. The owner policy grants active/grace, returns 403 for confirmed inactive and retryable 503 for unknown. No fake sporting route is introduced.

Use RevenueCat V2 subscriptions with environment filter, the configured Pro entitlement and gives_access. Follow all necessary subscription/entitlement pages, validate pagination origin/path and distinguish malformed/partial responses from confirmed absence. Include trials/promotions; do not interpret cancellation as immediate expiry or use period end as a universal access deadline. No lifetime-purchase product is introduced. Only worker calls RevenueCat; read-only V2 credentials, 3/5-second timeouts, 120 provider requests/minute including pagination, and Retry-After handling.

Freshness is ten minutes capped by a reliable access expiry. Refresh positive evidence before expiry; other accounts refresh on demand. Provider-outage grace requires an earlier positive server verification and ends at the earlier of 24 hours from that verification and known access expiry. Failure never advances positive verification time. Confirmed negative evidence replaces positive immediately; expired/missing evidence is unknown. A commercial period boundary is not automatically an effective access expiry.

Use existing fenced jobs, coalesced per binding with durable requested/processed revisions so arrivals during work are not lost. External calls occur outside locks; result persistence and acknowledgement share a live-lease SQL effect. Superseded attempts cannot overwrite newer evidence. Exhausted work remains observable and a bounded subsequent request can recover it.

POST `/api/v2/webhooks/revenuecat` validates HMAC over original body bytes and timestamp (constant-time, 300-second tolerance), deduplicates event.id and durably publishes work before 200. Invalid authentication is rejected before business parsing. Replay/out-of-order events trigger current-state reads, never blind state transitions. Reconcile both known sides of TRANSFER and invalidate affected outgoing access/grace; unknown customers never create profiles. Raw payloads/identities are excluded from logs and metric labels. A database failure prevents acknowledgement.

### Validation and delivery boundaries

Real PostgreSQL tests cover migration, exact uniqueness, concurrent creation and no partial writes. Controlled Auth0/JWKS HTTP fixtures cover client credentials, identity match, invalid/malformed/upstream failures and personal-data-free diagnostics. Generated contracts compile for Java and TypeScript without switching the current mobile client. Verify complete Maven/workspace, all new images, isolated smoke, schema readiness and runtime privileges. No production action.

Second-delivery evidence adds provider-state/grace clocks, sandbox isolation, pagination, rate limiting, failure recovery, lease races and webhook authentication/replay/transfer tests. A controlled existing subscriber read against a fresh isolated database is a separate provider-evidence gate, with no credentials committed and no identity/purchase mutation. Native iOS/Android proof belongs to the subsequent mobile increment.

Constitution: accepted behavior remains in spec.md; no material UI change in these two deliveries; complete identity resources have one owner; new V2 contracts are source-first and generated projections remain ignored. Plan/research/model/contracts contain design, while issue/PR carry execution evidence. No constitutional exception.

## Foundation Boundary Verification

ArchUnit 1.5 runs only in tests. The API assembly verifies the shared application/domain libraries, transport containment,
module cycles and private adapter dependencies; the worker verifies its own module boundaries. Spring HealthIndicator
is the scheduling boundary for queue readiness. Spring Modulith was evaluated; its package/module metadata and broader
runtime features are unnecessary for these existing Maven assemblies and the requested dependency checks.

One ApiProblems factory supplies safe native ProblemDetail responses to Spring Security, profile adapters and a
ResponseEntityExceptionHandler advice. Core generation targets Spring Boot 4/Jackson 3 and MVC built-in validation, retaining Bean Validation annotations without a class-level validation proxy. Spring retains exception classification and protocol headers; generated enums
own the wire codes. Unknown future codes remain readable by the mobile adapter. The core Orval mutator is explicitly
configured with its origin and an Auth0 SDK token supplier, with no current-screen cutover or machine credentials.

The optional local observability Compose profile runs pinned Prometheus and Grafana images with a provisioned datasource
and dashboard. Promtool verifies the five alert rules. The runtime smoke queries both scrapes and schema metrics through
Grafana's datasource proxy and verifies dashboard/rule loading. This proves local metric collection and display; production
routing, alert notification destinations and centralized log storage remain deployment work. ECS stdout is the log boundary.
