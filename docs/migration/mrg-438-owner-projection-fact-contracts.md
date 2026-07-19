# MRG-438 Owner Projection Fact Contracts

- Status: implemented in the monorepo contract baseline
- Authority: MRG-315 event contracts and MRG-437 projection version authority
- Runtime effect: none
- Production effect: none

## Outcome

The shared AsyncAPI catalog now owns three complete projection-change fact families:

| Owner service | Event type                | Component channel            | Ordering key |
| ------------- | ------------------------- | ---------------------------- | ------------ |
| clubs-service | `CLUB_PROJECTION_CHANGED` | `club.projection-changed.v2` | `club:{id}`  |
| teams-service | `TEAM_PROJECTION_CHANGED` | `team.projection-changed.v2` | `team:{id}`  |
| pools-service | `POOL_PROJECTION_CHANGED` | `pool.projection-changed.v2` | `pool:{id}`  |

Each family has an authoritative shared schema, message, and channel component. The component-only catalog references
all three families and generates their Java 21 event and payload records plus the three new `EventType` values. The
generated bundles and Java sources remain ignored outputs under the MRG-431 ownership rule.

## Complete Fact Boundary

Each event keeps schema version `2.0.0`, its owner-service producer constant, the MRG-315 metadata, and a required
non-negative `aggregateVersion`. The generated record therefore uses a primitive `long` for the owner revision rather
than the nullable form retained by event families without a version authority.

The payloads contain exactly the owner state approved by MRG-437:

- club: `id`, `name`, nullable `logoUrl`, nullable `city`, and `active`;
- team: `id`, `name`, `shortName`, `clubId`, `divisionId`, `format`, `gender`, `season`, nullable `logoUrl`, and
  `active`;
- pool: `id`, `name`, `shortName`, `divisionId`, `leagueCode`, `leagueName`, `season`, nullable `format`, nullable
  `gender`, and `active`.

Every field is required in the JSON object, including fields whose value may be null. Provider-only data, enriched
club or division names, timestamps, worker counters, and derived search fields remain outside the owner facts.

## Model-Only Topology

The new channels exist only in `catalog.json` components. None of the eight deployable AsyncAPI roots references them,
so MRG-438 adds no `send` or `receive` operation. The legacy route reconciliation ledger, its ten active routes, the
nineteen queue reconciliation entries, and the fourteen deployable primary queues remain unchanged.

MRG-440, MRG-441, and MRG-442 separately own future producer operations after each service gains an authoritative JPA
revision. MRG-429 separately owns search-worker receive operations and runtime queue declarations. Until those tasks,
the component channels declare neither broker resources nor executable behavior.

The existing competition-service club, team, and pool deactivation events remain cascade commands. Their source,
generated records, deployable operations, and runtime behavior are unchanged and they do not become owner-version
facts.

## Verification And Rollback

Contract tests validate all local references and resolved AsyncAPI bundles, the exact payloads, required aggregate
metadata, owner constants, ordering-key shapes, stable headers, generated `EventType`, and the complete 29-file Java
model set. Golden fixtures cover active and inactive owner state, nullable projection values, and revision zero.

Two clean generations produce identical bundles and Java records. The isolated `event-contracts` Maven module compiles
the ignored records, and the repository generated-output guard proves that no derivative source is tracked.

Rollback reverts only the MRG-438 source, test, fixture, and documentation commit. No database, publisher, listener,
outbox, queue, exchange, broker, image, deployment, production, MRG-9xx, or MRG-1000 rollback or action exists in this
task.
