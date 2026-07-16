# Backend Contract and Data-Boundary Audit Template

## Purpose

Use this template for each MRG-252 through MRG-266 read-only audit. It reconstructs current behavior before any
OpenAPI source contract, generated client, DTO replacement, mapper introduction, entity separation, casing cutover, or
legacy cleanup.

The audit must explain what the deployed code does. It must not silently turn the current Springdoc document, a Java
class, an Expo type, or a scraper dictionary into the target contract.

## Audit Invariants

- Do not change runtime code, contracts, generated artifacts, configuration, migrations, tests, or deployment files.
- Preserve user-visible behavior as evidence; do not redesign it during discovery.
- Record facts separately from inferences and target proposals.
- Trace every field individually, including apparently unused, duplicated, temporary, and calculated fields.
- Do not mark a field removable from a repository search alone. Prove its producers, consumers, persistence, events,
  external callers, rollout order, and rollback constraints first.
- Treat Springdoc output as implementation evidence, not contract authority.
- Treat current Jackson annotations, naming strategies, and client conversions as evidence of compatibility behavior,
  not as patterns to preserve automatically.
- Classify Blockout-owned and vendor-owned payloads separately.
- Keep the audit result read-only. Target architecture remains provisional until MRG-268 is approved in Plan mode.

## Evidence Status

Use one status for every non-trivial claim:

| Status           | Meaning                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `PROVEN`         | Directly supported by a cited source location, test, configuration, or observed caller.      |
| `INFERRED`       | Strongly implied by code or configuration, but not proven by an executed or complete path.   |
| `UNKNOWN`        | Evidence is absent, contradictory, environment-dependent, or outside the available checkout. |
| `NOT_APPLICABLE` | The column or behavior does not apply to this boundary.                                      |

Every `INFERRED` or `UNKNOWN` item must state the missing evidence needed to resolve it.

## Field Classification

Assign exactly one primary classification to every field. Add secondary notes when a field has more than one role.

| Classification       | Meaning                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `REQUIRED`           | A current Blockout behavior or proven consumer requires the field on this boundary.                |
| `DERIVED`            | The field is calculated or enriched from other state and is not independently owned.               |
| `COMPATIBILITY_ONLY` | The field exists for a legacy caller, casing bridge, rollout, or backward-compatible read.         |
| `VENDOR_OWNED`       | The field and its casing belong to an external provider payload contained by an adapter.           |
| `PERSISTENCE_ONLY`   | The field belongs to storage and is not part of the intended transport or application boundary.    |
| `EVENT_ONLY`         | The field is required only by an asynchronous producer or consumer contract.                       |
| `REMOVABLE`          | All known producers and consumers prove the field has no required role; removal is still deferred. |

`REMOVABLE` is an audit conclusion, not authorization to delete the field.

## Audit File and Scope

Create one audit file per roadmap item under `docs/migration/backend-contract-audits/` using the roadmap task and
scope, for example `mrg-252-config-service.md` or `mrg-265-gateway-club-team-pool-aggregations.md`.

Start every audit with this header:

```markdown
# <MRG task> — <service or workflow> contract and data-boundary audit

- Audit date: YYYY-MM-DD
- Commit: <full monorepo commit SHA>
- Scope roots: <repository paths>
- Audited deployable or workflow: <name>
- Runtime mutation: none
- Evidence limitations: <none or explicit limitations>
```

Then state:

- included controllers, consumers, producers, clients, DTOs, entities, repositories, mappers, mobile modules, scraper
  modules, configurations, and tests;
- explicitly excluded code and why;
- standalone-repository evidence, if required and available;
- environment or production observations that are unavailable locally.

## 1. Runtime Boundary Summary

Record ownership before individual fields.

| Boundary | Current owner | Entry mechanism | Callers or producers | Consumers | Auth | Data owner | Evidence | Status |
| -------- | ------------- | --------------- | -------------------- | --------- | ---- | ---------- | -------- | ------ |
|          |               |                 |                      |           |      |            |          |        |

Include:

