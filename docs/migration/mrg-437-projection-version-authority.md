# MRG-437 Projection Version Authority And Command-Fact Separation

- Status: approved architecture decision
- Applies to: MRG-438 through MRG-442, MRG-430, and MRG-429
- Runtime effect: none
- Contract effect: none
- Production effect: none

## Purpose

MRG-437 defines the version authority required for ordered club, team, and pool search projections. It separates the
existing competition-owned cascade commands from new complete facts emitted by the service that owns the resulting
aggregate state. This decision makes the later contract, persistence, producer, index, and consumer tasks
decision-complete without changing any runtime or contract source here.

The existing lifecycle routes cannot provide this authority. `competition-service` knows which aggregate should be
deactivated, but it neither owns the final row nor observes the row version committed by clubs-service, teams-service,
or pools-service. Existing upsert facts contain useful projection fields but no monotonic owner revision. Timestamps,
worker-local counters, ingestion sequence numbers, and event delivery order are not substitutes for an aggregate
version.

## Command And Fact Boundary

The existing `club.deactivation`, `team.deactivation`, and `pool.deactivation` v1 routes and their `.v2` counterparts
remain cascade commands produced by `competition-service`. They retain the MRG-304 topology, queues, activation
flags, outbox behavior, deduplication, acknowledgement, retry, DLQ, cutover, and rollback rules. They request an owner
transition; they do not assert that the transition committed and never carry an invented aggregate version.

After an effective owner write, the owning service emits one complete projection fact:

| Owner service | Event type                | Routing key                  | Ordering key | Planned search queue                      |
| ------------- | ------------------------- | ---------------------------- | ------------ | ----------------------------------------- |
| clubs-service | `CLUB_PROJECTION_CHANGED` | `club.projection-changed.v2` | `club:{id}`  | `club.projection-changed.queue.search.v2` |
| teams-service | `TEAM_PROJECTION_CHANGED` | `team.projection-changed.v2` | `team:{id}`  | `team.projection-changed.queue.search.v2` |
| pools-service | `POOL_PROJECTION_CHANGED` | `pool.projection-changed.v2` | `pool:{id}`  | `pool.projection-changed.queue.search.v2` |

Each planned queue uses the same route with `.queue.search.v2` and its DLQ uses `.queue.search.dlq.v2`. The routes
reuse `entity.lifecycle.exchange` and the MRG-315 envelope. They are additive future projection routes, not
replacements for an MRG-304 route family.

MRG-438 adds only shared, model-only AsyncAPI schema, message, channel, catalog, and generated-record authority. It
does not add a deployable send or receive operation and does not declare a broker resource. MRG-440, MRG-441, and
MRG-442 add the real producer operations independently when each owner publishes its fact. MRG-429 later adds the
search-worker receive operations and runtime queue declarations. No absent listener or publisher becomes active from
contract generation alone.

The retained upsert and deactivation events continue unchanged during coexistence. A create or update may therefore
record both its existing upsert event and the new owner projection fact. A cascade command remains a separate event
from the owner fact that confirms the effective resulting state.

## Complete Projection Facts

Every new fact uses schema version `2.0.0`, has a required non-negative `aggregateVersion` in the MRG-315 envelope,
and contains the owner's complete search-projectable state. `aggregateVersion` is not duplicated in the payload.

| Fact | Required payload fields                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| Club | `id`, `name`, `logoUrl`, `city`, `active`                                                                   |
| Team | `id`, `name`, `shortName`, `clubId`, `divisionId`, `format`, `gender`, `season`, `logoUrl`, `active`        |
| Pool | `id`, `name`, `shortName`, `divisionId`, `leagueCode`, `leagueName`, `season`, `format`, `gender`, `active` |

Existing nullable projection values retain their current null semantics. Raw provider names, audit timestamps,
follower counters, persistence fields, enriched club or division names, and Elasticsearch `all` text do not enter
these facts. Club and division enrichment remains worker-owned and is derived from versioned snapshots.

`EventType` remains generated from the shared AsyncAPI source. No service declares a handwritten copy of the three
new values, and generated Java records remain ignored build outputs under the shared event-contract module.

## Aggregate Revision Authority

MRG-439 through MRG-442 add a service-local Flyway column with the exact shape
`revision BIGINT NOT NULL DEFAULT 0` and map it as `@Version private long revision`. The owning database row is the
only authority for that value:

