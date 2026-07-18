# MRG-428 Notification Consumer And Projection Architecture

- Status: implemented in the monorepo shadow baseline
- Runtime owner: `notification-service`
- Scope: event consumption, transactional deduplication, follower projection, canonical reconciliation inputs,
  acknowledgement, and rollback policy
- Production effect: none

## Purpose

MRG-428 completes the approved Phase MRG-400 restructuring of notification-service after MRG-410 isolated inbox and
token persistence and MRG-427 isolated delivery decisions, the send ledger, and the Expo adapter. It gives event
claims and follower projection updates role-owned application contracts, makes duplicate and collision outcomes
explicit, and turns the existing per-user rebuild behavior into a bounded reconciliation operation.

This is a structural and local-consistency slice. It does not acquire canonical favorites remotely, add a repair
route, start a scheduler, operate a queue, replay an event, purge a ledger, change retry/requeue settings, or execute
a production reconciliation. Users-service remains the canonical favorite owner and its MRG-425 snapshot boundary
remains the required source of desired state.

## Ownership

| Concern                         | Application owner                                                   | Adapter owner                                     |
| ------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| Event application boundary      | `EventConsumption` and `ConsumedEventAction`                        | four v1/v2 Rabbit listener pairs                  |
| Event identity and result       | immutable `ConsumedEventIdentity`, claim, and result enums          | v1 header and validated v2 body/header mapping    |
| Transactional event claim       | `ConsumedEventProcessor` and `ConsumedEventStore`                   | `JdbcConsumedEventStore`                          |
| Canonical metadata validation   | no generated record beyond inbound mapping                          | `events.inbound.V2EventMetadataValidator`         |
| Favorite fact consumption       | `FollowerProjectionConsumer` and validated projection command       | team/pool v1 and v2 listeners                     |
| Projection mutation             | `FollowerProjectionApplicationService` and explicit mutation result | `JpaFollowerProjectionStore`                      |
| Canonical reconciliation        | snapshot, reconciler, and reconciliation result                     | snapshot acquisition intentionally remains absent |
| Projection rows and uniqueness  | no JPA exposure                                                     | entity, repository, and atomic SQL in persistence |
| Rabbit acknowledgement boundary | successful return or escaped failure                                | explicit `AUTO` on all eight listener endpoints   |

Rabbit listeners depend on application roles rather than the concrete processor, reconciliation service, JPA
entity, Spring Data repository, or JDBC adapter. A favorite listener can apply one event command but cannot invoke
the broader reconciliation operation accidentally.

## Transactional Deduplication And Identity

`ConsumedEventProcessor` claims a V7 `consumed_event` marker and runs the local database side effect in the same Spring
transaction. A new UUID returns `APPLIED`; the same UUID and event type returns `DUPLICATE` across v1 and v2 and does
not execute the effect again. Reusing a UUID for a different event type throws
`ConsumedEventIdentityCollisionException` instead of acknowledging a corrupt fact as an ordinary duplicate.

The JDBC adapter retains `INSERT ... ON CONFLICT (event_id) DO NOTHING`. On conflict it reads only the stored event
type needed to distinguish a valid cross-wire duplicate from an identity collision. `wire_version` remains recorded
for observation but does not divide identity: one logical event UUID still converges across its v1 and v2 copies.

Legacy backlog messages without `x-blockout-event-id` still execute through the logged compatibility path and cannot
be deduplicated. A present malformed v1 UUID fails. Canonical v2 continues to require matching body event ID, AMQP
message ID, type, timestamp, producer, schema version, ordering key, correlation ID, aggregate-version metadata, and
`x-blockout-event-id`, while rejecting `__TypeId__`.

The local transaction does not create distributed exactly-once delivery. Match consumers still call Expo inside the
transaction; a provider acceptance followed by process or commit failure can still lead to a provider-level duplicate
on retry. No receipt, provider idempotency key, or compensation is inferred.

## Follower Projection And Reconciliation

`FollowerProjectionApplicationService` receives only validated, wire-independent commands. Follow uses one atomic
`INSERT ... ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING`; unfollow uses the same typed unique tuple and
delete count. Each operation returns `APPLIED` or `UNCHANGED`, so repeated and concurrently delivered facts converge
without an existence-check race.

`FollowerProjectionSnapshot` owns one positive user ID and an immutable set of canonical team/pool targets.
`FollowerProjectionReconciler` compares that desired state with the bounded notification-owned rows, removes stale
targets, inserts missing targets, retains matching targets, and returns the exact added, removed, and retained sets.
An already aligned snapshot is a complete no-op.

The operation deliberately does not know how to fetch the snapshot. MRG-425 exposes the users-service canonical
source, but there is no approved route, generated client operation, scheduled job, admin command, bulk scan, lock,
watermark, or production divergence inventory connecting the two. Rebuildability is therefore an explicit safe
application capability, not a claim that live reconciliation now runs.

`FollowerProjectionEntity`, its repository, and the JPA store now live together under `followers.persistence`.
They retain JPA entity name `FollowersProjection`, table `followers_projection`, all columns, enum strings, indexes,
the three-column unique constraint, populated timestamps, callbacks, and generated identity. The native idempotent
insert supplies the same application-local timestamps and changes no physical schema.

## Acknowledgement, Failure, And Rollback Policy

All eight retained v1/v2 listener methods explicitly declare Rabbit `AUTO` acknowledgement while keeping their
existing queues and activation flags. The application outcomes map to the container boundary as follows:

- `APPLIED` returns normally after the event claim and local effect commit, so the delivery is acknowledged;
- `DUPLICATE` returns normally without a second side effect, so the duplicate is acknowledged;
- validation failure, event-ID collision, persistence failure, or uncaught side-effect failure escapes the listener,
  rolling back the local marker and database effect before the container handles the unsuccessful delivery.

No listener container factory, retry interceptor, requeue default, prefetch, concurrency, dead-letter exchange,
routing key, queue argument, or broker policy is changed or asserted beyond committed configuration. Actual broker
depth, unacknowledged deliveries, policies, and external consumers remain production evidence gates under MRG-304.

Rollback is code-only and must not delete `consumed_event` or `followers_projection`. Keeping the consumer ledger lets
the previous image continue to suppress already processed shared event IDs. Before any separately authorized v1/v2
traffic switch, rollback still requires the MRG-304 pause, drain, stop, restore-one-wire, verify, and resume sequence.

## Compatibility And Closed Scope

Flyway V1 through V7, physical tables, rows, indexes, constraints, REST and event contracts, generated artifacts,
exchanges, routes, queues, DLQs, activation defaults, outbox behavior, inbox delivery, credentials, environment
values, callers, deployment, production, and Maaatch are unchanged. No data rewrite, broker operation, event replay,
canonical snapshot request, repair execution, retention cleanup, deploy, or traffic cutover occurs.

Production v1 retirement, live reconciliation, deployment, and every MRG-9xx/MRG-1000 action remain outside this
active goal.

## Verification

Focused notification tests cover cross-wire duplicates, corrupt identity collisions, legacy no-ID compatibility,
escaped side-effect failures, JDBC claim decisions, explicit AUTO acknowledgement, listener dependency boundaries,
atomic follower inserts, idempotent follow/unfollow, canonical add/remove/retain reconciliation, aligned no-ops,
bounded persistence mapping, exact JPA identities/tables/constraints, canonical decoders, topology, delivery, inbox,
and token compatibility. Validation commands:

```text
mvn -f apps/backend/pom.xml -pl notification-service -am -Dtest='!NotificationsApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```
