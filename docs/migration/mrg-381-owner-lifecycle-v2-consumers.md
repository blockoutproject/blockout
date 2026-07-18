# MRG-381 Owner Lifecycle v2 Consumers

- Status: implemented in source; production activation not performed
- Owners: `clubs-service`, `teams-service`, and `pools-service`
- Routes: lifecycle Q-07 through Q-10
- Default: v1 listeners enabled, v2 listeners disabled
- Production effect: none in this task

## Result

The owner services now consume the four generated deactivation v2 records through explicit adapters:

| Side effect                      | Service         | v1 queue                        | v2 queue                           | v2 route               |
| -------------------------------- | --------------- | ------------------------------- | ---------------------------------- | ---------------------- |
| Deactivate club                  | `clubs-service` | `club.deactivation.queue.clubs` | `club.deactivation.queue.clubs.v2` | `club.deactivation.v2` |
| Deactivate team                  | `teams-service` | `team.deactivation.queue.teams` | `team.deactivation.queue.teams.v2` | `team.deactivation.v2` |
| Deactivate teams owned by a club | `teams-service` | `club.deactivation.queue.teams` | `club.deactivation.queue.teams.v2` | `club.deactivation.v2` |
| Deactivate pool                  | `pools-service` | `pool.deactivation.queue.pools` | `pool.deactivation.queue.pools.v2` | `pool.deactivation.v2` |

The v2 queues are durable and deliberately have no dead-letter arguments. Q-07 through Q-10 had no legacy DLQ, and
MRG-304 requires that behavior to remain unchanged unless a separately approved reliability task changes it. Listener
exceptions therefore continue through the existing container acknowledgement, retry, and requeue behavior.

## Canonical Decoding

Each v2 listener accepts a raw AMQP message and explicitly deserializes its queue-owned generated record. No adapter
uses Spring `__TypeId__` dispatch, and messages containing `__TypeId__` are rejected. The adapters also reject malformed
JSON, the wrong event type, producer, schema version, entity ordering key, or any disagreement between the generated
body and the MRG-315 AMQP identity, timestamp, correlation, producer, schema, ordering, or aggregate metadata.

After validation, adapters invoke the unchanged cascade operations:

- `ClubService.deactivate`;
- `TeamService.deactivate`;
- `TeamService.deactivateByClubId`;
- `PoolService.deactivate`.

## Service-Local Exact-Event Deduplication

Each owner database has its own `consumed_event` table keyed by the canonical event UUID. A shared technical processor
from `outbox-support` inserts the service-local receipt and runs the existing side effect in the same database
transaction. Concurrent or restarted delivery of the same exact event is therefore skipped only after a successful
local effect. If the effect fails, the transaction rolls back both changes and the existing requeue path can retry.

Both wire adapters use the same receipt identity. A v1 message carrying `x-blockout-event-id` and its accumulated v2
copy cannot apply the same local effect twice across the listener restart. Older v1 messages without an event ID remain
accepted and retain legacy behavior.

## Listener Gate and Cutover

Every service rejects simultaneous v1 and v2 lifecycle listeners. Both flags may be false for the required paused
state:

| Service         | v1 environment variable             | v2 environment variable             |
| --------------- | ----------------------------------- | ----------------------------------- |
| `clubs-service` | `CLUBS_LIFECYCLE_EVENTS_V1_ENABLED` | `CLUBS_LIFECYCLE_EVENTS_V2_ENABLED` |
| `teams-service` | `TEAMS_LIFECYCLE_EVENTS_V1_ENABLED` | `TEAMS_LIFECYCLE_EVENTS_V2_ENABLED` |
| `pools-service` | `POOLS_LIFECYCLE_EVENTS_V1_ENABLED` | `POOLS_LIFECYCLE_EVENTS_V2_ENABLED` |

All v1 flags default to `true`; all v2 flags default to `false`. Activation remains a separate production operation.
Because club deactivation fans out to both clubs and teams, all Q-07 through Q-10 consumers switch as one lifecycle
route family using the approved MRG-304 sequence:

1. capture the mandatory read-only production snapshot;
2. pause the lifecycle outbox publishers;
3. drain all four v1 primary queues and confirm zero unacknowledged messages;
4. restart all three owner services with both lifecycle flags false;
5. restart them with v1 false and v2 true, then verify readiness and all four bindings;
6. resume publishers and observe acknowledgements, requeues, queue depth, receipts, and cascade state.

Rollback pauses the publishers, drains all four v2 queues, restores all services to both flags false, then restores v1
true and v2 false before publication resumes. Service-local receipts remain in place across both directions.

## Verification

The owner-service suites cover all four generated record decoders, MRG-315 metadata agreement, queue-contract and
`__TypeId__` rejection, durable topology without added DLQs, v1/v2 listener defaults, startup exclusivity, shared exact
IDs across v1/v2, and acceptance of legacy messages without IDs. The complete repository gate remains required before
publication.

## Closed Scope

- No listener flag is changed from the v1 default.
- No deployment, broker mutation, queue purge, production snapshot, production observation, or v1 retirement occurs.
- Contract-authority closure remains owned by MRG-356.
- Ordering, stale-event rejection, reconciliation, and receipt retention remain owned by MRG-429.
- No MRG-9xx or MRG-1000 work is executed, planned, authorized, or published.
