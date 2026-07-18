# MRG-315 — AsyncAPI And Generated RabbitMQ Records

- Status: approved
- Decision date: 2026-07-17
- Runtime effect: none; MRG-315 changes documentation and future task structure only
- Applies to: Blockout-owned RabbitMQ v2 messages, publishers, consumers, and generated Java event models

## Decision

AsyncAPI `3.0.0` JSON documents are the authoritative source for Blockout RabbitMQ v2 contracts. Event contracts are
independent from OpenAPI and are never represented as fake REST endpoints.

The selected toolchain is exact:

| Tool                 | Version  | Role                                                       |
| -------------------- | -------- | ---------------------------------------------------------- |
| AsyncAPI             | `3.0.0`  | event source and deterministic bundle format               |
| `@asyncapi/parser`   | `3.6.0`  | parse, validate, dereference, and resolve local references |
| `@asyncapi/modelina` | `5.10.1` | generate Java 21 event records                             |

Blockout does not use AsyncAPI CLI, AsyncAPI Generator, template packs, or custom model templates. Handwritten scripts
call the parser and Modelina libraries directly so the repository owns deterministic inputs, outputs, diagnostics,
and ordering.

## 1. Source And Bundle Layout

MRG-350 creates this source boundary:

```text
libs/shared/contracts/events/
├── source/
│   ├── shared/
│   │   ├── schemas/
│   │   ├── headers/
│   │   ├── messages/
│   │   └── channels/
│   ├── deployables/
│   │   ├── clubs-service.json
│   │   ├── competition-service.json
│   │   ├── matches-service.json
│   │   ├── notification-service.json
│   │   ├── pools-service.json
│   │   ├── search-worker.json
│   │   ├── teams-service.json
│   │   └── users-service.json
│   └── catalog.json
├── scripts/
└── README.md
```

There is one root for each deployable that currently publishes, consumes, or declares active RabbitMQ behavior. A
deployable root declares only its real send/receive operations and references shared local fragments. `catalog.json`
contains the complete components needed for record generation but no operation, server, or invented behavior.

All `$ref` values are repository-local relative references. HTTP references, registries, runtime schema lookup, and
cross-repository inputs are forbidden. Source files are JSON, not YAML, to keep parsing, ordering, and repository diffs
deterministic.

Resolved bundles are generated into the ignored directory:

```text
libs/shared/contracts/generated/events/
├── catalog.json
├── clubs-service.json
├── competition-service.json
├── matches-service.json
├── notification-service.json
├── pools-service.json
├── search-worker.json
├── teams-service.json
└── users-service.json
```

Generated bundles are outputs, never edited manually. The bundler writes stable key order and line endings, strips no
semantic field, rejects unresolved or remote references, and must produce no diff on a second clean execution.

## 2. AsyncAPI Modeling Rules

Each deployable root uses AsyncAPI `3.0.0` and models the existing topic exchanges and v2 routing keys as AMQP channels.
Operations describe only active producer or consumer ownership. Shared channel fragments define addresses and bindings;
shared message fragments define envelope/payload and AMQP metadata.

The source must not:

- create an HTTP path or OpenAPI bridge for an event;
- add a send/receive operation to make an unused component reachable;
- activate a listener absent from current source;
- create a v2 channel for an orphan-only route;
- describe an exchange, queue, binding, retry, DLQ, or acknowledgement behavior that MRG-302/MRG-304 did not approve;
- reuse a REST DTO, JPA entity, cache snapshot, Elasticsearch document, or application view as an event schema.

`catalog.json` is the intentional component-only generation input. It is the event equivalent of a model catalog, not
a runtime API and not a broker declaration.

## 3. Canonical V2 Envelope

Every v2 message payload is an event-specific envelope record. The record name is `<FamilyName>V2Event`; its `payload`
field uses a generated `<FamilyName>V2Payload`. All event records share these fields and constraints:

| Field              | Required | Contract                                                                    |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `eventId`          | yes      | UUID generated once by the outbox and reused for v1/v2 publication          |
| `eventType`        | yes      | generated event-contract-owned `EventType`; never imported from REST models |
| `schemaVersion`    | yes      | semantic version; initial value `2.0.0`                                     |
| `occurredAt`       | yes      | UTC `date-time` for the application fact, not broker delivery time          |
| `producer`         | yes      | stable owning deployable identifier                                         |
| `correlationId`    | no       | caller/workflow correlation identifier when one exists                      |
| `orderingKey`      | yes      | non-empty key for the event family's ordering scope                         |
| `aggregateVersion` | no       | non-negative monotonic aggregate version when the producer owns one         |
| `payload`          | yes      | generated family-specific camelCase payload                                 |

