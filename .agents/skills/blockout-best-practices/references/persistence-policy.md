# Persistence Policy

- JPA entities and repositories remain owned by their service.
- Database schemas are service-local; do not merge databases as part of the monorepo migration.
- Flyway migrations under each service are immutable once deployed. Correct a deployed schema with a new migration.
- Preserve database names, connection variables, PostgreSQL behavior, and migration ordering during cutover.
- Never use Hibernate schema auto-update in production.
- Validate migration packaging in the service JAR and smoke the candidate against a disposable or shadow database before
  production cutover.
