# Blockout Liquibase Profile

Read with [Liquibase schema evolution](liquibase.md). Applies exclusively to the replacement monolith, never existing Flyway databases.

- Owner: `apps/backend/migrations`; PostgreSQL 17, Liquibase 5.0.3.
- Master: `src/main/resources/db/changelog/db.changelog-master.xml`.
- Baseline: `src/main/resources/db/changelog/001-init.xml`, explicitly included with a stable path.
- Prefer native Liquibase XML createTable, keys, uniqueness and indexes. SQL is exceptional where Community lacks a suitable change (schema/role bootstrap and grants).
- Before the new monolith first reaches production: edit the baseline directly; explicitly recreate disposable development/test databases. Do not accumulate intermediate migrations.
- First production release freezes applied changes and changes this profile to deployed evolution. Later changes append ordered migrations with preservation/compatibility/recovery behavior.
- Ordinary startup never resets data, clears checksums or force-unlocks Liquibase.
- A separate Docker migration process owns update; API/worker startup never migrates. Prove that process runs with Liquibase enabled and both applications start against its output.
- Validate with `./mvnw -f apps/backend/pom.xml -pl migrations,jobs,core-service,core-worker -am verify`, complete backend/workspace validation and `scripts/backend-foundation/smoke.sh`.
- Local lifecycle: `scripts/backend-foundation/local.sh up|down|reset`; reset is limited to the fixed isolated local database volume.
