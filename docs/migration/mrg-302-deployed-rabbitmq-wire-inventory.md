# MRG-302 — Deployed RabbitMQ Wire Inventory

- Inventory date: 2026-07-17
- Source commit: `7af7714f30435867f53b1ac9335b94ef44438ca6`
- Scope: every Blockout-owned RabbitMQ exchange, routing key, queue, binding, publisher, listener, and event payload in the monorepo
- Runtime mutation: none
- Contract authority: none; this is discovery evidence for MRG-304, MRG-315, MRG-350, and MRG-369 through MRG-372

## Purpose And Evidence Boundary

This inventory freezes the current asynchronous wire independently from REST and OpenAPI. It reconciles the service
audits from MRG-253 through MRG-262 with every current RabbitMQ configuration, publisher, listener, event class, and
committed Spring property.

The checked-out source declares:

| Item                                 | Count | Evidence boundary                                                                 |
| ------------------------------------ | ----: | --------------------------------------------------------------------------------- |
| Unique topic exchanges               |     4 | all durable, non-auto-delete by constructor defaults                              |
| Producer routing keys                |    11 | nine lifecycle keys and two follow keys                                           |
| Dead-letter routing keys             |    10 | eight lifecycle DLQ keys and two follow DLQ keys                                  |
| Unique durable primary queues        |    19 | 14 with listeners and five without listeners                                      |
| Unique durable dead-letter queues    |    10 | no application listener consumes any DLQ                                          |
| Unique queue-to-exchange bindings    |    29 | one binding per unique queue                                                      |
| Publisher methods                    |    10 | one dynamic follow publisher emits two keys                                       |
| `@RabbitListener` methods            |    14 | four service cascade, four notification, and six search-worker listeners          |
| Routed Java event-class copies       |    25 | ten payload families copied across producer and consumer modules                  |
| Misnamed internal event-like classes |     1 | worker `DivisionUpsertEvent` is an in-memory cache shape, not a RabbitMQ contract |

The topology tables describe what the applications attempt to declare. No production broker export, management API,
message capture, external consumer inventory, queue depth, policy, or vhost evidence is available in this checkout.
Those deployed facts remain `UNKNOWN` and must be closed before MRG-304 approves rollout or rollback.

Payload bodies and producer headers were verified offline against the compiled production event classes and the exact
no-argument `Jackson2JsonMessageConverter` from Spring AMQP 3.2.5. This proves converter output without connecting to or
mutating a broker. It does not prove that every deployed message was produced by this commit or that external broker
policies did not add headers or override queue behavior.

REST operations remain owned by [MRG-301](mrg-301-deployed-rest-wire-inventory.md). Handwritten HTTP clients and casing
conversions remain MRG-303. MRG-315 must select the authoritative event-contract format without representing these
messages as fake OpenAPI endpoints.

## Exchange Inventory

Every exchange is a `TopicExchange` created with the Spring constructor defaults: durable and non-auto-delete. No
alternate exchange, delayed-message plugin, exchange argument, publisher-confirm policy, or exchange-level schema is
declared.

| ID       | Exchange                        | Declared by                                                            | Current role                                                    |
| -------- | ------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `EX-LC`  | `entity.lifecycle.exchange`     | clubs, teams, pools, competition, matches, notification, search-worker | entity search projection, deactivation, and match notifications |
| `EX-UF`  | `user.follow.exchange`          | users, teams, pools, notification                                      | team and pool favorite/follow changes                           |
| `EX-LD`  | `entity.lifecycle.dlq.exchange` | notification, search-worker                                            | dead-letter routing for search and match notification queues    |
| `EX-UFD` | `user.follow.dlq.exchange`      | notification                                                           | dead-letter routing for notification follow queues              |

All eight Rabbit-enabled applications configure only host, port, username, and password. No committed virtual-host,
TLS, heartbeat, connection timeout, publisher confirm, publisher return, mandatory publish, or channel transaction
setting exists. `config-service` retains the AMQP starter dependency but declares no RabbitMQ topology, producer, or
consumer. Reports, search reads, and the mobile gateway have no RabbitMQ boundary.

