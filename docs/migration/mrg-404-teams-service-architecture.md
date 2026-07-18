# MRG-404 Teams Service Architecture

- Status: implemented in the monorepo shadow baseline
- Owner: `teams-service`
- Feature family: team catalog, logo storage, scraper-facing REST, follower projection, lifecycle cascade, and events
- REST operations: `TEAM-01` through `TEAM-08`
- Event routes: `team.upsert`, `team.upsert.v2`, `team.deactivation`, `team.deactivation.v2`, `club.deactivation`, and
  `club.deactivation.v2`
- Production effect: none

## Purpose

MRG-404 completes the internal teams-service restructuring after MRG-335 established generated canonical HTTP
boundaries and MRG-371/MRG-381 established the dual-wire outbox and owner lifecycle consumers. Team application code
no longer imports Spring Data, JPA entities, persistence mappers, generated REST/event models, AWS SDK types, or Rabbit
messages.

The slice preserves all eight REST operations, both compatibility versions, authorization scopes, multipart behavior,
S3 ordering, create/update defaults, soft deactivation and club cascade, follower-counter behavior, event identity and
topology, outbox atomicity, consumer deduplication, persistence mapping, and Flyway history. It does not change a
contract, generated artifact, table, queue, route, configuration key, caller, deployment, production resource, or
favorite authority.

## Ownership

| Concern             | Inbound adapter                                                | Application roles                                                                               | Outbound adapter                                                   |
| ------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Team catalog        | legacy v1 and generated v2 controllers/mappers                 | create/update commands, views, pages, update plan/change/handle, `TeamStore`, and `TeamService` | `JpaTeamStore`, entity, repository, and strict persistence mapper  |
| Team logos          | multipart-to-domain conversion in the HTTP adapter             | `TeamLogoChange` and `TeamLogoStorage`                                                          | `S3TeamLogoStorage`                                                |
| Follower projection | legacy v1 and generated v2 follower controllers                | `TeamFollowerCommand`, `TeamFollowerStore`, and `TeamFollowerProjectionService`                 | `JpaTeamStore` counter update                                      |
| Lifecycle           | REST delete plus retained v1 and generated v2 Rabbit listeners | `TeamLifecycleStore` and `TeamLifecycleService`                                                 | `JpaTeamStore` direct and club-cascade writes                      |
| Event production    | team create/update application flow                            | minimal `TeamUpsertFact` and `TeamEventPublisher`                                               | role mapper plus `OutboxTeamEventPublisher` for retained v1 and v2 |
| Compatibility       | v1 snake-case JSON and v2 generated canonical server           | role-owned commands and views shared only after transport mapping                               | existing compatibility telemetry and MRG-304 rollout properties    |

`TeamLogoUpload` is the only domain value because it owns invariants independently of HTTP and S3: defensive byte
ownership, PNG/JPEG content type, and the five-megabyte limit. Simple catalog, lifecycle, and projection data remains
role-owned records; no synthetic entity mirror or generic domain layer was added.

## Catalog, Persistence, And Storage

`TeamService` now depends on `TeamStore`, `TeamLogoStorage`, and `TeamEventPublisher`. `JpaTeamStore` owns query
construction, stable `rawName` then `id` pagination, entity lookup, MapStruct conversion, null-preserving mutation, and
persistence. A transaction-bound `TeamUpdate` handle retains one loaded entity throughout delete, optional upload,
apply, save, audit, and outbox recording.

The following behavior remains unchanged:

- canonical create owns the generated identifier, zero followers, active state, null logo, and audit fields;
- legacy create retains caller-supplied compatibility fields and the controller-owned omitted defaults;
- list filters normalize absent identifiers to an empty list;
- legacy ordering remains repository-defined while canonical pages remain stable by raw name then identifier;
- update preserves null fields and can reactivate a team;
- logo replacement or removal deletes an existing owned object before optional upload and persistence;
- create and update record both upsert wire versions in the same application transaction; and
- direct and cascade deactivation remain soft writes and emit no new outbound event.

The S3 adapter keeps the existing `teams/{uuid}-{filename}` key, public URL construction, credentials, region, bucket,
content type, foreign-URL delete guard, and AWS SDK behavior. No object is copied, renamed, or deleted by this task.

## Scraper-Facing REST And Projection

The v1 controller, adapter-local records, snake-case writer, multipart logo intent, paths, statuses, and scopes remain
unchanged behind the MRG-304 compatibility gate. Generated v2 controllers and `TeamApiMapper` remain the canonical
boundary used by generated clients, including the Python scraper clients established by MRG-348/MRG-349. Both adapters
map into the same role-owned catalog, lifecycle, and follower use cases.

Follower mutation is now explicitly named as a projection rather than catalog ownership. It preserves the existing
increment/decrement behavior, zero floor, response shapes, `SCOPE_follow:teams`, and logs. The counter remains derived
and non-idempotent in this slice; `users-service` remains the favorite authority, and MRG-425 owns deduplication,
reconciliation, and rebuildability.

## Event Boundaries

Create and update publish a minimal `TeamUpsertFact` instead of exposing the complete team view to the event adapter.
`TeamEventMapper` alone maps that fact and one `OutboxMetadata` identity to the retained v1 message and generated
`TeamUpsertV2Event`. `OutboxTeamEventPublisher` records both routing keys atomically through the unchanged shared
outbox.

Inbound v1 and v2 team/club deactivation messages remain on their existing queues and opposite rollout defaults. The
generated v2 records are decoded and validated inside the Rabbit adapter, then narrowed to role-owned event ID, type,
and entity identifier facts before deduplicated lifecycle handling. Spring type metadata remains rejected. No
exchange, queue, binding, event UUID, ordering key, producer, schema version, retry, or consumer-deduplication behavior
changes.

## Persistence, Compatibility, And Removal

Flyway history, table/column names, timestamps, indexes, outbox and consumed-event storage, repository queries, and
MapStruct rules are unchanged. No migration or data rewrite is required.

Generic `services`, `listeners`, `utils`, and cross-feature exception locations are removed after their behavior moves
atomically into application, persistence, storage, event, or shared-application owners. The historical
`com.blockout.teams.models.events.TeamUpsertEvent` class name is deliberately retained because pending v1 outbox rows
persist it and rollback images must read newly recorded rows. Legacy REST and event messages remain until the MRG-267
lineage and MRG-304 traffic, observation, rollback, and retirement gates permit deletion.

## Verification And Rollback

Eighteen focused teams-service tests cover catalog defaults and updates, logo intent and invariants, stable paging,
follower zero floor, legacy JSON, generated v2 boundaries, shared v1/v2 outbox identity and historic payload type,
generated lifecycle-event narrowing, metadata validation, and retained queue topology.

Validation commands:

```text
mvn -f apps/backend/pom.xml -pl teams-service -am test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only teams-service image revert. Both REST versions, both event versions, Flyway history, database
data, S3 keys, Rabbit topology, and environment values remain compatible with the previous image. Production and
favorite authority are unchanged.
