# MRG-370 Match Event Contract Migration

- Status: implemented in the monorepo shadow baseline
- Authority: MRG-315 approved event-contract decision and MRG-304 coexistence matrix
- Active contract routes: `match.finished.v2` and `match.live-link-created.v2`
- Production effect: none; no deployment or traffic cutover is authorized

## Purpose

MRG-370 adds the audited match-finished and live-link-created family to the fixed AsyncAPI and Modelina foundation.
Matches-service remains the producer, notification-service remains the only proven consumer and only Q-14/Q-15 v2
queue owner, and existing v1 behavior remains the operational path. The task adds two explicit event types, two
payloads, two generated envelopes, dormant publisher and consumer mappings, v2 queue declarations, and golden JSON.

The task does not change the MRG-315 envelope, parser or generator pins, Java record form/package, exchanges, route
names, queue ownership, acknowledgement mode, retry/requeue behavior, or DLQ policy. It does not add an outbox, emit
a v2 message, or activate a v2 side-effect listener. MRG-372 retains exclusive ownership of those runtime changes and
the paused traffic switch.

## Contract And Identity Boundary

| Route                        | Event type                | Required payload                                 | Ordering key      |
| ---------------------------- | ------------------------- | ------------------------------------------------ | ----------------- |
| `match.finished.v2`          | `MATCH_FINISHED`          | `matchId`, `teamIdA`, `teamIdB`, `poolId`, `set` | `match:{matchId}` |
| `match.live-link-created.v2` | `MATCH_LIVE_LINK_CREATED` | `matchId`, `teamIdA`, `teamIdB`, `poolId`        | `match:{matchId}` |

The four identifiers are positive `int64` values. The v2 payload renames legacy `id` to role-specific `matchId` but
preserves every fact consumed by notification-service. `set` is required and non-blank because the production
finished-event path is entered only when the scraper transition supplies a set. `producer` is `matches-service`,
`schemaVersion` is `2.0.0`, and `aggregateVersion` remains absent: the audited match publication path exposes no
proven monotonic aggregate version.

Both facts use the match-scoped ordering key. This records the strongest ordering identity available without claiming
global ordering, single-active-consumer semantics, or an aggregate version that does not exist.

## Publisher And Consumer Mappings

Matches-service maps its existing `MatchFinishedEventInput` and `MatchLiveLinkCreatedEventInput` plus future outbox
metadata to the generated records. The mapper validates positive identifiers, finished-set presence, event identity,
occurrence time, and correlation-ID shape. It supplies the fixed producer, schema version, route-specific type, null
aggregate version, and match ordering key. It is not called by the retained direct v1 `EventPublisher`.

Notification-service maps each generated record immediately to a wire-independent application command. It rejects a
wrong producer, schema version, type, ordering key, identifier, missing event identity/time, blank set, or an invented
aggregate version. No generated wire record enters notification persistence or delivery code, and neither mapping
causes a Rabbit side effect.

## Acknowledgement, Retry, And Compatibility

The v1 Q-14/Q-15 listeners continue to use plain `@RabbitListener` declarations with the default Spring Boot
container factory. No manual acknowledgement, listener-specific retry/backoff, requeue override, concurrency policy,
or error handler is introduced. The existing notification queues retain their legacy DLX arguments and side effects.

The new v2 queues deliberately mirror the approved Q-14/Q-15 successor names, lifecycle exchange, `.v2` routing keys,
DLQ names, DLX, and `.dlq.v2` bindings from MRG-304. Notification-service alone declares them; matches-service declares
no notification queue. Because there is no v2 listener and no v2 publisher, repository declaration is inert with
respect to notification delivery.

The copied v1 payload classes, direct publisher, test endpoints, listeners, JSON conversion, transaction-relative
publication order, and exception behavior remain unchanged. Direct dual-publish is still forbidden.

## Rollback

Before MRG-372, rollback is a repository/image rollback: retain all v1 runtime code and remove the unused v2 queue
declarations, mappings, contract sources, bundles, fixtures, and generated records. No message migration or broker
drain is required because this slice does not publish or consume v2 traffic.

After MRG-372, rollback must use the MRG-304 sequence: pause matches publication, drain v2, stop the v2 notification
consumers, restore the Q-14/Q-15 v1 consumers, and resume the transactional outbox. v1 and v2 side-effect consumers
may never run concurrently.

## Verification Evidence

- All local-reference AsyncAPI sources and nine resolved bundles parse and contain no remote references.
- The catalog contains twelve messages, twenty-four schemas, twelve event envelopes, all eleven routes, and all
  nineteen queue dispositions.
- Twenty-three generated Java files compile: twenty-two framework-free records plus the twelve-value `EventType` enum.
- Two golden fixtures lock exact audited facts, camelCase bodies, AMQP properties, stable headers, match ordering keys,
  null aggregate versions, and no `__TypeId__` metadata.
- Contract tests prove all ten approved routes and fourteen primary queues are active; EV-TPD and Q-11 through Q-13
  plus Q-16/Q-17 remain excluded.
- Focused matches and notification tests prove producer mapping, consumer validation, notification-owned topology,
  and retained default-acknowledgement v1-only side-effect listeners.

## Closed Scope

- No outbox, v2 publication, v2 listener, event-ID deduplication, acknowledgement/retry/requeue change, traffic switch,
  deployment, broker operation, or production change.
- No REST, BFF, Expo, scraper, standalone repository, Maaatch, database-schema, or persistence change.
- No MRG-9xx or MRG-1000 work is planned, authorized, executed, or published.
