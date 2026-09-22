---
name: liquibase-schema
description: "Create or review Liquibase XML changelogs, baseline posture and retained-data schema evolution. Does not authorize converting another migration tool or resetting databases."
---

# Liquibase schema evolution

Read the owning application's database engine, migration entry point, deployment posture, naming conventions and test/runtime configuration. This skill supplies schema policy; repository files supply paths and actual versions. Do not convert Flyway or another tool merely because this skill is installed.

## Ownership

For a new Liquibase setup use XML and a dedicated migration container/job. Do not run schema creation/update/reset implicitly from application startup. Preserve an existing deployment mechanism until a task explicitly changes it. Separate application and migration credentials where roles are defined.

Use native XML changes for tables, columns, foreign keys, uniqueness and indexes when supported. Database-specific SQL requires a concrete unsupported schema need, parameter safety where applicable and actual-engine evidence. Preserve object naming and the existing master include pattern.

## Baseline or incremental migration

A mutable baseline is allowed only when the accepted posture explicitly establishes that every affected database is disposable and no retained environment depends on applied history. Edit that baseline rather than inventing release migrations. A baseline edit never authorizes a reset or volume deletion.

Once retained data or applied history matters, freeze applied changes and append ordered immutable change sets. If posture is unknown, establish it before editing history. Never clear checksums to conceal an accidental edit.

For incremental changes define compatibility with deployed readers/writers, preservation/backfill, rollout order, lock/duration risks and recovery. Use staged expand/backfill/contract when required by a real compatibility window. A rollback is not automatically possible after destructive data changes: document the actual restore or forward-repair path and obtain the task's authorization for data loss.

## Constraints and indexes

The database enforces durable structural invariants: primary/foreign keys, not-null, uniqueness and justified checks that must hold across writers. Do not ban checks categorically, but do not freeze evolving application/provider vocabularies into native enums or value checks without explicitly making those values a database-owned invariant.

Application authorization, UX validation and evolving business decisions remain at their owner. Define index purpose from real access patterns and uniqueness semantics; do not add speculative indexes or JSON columns to avoid relational modeling. Keep entities consistent with the migrated schema.

## Evidence

For disposable baselines prove clean creation on the supported database. For retained schema evolution prove the relevant applied chain, upgrade with representative retained data, constraints and the documented recovery path where feasible. Validate affected entity mappings and application behavior. Source inspection alone does not prove locks, constraints or compatibility. Never reset a non-disposable environment for testing. Report missing migration evidence explicitly; do not substitute a different database engine.

Mechanics: [Liquibase changelogs](https://docs.liquibase.com/concepts/changelogs/home.html). XML, separate execution and baseline posture are this pack's choices.