`EventType` belongs only to the event-contract catalog and generated event module. It is not added to REST
`shared-models`. MRG-350, MRG-369, and MRG-370 add only the values and payloads for their owned event families; they may
not change the envelope, generator, version policy, or topology.

All Blockout-owned envelope and payload fields are canonical `camelCase`. Database column names and legacy v1 message
keys remain outside this source. A payload may contain only the facts needed by its approved consumers and recovery;
the family task derives those facts from MRG-253 through MRG-262 and MRG-302 rather than copying a legacy Java class.

## 4. Versioning

The route suffix and schema version have separate roles:

- `.v2` selects the major wire family and coexistence topology;
- `schemaVersion` starts at `2.0.0` and records the exact compatible schema revision;
- a backward-compatible additive evolution increments minor or patch and remains on `.v2`;
- consumers reject or quarantine an unsupported schema version according to their existing acknowledgement/DLQ
  behavior; they do not guess;
- a breaking evolution requires a new major route suffix, new queues/bindings, a new coexistence decision, and an
  independently generated contract family.

Removing or tightening an optional field, changing meaning/type, renaming a key, changing an enum incompatibly, or
altering ordering identity is breaking. Adding an optional field with a safe default may be compatible only after every
consumer proves unknown-field handling.

## 5. AMQP Metadata

The v2 publisher maps the envelope to standard AMQP properties:

| AMQP property  | Source                       |
| -------------- | ---------------------------- |
| `messageId`    | `eventId`                    |
| `type`         | stable `eventType` value     |
| `timestamp`    | `occurredAt`                 |
| correlation ID | `correlationId` when present |

The stable application headers are:

- `x-blockout-schema-version` from `schemaVersion`;
- `x-blockout-producer` from `producer`;
- `x-blockout-ordering-key` from `orderingKey`;
- `x-blockout-aggregate-version` only when `aggregateVersion` is present.

The JSON body remains self-describing; consumers validate body and metadata agreement. V2 messages never publish or
depend on Spring's `__TypeId__` header. Publisher/consumer mapping uses the generated contract record selected by the
route rather than runtime Java-class discovery.

During dual publication, the v1 body, properties, routing key, queue, and converter behavior remain unchanged except
for additive `x-blockout-event-id`. That header carries the same UUID as the v2 envelope `eventId`. No other v2
metadata is backported to v1.

## 6. Generated Java Records

MRG-350 configures Modelina with:

- Java 21 output;
- `modelType: "record"`;
- `collectionType: "List"`;
- package `com.blockout.events.v2.model`;
- deterministic file names and one public record/enum per file;
- ignored output under `apps/backend/event-contracts/src/generated/java/**`.

Generated records contain only values, nested generated event types, Java standard types, and generated event enums.
They contain no Spring, Lombok, JPA, MapStruct, `@JsonProperty`, `@JsonAlias`, Jackson naming strategy, service method,
publisher, listener, or persistence behavior.

MRG-350 creates the `apps/backend/event-contracts` Maven module and adds `src/generated/java` as its only event-model
source root. The module packages generated records and has no Node execution in Maven. A build boundary from a clean
checkout runs Nx generation before Maven, verifies deterministic output, and then compiles the generated sources.
Services depend on this model-only jar only when their family migration task opens that boundary.

MRG-431 amends the earlier committed-output policy to match Maaatch: resolved bundles and Java records remain generated
contract artifacts but are ignored by Git and recreated from the authoritative AsyncAPI sources.

No service copies a generated event record. Publishers map application facts into records in outbound messaging
adapters. Consumers accept records at inbound messaging adapters and map immediately to application commands or
projection inputs.

## 7. Approved V2 Topology

MRG-315 adopts the MRG-304 topology unchanged:

- reuse `entity.lifecycle.exchange` and `user.follow.exchange`;
- append `.v2` to each approved legacy producer routing key;
- use distinct `.v2` primary queues and `.v2` DLQ keys/queues where MRG-304 defines them;
- let `notification-service` alone declare v2 notification queues, including successors to Q-14 and Q-15;
- create no v2 queue for Q-11 through Q-13 or Q-16 through Q-17;
- create no v2 channel/publication for `teambypool.deactivation` while it remains orphan-only;
- activate no absent listener.

