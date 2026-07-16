# GitHub Roadmap Lifecycle

> Migration status: dormant until Phase MRG-1000 in `docs/current/blockout-active-roadmap.md`. The local roadmap remains authoritative and these GitHub rules must not be activated early.

Read this reference for issue types, execution modes, lifecycle transitions, review, release, completion, rejection,
and Epic rollup. Operational selection and claim mechanics live in
[`github-roadmap-operations.md`](github-roadmap-operations.md).

## Issue Types

- `Feature`: independently shippable product behavior.
- `Action`: conception, research, configuration, or a decision without a runtime deliverable.
- `Tech`: tooling, governance, maintenance, technical debt, or audit.
- `Bug`: defect or regression.
- `Epic`: one outcome too large for one issue with at least two native sub-issues.

Do not create implementation-step or draft Project items. Set the native type; do not replace it with a label. Use the
repository title conventions from [`git-workflow.md`](git-workflow.md).

## Lifecycle

| Status                | Meaning                                                                 | Ownership                               |
| --------------------- | ----------------------------------------------------------------------- | --------------------------------------- |
| `Triage`              | New task not accepted                                                   | Unassigned                              |
| `Backlog`             | Valid task not promoted                                                 | Unassigned                              |
| `Ready`               | Complete executable contract                                            | Unassigned                              |
| `In Progress`         | Claimed planning or implementation                                      | Exactly one assignee                    |
| `In Review`           | Structurally linked open PR, or merged PR with explicit post-merge work | Exactly one assignee                    |
| `Blocked`             | Documented dependency or decision prevents progress                     | Reserved only with exactly one assignee |
| `Done`                | Acceptance and completion guards pass                                   | Unassigned and closed completed         |
| `Rejected / Replaced` | Refused, duplicated, delivered, or superseded                           | Unassigned and closed not planned       |

Temporary workset conflict leaves an otherwise valid issue `Ready` but unavailable.

Ownership is enforced per issue. One login may own multiple active issues only when every issue has exactly one
assignee, a valid workset, and remains compatible with every other active or quarantined workset. Ordinary acquisition
still allows at most one same-login `In Progress` issue. The explicitly authorized Ready-drain path may fan out
multiple same-login `In Progress` implementation claims when each claim belongs to one issue-specific worker and
passes the operations stability guard. Multiple coherent `In Review` reservations may coexist under the same
compatibility rule.

## Execution Mode

- `DEFAULT_EXECUTION`: current sources determine the bounded implementation and no product, UX, visual, route,
  architecture, ownership, source-gate, or priority choice remains.
- `PLAN_REQUIRED`: one of those human decisions remains.

A claim reserves `PLAN_REQUIRED` work during planning. It never authorizes branch creation or task-file edits before
current-user plan approval. Missing evidence means `Blocked`, not permission to invent.

## Transition Guards

- Before a non-Epic leaves `Triage`, set its native type, Track, Priority, and Execution Mode. Every accepted status,
  including `Blocked`, must preserve those fields.
- `Triage → Backlog`: the accepted metadata above and an independently understandable objective exist;
  equivalent/delivered search is negative; retention does not require an unresolved human decision.
- Any transition to `Ready`: the operations Ready and workset contracts pass and no native blocker remains.
- `Ready → In Progress`: only through the operations claim protocol.
- `In Progress → In Review`: a structurally linked open PR exists.
- Any active task → `Blocked`: use a native blocker or one comment naming the blocker, missing evidence, and clearing
  condition. Retain the assignee only when intentionally reserving the workset.
- Active task → `Ready`: explicit release removes the assignee first.
- Any task → `Done`: every criterion is checked and a completion guard passes; then set `Done`, remove all assignees,
  close completed, and reread.
- Any task → `Rejected / Replaced`: record the reason/replacement, set terminal status, remove assignees, and close not
  planned.

GitHub mutations are not atomic. On failed or ambiguous evidence, reread and continue only from the first missing
postcondition. Treat mixed state as reserved but invalid until reconciled.

## Linked PR And Completion Evidence

A PR is structurally linked when the issue's native closing-PR connection contains it, or a PR cross-reference event
has a PR body naming the issue through `Refs #N` or a closing keyword. Titles, branch names, commits, or unrelated prose
are not sufficient.

Repository completion requires a structurally linked merged PR and checked acceptance criteria. External-only
completion without a PR requires:

- `Write locks` exactly `None.` and at least one real external lock;
- scope explicitly forbidding repository changes;
- all criteria checked; and
- one issue comment recording external evidence and confirming no repository change remains.

Required post-merge validation or migration must be an unchecked acceptance criterion before merge. Keep the issue
assigned and `In Review` until it passes.

