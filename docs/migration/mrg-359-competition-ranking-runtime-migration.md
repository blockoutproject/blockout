# MRG-359 Competition Ranking Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operation: `COMP-08`
- Owner: `competition-service`
- Deferred callers: mobile-gateway and Expo
- Production effect: none

## Purpose

MRG-359 makes `competition-service` the single owner of pool-ranking projection and ordering. The canonical
`/api/v2/competitions/teams/{teamId}/pools-with-ranking` operation implements the generated
`CompetitionRankingsApi` interface and returns generated camelCase models. The existing v1 route remains available
through the isolated snake_case adapter and invokes the same application projection.

This slice does not change ranking calculations, persistence values, mobile enrichment, or product-visible behavior.
It removes the duplicated service-owned transport DTOs and their handwritten Jackson annotations without moving
generated DTOs into application or persistence code.

## Boundary Ownership

| Concern                | Owner and target                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Ranking query          | `CompetitionRankingService` pages pool groups and builds complete nested rankings              |
| Ordering policy        | `CompetitionRankingPolicy` owns every business key and the deterministic technical tie-breaker |
| Application output     | immutable `PoolRankingView`, `TeamRankingView`, and `PoolRankingPage` records                  |
| Persistence input      | active competition associations read through `CompetitionAssociationRepository`                |
| Canonical REST         | generated `CompetitionRankingsApi` and generated ranking/page DTOs behind the v2 controller    |
| Structural API mapping | strict `CompetitionRankingApiMapper`                                                           |
| Legacy REST            | adapter-local ranking records serialized only by `LegacyCompetitionJson`                       |
| Mobile enrichment      | current mobile-gateway workflow remains unchanged until MRG-368                                |

Generated ranking DTOs are confined to the canonical API mapper and controller. Application records contain no
Spring, persistence, generated-contract, or Jackson annotations, and the JPA entity is never exposed by either
transport.

## Ranking And Pagination Policy

Within each pool, teams are ordered by the current mobile-gateway policy:

1. `points` descending;
2. `pointsPenalty` ascending;
3. `wins` descending;
4. `coefSets` descending;
5. `coefPoints` descending;
6. `teamId` ascending as the deterministic technical tie-breaker.

The first five keys are identical to the three existing BFF comparators. Java's stable BFF sort therefore preserves
the service's `teamId` order when all product keys tie. MRG-368 will remove those duplicate comparators when it migrates
the workflow to the generated competition client; MRG-346 owns the later Expo consumer migration.

Pool groups are ordered by `poolId` ascending. Canonical pagination applies to pool groups, never to entries inside a
ranking: every returned pool contains its complete active team ranking. `totalItems` counts pool groups and `hasNext`
is derived from the next group boundary. The v1 adapter remains unpaged but now receives the same ordered owner
projection.

## Coexistence And Removal

| Concern          | v1 compatibility                           | canonical v2                                                  |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------- |
| Path             | existing `/api/v1/**/pools-with-ranking`   | generated `/api/v2/**/pools-with-ranking`                     |
| JSON casing      | adapter-local snake_case                   | generated camelCase                                           |
| Collection shape | complete unpaged array of pool groups      | `PageResponse` of pool groups with complete nested rankings   |
| Ordering         | owner policy, including deterministic ties | identical owner policy                                        |
| Errors and auth  | existing v1 behavior                       | progressive Problem Details and existing authorization policy |
| Active callers   | existing handwritten BFF client            | none until MRG-368                                            |

The `legacy`, `api/v1`, and `V2` names are coexistence scaffolding. Legacy adapters remain only until every caller and
the required zero-traffic evidence gates are complete. After v1 retirement, canonical controllers and packages can
drop the `V2` qualifier because v2 becomes the unambiguous boundary. Generated interfaces and DTOs, meaningful
application records, strict mappers, and persistence isolation remain part of the target architecture. Historical
Flyway filenames are immutable and are not part of this naming cleanup.

The temporary global snake_case mapper remains because deferred services still depend on it. Canonical generated
models retain camelCase through their generated boundary metadata; this slice adds no global naming strategy,
`@JsonProperty`, or `@JsonAlias`.

## Deferred Callers And Rollback

The handwritten mobile-gateway competition client remains on v1. MRG-368 owns its generated client, workflow
projection, removal of copied ranking DTOs, and removal of duplicated BFF comparators. Expo remains unchanged until
the BFF boundary is ready under MRG-346. Neither Python scraper calls this ranking operation.

Before any v2 consumer is released, the standalone v1 image remains the rollback target. After the first v2 consumer
is active, rollback uses the retained dual-route competition image together with the last known-good consumer image.
No production route, image, or authority changes in MRG-359.

Blockout's existing Orval configuration is intentionally unchanged. Its project-specific input, output, validation,
mock, cleanup, override, and transport options remain authoritative; adopting React Query and Axios does not justify
mechanically replacing the remaining configuration with Maaatch's smaller configuration. The official generated
Python client configuration is also unchanged.

## Verification Evidence

- Generated-boundary tests prove that the ranking controller implements `CompetitionRankingsApi`.
- Canonical ranking serialization remains camelCase under the temporary global snake_case mapper.
- Policy tests prove every business ordering key and the final `teamId` tie-breaker.
- Application tests prove ascending pool groups, complete nested rankings, page metadata, the empty-page path, and
  identical deterministic projection for v1.
- Focused competition tests, contract generation tests, OpenAPI source lint, full backend packaging, documentation
  validation, Maaatch comparison, Prettier, and whitespace checks pass.
- No contract source, committed generated artifact, database, Rabbit route, BFF, Expo, scraper, standalone repository,
  production resource, Maaatch file, Orval setting, or Python generator setting changes in this task.

## Closed Scope

- MRG-360 owns generated competition lifecycle and cascade boundaries.
- MRG-368 owns the generated mobile-gateway competition client and workflow projection.
- MRG-346 owns Expo competition query consumption after the BFF boundary is ready.
- MRG-406 and MRG-422 own deeper ranking, lifecycle, cascade, and event restructuring.
- MRG-350 and MRG-371 own generated lifecycle events and the competition outbox.
- MRG-373 and MRG-352 own canonical casing cleanup that can occur before legacy adapters are retired.
- The active goal stops before Phase MRG-900 and does not authorize production retirement.