## Producer Route Inventory

`Primary queues` lists every binding receiving the route. A queue marked `NO LISTENER` is declared and bound but has no
current application consumer. A route with only such a queue has no proven runtime effect beyond broker retention.

| ID       | Producer / current trigger                                                                                          | Exchange / routing key              | Payload family                | Primary queues / active consumers                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `EV-CU`  | clubs-service after create or update/reactivation save                                                              | `EX-LC` / `club.upsert`             | `ClubUpsertEvent`             | `club.upsert.queue.search` → search-worker                                                                                              |
| `EV-TU`  | teams-service after create or update/reactivation save                                                              | `EX-LC` / `team.upsert`             | `TeamUpsertEvent`             | `team.upsert.queue.search` → search-worker                                                                                              |
| `EV-PU`  | pools-service after create or update/reactivation save                                                              | `EX-LC` / `pool.upsert`             | `PoolUpsertEvent`             | `pool.upsert.queue.search` → search-worker                                                                                              |
| `EV-CD`  | competition-service cascade when no active association remains for a club                                           | `EX-LC` / `club.deactivation`       | `ClubDeactivationEvent`       | `club.deactivation.queue.clubs` → clubs; `club.deactivation.queue.teams` → teams; `club.deactivation.queue.search` → worker             |
| `EV-TD`  | competition-service cascade when no active association remains for a team                                           | `EX-LC` / `team.deactivation`       | `TeamDeactivationEvent`       | `team.deactivation.queue.teams` → teams; `team.deactivation.queue.search` → worker; `team.deactivation.queue.matches` → **NO LISTENER** |
| `EV-PD`  | competition-service cascade when no active association remains for a pool                                           | `EX-LC` / `pool.deactivation`       | `PoolDeactivationEvent`       | `pool.deactivation.queue.pools` → pools; `pool.deactivation.queue.search` → worker; `pool.deactivation.queue.matches` → **NO LISTENER** |
| `EV-TPD` | competition-service for each removed team/pool association                                                          | `EX-LC` / `teambypool.deactivation` | `TeamDeactivationByPoolEvent` | `teambypool.deactivation.queue.matches` → **NO LISTENER; no active monorepo consumer**                                                  |
| `EV-MF`  | matches-service when an upcoming match first receives a set; two scoped internal test endpoints can also publish it | `EX-LC` / `match.finished`          | `MatchFinishedEvent`          | `match.finished.queue.notifications` → notification                                                                                     |
| `EV-ML`  | matches-service after a non-finished match receives a new active live link                                          | `EX-LC` / `match.live-link-created` | `MatchLiveLinkCreatedEvent`   | `match.live-link-created.queue.notifications` → notification                                                                            |
| `EV-TF`  | users-service after team favorite create/delete and during user deletion                                            | `EX-UF` / `team.follow`             | `UserFollowEvent`             | `team.follow.queue.notifications` → notification; `team.follow.queue.teams` → **NO LISTENER**                                           |
| `EV-PF`  | users-service after pool favorite create/delete and during user deletion                                            | `EX-UF` / `pool.follow`             | `UserFollowEvent`             | `pool.follow.queue.notifications` → notification; `pool.follow.queue.pools` → **NO LISTENER**                                           |

The users publisher derives the routing key as `entityType.name().toLowerCase() + ".follow"`; the current enum permits
only `TEAM` and `POOL`. Consumers trust the queue binding. Notification follow listeners do not reject a contradictory
or null `entityType`, and they silently ignore an unknown or null `eventType`.

## Primary Queue And Binding Inventory

All primary queues are durable. `DLX → key` records queue arguments, not an application retry guarantee. `none` means
the queue has no dead-letter arguments, TTL, maximum length, overflow policy, or alternate failure destination.

