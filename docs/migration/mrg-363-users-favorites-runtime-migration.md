# MRG-363 Users Favorites Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `USER-07` through `USER-09`
- Owner: `users-service`
- Activated providers: generated teams-service and pools-service follower clients
- Deferred consumers: mobile-gateway and Expo
- Production effect: none

## Purpose

MRG-363 makes users-service favorite rows the explicit canonical source behind application-owned commands, views,
queries, and pages. `UserFavoriteV2Controller` implements the generated `UserFavoritesApi`; generated camelCase
models map immediately to `FavoriteCommand`, `FavoriteView`, and `FavoritePage`. The isolated v1 adapter invokes the
same use cases and retains its unpaged entity-shaped snake_case array.

This slice also completes the downstream transport replacement staged by MRG-335 and MRG-336. Favorite workflows use
the generated `TeamFollowersClient` and `PoolFollowersClient` through local projection ports. The unused generic
`ApiClientService` is removed. No handwritten HTTP path, generated model, or downstream response escapes an outbound
adapter.

## Boundary Ownership

| Concern                        | Owner and target                                                           |
| ------------------------------ | -------------------------------------------------------------------------- |
| Authenticated mutation intent  | `FavoriteCommand`                                                          |
| Canonical and legacy view      | `FavoriteView`                                                             |
| Canonical collection result    | immutable `FavoritePage`                                                   |
| Favorite use cases             | `FavoriteService`                                                          |
| Transactional orchestration    | `UserFavoriteApplicationService`                                           |
| Persistence projection         | strict `FavoritePersistenceMapper`                                         |
| Generated transport projection | strict `FavoriteApiMapper`                                                 |
| Canonical REST                 | generated `UserFavoritesApi` behind `UserFavoriteV2Controller`             |
| Legacy REST                    | `LegacyUserFavoriteController`, adapter record, and `LegacyUsersJson`      |
| Team and pool counters         | local ports backed by generated follower clients                           |
| Deployed Rabbit event          | `FavoriteEventPublisher` backed by the retained `EventPublisher` transport |

Generated models never enter application, persistence, counter, or event code. JPA entities no longer cross either
favorite REST boundary. The account projection now reuses the favorite-owned `FavoriteView` and persistence mapper,
so favorite field ownership is not duplicated inside account code.

## Operation And Behavior Parity

| Operation | Canonical behavior                                                      | Retained v1 behavior                                                      |
| --------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `USER-07` | Stable page ordered by `createdAt` then row identity with exact count   | Same user check, optional filter, unpaged array, repository order, fields |
| `USER-08` | Auth0 subject resolved to local user; idempotent team/pool follow `204` | Same query names, scopes, no-op semantics, side effects, and errors       |
| `USER-09` | Auth0 subject resolved to local user; idempotent team/pool delete `204` | Same query names, scopes, no-op semantics, side effects, and errors       |

The canonical list exposes only `entityType` and `entityId`. The compatibility adapter alone retains row `id` and
`createdAt`, emits `entity_type`, `entity_id`, and `created_at`, and does not impose a new order on the v1 repository
read. User absence still returns the established not-found result before reading favorite rows.

Canonical list pagination is zero based, defaults to 25 through the generated interface, accepts at most 100, orders
by creation ascending then row identity ascending, and returns exact `totalItems` and `hasNext`. This target behavior
does not alter the v1 array.

## Authority, Counters, And Events

The local `(userId, entityType, entityId)` favorite row remains authoritative. Existing optimistic Expo state is not
changed because mobile-gateway and Expo remain on v1 until their declared consumer tasks.

MRG-363 deliberately preserves the deployed mutation sequence:

1. resolve the Auth0 subject to the local numeric user;
2. insert or delete the canonical favorite row;
3. increment or decrement the type-specific remote follower counter;
4. publish the existing unversioned CREATED or DELETED event.

