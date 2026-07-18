# MRG-401 Backend Implementation Slice Rule

- Status: active Phase MRG-400 execution rule
- Source decision: MRG-268 approved backend contract and data architecture
- Applies to: MRG-402 through MRG-430
- Runtime effect: none

## Purpose

Phase MRG-400 restructures the backend without turning architecture work into a product, contract, persistence, or
deployment change. Every roadmap item must therefore be delivered as one bounded service-feature slice with explicit
behavioral evidence. A slice is complete only when generated transport models remain confined to adapters, the
application owns meaningful role-specific inputs and outputs, and every removal satisfies the existing compatibility
gates.

This rule is normative for Phase MRG-400. Later service tasks may specialize it for their named feature, but they may
not weaken it or combine adjacent roadmap items merely because they touch the same deployable.

## 1. Authoritative Slice Boundary

One implementation slice contains exactly:

- one roadmap item;
- one owning deployable;
- the feature or workflow families named by that item;
- the minimum API, application, domain, persistence, event, and infrastructure movement required to make those roles
  explicit; and
- the tests and documentation needed to prove the same behavior and a reversible change.

A slice must not absorb the next roadmap item, restructure unrelated packages, activate an unused operation or
listener, change a public contract, alter a database schema, or redesign a partial-failure rule. If a required change
crosses an approved boundary, the current slice records the dependency and stops before making that change.

Shared support may change only when the selected feature cannot be migrated without it and every current consumer is
proved compatible. Convenience, aesthetic consistency, or a possible later reuse is not sufficient evidence.

## 2. Required Preconditions

Before editing a service, the implementation record must identify:

1. the selected roadmap item and its exact feature boundary;
2. the relevant MRG-252 through MRG-267 audit evidence and the current production-shaped source;
3. all in-scope REST operations, event routes and queues, scheduled jobs, persistence tables, vendor calls, and known
   callers;
4. the current success, error, authorization, validation, null, ordering, pagination, caching, transaction, retry,
   acknowledgement, and partial-failure behavior that the slice can exercise;
5. the generated contract adapters already established during Phase MRG-300;
6. the Flyway history and ORM mappings for every persistence type being moved; and
7. any compatibility or retirement condition still open in MRG-267 or MRG-304.

An unknown that can change visible behavior, data ownership, security, delivery guarantees, or rollback blocks that
part of the slice. The implementation may still isolate proven roles around it, but it must preserve and document the
unknown rather than resolve it by inference.

## 3. Adapter And Model Ownership

Generated object models are allowed only in the adapter that owns their wire boundary:

- generated server requests and responses stay in the inbound API adapter;
- generated downstream clients and models stay in the outbound client adapter;
- generated event envelopes and payloads stay in producer or consumer messaging adapters; and
- generated enums may cross a backend boundary only when MRG-268 classifies them as stable shared contract values.

The adapter validates and maps generated inputs before invoking application code, then maps application results back
to generated responses. Application services, ports, policies, projectors, persistence entities, cache snapshots,
Elasticsearch documents, and vendor adapters must not expose generated object models in their public signatures.

An application record is justified only when it owns a use-case role such as a command, query, view, snapshot,
decision, or plan. A field-for-field transport mirror inserted only to add another mapping step is prohibited.

Persistence entities and vendor SDK models remain infrastructure-local. Structural mappers live beside the boundary
they translate; aggregation, policy, partial results, update intent, event construction, and vendor semantics remain
explicit manual logic.

## 4. Behavioral Parity Contract

The slice must prove behavior at the narrowest stable seam before and after restructuring. Tests must exercise real
inputs and outputs or observable side effects; source scans and assertions that only restate Spring wiring do not
count as parity evidence.

The applicable parity set includes:

| Concern     | Required evidence                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| API         | request validation, authorization, response body/status, nulls, errors, and multipart bytes                        |
| Collections | ordering, filtering, pagination, empty results, duplicates, and partial omissions                                  |
| Persistence | stored values, query/update semantics, transaction boundaries, audit fields, and unchanged schema                  |
| Events      | payload bytes, metadata, ordering key, outbox transaction, deduplication, acknowledgement, retry, and DLQ behavior |
| Providers   | request mapping, timeouts, authentication, error translation, and current partial-success behavior                 |
| Projections | enrichment, fallback, ranking, cache/index identity, stale-write policy, and rebuild behavior                      |
| Operations  | configuration keys, startup behavior, health, image build, and production-shaped environment validation            |

Existing focused tests should be retained and strengthened at their behavioral seam. New mapper tests are appropriate
when a mapping carries renamed, nested, optional, defaulted, or intent-bearing data. A simple structural mapping can be
covered through its API, application, persistence, or adapter behavior instead of a wiring-only test.

## 5. Removal Gate

Moving code does not authorize deleting a legacy field, type, adapter, path, queue, annotation, conversion helper, or
compatibility shape. A removal is allowed only when the same slice records all of the following:

- its MRG-267 lineage entry and known caller inventory;
- canonical consumers that replace every active use;
- parity evidence for the replacement;
- the relevant MRG-304 coexistence, observation, rollback, and retirement conditions;
- absence of reflection, serialization, persistence, event, configuration, or standalone-repository use; and
- a focused test or repository guard that would detect accidental reintroduction where appropriate.

When any condition remains open, the legacy element stays in a named adapter with explicit ownership. Deprecated does
not mean removable, and package restructuring alone never closes a compatibility window.

## 6. Slice Execution And Completion Record

Each Phase MRG-400 item follows this sequence:

1. inventory the bounded feature and record its parity matrix;
2. write or retain focused characterization tests for risky behavior;
3. introduce the minimum role-owned application and infrastructure boundaries;
4. move generated, persistence, messaging, and vendor models behind their owning adapters;
5. migrate one call path at a time while keeping the service buildable;
6. remove only elements that pass Section 5;
7. run focused tests, the complete backend reactor, relevant image or environment checks, and the repository's full
   local pull-request gate;
8. document the final ownership, parity evidence, known unknowns, rollback, and deferred roadmap work; and
9. mark only the selected roadmap item complete, then publish that single authoritative commit.

The completion record for every slice must state:

- in-scope feature and entry points;
- before-and-after ownership;
- generated-model confinement;
- behavioral fixtures and exact validation commands;
- persistence and Flyway impact, including an explicit `none` when unchanged;
- removed legacy elements with MRG-267/MRG-304 evidence, or retained compatibility adapters;
- rollback boundary;
- unknowns and work deferred to later named roadmap items; and
- explicit confirmation that production authority was unchanged.

## 7. MRG-401 Evidence

MRG-401 changes documentation only. It establishes a single acceptance rule for all authorized Phase MRG-400 service
tasks, ties implementation to the MRG-268 ownership model, and makes generated-model confinement, behavioral parity,
Flyway preservation, compatibility retirement, rollback, focused validation, and one-task publication mandatory.

No service source, contract, generated artifact, event topology, database mapping, dependency, runtime configuration,
deployment, or production state changes in this task.
