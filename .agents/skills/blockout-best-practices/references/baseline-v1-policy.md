# Blockout Baseline Policy

Read this reference before changing product behavior, an API surface, a schema, a handler, a mobile flow, or a
migration-like runtime surface.

## Core Rule

The currently deployed Blockout behavior is the migration baseline. A behavior change is valid only when it comes from:

- an explicit user or product decision in the current task;
- current production source and contracts;
- a validated architecture document or durable decision.

The local migration roadmap authorizes structural convergence only. It is not a product source. Git history, deleted
files, generated artifacts, stale documentation, and remembered behavior are not sufficient product sources.

## Source Gate

- `OK`: current product evidence determines the behavior.
- `REVALIDATE`: the behavior is plausible but current product evidence is insufficient.
- `BLOCK`: the change would make unsupported behavior executable or break the production baseline.

Resolve `REVALIDATE` and `BLOCK` before changing handlers, contracts, persistence, mobile flows, scrapers, or tests that
would stabilize the behavior.

## Guardrails

- Structural migration must preserve endpoints, events, schedules, ports, environment contracts, and data behavior.
- Do not use Maaatch product models as Blockout product requirements.
- Do not introduce compatibility behavior unless the production baseline or an explicit decision requires it.
- Record missing Blockout product models in the active migration roadmap instead of inventing them during refactors.
