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

Use records for immutable commands and views, and constructor injection for dependencies. Apply the focused Lombok conventions below to handwritten classes; generated contracts retain their generator-owned construction and accessors.

Put mappers at the boundary they translate. Mechanical mapping defaults to MapStruct; decisions, aggregation, union dispatch and exceptional construction stay explicit. Read [mapping](references/mapping.md) when adding or changing a mapper.

Use standard Bean Validation for boundary shapes and typed validated `@ConfigurationProperties` for startup settings. Do not repeat generated constraints manually. Cross-field and domain decisions remain explicit. Avoid application-context lookup, field injection and custom framework extensions without an actual unmet need.

## Focused Lombok conventions

Lombok removes mechanical code without choosing mutability, identity or business rules. These annotation choices are this pack's conventions, not Spring requirements.

- Use `@Getter` for intended readable properties, at class level only when that exposure fits the class. Use field-level `@Setter` for authorized simple assignments. Preserve visibility and accessor semantics; validation, normalization and coordinated state changes remain explicit methods. Do not add accessors merely because fields exist.
- Use `@RequiredArgsConstructor` for constructors that only assign uninitialized final dependencies. Preserve parameter annotations such as Spring qualifiers; do not assume Lombok copies them. Keep an explicit constructor when that is the simplest way to preserve injection or initialization behavior.
- Use `@NoArgsConstructor` for an actual framework requirement or an existing private utility constructor. Choose the required access level; do not use `force = true` to bypass final-field initialization.
- Use `@AllArgsConstructor` only when its generated parameter list exactly matches the intended creation contract. Keep a selective constructor when owner-managed fields, defaults or invariants must stay outside that contract.
- Introduce `@Builder` only when actual construction sites benefit from named arguments, such as several easily confused values or optional inputs. Prefer annotating the intended constructor or factory when construction selects fields or validates state. A builder does not enforce required arguments at compile time; preserve required checks and defaults. Do not add production builders solely for test fixtures or automatically to every model.
- Prefer focused annotations over blanket `@Data`, which also generates setters, equality and string representations. Prefer native records for immutable values rather than replacing them with Lombok `@Value` classes.
- Add `@ToString` only for a concrete diagnostic need with safe fields. Use `onlyExplicitlyIncluded = true` when the class contains relationships or sensitive values. Choose equality semantics before using `@EqualsAndHashCode`; persistence-specific constraints belong in [entity contracts](references/persistence.md#entity-contracts).

Keep the existing managed Lombok version and native annotation-processor configuration; follow [MapStruct integration](references/mapping.md) when both processors participate. Do not customize generated sources or add global Lombok configuration without a demonstrated need. Verify behavior and actual compiled consumers rather than testing generated boilerplate or annotation spelling.

Mechanics: [accessors](https://projectlombok.org/features/GetterSetter), [constructors](https://projectlombok.org/features/constructor), [builders](https://projectlombok.org/features/Builder), [`@Data`](https://projectlombok.org/features/Data), [string representations](https://projectlombok.org/features/ToString) and [equality](https://projectlombok.org/features/EqualsAndHashCode).

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
