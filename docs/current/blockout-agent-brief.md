# Blockout Agent Brief

Last updated: 2026-07-16.

This is the stable handoff for repository agents during the monorepo migration. It explains how to select migration
work and locate sources; it does not replace product evidence or production authority.

## Start Here

1. Run `git status --short --branch` and preserve unrelated changes.
2. Read [`blockout-active-roadmap.md`](blockout-active-roadmap.md). The first unchecked task whose dependencies are
   complete is the migration candidate.
3. Read [`blockout-product-runtime-context.md`](blockout-product-runtime-context.md).
4. Load [Blockout Best Practices](../../.agents/skills/blockout-best-practices/SKILL.md) and only the references routed
   by the selected task.
5. Inspect current source and the relevant standalone production repository before changing runtime-shaped behavior.

## Migration Task Selection

- GitHub Project discovery, acquisition, claims, and merge automation are dormant during migration.
- Work from the local roadmap in phase order unless the user explicitly selects another unblocked item.
- Revalidate the task against current source before editing.
- Do not expand an item silently. Add discovered work to the owning later phase.
- Check an item only after its evidence is current and validation succeeds.
- If product behavior, production credentials, or deployment authority is required, stop at the human gate.

## Source Routing

| Question                          | Read first                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------- |
| Migration task and phase state    | [`blockout-active-roadmap.md`](blockout-active-roadmap.md)                       |
| Product/runtime posture           | [`blockout-product-runtime-context.md`](blockout-product-runtime-context.md)     |
| Repository rules                  | [Blockout Best Practices](../../.agents/skills/blockout-best-practices/SKILL.md) |
| Production migration and rollback | [`../migration/monorepo-cutover.md`](../migration/monorepo-cutover.md)           |
| Current contracts and behavior    | Current source, deployed API behavior, and standalone repository                 |
| Completed migration evidence      | Checked roadmap item, Git commit, CI run, and owning validation output           |

Current sources must still be inspected when a task audits or changes real behavior. Generated outputs are never
product authority.

## Guardrails

- Maaatch is the structural reference, not a source of Blockout product behavior.
- Source OpenAPI fragments become authoritative only after the owning contract migration task is complete.
- Preserve ports, environment variables, database ownership, events, schedules, image behavior, and production
  deployment authority during structural work.
- Standalone repositories remain the production rollback path until individual cutover.
- Do not expose migration state, task IDs, service mechanics, raw IDs, or deployment internals in product copy.

## Documentation Ownership

- Temporary migration task state: [`blockout-active-roadmap.md`](blockout-active-roadmap.md).
- Product/runtime posture: [`blockout-product-runtime-context.md`](blockout-product-runtime-context.md).
- Durable decisions: `docs/decisions/**` once recorded.
- Architecture state: `docs/architecture/**`.
- Production cutover procedure: `docs/migration/**` until migration completion.
- Detailed delivery evidence: Git commit and CI output during local-roadmap mode.

## Validation Defaults

- Documentation or skill only: validate local links, inspect reference routing, format touched files, and run
  `git diff --check`.
- Workspace: inspect `nx show projects` and run the local CI verification script when practical.
- Contracts: do not claim generation before the contract infrastructure phase is active.
- Backend: run targeted Maven generation/compile or existing tests according to risk.
- Mobile: run typecheck and usually an Expo export.
- Scrapers: run syntax checks and build images for packaging changes.
- Always report intentionally skipped checks and why.
