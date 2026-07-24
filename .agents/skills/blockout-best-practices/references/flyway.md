# Blockout Flyway Policy

Read this before adding or changing a Flyway migration or evolving a PostgreSQL schema.

## Migration Authority

- Flyway migrations own schema evolution for their service.
- Existing imported migrations are append-only. Add a new ordered migration; never edit a migration that may have been
  applied to a local, shared, or deployed database.
- Use descriptive `V<number>__description.sql` names and follow the owning service's established version sequence.
- Keep one coherent schema concern per migration.

## Change Discipline

- Prefer additive, backward-readable changes while multiple application versions may coexist.
- Make nullability, defaults, backfills, indexes, constraints, and data transitions explicit.
- Separate risky data movement from unrelated structural changes.
- Do not add destructive DDL, mass rewrites, silent truncation, or irreversible conversion unless the active task
  explicitly authorizes the operation and its recovery evidence.
- Preserve database column naming independently from HTTP and provider naming.
- Do not create speculative tables, columns, or indexes for deferred features.

## Compatibility

- Deploy schema changes before code that requires them when coexistence demands it.
- Keep old readers and writers safe for the transition window defined by the active task.
- Add a constraint only after existing data and all active writers satisfy it.
- Add an index because an observed or accepted query needs it, not as blanket future-proofing.
- Coordinate entity changes through `jpa-persistence-policy.md`.

## Verification

- Start or test the owning application against PostgreSQL with the full migration chain.
- Verify entity/schema alignment and any affected repository behavior.
- Test meaningful constraints, backfills, defaults, and rollback or recovery assumptions.
- Do not parse SQL files in unit tests as a schema oracle.
- Run the owning Maven module, the backend reactor when the shared parent or schema boundary changes, and
  `git diff --check`.
