# MRG-403 Clubs Service Architecture

- Status: implemented in the monorepo shadow baseline
- Owner: `clubs-service`
- Feature family: club catalog, logo storage, geocoding, scraper-facing REST, and lifecycle events
- REST operations: `CLUB-01` through `CLUB-06`
- Event routes: `club.upsert`, `club.upsert.v2`, `club.deactivation`, and `club.deactivation.v2`
- Production effect: none

## Purpose

MRG-403 completes the internal clubs-service restructuring after MRG-334 established generated canonical HTTP
boundaries and MRG-371/MRG-381 established the dual-wire outbox and owner lifecycle consumer. Club application code
no longer imports Spring Data, JPA entities, persistence mappers, generated REST/event models, AWS SDK types, Mapbox
response shapes, or Rabbit messages.

The slice preserves all six REST operations, both compatibility versions, authorization scopes, multipart behavior,
S3 ordering, soft deactivation and reactivation, scheduled geocoding decisions, event identity/topology, outbox
atomicity, consumer deduplication, persistence mapping, and Flyway history. It does not change a contract, generated
artifact, table, queue, route, configuration key, caller, deployment, or production resource.

## Ownership

| Concern           | Inbound adapter                                      | Application roles                                                                                     | Outbound adapter                                                   |
| ----------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Club catalog      | legacy v1 and generated v2 controllers/mappers       | create/update commands, views, page, update plan/change/handle, `ClubStore`, and `ClubService`        | `JpaClubStore`, entity, repository, and strict persistence mapper  |
| Club logos        | multipart-to-domain conversion in the HTTP adapter   | `ClubLogoChange` and `ClubLogoStorage`                                                                | `S3ClubLogoStorage`                                                |
| Geocoding         | seven-day scheduled job                              | query, coordinates, target, store and geocoder ports, plus `ClubGeocodingService`                     | `JpaClubGeocodingStore` and `MapboxClubGeocoder`                   |
| Event production  | club create/update application flow                  | minimal `ClubUpsertFact` and `ClubEventPublisher`                                                     | role mapper plus `OutboxClubEventPublisher` for retained v1 and v2 |
| Event consumption | retained v1 and generated v2 Rabbit listeners        | deactivation use case on `ClubService`                                                                | adapter-local legacy message and generated-event decoder           |
| Compatibility     | v1 snake-case JSON and v2 generated canonical server | role-owned commands and views shared only after each adapter has removed its transport-specific shape | existing compatibility telemetry and MRG-304 rollout properties    |

`ClubLogoUpload` is the only new domain value because it owns real invariants independently of HTTP and S3: defensive
byte ownership, PNG/JPEG content type, and the five-megabyte limit. Simple catalog data remains role-owned records;
no synthetic entity mirror or generic domain layer was added.

## Catalog And Persistence

`ClubService` now depends on `ClubStore`, `ClubLogoStorage`, and `ClubEventPublisher`. `JpaClubStore` owns query
construction, stable `name` then `id` pagination, entity lookup, MapStruct conversion, null-preserving mutation,
reactivation, and persistence. A transaction-bound `ClubUpdate` handle retains one loaded entity throughout the
delete/upload/apply/save sequence.

The following behavior remains unchanged:

- null IDs become an empty filter and legacy ordering remains repository-defined by club name;
- canonical pages remain stable by name then identifier and preserve page metadata;
- create still retains the audited compatibility behavior that does not persist an input address;
- create uploads a supplied logo before saving the club and records the upsert in the same application transaction;
- update preserves null fields, deletes an owned old logo before optional replacement upload, and reactivates;
- explicit logo removal deletes the old owned object and persists a null URL;
- deactivation remains a soft update and does not emit a new club event; and
- audit logs compare the same role fields and retain existing action and entity identifiers.

The S3 adapter keeps the existing `clubs/{uuid}-{filename}` key, public URL construction, credentials, region, bucket,
content type, foreign-URL delete guard, and AWS SDK behavior. No object is copied, renamed, or deleted by this task.

