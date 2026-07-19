# Blockout Persistence And Flyway Policy

Read this before changing JPA entities, repositories, database constraints, or Flyway migrations.

## JPA

- Keep entities, transport models, application commands/views, events, and frontend models separate.
- Put an entity under its owning service feature and suffix it `Entity`.
- Declare `@Table` and mirror schema nullability, lengths, identifiers, relations, unique constraints, and types.
- Never expose an entity from a controller.
- Prefer lazy, unidirectional relationships. Add cascade, orphan removal, or bidirectional navigation only when lifecycle
  ownership requires it.
- Use `@Version` only for an explicitly designed optimistic-locking column.
- Keep timestamps explicit. Do not introduce automatic auditing without scope.
- Use JPQL, derived queries, projections, specifications, or entity graphs before native SQL.
- Any indispensable native SQL needs a short local explanation.

Closed transport enums remain handwritten locally until contract-first is activated. Define an enum only in the layer
that owns the concept and do not duplicate it across services. Open provider/catalog keys remain strings.

## Flyway

- Existing imported schemas are append-only: add a new ordered migration; never edit a migration already applied to a
  local or deployed database.
- Use descriptive `V<number>__description.sql` names and keep one concern per migration.
- Prefer additive, backward-readable changes during multi-service coexistence.
- Do not add destructive DDL or data rewrites unless the task explicitly authorizes and validates them.
- Keep database column naming independent from the camelCase HTTP contract.
- Validate migrations by starting or testing the owning application against PostgreSQL; do not parse SQL files in unit
  tests as a schema oracle.

Verify entity/schema alignment, Flyway startup, repository behavior when risky, backend compilation, and
`git diff --check`.
