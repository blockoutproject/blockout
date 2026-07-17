# MRG-360 Competition Lifecycle And Cascade Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `COMP-04`, `COMP-05`, and `COMP-06`
- Owner: `competition-service`
- Deferred callers: competition scraper and club scraper
- Production effect: none

## Purpose

MRG-360 introduces the generated canonical lifecycle boundary for deactivating missing teams within one pool, missing
pools, and missing clubs. Canonical `/api/v2/**` operations implement `CompetitionLifecycleApi`, consume generated
camelCase request models, map immediately to application commands, and return `204`. Existing `/api/v1/**` operations
remain isolated snake_case adapters with their empty `200` responses and invoke the same application services.

The migration separates bulk row deactivation from cascade decisions without changing the current event payloads,
routing keys, transaction boundary, missing-identifier semantics, or active consumers.

## Boundary Ownership

| Concern                   | Owner and target                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| Missing teams command     | immutable `DeactivateCompetitionTeamsCommand` with pool identity and defensive set semantics      |
| Missing pools command     | immutable `DeactivateCompetitionPoolsCommand` with defensive set semantics                        |
| Missing clubs command     | immutable `DeactivateCompetitionClubsCommand` with defensive set semantics                        |
| Canonical REST            | generated `CompetitionLifecycleApi` and generated request models behind the v2 controller         |
| Generated request mapping | strict `CompetitionLifecycleApiMapper`                                                            |
| Bulk deactivation         | transactional `CompetitionLifecycleService`                                                       |
| Cascade decision          | `CompetitionCascadeService` and immutable `CompetitionCascadePlan`                                |
| Event application port    | `CompetitionLifecycleEvents`                                                                      |
| Existing Rabbit adapter   | `EventPublisher`, still using the four handwritten v1 payloads and existing exchange/routing keys |
| Legacy REST               | adapter-local snake_case records and `LegacyCompetitionJson`                                      |

Generated request types are confined to the canonical controller and mapper. Commands and plans contain no Spring,
Jackson, persistence, or generated-contract annotations. Both transports call the same transactional lifecycle
service, and neither transport exposes the JPA entity.

## Preserved Deactivation And Cascade Semantics

| Trigger                   | Row selection                                          | Preserved event decisions                                                              |
| ------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| teams missing in one pool | active rows matching `poolId` and the deduplicated IDs | one `teambypool.deactivation` per changed team, then eligible pool/team/club cascades  |
| missing pools             | every active row in the deduplicated pool set          | eligible pool events for every candidate, then affected-team and derived-club cascades |
| missing clubs             | every active row in the deduplicated club set          | eligible affected-pool/team events and club events for every candidate                 |

Duplicate request identifiers retain set semantics. An empty set or any selection that finds zero active association
rows returns immediately: it performs no save, cascade lookup, or event publication. This includes a missing pool or
club with no association history. If one candidate has rows and another does not, the current cascade still evaluates
both candidate identities; MRG-360 preserves that observable event behavior instead of silently correcting it.

Rows are marked inactive and saved before cascade evaluation. A pool, team, or club event is published only when the
repository reports no remaining active association for that identity. Teams can be derived from candidate pools, and
clubs can be derived from affected teams, under the same historical repository queries. The explicit JPQL behind the
two `findDistinct...ByActiveTrue...` method names still omits an active predicate. Correcting that query could change
event behavior and remains deferred to the deeper lifecycle audit tasks.

## Transaction And Event Compatibility

All three lifecycle commands remain Spring transactions. Rabbit publication failures are not swallowed, so a runtime
publisher failure propagates through the transactional method and causes the database transaction to roll back under
Spring's default rules. This preserves the current behavior but does not make the Rabbit send and database commit
atomic. The existing system still has no outbox, event version, ordering key, deduplication, or broker-side rollback.

MRG-360 does not create any v2 event contract or route. It retains:

- `team.deactivation`;
- `pool.deactivation`;
- `club.deactivation`;
- orphan-only `teambypool.deactivation`.

No matches-service listener is activated for its currently listener-less queues, and no consumer is added for the
team-by-pool route. MRG-350 owns generated event contracts; MRG-371 owns the competition outbox and dual publication.

## Coexistence And Deferred Callers

| Concern          | v1 compatibility                                           | canonical v2                                         |
| ---------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| JSON keys        | `missing_team_ids`, `missing_pool_ids`, `missing_club_ids` | `missingTeamIds`, `missingPoolIds`, `missingClubIds` |
| Duplicate IDs    | set semantics                                              | identical set semantics                              |
| Empty selection  | valid no-op                                                | valid no-op                                          |
| Success response | empty `200`                                                | empty `204`                                          |
| Scope            | `delete:competitions`                                      | identical method-security decision                   |
| Errors           | current legacy deserialization and error behavior          | generated validation and progressive Problem Details |

The competition scraper remains on the handwritten v1 teams/pools calls until MRG-349. The club scraper remains on
the handwritten v1 club call until MRG-348. Those tasks own migration to the official generated asynchronous Python
client package and camelCase wire aliases. Python application identifiers remain idiomatic snake_case.

Before a v2 scraper image is released, the standalone v1 image remains the rollback target. After a v2 consumer is
active, rollback uses the retained dual-route competition image together with the last known-good scraper image. No
production resource, image, route, or authority changes in MRG-360.

Blockout's existing Orval configuration remains unchanged and retains its project-specific options. The official
generated Python client configuration also remains unchanged in this provider-side task.

## Verification Evidence

- Generated-boundary tests prove the controller implements `CompetitionLifecycleApi`.
- Mapper tests prove generated lists become defensive set-owned commands immediately at the boundary.
- Canonical lifecycle request serialization remains camelCase under the temporary global snake_case mapper.
- Generated validation proves positive numeric identifiers, bounded club identifiers, and valid empty sets.
- Application tests prove defensive set ownership, all three zero-association paths, row deactivation, team-by-pool
  publication, derived cascade decisions, mixed candidate behavior, active-identity suppression, transaction
  annotations, and publisher-failure propagation.
- Focused competition tests, contract generation tests, OpenAPI source lint, full backend packaging, documentation
  validation, Maaatch comparison, Prettier, and whitespace checks pass.
- No contract source, committed generated artifact, database, queue, binding, listener, BFF, Expo, scraper, standalone
  repository, production resource, Maaatch file, Orval setting, or Python generator setting changes in this task.

## Closed Scope

- MRG-348 and MRG-349 own the generated Python caller migrations.
- MRG-350 and MRG-371 own generated lifecycle events, dual publication, and the competition outbox.
- MRG-406 and MRG-422 own deeper association, lifecycle, ranking, cascade, concurrency, and query corrections.
- MRG-373 and MRG-352 own canonical casing cleanup that can occur before legacy adapters are retired.
- The active goal stops before Phase MRG-900 and does not authorize production retirement.
