# MRG-372 — Matches And Users Outbox And Consumer Deduplication

- Status: implemented in the monorepo; production activation remains gated
- Authority: MRG-304 coexistence matrix and MRG-315 event-contract decision
- Scope: matches/users publication and notification-owned Q-14/Q-15/Q-18/Q-19 side effects only

## Outcome

Matches and users now record their approved event facts in service-local PostgreSQL outboxes instead of publishing
RabbitMQ messages directly. The shared MRG-371 publisher emits the retained v1 message and canonical v2 message from
one row with one event UUID, independent publication timestamps, bounded retry, observation, pause, and cleanup.

Notification-service now has event-ID deduplication and inactive v2 side-effect listeners for match-finished,
match-live-link-created, team-favorite, and pool-favorite events. V1 remains the default active wire. Runtime
configuration rejects simultaneous v1 and v2 activation for either route family, and production switching remains
subject to the MRG-304 paused publisher sequence and deployment evidence gates.

MRG-372 does not change lifecycle/search consumers introduced by MRG-371. Their eventual consumer conversion remains
owned by MRG-351, MRG-373, and MRG-374. It also creates no Q-11 through Q-13 or Q-16/Q-17 successor and performs no
broker, deployment, production, MRG-9xx, or MRG-1000 action.

## Transactional Producers

`matches-service` and `users-service` import the shared `outbox-support` module and each add the same additive
`event_outbox` Flyway schema used by the four MRG-371 producers. Existing transactional application methods now persist
the domain change and outbox row through the same datasource and Spring transaction. The matches internal event-test
endpoint has no domain mutation; its outbox insert is the sole committed action.

The approved facts are:

| Owner           | Event types                                                            | V1 routes                                   | V2 routes               | Ordering key                            |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------------- | ----------------------- | --------------------------------------- |
| matches-service | `MATCH_FINISHED`, `MATCH_LIVE_LINK_CREATED`                            | `match.finished`, `match.live-link-created` | legacy route plus `.v2` | `match:{matchId}`                       |
| users-service   | `TEAM_FOLLOWED`, `TEAM_UNFOLLOWED`, `POOL_FOLLOWED`, `POOL_UNFOLLOWED` | `team.follow`, `pool.follow`                | legacy route plus `.v2` | `user:{userId}:{entityType}:{entityId}` |

Each v1 payload retains its existing Java type and serialization behavior. Its only additive metadata is
`x-blockout-event-id`. V2 uses canonical camelCase JSON, schema `2.0.0`, generated records, `messageId`, `type`,
`timestamp`, the approved stable headers, the same UUID, and no `__TypeId__`.

The producer publisher is controlled independently in each service:

- `OUTBOX_PUBLISHER_ENABLED=true` claims and publishes ready rows; set it to `false` before a cutover or rollback;
- `OUTBOX_BATCH_SIZE=50` bounds each locked batch;
- `OUTBOX_RETENTION=7d` retains completed rows before cleanup.

## Transactional Consumer Deduplication

Notification-service adds `consumed_event`, keyed by the shared event UUID. A migrated listener inserts the marker and
runs its database side effect in one transaction. `ON CONFLICT DO NOTHING` makes concurrent deliveries and the v1/v2
copies converge on one side-effect attempt. If a runtime exception escapes, Spring rolls back both the marker and the
database work so the unchanged listener container can apply its existing acknowledgement, requeue, retry, and DLQ
behavior.

Retained v1 messages created before MRG-372 have no event-ID header. They still execute through a logged compatibility
path without a marker, which is required to drain an old queue safely. A present but invalid v1 ID fails normally. V2
requires body `eventId`, AMQP `messageId`, and `x-blockout-event-id` to agree and validates `type`, timestamp, producer,
schema version, ordering key, correlation ID, and aggregate version against the body. Any `__TypeId__` header is
rejected.

The team and pool queues each carry two record types. Their v2 listener therefore selects the generated followed or
unfollowed record from the stable AMQP `type` property and deserializes canonical JSON explicitly. It never performs
runtime Java-class discovery and never depends on Spring type metadata.

Database effects are transactionally deduplicated. The match notification pipeline also calls the external Expo
provider inside that transaction; a process failure after a provider accepts a push but before the database commits
can still cause provider-level duplicate delivery. MRG-372 does not claim distributed exactly-once delivery.

## Listener Compatibility

MRG-372 changes no exchange, routing key, queue, DLQ, dead-letter argument, acknowledgement mode, listener container
factory, retry policy, or requeue setting. All eight v1/v2 listener entry points use the existing default container.
The four v2 primary queues and DLQs remain those already declared by MRG-369 and MRG-370.

The committed defaults keep side effects on v1:

| Route family | V1 setting                                | Default | V2 setting                                | Default |
| ------------ | ----------------------------------------- | ------- | ----------------------------------------- | ------- |
| matches      | `NOTIFICATION_MATCH_EVENTS_V1_ENABLED`    | `true`  | `NOTIFICATION_MATCH_EVENTS_V2_ENABLED`    | `false` |
| favorites    | `NOTIFICATION_FAVORITE_EVENTS_V1_ENABLED` | `true`  | `NOTIFICATION_FAVORITE_EVENTS_V2_ENABLED` | `false` |

Both values may be `false` during the required paused state. Enabling both versions for one family fails application
startup. Configuration is an operational guard, not authorization to activate production v2 consumption.

## Cutover And Rollback

Production activation remains forbidden until the mandatory read-only deployment and RabbitMQ snapshot closes the
MRG-304 queue-argument, policy, depth, unacknowledged-delivery, retry/DLQ, vhost/TLS, and external-consumer unknowns.
When those separate gates are satisfied, switch one route family only in this order:

1. set that owner's `OUTBOX_PUBLISHER_ENABLED=false` and verify publication has paused;
2. wait for the applicable v1 primary queues to reach zero ready and zero unacknowledged deliveries;
3. deploy notification configuration with that family's v1 flag `false` and v2 flag still `false`;
4. verify the v1 listener is stopped, then deploy/start the same family with v2 `true`;
5. verify v2 listener readiness and keep the opposite wire disabled;
6. resume the owning outbox publisher;
7. observe acknowledgements, deduplication logs/table, primary depth, and v2 DLQ flow.

The v2 queue may contain shadow copies already processed through v1. Their shared IDs are skipped when v2 starts.
Rollback uses the reverse safe sequence: pause the owner outbox, drain v2, stop v2, restore v1-only notification
configuration, verify readiness, and resume publication. Do not delete either wire's queues, DLQs, outbox rows, or
consumer ledger during rollback.

## Verification

Repository verification covers:

- producer tests for all matches/users route families and shared v1/v2 identity;
- consumer tests for cross-wire deduplication and legacy no-ID compatibility;
- canonical favorite decoding and explicit `__TypeId__` rejection;
- topology tests for unchanged queues/DLQs/default container plus v1-on/v2-off defaults;
- startup-property tests for paused-state support and simultaneous-activation rejection;
- targeted matches/users/notification compilation and tests;
- repository environment, documentation, XML, formatting, generated-artifact, diff, and complete CI gates.
