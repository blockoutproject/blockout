---
name: java-spring
description: "Design, implement or review Java Spring Boot features, application boundaries, JPA persistence and mapping. Use for backend behavior and architecture, not to upgrade the framework."
---

# Java and Spring

This pack chooses feature-first application architecture, explicit persistence ports and explicit Java types. These are personal conventions, not requirements imposed by Spring. Inspect the accepted task, repository instructions, module build and existing runtime first. A policy update does not authorize a dependency upgrade or whole-project migration.

## Structure and dependency direction

Group a growing service by business capability, then by role. Create only occupied packages:

```text
feature/
  api/                 # HTTP implementations, validation, error translation, transport mappers
  application/         # use cases, commands, views, outbound ports
  domain/              # pure concepts and invariants when the feature needs them
  infrastructure/      # persistence, provider, messaging and other adapters
config/                # executable application's wiring and typed settings
shared/                # stable technical semantics used by active features
```

A small single-feature service can keep the same roles flat. Avoid generic `impl`, `utils`, `helpers`, `common` and `records` packages. One application service owns a coherent use-case family; do not require one class per endpoint. Cross-feature calls use an explicit application API, never another feature's entity, repository or private implementation.

- Keep controllers and adapters thin. Application code owns decisions and orchestration.
- Always place persistence behind an application-owned port and an infrastructure adapter, including basic CRUD. Design the port around needed reads and writes, not a copy of `JpaRepository`.
- Do not create `Service`/`ServiceImpl` pairs by default. Other ports need a real external seam, such as a provider, storage, clock or messaging.
- Return immutable application views or meaningful domain values. Do not return entities, Spring Data `Page`, generated object DTOs, servlet objects or HTTP client types from application APIs.
- A generated OpenAPI enum may appear in Java application code only when the contract owns that exact concept. Application-only and provider vocabularies stay with their owner. Pure domain code remains independent of OpenAPI, Spring, JPA and messaging, including generated enums.
- Create domain objects for invariants, values and behavior; do not duplicate every CRUD entity into a ceremonial domain model.

## Helpers and public boundaries

Keep simple expressions local. A private function used once is useful when it names a coherent step or makes an invariant easier to understand; it does not justify a reusable framework. Before extracting shared behavior, search existing owners. When a second consumer needs the same rule, reuse or move the existing function to the narrowest meaningful common owner and remove copies. Share identical knowledge, not merely similar syntax.

An exported contract or public boundary can be justified with one consumer. Do not prohibit exports mechanically or create global utils, generic facades, registries or layers in anticipation of reuse. Investigate the underlying ownership or data-flow problem before adding another adapter around its symptom.

## Types, mapping and injection

Use explicit Java types everywhere in handwritten code, including loops, resources and tests: no `var`. Use enums for owned known finite concepts rather than string status vocabularies. Reuse an exact contract-owned enum in application code where allowed; identifiers and extensible provider keys are not enum vocabularies. Qualify enum constants except switch case labels. Preserve serialized values and handle supported unknown provider values without accidentally granting access.

Use records for immutable commands and views. Use constructor injection and Lombok `@RequiredArgsConstructor` when the constructor only assigns final dependencies, preserving qualifiers. Keep explicit constructors that enforce invariants or initialize state. Use focused `@Getter`/`@Setter`; never blanket `@Data` or automatic builders. Do not expose setters for generated IDs or managed versions.

Put mappers at the boundary they translate. Mechanical mapping defaults to MapStruct; decisions, aggregation, union dispatch and exceptional construction stay explicit. Read [mapping](references/mapping.md) when adding or changing a mapper.

Use standard Bean Validation for boundary shapes and typed validated `@ConfigurationProperties` for startup settings. Do not repeat generated constraints manually. Cross-field and domain decisions remain explicit. Avoid application-context lookup, field injection and custom framework extensions without an actual unmet need.

## Use cases, transactions and failures

Place `@Transactional` on the application service operation owning a coherent database write. The service calls explicit port methods; adapter-internal dirty checking is an implementation detail. Complete lazy reads and entity mapping inside that transaction. Do not rely on HTTP serialization or keep a database transaction open during external network calls.

Atomicity covers participating local transactional resources only. Multiple databases, messaging and HTTP do not become atomic through an annotation. Define ordering, idempotency, locking, optimistic conflict handling or an outbox only when the accepted invariant needs them; prove their failure behavior.

Use targeted application exceptions for expected rejections such as not-found, conflict or forbidden operations, translated once at the API boundary. Ordinary alternatives use values, enums or `Optional`. Do not introduce a generic `Result` framework or exceptions for normal branching. Preserve causes for technical failures without exposing provider details.

## Persistence and integrations

Read [JPA persistence](references/persistence.md) for entities, queries, writes or transaction-sensitive changes. Spring Data JPA is the default; SQL/JDBC exceptions need a concrete unsupported operation or measured unmet requirement and prior human approval. An already explicit request for that exception counts as authorization; do not ask again.

Each service owns its data and complete business resources. Use owner-controlled contracts across services, never shared tables or imported entities. A gateway composes client workflows without taking canonical ownership of service data. Keep downstream clients and message models in adapters, preserve configured timeouts and failure translation, and acknowledge messages only after the accepted durable outcome. Never assume exactly-once delivery.

Keep generated Java under the build output directory. Add dependencies to the narrowest owning module and use existing managed versions. A size or collaborator count is a review signal, not a reason to split coherent code mechanically.

## Evidence

Inspect dependency direction, application enum exceptions, mapper placement, entity leakage and transaction ownership. Run the owning module's meaningful tests and build; include affected consumer modules and real database/runtime evidence for the changed boundaries. Run the full backend reactor when the impact cannot be bounded or repository checks require it. Prove database semantics against the actual engine, not repository mocks. Confirm generated files remain ignored, format the changed sources and inspect the complete diff. Report unavailable integration evidence explicitly.