- inbound REST and multipart operations;
- outbound HTTP calls;
- RabbitMQ producers and consumers;
- scheduled jobs and cache bootstrap paths;
- database, S3, Elasticsearch, Auth0, Expo, GitHub, Discord, and federation boundaries;
- mobile and scraper entrypoints that construct or consume Blockout payloads.

## 2. REST Operation Inventory

Use one row per concrete operation, including operations that return entities directly.

| Operation ID | Controller method | Method and path | Auth rule | Request shape | Response shape | Errors | Pagination | Multipart | Callers | Evidence | Status |
| ------------ | ----------------- | --------------- | --------- | ------------- | -------------- | ------ | ---------- | --------- | ------- | -------- | ------ |
|              |                   |                 |           |               |                |        |            |           |         |          |        |

For each operation, document below the table:

1. path, query, header, body, and multipart-part serialization names;
2. required, optional, nullable, defaulted, and ignored inputs;
3. response status and concrete body for success, empty results, validation failure, authorization failure, missing
   state, downstream failure, and unexpected failure;
4. ordering, pagination, totals, `hasNext`, filtering, and deduplication semantics;
5. direct entity exposure, lazy-loaded relationships, framework types, or implementation-derived Springdoc behavior;
6. current caller assumptions in Expo, scrapers, BFF clients, or other services.

Do not invent an operation ID when none exists. Use `MISSING` and cite the controller method.

## 3. Event and Scheduled Entry Inventory

Use one row per exchange/routing-key direction, listener method, scheduler, or bootstrap path.

| Entry ID | Kind | Producer | Consumer | Exchange / routing key / schedule | Payload type | Retry or failure behavior | Evidence | Status |
| -------- | ---- | -------- | -------- | --------------------------------- | ------------ | ------------------------- | -------- | ------ |
|          |      |          |          |                                   |              |                           |          |        |

Record serializer configuration, envelope shape, headers, idempotency assumptions, ordering assumptions, dead-letter
behavior, and whether the payload is Blockout-owned or vendor-owned.

## 4. Type Inventory

Inventory every shape before producing the field matrix.

| Type ID | Class or shape | Layer / role | Owner | Mutable | Constructed by | Consumed by | Serialized | Duplicate family | Evidence | Status |
| ------- | -------------- | ------------ | ----- | ------- | -------------- | ----------- | ---------- | ---------------- | -------- | ------ |
|         |                |              |       |         |                |             |            |                  |          |        |

The inventory includes:

- handwritten REST request, response, and shared DTOs;
- JPA entities, embedded types, projections, and repository result shapes;
- application inputs, commands, views, result types, and neutral payloads;
- domain concepts and enums;
- RabbitMQ events and envelopes;
- vendor request and response types;
- copied downstream DTOs and handwritten HTTP client shapes;
- Expo TypeScript interfaces, local view/form models, and request builders;
- scraper dictionaries, dataclasses, TypedDicts, Pydantic models, and raw JSON construction;
- Springdoc/OpenAPI annotations that affect the exposed schema.

Use stable local `Type ID` values so later matrices can refer to a type even when several classes share its simple
name.

## 5. Field-Lineage Matrix

Use one row per field per type. Inheritance, embedding, repeated nested fields, and copied DTOs still require separate
rows because their ownership and consumers may differ.

| Type ID | Field | Java / TS / Python name | Current wire name | Target Blockout wire name | Direction | Producer | Consumers | Validation | Null / default | Derivation | Persistence | Conversion / annotation | Classification | Evidence | Status |
| ------- | ----- | ----------------------- | ----------------- | ------------------------- | --------- | -------- | --------- | ---------- | -------------- | ---------- | ----------- | ----------------------- | -------------- | -------- | ------ |
|         |       |                         |                   |                           |           |          |           |            |                |            |             |                         |                |          |        |

For every row, verify:

- the exact declaration and serialization name, including snake_case/camelCase differences;
- every code path that assigns, calculates, defaults, copies, or deserializes the field;
- every controller, service, client, event, mobile screen/hook, scraper, worker, template, or vendor adapter that reads
  it;
