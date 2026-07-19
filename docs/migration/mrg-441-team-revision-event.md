# MRG-441 Team Revision And Owner Event

- Status: implemented in the monorepo shadow baseline
- Owner: `teams-service`
- Authority: MRG-401, MRG-437, and MRG-443
- Consumer activation: deferred to MRG-429
- Production effect: none

## Outcome

Teams-service now owns a persisted optimistic revision and records one complete owner event after every create, update,
direct deactivation, or club-cascade deactivation that changes an active team. Flyway V7 adds
`revision BIGINT NOT NULL DEFAULT 0`, and `TeamEntity` maps it as a primitive JPA `@Version`. Existing rows and new
teams begin at revision zero. Writes that produce owner events use the value returned after `saveAndFlush`, so the
event envelope carries the post-write revision.

The implementation keeps the existing feature-first structure. `TeamService` and `TeamLifecycleService` orchestrate
their use cases, `JpaTeamStore` owns persistence, and one `TeamEventData` application record crosses the publisher
port. Generated event records remain confined to the outbox adapter. The retained upsert and new owner event reuse the
same application data instead of creating parallel DTO, fact, projection, or event hierarchies.

## Write And Event Semantics

Create and update preserve the existing `team.upsert` and `team.upsert.v2` publications. They additionally record
`team.projection-changed.v2` with event type `TEAM_PROJECTION_CHANGED`, ordering key `team:{id}`, the complete approved
team payload, and the JPA revision as mandatory `aggregateVersion`. The business write and outbox inserts use the same
existing Spring transaction.

Direct deactivation still returns not found for an unknown identifier. An existing inactive team is a successful
no-op: it is not saved, its revision does not advance, and no owner event is recorded. Club-cascade handling selects
only active teams, flushes each effective soft deactivation, and records one owner event for each changed row in the
same cascade transaction. A repeated cascade therefore performs no write and emits no duplicate owner event. Existing
competition-service commands and retained v1/v2 consumers remain unchanged.

Follower-count mutations may advance the owner revision without publishing an event because the derived follower
counter is not part of the approved search projection payload. Revision gaps are valid: the next owner event and the
internal snapshot expose the latest monotonic revision. No timestamp, scraper counter, or worker-local value replaces
the owner revision.

## Internal And Outbox Boundaries

`TeamInternalResponse` now requires the non-negative revision for later snapshot reconciliation. The generated model
stays in the internal HTTP adapter. The mobile contract and legacy response remain revision-free.

The owner event has no legacy contract. The canonical-only outbox support established by MRG-440 is reused directly;
Flyway V7 applies the same all-or-none legacy-wire constraints in the teams database. No placeholder v1 body, route,
queue, listener, binding, or shared event framework is introduced. Existing dual-wire and v1-only rows retain their
behavior.

## Topology, Verification, And Rollback

The teams-service AsyncAPI root declares the producer operation for `team.projection-changed.v2`. The pool owner
channel remains component-only. Search-worker has no corresponding receive operation, and this task creates no queue,
binding, broker resource, or production activation.

Contract tests cover the producer operation, mandatory internal revision, unchanged mobile shape, and retained route
ledger. Service, persistence, and adapter tests cover revision zero, post-flush create/update/deactivation values,
optimistic-lock rejection, direct and cascade no-ops, complete event mapping, canonical-only outbox rows, and Flyway
constraints. Deterministic generation, the complete backend reactor and local verifier, generated-output ownership,
documentation, formatting, Maaatch comparison, and Git whitespace checks complete the proof.

Rollback reverts the MRG-441 code, source-contract, migration, and documentation commit. If Flyway V7 has already run
in a later environment, keep the additive revision column and relaxed legacy outbox nullability; the previous image
continues to write complete legacy wire pairs. This task performs no deployment, cutover, broker mutation, production
action, MRG-9xx work, or MRG-1000 work.