Choose the PR link mode before opening or updating the PR. If any required post-merge criterion remains unchecked,
use `Refs #<issue>` and reject a closing keyword. Use `Closes #<issue>` only when the merge itself can satisfy every
remaining criterion and the repository completion guard.

## Review And Release

Draft PR creation authorizes `In Review`, not release. Before merge:

1. require explicit current-user merge authorization;
2. reread the latest PR diff, target, linked issue, claim, workset, criteria, reviews, and checks;
3. require the PR to be ready, the diff to stay within the workset, and all applicable validations/checks to pass;
4. when the Merge Runbook proves from the single zero-step annotation that a job never started because GitHub account
   payments failed or the spending limit must be increased, record the head-bound classification on the PR and bypass
   that check without another waiver; every other missing or failing required check needs an explicit human waiver;
5. merge only after repository and lifecycle guards pass; never enable auto-merge by inference;
6. reread the merged PR, issue, and Project item before completion.

When another PR has changed the target branch since the candidate PR's last validation, invalidate prior release
evidence. Rebase the candidate onto current `develop` through Git workflow's controlled branch-refresh path, resolve
any conflict, and rerun affected validation before requesting or acting on merge authorization. Never merge `develop`
into the candidate branch.

Classify CI evidence with one bounded path per check run and head SHA:

1. read the check summary once;
2. when the job has zero executed steps or explicitly never started, read exactly one check-run annotation and
   classify it as infrastructure evidence; do not request failed-step logs, rerun it, or poll a terminal run;
3. when steps started, inspect only the failed job or step logs needed to distinguish a repository failure from an
   infrastructure failure;
4. reuse that classification only while both the check-run ID and head SHA remain unchanged.

An infrastructure classification does not make a required check pass. Only the recorded GitHub billing exception
above bypasses a check without another waiver; every other infrastructure failure still follows the explicit human
waiver rule.

Absence of branch protection does not waive these rules.

Before a terminal transition, flag any `Done` or rejected issue that remains open or assigned. Terminal cleanup must
leave the issue closed, unassigned, and consistent with its Project status.

## Dependency Unlock Reconciliation

Run this reconciliation after any merge, completion, rejection, native blocker closure or removal, blocker reopening,
or native blocker addition. A successful mutation is not a completed workflow until direct dependents and the parent
Epic reach coherent postconditions.

1. Reread every direct native dependent and all of each dependent's native blockers after the triggering issue reaches
   its final state.
2. When any blocker remains open, keep an unassigned dependent `Blocked`. If the dependent was incorrectly `Ready`,
   move it to `Blocked`. If it is claimed, apply the canonical `Blocked` guard and explicitly retain or release its
   workset instead of silently demoting an active task.
3. When no blocker remains open, validate the dependent's complete Ready contract, including type, Track, Priority,
   Execution Mode, acceptance criteria, workset, area labels, equivalent/delivered challenge, and source gate. Move an
   unassigned `Blocked` dependent to `Ready` only when every requirement passes.
4. If accepted Project metadata is missing, repair it before evaluating the Ready transition. Resolve missing fields
   from unique authoritative evidence; for Priority, use the governance fallback when no unique source value exists.
   If the dependency is cleared but another Ready requirement is incomplete, leave the dependent `Blocked` and report
   every exact missing or invalid requirement. Never invent source decisions, scope, or workset data merely to unlock
   it.
5. Recalculate each affected parent Epic only after dependent transitions settle, using the final child states below.
6. Reread the triggering issue, direct dependents, relevant successors, and affected parent Epics. Require two
   consecutive matching decision-bearing snapshots after mutations; on drift, recompute from fresh native state.

Reconciliation follows native dependency relationships, not prose dependency lists. It may reveal the next executable
task, but it never claims that task itself. A Ready-drain controller may start a fresh acquisition only after the full
reconciliation reaches stable postconditions.

## Epic Rollup

Epics have no workset or assignee and cannot be claimed. Use native parent/sub-issue relationships. Recalculate after
every child transition:

1. `Done` when every child is `Done`;
2. `In Progress` when any child is `In Progress` or `In Review`;
3. `Ready` when no child is active and at least one is `Ready`;
4. `Blocked` when no child is active/Ready and at least one is `Blocked`;
5. `Triage` when no prior rule matches and at least one is `Triage`;
6. `Backlog` when no prior rule matches and at least one is `Backlog`;
7. `Rejected / Replaced` when every child is rejected.

An explicitly rejected Epic remains rejected. Ambiguous mixes, including only `Done` plus rejected children, require a
human outcome decision.

Use native parent/sub-issue relationships. A prose checklist is not structural evidence, and incoherent terminal
children must be repaired before rollup.
