# Task Discovery Runbook

Use this when the user asks to inspect the next executable task without reserving it. For work intended to continue,
use [`acquisition.md`](acquisition.md).

## Rules

- Stay read-only: no issue, field, label, assignee, comment, branch, commit, push, or PR mutation.
- Start with `git status --short --branch`.
- Read Roadmap operations before querying the Project and lifecycle before classifying Execution Mode or
  reconciliation drift.
- Use the compact Project helper and the same authenticated `gh` identity for targeted reads.
- Fetch detailed bodies and Worksets only for Ready, active/quarantined, and currently challenged issues.
- Stop fail-closed when the complete Project or a decision-bearing connection cannot be read.
- Never infer executable work from Markdown, memory, deferred evidence, or Git history.

## Required Read Set

1. The live Roadmap Project declared by the repository overlay.
2. The repository router and the scope-specific references it selects.
3. The selected issue, native dependencies, linked PRs, labels, assignees, and complete Workset.
4. Current source and every task-specific authority selected by the repository router.

## Live Calculation

1. Query the compact paginated Project index and all field values.
2. Fetch only the detailed candidate, claim, and challenge evidence allowed by operations.
3. Apply operations' complete read-only discovery calculation, including quarantine, reconciliation-drift detection,
   contracts, conflicts, any requested Track filter, ranking, and delivered-state challenge.
4. Propose the first remaining candidate without mutation.

## Intake Proposal

When the request is to introduce work rather than select an existing Ready issue:

1. Run operations' intake `Discovery` phase against open and closed issues, merged PRs, Git history, and current
   sources.
2. If an existing issue owns the outcome or the work is already delivered, report that evidence and do not propose a
   duplicate.
3. Build one `Proposal` containing the exact title, native type, Track, Priority, Execution Mode, acceptance criteria,
   dependencies, Workset, area labels, and recommended lifecycle status.
4. Mark unresolved product, UX, architecture, ownership, source-gate, or priority decisions as `PLAN_REQUIRED`; use
   `Blocked` when missing evidence prevents a testable planning contract.
5. Stop read-only. Creation, acceptance, Ready promotion, and claim remain separate visible postconditions.

## Execution Mode Gate

Use lifecycle's Execution Mode definitions and the repository source gate. Report the exact unresolved decisions for
`PLAN_REQUIRED`; missing evidence yields `BLOCK`. Discovery remains unassigned in every mode.

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

For an intake proposal, report every proposed contract value, the duplicate/delivered evidence checked, the recommended
initial status, and the exact decision required before creation.

If no compatible candidate exists, list exact exclusion reasons.

## Handoff

An explicit request to reserve the proposal switches to acquisition. In the same uninterrupted task, reuse detailed
evidence only after one fresh compact and targeted read proves every decision-bearing value unchanged. A new task or
any drift requires the complete calculation again.
