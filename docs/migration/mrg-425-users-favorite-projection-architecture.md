# MRG-425 Users Favorite Projection Architecture

- Status: implemented in the monorepo shadow baseline
- Runtime owner: `users-service`
- Scope: canonical favorite reads and transitions, team/pool count projections, notification follower facts, and
  bounded rebuild snapshots
- REST operations: `USER-07` through `USER-09`
- Production effect: none

## Purpose

MRG-425 completes the approved Phase MRG-400 restructuring of users-service favorite internals after MRG-363
established generated REST and downstream client boundaries, MRG-369 established the favorite event contracts, and
MRG-372 established the transactional users outbox and notification deduplication.

The application service no longer imports account/favorite JPA entities, Spring Data repositories, pagination types,
or persistence mappers. It coordinates a canonical `FavoriteStore`, one transaction-bound `FavoriteOwner`, immutable
favorite roles, and an explicit `FavoriteProjectionCoordinator`. The existing users table relation, favorite table,
generated clients, transactional outbox, and compatibility transports remain unchanged.

## Ownership

| Concern                     | Application owner                                                           | Adapter owner                                                      |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Authenticated owner lookup  | `FavoriteStore` and transaction-bound `FavoriteOwner`                       | `JpaFavoriteStore` plus account repository                         |
| Canonical reads             | `FavoriteView`, `FavoritePage`, and `FavoriteService`                       | favorite repository, mapper, and stable page sort                  |
| Canonical transitions       | `FavoriteTarget`, optional effective `FavoriteChange`, and favorite service | favorite entity/repository inside the JPA store                    |
| Team follower count         | `FavoriteProjectionCoordinator` and `TeamFollowerProjection`                | generated `TeamFollowersClient` adapter                            |
| Pool follower count         | `FavoriteProjectionCoordinator` and `PoolFollowerProjection`                | generated `PoolFollowersClient` adapter                            |
| Notification follower state | coordinator plus the retained notification fact port                        | users outbox/event mapper and notification deduplicated projection |
| Notification rebuild input  | `FavoriteProjectionSnapshot` for one positive local user                    | canonical favorite rows                                            |
| Team/pool rebuild input     | `FollowerCountSnapshot` for one typed target                                | canonical `countByEntityTypeAndEntityId` query                     |
| Legacy and canonical REST   | the same application favorite service                                       | isolated v1 mapper and generated v2 API mapper remain unchanged    |

`FavoriteEntity`, `FavoriteRepository`, `FavoritePersistenceMapper`, and `JpaFavoriteStore` now live together under
`favorite/persistence`. The JPA entity name remains `UserFavorite`, the table remains `user_favorites`, and the account
relation remains the existing `favorites` collection. Persistence types no longer cross into favorite application
services or either REST adapter.

## Canonical Transition And Projection Parity

The `(userId, entityType, entityId)` row remains authoritative. Follow resolves the Auth0 subject to one local account,
checks the retained unique tuple, inserts only when absent, then invokes the type-specific synchronous count adapter
and records the notification fact in the existing outbox. Unfollow deletes the same tuple, returns immediately when
absent, then invokes the count adapter and outbox in the same order. Missing users still fail before favorite or
projection work.

`FavoriteProjectionCoordinator` receives only effective canonical changes. An existing follow and absent unfollow
therefore remain complete projection-free no-ops. The coordinator makes team and pool counts and notification rows
explicit derived consumers while preserving the exact team/pool generated-client calls and the exact retained-v1 plus
canonical-v2 outbox facts. Generated REST, downstream client, and event models remain confined to their current
adapters.

The database unique constraint still owns concurrent duplicate detection. The previously undocumented race outcome is
not silently changed: this structural slice does not translate a concurrent insert conflict into a new response or
claim distributed exactly-once behavior.

## Rebuild And Reconciliation Boundary

`FavoriteProjectionSource` exposes two bounded, read-only desired-state inputs:

- one user's immutable set of typed favorite targets for the existing notification per-user rebuild operation; and
- one target's canonical follower count for controlled team or pool comparison and repair.

These inputs make the authoritative state independently queryable without exposing JPA rows or adding an HTTP route,
listener, scheduler, queue, or repair command. Existing notification insert/delete behavior and its MRG-369 rebuild
operation remain idempotent; MRG-372 event-ID deduplication remains unchanged.

The live team and pool transports still apply increment/decrement operations because the approved architecture keeps
the synchronous counter path active until cross-service divergence evidence and reconciliation parity are proven.
Those downstream counters do not gain an invented membership table, set-count API, listener, or automatic repair in
this slice. A production reconciliation run remains blocked by the MRG-258 live divergence unknown and the MRG-304
deployment/traffic gates.

## Persistence, Compatibility, And Deferred Scope

Flyway V1 through V5, `users`, `user_favorites`, and `event_outbox` are unchanged. Table names, columns, constraints,
indexes, foreign keys, enum strings, callbacks, cascade/orphan behavior, query filters, ordering, pagination, numeric
identifiers, and timestamps remain compatible. There is no migration or data rewrite.

Both REST versions keep their current routes, scopes, status/error bodies, query names, unpaged legacy shape, stable
canonical page, and telemetry. Team/pool URLs, forwarded authentication, generated clients, event routes, queues,
headers, shared event identity, retry, acknowledgement, DLQ, outbox cleanup, and notification listener defaults remain
unchanged.

MRG-426 remains the exclusive owner of account-deletion plans, storage retention/compensation, transaction redesign,
and deletion-related event/outbox orchestration. Production v1 retirement and any live repair, deployment, cutover,
broker operation, or MRG-9xx/MRG-1000 work remain outside this active goal.

## Verification And Rollback

Focused users-service tests cover effective/no-op transitions, local/team-or-pool/notification ordering, stable page
ordering and exact metadata, persistence ownership and mapping, generated client adapters, outbox mapping, canonical
snapshots, missing users, and both REST shapes. Validation commands:

```text
mvn -f apps/backend/pom.xml -pl users-service -am -Dtest='!UsersApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only users-service image revert. The existing database rows, Flyway history, generated clients,
team/pool services, notification service, outbox rows, Rabbit topology, callers, environment values, deployment, and
production authority remain compatible with the previous image.