- Bean Validation, manual validation, database constraints, frontend validation, and implicit validation;
- nullability differences between declarations, storage, serialization, and observed callers;
- database table/column, relation, index, JSON column, S3 key, or Elasticsearch field when applicable;
- `@JsonProperty`, `@JsonAlias`, global naming policy, `ObjectMapper`, manual map, spread, rename, and request/response
  transform behavior;
- whether the proposed canonical Blockout-owned wire name is camelCase;
- the evidence status and source locations.

For vendor-owned payloads, put the provider spelling in `Current wire name`, set `Target Blockout wire name` to
`NOT_APPLICABLE`, and identify the adapter that contains the provider shape.

## 6. Construction, Mapping, and Conversion Inventory

| Conversion ID | Source | Target | Location | Mechanism | Field loss / defaults | Business logic mixed in | Proposed boundary owner | Evidence | Status |
| ------------- | ------ | ------ | -------- | --------- | --------------------- | ----------------------- | ----------------------- | -------- | ------ |
|               |        |        |          |           |                       |                         |                         |          |        |

Include:

- constructors and setters that turn DTOs directly into entities;
- entity-to-response assembly;
- MapStruct, manual mappers, static factories, builders, and copy constructors;
- `ObjectMapper.convertValue`, tree conversions, stringified multipart JSON, and untyped maps;
- Jackson annotations and service-wide naming configuration;
- BFF copied downstream DTOs and pass-through responses;
- Expo and scraper case-conversion utilities;
- vendor adapters and compatibility reads.

State `NONE` explicitly when a boundary has no mapper. Do not propose MapStruct automatically: identify the target
boundary role first and leave final architecture approval to MRG-268.

## 7. Duplicate-Type Analysis

| Duplicate family | Members | Same wire meaning? | Field differences | Validation differences | Current reason | Proven consumers | Provisional disposition | Evidence | Status |
| ---------------- | ------- | ------------------ | ----------------- | ---------------------- | -------------- | ---------------- | ----------------------- | -------- | ------ |
|                  |         |                    |                   |                        |                |                  |                         |          |        |

Distinguish intentional projections from accidental copies. A BFF projection may resemble a service DTO while still
having a different owner and consumer-backed purpose. Shared enums are candidates for one shared contract definition;
object DTOs remain boundary-local by default.

## 8. Persistence Boundary

| Entity / projection | Table or store | Identifier | Relationships | API exposure | Application exposure | DTO construction path | Constraint gaps | Evidence | Status |
| ------------------- | -------------- | ---------- | ------------- | ------------ | -------------------- | --------------------- | --------------- | -------- | ------ |
|                     |                |            |               |              |                      |                       |                 |          |        |

Record direct entity responses, entity inputs, cascade and fetch assumptions, repository projections, JSON columns,
auditing fields, database defaults, and fields whose transport meaning differs from their persistence meaning.

## 9. Validation, Error, and Compatibility Behavior

| Boundary | Validation source | Rule | Current failure | Caller expectation | Compatibility dependency | Evidence | Status |
| -------- | ----------------- | ---- | --------------- | ------------------ | ------------------------ | -------- | ------ |
|          |                   |      |                 |                    |                          |          |        |

Include Bean Validation, controller checks, service checks, repository constraints, frontend validation, scraper
assumptions, error translations, aliases, fallback reads, and casing bridges. Separate durable behavior from accidental
framework output.

## 10. Test and Parity Evidence

| Behavior | Existing test or check | Layer | What it proves | What it does not prove | Missing parity test for later migration | Evidence | Status |
| -------- | ---------------------- | ----- | -------------- | ---------------------- | --------------------------------------- | -------- | ------ |
|          |                        |       |                |                        |                                         |          |        |

Inventory unit, mapper, controller, repository, integration, contract, mobile, scraper, and end-to-end coverage. Do not
add tests during the audit. Record the exact behavioral parity checks required before a legacy type, field, conversion,
or annotation can be removed.

## 11. BFF and Aggregation Extension

Complete this section for MRG-263 through MRG-266 and for any service audit that discovers aggregation behavior.

