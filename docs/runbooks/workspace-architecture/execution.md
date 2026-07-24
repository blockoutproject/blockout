# Workspace Architecture Execution

Use this runbook only for a claimed workspace-architecture finding.

## Preconditions

- Re-read the Nx graph, project configuration, Maven reactor, imports, CI consumers, Docker/runtime entrypoints, and
  ignored outputs.
- Load `nx-workspace-patterns` and every owning runtime policy.
- Confirm the frozen Workset contains the complete atomic move or configuration change.
- Preserve a no-op if current architecture is intentional or the migration cannot be made coherent in one task.

## Procedure

1. State the current and target ownership and dependency direction.
2. Make the smallest atomic move or configuration correction.
3. Preserve project names, targets, cache inputs/outputs, application entrypoints, Maven coordinates, generated paths,
   Docker contexts, and CI commands unless explicitly changed by the issue.
4. Update imports and owning documentation together.
5. Remove obsolete directories and configuration only after all consumers move.
6. Do not create speculative libraries, generic shared modules, parallel build authorities, or empty architecture
   skeletons.
7. Keep Nx as orchestration, Maven as Java build authority, Python as scraper execution authority, and OpenAPI sources as
   contract authority.

## Validation And Delivery

- Run formatting, `nx show projects`, targeted project details, affected graph inspection, and the changed targets.
- Run mobile, Python, contract, backend, Docker, or CI-equivalent checks proportionally to the changed boundary.
- Run the Maven reactor when backend parent/module structure changes.
- Confirm generated output and local artifacts remain ignored.
- Finish with `npm run format:check` and `git diff --check`.
- Deliver through the task execution runbook and report the final dependency boundary.
