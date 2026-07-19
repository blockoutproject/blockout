---
name: nx-workspace-patterns
description: Use when adding, importing, moving, or configuring Blockout Nx projects, project tags, inferred or explicit targets, dependency graph edges, task inputs, caching, or workspace-wide Nx commands.
---

# Nx Workspace Patterns

Keep Nx as the thin orchestration layer over each ecosystem's native toolchain.

## Workspace Rules

- Deployable applications live under `apps/frontend` or `apps/backend` according to runtime ownership.
- Stable shared assets may live under `libs/shared` only when at least one real cross-application boundary needs them.
- Do not create empty library categories, speculative shared libraries, or a second source tree beside an imported app.
- Keep public Nx project names under the `@blockout/` scope.
- Use tags that describe facts such as `type:application`, `scope:backend`, `scope:frontend`, and language.
- Preserve Maven, Expo, and Python as the native build/runtime tools. Nx invokes them; it does not replace them.

## Targets

- Prefer plugin-inferred targets when they are correct and discoverable.
- Add explicit `nx:run-commands` targets for missing stable commands such as scraper tests or syntax checks.
- Keep target names consistent across equivalent applications.
- Set the target working directory explicitly when a native command assumes an application-local directory.
- Mark long-running development targets as continuous.
- Declare outputs only for reproducible build artifacts; never cache runtime state, `.env.local`, logs, or local data.

## Graph And Dependencies

- Inspect `npm exec nx show projects` and `npm exec nx show project <name>` after project changes.
- Inspect the graph when a task changes ownership or cross-project dependencies.
- Do not invent implicit dependencies to make execution order convenient.
- A dependency edge represents a real source, build, generated-asset, or runtime-contract dependency.
- Do not add module-boundary rules until the current graph and tag taxonomy can enforce a real policy without false
  positives.

## Validation

Run the smallest impacted targets first, then the broader graph checks justified by the change:

```bash
npm exec nx show projects
npm exec nx show project @blockout/mobile
npm exec nx run @blockout/mobile:typecheck
npm exec nx run @blockout/club-scraper:syntax-check
```

Use `NX_DAEMON=false` only when diagnosing stale project discovery or when the execution environment requires it.
