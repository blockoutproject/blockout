# JPA persistence

## Ownership and schema

Place entities, Spring Data repositories and persistence adapters under the owning feature's infrastructure. An application-owned port remains mandatory even for CRUD. Keep it use-case-shaped rather than mirroring repository methods. Return mapped values, never managed entities or Spring Data pages.

Use Spring Data repositories, normally `JpaRepository`, and Spring Boot's managed JPA setup. Migrations own tables, constraints and indexes; entities describe their mapping. Hibernate must not create or update retained schemas. Use the existing `validate` or `none` posture. Do not replace an existing migration tool to follow a preference.

## Entity contracts

- Use ordinary non-final entity classes and a protected no-argument constructor, commonly Lombok `@NoArgsConstructor(access = AccessLevel.PROTECTED)`.
- Match table/column names, IDs, precision, lengths, nullability and relationships to the migration. HTTP camelCase does not choose SQL identifiers.
- Use focused accessors, never ID/version setters or relationship-generated equality, hash code or recursive `toString`.
- Preserve ID generation and equality semantics. Do not base hash codes on mutable relationships.
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
