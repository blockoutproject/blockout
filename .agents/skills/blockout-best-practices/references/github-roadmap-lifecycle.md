# GitHub Roadmap Lifecycle

Read this reference for issue types, Execution Modes, lifecycle transitions, review, release, completion, rejection,
dependency reconciliation, and Epic rollup. Selection and claim mechanics live in
[`github-roadmap-operations.md`](github-roadmap-operations.md).

## Issue Types

- `Feature`: independently shippable product behavior or one enabling implementation slice.
- `Action`: research, framing, configuration, or decision without a runtime deliverable.
- `Tech`: tooling, governance, infrastructure, maintenance, technical debt, or audit.
- `Bug`: defect or regression.
- `Epic`: one outcome too large for one issue, with at least two native sub-issues.

Do not create implementation-step draft items. Set the native type rather than duplicating it with a label.

## Lifecycle

| Status                | Meaning                                                                 | Ownership                               |
| --------------------- | ----------------------------------------------------------------------- | --------------------------------------- |
| `Triage`              | New task not accepted                                                   | Unassigned                              |
| `Backlog`             | Valid task not promoted                                                 | Unassigned                              |
| `Ready`               | Complete executable contract                                            | Unassigned                              |
| `In Progress`         | Claimed planning or implementation                                      | Exactly one assignee                    |
| `In Review`           | Structurally linked open PR, or merged PR with required post-merge work | Exactly one assignee                    |
| `Blocked`             | Documented dependency or decision prevents progress                     | Reserved only with exactly one assignee |
| `Done`                | Acceptance and completion guards pass                                   | Unassigned and closed completed         |
| `Rejected / Replaced` | Refused, duplicate, delivered, or superseded                            | Unassigned and closed not planned       |

A temporary workset conflict leaves an otherwise valid issue `Ready` but unavailable.

Ownership is per issue. One login may own multiple active issues only when each has exactly one assignee, a valid
workset, and compatibility with every active or quarantined workset. Ordinary acquisition permits at most one
same-login `In Progress` issue. Ready-drain may fan out multiple compatible implementation claims only through its
controller protocol. Multiple coherent `In Review` reservations may coexist.

## Execution Mode

- `DEFAULT_EXECUTION`: current sources determine bounded implementation and no product, UX, visual, route,
  architecture, ownership, source-gate, or priority choice remains.
- `PLAN_REQUIRED`: at least one of those human decisions remains.

A claim reserves `PLAN_REQUIRED` work while planning. It does not authorize branch creation or task-file edits before
current-user plan approval. Missing evidence means `Blocked`, not permission to invent.

## Transition Guards

- Before a non-Epic leaves `Triage`, set native type, Track, Priority, and Execution Mode.
- `Triage → Backlog`: accepted metadata and an understandable objective exist; equivalent/delivered search is
  negative; retention is justified.
- Any transition to `Ready`: operations' Ready and Workset contracts pass and no native blocker is open.
- `Ready → In Progress`: only through the canonical claim protocol.
- `In Progress → In Review`: a structurally linked open PR exists.
- Active → `Blocked`: use a native blocker or one comment naming the blocker, missing evidence, and clearing condition.
  Retain the assignee only when deliberately preserving the reservation.
- Active → `Ready`: remove the assignee before restoring `Ready`.
- Any → `Done`: all criteria are checked and a completion guard passes; then set `Done`, remove assignees, close as
  completed, and reread.
- Any → `Rejected / Replaced`: record the reason and surviving issue where applicable, set terminal status, remove
  assignees, close as not planned, and reread.

GitHub mutations are not atomic. On failure or ambiguous evidence, reread and complete only the uniquely missing
postcondition. Treat mixed state as reserved but invalid until reconciled.

## Structural PR And Completion Evidence

A PR is structurally linked when:

- the issue's native closing-PR connection contains it; or
- an issue cross-reference event points to a PR body using `Refs #N` or a closing keyword.

Titles, branches, and commits are insufficient.

Repository completion requires a structurally linked merged PR plus checked acceptance criteria. External-only
completion without a PR requires:

- `Write locks` exactly `None.`;
- at least one real external lock;
- scope explicitly forbidding repository changes;
- all criteria checked; and
- one issue comment recording external evidence and confirming no repository work remains.

Required post-merge work must be an unchecked acceptance criterion before merge. Keep the issue assigned and
`In Review` until it passes. Use `Refs` while such work remains and `Closes` only when merge can complete the issue.

## Review And Release