An existing follow and an absent unfollow remain complete no-ops. The transaction and its known distributed failure
window are not silently redesigned: a remote counter may still commit before a later Rabbit failure rolls back the
local row. MRG-369 owns the generated favorite event contract, MRG-372 owns the users outbox and consumer
deduplication, and MRG-425 owns idempotent rebuildable projection reconciliation.

Account deletion now invokes the same application event port but retains Auth0-first deletion and one legacy DELETED
event per favorite. MRG-364 owns the identity, deletion, and storage restructuring and may not change retention or
ordering without explicit evidence.

## Authentication, Errors, And Compatibility

Canonical follow and unfollow retain the exact type-selected authorities:

- `TEAM` requires `SCOPE_follow:teams`;
- `POOL` requires `SCOPE_follow:pools`.

All favorite reads remain bearer authenticated. Canonical validation, authorization, not-found, and unexpected
failures use users-service Problem Details with stable codes and request IDs. The v1 adapter retains its query names,
status codes, legacy error body, snake_case serialization, and authenticated behavior. No global naming strategy,
handwritten Jackson property annotation, snake/camel converter, or custom OpenAPI scalar is added.

Compatibility telemetry continues to report `USER-07`, `USER-08`, and `USER-09`, API version, status, latency, and
request ID without payloads.

## Provider-First Activation And Rollback

An eventual authorized deployment follows this order:

1. retain validated dual-route teams-service and pools-service images as provider rollback baselines;
2. validate their v2 follower projection operations;
3. deploy users-service with both unchanged v1 favorite routes and generated v2 routes;
4. validate local favorite authority, derived counters, legacy events, and v1 parity before migrating any BFF caller.

If validation fails, roll users-service back to its prior generated-client image while leaving the dual-route team and
pool providers deployed. Before any v2 favorite consumer is released, the standalone users v1 image remains a valid
rollback target. After a v2 consumer becomes active, MRG-304 requires retaining a last-known-good dual-route users
image. This active goal performs no deployment or production cutover.

## Coexistence And Temporary Names

- `api/v1`, `LegacyUserFavoriteController`, `LegacyUsersJson`, and the adapter-local response record remain only until
  all callers migrate and approved zero-traffic evidence gates close.
- `api/v2` and the `UserFavoriteV2Controller` suffix are coexistence names. After authorized v1 retirement, the
  surviving canonical controller becomes unqualified.
- The public canonical `/api/v2/**` route remains stable after source-code coexistence names disappear.
- Generated interfaces/models at adapters, application commands/views/pages, strict mappers, projection ports, and
  persistence separation remain part of the target architecture.
- Flyway files named `V2__...` remain immutable database history and are unrelated to REST coexistence cleanup.

The active goal stops before Phase MRG-900 and therefore neither performs nor authorizes legacy production removal.

## Verification Evidence

- Application tests prove follow and unfollow no-op semantics, local/counter/event ordering, stable v2 pagination,
  exact counts, and missing-user rejection without a JVM instrumentation agent.
- Transport tests prove generated interface ownership, enum and page mapping, canonical camelCase, and the exact
  unpaged entity-shaped v1 JSON array.
- Existing generated teams-service and pools-service adapter tests prove canonical operation paths, positive numeric
  IDs, forwarded authentication, and configured URL normalization.
- Focused and retained users tests, generated server/client compilation, contract and source lint, full backend
  packaging, documentation validation, Maaatch comparison, Prettier, and whitespace checks pass.

## Closed Scope

- MRG-364 owns Auth0 identity-link, account-deletion, storage, and orchestration boundaries.
- MRG-343 and MRG-347 own mobile-gateway and Expo favorite consumers and optimistic state parity.
- MRG-369 and MRG-372 own generated favorite events, the users-service outbox, and consumer deduplication.
- MRG-425 owns deeper favorite persistence, projection reconciliation, and lifecycle restructuring.
- MRG-373 and MRG-352 own canonical casing cleanup while isolated v1 adapters remain.
- Production v1 retirement is outside this active goal.
