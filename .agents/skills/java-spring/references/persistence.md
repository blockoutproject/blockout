# JPA persistence

## Ownership and schema

Place entities, Spring Data repositories and persistence adapters under the owning feature's infrastructure. An application-owned port remains mandatory even for CRUD. Keep it use-case-shaped rather than mirroring repository methods. Return mapped values, never managed entities or Spring Data pages.

An `infrastructure/persistence` package can distinguish persistence from other adapters. Inside the owning feature, keeping an adapter, repositories, entities, persistence values and mappers together preserves proximity and package-private access. Role-based subpackages such as `entity`, `repository` or `mapper` are also valid when navigation benefits justify the required visibility. Keep the same business ownership in either layout; moving files does not require splitting a coherent store or introducing another abstraction.

Name application-owned persistence interfaces `XStore`, their JPA adapters `JpaXStore`, and Spring Data interfaces `XRepository`. Determine names from actual roles, preserve coherent business groupings, and do not add interfaces or layers solely to satisfy naming. Preserve framework-owned and generated names. This naming scheme is a personal convention, not a Spring requirement.

Use Spring Data repositories, normally `JpaRepository`, and Spring Boot's managed JPA setup. Migrations own tables, constraints and indexes; entities describe their mapping. Hibernate must not create or update retained schemas. Use the existing `validate` or `none` posture. Do not replace an existing migration tool to follow a preference.

## Entity contracts

- Use ordinary non-final entity classes and a protected no-argument constructor, commonly Lombok `@NoArgsConstructor(access = AccessLevel.PROTECTED)`.
- Match table/column names, IDs, precision, lengths, nullability and relationships to the migration. HTTP camelCase does not choose SQL identifiers.
- Use focused accessors; expose no setters for generated IDs or managed versions. Relationship changes must preserve the owning side and any aggregate invariants rather than opening blanket setters.
- Keep owner-generated IDs, managed versions and initialized collections outside entity creation arguments. A no-argument persistence constructor does not replace the application's intended creation constructor; do not add class-level `@AllArgsConstructor` or `@Builder` mechanically.
- Preserve ID generation and equality semantics. Define entity equality only for an actual identity requirement, accounting for transient, persisted and proxied instances; do not generate it from mutable fields or relationships. A generated ID alone does not establish a safe hash-code lifecycle.
- Do not generate a relationship-traversing `toString`. If one is useful, include only explicitly selected safe scalar values, preserving lazy-loading and confidentiality boundaries.
- Persist owned closed enums as stable strings rather than ordinals. Use a converter only for an actual storage representation need. Open provider keys remain strings.
- Add auditing or `@Version` only with a mapped schema and a defined requirement/conflict outcome.
- Model stable relational concepts relationally; test vendor-specific structured columns against the supported engine.

## Queries and lifecycle

Prefer lazy, unidirectional relationships. Set to-one `FetchType.LAZY` explicitly and make foreign-key ownership clear. Cascade and orphan removal require actual aggregate lifecycle ownership; do not blanket `CascadeType.ALL` or eager-load to simplify serialization.

Use inherited operations, then clear derived queries, then JPQL for more complex shapes. Use specifications for genuinely composable dynamic predicates, not every lookup. Choose a bounded projection, `Slice` or `Page` according to the needed count and navigation semantics; map it to the port's application view.

Prevent N+1 with query-specific projections, entity graphs or fetch joins. Do not paginate a collection fetch join that expands root rows; page root IDs then fetch or use a suitable projection. Define stable ordering and bounds. Do not fetch all rows to filter/page in memory.

Native SQL or JDBC needs a concrete JPA/JPQL limitation or measured performance failure after an appropriate fetch plan, plus prior human approval. Convenience, assumed speed or concurrency alone does not justify it. Keep approved SQL inside infrastructure, parameterize inputs, document the limitation and test the supported engine. Prefer a focused native repository query over a second generic persistence layer. Migration SQL and controlled test setup follow their own rules.

## Writes and transactions

The application service owns the transaction and explicitly calls write-port methods. The adapter may update managed entities through dirty checking without a redundant `save`. A new entity still requires persistence. Do not add `saveAndFlush` mechanically. Verify batching when it matters; `saveAll` alone does not guarantee it.

Complete lazy loading and entity-to-value mapping within the transaction. Avoid network calls inside it. For bulk updates account for pending changes, stale persistence context, callbacks and version checks bypassed by bulk SQL/JPQL.

Keep writes out of getters, mappers and logs. Verify rollback, constraints, write ordering, concurrent conflict and idempotence against the actual migrated database when those guarantees matter. Ensure tests exercise the proxied transaction owner rather than assuming direct construction starts a transaction.

Mechanics: [Spring Data JPA queries](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html) and [transactions](https://docs.spring.io/spring-data/jpa/reference/jpa/transactions.html). The mandatory port is a personal architectural choice.
