# MRG-442 Pool Revision And Owner Event

- Status: implemented in the monorepo shadow baseline
- Owner: `pools-service`
- Authority: MRG-401, MRG-437, and MRG-443
- Consumer activation: deferred to MRG-429
- Production effect: none

## Outcome

Pools-service now owns a persisted optimistic revision and records one complete owner event after every effective
create, update, or deactivation. Flyway V6 adds `revision BIGINT NOT NULL DEFAULT 0`, and `PoolEntity` maps it as a
primitive JPA `@Version`. Existing rows and new pools begin at revision zero. Writes that produce owner events use the
value returned after `saveAndFlush`, so the event envelope carries the post-write revision.

The implementation keeps the existing feature-first structure. `PoolService` and `PoolLifecycleService` orchestrate
their use cases, `JpaPoolStore` owns persistence, and one `PoolEventData` application record crosses the publisher
port. Generated event records remain confined to the outbox adapter. The retained upsert and new owner event reuse the
same application data instead of creating parallel DTO, fact, projection, or event hierarchies.

## Write And Event Semantics

Create and update preserve the existing `pool.upsert` and `pool.upsert.v2` publications. They additionally record
`pool.projection-changed.v2` with event type `POOL_PROJECTION_CHANGED`, ordering key `pool:{id}`, the complete approved
pool payload, and the JPA revision as mandatory `aggregateVersion`. The business write and outbox inserts use the same
existing Spring transaction.

Deactivation still returns not found for an unknown identifier. An existing inactive pool is a successful no-op: it
is not saved, its revision does not advance, and no owner event is recorded. Direct REST deletes and retained
competition-service deactivation commands use that same application operation. Existing v1/v2 consumers remain
unchanged.

Follower-count mutations may advance the owner revision without publishing an event because the derived follower
counter is not part of the approved search projection payload. Revision gaps are valid: the next owner event and the
internal snapshot expose the latest monotonic revision. No timestamp, scraper counter, or worker-local value replaces
the owner revision.

## Internal And Outbox Boundaries

`PoolInternalResponse` now requires the non-negative revision for later snapshot reconciliation. The generated model
stays in the internal HTTP adapter. The mobile contract and legacy response remain revision-free.

The owner event has no legacy contract. Pools-service reuses the canonical-only outbox support directly; Flyway V6
applies the same all-or-none legacy-wire constraints in the pools database. No placeholder v1 body, route, queue,
listener, binding, or shared event framework is introduced. Existing dual-wire and v1-only rows retain their behavior.

## Topology, Verification, And Rollback

The pools-service AsyncAPI root declares the producer operation for `pool.projection-changed.v2`. Search-worker has no
corresponding receive operation, and this task creates no queue, binding, broker resource, or production activation.

Contract tests cover the producer operation, mandatory internal revision, unchanged mobile shape, and retained route
ledger. Service, persistence, and adapter tests cover revision zero, post-flush create/update/deactivation values,
optimistic-lock rejection, repeated-deactivation no-op behavior, complete event mapping, canonical-only outbox rows,
and Flyway constraints. Deterministic generation, the complete backend reactor and local verifier, generated-output
ownership, documentation, formatting, Maaatch comparison, and Git whitespace checks complete the proof.

Rollback reverts the MRG-442 code, source-contract, migration, and documentation commit. If Flyway V6 has already run
in a later environment, keep the additive revision column and relaxed legacy outbox nullability; the previous image
continues to write complete legacy wire pairs. This task performs no deployment, cutover, broker mutation, production
action, MRG-9xx work, or MRG-1000 work.
