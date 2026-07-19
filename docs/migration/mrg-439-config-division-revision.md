# MRG-439 Config Division Revision

- Status: implemented in the monorepo shadow baseline
- Owner: `config-service`
- Internal consumer: `search-worker`
- Authority: MRG-401 and MRG-437
- Production effect: none

## Outcome

Config-service divisions now own a persisted optimistic revision. Flyway V7 adds
`revision BIGINT NOT NULL DEFAULT 0`, and `DivisionEntity` maps that column as a primitive JPA `@Version`. Existing
rows receive revision zero, new rows begin at zero, and Hibernate increments the revision for every effective owner
mutation.

Create, update, reactivation, and deactivation persistence paths use `saveAndFlush` before mapping the resulting
application view. The revision returned by a write is therefore the post-write value produced by JPA rather than the
pre-write value. Deactivating an already inactive division remains a successful compatibility no-op: it performs no
save or flush and does not advance the revision.

## Internal Snapshot Boundary

`DivisionInternalResponse` now requires a non-negative `revision`. The generated config-service response and generated
search-worker client remain confined to their HTTP adapters. The value is mapped immediately through the
config-service `DivisionView`, the worker-owned `DivisionSnapshot`, and `DivisionCacheSnapshot`, where later MRG-430
and MRG-429 work can use it as the division component of projection vectors.

The Expo-facing `MobileDivision` contract and mobile-gateway `DivisionView` remain revision-free. The mobile adapter
continues to select only its existing fields from the generated internal client. The legacy config v1 response record
also remains unchanged, so no public/mobile or compatibility JSON shape gains the persistence revision.

## Persistence And Concurrency

The owning division row is the sole revision authority. A focused Flyway test baselines the existing schema at V6,
applies V7 through Flyway, inserts a row without naming the new column, and verifies a non-null zero value. A focused
Hibernate test verifies revision zero on insert, revision one after the first effective update, rejection of a stale
concurrent update, and revision two after a later deactivation.

The application and persistence tests additionally prove that update mapping reads the post-flush revision and that
repeated deactivation performs no repository write. No timestamp, request sequence, event delivery order, or
worker-local counter becomes a version authority.

## Compatibility And Deferred Work

MRG-439 adds no division event, event type, publisher, outbox, listener, queue, exchange, scheduled job, or production
activation. Config-service remains the only writer, and search-worker only snapshots the value through the existing
authenticated division reads. Existing routes, scopes, statuses, payload fields, logo behavior, ordering, and active
state semantics remain otherwise unchanged.

MRG-440, MRG-441, and MRG-442 separately own club, team, and pool revisions and owner projection facts. MRG-430 owns
version-vector persistence and atomic projection writes. MRG-429 owns later consumers, cache ordering, dependent
reprojection, and reconciliation. None of that runtime is pulled into this slice.

## Verification And Rollback

Contract tests cover the required internal revision and the absence of that field from `MobileDivision`. Config-service
tests cover Flyway V7, optimistic concurrency, post-flush mapping, boundary serialization, reactivation, and repeated
deactivation. Search-worker tests cover generated-client deserialization, immediate snapshot mapping, and propagation
into the worker cache boundary. The full backend reactor, generated-output guard, local pull-request verifier,
documentation validation, formatting, Maaatch comparison, and Git whitespace checks complete the repository proof.

Rollback reverts the MRG-439 code and contract commit. If V7 has already run in a later environment, its additive
column remains forward-compatible with the previous image and is not dropped. This task performs no database
migration outside tests, deployment, broker operation, production action, MRG-9xx work, or MRG-1000 work.
