# Ready Drain Runbook

Use this only after GIT-009 when the user explicitly asks Codex to drain all currently executable Blockout work into a
human review queue. The controller orchestrates and never implements, owns a task branch, or merges.

## Outcome

Progressively create fresh Codex worktree tasks for the pairwise-compatible `DEFAULT_EXECUTION` frontier. Each worker
owns one explicit issue, publishes one draft PR, and leaves the issue `In Review`. Implementations may overlap after
stable claims. Stop when no further compatible work is executable without human input.

## Invariants

- Read the live Project and Roadmap operations before each dispatch.
- Establish one stable claim before creating its worker, then continue with the next compatible issue.
- Rebuild state from Project, assignments, Worksets, and PRs on every wake. Thread IDs are not durable state.
- Treat every coherent `In Review` issue as an active reservation.
- Exclude `PLAN_REQUIRED` from unattended dispatch.
- Create one fresh managed worktree task per issue; never reuse a worker.
- Workers stop at draft PR and `In Review`. Merge, waiver, rejection, and completion remain human-gated.
- The controller mutates only assignment and Ready/In Progress fields needed for dispatch and unambiguous rollback.
- Never create a controller branch, claim ledger, lease, hidden token, or mutating roadmap helper.

## Controller Cycle

1. Confirm this runbook and activation policy exist on current `origin/develop`.
2. Read the complete compact index and details for Ready, active, and quarantined issues.
3. Classify active claims from GitHub. Coherent implementation/review reservations retain locks but do not block
   compatible work.
4. Quarantine incoherent active state, preserving parseable locks. Stop all dispatch if an active lock cannot be
   parsed. An assigned Blocked issue stops same-login drain.
5. Apply discovery's complete calculation, excluding Epics, `PLAN_REQUIRED`, invalid, delivered, blocked, quarantined,
   and conflicting candidates. Build a deterministic pairwise-compatible frontier in ranked order.
6. Before each dispatch, reread target and active claims. Skip a target no longer unassigned Ready. Otherwise perform
   assignment plus In Progress mutation and require two stable conflict-free snapshots.
7. Create one new Codex task in a managed worktree based on current `origin/develop`. Name the exact issue and require
   execution through `RESUME` without selection or fallback.
8. On unambiguous task-creation failure before a worker exists, roll back only the controller's new claim. On ambiguous
   creation evidence, retain and quarantine the claim to avoid duplicate dispatch.
9. On later wakes, verify worker outcome from issue, PR, assignee, Workset, Status, and stable snapshots, not thread ID.
10. Recalculate after each stable claim or review outcome and dispatch more compatible work when safe.
11. Stop cleanly when no compatible `DEFAULT_EXECUTION` issue remains.

## Worker Prompt Contract

The self-contained worker prompt must:

- name exactly one controller-claimed issue;
- require `git status`, Blockout policies, acquisition, and execution runbooks;
- enter `RESUME` and freshly validate the named claim;
- stop without replacement if missing, unowned, `PLAN_REQUIRED`, invalid, blocked, delivered, quarantined, or
  conflicting;
- implement only the Workset, validate, publish one draft PR to `develop`, transition to `In Review`, and retain locks;
- never merge, waive checks, release another claim, or acquire another issue; and
- report issue, branch, commit, PR, validation, skipped checks, and stable review evidence.

## Human Release And Restart

Run [`merge.md`](merge.md) only on explicit user request. It releases at most one eligible PR and never refreshes other
branches. After a stable merge, rejection, or claim release, a later controller cycle may dispatch newly reconciled
Ready work.

## Stop Report

Report every review reservation, active implementation claim and coherence, every excluded Ready issue with exact
reason, and whether the drain stopped cleanly or failed closed.
