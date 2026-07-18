# MRG-434 Roadmap Continuation And Dependency Correction

## Purpose

MRG-434 changes only the ordering and execution governance of future migration work. It preserves every completed task
and its historical evidence, introduces no runtime or contract change, and does not implement any newly added task.

The migration owner grants standing approval for the evidence-backed recommended option in every future
`PLAN_REQUIRED` task. Plan mode and a decision-complete plan remain mandatory, but another human confirmation is not.
Missing external authority, destructive work, production changes, or an unresolved contradiction still stop the task.

## Corrected Order

The next implementation sequence is authoritative:

1. MRG-435 corrects Python enum ownership.
2. MRG-436 simplifies scraper Docker ownership and removes unused runtime test tools.
3. MRG-437 records the owner-version and command-versus-fact architecture.
4. MRG-438 adds the shared projection-fact contracts.
5. MRG-439 adds internal division revision evidence in `config-service`.
6. MRG-440, MRG-441, and MRG-442 add owner revisions and projection facts to clubs, teams, and pools independently.
7. MRG-430 adds non-regressing Elasticsearch revision vectors, tombstones, and rebuild/alias operations.
8. MRG-429 consumes the owner facts, maintains versioned caches, and reconciles active and inactive state.

MRG-430 now precedes MRG-429 because stale-write rejection requires an atomic version-aware storage operation. MRG-438
through MRG-442 precede both because the audited entities currently expose no monotonic aggregate version and their
existing events therefore cannot prove ordering. Timestamps, worker-local counters, and synthetic ingestion sequences
are not accepted as substitutes for owner revisions.

## Ownership Corrections

Enums belong to the boundary that defines their meaning. OpenAPI and AsyncAPI enum concepts are generated from shared
contract sources. Pure application policy remains local; `DataSourcePriority` therefore returns to the competition
scraper instead of remaining in shared OpenAPI. MRG-435 owns the implementation and policy corrections without
rewriting MRG-433 history.

Docker remains a deployment boundary, not an Nx orchestration boundary. MRG-436 keeps the uv workspace and the narrow
Nx graph, but reduces each scraper Dockerfile to the same explicit builder/runtime shape used by `matches-service`.
Generation, import validation, syntax checks, and image inspection remain outside Docker in Nx and CI.

## Atomic Continuation

Every roadmap task remains one independently validated diff, commit, direct `main` push, and exact-SHA shadow CI
result. A continuous migration goal may begin the next read-only selection immediately after the prior task iteration
ends, but it may never combine tasks or reuse validation evidence across SHAs.

MRG-304 and the approved MRG-313, MRG-314, and MRG-315 plans remain normative. No deployment, production operation,
MRG-9xx work, or MRG-1000 work is planned, authorized, executed, or published. The active goal stops before Phase
MRG-900.

## Validation And Rollback

Validation consists of roadmap-order inspection, local link and documentation validation, formatting, the Maaatch
structural comparison, and Git whitespace checks. Rollback is the single MRG-434 documentation commit; no generated
artifact, database, runtime, deployment, or production rollback exists.