| ID     | Queue                                         | Exchange / binding key              | Declared by              | DLX → key                           | Listener / acknowledgement profile |
| ------ | --------------------------------------------- | ----------------------------------- | ------------------------ | ----------------------------------- | ---------------------------------- |
| `Q-01` | `club.upsert.queue.search`                    | `EX-LC` / `club.upsert`             | search-worker            | `EX-LD` → `club.upsert.dlq`         | worker batch manual                |
| `Q-02` | `club.deactivation.queue.search`              | `EX-LC` / `club.deactivation`       | search-worker            | `EX-LD` → `club.deactivation.dlq`   | worker default                     |
| `Q-03` | `team.upsert.queue.search`                    | `EX-LC` / `team.upsert`             | search-worker            | `EX-LD` → `team.upsert.dlq`         | worker batch manual                |
| `Q-04` | `team.deactivation.queue.search`              | `EX-LC` / `team.deactivation`       | search-worker            | `EX-LD` → `team.deactivation.dlq`   | worker default                     |
| `Q-05` | `pool.upsert.queue.search`                    | `EX-LC` / `pool.upsert`             | search-worker            | `EX-LD` → `pool.upsert.dlq`         | worker batch manual                |
| `Q-06` | `pool.deactivation.queue.search`              | `EX-LC` / `pool.deactivation`       | search-worker            | `EX-LD` → `pool.deactivation.dlq`   | worker default                     |
| `Q-07` | `club.deactivation.queue.clubs`               | `EX-LC` / `club.deactivation`       | clubs-service            | none                                | clubs default                      |
| `Q-08` | `team.deactivation.queue.teams`               | `EX-LC` / `team.deactivation`       | teams-service            | none                                | teams default                      |
| `Q-09` | `club.deactivation.queue.teams`               | `EX-LC` / `club.deactivation`       | teams-service            | none                                | teams default                      |
| `Q-10` | `pool.deactivation.queue.pools`               | `EX-LC` / `pool.deactivation`       | pools-service            | none                                | pools default                      |
| `Q-11` | `team.deactivation.queue.matches`             | `EX-LC` / `team.deactivation`       | matches-service          | none                                | **NO LISTENER**                    |
| `Q-12` | `pool.deactivation.queue.matches`             | `EX-LC` / `pool.deactivation`       | matches-service          | none                                | **NO LISTENER**                    |
| `Q-13` | `teambypool.deactivation.queue.matches`       | `EX-LC` / `teambypool.deactivation` | matches-service          | none                                | **NO LISTENER**                    |
| `Q-14` | `match.finished.queue.notifications`          | `EX-LC` / `match.finished`          | matches and notification | conflicting declarations; see below | notification default               |
| `Q-15` | `match.live-link-created.queue.notifications` | `EX-LC` / `match.live-link-created` | matches and notification | conflicting declarations; see below | notification default               |
| `Q-16` | `team.follow.queue.teams`                     | `EX-UF` / `team.follow`             | teams-service            | none                                | **NO LISTENER**                    |
| `Q-17` | `pool.follow.queue.pools`                     | `EX-UF` / `pool.follow`             | pools-service            | none                                | **NO LISTENER**                    |
| `Q-18` | `team.follow.queue.notifications`             | `EX-UF` / `team.follow`             | notification             | `EX-UFD` → `team.follow.dlq`        | notification default               |
| `Q-19` | `pool.follow.queue.notifications`             | `EX-UF` / `pool.follow`             | notification             | `EX-UFD` → `pool.follow.dlq`        | notification default               |

### Conflicting Notification Queue Declarations

`matches-service` declares Q-14 and Q-15 as plain durable queues with no arguments. `notification-service` declares
the same names as durable queues with `x-dead-letter-exchange=entity.lifecycle.dlq.exchange` and the corresponding
dead-letter routing key. These are not equivalent queue declarations. Which application can start depends on the
existing broker definition and declaration order; the inequivalent declaration can be rejected by RabbitMQ. The
duplicate bindings themselves are equivalent, but they do not remove the queue-argument conflict.

