# MRG-369 Favorite And Follow Event Contract Migration

- Status: implemented in the monorepo shadow baseline
- Authority: MRG-315 approved event-contract decision and MRG-304 coexistence matrix
- Active contract routes: `team.follow.v2` and `pool.follow.v2`
- Production effect: none; no deployment or traffic cutover is authorized

## Purpose

MRG-369 adds the audited favorite/follow family to the fixed AsyncAPI and Modelina foundation created by MRG-350.
Users-service remains the canonical favorite owner and notification-service remains the only proven event consumer.
The contract adds four explicit facts, two route-specific payloads, four generated envelopes, publisher and consumer
adapter mappings, notification-owned v2 queue declarations, golden JSON, and an idempotent rebuild boundary for the
derived notification projection.

The task does not change AsyncAPI version, dependency pins, generator configuration, Java package/form, envelope,
schema-version policy, AMQP metadata, exchanges, route names, or queue ownership. It does not start v2 publication or
a v2 side-effect listener. MRG-372 still owns the users transactional outbox, shared v1/v2 event ID, publication,
consumer deduplication, and paused traffic switch.

## Contract And Identity Boundary

| Route            | Event types                        | Payload            | Ordering key                  |
| ---------------- | ---------------------------------- | ------------------ | ----------------------------- |
| `team.follow.v2` | `TEAM_FOLLOWED`, `TEAM_UNFOLLOWED` | `userId`, `teamId` | `user:{userId}:team:{teamId}` |
| `pool.follow.v2` | `POOL_FOLLOWED`, `POOL_UNFOLLOWED` | `userId`, `poolId` | `user:{userId}:pool:{poolId}` |

All payload identifiers are required positive `int64` values. The payload omits the legacy `entityType` because the
route and route-specific target field already own that meaning; a contradictory route/body pair is therefore not
representable. The action is the generated event-contract-owned `EventType`, replacing the copied legacy
`CREATED`/`DELETED` vocabulary only on v2. `producer` is `users-service`, `schemaVersion` is `2.0.0`, and
`aggregateVersion` is absent because favorites currently expose no proven monotonic aggregate version.

Four named envelopes are generated rather than sharing one envelope between action messages. This follows the
MRG-315 event-specific record rule and avoids generator-created anonymous schemas. The two payload records are shared
only within their route family.

## Publisher And Consumer Mappings

Users-service maps validated application facts plus future outbox metadata to the generated records. The mapper
requires positive local user and target IDs, exact entity/action agreement, one supplied event UUID and occurrence
time, and the fixed ordering key. It is not called by the retained direct v1 publisher and performs no Rabbit action.

Notification-service maps each generated record immediately to a wire-independent projection command. It rejects an
unsupported schema version, unexpected producer, wrong route-specific event type, non-positive identifier, missing
event identity/time, or ordering-key/payload mismatch. No generated record crosses into persistence or notification
delivery code.

The existing v1 `UserFollowEvent`, `CREATED`/`DELETED` listeners, routes, converter behavior, and side effects remain
unchanged. Direct dual-publish remains forbidden. The future MRG-372 outbox is the only authorized path that may call
the v2 publisher mapping and add the shared `x-blockout-event-id` to v1.

## Projection And Reconciliation

The existing `(entityType, entityId, userId)` unique key, existence check, insert conflict handling, and delete count
retain idempotent follow/unfollow behavior. Both wire versions can map to the same validated application command, but
only v1 listeners are active in this slice.

Notification-service also exposes a transactional per-user rebuild operation. It compares the current derived rows
with a supplied canonical favorite snapshot, removes stale rows, inserts missing rows, leaves matching rows untouched,
and logs before/after counts without payload data. This makes the projection rebuildable without inventing a scheduler
or bypassing users-service authority. MRG-425 still owns deeper end-to-end reconciliation orchestration and lifecycle
restructuring; MRG-372 owns event-ID deduplication.

## Topology, Compatibility, And Rollback

The AsyncAPI route and queue ledger activates only `EV-TF`, `EV-PF`, Q-18, and Q-19 for this family. Notification-service
owns `team.follow.queue.notifications.v2`, `pool.follow.queue.notifications.v2`, and their `.dlq.v2` queues/bindings.
No Q-16 or Q-17 successor exists, and teams-service and pools-service gain no v2 follow queue or listener. Match routes,
Q-14, and Q-15 remain deferred to MRG-370.

Repository configuration can declare the approved v2 notification queues, but no v2 listener consumes them and
users-service emits no v2 message. A later production switch remains gated by the mandatory broker snapshot and the
MRG-304 pause/drain/stop-v1/start-v2/resume sequence. v1 and v2 side-effect listeners may never run concurrently.

Rollback before MRG-372 is a repository/image rollback: retain the v1 publisher/listeners and remove the unused v2
queue declarations, mappings, and contract additions. After MRG-372, rollback must pause users publication, drain v2,
stop v2 notification consumption, restore Q-18/Q-19 v1 listeners, and resume the outbox exactly as MRG-304 requires.
No production deletion or v1 retirement is authorized here.

## Verification Evidence

- All local-reference AsyncAPI sources and nine resolved bundles parse and contain no remote references.
- The catalog contains ten messages, twenty schemas, ten event envelopes, all eleven routes, and all nineteen queues.
- Nineteen generated Java files compile: eighteen framework-free records plus the ten-value `EventType` enum.
- Four favorite golden fixtures lock camelCase bodies, positive numeric IDs, AMQP properties, stable headers, ordering
  keys, absent aggregate-version headers, and no `__TypeId__`.
- Contract tests prove only eight routes and twelve approved primary queues are active; EV-TPD and Q-11 through Q-13
  plus Q-16/Q-17 remain excluded.
- Focused users and notification tests prove producer mapping, consumer validation, v2 topology, idempotent commands,
  canonical rebuild behavior, and retained v1-only side-effect listeners.
- All 47 notification and 42 users tests pass, as do the complete fifteen-module backend compile and isolated
  event-contract model compilation.

## Closed Scope

- No outbox, v2 publication, v2 side-effect listener, event-ID deduplication, retry/requeue change, traffic switch,
  deployment, or broker operation.
- No synchronous team/pool counter replacement and no Q-16/Q-17 successor.
- No match/live event, REST, BFF, Expo, scraper, standalone repository, Maaatch, database-schema, or production change.
- No MRG-9xx or MRG-1000 work is planned, authorized, executed, or published.
