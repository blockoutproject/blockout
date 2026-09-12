# Liquibase Schema Evolution Policy

Read this reference before creating or changing a Liquibase changelog.

## Repository Inputs

The repository profile supplies:

- deployment and data-retention posture;
- owning application and supported database;
- master changelog and baseline-changelog locations;
- the configured changelog format and naming sequence; and
- startup, migration-chain, integration-test, and diff-hygiene commands.

Do not copy those values into this portable policy.

## Pre-Deployment Baseline

When the repository profile declares that no real environment depends on persisted schema history:

- keep the configured baseline creation changelog as the single schema source for its owner;
- edit that baseline directly instead of appending speculative release migrations;
- include it from the configured master changelog using the repository's established pattern;
- use standard Liquibase changes when they can express the schema clearly;
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
- Prove that the owning application starts with Liquibase enabled.
- Run persistence integration evidence for the changed relationship, constraint, query, or mapping.
- Inspect the persistence model and contract only where they share the changed invariant.
- Do not use a unit test that parses changelog text as the schema oracle.
- Apply the repository [risk-based validation policy](risk-based-validation-policy.md) and report unavailable
  infrastructure or skipped checks explicitly.
