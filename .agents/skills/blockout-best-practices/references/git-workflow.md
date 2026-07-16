# Blockout Git Workflow

> Migration status: dormant until Phase MRG-1000 in `docs/current/blockout-active-roadmap.md`. The local roadmap remains authoritative and these GitHub rules must not be activated early.

Read this reference before creating or changing a Blockout issue, branch, commit, push, PR, label, title, or publication
artifact.

This file covers Git/GitHub mechanics (branch names, commit format, PR body). For Roadmap work, read
`github-roadmap-operations.md`; load lifecycle or governance only when the current operation needs it.

The workflow is idempotent: after interruption or resume, inspect Git/GitHub state and continue at the first incomplete
step. Do not create duplicates when an equivalent artifact exists.

## Priorities

1. Respect the user's explicit instruction.
2. Preserve user work: do not discard, overwrite, stage, commit, or publish out-of-scope changes.
3. Reuse existing artifacts that match the task.
4. Publish completed work by default when the user has not limited publication.
5. Apply the Blockout defaults below for the rest.

If two priorities conflict and inspection cannot decide safely, ask one concise question.

## User Overrides

- `local only`, `no GitHub`, `do not push/open a PR`: no remote artifact.
- `do not create a branch`: stay on the current branch.
- `do not commit`: do not stage or commit; no push/PR that depends on this code.
- `do not push`: local commit allowed, no remote update.
- `do not open a PR`: stop after the requested local or pushed state.
- `draft PR`: PR is not ready for review.

For local-only work without mention of a commit, avoid committing.

## Defaults

- Integration branch: `develop`.
- Task branches start from an up-to-date `develop`.
- PRs target `develop`.
- Codex PRs are draft unless explicitly requested otherwise.
- A request to execute or apply GitFlow authorizes publication through a draft PR, not merge. Merge requires explicit
  authorization from the current user after the release evidence is available.
- One issue, one coherent branch, one PR.
- Titles, branches, commits, and PR bodies are in English.
- In a managed local checkout, use one authenticated `gh` transport for Roadmap issue, Project, and PR operations.
  Use the connector only as a fallback and prove identities match before mixing evidence.
- Set the native issue type for every roadmap issue; never replace it with a title or label convention.
- A read-only audit, inspection, or validation request creates no issue, branch, commit, push, or PR unless the user
  later authorizes repository or GitHub mutation.

## Idempotent Start

Run `gh`, Git network operations, and every `.git` write outside the managed sandbox on the first attempt. Keep Git
reads, repository edits, and local validation inside the sandbox.

Before any Git/GitHub mutation:

1. `git status --short --branch`.
2. Identify branch, upstream, and uncommitted files.
3. Inspect relevant diffs.
4. Fetch when freshness, lookup, push, or PR depends on it.
5. Look for an equivalent issue, branch, remote branch, or PR.

Do not assume `develop` is current without checking. Do not merge `origin/develop` into `develop` during setup. If
`develop` cannot fast-forward, stop and report the divergence.

When an existing task branch must incorporate newer `develop` commits, follow **Branch Refresh** below. Do not merge
`develop` into the task branch.

## Work Types

| Work                                                     | Type           | Branch                | Indicator   |
| -------------------------------------------------------- | -------------- | --------------------- | ----------- |
| V1 audit correction without runtime regression           | Tech           | `tech/`               | `[V1-XXX]`  |
| V1 roadmap task                                          | Feature        | `feature/`            | `[V1-XXX]`  |
| Product feature outside V1                               | Feature        | `feature/`            | `[Feature]` |
| Bug or regression                                        | Bug            | `bugfix/`             | `[Bug]`     |
| Documentation only                                       | Tech           | `tech/`               | `[Docs]`    |
| Tech debt, tooling, workflow, contracts, CI, maintenance | Tech           | `tech/`               | `[Tech]`    |
| Research or decision without code deliverable            | Action         | `tech/`               | `[Action]`  |
| Large grouped objective                                  | Epic           | `feature/` or `tech/` | `[Epic]`    |
| Urgent environment/production fix                        | Bug or closest | `hotfix/`             | `[Hotfix]`  |

