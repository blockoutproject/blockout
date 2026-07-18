# MRG-422 Competition Ranking And Lifecycle Architecture

- Status: implemented in the monorepo shadow baseline
- Owner: `competition-service`
- Feature family: ranking projection, bulk lifecycle, cascade decisions, and lifecycle outbox events
- REST operations: `COMP-04`, `COMP-05`, `COMP-06`, and `COMP-08`
- Event routes: `team.deactivation`, `pool.deactivation`, `club.deactivation`, and `teambypool.deactivation`
- Production effect: none

## Purpose

MRG-422 completes the remaining competition-service application and infrastructure boundaries after MRG-406 isolated
association and statistics persistence. Ranking, lifecycle, and cascade application code no longer imports JPA
entities, repositories, Spring Data, persistence mappers, generated models, or outbox models. Lifecycle event
construction now lives in an explicit mapper and outbox adapter.

The slice preserves generated and legacy REST behavior, authorization, defensive commands, ranking ordering and
pagination, row selection, early returns, mixed-candidate cascade decisions, historical distinct-query behavior,
transaction rollback, four v1 routes, three v2 routes, the team-by-pool v1-only route, event identity and ordering,
outbox atomicity, persistence mapping, and Flyway history. It changes no contract, generated artifact, table, query,
queue, binding, caller, configuration, deployment, production resource, or authority.

## Ownership

| Concern            | Application owner                                                                                 | Infrastructure owner                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Ranking reads      | `CompetitionRankingStore`, role snapshot, page/view records, service                              | `JpaCompetitionRankingStore` and the association persistence mapper                              |
| Ranking projection | one `CompetitionRankingProjector` plus the existing `CompetitionRankingPolicy`                    | none; projection and ordering are pure application behavior                                      |
| Bulk lifecycle     | three defensive commands and transaction-owning `CompetitionLifecycleService`                     | `JpaCompetitionLifecycleStore` row selection, soft writes, and structural snapshots              |
| Cascade decisions  | `CompetitionCascadePlan`, `CompetitionCascadeService`, lifecycle store port, and lifecycle events | lifecycle store existence/history queries plus the outbox event adapter                          |
| Event production   | `CompetitionLifecycleEvents`                                                                      | `CompetitionLifecycleEventMapper` and `OutboxCompetitionLifecycleEvents`                         |
| Compatibility      | isolated v1 and generated v2 API adapters                                                         | retained v1 payload classes, generated v2 event records, current queues, and MRG-304 flags/gates |

The ranking and lifecycle snapshots are use-case records, not domain mirrors. They carry only the fields required by
their projector or cascade workflow. No synthetic general competition domain model is introduced.

## Ranking Projection

`CompetitionRankingService` owns read-only transaction boundaries and page slicing. `JpaCompetitionRankingStore`
maps active association entities immediately to role-owned snapshots. The service still deduplicates and sorts a
team's pool identifiers before paging and does not fetch nested ranking rows for an empty or past-the-end page.

One projector now owns every legacy and canonical ranking transformation. It groups snapshots by pool and maps them
to immutable team views before applying the single existing policy:

1. points descending;
2. penalty points ascending;
3. wins descending;
4. set coefficient descending;
5. point coefficient descending; and
6. team identifier ascending as the deterministic technical tie-breaker.

Pool groups remain ordered by pool identifier ascending, nested rankings remain complete rather than paged, exact
totals and `hasNext` remain unchanged, and empty results remain immutable.

## Lifecycle And Cascade Transactions

`CompetitionLifecycleService` remains the explicit transaction owner for all three bulk operations. Its store selects
the same active rows, applies the same soft deactivation, saves once, and returns minimal pool/team/club snapshots.
Application code then publishes team-by-pool facts where applicable and invokes the cascade in the same transaction.
An outbox-recorder failure still propagates and rolls back the database transaction.

The observable compatibility matrix remains unchanged:

- zero selected rows return before saves, cascade queries, or events;
- duplicate identifiers retain set semantics and empty commands remain no-ops;
- a mixed candidate set is evaluated in full once at least one association is changed;
- pool, team, and club events publish only when no active association remains for that identity;
- team identifiers may be derived from candidate pools and club identifiers from affected teams; and
- team-by-pool events publish before the broader cascade for each changed pool-team association.

The lifecycle port names the two distinct lookups as historical because their retained JPQL omits the active
predicate despite the old repository method names. MRG-422 isolates that known behavior but does not correct it. The
zero-row early return, stale stored club ownership, missing optimistic version/source revision, and cross-service
identity trust also remain unchanged because correcting them requires separate product and data evidence.

## Event And Outbox Boundaries

`CompetitionLifecycleEventMapper` alone maps lifecycle identifiers and one outbox metadata identity into wire
messages. `OutboxCompetitionLifecycleEvents` records those messages on the unchanged entity lifecycle exchange.

- team, pool, and club deactivation each retain one v1 route and one generated `.v2` route;
- their generated envelopes retain producer `competition-service`, schema version `2.0.0`, event UUID, occurred time,
  correlation identifier, and entity ordering key;
- `teambypool.deactivation` remains intentionally v1-only with event type
  `TEAM_DEACTIVATED_BY_POOL_V1_ONLY` and ordering key `pool:{poolId}:team:{teamId}`; and
- the exact four `com.blockout.competitions.models.events.*` class names remain available because pending v1 outbox
  rows persist them and rollback images must deserialize newly recorded rows.

No queue, DLQ, acknowledgement, retry, consumer, rollout flag, or publication job changes. The generic
`services.EventPublisher` is removed only after its route construction moves atomically into the named outbox adapter.

## Persistence, Validation, And Rollback

Flyway V1 and V2, `competition_association`, every column/default/index/constraint, the outbox table, repository
queries, mapper behavior, and local timestamps remain unchanged. No migration, lock, version, or data rewrite is
introduced.

Twenty-eight focused competition reactor tests cover ranking policy and deterministic ties, grouped projections,
page bounds, association/statistics persistence, generated validation and casing, defensive bulk commands, all
zero-row paths, row deactivation, event order, mixed candidates, active-identity suppression, transaction annotations,
publisher-failure propagation, exact retained v1 payload classes, v1/v2 event identity, legacy JSON, and the v1-only
orphan route.

Validation commands:

```text
mvn -f apps/backend/pom.xml -pl competition-service -am test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only competition-service image revert. Both REST versions, all four v1 event routes, all three v2
event routes, Flyway history, database data, Rabbit topology, generated clients, pending outbox rows, and environment
values remain compatible with the previous image. Production authority is unchanged.
