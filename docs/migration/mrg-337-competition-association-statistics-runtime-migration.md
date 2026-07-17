# MRG-337 Competition Association And Statistics Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `COMP-01`, `COMP-02`, `COMP-03`, and `COMP-07`
- Owner: `competition-service`
- Deferred operations: `COMP-04` through `COMP-06` and `COMP-08`
- Deferred callers: mobile-gateway, Expo, and both Python scrapers
- Production effect: none

## Purpose

MRG-337 introduces generated canonical v2 Spring boundaries for competition association creation/reactivation,
association reads, and full statistics replacement. The existing v1 operations remain available through an isolated
snake_case adapter. Both transports invoke the same association application service, strict structural mappers, and
dedicated persistence entity.

The task does not activate canonical lifecycle or ranking routes. `COMP-04` through `COMP-06` remain owned by MRG-360,
and `COMP-08` remains owned by MRG-359. Their existing v1 behavior is retained behind separate lifecycle and ranking
services so those later migrations can proceed without reintroducing entity exposure.

## Boundary Ownership

| Concern                 | Owner and target                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| Association command     | `AddCompetitionAssociationCommand` owns pool, team, and club identity                               |
| Statistics command      | `CompetitionStatisticsSnapshot` owns the complete seventeen-value replacement                       |
| Application output      | `CompetitionAssociationView` and `CompetitionAssociationPage`                                       |
| Persistence             | `CompetitionAssociationEntity`, repository, and strict persistence mapper                           |
| Canonical REST          | generated `CompetitionAssociationsApi`, `CompetitionStatisticsApi`, and generated DTOs              |
| Legacy REST             | adapter-local request/response records and `LegacyCompetitionJson`                                  |
| Ranking compatibility   | existing ranking DTOs and projection behind `CompetitionRankingService`; canonical work is deferred |
| Lifecycle compatibility | existing transactions, cascade decisions, and publisher behind `CompetitionLifecycleService`        |

Generated DTOs are confined to the v2 API mapper and controllers. The JPA entity is never returned by a controller,
and application records do not own Jackson, persistence, Spring, or generated-contract annotations.

## Coexistence And Preserved Behavior

| Concern               | v1 compatibility                                                                          | canonical v2                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Add existing active   | returns the stored association without a write                                            | same application behavior                                                                     |
| Reactivation          | sets only `active=true`; retains stored `clubId`, statistics, identity, and audit history | same behavior, without persistence identity or audit fields on the wire                       |
| New association       | creates all statistics at zero and retains the direct 200 response                        | same owner defaults and 200 response                                                          |
| Pool association read | active, unpaged array with the current repository behavior                                | exact-count page ordered by `teamId` ascending                                                |
| Team association read | active, unpaged array with the current repository behavior                                | exact-count page ordered by `poolId` ascending                                                |
| Statistics            | snake_case full replacement; a missing/null field reaches non-null persistence and fails  | camelCase generated request requires all seventeen fields before the application service runs |
| Errors                | existing legacy map, French messages, generic persistence failures, and bearer challenge  | progressive Problem Details with stable code and bounded request identifier                   |
| Authorization         | create and update scopes together for writes; update scope for statistics                 | identical method-security decisions                                                           |

The v1 adapter returns its own entity-shaped compatibility record, including persistence identifier and audit
timestamps, through a dedicated snake_case `ObjectMapper`. It does not serialize the JPA entity. The temporary global
Jackson snake_case strategy remains because deferred slices still depend on it; generated models retain their
canonical camelCase properties.

No Flyway migration or persistence correction is included. The unique `(pool_id, team_id)` key, local timestamps,
nullable legacy input failure behavior, lack of optimistic locking, and lack of cross-service identity validation are
preserved. Corrections require later explicit tasks and data evidence.

## Deferred Client Cutovers

The repository contains no backend-to-backend Java client for the four MRG-337 operations. The only active consumers
are the handwritten mobile-gateway client and Python scraper calls inventoried by MRG-303. Migrating them here would
violate the approved ownership sequence:

- MRG-368 owns the generated mobile-gateway competition client and workflow projections.
- MRG-346 owns Expo competition query consumption after the BFF boundary is ready.
- MRG-348 and MRG-349 own the club and competition scraper cutovers to the official generated async Python library.

Until those tasks complete, v1 remains authoritative for all current callers. Before a v2 consumer image is released,
the standalone v1 image remains the rollback target. After the first v2 consumer is active, rollback uses the retained
dual-route competition image and the last known-good consumer image.

Blockout's existing Orval configuration is intentionally unchanged. Its project-specific input, output, validation,
mock, cleanup, override, and transport options remain authoritative unless a later measured migration task proves an
option obsolete. The official generated Python client configuration is also unchanged.

## Telemetry And Removal Gate

The compatibility filter records `COMP-01` through `COMP-08`, API version, status class, latency, caller cohort, and a
bounded request identifier. Recording all eight identifiers prepares later slices without activating their v2 routes.

Internal v1 removal still requires the BFF, Expo support window, scrapers, and every unknown production caller to
migrate, followed by 30 consecutive days without legacy traffic. This task does not remove or authorize removal of any
v1 route.

## Verification Evidence

- Generated interface tests prove ownership of the association and statistics boundaries only.
- Canonical serialization remains camelCase under the temporary global snake_case mapper.
- Generated validation rejects an incomplete statistics snapshot with all seventeen required-field violations.
- Application tests cover new zero-state ownership, active no-op, reactivation, stored-club and historical-statistics
  preservation, complete replacement, non-partial nullable legacy behavior, stable paging, and the not-found path.
- Legacy JSON tests prove isolated snake_case serialization and deserialization.
- Repository search proves there is no in-scope backend Java client to generate or migrate.
- No contract source, generated artifact, database, Rabbit route, BFF, Expo, scraper, standalone repository,
  production resource, Maaatch file, Orval setting, or Python generator setting changes in this task.

## Closed Scope

- MRG-359 owns generated ranking boundaries, the single ordering policy, deterministic ties, and BFF/Expo parity.
- MRG-360 owns generated lifecycle commands, missing-ID semantics, cascade transactions, and rollback behavior.
- MRG-406 and MRG-422 own deeper association, persistence, ranking, lifecycle, cascade, and event restructuring.
- MRG-350 and MRG-371 own generated lifecycle events and the competition outbox.
- MRG-368 owns mobile-gateway competition and match/live workflow clients.
- MRG-346 owns Expo competition query migration.
- MRG-348 and MRG-349 own generated Python caller migration.
- MRG-373 and MRG-352 own final casing and Jackson cleanup after migration gates close.
- The active goal stops before Phase MRG-900.