- a newly inserted aggregate has revision `0`;
- an effective update, reactivation, or deactivation increments the revision through optimistic locking;
- the application flushes the owner row before constructing the projection fact so the emitted version is the
  committed candidate version, not the pre-write value;
- the owner write and its projection-fact outbox row remain in the same Spring transaction;
- a transaction failure commits neither the owner mutation nor its outbox row; and
- an optimistic-lock conflict publishes no fact from the losing transaction.

An already inactive aggregate remains a successful compatibility no-op where the current API or command expects one.
It performs no save or flush, increments no revision, and emits no projection fact. Cross-wire duplicate command IDs
remain suppressed by the existing consumed-event ledger; a distinct repeated command converges through the same
state-sensitive no-op.

`config-service` owns the division revision but publishes no division event and creates no outbox. MRG-439 adds the
revision only to `DivisionInternalResponse`, config-service application snapshots, and the search-worker division
snapshot/cache boundary. Mobile-gateway continues to project its existing public/mobile division shape and does not
expose the revision.

## Revision Vectors And Atomic Projection Writes

MRG-430 persists these identity-aware vectors beside active documents and tombstones:

- club: `(clubId, clubRevision)`;
- team: `(teamId, teamRevision, clubId, clubRevision, divisionId, divisionRevision)`;
- pool: `(poolId, poolRevision, divisionId, divisionRevision)`.

The atomic storage operation applies the following comparison rules:

1. A lower owner revision is stale and is rejected without changing the stored document.
2. At the same owner revision, changed owner fields or changed dependency identities are a conflict and are rejected.
3. A higher owner revision may change owner state and dependency identities. A new dependency identity establishes a
   new revision baseline for that identity.
4. When a dependency identity is unchanged, its revision may stay equal or increase but may never decrease, even when
   the owner revision increased.
5. At the same owner state and dependency identities, a newer dependency revision permits a dependent reprojection
   without inventing a new owner revision.
6. An identical vector and identical projected state is idempotent. An identical vector with different source or
   projected state is a conflict rather than last-write-wins.

The worker-only value `-1` represents a dependency snapshot that is temporarily unavailable. It is not published in
an event and is never treated as an aggregate version. `-1` may advance to revision `0` or greater. A known
non-negative revision for the same dependency identity may not regress to `-1`.

The indexed `active` value is exactly the owner fact's active state. Search-worker does not infer a team or pool
deactivation from club or division state. Competition cascade commands remain responsible for requesting those owner
mutations, and the resulting owner facts remain responsible for confirming them. Missing enrichment retains the
existing worker fallbacks instead of creating an implicit lifecycle policy.

## Task Ownership And Reconciliation

The remaining order is mandatory:

1. MRG-438 establishes the three shared model-only event contracts.
2. MRG-439 exposes persisted division revisions through internal snapshots only.
3. MRG-440, MRG-441, and MRG-442 add owner revisions and transactional projection facts to clubs, teams, and pools
   independently.
4. MRG-430 adds version-aware documents, tombstones, atomic non-regressing writes, index generations, validation,
   alias swaps, bounded rollback retention, and failed-rebuild handling.
5. MRG-429 consumes the owner facts, maintains versioned owner and enrichment caches, reprojects dependants after club
   or division changes, and reconciles complete active and inactive snapshots through the same atomic write operation.

Snapshot reconciliation includes owner and dependency revisions and follows the same comparison rules as incremental
facts. It never overwrites a newer document merely because a rebuild started later. Index creation, validation, alias
swap, rollback, cleanup, reconciliation, and any later listener cutover remain explicit application or operational
actions; none is activated by this decision.

## Compatibility, Validation, And Rollback

MRG-304 remains normative for every existing route and for any later production activation. MRG-315 remains normative
for AsyncAPI, generated records, envelopes, metadata, and model confinement; its optional envelope field becomes
required only for these new families because their producers own a persisted aggregate revision. MRG-313 and MRG-314
remain unchanged.

MRG-437 changes documentation only. Validation consists of documentation links and formatting, Maaatch structural
comparison, the complete local shadow-CI verifier, Git whitespace checks, and final diff inspection proving that no
runtime, contract source, generated artifact, schema, configuration, deployment, or production state changed.

Rollback is the single MRG-437 documentation commit. No database, broker, index, generated artifact, service image,
deployment, production operation, MRG-9xx, or MRG-1000 rollback or action exists in this task.
