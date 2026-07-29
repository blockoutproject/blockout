# Task Execution Runbook

Use this when the user asks to plan or execute a selected or acquired issue.

## Rules

- Preserve unrelated work and implement only the claimed issue's frozen Workset.
- Do not hand-edit generated artifacts.
- Do not plan, branch, or edit task files before a stable claim.
- Use one authenticated `gh` identity for issue, Project, and PR operations.
- Route network and `.git` writes through the authorized managed-checkout path on their first attempt.
- Read Roadmap operations; load lifecycle for Execution Mode or Status decisions and governance only for Project
  structure.

## Entry Profile

Always start with `git status --short --branch`, inspect relevant dirty diffs, and select one profile:

### `FRESH`

1. Read Roadmap operations.
2. Read the complete Project index, target, fields, labels, assignees, dependencies, linked PRs, Workset, and
   active/quarantined claims.
3. Read every current scope-specific authority selected by the repository router.
4. Confirm source gate, Execution Mode, Ready contract, Workset grammar, and conflicts before claim.

### `ACQUIRED_SAME_TASK`

1. Reuse the uninterrupted stable acquisition evidence and loaded sources.
2. Revalidate only target, claim owner/event, Workset/conflicts, branch, PR, and unexpected Project drift.
3. Continue from branch creation without selecting or assigning again.

### `RESUME`

1. Read operations when not already loaded.
2. Obtain a fresh compact index and read target, Workset/conflicts, assignment event, branch, PR, and sources that may
   have drifted.
3. Continue from the first incomplete postcondition without assigning again.

`BLOCK` stops every profile. Connector fallback requires matching authenticated identities.

## Claim Preflight

Apply operations' resume guard to an existing claim. Without a coherent resumable claim, execute the acquisition
runbook's canonical claim protocol. Continue only with operations' unique, conflict-free, stable winner.

## Planning Gate

For `PLAN_REQUIRED`:

1. Research the unresolved lifecycle decision with the current user.
2. Apply operations' planning reservation, approval, abandonment, and scope-expansion guards.
3. Resume implementation only when lifecycle's planning gate passes; apply lifecycle when a real blocker remains.

## Scope Expansion

Before a new path or external resource is touched, follow operations' expansion protocol. Update the visible Workset,
recalculate conflicts, align areas, and reread. Expansion yields to incumbents and rolls back fully on conflict.

## GitFlow

Follow one canonical claim-to-draft path:

1. Revalidate the stable claim, Workset, conflicts, source gate, Execution Mode, branch, and existing PR.
2. For `PLAN_REQUIRED`, stop before branch creation or task-file edits until the Planning Gate passes.
3. Create or reuse one claimed-issue branch from the current integration branch and implement only the Workset.
4. Run required generation and validation against the exact intended tree.
5. Inspect status and diff, stage only explicit intended paths, require no unintended remaining change, and commit once.
6. Push the commit, verify the remote branch at that SHA, and preserve the local commit on any publication failure.
7. Open or update one draft PR to the configured integration branch with lifecycle's `Refs` or `Closes` link mode.
8. Apply two to four PR labels as a separate mutation, then verify labels, PR head, base, and structural issue link.
9. Apply lifecycle's `In Progress → In Review` guard and obtain two stable snapshots of target, PR, assignee, Workset,
   head, and Status.

A Ready-drain worker stops here and never selects another issue.

This runbook authorizes normal non-destructive Git/GitHub operations for the claimed task. It never authorizes
destructive Git, unrelated staging, generated hand-edits, auto-merge, force pushes outside controlled refresh, check
waivers, or merge.

## Recovery

Use operations' delivery recovery table for a conflict, partial claim, scope expansion, interruption, failed commit or
push, publication failure, or failed review transition. Enter `RESUME` after interruption and continue from the first
incomplete visible postcondition. Never compensate by opening another issue, branch, commit, or PR.

If a failure changes the intended tree, rerun affected validation before commit or publication. If a draft PR exists
but its structural link or `In Review` transition is missing, preserve the PR and reconcile only that postcondition.

## Release

Execution stops after draft publication and the stable `In Review` transition. Merge requires a separate current-user
request and the merge runbook. Lifecycle owns every later release, completion, reconciliation, and Epic decision.

## Validation Defaults

Bind validation to the exact tree. Reuse it only while relevant tracked and untracked files remain unchanged.

Read the router's risk-based validation policy. Classify every changed boundary, combine all applicable minimum sets,
then map them to repository commands and every focused policy selected for those boundaries. Use narrow checks while
developing and run the complete selected set before publication. Do not treat the router's command inventory as a
blanket suite for a narrow change.

When ambiguity remains, select the broader profile. Report each skip, fallback, residual risk, and applicable waiver;
missing mandatory evidence blocks publication.

## Final Report

Include issue, owner, Workset, compatibility, source gate, Execution Mode, changed files, validations, skipped checks,
branch, commit, push, draft PR, Project status, release decision, and dependency/Epic transitions.
