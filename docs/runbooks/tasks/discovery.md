# Task Discovery Runbook

> Migration status: dormant until Phase MRG-1000 in `docs/current/blockout-active-roadmap.md`. Use the local roadmap during migration.

Use this only when the user asks to inspect the next executable Blockout task without reserving it. When the user wants
new work to continue with, use [`acquisition.md`](acquisition.md) instead.

## Rules

- Stay read-only. Do not create or update issues, fields, labels, assignees, comments, branches, commits, pushes, or
  pull requests.
- Start with `git status --short --branch`.
- Read `.agents/skills/blockout-best-practices/references/github-roadmap-operations.md` before querying the Project.
- In a managed local checkout, run the read-only compact Project helper outside the sandbox and use the same `gh`
  identity for targeted issue, relationship, PR, and history reads. Use the connector only as a fallback.
- Fetch issue bodies and worksets only for `Ready`, active/quarantined, and currently challenged issues. Do not include
  unrelated closed bodies in decision snapshots.
- If the complete Project cannot be read, stop. Never infer executable work from Markdown, memory, decisions, or Git
  history.

## Required Read Set

1. [Roadmap GitHub Project](https://github.com/orgs/blockoutproject/projects/1)
2. [`../../current/blockout-product-runtime-context.md`](../../current/blockout-product-runtime-context.md)
3. [`../../current/blockout-agent-brief.md`](../../current/blockout-agent-brief.md)
4. The selected issue, its native dependencies, linked PRs, labels, assignees, and `## Workset`
5. Scope-specific architecture, decisions, policies, and source paths named by the issue

For frontend-facing work, also read `DESIGN.md`, the frontend design-system sources, and the relevant FE, CMP, PUB,
SET, or FIG decision records before proposing execution.

## Live Project Calculation

1. Query the compact paginated Project index and every field value without issue bodies.
2. Collect every non-Epic `Ready` issue.
3. Collect active claims: all `In Progress` and `In Review` issues, plus `Blocked` issues with an assignee. Also
   quarantine and reserve the worksets of `Ready` issues with an assignee, active items without exactly one assignee,
   closed non-terminal items, and active claims with invalid worksets or mismatched `area:*` labels. Reserve every lock
   that remains parseable; if an active workset cannot be parsed far enough to determine its locks, stop discovery.
4. Validate each Ready candidate against the complete Ready and workset contracts in Roadmap operations.
5. Compare each valid candidate with every active claim:
   - identical locks conflict;
   - a directory `/**` lock conflicts with every descendant lock;
   - external locks conflict only by exact identifier;
   - area labels and read-only scope never conflict.
6. Leave conflicting candidates in `Ready`, mark them unavailable in the response, and name the active issue, owner,
   and exact overlapping locks.
7. Apply the requested Track filter, if any.
8. Sort remaining compatible candidates by Priority (`High`, `Normal`, `Low`), then the live Project `Track` option
   order, then issue number. Compute the issue-number tie-break locally; Project view sorting is only a presentation aid.
9. Challenge the first candidate against open and closed equivalents, merged PRs, Git history, and current source. If
   it is already delivered, replaced, or duplicated, exclude it for reconciliation and repeat the check on the next
   candidate.
10. Propose the first candidate that passes without overriding the deterministic order.

## Execution Mode Gate

- `DEFAULT_EXECUTION`: current sources already determine the implementation and no product, UX, visual,
  architecture, ownership, source-gate, or priority decision remains.
- `PLAN_REQUIRED`: the task still requires one of those human decisions.

Discovery remains read-only and unassigned in both cases. For `PLAN_REQUIRED`, list the exact decisions the later,
claimed Plan session must resolve.

## Response Shape

- Proposed task: issue number, link, title, Track, Priority, and `READY`, `READY with risks`, or `BLOCKED`.
- Execution Mode and source gate: `OK`, `REVALIDATE`, or `BLOCK`.
- Workset summary and compatibility with every active claim.
- Why this candidate ranks first.
- Required source reads and likely validations.
- Risks and decisions not to invent.
- Expected claim and Git workflow, without performing mutations.

If no compatible Ready issue exists, say so directly and list the invalid or conflicting candidates with their exact
exclusion reasons.

## Execution Handoff

Discovery never reserves work, and merely discussing or questioning its result is not a planning handoff.

When the user explicitly asks to reserve the proposed task:

1. switch to [`acquisition.md`](acquisition.md);
2. obtain one fresh compact index and targeted target/active-claim evidence immediately before claim;
3. if login, repository, Project/schema signature, target, target `updatedAt`, active/quarantined claims, dependencies,
   worksets, and relevant source evidence are unchanged, reuse the detailed validation from this uninterrupted task and
   continue at acquisition's claim read phase;
4. if any decision-bearing evidence changed, perform acquisition's complete live calculation again.

A new task/session never uses this delta handoff. When the user asks to plan or execute the selected task directly,
switch to [`execution.md`](execution.md), which performs a fresh claim unless coherent acquisition evidence exists.
