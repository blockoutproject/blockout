# Task Discovery Runbook

Use this when the user asks to inspect the next executable Blockout task without reserving it. For
work intended to continue, use [`acquisition.md`](acquisition.md).

## Rules

- Stay read-only: no issue, field, label, assignee, comment, branch, commit, push, or PR mutation.
- Start with `git status --short --branch`.
- Read `github-roadmap-operations.md` before querying the Project.
- Use the compact Project helper and the same authenticated `gh` identity for targeted reads.
- Fetch detailed bodies and Worksets only for Ready, active/quarantined, and currently challenged issues.
- Stop fail-closed when the complete Project or a decision-bearing connection cannot be read.
- Never infer executable work from Markdown, memory, deferred evidence, or Git history.

## Required Read Set

1. The live Blockout Roadmap Project.
2. `blockout-best-practices` and the scope-specific references it routes.
3. The selected issue, native dependencies, linked PRs, labels, assignees, and complete Workset.
4. Current source and task-specific architecture, product, contract, Figma, or evidence documents.

For mobile visual work, also read the canonical Figma and mobile policies before proposing execution.

## Live Calculation

1. Query the compact paginated Project index and all field values.
2. Collect every non-Epic Ready issue.
3. Collect all active claims and quarantine inconsistent active/assigned/closed state as defined by operations. Reserve
   every parseable lock; stop when an active Workset cannot be parsed far enough to determine locks.
4. Detect reconciliation drift: a Blocked issue whose native blockers are closed or a Done Epic that remains open.
   Report it and exclude it until lifecycle reconciliation runs.
5. Validate every Ready candidate against complete Ready and Workset contracts.
6. Compare each valid candidate with every active/quarantined claim. Exact locks, ancestor directory locks, and exact
   external locks conflict; areas and read-only scope do not.
7. Leave conflicts Ready but unavailable and name the issue, owner, and overlapping locks.
8. Apply a requested Track filter.
9. Sort by Priority, live Track order, then issue number.
10. Challenge the first candidate against equivalent issues, merged PRs, Git history, and current source; repeat when
    delivered or replaced.
11. Propose the first valid compatible candidate.

## Execution Mode Gate

- `DEFAULT_EXECUTION`: source gate is `OK` when bounded implementation is fully determined.
- `PLAN_REQUIRED`: list the exact decisions a later claimed Plan must resolve.
- Missing required evidence yields `BLOCK`, never invented scope.

Discovery remains unassigned in every mode.

## Response

Report:

- issue number, link, title, Track, Priority, and `READY`, `READY with risks`, or `BLOCKED`;
- Execution Mode and source gate (`OK`, `REVALIDATE`, or `BLOCK`);
- Workset and compatibility with every active claim;
- why it ranks first;
- required source reads and likely validations;
- risks and decisions not to invent;
- expected claim and GitFlow without mutation; and
- any reconciliation drift.

If no compatible candidate exists, list exact exclusion reasons.

## Handoff

An explicit request to reserve the proposal switches to acquisition. In the same uninterrupted task, reuse detailed
evidence only after one fresh compact and targeted read proves every decision-bearing value unchanged. A new task or
any drift requires the complete calculation again.
