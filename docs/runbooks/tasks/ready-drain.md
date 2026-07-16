# Ready Drain Runbook

> Migration status: dormant until Phase MRG-1000 in `docs/current/blockout-active-roadmap.md`. Use the local roadmap during migration.

Use this only when the user explicitly asks Codex to drain all currently executable Blockout work into a human review
queue. The controller orchestrates; it never implements an issue, owns a task branch, or merges a pull request.

## Outcome

Progressively create fresh Codex worktree tasks for the pairwise-compatible `DEFAULT_EXECUTION` frontier. Each worker
owns one explicit issue, publishes one draft PR, and leaves that issue `In Review`. Implementations may overlap after
their claims become stable. Stop when no additional compatible work is executable without human input.

## Invariants

- Read the live Roadmap and Roadmap operations before every worker dispatch. GitHub remains the only task and claim
  source of truth.
- A controller cycle dispatches workers progressively: establish one stable coherent `In Progress` claim, create its
  named worker, then claim and dispatch the next compatible issue. Multiple workers may implement concurrently after
  those claims are established.
- Rebuild controller state from the live Roadmap, assignments, worksets, and linked PRs on every wake. Ephemeral Codex
  thread identifiers are never durable controller state and are not required after a stable claim or review outcome.
- Treat every `In Review` issue as an active reservation. Same-login review reservations may coexist only when each has
  exactly one assignee, a valid workset and area labels, and a structurally linked open PR.
- Exclude `PLAN_REQUIRED` issues from unattended dispatch. They remain `Ready` and do not prevent other compatible
  `DEFAULT_EXECUTION` work from draining.
- Create one new Codex task and one managed worktree per issue. Never fork, resume, or reuse a completed worker for the
  next issue.
- A worker ends at a draft PR and `In Review`. Merge, check waiver, rejection, and post-merge release remain human-gated
  through the execution and lifecycle rules.
- The controller may mutate only the assignment and `Ready`/`In Progress` fields required for canonical dispatch claims
  and their unambiguous task-creation rollback. It never implements, creates a task branch, edits task files, publishes,
  merges, waives checks, completes issues, or releases unrelated claims.
- Do not create a controller branch, claim ledger, lease, task token, mutating Roadmap CLI, or hidden status file.

## Controller Cycle

1. Confirm this runbook exists on current `origin/develop`; an unmerged policy must never activate the drain.
2. Read the complete compact Project index and targeted details for every `Ready`, active, and quarantined issue.
3. Classify every active issue from GitHub state. A coherent `In Progress` implementation claim or coherent `In Review`
   reservation retains all locks but does not block unrelated compatible work. A stable `In Review` issue and linked
   open PR complete the worker outcome even when its Codex task can no longer be resolved.
4. Quarantine an incoherent or orphaned active issue and retain every parseable lock. Continue only with unrelated
   candidates when the invalid claim is isolated unambiguously; if its locks cannot be parsed, stop all dispatch. An
   assigned `Blocked` issue still stops the same-login drain until explicitly reconciled.
5. Apply discovery's complete calculation to non-Epic `Ready` issues, excluding `PLAN_REQUIRED`, invalid, delivered,
   blocked, quarantined, and active-conflicting candidates. Build the deterministic frontier greedily in ranked order,
   retaining only candidates compatible with every active claim and every earlier frontier candidate.
6. Immediately before each dispatch, reread the target and active claims. Skip the target when it is no longer
   unassigned `Ready`. Otherwise perform the canonical assignment plus `In Progress` mutation and require two
   consecutive matching snapshots showing a coherent conflict-free claim. The durable claim is the idempotency key:
   repeated or overlapping wakes never create another worker for an already active issue.
7. Create one new Codex task in a managed worktree based on current `origin/develop`. Name the explicit claimed issue in
   its prompt and require the worker to enter execution through `RESUME`, validate that exact claim, and implement only
   it. The worker must not select, claim, rerank, fall through, or acquire another candidate.
8. If task creation fails unambiguously before a worker exists, roll back only the controller's new claim by removing
   its assignee and restoring `Ready`, then verify both postconditions. When task-creation evidence is ambiguous, retain
   and quarantine the claim instead of risking duplicate dispatch. Continue only when its locks are parseable and the
   remaining candidate is unrelated.
9. A later wake verifies completed workers from the live issue, linked PR, assignee, workset, Project status, and two
   stable snapshots. It never blocks solely because a provisional or completed Codex thread identifier is unavailable.
10. Repeat the live calculation after every stable claim or review outcome. Dispatch further compatible work in the
    same wake when practical; otherwise the next wake resumes idempotently from GitHub state.
11. When no compatible `DEFAULT_EXECUTION` candidate remains, end the cycle and report active implementations, the
    review queue, and every excluded candidate with its reason.

## Worker Prompt Contract

Every worker prompt is self-contained, contains no prior worker transcript, and names exactly one controller-selected
issue. It must tell the worker to:

- start with `git status --short --branch` and read `blockout-best-practices` plus
  [`acquisition.md`](acquisition.md) and [`execution.md`](execution.md);
- enter execution through `RESUME` and freshly validate only the named `DEFAULT_EXECUTION` claim rather than trusting
  the controller's earlier evidence;
- stop without selecting a replacement when the claim is missing, no longer owned by the authenticated login, is
  `PLAN_REQUIRED`, invalid, blocked, delivered, quarantined, or conflicting;
- implement only the acquired workset, run required validation, publish one draft PR to `develop`, transition the issue
  to `In Review`, and retain its assignment and locks;
- never merge, waive a check, release another issue's claim, or acquire a second issue; and
- report the issue, branch, commit, PR, validations, skipped checks, and stable review-reservation evidence.

## Human Release And Restart

Human merge authorization targets one PR at a time. Use [`merge.md`](merge.md) to select and release at most one
eligible PR. The merge task never refreshes remaining branches; the user updates them before a later merge run can
consider them eligible again.

After a merge, rejection, or explicit claim release reaches stable postconditions, the controller may run a new cycle.
Newly unblocked work is eligible only after lifecycle reconciliation has validated and moved it to `Ready`. A rejected
or changes-requested PR keeps its reservation until the user explicitly releases or redirects the claim.

## Stop Report

Report:

- each open review reservation with issue and PR;
- each active implementation claim and whether its GitHub evidence is coherent or requires recovery;
- every remaining `Ready` issue excluded for mode, invalid contract, delivered state, quarantine, or exact lock
  conflict; and
- whether the drain stopped cleanly for human review or failed closed on an invariant.
