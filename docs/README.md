# Blockout Documentation

This folder contains product/runtime context, architecture, durable decisions, temporary migration guidance, and
reusable runbooks.

## Start Here

During monorepo migration:

1. Run `git status --short --branch`.
2. Read [`current/blockout-active-roadmap.md`](current/blockout-active-roadmap.md).
3. Read [`current/blockout-product-runtime-context.md`](current/blockout-product-runtime-context.md) and
   [`current/blockout-agent-brief.md`](current/blockout-agent-brief.md).
4. Load only the scope-specific sources routed by the selected migration item.

GitHub Project task planning remains dormant until the final GitFlow activation phase.

## Active Documents

| Area               | File                                                                                         | Role                                                      |
| ------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Migration roadmap  | [`current/blockout-active-roadmap.md`](current/blockout-active-roadmap.md)                   | Temporary task order, dependencies, and completion state  |
| Product context    | [`current/blockout-product-runtime-context.md`](current/blockout-product-runtime-context.md) | Delivered runtime posture and boundaries that stay closed |
| Agent brief        | [`current/blockout-agent-brief.md`](current/blockout-agent-brief.md)                         | Minimal migration selection and source routing            |
| Repository router  | [Blockout Best Practices](../.agents/skills/blockout-best-practices/SKILL.md)                | Universal rules and reference routing                     |
| Production cutover | [`migration/monorepo-cutover.md`](migration/monorepo-cutover.md)                             | Temporary per-deployable migration and rollback procedure |

## Documentation Map

| Layer           | Location                                   | Keep here                                                                      |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| Current context | [`current/`](current/)                     | Runtime posture, minimal agent routing, and temporary active migration roadmap |
| Architecture    | [`architecture/`](architecture/)           | Current product and technical models                                           |
| Decisions       | [`decisions/`](decisions/)                 | Durable product, capability, architecture, and workflow decisions              |
| Releases        | [`releases/`](releases/)                   | Stable delivered-scope snapshots after they are established                    |
| Migration       | [`migration/`](migration/)                 | Temporary cutover guidance removed or archived after migration                 |
| Runbooks        | [`runbooks/README.md`](runbooks/README.md) | Reusable procedures, never product authority                                   |

## Source Rules

- Current source and deployed behavior outrank historical claims.
- The active roadmap controls migration execution only.
- Architecture and decisions preserve durable intent.
- Generated artifacts are outputs, not product authority.
- Maaatch is the structural reference, not a Blockout product source.

## Stability Rules

- Keep current documents focused and give each fact one owner.
- Do not duplicate roadmap state in runbooks or architecture documents.
- Do not silently change durable product or architecture decisions during cleanup.
