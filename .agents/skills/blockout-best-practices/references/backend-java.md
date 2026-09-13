# Backend Java Architecture

Apply this policy when changing Java packages, Spring components, Maven modules, backend boundaries, JPA entities,
repositories, relationships, or persistence queries. Build only the architecture required by the accepted plan; do not
infer future services, persistence, security, caching, or messaging.

## Structure And Ownership

Organize a growing service by business feature first, then by technical role:

```text
service-root
├── ServiceApplication.java
├── feature
│   ├── api
│   ├── application
│   ├── domain
│   └── infrastructure
├── config
└── shared
```

A small single-feature service may keep flat `api`, `application`, `domain`, `infrastructure`, and `config` packages
while that is clearer. Create packages when behavior needs them, not as an empty speculative tree.

- `api` owns generated-interface implementations, transport mapping, input validation, and error translation.
- `application` owns use cases, commands, views, orchestration, policies, and outbound ports.
- `domain` owns framework-free business concepts, invariants, and decisions.
- `infrastructure` owns database, HTTP, messaging, storage, cache, and other technical adapters.
- `config` owns service-wide Spring wiring and typed properties.
- `shared` is reserved for stable technical semantics used by several active features.

Avoid generic `impl`, `utils`, `helpers`, `common`, `support`, and `records` packages. Place a type beside the role that
owns it.

## Application Boundary

- Give an application service one coherent use-case family. Keep controllers and technical adapters thin.
- Use immutable commands or focused scalar inputs. Return application views or domain results.
- Do not expose generated transport types, JPA entities, servlet types, HTTP clients, or message records through the
  application boundary.
- Put transaction ownership on the application operation that owns the write.
- Represent expected validation, authorization, not-found, conflict, and dependency outcomes with stable application
  semantics. Exceptions are not ordinary branching.
- Introduce a port only for a real replaceable boundary such as persistence, an external provider, storage, clock, or
  messaging. Do not create an interface and implementation for every class.

Prefer explicit role names such as `CreateResourceCommand`, `ResourceView`, `ResourceEntity`,
`ResourceApplicationService`, `ResourceStorage`, and `ResourceEventPublisher`. Avoid `*Impl` and weak prefixes such as
`Default`, `Jpa`, or `Transactional` when they do not explain the responsibility.

## Explicit Types And Finite Values

- In handwritten backend code, write explicit Java types for every handwritten local variable, including loops,
  resources and tests. Do not use `var`, even when the initializer makes the type obvious. Generated output is excluded.
- Represent known finite states, environments and classifications with enums owned by their feature or contract.
  Reuse existing library enums. Define transport enums in OpenAPI before generation; keep domain enums independent.
- Qualify enum constants with their declaring enum type in handwritten code, including comparisons, arguments and
  expression results. Do not statically import enum constants. Keep enum `case` labels unqualified in switches.
- Keep serialized values stable. For extensible provider vocabularies, use the generator's supported unknown-value
  handling and verify that unknown values do not grant access or trigger unintended work.
- Identifiers, JSON field names, paths, SQL text and extensible owner-defined job keys are not enum vocabularies.
  Do not add generic enum registries or replace independent wire-format test fixtures with production constants.

## Transport And Mapping

Generated server interfaces and DTOs are API adapter contracts. Implement the interfaces in `api`, map their values
immediately, and prevent generated models from spreading into application, domain, persistence, or messaging code.
Entities and provider payloads never cross an HTTP boundary.

Follow `mapping.md`. Put each mapper at the boundary it translates. Prefer MapStruct for mechanical Java mapping and
handwritten code for decisions, aggregation, polymorphic dispatch, enrichment, or failure semantics.

## Spring And Configuration

- Use constructor injection. Never use field injection or application-context lookup.
- Keep domain objects and pure policies free of Spring, HTTP, persistence, and messaging annotations.
- Use typed, validated `@ConfigurationProperties` scoped to one integration or technical concern.
- Extract identity and authorization context at the API or security boundary; pass only application data to use cases.
- Keep health and technical endpoints separate from product controllers.
- Keep each executable application in its own Maven module and generated sources under `target`.
- Add the narrowest dependency to the owning module. Centralize a version or plugin only when several modules share it.
- Do not combine an architecture change with a framework or dependency upgrade unless the issue includes both.

