# MRG-334 Clubs Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `CLUB-01` through `CLUB-06`
- Owner: `clubs-service`
- Migrated consumer: `search-worker` club snapshot reads
- Deferred consumers: mobile-gateway, Expo, and Python club scraper
- Production effect: none

## Purpose

MRG-334 introduces the generated canonical v2 server boundary for all six club operations while retaining the current
v1 API through isolated compatibility adapters. Both transports invoke the same application service, explicit logo
intent, persistence entity, storage port, and legacy event publisher.

The task also replaces the search worker's handwritten v1 club client and annotated copied DTO with the standard
OpenAPI Generator Java client. Generated response models are mapped immediately into an immutable four-field
`ClubSnapshot`; generated models never enter caches, index services, jobs, or event projections.

MRG-334 does not migrate mobile-gateway, Expo, or the Python club scraper. Those caller cutovers remain owned by
MRG-367, MRG-345, and MRG-348. The Orval configuration and official generated Python client packages are unchanged.

## Boundary Ownership

| Concern              | Owner and target                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Application input    | separate `CreateClubCommand` and null-preserving `UpdateClubCommand` records                      |
| Application output   | `ClubView` plus `ClubPage`; persistence audit fields exist only for legacy compatibility          |
| Persistence          | `ClubEntity`, `ClubRepository`, and strict `ClubPersistenceMapper` under the club feature         |
| Canonical REST       | generated `ClubsApi`, `ClubLogosApi`, request models, response models, and shared `PageInfo`      |
| Legacy REST          | adapter-local records and snake_case `LegacyClubsJson`; no entity or generated model exposure     |
| Logo lifecycle       | `ClubLogoChange` with `KEEP`, `REMOVE`, or `REPLACE`; multipart bytes stop at the inbound adapter |
| S3                   | `ClubLogoStorage` application port and `S3ClubLogoStorage` outbound adapter                       |
| Legacy club upsert   | `ClubEventPublisher` port backed by the unchanged v1 Rabbit route and payload                     |
| Worker REST          | generated `ClubsClient`, `ClubCatalog`, and immutable `ClubSnapshot`                              |
| Mapbox and geocoding | existing vendor client and scheduled persistence behavior retained for the later MRG-403 redesign |

Strict service-local MapStruct configurations own structural mappings. Generated DTOs remain adapter-only, the JPA
entity is never returned by a controller, and the removed handwritten `ClubUpdateDTO` and worker `ClubDTO` cannot
reintroduce Jackson annotations or transport casing into application code.

## Coexistence And Preserved Behavior

| Concern                | v1 compatibility                                                                                   | canonical v2                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| List shape             | complete array, optional repeated IDs and active filter                                            | `ClubInternalPageResponse` with exact count and stable name/identifier ordering                         |
| Read and logo          | entity-shaped club including audit timestamps; logo is plain text or `204`                         | generated owner projection without audit fields; logo remains plain text or `204`                       |
| Create                 | entity-shaped multipart JSON; address and body logo URL remain ignored                             | generated create request intentionally excludes address and body logo URL                               |
| Ordinary update fields | null or omission preserves stored values                                                           | null or omission preserves stored values                                                                |
| Logo update            | image replaces; no image plus null `logo_url` removes; non-null `logo_url` keeps                   | explicit `removeLogo`; image replaces; conflicting remove-plus-image returns an invalid-request problem |
| Lifecycle              | successful update reactivates; direct delete remains a `204` soft deactivation without publication | same application behavior                                                                               |
| Storage ordering       | owned old object is deleted before replacement upload, matching the current failure behavior       | same application behavior                                                                               |
| Events                 | unchanged unversioned `club.upsert` publication after create/update save                           | no v2 event route is activated by this REST task                                                        |
| Errors and auth        | existing operation scopes, authenticated unscoped logo read, legacy error map, and Bearer behavior | same scopes and logo access with progressive Problem Details and bounded request IDs                    |

The workspace-wide Jackson snake_case strategy remains temporarily because later service and caller slices still
depend on it. The migrated v1 adapter owns snake_case locally, while generated v2 models emit canonical camelCase even
under that temporary global setting. MRG-351 and MRG-352 own final cleanup after all callers migrate.

## Search Worker Cutover

The worker generates `ClubsClient` from the committed clubs bundle during Maven `generate-sources`, using the standard
OpenAPI Generator Java `resttemplate` library and the existing authenticated `RestTemplate`. Configured host,
`/api/v1/clubs`, and `/api/v2/clubs` base URLs normalize to the service host before the generated client calls v2.

The canonical list is paginated. `ClubsServiceCatalog` requests pages of 100 active clubs until `hasNext` is false,
preserving the complete-list semantics used by startup cache population, ten-minute cache refresh, and hourly full
reindex. Each generated item is immediately projected to ID, name, logo URL, and city, which are the only fields the
worker consumes.

Before a v2 worker image is released, the standalone v1 image remains the rollback target. After a v2 consumer is
active, rollback uses the retained dual-route clubs-service image and the last known-good worker image. Removing v1 is
not authorized by this task.

## Telemetry And Removal Gate

The compatibility filter records `CLUB-01` through `CLUB-06`, API version, status class, latency, caller cohort, and a
bounded request ID. Internal v1 removal still requires every BFF, scraper, worker, and unknown production caller to
migrate and 30 consecutive days without legacy traffic, as defined by MRG-304.

## Verification Evidence

- All six generated Spring operations are implemented by owner controllers with the existing method scopes.
- Service tests cover create behavior, null-preserving updates, explicit logo removal, reactivation, event projection,
  and canonical stable page ordering.
- Boundary tests cover generated interface ownership, canonical camelCase under the temporary global snake mapper,
  conflicting logo intents, and isolated v1 snake_case with audit fields.
- Worker tests cover multi-page aggregation, immutable minimal snapshots, canonical v2 route construction, existing
  Bearer transport, and base-URL normalization.
- No Flyway migration, table, Rabbit route, Mapbox behavior, BFF, Expo, scraper runtime, standalone repository,
  production resource, Maaatch file, Orval setting, or Python generator setting changes in this task.

## Closed Scope

- MRG-403 owns deeper club storage, Mapbox, event, and geocoding restructuring.
- MRG-350 and MRG-371 own generated v2 events and the club outbox.
- MRG-367 owns mobile-gateway club workflows and public phone filtering.
- MRG-345 owns Expo club client/query migration and defers the editable form to MRG-507.
- MRG-348 owns the Python club scraper cutover.
- MRG-351 and MRG-352 own final casing and Jackson cleanup after migration gates close.
- The active goal stops before Phase MRG-900.
