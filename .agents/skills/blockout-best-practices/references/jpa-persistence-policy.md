# Blockout JPA Persistence Policy

Read this before changing an entity, repository, relationship, persistence query, database constraint, or
application-to-persistence mapping.

## Boundary

- Keep persistence entities separate from transport models, application commands and views, domain values, events,
  provider records, and mobile view models.
- Put an entity under the owning service feature and suffix it `Entity`.
- Never expose an entity from a controller, generated API implementation, message, or application port.
- Map at the persistence boundary. Follow `mapping-policy.md`; do not make a transport mapper depend on JPA.
- Treat the Flyway schema as the storage authority and the owning service as the data authority.

## Entity Mapping

- Declare `@Entity` and `@Table` explicitly. Match identifiers, column names, nullability, lengths, precision, unique
  constraints, indexes, and database types.
- Prefer explicit `@Column` declarations for durable fields. Database naming remains independent from camelCase HTTP
  naming.
- Use stable database identifiers. Do not change ID strategy, equality, or hash semantics as incidental cleanup.
- Keep timestamps and lifecycle fields explicit. Do not introduce automatic auditing without an accepted task.
- Use `@Version` only when an explicitly designed optimistic-locking column and conflict behavior exist.
- Use converters only for a real storage representation boundary. Do not build generic conversion frameworks.

## Enums And Structured Values

- A closed concept belongs to the layer that owns it. Persist local application or domain enums by stable string values.
- Reuse a generated transport enum only when the active contract owns the exact concept and the entity remains isolated
  from that transport type through mapping.
- Keep open provider keys, catalog identifiers, and forward-compatible external values as strings.
- Map PostgreSQL JSON columns explicitly and test their real database behavior. Do not use JSON to avoid modeling a
  stable relational concept.

## Relationships

- Prefer lazy, unidirectional relationships.
- Add cascade, orphan removal, or bidirectional navigation only when aggregate lifecycle ownership requires it.
- Keep foreign-key ownership explicit and avoid loading graphs by accident.
- Do not add eager loading, broad entity graphs, or bidirectional associations only to simplify serialization or tests.
- Prevent recursive equality, logging, and string rendering through relationships.

## Repositories And Queries

- Keep repositories inside infrastructure and expose application ports only when the boundary is real.
- Prefer derived queries, JPQL, focused projections, specifications, and entity graphs before native SQL.
- Explain indispensable native SQL locally and verify it against PostgreSQL.
- Make ordering explicit whenever consumers rely on it.
- Test locks, constraints, JSON operations, database functions, and transaction semantics with PostgreSQL/Testcontainers.
- Never return a persistence page or entity directly through an HTTP boundary. Preserve the current application and
  contract collection shape; any new collection-shape decision requires a separate explicit task.

## Transactions And Writes

- Place transaction ownership around one application operation, not in controllers or arbitrary utility helpers.
- Keep reads read-only when that conveys intent, but do not add annotations ceremonially.
- Preserve write order, idempotency, conflict handling, and event publication semantics during refactors.
- Do not add hidden database writes to mapping, getters, entity callbacks, or logging.

## Verification

- Compare every changed entity with the applied Flyway schema.
- Run the narrow repository or service test while developing.
- Use PostgreSQL-backed integration tests for database-specific behavior.
- Run the owning Maven module and the backend reactor when a shared persistence boundary changes.
- Inspect for entity leakage, accidental eager loading, and unbounded queries.
- Run `git diff --check`.