## Labels

- Roadmap issues: every `area:*` label required by the workset, plus only useful transversal labels.
- PRs: 2 to 4 useful labels.
- Labels are lowercase.
- Do not duplicate issue type with `feature`, `bug`, `tech`, or `epic` on issues unless a GitHub view requires it. On a
  roadmap-tracked issue, set native GitHub Issue Type (see `github-roadmap-lifecycle.md`) instead of an
  `epic`/`feature`/`bug`/`tech` label — the `epic` label was removed repo-wide on 2026-07-13 for exactly this reason.
- On PRs, add a type label when useful: `feature`, `bug`, `tech`, `research`, `epic`, `hotfix`, `docs`.
- Surfaces: `contracts`, `backend`, `frontend`, `workflow`, `ci`, `product`, `ui`.
- Domains: `v1`, `manager`, `account`.
- State/help labels only when current: `needs-info`, `duplicate`, `invalid`, `wontfix`, `help wanted`,
  `good first issue`. Do not re-add `blocked`; the Project `Status` field owns that state.

## Names

Issue and PR:

```text
[<indicator>] - <brief action phrase>
```

Branch:

```text
feature/<issue-number>-<short-kebab-slug>
bugfix/<issue-number>-<short-kebab-slug>
tech/<issue-number>-<short-kebab-slug>
hotfix/<issue-number>-<short-kebab-slug>
```

Commit:

- V1 task: `[V1-XXX] <brief action phrase>`.
- V1 audit correction: `[V1-XXX] Fix audited <brief issue>`.
- Other: `<kind>: <brief action phrase>`.

Kinds: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`.

## Standard Flow

1. Snapshot Git.
2. Identify or create the issue, require native type, Track, Priority, and Execution Mode before it leaves `Triage`,
   and validate its Ready contract, or acquire the next compatible task through the task acquisition runbook.
3. Claim the selected issue through Roadmap operations, or resume the coherent acquisition claim, and complete its
   stable post-claim evidence gate.
4. Only after a successful claim, create or reuse the branch from up-to-date `develop`.
5. Implement only the frozen workset. Follow Roadmap operations before any scope expansion.
6. Run required generation and validation.
7. Inspect status and diff.
8. Stage only intended files.
9. Create a focused commit.
10. Push with tracking.
11. Create or update a draft PR to `develop` and batch its safe labels/metadata.
12. Verify the structural issue link with a targeted issue/PR read.
13. Transition the issue to `In Review`, then reread only the target issue, PR, assignee, workset, and changed Project
    field while retaining the reservation.

## Review And Release

Before any merge:

1. Reread the current PR, target branch, latest diff, linked issue, claim, acceptance criteria, reviews, and checks.
2. Require explicit merge authorization from the current user; earlier execution or GitFlow approval is insufficient.
3. Confirm the PR is no longer draft and its latest diff remains inside the claimed workset.
4. Require all applicable validations and required checks to pass. When the Merge Runbook proves from the single
   zero-step annotation that a job never started because GitHub account payments failed or the spending limit must be
   increased, record that head-bound classification on the PR and continue without another waiver. Every other missing
   or failing required check needs an explicit human waiver recorded on the PR before merge.
5. Merge to `develop` only after the repository rules and roadmap release guard pass. Use the repository's supported
   merge-commit path and delete the merged PR's remote head branch
   (`gh pr merge --merge --delete-branch --match-head-commit <full-head-sha>`); do not guess squash or rebase.
6. Reread the merged PR, verify that its remote head ref is absent, then reread the issue and Project item before
   completing the task or continuing documented post-merge work.
7. After the issue reaches its final merged or terminal state, run lifecycle's Dependency Unlock Reconciliation against
   fresh native relationships. First repair missing accepted Project metadata, using the governance `Normal` fallback
   for a missing Priority when no unique source value exists. Validate each newly unblocked dependent's complete Ready
   contract and move every eligible unassigned item to `Ready`; otherwise keep it `Blocked` and report the exact
   non-repairable deficiency.
8. Recalculate affected parent Epics, then require stable postconditions for the merged task, direct dependents,
   relevant successors, and parents before reporting release completion or starting another acquisition.

## Branch Refresh

Refresh a task branch with rebase so its task commits remain based directly on current `develop`:

1. require a clean task worktree and verify that no other worker is actively writing the same branch;
2. fetch `origin/develop` and the task branch, then record the expected remote task-branch head;
3. run `git rebase origin/develop` on the task branch; never merge `develop` into it;
4. resolve only in-scope conflicts, or abort the rebase and stop when a safe resolution is not deterministic;
5. rerun every validation affected by the resulting tree;
6. push normally when the branch was never published, otherwise use `git push --force-with-lease` against the verified
   remote head;
7. reread the PR head, diff, checks, claim, and workset before release.

Never use plain `--force`, rebase `develop` itself, or rewrite a branch while another worker owns it. A refreshed head
invalidates check classification and release evidence tied to the previous SHA. Obtain fresh merge authorization when
the effective diff or release risk changes.

Before merge, represent every required post-merge validation, migration, or reconciliation as an unchecked acceptance
criterion on the issue. Keep the issue assigned and `In Review` until that criterion is completed. A PR-body note does
not replace the criterion.

Before choosing the PR body link, inspect the remaining criteria. Use `Refs #<issue>` whenever required post-merge
work remains and reject a closing keyword in that state. Use `Closes #<issue>` only when merge can complete the issue.

