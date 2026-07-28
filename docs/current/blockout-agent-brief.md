# Blockout Agent Brief

Last updated: 2026-07-24.

This is the stable handoff for repository agents. It explains how to locate, claim, execute, and release work; it does
not track task status or repeat completed-task history.

## Start Here

1. Run `git status --short --branch` and preserve unrelated changes.
2. Read the [Roadmap GitHub Project](https://github.com/orgs/blockoutproject/projects/4). Only real, non-Epic issues
   with `Status: Ready` are executable.
3. If the complete Project cannot be read, stop. Do not infer a task from Markdown, plans, history, Git branches, or
   memory.
4. Read [`blockout-product-runtime-context.md`](blockout-product-runtime-context.md) for product/runtime posture and
   source routing.
5. Read the selected issue, including its native dependencies, `## Workset`, acceptance criteria, Track, Priority,
   Execution Mode, and references.
6. Load `.agents/skills/blockout-best-practices/SKILL.md` and only the scope-specific policies and sources it routes.
7. Acquire the task before creating a branch, planning task-specific implementation, or editing task files.

## Select Compatible Work

- Validate each `Ready` issue's native type, fields, dependencies, area labels, and Workset before ranking it.
- Compare its write and external locks with every `In Progress`, `In Review`, and assigned `Blocked` issue. Track never
  decides compatibility.
- Order compatible issues by Priority (`High`, `Normal`, `Low`), then the live Project Track option order, then issue
  number.
- Ordinary acquisition gives one login at most one `In Progress` issue. Coherent compatible `In Review` reservations
  may coexist; every active issue retains all declared locks.
- A stable claim requires the authenticated login as the sole assignee, `In Progress`, an active assignment event, no
  conflict, and two consecutive matching post-claim snapshots.
- If no compatible non-Epic issue is `Ready`, report that no task is executable. Never promote backlog by continuity.

Use [task discovery](../runbooks/tasks/discovery.md) for read-only inspection,
[task acquisition](../runbooks/tasks/acquisition.md) to select and reserve new work, and
[task execution](../runbooks/tasks/execution.md) for an already selected or acquired issue. Use
[Ready drain](../runbooks/tasks/ready-drain.md) only when the user explicitly authorizes all compatible
`DEFAULT_EXECUTION` work to be published as separate draft pull requests. Use the
[Merge train runbook](../runbooks/tasks/merge.md) only with explicit current-user merge authorization. That invocation
snapshots the structurally valid non-draft PRs, then refreshes, fully validates, merges, and reconciles them sequentially
while stopping fail-closed on the first conflict or failed gate.

## Source Routing

| Question                                                                 | Authority                                                                                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Task existence, state, priority, mode, owner, and next work              | [Roadmap GitHub Project](https://github.com/orgs/blockoutproject/projects/4)                                                |
| Objective, acceptance criteria, dependencies, evidence, and frozen scope | Selected issue and its native relationships                                                                                 |
| Product/runtime posture and closed boundaries                            | [`blockout-product-runtime-context.md`](blockout-product-runtime-context.md)                                                |
| System and application boundaries                                        | [`../architecture/`](../architecture/) and current source                                                                   |
| Durable product and technical decisions                                  | [`../decisions/`](../decisions/)                                                                                            |
| Delivered V1 scope                                                       | [`../releases/blockout-v1-baseline.md`](../releases/blockout-v1-baseline.md)                                                |
| Current visual direction and Figma interaction                           | Canonical Blockout Figma file and [`Figma policy`](../../.agents/skills/blockout-best-practices/references/figma-policy.md) |
| Delivered history                                                        | Closed issues, merged pull requests, task evidence, and Git history                                                         |
| Roadmap operations and Workset conflicts                                 | [GitHub Roadmap Operations](../../.agents/skills/blockout-best-practices/references/github-roadmap-operations.md)           |
| Lifecycle, review, release, completion, dependencies, and Epic rollup    | [GitHub Roadmap Lifecycle](../../.agents/skills/blockout-best-practices/references/github-roadmap-lifecycle.md)             |
| Project fields, views, workflows, and governance                         | [GitHub Roadmap Governance](../../.agents/skills/blockout-best-practices/references/github-roadmap-governance.md)           |
| Git and GitHub naming or publication                                     | [Blockout Git Workflow](../../.agents/skills/blockout-best-practices/references/git-workflow.md)                            |

Generated output is never product or task authority.

## Execution And Release Gates

- `DEFAULT_EXECUTION` means current sources determine the bounded implementation.
- `PLAN_REQUIRED` also requires current-user approval of the task plan before branch creation or task-file edits.
- Missing evidence means `Blocked`, not permission to invent a decision.
- Task branches start from current `develop`; draft pull requests target `develop` and carry two to four useful labels.
- A request to execute work ends at a draft pull request unless the current user separately authorizes merge.
- Before merge, reread the latest head, base, diff, claim, Workset, acceptance state, reviews, and checks.
- After merge, complete terminal cleanup, dependency reconciliation, Epic rollup, and local `develop` synchronization
  before acquiring more work.

## Local GitHub Operations

- Use one authenticated `gh` identity for issue, Project, pull-request, and release operations.
- In a managed checkout, route `gh`, Git network operations, and `.git` writes through the authorized path on their
  first attempt. Keep repository reads, edits, and local validation in the sandbox.
- Use the read-only compact Project helper. Do not create a mutating Roadmap CLI, Markdown task or claim ledger, hidden
  state, lease, or session token.
- Enter execution through `FRESH`, `ACQUIRED_SAME_TASK`, or `RESUME` as defined by the execution runbook.
- Expand scope only through the visible Workset protocol; an expansion never displaces an incumbent reservation.

## Documentation Ownership

- Task state, ownership, Workset, dependencies, acceptance, and completion evidence: Project item and owning issue.
- Product/runtime posture: [`blockout-product-runtime-context.md`](blockout-product-runtime-context.md).
- Durable decisions: `docs/decisions/**`.
- Architecture state: `docs/architecture/**`.
- Stable delivered-scope snapshot: `docs/releases/**`.
- Detailed completion trace: owning issue, pull request, and Git history.

## Validation Defaults

- Documentation and governance: inspect local links and terminology, read live Project state when relevant, run
  `npm run format`, `npm run format:check`, and `git diff --check`.
- Contracts: regenerate the affected contract and impacted Java, Python, or TypeScript consumers.
- Backend: run targeted Java 21 generation, compilation, or existing tests according to risk.
- Python: use uv plus the owning Nx lint, syntax, and test targets.
- Mobile: run codegen, lint, typecheck, Jest, export, and native checks when a native boundary changes.
- Always report checks intentionally skipped and why.
