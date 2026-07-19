# MRG-440 Club Revision And Owner Event

- Status: implemented in the monorepo shadow baseline
- Owner: `clubs-service`
- Authority: MRG-401 and MRG-437
- Consumer activation: deferred to MRG-429
- Production effect: none

## Outcome

Clubs-service now owns a persisted optimistic revision and records one complete owner event after every effective
create, update, or deactivation. Flyway V6 adds `revision BIGINT NOT NULL DEFAULT 0`, and `ClubEntity` maps it as a
primitive JPA `@Version`. Existing rows and new clubs begin at revision zero. Updates use the value returned after
`saveAndFlush`, so the event envelope always carries the post-write owner revision.

The implementation keeps the existing feature-first service structure. `ClubService` orchestrates the use case,
`JpaClubStore` owns persistence, one small `ClubEventData` application record crosses the publisher port, and the
outbox adapter alone imports generated event records. The retained upsert and the new owner event reuse that one data
shape instead of creating a parallel hierarchy of fact, command, or projection classes. This is the pattern for the
equivalent team and pool slices: simple application roles, generated transports at adapters, and no generic event
framework.

## Write And Event Semantics

Create and update keep their existing legacy and canonical `club.upsert` publications. They additionally record
`club.projection-changed.v2` with event type `CLUB_PROJECTION_CHANGED`, ordering key `club:{id}`, the complete approved
club payload, and the JPA revision as mandatory `aggregateVersion`. The business write and both outbox inserts run in
the existing Spring transaction.

Effective deactivation records the inactive owner event after flush. Deactivating an already inactive club remains a
successful compatibility no-op: it performs no save, does not advance the revision, and records no duplicate owner
event. Missing clubs retain the existing not-found behavior. Existing competition-service deactivation commands,
clubs-service listeners, upsert routes, exchange names, retry behavior, and public/mobile APIs remain unchanged.

## Canonical-Only Outbox Row

The new owner event has no legacy contract. The shared outbox therefore accepts a complete legacy wire pair, a
complete canonical wire pair, or both. It rejects half-configured pairs and empty rows. Canonical-only rows skip legacy
serialization and publication and complete when canonical publication succeeds. Existing dual-wire and legacy-only
rows keep their previous behavior.

Flyway V6 makes the three legacy outbox columns nullable as one all-or-none group and preserves the canonical pairing
constraint. It also requires every row to contain at least one enabled wire. No placeholder v1 payload, routing key,
queue, listener, binding, or broker resource is introduced.

## Internal Snapshot Boundary

`ClubInternalResponse` now requires the non-negative owner revision so later reconciliation can build the club
component of its version vectors. The generated response remains confined to the internal HTTP adapter. The
mobile-gateway contract explicitly remains revision-free, and the legacy club response keeps its current shape.

The existing geocoding job may advance the JPA revision when it writes coordinates. Coordinates are not part of the
approved owner-event payload, so that internal-only mutation intentionally emits no owner event. Revision gaps are
valid: a later owner event and the internal snapshot expose the latest monotonic revision, while no worker-local value
is substituted for it.

## Topology, Verification, And Rollback

The clubs-service AsyncAPI root now declares only the producer operation for `club.projection-changed.v2`. Team and
pool owner channels remain component-only. Search-worker has no matching receive operation, and this task creates no
queue or binding and performs no broker or production action.

Contract tests cover the producer operation, mandatory internal revision, unchanged mobile shape, and retained routes.
Service and persistence tests cover revision zero, post-flush create/update/deactivation values, optimistic-lock
rejection, repeated-deactivation no-op behavior, event payload mapping, canonical-only outbox publication, and Flyway
constraints. The complete backend reactor, deterministic generation, generated-output guard, local pull-request
verifier, documentation validation, formatting, Maaatch comparison, and Git whitespace checks complete the proof.

Rollback reverts the MRG-440 code, source-contract, migration, and documentation commit. If Flyway V6 has already run
in a later environment, keep the additive revision column and relaxed outbox nullability; the previous image continues
to write complete legacy wire pairs. This task performs no deployment, cutover, broker mutation, production action,
MRG-9xx work, or MRG-1000 work.
