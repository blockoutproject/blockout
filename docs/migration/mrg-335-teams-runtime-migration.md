# MRG-335 Teams Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `TEAM-01` through `TEAM-08`
- Owner: `teams-service`
- Migrated consumers: `search-worker`, `notification-service`, and `users-service`
- Deferred consumers: mobile-gateway, Expo, and Python scrapers
- Production effect: none

## Purpose

MRG-335 introduces the generated canonical v2 server boundary for all eight team operations while retaining the
current v1 API through an isolated compatibility adapter. Both transports invoke the same feature-owned application
service, persistence entity, explicit logo intent, S3 port, follower projection, and legacy event publisher.

The task also replaces three handwritten v1 clients and two copied, annotated DTOs. Search-worker aggregates generated
team pages into immutable application snapshots. Notification-service projects generated team reads immediately to
the identifier and short name it consumes. Users-service calls generated `204` follower mutations while preserving
the current caller JWT forwarding behavior.

MRG-335 does not migrate mobile-gateway, Expo, or either Python scraper. Those caller cutovers remain owned by
MRG-367, MRG-345, MRG-348, and MRG-349. Blockout's existing Orval configuration and official generated Python client
configuration are intentionally unchanged.

## Boundary Ownership

| Concern                  | Owner and target                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| Application input        | separate canonical create, legacy create, null-preserving update, follower, and logo-intent records |
| Application output       | `TeamView`, `TeamPage`, and `TeamClubIdPage`; audit fields exist only for v1 compatibility          |
| Persistence              | `TeamEntity`, `TeamRepository`, and strict `TeamPersistenceMapper` under the team feature           |
| Canonical REST           | generated `TeamsApi`, `TeamClubDiscoveryApi`, `TeamFollowersApi`, models, and shared `PageInfo`     |
| Legacy REST              | adapter-local records and snake_case `LegacyTeamsJson`; no entity or generated model exposure       |
| Logo lifecycle           | `TeamLogoChange` with `KEEP`, `REMOVE`, or `REPLACE`; multipart bytes stop at the inbound adapter   |
| S3                       | `TeamLogoStorage` application port and `S3TeamLogoStorage` outbound adapter                         |
| Follower projection      | team application command; `users-service` remains the favorite authority                            |
| Legacy team upsert       | `TeamEventPublisher` port backed by the unchanged unversioned route and payload                     |
| Worker REST              | generated `TeamsClient`, `TeamCatalog`, immutable `TeamSnapshot`, and explicit event projector      |
| Notification REST        | generated `TeamsClient`, `TeamCatalog`, and minimal immutable `TeamNameSnapshot`                    |
| Favorite projection REST | generated `TeamFollowersClient` behind the users-owned `TeamFollowerProjection` port                |

Strict service-local MapStruct configurations own structural mappings. Generated DTOs remain adapter-only, the JPA
entity is never returned by a controller, and no application record owns wire-case annotations.

## Coexistence And Preserved Behavior

| Concern                  | v1 compatibility                                                                               | canonical v2                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Team list                | complete array, existing filters, and raw-name ordering                                        | exact-count page with stable raw-name/identifier ordering                             |
| Club identifiers         | complete array with the current repository order and active/inactive references                | lexicographically ordered exact-count page                                            |
| Read                     | entity-shaped response including audit timestamps                                              | generated owner projection without audit timestamps                                   |
| Create                   | direct JSON entity shape, including caller-supplied legacy fields and current omitted defaults | generated request; service owns ID, follower count, lifecycle, logo, and audit fields |
| Ordinary update fields   | null or omission preserves stored values, including active/reactivation                        | same null-preserving behavior                                                         |
| Logo update              | image replaces; no image plus null `logo_url` removes; non-null `logo_url` keeps               | explicit `removeLogo`; image replaces; conflicting remove-plus-image is invalid       |
| Direct/cascade lifecycle | soft deactivation without a new outbound event                                                 | same application behavior; absent listeners remain absent                             |
| Followers                | response retains the full legacy team; decrement has a zero floor                              | generated `204`; same counter behavior and authenticated follow scope                 |
| Events                   | unchanged unversioned `team.upsert` after create/update save                                   | no v2 event route is activated by this REST task                                      |
| Errors and auth          | existing scoped mutations, authenticated unscoped reads, legacy error map, and Bearer behavior | same authorization with progressive Problem Details and bounded request IDs           |

The workspace-wide Jackson snake_case strategy remains temporarily because later slices still depend on it. The v1
adapter owns snake_case locally, while generated v2 models retain canonical camelCase. MRG-351 and MRG-352 own final
cleanup after all relevant callers migrate.

## Internal Client Cutovers

Search-worker generates the standard OpenAPI Generator Java `TeamsClient`, uses its existing Auth0-authenticated
`RestTemplate`, normalizes configured host or versioned URLs, requests pages of 100, and continues until `hasNext` is
false. Generated responses are immediately reduced to the nine fields used by caches, index jobs, and the current
legacy event projection.

Notification-service uses the same generated client with its existing service-token `RestTemplate`. It retains the
current fallback behavior in notification composition and exposes only `TeamNameSnapshot` to that workflow.

Users-service uses generated `TeamFollowersClient` operations through a users-owned port. Its existing forwarded JWT
transport remains authoritative, and the canonical query key is `userId`; the discarded v1 team response is removed.

Before a v2 consumer image is released, the standalone v1 image remains the rollback target. After a v2 consumer is
active, rollback uses the retained dual-route teams-service image and the last known-good consumer image. Removing v1
is not authorized by this task.

## Telemetry And Removal Gate

The compatibility filter records `TEAM-01` through `TEAM-08`, API version, status class, latency, caller cohort, and a
bounded request ID. Internal v1 removal still requires every BFF, scraper, worker, and unknown production caller to
migrate and 30 consecutive days without legacy traffic, as defined by MRG-304.

## Verification Evidence

- All eight generated Spring operations are implemented by owner controllers with the existing mutation scopes.
- Service tests cover canonical ownership, null-preserving updates, logo removal, reactivation, follower zero floor,
  stable pages, generated interface ownership, canonical camelCase, and isolated v1 snake_case.
- Client tests cover complete page aggregation, canonical v2 paths and query keys, Bearer transport, base-URL
  normalization, immutable minimal projections, and `204` follower mutations.
- No Flyway migration, table, Rabbit route, BFF, Expo, scraper runtime, standalone repository, production resource,
  Maaatch file, Orval setting, or Python generator setting changes in this task.

## Closed Scope

- MRG-404 owns deeper team storage, projection, lifecycle, and event restructuring.
- MRG-350 and MRG-371 own generated v2 events and the team outbox.
- MRG-363 and MRG-425 own deeper favorite authority and projection reconciliation.
- MRG-366 and MRG-428 own deeper notification workflow restructuring.
- MRG-367 owns mobile-gateway team workflows.
- MRG-345 owns Expo team query migration and defers the editable form to MRG-508.
- MRG-348 and MRG-349 own Python scraper cutovers.
- MRG-351 and MRG-352 own final casing and Jackson cleanup after migration gates close.
- The active goal stops before Phase MRG-900.