MRG-302 records the conflict and does not repair it. MRG-304 must establish the deployed queue arguments and safe
ownership/cutover sequence before MRG-350 changes topology.

## Dead-Letter Queue And Routing Inventory

All DLQs are durable and have no consumer, TTL, length limit, parking-lot workflow, replay command, or purge policy in
source. Their presence is retention infrastructure, not an implemented retry strategy.

| ID       | Dead-letter queue                                 | Dead-letter exchange / binding key      | Declared by   | Source primary queue |
| -------- | ------------------------------------------------- | --------------------------------------- | ------------- | -------------------- |
| `DLQ-01` | `club.upsert.queue.search.dlq`                    | `EX-LD` / `club.upsert.dlq`             | search-worker | Q-01                 |
| `DLQ-02` | `club.deactivation.queue.search.dlq`              | `EX-LD` / `club.deactivation.dlq`       | search-worker | Q-02                 |
| `DLQ-03` | `team.upsert.queue.search.dlq`                    | `EX-LD` / `team.upsert.dlq`             | search-worker | Q-03                 |
| `DLQ-04` | `team.deactivation.queue.search.dlq`              | `EX-LD` / `team.deactivation.dlq`       | search-worker | Q-04                 |
| `DLQ-05` | `pool.upsert.queue.search.dlq`                    | `EX-LD` / `pool.upsert.dlq`             | search-worker | Q-05                 |
| `DLQ-06` | `pool.deactivation.queue.search.dlq`              | `EX-LD` / `pool.deactivation.dlq`       | search-worker | Q-06                 |
| `DLQ-07` | `match.finished.queue.notifications.dlq`          | `EX-LD` / `match.finished.dlq`          | notification  | Q-14                 |
| `DLQ-08` | `match.live-link-created.queue.notifications.dlq` | `EX-LD` / `match.live-link-created.dlq` | notification  | Q-15                 |
| `DLQ-09` | `team.follow.queue.notifications.dlq`             | `EX-UFD` / `team.follow.dlq`            | notification  | Q-18                 |
| `DLQ-10` | `pool.follow.queue.notifications.dlq`             | `EX-UFD` / `pool.follow.dlq`            | notification  | Q-19                 |

Broker-generated dead-letter headers such as rejection history, redelivery state, and original routing information
were not captured. Their exact deployed form and any broker policy are `UNKNOWN`.

## Serialized Payload Registry

The body examples below are exact outputs from compiled current producer classes using the current no-argument
converter. Numeric values and strings are illustrative; key spelling, enum spelling, and field order reflect the
current converter probe. Field order is not a compatibility guarantee.

