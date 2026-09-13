# Liquibase Schema Evolution Policy

Read this reference before creating or changing a Liquibase changelog.

## Repository Inputs

The repository instructions, accepted plan and runtime configuration supply:

- deployment and data-retention posture;
- owning application and supported database;
- master changelog and baseline-changelog locations;
- the configured changelog format and naming sequence; and
- startup, migration-chain, integration-test, and diff-hygiene commands.

Do not copy those values into this portable policy.

## Execution Ownership

- For a new schema, use XML changelogs and the dedicated migration container/job selected by the accepted runtime plan.
  Application startup must not create, update or reset the schema. Do not migrate an existing deployed toolchain merely
  because this reference is loaded.
- Keep migration credentials and application permissions separate when the runtime defines distinct database roles.
- A baseline edit does not authorize resetting a database or deleting a volume. Reset only an explicitly authorized
  disposable environment; preserve retained data and applied history elsewhere.

## Pre-Deployment Baseline

When the accepted deployment posture establishes that no real environment depends on persisted schema history:

- keep the configured baseline creation changelog as the single schema source for its owner;
- edit that baseline directly instead of appending speculative release migrations;
- include it from the configured master changelog using the repository's established pattern;
- use native XML changes such as `createTable`, `addColumn`, `addForeignKeyConstraint`, `addUniqueConstraint` and
  `createIndex` when they express the schema; do not write SQL equivalents of those changes;
- reserve database-specific SQL for an accepted object that Liquibase cannot express safely;
- preserve the repository's existing changelog style and object-naming conventions;
- keep relationship, uniqueness, and index ownership explicit; and
- do not add a destructive change or data migration without an accepted task that owns the data consequence.

Pre-deployment mutability is a repository posture, not a permanent Liquibase rule. Stop and revalidate before editing a
baseline when any real environment may already depend on its history.

## Data And Constraint Boundaries

- Do not freeze application enums in database-native enum types, enum-value checks, or conditional indexes unless the
  owning source explicitly makes the database authoritative for those values.
- Do not duplicate ordinary scalar, JSON-shape, or cross-field application validation as a database check by default.
- Add database hardening only when an accepted task defines the invariant, compatibility impact, and recovery path.
- Keep persistence-model, transport, and product rules at their selected owners rather than embedding them in a
  changelog.

## Deployed Schema Evolution

Once an environment contains retained data or relies on applied change history:

- treat applied changelogs as immutable;
- append one ordered change set for each accepted schema evolution;
- define preservation, backfill, compatibility, and rollback behavior explicitly;
- separate destructive cleanup from compatibility rollout when consumers cannot move atomically;
- never edit an applied checksum-bearing change to make a later environment pass; and
- stop when current deployment or data evidence cannot establish the safe migration direction.

## Verification

- Run the complete configured migration chain against the supported database.
- Execute the configured migration container/job successfully, then prove the application starts against the migrated
  schema. For an existing application-owned migration setup, validate that actual startup path instead.
- Run persistence integration evidence for the changed relationship, constraint, query, or mapping.
- Inspect the persistence model and contract only where they share the changed invariant.
- Do not use a unit test that parses changelog text as the schema oracle.
- Apply the repository [testing and validation policy](testing-and-validation.md) and report unavailable
  infrastructure or skipped checks explicitly.
