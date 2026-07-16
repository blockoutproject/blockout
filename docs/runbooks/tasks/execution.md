# Task Execution Runbook

> Migration status: dormant until Phase MRG-1000 in `docs/current/blockout-active-roadmap.md`. Use the local roadmap during migration.

Use this when the user explicitly asks to plan or execute a selected or already acquired Blockout task.

## Rules

- Preserve unrelated user changes.
- Execute only the claimed issue and frozen workset.
- Do not edit generated artifacts by hand.
- Do not develop the task-specific execution plan, create a branch, or edit task files until the claim protocol
  succeeds.
- For `PLAN_REQUIRED`, do not create a branch or edit task files until the current user approves the claimed execution
  plan.
- In a managed local checkout, use one authenticated `gh` transport outside the sandbox for issue, Project, and PR
  operations. The compact helper's `authenticatedLogin` is sufficient identity evidence when it is used. Use the
  connector only for a capability gap and prove identities match before mixing evidence.
- Run Git network operations and every `.git` write outside the sandbox on their first attempt. Keep reads, edits, and
  local validation inside the sandbox.
- Read `github-roadmap-operations.md` for operation mechanics and load lifecycle/governance only when needed. Do not
  create a mutating roadmap CLI or Markdown claim ledger.

## Entry Profile

Always start with `git status --short --branch`, inspect relevant dirty diffs, and identify exactly one profile from
Roadmap operations:

### `FRESH`

1. Read Roadmap operations.
2. Read the compact Project index, target issue, fields, labels, assignees, native dependencies, linked PRs, complete
   workset, and active/quarantined claims.
3. Read [`../../current/blockout-product-runtime-context.md`](../../current/blockout-product-runtime-context.md),
   [`../../current/blockout-agent-brief.md`](../../current/blockout-agent-brief.md), and scope-specific references.
4. Confirm source gate, Execution Mode, Ready contract, workset grammar, and conflicts before claim.

### `ACQUIRED_SAME_TASK`

1. Reuse the same uninterrupted task's stable acquisition evidence, loaded references, source gate, and Execution Mode.
2. Revalidate only target, claim owner/event, workset/conflicts, branch, PR, and unexpected Project drift.
3. Continue from branch creation without selecting, assigning, or loading unchanged sources again.

### `RESUME`

1. Read Roadmap operations if it is not already loaded in the current task.
2. Obtain a fresh compact index and read target, workset/conflicts, assignment event, branch, PR, and sources that may
   have drifted since the interruption.
3. Continue at the first incomplete step without selecting or assigning again.

For every profile, `BLOCK` stops execution. `PLAN_REQUIRED` keeps branch creation and task-file edits closed until the
current user approves the claimed plan. If connector fallback is required, read both authenticated logins and stop
unless they match exactly.

## Resume And Recovery Preflight

Before a new claim, inspect whether the target already has one:

1. Resume an `In Progress`, `In Review`, or assigned `Blocked` issue only when exactly the authenticated user owns it.
   In the same uninterrupted task, reuse stable acquisition evidence under the freshness guard and revalidate only
   drift-sensitive workset, conflict, branch, PR, and assignment state. Continue without selecting or assigning again.
2. Stop when another user owns the claim.
3. Quarantine `Ready` with an assignee, an active status without exactly one assignee, closed non-terminal items, and
   active claims whose workset or `area:*` labels are invalid. Reserve every parseable lock until recovery. If an active
   workset cannot be parsed far enough to determine its locks, stop all new claims.

## Mandatory Claim Before Planning, Branch, Or Editing

Skip the mutation steps only when the resume preflight proves a coherent claim created by acquisition or earlier
execution. The same stable evidence remains mandatory.

### Read phase

1. Read the compact paginated Project index and targeted detailed claim evidence.
2. Collect active claims and quarantined claims defined above.
3. Compare the target workset with every active claim.
4. If any write or external lock overlaps, leave the issue `Ready`, report the conflicting issue, owner, and exact
   locks, and stop.
5. Confirm the target is unassigned and the intended assignee is the authenticated GitHub user.

### Mutation phase

1. Add the authenticated user as the single assignee through `gh api`.
2. Resolve the live Project schema once for the uninterrupted workflow, then update `Status` to `In Progress`.
3. Immediately reread compact decision state, target assignees, relevant worksets, and assignment timeline, then
   obtain a second consecutive matching snapshot.

If a mutation fails or its result is ambiguous, stop and follow Roadmap operations' partial-claim recovery. Proceed
only after its two stable post-claim snapshots authorize plan development and, subject to the `PLAN_REQUIRED` gate,
branch creation and editing.