### Operation Call Graph

| BFF operation | Step | Downstream call | Cardinality / fan-out | Ordering | Pagination | Auth propagation | Cache | Partial failure | Null / fallback | Evidence | Status |
| ------------- | ---- | --------------- | --------------------- | -------- | ---------- | ---------------- | ----- | --------------- | --------------- | -------- | ------ |
|               |      |                 |                       |          |            |                  |       |                 |                 |          |        |

### Projection Field Justification

| BFF response field | Source call / field | Transformation | Frontend consumer | User-visible purpose | Repeated lookup | Failure behavior | Classification | Evidence | Status |
| ------------------ | ------------------- | -------------- | ----------------- | -------------------- | --------------- | ---------------- | -------------- | -------- | ------ |
|                    |                     |                |                   |                      |                 |                  |                |          |        |

Record fan-out inside loops, repeated calls, batching opportunities as observations, deterministic ordering, merge
keys, deduplication, pagination assembly, partial results, exception translation, and every enriched field. Do not
remove an expensive aggregation solely because it looks large; prove the Expo workflow and user-visible purpose.

## 12. Findings and Provisional Target Roles

List findings by evidence-backed impact, not by stylistic preference.

| Finding ID | Observation | Behavioral risk | Affected boundaries | Evidence | Status | Follow-up roadmap task |
| ---------- | ----------- | --------------- | ------------------- | -------- | ------ | ---------------------- |
|            |             |                 |                     |          |        |                        |

Then record provisional ownership without approving architecture:

| Current type or behavior | Proposed owner | Proposed target role | Keep / split / map / retire | Preconditions | Decision owner | Status |
| ------------------------ | -------------- | -------------------- | --------------------------- | ------------- | -------------- | ------ |
|                          |                |                      |                             |               | MRG-268        |        |

Allowed target roles include generated API DTO, application command/input, application view/read model, domain value,
JPA entity, event payload, vendor adapter payload, persistence projection, BFF projection, frontend view/form model,
and removable compatibility artifact.

## 13. Unknowns and Required Follow-up Evidence

| Unknown | Why unresolved | Evidence already checked | Required source, environment, or owner | Blocking later task? |
| ------- | -------------- | ------------------------ | -------------------------------------- | -------------------- |
|         |                |                          |                                        |                      |

Do not conceal missing standalone repositories, unavailable production telemetry, undocumented external consumers, or
environment-dependent behavior. Mark the downstream task blocked only when the missing evidence prevents its stated
outcome.

## 14. Audit Completion Checklist

An audit is complete only when:

- [ ] every in-scope REST, event, scheduled, persistence, vendor, mobile, scraper, and worker boundary is inventoried;
- [ ] every in-scope type has a stable Type ID and every field has a lineage row;
- [ ] current wire casing and the proposed canonical Blockout casing are explicit;
- [ ] producers, consumers, validation, defaults, derivations, persistence, and conversions are cited;
- [ ] direct entity exposure and missing or existing mapper boundaries are explicit;
- [ ] duplicated shapes are grouped without assuming they should be shared;
- [ ] BFF call graphs and projection-field purposes are complete where applicable;
- [ ] existing tests and missing behavioral parity evidence are recorded;
- [ ] every field has one primary classification;
- [ ] every inference and unknown names the evidence required to resolve it;
- [ ] target roles remain provisional and route to MRG-268;
- [ ] no runtime or generated artifact changed;
- [ ] documentation links and formatting checks pass.

## Downstream Handoff

The service and BFF audits feed these later tasks without replacing them:

- MRG-267 consolidates duplicate types and cross-service field lineage.
- MRG-268 approves the target data architecture and migration sequence.
- MRG-301 reconstructs the deployed REST wire inventory.
- MRG-302 reconstructs asynchronous contracts.
- MRG-303 inventories handwritten clients and casing conversions across all consumers.
- MRG-304 approves coexistence, compatibility, deployment, and rollback sequencing.
- MRG-305 onward defines source contracts and generators only after those gates are satisfied.

The audit may recommend a later task, but it must not perform that task early.
