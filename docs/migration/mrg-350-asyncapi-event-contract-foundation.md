# MRG-350 AsyncAPI Event Contract Foundation

- Status: implemented in the monorepo shadow baseline
- Authority: MRG-315 approved event-contract decision and MRG-304 coexistence matrix
- Active event families: six club, team, and pool lifecycle events
- Production effect: none

## Purpose

MRG-350 creates the contract-authoritative source and generated model foundation for Blockout-owned RabbitMQ v2
events. It pins `@asyncapi/parser` `3.6.0` and `@asyncapi/modelina` `5.10.1`, uses local-reference AsyncAPI `3.0.0`
documents, commits resolved deployable bundles, and generates framework-free Java 21 records in the isolated
`event-contracts` Maven module.

The task activates contract definitions only. Existing v1 publishers, listeners, converters, routes, queues, retry
behavior, and production resources remain unchanged. Transactional outboxes, dual publication, consumer migration,
deduplication, broker declarations, and traffic cutover remain owned by later roadmap tasks.

## Source And Generation Boundary

The source tree separates shared schemas, headers, messages, and channels from eight deployable documents. A ninth
component-only catalog is the single Modelina input and contains no server, channel, or operation. The direct Node
scripts call the pinned parser and Modelina libraries without AsyncAPI CLI, AsyncAPI Generator, template packs, or
Maven-side Node execution.

The bundler rejects nonlocal references, resolves every local fragment deterministically, sorts object keys, and
validates both source documents and committed resolved bundles. The Modelina target uses exactly
`modelType: "record"`, `collectionType: "List"`, and package `com.blockout.events.v2.model`. Its committed output is
the only source root of `apps/backend/event-contracts`.

## Lifecycle Contract Set

| Inventory route | V2 event type       | Producer            | Contract consumers                          |
| --------------- | ------------------- | ------------------- | ------------------------------------------- |
| `EV-CU`         | `club.upsert`       | clubs-service       | search-worker                               |
| `EV-CD`         | `club.deactivation` | competition-service | search-worker, clubs-service, teams-service |
| `EV-TU`         | `team.upsert`       | teams-service       | search-worker                               |
| `EV-TD`         | `team.deactivation` | competition-service | search-worker, teams-service                |
| `EV-PU`         | `pool.upsert`       | pools-service       | search-worker                               |
| `EV-PD`         | `pool.deactivation` | competition-service | search-worker, pools-service                |

Every event uses schema version `2.0.0`, the fixed MRG-315 envelope, canonical camelCase payload fields, stable
`x-blockout-*` headers, and standard AMQP properties. The payloads preserve only the audited lifecycle facts required
by existing consumers: club identity/name/logo/city, team identity/name/short name/club/division/format/gender/season/
logo, pool identity/name/short name/division/league/season/format/gender, and the corresponding deactivation IDs.

## Route And Queue Reconciliation

The catalog reconciles all eleven MRG-302 producer routes and all nineteen primary queues:

- six lifecycle routes and Q-01 through Q-10 have active v2 contract definitions;
- `EV-MF`, `EV-ML`, Q-14, and Q-15 remain deferred to MRG-370;
- `EV-TF`, `EV-PF`, Q-18, and Q-19 remain deferred to MRG-369;
- orphan-only `EV-TPD` remains excluded with no v2 route;
- Q-11 through Q-13 and Q-16 through Q-17 remain excluded with no v2 queue or DLQ.

Each active send/receive operation has one deployable owner. Empty matches, notification, and users deployable documents
record their deferred or excluded boundary without inventing an operation or activating an absent listener.

## Verification Evidence

- Parser validation passes for every local-reference source and every fully resolved committed bundle.
- Two clean bundle/model generations produce identical SHA-256 hashes across all nine JSON bundles and thirteen Java
  files.
- Six contract tests lock exact dependency pins, component-only catalog shape, envelope fields, all route/queue
  dispositions, generated-source confinement, and golden JSON/AMQP/header fixtures.
- The generated set contains twelve Java records plus the six-value `EventType` enum and no Spring, Lombok, JPA,
  MapStruct, Jackson annotation, naming strategy, publisher, listener, or persistence behavior.
- The isolated Maven module compiles successfully from committed generated Java files without invoking Node.

## Compatibility And Rollback

MRG-350 changes no runtime dependency or broker configuration, so current v1 event behavior remains the operational
rollback baseline. Reverting the contract source, generated bundles, generated records, Maven module, and pinned Node
dependencies restores the pre-MRG-350 repository state without a broker, database, producer, consumer, image, or
production rollback.

Later family tasks may add only their approved values, payloads, generated records, and runtime mappings. They may not
reopen the envelope, generator choice, versions, Java package/form, AMQP metadata, or MRG-304 topology.

## Closed Scope

- No runtime publisher, listener, converter, outbox, deduplication, queue, exchange, binding, retry, requeue, or DLQ
  declaration changes.
- No match or follow payload, generated record, event-type activation, or consumer mapping is pulled forward.
- No database, REST, BFF, Expo, scraper, standalone repository, deployment, production, or Maaatch change.
- No MRG-9xx or MRG-1000 work is planned, authorized, executed, or published.