If the reread reveals a concurrent overlap, apply the canonical arbitration in Roadmap operations and release only the
losing claim. Only the unique conflict-free winner may continue; branch creation still requires an approved plan when
the task is `PLAN_REQUIRED`.

## PLAN_REQUIRED Planning Gate

After the two stable post-claim snapshots:

1. research and resolve the named product, UX, visual, architecture, ownership, source-gate, or priority decisions with
   the current user;
2. keep branch creation and task-file edits closed until the current user approves the resulting execution plan;
3. if the approved plan needs a new path or external resource, complete Scope Expansion before touching it;
4. if the user abandons planning, rejects the plan, or hands the task back before implementation, remove the assignee,
   return the item to `Ready`, and reread both postconditions;
5. if planning exposes a real blocker, apply Roadmap lifecycle's `Blocked` guard and explicitly retain or release the
   workset instead of leaving an idle `In Progress` claim.

The planning claim records ownership and reserves the workset; it is not implementation approval.

## Scope Expansion

Before touching a new path or external resource, stop and follow Roadmap operations' scope-expansion protocol. The
expansion yields to every incumbent reservation. Preserve the previous valid workset for restoration and stop in
quarantine if a body/label rollback is partial or ambiguous.

## GitFlow

Follow `.agents/skills/blockout-best-practices/references/git-workflow.md`:

1. create or reuse the claimed issue's branch;
2. implement only the workset;
3. run scope-appropriate validation;
4. inspect and stage only intended files;
5. commit and push;
6. open or update a draft PR targeting `develop`;
7. batch safe PR metadata, link the issue, and report checks run or skipped;
8. verify the structural link with a targeted issue/PR query;
9. transition the issue to `In Review`, then reread only the target issue, PR, assignee, workset, and changed Project
   field while retaining the reservation.

When execution was started by [`ready-drain.md`](ready-drain.md), stop after this publication gate. Do not select or
claim another issue in the same task. The controller must verify the coherent review reservation and create a fresh
worktree task for the next acquisition.

This runbook authorizes the non-destructive Git/GitHub operations required for that flow. It does not authorize force
pushes, destructive Git, staging unrelated files, hand-editing generated artifacts, or bypassing a user override.

Opening the draft PR is not release authorization. Before merge, require the current user's explicit merge approval,
remove draft state, reread the latest diff and claim, inspect current reviews and checks, and require every applicable
validation and required check to pass. A missing or failing required check needs an explicit human waiver recorded on
the PR. The absence of branch protection does not waive this gate.

Use Git workflow's deterministic link-mode, zero-step CI, rebase-based branch-refresh, merge-commit PR integration,
and post-merge `develop` synchronization paths.

If another PR changed `develop` after this PR's last validation, invalidate the prior release evidence. Refresh the
branch by rebasing it onto current `develop`, resolve conflicts, rerun affected checks, and obtain new merge
authorization when the effective diff or release risk changed. Never merge `develop` into the task branch.

## Completion And Release

Apply Roadmap lifecycle's canonical guards for `Blocked`, explicit claim release, `In Review`, repository or
external-only `Done`, rejection, post-merge work, Epic rollup, and terminal integrity. Reread all postconditions after
each mutation; never infer completion from a merged PR or mutation response alone.

After any merge or terminal or blocker state change, run lifecycle's Dependency Unlock Reconciliation before reporting
completion or acquiring more work. Reread fresh native dependents and all their blockers; move an unassigned dependent
to `Ready` only when every blocker is closed and its complete Ready contract, source gate, delivered-state challenge,
and workset compatibility pass. Otherwise keep it `Blocked` and report the exact unresolved requirement. Recalculate
affected parent Epics after dependent transitions, then require two consecutive matching snapshots for the completed
task, direct dependents, relevant successors, and parents.

## Validation Defaults

Bind every completed local validation to the exact tree it checked. Reuse it only while no relevant tracked or
untracked file changes. A new commit with the same validated tree may reuse the result; any relevant tree change must
rerun the impacted validation. This working evidence never replaces current PR checks, reviews, diff, claim, or waiver
evidence before merge.

- Docs/governance only: inspect links and terminology, perform live read-only Project calculations, and run
  `git diff --check`.
- Contracts: generate contracts and impacted clients/server sources.
- Backend: targeted Maven generation, compile, or existing tests.
- Frontend: typecheck, usually build, and browser evidence for visual changes.

Do not add unit tests unless the user explicitly requests them.

## Final Report

Include issue, owner, workset, compatibility result, source gate, Execution Mode, changed files, validations, skipped
checks, branch, commit, push, draft PR, final Project status, release decision or waiver when applicable, and any parent
or successor transition.