Draft PR creation authorizes review, never release. A current-user Merge task invocation authorizes only the startup
snapshot of structurally valid non-draft PRs defined by the Merge Train Runbook; making a PR non-draft alone does not
start or expand a train. Before each merge:

For the private GitHub Free baseline, reviews and checks are evidence rather than enforceable repository rules. Require
an approval on the current head from an independent contributor when one is available. New commits invalidate that
approval. When no independent contributor is available, the current user may authorize the exact head as a documented
solo fallback only after the author has self-reviewed the complete diff and every applicable validation passes. The
fallback must state that independent review was unavailable and never waives a failed check, unresolved review
request, stale head, Workset violation, or any other release guard.

1. Require explicit current-user merge authorization.
2. Reread the latest PR base, head, diff, linked issue, claim, workset, criteria, reviews, and checks.
3. Require a ready PR whose diff remains in scope and whose applicable validations pass.
4. A missing or failing required check needs a recorded explicit human waiver. The sole automatic exception is the
   merge runbook's head-bound zero-step GitHub billing classification.
5. Require the Merge Train Runbook's complete local topology, health, authenticated protected flow, and sign-out
   evidence on the exact candidate head; changed paths or agent judgment never reduce this release smoke.
6. Merge only after repository and lifecycle guards pass; never infer or enable auto-merge.
7. Reread the merged PR, issue, and Project item before completion.

When `develop` changed after a candidate's last validation, invalidate prior release evidence. Rebase the branch onto
current `develop`, then rerun all head-bound checks plus the complete release smoke. The Merge train never resolves a
conflict: it aborts without pushing, returns the PR to draft, records exact evidence, retains the `In Review`
reservation, and stops. A clean rebase with an equivalent effective diff remains covered by the train invocation; a
changed diff or risk requires new approval. Never merge `develop` into a task branch.

Classify each check run and head SHA through one bounded path:

1. Read the summary once.
2. If no step started, read exactly one check-run annotation; do not request logs, rerun, or poll a terminal run.
3. If steps started, inspect only the failed job or step needed to classify repository versus infrastructure failure.
4. Reuse the classification only while check-run ID and head SHA are unchanged.

Infrastructure failure is not success. Only the documented billing exception bypasses a check without another waiver.
Absence of branch protection does not waive release guards.

## Dependency Unlock Reconciliation

Run after merge, completion, rejection, native blocker closure/removal/reopening/addition, or another terminal
transition:

1. Reread every direct native dependent and its complete native blocker set.
2. While any blocker is open, keep an unassigned dependent `Blocked`. If incorrectly `Ready`, return it to `Blocked`.
   For claimed work, explicitly retain or release its reservation.
3. When all blockers are closed, validate the complete Ready contract: type, Track, Priority, Execution Mode, criteria,
   Workset, area labels, equivalent/delivered challenge, source gate, and conflicts.
4. Repair missing accepted Project metadata from unique evidence. Use governance's `Normal` Priority fallback when no
   unique value exists. Never invent source decisions, scope, or locks merely to unblock.
5. Move an unassigned dependent to `Ready` only when every requirement passes; otherwise keep it `Blocked` and report
   each exact deficiency.
6. Recalculate affected parent Epics after dependent transitions settle.
7. Reread the triggering issue, direct dependents, relevant successors, and parent Epics, including issue open/closed
   state. Require two consecutive matching decision-bearing snapshots after mutation.

Reconciliation uses native relationships, not prose dependency lists. It may expose the next task but never claims it.

## Epic Rollup

Epics have no Workset or assignee and cannot be claimed. Recalculate from native children:

1. `Done` when every child is `Done`.
2. `In Progress` when any child is `In Progress` or `In Review`.
3. `Ready` when no child is active and at least one is `Ready`.
4. `Blocked` when no child is active/Ready and at least one is `Blocked`.
5. `Triage` when no prior rule matches and at least one is `Triage`.
6. `Backlog` when no prior rule matches and at least one is `Backlog`.
7. `Rejected / Replaced` when every child is rejected.

Reaching `Done` also closes the Epic as completed and leaves it unassigned. Native `blocked-by` relationships resolve
on issue closure, not Project Status alone. An explicitly rejected Epic remains rejected. Ambiguous terminal mixes,
including only `Done` plus rejected children, require a human decision.

## Terminal Integrity

Before reporting a terminal transition:

- the Project Status matches the issue close reason;
- the issue is closed and unassigned;
- direct dependents and parent Epics were reconciled;
- two stable post-mutation snapshots agree; and
- no active reservation or orphan branch remains unless explicitly documented.
