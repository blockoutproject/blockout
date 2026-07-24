# Blockout Documentation

This folder contains current product context, architecture, durable decisions, a release snapshot, and reusable
runbooks. Task planning and completion evidence live in GitHub, not Markdown.

## Start Here

For ordinary Blockout work:

1. Run `git status --short --branch`.
2. Check the [Roadmap GitHub Project](https://github.com/orgs/blockoutproject/projects/4) for non-Epic `Ready` work.
3. Read [`current/blockout-product-runtime-context.md`](current/blockout-product-runtime-context.md) and
   [`current/blockout-agent-brief.md`](current/blockout-agent-brief.md).
4. Load only the architecture, decision, policy, and runbook sources required by the selected issue.

If the complete Project cannot be read, stop. Do not infer executable work from documentation, history, or a completed
migration record.

## Active Documents

| Area               | File                                                                                                             | Role                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Roadmap Project    | [Roadmap GitHub Project](https://github.com/orgs/blockoutproject/projects/4)                                     | Committed tasks, status, priority, execution mode, ownership, Worksets, and blockers. |
| Roadmap router     | [`GitHub Roadmap Policy`](../.agents/skills/blockout-best-practices/references/github-roadmap-policy.md)         | Routes agents to the smallest authoritative Roadmap reference.                        |
| Roadmap operations | [`GitHub Roadmap Operations`](../.agents/skills/blockout-best-practices/references/github-roadmap-operations.md) | Discovery, acquisition, claims, Worksets, and issue or PR operations.                 |
| Roadmap lifecycle  | [`GitHub Roadmap Lifecycle`](../.agents/skills/blockout-best-practices/references/github-roadmap-lifecycle.md)   | Status transitions, review, release, completion, dependencies, and Epic rollup.       |
| Roadmap governance | [`GitHub Roadmap Governance`](../.agents/skills/blockout-best-practices/references/github-roadmap-governance.md) | Project fields, views, workflows, migrations, and governance validation.              |
| Product context    | [`current/blockout-product-runtime-context.md`](current/blockout-product-runtime-context.md)                     | Delivered posture and boundaries that stay closed.                                    |
| Agent brief        | [`current/blockout-agent-brief.md`](current/blockout-agent-brief.md)                                             | Minimal discovery, claim, source-routing, and validation rules.                       |
| Release baseline   | [`releases/blockout-v1-baseline.md`](releases/blockout-v1-baseline.md)                                           | Delivered V1 capabilities and known limits.                                           |

## Documentation Map

| Layer           | Location                                   | Keep here                                                                                |
| --------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Current context | [`current/`](current/)                     | Product/runtime posture and minimal agent routing.                                       |
| Architecture    | [`architecture/`](architecture/)           | Current system, ingestion, mobile, and design-system models.                             |
| Decisions       | [`decisions/`](decisions/)                 | Durable product and architecture decisions that source code alone cannot explain safely. |
| Releases        | [`releases/`](releases/)                   | Stable delivered-scope snapshots.                                                        |
| Runbooks        | [`runbooks/README.md`](runbooks/README.md) | Reusable procedures, never task state or delivery history.                               |

## Source Rules

- Current source and source contracts outrank historical claims.
- The Project controls execution; architecture and decisions preserve durable intent.
- Generated artifacts are outputs, not product authority.
- Git history and owning GitHub issues and pull requests own detailed completion trace.
- Canonical Figma resources own visual truth; repository documents describe boundaries and validation, not a duplicate
  design source.

## Decision Index

Start from [`decisions/README.md`](decisions/README.md), then load only the domain required by the issue.

## Runbook Selection

| Need                                                          | Runbook                                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Discover the next executable task without mutation            | [`runbooks/tasks/discovery.md`](runbooks/tasks/discovery.md)                           |
| Acquire and reserve the next executable task                  | [`runbooks/tasks/acquisition.md`](runbooks/tasks/acquisition.md)                       |
| Execute an approved task end to end                           | [`runbooks/tasks/execution.md`](runbooks/tasks/execution.md)                           |
| Drain compatible Ready work into separate tasks and draft PRs | [`runbooks/tasks/ready-drain.md`](runbooks/tasks/ready-drain.md)                       |
| Merge the first eligible pull request                         | [`runbooks/tasks/merge.md`](runbooks/tasks/merge.md)                                   |
| Select a reusable audit or execution procedure                | [`runbooks/README.md`](runbooks/README.md)                                             |
| Interact with Figma                                           | [`Figma policy`](../.agents/skills/blockout-best-practices/references/figma-policy.md) |

## Stability Rules

- Keep active documents short and give each fact one owner.
- Do not duplicate Project state, task checklists, validation logs, or GitHub completion evidence in Markdown.
- Do not preserve migration plans after their durable outcome is represented by current architecture, decisions, source,
  and the release baseline.
- Do not silently change product or architecture decisions during documentation cleanup.