| Inventory route | V2 channel                   | Contract task | V2 queue disposition                                  |
| --------------- | ---------------------------- | ------------- | ----------------------------------------------------- |
| `EV-CU`         | `club.upsert.v2`             | MRG-350       | Q-01 successor                                        |
| `EV-TU`         | `team.upsert.v2`             | MRG-350       | Q-03 successor                                        |
| `EV-PU`         | `pool.upsert.v2`             | MRG-350       | Q-05 successor                                        |
| `EV-CD`         | `club.deactivation.v2`       | MRG-350       | Q-02, Q-07, and Q-09 successors                       |
| `EV-TD`         | `team.deactivation.v2`       | MRG-350       | Q-04 and Q-08 successors; no Q-11 successor           |
| `EV-PD`         | `pool.deactivation.v2`       | MRG-350       | Q-06 and Q-10 successors; no Q-12 successor           |
| `EV-TPD`        | none                         | exclusion     | no Q-13 successor                                     |
| `EV-MF`         | `match.finished.v2`          | MRG-370       | Q-14 successor, notification-service declaration only |
| `EV-ML`         | `match.live-link-created.v2` | MRG-370       | Q-15 successor, notification-service declaration only |
| `EV-TF`         | `team.follow.v2`             | MRG-369       | Q-18 successor; no Q-16 successor                     |
| `EV-PF`         | `pool.follow.v2`             | MRG-369       | Q-19 successor; no Q-17 successor                     |

The generated contract describes messages/channels; it does not declare broker resources. Service-local Spring
RabbitMQ configuration remains the topology adapter and must match the approved bundle and MRG-304 matrix exactly.

## 8. Publication, Shadowing, And Cutover

Dual-publish starts only after the owning transactional outbox task. One outbox event owns the event UUID and separate
idempotent v1/v2 publication state. Direct dual-publish from service logic is forbidden.

A shadow v2 consumer may validate the bundle, record, JSON, headers, ordering, and schema version but performs no
notification, counter, cascade, search, or other business side effect. Live cutover and rollback use the exact paused
publisher/drain/switch/resume sequence in MRG-304. V1 and v2 side-effect consumers never run concurrently.

Production activation remains forbidden until the mandatory read-only broker snapshot closes queue arguments,
policies, depths, unacknowledged counts, retry/DLQ state, vhost/TLS, and external-consumer unknowns. MRG-315 does not
authorize that snapshot or any production action.

## 9. Migration Ownership

| Task    | Responsibility                                                                                                                                                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MRG-350 | create parser/bundler/Modelina tooling, event-contracts Maven module, common envelope/header/channel components, generated Java records, and club/team/pool lifecycle contracts; reconcile all 11 inventory routes and record the orphan exclusion |
| MRG-369 | add favorite/follow `EventType` values and payloads, generated records, publisher/consumer mappings, projection idempotency, compatibility, reconciliation, and rollback                                                                           |
| MRG-370 | add match-finished/live-link `EventType` values and payloads, generated records, publisher/consumer mappings, acknowledgement/order/version compatibility, and rollback                                                                            |
| MRG-371 | add transactional outboxes and idempotent v1/v2 publication for clubs, teams, pools, and competition using the fixed envelope/metadata                                                                                                             |
| MRG-372 | add matches/users outboxes, shared event-ID publication, migrated-consumer deduplication, and current retry/requeue/DLQ preservation                                                                                                               |
| MRG-802 | enforce source validation, local-reference resolution, deterministic bundles/records, golden JSON, Maven compilation, topology reconciliation, and forbidden-annotation/header guards in CI                                                        |

Payload fields remain owned by the family tasks because their field-level audits must prove consumer need. Those tasks
cannot reopen AsyncAPI, versions, generator choice, Java output form/package, envelope, AMQP metadata, or MRG-304
topology.

## 10. Future Proof Gates

MRG-350 and later family tasks must collectively prove:

- all 11 legacy producer routes are reconciled, including the explicit EV-TPD exclusion;
- all 19 primary queues are reconciled, including no v2 Q-11–Q-13/Q-16–Q-17 equivalents;
- every active v2 send/receive operation has one real owner and local references resolve;
- AsyncAPI 3 parsing/validation passes and two clean bundle/model generations produce no diff;
- Java 21 records compile through the hermetic `event-contracts` Maven module;
- event-specific golden JSON matches the envelope, camelCase payload, AMQP properties, and stable headers;
- generated source contains no Spring, Lombok, JPA, MapStruct, `@JsonProperty`, `@JsonAlias`, or Jackson naming strategy;
- no publisher emits and no consumer depends on `__TypeId__`;
- the v1 dual-publish copy carries only the additive shared `x-blockout-event-id`;
- shadow consumers have no side effects and absent listeners remain absent;
- acknowledgement, ordering, retry/requeue, DLQ, idempotency, and rollback behavior is parity-covered per route family.

MRG-315 does not create an AsyncAPI source, bundle, generated record, Maven module, publisher, listener, exchange,
queue, binding, broker connection, outbox, deployment, or runtime behavior.

## References

- [AsyncAPI 3.0.0 specification](https://www.asyncapi.com/docs/reference/specification/v3.0.0)
- [AsyncAPI Modelina](https://www.asyncapi.com/tools/modelina)
