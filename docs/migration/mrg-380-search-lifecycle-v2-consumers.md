# MRG-380 Search Lifecycle v2 Consumers

- Status: implemented in source; production activation not performed
- Owner: `search-worker`
- Routes: lifecycle Q-01 through Q-06
- Default: v1 listeners enabled, v2 listeners disabled
- Production effect: none in this task

## Result

`search-worker` now consumes the six generated lifecycle v2 records through explicit adapters:

| Projection  | v1 queue                         | v2 queue                            | v2 route               |
| ----------- | -------------------------------- | ----------------------------------- | ---------------------- |
| Club upsert | `club.upsert.queue.search`       | `club.upsert.queue.search.v2`       | `club.upsert.v2`       |
| Club delete | `club.deactivation.queue.search` | `club.deactivation.queue.search.v2` | `club.deactivation.v2` |
| Team upsert | `team.upsert.queue.search`       | `team.upsert.queue.search.v2`       | `team.upsert.v2`       |
| Team delete | `team.deactivation.queue.search` | `team.deactivation.queue.search.v2` | `team.deactivation.v2` |
| Pool upsert | `pool.upsert.queue.search`       | `pool.upsert.queue.search.v2`       | `pool.upsert.v2`       |
| Pool delete | `pool.deactivation.queue.search` | `pool.deactivation.queue.search.v2` | `pool.deactivation.v2` |

Each v2 primary queue is durable, keeps the legacy dead-letter exchange behavior, and uses the MRG-304 `.dlq.v2`
queue and routing-key suffix. Upsert listeners retain consumer batches of 500, prefetch 500, manual multiple
acknowledgement, and non-requeue nacks. Deactivation listeners retain their single-message container behavior.

## Canonical Decoding

The v2 listener container exposes raw AMQP messages to `LifecycleV2MessageDecoder`. The decoder selects the generated
record from the queue-owned method, not from Spring type metadata. It rejects `__TypeId__`, malformed JSON, the wrong
event type or producer, a schema version other than `2.0.0`, an entity ordering-key mismatch, or any disagreement
between the body and MRG-315 AMQP metadata.

Only the adapter maps generated record payloads to the existing search projection event models. Club, team, and pool
index services, caches, repositories, batch shape, and delete behavior therefore remain unchanged.

## Shared Exact-Event Deduplication

Both v1 and v2 adapters use `x-blockout-event-id` when present. A bounded process-local claim registry prevents
concurrent duplicate work, and the `search-lifecycle-event-receipts` Elasticsearch index records completed event IDs
before acknowledgement. The receipt survives the listener-flag restart and prevents accumulated v2 copies from
reapplying events already completed through v1. Legacy messages created before event IDs were added remain accepted
and rely on the existing idempotent upsert/delete behavior.

Receipt creation follows the projection. If projection or receipt persistence fails, the local claim is released and
the existing retry/DLQ path remains authoritative. A crash between projection and receipt can replay the same event;
the existing upsert/delete operation is the safety boundary for that narrow window. MRG-429 still owns entity ordering,
stale-event rejection, reconciliation, and any later receipt-retention policy.

## Listener Gate and Cutover

The application rejects simultaneous side-effect listeners. Both flags may be false to create the required paused
state:

| Environment variable                 | Default | Meaning                           |
| ------------------------------------ | ------- | --------------------------------- |
| `SEARCH_LIFECYCLE_EVENTS_V1_ENABLED` | `true`  | Start all six legacy listeners    |
| `SEARCH_LIFECYCLE_EVENTS_V2_ENABLED` | `false` | Start all six canonical listeners |

Activation remains a separate production operation. It must use the approved MRG-304 sequence for the complete
lifecycle route family:

1. capture the mandatory read-only production snapshot;
2. pause the lifecycle outbox publishers;
3. drain v1 primary deliveries and confirm zero unacknowledged messages;
4. restart `search-worker` with both flags false;
5. restart it with v1 false and v2 true, then verify readiness;
6. resume the publishers and observe acknowledgements, DLQs, receipts, caches, and projections.

Rollback pauses the publishers, drains v2, restores both flags false, then restores v1 true and v2 false before
publication resumes. The persistent receipts are shared across both directions and must not be removed during the
switch.

## Verification

The search-worker suite covers all six generated record mappings, body/header agreement, `__TypeId__` rejection,
queue-contract rejection, six v2 queue/DLQ pairs, listener defaults, durable receipt behavior across worker instances,
manual batch acknowledgement, duplicate filtering, non-requeue nacks, and claim release for retry.

## Closed Scope

- No listener flag is changed from the v1 default.
- No deployment, broker mutation, queue purge, production snapshot, production observation, or v1 retirement occurs.
- Q-07 through Q-10 remain owned by MRG-381.
- Event contract-authority closure remains owned by MRG-356 after all canonical consumers exist.
- No MRG-9xx or MRG-1000 work is executed, planned, authorized, or published.
