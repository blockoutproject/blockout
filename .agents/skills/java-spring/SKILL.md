---
name: java-spring
description: "Design, implement or review Java Spring Boot features, application boundaries, JPA persistence and mapping. Use for backend behavior and architecture, not to upgrade the framework."
---

# Java and Spring

This skill uses feature-first ownership, service boundaries and explicit Java types. Use the same recognizable structure for comparable needs in the project; add boundaries only for responsibilities they actually own. These are personal conventions, not requirements imposed by Spring. Inspect the accepted task, repository instructions, module build and existing runtime first. A policy update does not authorize a dependency upgrade or whole-project migration.

## Structure and dependency direction

Group a growing service by business capability, then by role. Create only occupied packages:

```text
feature/
  api/                 # HTTP implementations, validation, error translation, transport mappers
  application/         # service decisions, transactions and any needed values or ports
  domain/              # pure concepts and invariants when the feature needs them
  infrastructure/      # persistence, provider, messaging and other adapters
config/                # executable application's wiring and typed settings
shared/                # stable technical semantics used by active features
```

Within each feature, choose flat packages or occupied subpackages according to navigation, cohesion and Java visibility. Role-based groups such as `service`, `model`, `exception` or `port` are valid when they make a mixed application package easier to navigate; an independent business boundary is not required for each folder. Apply the same reasoning to API and infrastructure roles. Keep small cohesive packages flat when subdivision adds little, and keep closely collaborating types together when separation would obscure their relationship. Do not impose a file-count threshold or an identical hierarchy for every feature. Package organization must not create new services, ports or models merely to populate folders. Avoid generic `impl`, `utils`, `helpers`, `common` and `records` packages. One application service owns a coherent use-case family; do not require one class per endpoint. Cross-feature calls use an explicit application API, never another feature's entity, repository or private implementation.

Before splitting a package, inspect Java visibility and actual callers: subpackages do not inherit package-private access. Weigh navigation gains against the visibility needed across packages. Preserve narrow access where practical, and do not expose unrelated types or members to make a move compile. Move corresponding tests and update imports, documented paths and framework-specific package references. Verify discovery and generated mapper compilation with the existing build; add no custom scanning or architecture framework solely for a move.

Feature-first organization is a personal convention. [Spring Boot layout guidance](https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html) explains how the application class's package affects discovery.

- Keep controllers and adapters thin. Application code owns decisions and orchestration.
- A short Controller → Service → Repository path is valid. A persistence port and adapter need a concrete responsibility, such as isolating a provider, translating persistence semantics or serving an independent domain boundary. Do not add them merely because an operation persists data, or remove useful existing boundaries to reduce a file count. Keep comparable consumers coherent.
- Do not create `Service`/`ServiceImpl` pairs or interfaces solely for mocking. Ports describe needed operations at a real boundary, not a copy of `JpaRepository`.
- Return values with the caller's actual semantics. Keep managed entities, lazy state, Spring Data pages and servlet/client runtime objects inside their owning lifecycle. Create a distinct command or view when meaning, ownership, presence or editing semantics differ; do not create a type and mapper merely to rename an identical value. A contract-owned generated DTO may serve an application boundary when it expresses that same concept and fits the project's common pattern.
- A generated OpenAPI enum may appear in Java application code only when the contract owns that exact concept. Application-only and provider vocabularies stay with their owner. Pure domain code remains independent of OpenAPI, Spring, JPA and messaging, including generated enums.
- Create domain objects for invariants, values and behavior; do not duplicate every CRUD entity into a ceremonial domain model.

## Helpers and public boundaries

Keep simple expressions local. A private function used once is useful when it names a coherent step or makes an invariant easier to understand; it does not justify a reusable framework. Before extracting shared behavior, search existing owners. When a second consumer needs the same rule, reuse or move the existing function to the narrowest meaningful common owner and remove copies. Share identical knowledge, not merely similar syntax.

An exported contract or public boundary can be justified with one consumer. Do not prohibit exports mechanically or create global utils, generic facades, registries or layers in anticipation of reuse. Investigate the underlying ownership or data-flow problem before adding another adapter around its symptom.

## Types, mapping and injection

