# MRG-371 Transactional Event Outbox Migration

- Status: implemented in the monorepo runtime baseline
- Authority: MRG-304 coexistence matrix and MRG-315 event-contract decision
- Owners: clubs-service, teams-service, pools-service, and competition-service
- Production effect: no deployment, broker operation, consumer cutover, or production authorization

## Purpose

MRG-371 replaces direct RabbitMQ publication in four event producers with a transactional PostgreSQL outbox. The
business transaction now stores the domain change and one immutable event row together. A scheduled publisher sends
the retained v1 body and the generated v2 envelope from that row, tracks each wire version independently, retries
failures with bounded backoff, exposes backlog evidence through structured logs and SQL, and removes completed rows
after a configurable retention period.

Direct dual-publish from application services is forbidden. Application code depends only on `OutboxRecorder`; the
shared `outbox-support` module is the sole owner of JDBC persistence, Rabbit publication, retry state, and cleanup.

MRG-440 extends the same row format to canonical-only owner facts. A row may now contain a complete legacy wire pair,
a complete canonical wire pair, or both, but never a partial pair or neither. Existing dual-wire and v1-only producers
remain unchanged. This avoids inventing a legacy payload for a new fact that has no legacy contract.

## Producer And Route Boundary

| Producer            | Fact                 | v1 route                  | v2 route                     | Ordering key          |
| ------------------- | -------------------- | ------------------------- | ---------------------------- | --------------------- |
| clubs-service       | club upsert          | `club.upsert`             | `club.upsert.v2`             | `club:{clubId}`       |
| clubs-service       | club projection      | none                      | `club.projection-changed.v2` | `club:{clubId}`       |
| teams-service       | team upsert          | `team.upsert`             | `team.upsert.v2`             | `team:{teamId}`       |
| teams-service       | team projection      | none                      | `team.projection-changed.v2` | `team:{teamId}`       |
| pools-service       | pool upsert          | `pool.upsert`             | `pool.upsert.v2`             | `pool:{poolId}`       |
| competition-service | club deactivation    | `club.deactivation`       | `club.deactivation.v2`       | `club:{clubId}`       |
| competition-service | team deactivation    | `team.deactivation`       | `team.deactivation.v2`       | `team:{teamId}`       |
| competition-service | pool deactivation    | `pool.deactivation`       | `pool.deactivation.v2`       | `pool:{poolId}`       |
| competition-service | team removed by pool | `teambypool.deactivation` | none                         | `pool:{id}:team:{id}` |

The orphan team-by-pool route remains v1-only exactly as MRG-304 and MRG-315 require. No Q-11 through Q-13 successor
is invented. The club and team projection facts use the owner JPA revisions added by MRG-440 and MRG-441. Existing
facts still omit `aggregateVersion` where their audited owners expose no monotonic revision; no timestamp or synthetic
counter is used.

## Atomicity And Publication Semantics

Each producer creates one UUID and UTC occurrence time, builds the legacy payload and canonical `2.0.0` envelope, and
inserts both serialized bodies into its own service database through the caller's existing Spring transaction. A
failed business transaction therefore leaves neither the domain write nor the outbox row committed. Broker
availability is no longer part of the business commit.

The publisher claims ready rows with `FOR UPDATE SKIP LOCKED`, sends only the wire versions whose publication timestamp
is absent, and records v1 and v2 completion separately. If v1 succeeds and v2 fails, retry sends only v2 with the same
event UUID. V1 retains its legacy payload type and snake_case converter behavior plus the single additive
`x-blockout-event-id` header. Its event body remains camelCase exactly like the audited no-argument Rabbit converter,
independently from any service HTTP naming strategy. V2 uses canonical camelCase JSON, standard AMQP properties,
stable MRG-315 headers, the
same `x-blockout-event-id`, and no `__TypeId__` header.

This is at-least-once publication, not exactly-once delivery. A process failure after a broker send and before the
publication timestamp commits can produce a duplicate carrying the same event UUID. Consumers must use that identity
for deduplication when their migration task authorizes it. MRG-372 owns migrated-consumer deduplication and cutover;
MRG-371 activates no v2 side-effect listener and changes no acknowledgement, retry, requeue, or DLQ behavior.

## Observation And Cleanup

Every non-empty batch logs claimed rows, published wire-version count, and current pending count. A failed row logs its
event ID, event type, attempt, and retry time and stores a newline-free error summary capped at 500 characters. Backoff
starts at two seconds and is capped at sixty seconds. Completed rows are deleted hourly after seven days by default.

Use the following read-only query in each owning service database:

```sql
select producer,
       count(*) filter (where completed_at is null) as pending,
       min(created_at) filter (where completed_at is null) as oldest_pending,
       max(attempt_count) filter (where completed_at is null) as max_attempts,
       count(*) filter (where v1_published_at is not null and v2_enabled and v2_published_at is null) as v2_only_pending
from event_outbox
group by producer;
```

Configuration is service-local:

- `OUTBOX_PUBLISHER_ENABLED=true` enables claims and publication; set it to `false` for the MRG-304 pause gate.
- `OUTBOX_BATCH_SIZE=50` bounds one locked batch and accepts values from 1 through 500.
- `OUTBOX_RETENTION=7d` controls deletion of completed rows only.

## Per-Service Rollback

Rollback clubs, teams, pools, and competition independently; never run the old direct publisher and the new outbox
publisher concurrently for the same producer.

1. Stop writes for the selected producer or otherwise establish a bounded write pause.
2. Set `OUTBOX_PUBLISHER_ENABLED=false`, deploy that configuration, and verify that no new batch is claimed.
3. Record pending count, oldest row, attempts, and the last completed event ID from that service database.
4. Confirm the applicable v2 route family has no active side-effect consumer; MRG-304 still governs any later switch.
5. Deploy the previous service image, which restores its v1-only direct publisher. Keep the additive outbox table and
   retained rows; do not delete or replay them ad hoc.
6. Before returning to the outbox image, pause writes again, stop the direct publisher image, deploy the outbox image
   with publication still disabled, reconcile the recorded backlog, then resume publication deliberately.

If rollback must cross a v2 consumer cutover added by a later task, use the full MRG-304 pause, drain, switch, and resume
sequence. Repository rollback alone is not sufficient after a side-effect consumer has moved.

## Verification Evidence

- Eight shared-module tests cover legacy/canonical serialization, UUID/time creation, invalid metadata, exact v1/v2
  AMQP properties and headers, missing-version-only publication, retry backoff, pause, and retention cleanup.
- Four producer tests cover all seven facts, exact routes and ordering keys, shared envelope identity, and the v1-only
  orphan route.
- The five-module targeted reactor compiles with `event-contracts` and `shared-models`; direct business publishers no
  longer depend on `RabbitTemplate`.
- Four Flyway migrations create identical service-local outbox schemas, pending/cleanup indexes, and a v2 pairing
  constraint.

## Closed Scope

- No v2 side-effect listener, consumer deduplication, acknowledgement/retry/requeue/DLQ change, traffic switch,
  deployment, broker operation, production change, or exactly-once claim.
- No REST, BFF, Expo, scraper, standalone repository, Maaatch, generated contract, or topology expansion.
- No MRG-9xx or MRG-1000 work is planned, authorized, executed, or published.