## Geocoding And Mapbox

The scheduled adapter retains its immediate initial run and seven-day fixed delay. `ClubGeocodingService` preserves
the existing transaction owner, candidate rules, per-club failure isolation, ambiguity counter, summary logs, and
continue-on-failure behavior. `JpaClubGeocodingStore` retains the current all-row scan and filters only active clubs
with missing coordinates and non-null city/postal code; a transaction-bound target saves coordinates on the same
loaded entity.

`MapboxClubGeocoder` is the only owner of the provider URL, access token, headers, query encoding, French country and
language filters, five-result limit, provider response fields, and HTTP failure handling. It exposes only
`ClubGeocodingQuery`, `Optional<ClubCoordinates>`, and the existing rule that zero, multiple, malformed, or failed
provider results are unresolved. Provider `place_name` remains adapter-local and unused.

## Scraper-Facing REST

The v1 controller, adapter-local request/response records, snake-case writer, multipart logo intent, paths, statuses,
and scopes remain unchanged behind the MRG-304 compatibility gate. The generated v2 controller and `ClubApiMapper`
remain the canonical boundary used by generated clients, including the Python scraper client established by MRG-348.

Neither transport owns application state. Both adapters map into the same role-owned create/update commands and club
views. No v1 field, route, telemetry signal, or generated v2 model is removed in this slice.

## Event Boundaries

Create and update now publish a four-field `ClubUpsertFact` instead of exposing the complete persistence-oriented club
view to the event adapter. `ClubEventMapper` alone maps that fact and one `OutboxMetadata` identity to the retained v1
message and generated `ClubUpsertV2Event`. `OutboxClubEventPublisher` records both routing keys atomically through the
unchanged shared outbox.

Inbound v1 and v2 deactivation messages remain on their existing queues and opposite rollout defaults. The generated
v2 record is decoded and validated inside the Rabbit adapter, then narrowed to event ID, type, and club ID before the
deduplicated application call. Spring type metadata remains rejected. No exchange, queue, binding, event UUID,
ordering key, producer, schema version, retry, or consumer-deduplication behavior changes.

## Persistence, Compatibility, And Removal

Flyway `V1__create_club_table.sql` through `V5__create_consumed_event.sql`, table/column names, timestamps, indexes,
outbox and consumed-event storage, repository queries, and MapStruct field rules are unchanged. No migration or data
rewrite is required.

Removed generic locations are internal organization artifacts only: `services`, `listeners`, `utils`, and the
cross-feature exception package. Their behavior moves atomically into catalog, geocoding, storage, event,
shared-application, or feature-application owners. The historical
`com.blockout.clubs.models.events.ClubUpsertEvent` class name is deliberately retained because pending v1 outbox rows
persist it and rollback images must be able to read newly recorded rows. Legacy REST and event messages remain behind
their compatibility adapters until the MRG-267 lineage and MRG-304 traffic, observation, rollback, and retirement
gates permit deletion.

## Verification And Rollback

Nineteen focused clubs-service tests cover:

- create/update/logo/reactivation and stable page behavior through `JpaClubStore`;
- immutable logo bytes, MIME validation, and maximum size;
- one-result and ambiguous Mapbox behavior plus provider-shape isolation;
- pending-club geocoding success and unresolved continuation;
- legacy v1 logo intent and JSON casing;
- generated v2 request/response boundaries;
- shared v1/v2 outbox identity and route mapping;
- generated v2 deactivation narrowing and Spring metadata rejection; and
- retained lifecycle queue topology and rollout exclusivity.

Validation commands:

```text
mvn -f apps/backend/pom.xml -pl clubs-service -am test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only clubs-service image revert. Both REST versions, event versions, Flyway history, database data,
S3 keys, Mapbox configuration, Rabbit topology, and environment values remain compatible with the previous image.
Production authority is unchanged.