| Event ID | Java payload owner and fields                                                                                                   | Verified JSON example                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EV-CU`  | clubs `ClubUpsertEvent`: `id:String`, `name:String`, `logoUrl:String`, `city:String`                                            | `{"id":"club-1","name":"Club","logoUrl":"https://logo","city":"Paris"}`                                                                              |
| `EV-TU`  | teams `TeamUpsertEvent`: `id:Long`, `name`, `shortName`, `clubId`, `divisionId`, `format`, `gender`, `season`, `logoUrl`        | `{"id":2,"name":"Team","shortName":"TM","clubId":"club-1","divisionId":3,"format":"SIX","gender":"M","season":"2026","logoUrl":"https://team-logo"}` |
| `EV-PU`  | pools `PoolUpsertEvent`: `id:Long`, `name`, `shortName`, `divisionId`, `leagueCode`, `leagueName`, `season`, `format`, `gender` | `{"id":4,"name":"Pool","shortName":"P","divisionId":3,"leagueCode":"L","leagueName":"League","season":"2026","format":"SIX","gender":"F"}`           |
| `EV-CD`  | competition `ClubDeactivationEvent`: `clubId:String`                                                                            | `{"clubId":"club-1"}`                                                                                                                                |
| `EV-TD`  | competition `TeamDeactivationEvent`: `teamId:Long`                                                                              | `{"teamId":2}`                                                                                                                                       |
| `EV-PD`  | competition `PoolDeactivationEvent`: `poolId:Long`                                                                              | `{"poolId":4}`                                                                                                                                       |
| `EV-TPD` | competition `TeamDeactivationByPoolEvent`: `teamId:Long`, `poolId:Long`                                                         | `{"teamId":2,"poolId":4}`                                                                                                                            |
| `EV-MF`  | matches `MatchFinishedEvent`: `id`, `teamIdA`, `teamIdB`, `poolId:Long`, `set:String`                                           | `{"id":5,"teamIdA":2,"teamIdB":6,"poolId":4,"set":"2-1"}`                                                                                            |
| `EV-ML`  | matches `MatchLiveLinkCreatedEvent`: `id`, `teamIdA`, `teamIdB`, `poolId:Long`                                                  | `{"id":5,"teamIdA":2,"teamIdB":6,"poolId":4}`                                                                                                        |
| `EV-TF`  | users `UserFollowEvent`: `userId:Long`, `entityType:TEAM or POOL`, `entityId:Long`, `eventType:CREATED or DELETED`              | `{"userId":7,"entityType":"TEAM","entityId":2,"eventType":"CREATED"}`                                                                                |
| `EV-PF`  | same users payload family                                                                                                       | `{"userId":7,"entityType":"POOL","entityId":4,"eventType":"DELETED"}`                                                                                |

Every verified body is camelCase. The HTTP `spring.jackson.property-naming-strategy: SNAKE_CASE` setting does not
affect these messages because each Rabbit configuration constructs its own no-argument converter rather than injecting
the Boot HTTP `ObjectMapper`. No event field has `@JsonProperty`, `@JsonAlias`, or a naming-strategy annotation.

Source types do not validate requiredness, and builders can produce null-bearing messages. Null compatibility must be
captured with route-specific golden fixtures before a generated contract rejects or omits any field.

### Current Producer Headers And Properties

The converter probe verifies these properties for all eleven routes:

- `contentType=application/json`;
- `contentEncoding=UTF-8`;
- `deliveryMode=PERSISTENT`;
- a calculated content length;
- `__TypeId__` equal to the producer's fully qualified Java class name.

Examples include `com.blockout.clubs.models.events.ClubUpsertEvent`,
`com.blockout.competitions.models.events.TeamDeactivationEvent`, and
`com.blockout.users.models.events.UserFollowEvent`. Consumers use separately copied classes in different packages, so
the header is implementation-coupled and cannot become schema authority. No event ID, schema version, occurrence time,
producer identity, aggregate version, ordering key, correlation ID, causation ID, trace context, or idempotency key is
set by application code.

## Event-Class Copy Registry

| Payload family                | Current copies                                                  | Wire divergence    | Current disposition                                    |
| ----------------------------- | --------------------------------------------------------------- | ------------------ | ------------------------------------------------------ |
| `ClubUpsertEvent`             | clubs producer; search-worker consumer                          | fields match       | two handwritten copies                                 |
| `TeamUpsertEvent`             | teams producer; search-worker consumer                          | fields/enums match | two handwritten copies                                 |
| `PoolUpsertEvent`             | pools producer; search-worker consumer                          | fields/enums match | two handwritten copies                                 |
| `ClubDeactivationEvent`       | competition producer; clubs, teams, and search-worker consumers | fields match       | four handwritten copies                                |
| `TeamDeactivationEvent`       | competition producer; teams and search-worker consumers         | fields match       | three handwritten copies; matches has no consumer type |
| `PoolDeactivationEvent`       | competition producer; pools and search-worker consumers         | fields match       | three handwritten copies; matches has no consumer type |
| `TeamDeactivationByPoolEvent` | competition producer only                                       | no consumer copy   | route has no active consumer                           |
| `MatchFinishedEvent`          | matches producer; notification consumer                         | fields match       | two handwritten copies                                 |
| `MatchLiveLinkCreatedEvent`   | matches producer; notification consumer                         | fields match       | two handwritten copies                                 |
| `UserFollowEvent`             | users producer; teams, pools, and notification copies           | fields/enums match | four copies; two are unused                            |

The teams, pools, users, and notification copies of `EntityType` all serialize `TEAM|POOL`; their `EventType` copies
serialize `CREATED|DELETED`. Team, pool, and worker copies of `Format` serialize `SIX|FOUR|TWO`, and `Gender` serializes
`M|F|O`. There is no guard preventing one copy from drifting before deployment.

Worker `DivisionUpsertEvent` is created from REST snapshots and retained in an in-memory cache. It is never published,
bound, or consumed through RabbitMQ and is excluded from the 25 routed class copies. Its event-like name does not make
it an asynchronous contract.

## Publisher Failure And Transaction Inventory

| Producer cohort     | Current behavior                                                                                                       | Guarantee not present                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| clubs, teams, pools | publish after repository save inside the surrounding database transaction; catch/log/rethrow `AmqpException`           | no atomic DB/message commit; no outbox or confirm                                  |
| competition         | publish inside transactional deactivation loops; exceptions propagate; several messages may be attempted per request   | no batch atomicity, ordering version, deduplication, or outbox                     |
| matches             | publish within match/live transactions and rethrow `AmqpException`; scoped test endpoints publish outside state change | no confirm/outbox; test route can create notifications without matching transition |
| users               | publish after favorite persistence and downstream counter HTTP calls; user deletion publishes after Auth0 deletion     | no distributed transaction, compensation, outbox, or replay ledger                 |

No `RabbitTemplate` enables channel transactions, mandatory routing, publisher confirms, publisher returns, retry
templates, or correlation data. A successful `convertAndSend` call is therefore not durable publication proof, while a
later database rollback can occur after a message was already sent. Conversely, an application crash after database
commit and before publication loses the event. These gaps are preserved evidence, not behavior to fix during MRG-302.

## Consumer Acknowledgement, Retry, And Idempotency Profiles

| Profile                    | Consumers / queues                                  | Explicit behavior                                                                                                                                                   | Remaining assumption                                                                                |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `BATCH-MANUAL-DLX`         | three search upsert listeners, Q-01/Q-03/Q-05       | batch listener; consumer batches and prefetch 500; receive timeout 2s; manual ack; success `basicAck(lastTag,true)`; caught failure `basicNack(lastTag,true,false)` | whole delivered batch is rejected without requeue and routed to its DLQ; no item isolation or retry |
| `WORKER-DEFAULT-DLX`       | three search deactivation listeners, Q-02/Q-04/Q-06 | default Boot listener factory; exception escapes; queue has DLX                                                                                                     | effective requeue/dead-letter behavior is not explicitly configured or captured                     |
| `NOTIFICATION-DEFAULT-DLX` | four notification listeners, Q-14/Q-15/Q-18/Q-19    | default Boot listener factory; queue is intended to have DLX                                                                                                        | exact retry, requeue, and DLQ transition are not explicitly configured or captured                  |
| `SERVICE-DEFAULT-NO-DLX`   | clubs, teams, pools cascade listeners, Q-07–Q-10    | default Boot listener factory; exception escapes; queue has no DLX                                                                                                  | redelivery behavior is framework-dependent; terminal failures have no declared parking queue        |
| `ORPHAN-PRIMARY`           | Q-11–Q-13, Q-16, Q-17                               | no listener method                                                                                                                                                  | messages remain queued until an external consumer, policy, or operator action intervenes            |
| `PARKED`                   | DLQ-01 through DLQ-10                               | no listener or replay workflow                                                                                                                                      | inspection, retention, replay, and purge are manual/unknown                                         |

No listener reads an application event ID or schema version because none exists. No consumer implements generic
message deduplication. The worker upsert listeners reject all deliveries up to the last tag when any projection call
throws, so one invalid event can dead-letter a batch of up to 500. Deactivation listeners perform no null validation.
Notification match listeners forward every field to orchestration; follow listeners trust route and enum values.

Queue order alone is not sufficient for correctness: multiple producers, redelivery, whole-batch rejection, missing
aggregate versions, and snapshot rebuilds prevent consumers from rejecting stale events. No single-active-consumer,
consumer priority, partitioning, or per-aggregate ordering policy is declared.

## Compatibility And Operational Risk Register

| ID        | Current evidence                                                                                                   | Required owner / later gate                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `RAB-F01` | Q-14 and Q-15 have inequivalent declarations in matches and notification services                                  | MRG-304 deployment evidence; MRG-350 topology migration      |
| `RAB-F02` | five primary queues have no listener; Q-13 has no active consumer anywhere in the monorepo                         | MRG-304 behavior decision; MRG-350/MRG-370 migration         |
| `RAB-F03` | ten DLQs have no replay, retention, purge, or observation workflow                                                 | MRG-304 operations; MRG-350 foundation                       |
| `RAB-F04` | producer Java FQCN is emitted as `__TypeId__`, while consumers compile different class copies                      | MRG-315 contract format; route-specific generated adapters   |
| `RAB-F05` | 25 routed classes duplicate ten payload families and copied enums                                                  | MRG-315, MRG-350, MRG-369, MRG-370                           |
| `RAB-F06` | no event envelope, version, stable ID, time, source, ordering version, correlation, or idempotency evidence exists | MRG-315 decision; MRG-350 foundation                         |
| `RAB-F07` | no producer outbox, confirms, returns, or atomicity; database and message outcomes can diverge                     | MRG-371 and MRG-372                                          |
| `RAB-F08` | effective default-listener retry/requeue behavior is not committed or captured                                     | MRG-304 broker/runtime capture; MRG-350 parity tests         |
| `RAB-F09` | one failed search upsert can dead-letter a batch of 500; no retry or item isolation                                | MRG-350 and MRG-412                                          |
| `RAB-F10` | body keys are already camelCase, but no golden fixture guards them and null semantics are unvalidated              | MRG-315 schema; MRG-350/MRG-354 fixtures                     |
| `RAB-F11` | external producers/consumers, broker policies, queue depths, vhost, and deployed headers are unavailable           | MRG-304 deployment inventory                                 |
| `RAB-F12` | scoped match test endpoints can publish real notification events without a corresponding state transition          | preserve for parity or explicitly correct in MRG-338/MRG-362 |

No item in this register authorizes deletion or runtime correction. Current observable behavior remains frozen until a
later task captures parity, approves compatibility, and provides rollback.

## Source Reconciliation And Handoff

The inventory reconciles independently against:

- eight `RabbitMQConfig` classes;
- four unique exchange names and 21 unique routing-key values across primary and dead-letter exchanges;
- 19 unique primary queues plus ten unique DLQs;
- 29 unique queue bindings;
- ten publisher methods covering eleven producer routing keys;
- 14 `@RabbitListener` methods;
- five primary queues without listeners;
- 25 routed Java event-class copies across ten payload families;
- zero RabbitMQ publishers or listeners in config-service, reports-service, search-service, or mobile-gateway.

MRG-303 must inventory HTTP clients and conversions without conflating them with these already-camelCase event bodies.
MRG-304 must obtain a read-only broker/deployment snapshot and define coexistence, queue ownership, compatibility, and
rollback. MRG-315 must choose the event source format and generator. MRG-350, MRG-369, and MRG-370 must migrate routing
keys vertically with golden bodies and headers, old/new compatibility, acknowledgements, retry/DLQ behavior, and
rollback. MRG-371 and MRG-372 own transactional outboxes and consumer deduplication.

No generated event contract, broker topology, runtime code, queue, message, or Maaatch file changes in MRG-302.