Use explicit Java types everywhere in handwritten code, including loops, resources and tests: no `var`. Use enums for owned known finite concepts rather than string status vocabularies. Reuse an exact contract-owned enum in application code where allowed; identifiers and extensible provider keys are not enum vocabularies. Qualify enum constants except switch case labels. Preserve serialized values and handle supported unknown provider values without accidentally granting access.

Use records for needed immutable application values and constructor injection for dependencies. When working on a class in a module that uses Lombok, consult the [Lombok conventions](references/lombok.md) for constructor, accessor and equality decisions.

Put mappers at the boundary they translate. Use the project's mapping approach for field copies. Keep decisions, aggregation, union dispatch and exceptional construction explicit. Read [mapping](references/mapping.md) when adding or changing a mapper.

Validate boundary shapes with the project's validation mechanism. Do not repeat generated constraints manually. Cross-field and domain decisions remain explicit. Avoid application-context lookup, field injection and custom framework extensions without an actual unmet need.

## Startup configuration

Centralize application-owned external settings in cohesive typed `*Properties` classes or records using Spring Boot `@ConfigurationProperties`. Group them by responsibility and prefix, register them through native scanning or `@EnableConfigurationProperties`, and inject them through constructors or bean method parameters. Use these types instead of scattered Spring `@Value` injections or repeated `Environment` lookups. This grouping is a personal convention.

Keep defaults and environment aliases in the existing `application.properties` or YAML configuration, with one owner for each default. Preserve supported keys, aliases, units, profile behavior and precedence when replacing existing injections; relaxed binding does not guarantee compatibility with every historical environment-variable spelling. Keep framework-owned settings, such as datasource or OAuth client configuration, in their native namespaces and mechanisms. Do not duplicate them in an application settings registry or add a custom loader. Fixed constants and classpath resources do not become operator settings; use the appropriate native resource API.

Validate required settings at startup. In modules using Bean Validation, apply `@Validated` and suitable constraints. Preserve optional settings and legitimate defaults. Verify the changed binding boundary with actual configuration data: required values absent, blank or invalid as applicable, plus supported overrides and defaults. An unresolved placeholder can remain nonblank text under binding; `@NotBlank` alone does not prove absence is rejected. Where needed, use a native empty placeholder fallback with the relevant constraint rather than a custom placeholder scanner. Do not duplicate native validation in consuming services.

Check [Spring Boot externalized configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html) for the project's installed version before relying on binding, conversion or validation behavior.

## Use cases, transactions and failures

Place `@Transactional` on the application service operation owning a coherent database write. The service uses the feature's existing repository or justified persistence boundary; managed dirty checking is valid inside the owning transaction. Complete lazy reads and entity mapping inside that transaction. Do not rely on HTTP serialization or keep a database transaction open during external network calls.

Atomicity covers participating local transactional resources only. Multiple databases, messaging and HTTP do not become atomic through an annotation. A current data or permission check does not by itself require serializing independent operations that might change it. Define ordering, idempotency, locking, optimistic conflict handling or an outbox only when the accepted invariant needs them; prove their failure behavior.

Use targeted application exceptions for expected rejections such as not-found, conflict or forbidden operations, translated once at the API boundary. Ordinary alternatives use values, enums or `Optional`. Do not introduce a generic `Result` framework or exceptions for normal branching. Preserve causes for technical failures without exposing provider details.

## Persistence and integrations

Use the module's selected persistence mechanism for queries and writes. In modules using JPA, read [JPA persistence](references/persistence.md) when entity mappings, queries or transaction behavior change.

Each service owns its data and complete business resources. Use owner-controlled contracts across services, never shared tables or imported entities. A gateway composes client workflows without taking canonical ownership of service data. Keep downstream clients and message models in adapters, preserve configured timeouts and failure translation, and acknowledge messages only after the accepted durable outcome. Never assume exactly-once delivery.

Use the module's configured output locations for generated Java. Preserve its policy for versioned sources and build artifacts. Add dependencies to the narrowest owning module and use existing managed versions. A size or collaborator count is a review signal, not a reason to split coherent code mechanically.

## Evidence

Inspect dependency direction, application enum exceptions, mapper placement, entity leakage and transaction ownership. Run the owning module's meaningful tests and build; include affected consumer modules and real database/runtime evidence for the changed boundaries. Run the full backend build when the impact cannot be bounded or the project requires it. Prove database semantics against the actual engine, not repository mocks. Format the changed handwritten sources and inspect the complete diff. Report unavailable integration evidence explicitly.
