# Blockout Flyway Policy

Read this reference before creating, changing, renaming, or reordering a Flyway migration.

## Production Rule

Blockout databases are already deployed. Existing migrations are immutable production history.

- Never edit or reorder a migration that may have run in production.
- Correct a deployed schema with a new forward-only migration.
- Preserve service-local ownership and version ordering.
- Do not merge service databases during monorepo migration.
- Avoid destructive DDL or data rewrites without an explicit backup, rollback, and production cutover plan.
- Keep entity mappings aligned with the schema without enabling Hibernate schema auto-update.
- Validate migration packaging in the service JAR.
- Smoke risky migrations against a disposable copy or shadow database before production.

Maaatch uses Liquibase, while Blockout uses Flyway. This is an intentional technology variant, not a structural
permission to diverge from Maaatch's persistence boundaries.