## Persistence With Spring Data JPA

Spring Data JPA with Hibernate is the Blockout default for relational application persistence. Implement repositories
as Spring Data interfaces, normally extending `JpaRepository<Entity, Id>`. Do not replace ordinary CRUD, lookups,
filtering, or pagination with handwritten SQL repositories, `JdbcTemplate`, `JdbcClient`, or raw `EntityManager`
plumbing. Use Spring Boot's JPA auto-configuration and managed dependency versions.

### Entity And Repository Boundaries

- Place `*Entity` classes and repository interfaces under the owning feature's `infrastructure/persistence` package.
- Keep entities separate from generated DTOs, application commands/views, domain values, events, and provider records.
  Never return an entity or Spring Data `Page` directly from an HTTP endpoint or application port.
- Map entities at the persistence boundary using the rules in `mapping.md`. Transport mappers must not depend on JPA.
- Introduce an application persistence port only where it represents a real boundary. Do not add generic base
  repositories, delegating CRUD wrappers, or one adapter class per repository without an actual mapping or ownership need.
- Schema migrations remain authoritative for tables, constraints and indexes; entities describe their Java mapping.
  Do not let Hibernate create or update production schemas. Use `ddl-auto=validate` or `none` as appropriate to the
  existing migration setup. Follow `liquibase.md` when Liquibase is the selected migration tool; this policy does not
  authorize replacing existing migrations.

### Entity Mapping And Lombok

- Declare `@Entity`, `@Table`, `@Id` and durable `@Column` mappings explicitly. Match the migrated identifiers, column
  names, nullability, lengths, precision, types, unique constraints and indexes. HTTP naming does not dictate SQL names.
- Use ordinary non-final entity classes with a protected no-argument constructor, normally
  `@NoArgsConstructor(access = AccessLevel.PROTECTED)`. Records remain suitable for immutable commands and views.
- Use Lombok `@Getter` and focused `@Setter` where mutation is part of the entity contract. Do not expose setters for
  generated identifiers or provider-managed version fields. Never use `@Data` on entities; do not generate recursive
  `toString`, equality or hash code through relationships.
- Use `@RequiredArgsConstructor` for assignment-only dependency injection. Keep constructors that perform real
  initialization or enforce invariants. Generated methods do not need handwritten documentation; document meaningful
  field contracts and handwritten methods according to `code-documentation.md`.
- Keep identifier generation, equality and hash semantics stable. Do not switch strategies as incidental cleanup or
  base hash codes on mutable associations.
- Persist closed application/domain enums with stable string values, normally `@Enumerated(EnumType.STRING)`, not
  ordinals. Keep open provider keys as strings. Use an explicit converter only for a real storage representation need.
- Keep timestamps and lifecycle fields explicit. Add automatic auditing only when required by the accepted task.
  Use `@Version` only with a mapped version column and defined conflict behavior.
- Model stable relational concepts with typed fields and associations. Map vendor-specific structured columns
  explicitly and test them against the supported database; do not substitute JSON for ordinary relational modeling.

### Relationships And Query Shape

- Prefer lazy, unidirectional relationships. Specify `FetchType.LAZY` for to-one associations instead of relying on
  their eager default; keep foreign-key ownership explicit.
- Add cascade, orphan removal or bidirectional navigation only when aggregate lifecycle ownership requires it.
  Do not use blanket `CascadeType.ALL` or eager loading to make serialization or tests easier.
- Use inherited repository operations first, then derived query methods for simple predicates. Use JPQL `@Query`
  when a derived method becomes unclear. Use `Specification`/`JpaSpecificationExecutor` for genuinely composable
  dynamic predicates, not as a required framework for every lookup.