For checks, follow the lifecycle's bounded classifier: one summary read; for a zero-step or never-started job, exactly
one annotation read and no failed-log request, rerun, or terminal polling; otherwise inspect only the failed job or
step logs. Reclassify only when the check-run ID or head SHA changes.

The lack of a GitHub branch-protection or ruleset requirement does not waive these repository rules. Codex must never
enable auto-merge or merge merely because a PR is mergeable.

## Scope Safety

- Uncommitted changes are user-owned until the diff proves otherwise.
- Do not stage for convenience.
- Do not mix cleanup, refactor, formatting churn, generated churn, or out-of-scope follow-up.
- No destructive Git, plain force-push, branch deletion, or discard without explicit request. An explicit Merge
  Runbook invocation authorizes deletion only of the selected PR's remote head branch after its confirmed merge. The
  controlled task-branch rebase and `--force-with-lease` path in **Branch Refresh** is the only routine history rewrite.
- If intended and out-of-scope changes touch the same file and cannot be separated, stop and ask.
- The issue workset is the maximum authorized write scope. Follow Roadmap operations before expanding it.
- For a contract-first slice, keep source contract, required generated files, and minimal compile fixes in the same PR.
- Do not start a front/back consumer that depends on unmerged contracts unless the branch explicitly owns the vertical
  slice.

## PR Body

Include:

- linked issue, with a closing keyword only when merge completes the entire issue;
- `Refs #<issue>` instead when documented validation or migration must occur after merge, then verify the resulting
  issue cross-reference after opening the PR;
- concise summary;
- generations and checks run;
- checks skipped with reason;
- known follow-up only when intentionally out of scope.

Roadmap lifecycle owns `In Review`, `Blocked`, release, rejection, and terminal completion guards. A merged PR does
not by itself complete a roadmap issue or unlock its dependents.

## Post-Merge Local Sync

After an authorized merge, fetch `origin/develop`, then fast-forward the local `develop` branch with
`git merge --ff-only origin/develop` and verify status plus the resulting commit. If another worktree owns `develop`,
update the remote-tracking ref in the current worktree and report the owning checkout that still needs synchronization;
do not force a switch, detach that checkout, or rewrite either branch. The explicitly invoked
[`Merge Runbook`](../../../../docs/runbooks/tasks/merge.md) is the exception: it never updates local or remaining PR
branches and leaves every listed branch refresh to the user.

## Final Report

Report useful facts: issue, claim owner, workset, Project status, branch, commit, PR, generations/checks run, skipped
steps and reason.
