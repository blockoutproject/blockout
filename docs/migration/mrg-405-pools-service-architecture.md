# MRG-405 Pools Service Architecture

- Status: implemented in the monorepo shadow baseline
- Owner: `pools-service`
- Feature family: pool catalog, scraper-facing REST, follower projection, lifecycle, and events
- REST operations: `POOL-01` through `POOL-07`
- Event routes: retained upsert/deactivation routes plus owner `pool.projection-changed.v2`
- Production effect: none

## Purpose

MRG-405 completes the internal pools-service restructuring after MRG-336 established generated canonical HTTP
boundaries and MRG-371/MRG-381 established the dual-wire outbox and owner lifecycle consumer. Pool application code
no longer imports Spring Data, JPA entities, persistence mappers, generated REST/event models, or Rabbit messages.

The service preserves all seven REST operations, both compatibility versions, authorization scopes, create/update
defaults, stable ordering, soft deactivation, follower-counter behavior, nullable event enums, event identity and
topology, outbox atomicity, consumer deduplication, and favorite authority. MRG-442 adds only the internal revision,
owner event source, and local Flyway V6 required for versioned projections. It adds no queue, binding, caller,
deployment, or production resource.

## Ownership

| Concern             | Inbound adapter                                                | Application roles                                                                              | Outbound adapter                                                  |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Pool catalog        | legacy v1 and generated v2 controllers/mappers                 | create/update commands, views, page, update plan/change/handle, `PoolStore`, and `PoolService` | `JpaPoolStore`, entity, repository, and strict persistence mapper |
| Follower projection | legacy v1 and generated v2 follower controllers                | `PoolFollowerCommand`, `PoolFollowerStore`, and `PoolFollowerProjectionService`                | `JpaPoolStore` counter update                                     |
| Lifecycle           | REST delete plus retained v1 and generated v2 Rabbit listeners | `PoolLifecycleStore` and `PoolLifecycleService`                                                | `JpaPoolStore` soft write                                         |
| Event production    | pool write application flows                                   | one `PoolEventData` record and `PoolEventPublisher`                                            | role mapper plus `OutboxPoolEventPublisher`                       |
| Compatibility       | v1 snake-case JSON and v2 generated canonical server           | role-owned commands and views shared only after transport mapping                              | existing compatibility telemetry and MRG-304 rollout properties   |

No independent pool domain value is introduced. The current pool slice has no invariant-bearing value comparable to a
logo upload or policy decision; its simple data therefore remains in role-owned application records. Adding a
field-for-field domain mirror would violate the MRG-401 rule against synthetic mapping layers.

## Catalog And Persistence

`PoolService` now depends on `PoolStore` and `PoolEventPublisher`. `JpaPoolStore` owns query construction, stable
season/name/identifier pagination, entity lookup, MapStruct conversion, null-preserving mutation, follower projection,
lifecycle writes, and persistence. A transaction-bound `PoolUpdate` handle retains one loaded entity throughout
apply, save, audit, and outbox recording.

The following behavior remains unchanged:

- canonical create owns the generated identifier, zero followers, active state, and audit fields;
- legacy create retains caller-supplied compatibility fields and controller-owned omitted defaults;
- absent identifiers normalize to an empty filter;
- legacy lists retain season-descending/name-ascending repository ordering;
- canonical pages remain stable by descending season, ascending null-last name, then identifier;
- update preserves null fields and explicit active true can reactivate a pool;
- create and update record both upsert wire versions and the owner event in the same application transaction; and
- effective deactivation remains a soft write and records one inactive owner event after flush.

Flyway V6 adds the owner revision and canonical-only outbox constraints. The existing unique key, timestamps, enums,
indexes, repository queries, and other persistence behavior remain unchanged.

## Scraper-Facing REST And Projection

The v1 controller, adapter-local records, snake-case writer, paths, statuses, and scopes remain unchanged behind the
MRG-304 compatibility gate. Generated v2 controllers and `PoolApiMapper` remain the canonical boundary used by
generated clients, including the Python scraper clients established by MRG-348/MRG-349. Both adapters map into the
same role-owned catalog, lifecycle, and follower use cases.

Follower mutation is now explicitly named as a projection rather than catalog ownership. It preserves increment and
decrement, the zero floor, response shapes, `SCOPE_follow:pools`, and logs. The counter remains derived and
non-idempotent in this slice; `users-service` remains the favorite authority, and MRG-425 owns deduplication,
reconciliation, and rebuildability.

## Event Boundaries

Create and update pass one `PoolEventData` application record to the event adapter. `PoolEventMapper` alone maps that
data and one `OutboxMetadata` identity to the retained v1 message, generated `PoolUpsertV2Event`, and generated owner
event. `OutboxPoolEventPublisher` records the retained dual-wire upsert and canonical-only owner row atomically
through the shared outbox.

Inbound v1 and v2 pool deactivation messages remain on their existing queues and opposite rollout defaults. The
generated v2 record is decoded and validated inside the Rabbit adapter, then narrowed to a role-owned event ID, type,
and pool ID fact before deduplicated lifecycle handling. Spring type metadata remains rejected. No exchange, queue,
binding, event UUID, ordering key, producer, schema version, retry, or consumer-deduplication behavior changes.

## Compatibility, Removal, And Rollback

Generic `services`, `listeners`, `utils`, and cross-feature exception locations are removed after their behavior moves
atomically into application, persistence, event, or shared-application owners. The historical
`com.blockout.pools.models.events.PoolUpsertEvent` class name is deliberately retained because pending v1 outbox rows
persist it and rollback images must read newly recorded rows. Legacy REST and event messages remain until the MRG-267
lineage and MRG-304 traffic, observation, rollback, and retirement gates permit deletion.

Focused pools-service tests cover catalog defaults and updates, stable paging, effective and repeated soft
deactivation, follower zero floor, optimistic locking, Flyway V6, legacy JSON, generated v2 boundaries, dual-wire
upserts, canonical-only owner events, historic payload type, lifecycle-event narrowing, metadata validation, and
retained queue topology.

Validation commands:

```text
mvn -f apps/backend/pom.xml -pl pools-service -am test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback reverts the MRG-442 code and contract sources. If Flyway V6 has run, the additive revision column and relaxed
legacy outbox nullability remain compatible with the previous image because it continues to write complete legacy
wire pairs. REST versions, retained event routes, Rabbit topology, and environment values remain compatible.