- Select focused projections or query-specific `@EntityGraph`/fetch joins for the actual read. Prevent N+1 queries
  without loading unrelated object graphs. Do not paginate a collection fetch join that expands the root result;
  use a suitable projection or page root IDs before fetching the required associations.
- Bound collection reads and define stable ordering whenever callers rely on it. Choose `Page`, `Slice` or a bounded
  projection according to the requested result; do not fetch every row and filter or paginate in memory.

### Native SQL Exceptions

- Native SQL is an exception, not an alternative default. Use it only for a required operation that JPA/JPQL cannot
  express correctly, or a measured performance requirement that an appropriate JPA query/fetch plan cannot meet.
  Convenience, presumed speed, concurrency in general, or avoiding entity mappings are not sufficient reasons.
- Keep the exception narrow and inside persistence infrastructure. Prefer Spring Data `@NativeQuery` or
  `@Query(nativeQuery = true)` when they cover the operation; direct JDBC needs the same concrete justification.
- Document the actual limitation and chosen SQL beside the repository method, bind parameters, and verify behavior
  against the supported database. Do not concatenate caller values into SQL or build a second generic persistence layer.
- This application-query rule does not prohibit migration statements or controlled database setup/assertions in
  integration tests. Those follow their own migration and test policies.

### Transactions And Writes

- Put `@Transactional` on the application operation owning a coherent write. Use `readOnly = true` for transactional
  reads where appropriate. Controllers and mappers do not own transactions.
- Complete required lazy loading and entity-to-view mapping within the owning transaction. Do not depend on HTTP
  serialization to fetch relationships, or hold transactions open during external network calls.
- Use managed-entity dirty checking for changes inside a transaction; do not add redundant `save` calls or
  `saveAndFlush` after every field update. Configure and verify Hibernate batching when a real bulk-write workload
  requires it; `saveAll` alone does not guarantee JDBC batching.
- For bulk JPQL writes, use `@Modifying` and an explicit transaction; account for persistence-context staleness,
  pending changes, version checks and callbacks that bulk operations bypass.
- Preserve write ordering, idempotency, locking, conflict handling and event publication guarantees during refactors.
  Do not hide writes in getters, mapping, logging or entity callbacks.

### Persistence Verification

- Compare changed entity mappings with the applied schema and inspect for entity leakage, unbounded reads, accidental
  eager loading and N+1 behavior on the exercised use case.
- Test meaningful repository behavior against the configured database with the existing integration setup, especially
  constraints, locks, transactions, structured types and native-query exceptions. Follow `java-testing.md`.
- Check that a basic CRUD task produces a JPA repository, a read exposes an application view rather than an entity,
  and any native-query proposal explains why the simpler JPA approach cannot satisfy the requirement.

Official references: [Spring Data JPA query methods](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html),
[transactions](https://docs.spring.io/spring-data/jpa/reference/jpa/transactions.html), and
[Hibernate ORM user guide](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html).

## Service And Integration Boundaries

- The mobile gateway composes client-oriented workflows and hides internal topology; it does not become the canonical owner of
  service data.
- A service owns its complete business resources. Cross-service reads use owner-controlled contracts, never shared
  tables or imported entities.
- An outbound adapter translates dependency failures once and contributes the technical context it owns.
- When messaging changes, make routing, retry, dead-letter, ordering, acknowledgement, and
  idempotency semantics explicit. Never assume exactly-once delivery.

## Complexity Review

Size is a review signal, not a mechanical limit:

- review a class above roughly 250 lines or a method above roughly 40 lines;
- review an application service with more than five injected collaborators;
- split by responsibility or change axis, never only by line count;
- extract shared behavior only when multiple active callers share the same invariant.

## Verification

- Run the focused tests while iterating and `./mvnw -f apps/backend/pom.xml verify` before delivery.
- Inspect dependency direction, transport leakage, transaction ownership, configuration, and generated outputs.
- Apply `java-testing.md`, `logging.md`, and `code-documentation.md` when those concerns change.
- Run formatting and repository diff-hygiene checks.
