# Blockout Git Workflow

Read this reference before creating or changing a Blockout issue, branch, commit, push, pull request, label, title, or
publication artifact.

Git and GitHub mechanics live here. Roadmap selection, claims, and draft publication use
`github-roadmap-operations.md`; lifecycle and governance references are loaded only when the current transition needs
them.

The workflow is idempotent. After interruption, inspect Git and GitHub and continue from the first incomplete
postcondition. Never create a duplicate issue, branch, commit, or pull request when an equivalent artifact exists.

## Priorities

1. Follow the user's explicit instruction.
2. Preserve user work and never stage, commit, publish, overwrite, or discard out-of-scope changes.
3. Reuse an existing artifact that matches the task.
4. Publish completed implementation work by default through a draft pull request unless the user limits publication.
5. Apply the defaults below for everything else.

If inspection cannot resolve a conflict between these priorities safely, ask one concise question.

## User Overrides

- `local only`, `no GitHub`, or `do not push/open a PR`: create no remote artifact.
- `do not create a branch`: remain on the current branch.
- `do not commit`: do not stage or commit and do not perform a dependent push or PR.
- `do not push`: a local commit is allowed, but no remote update.
- `do not open a PR`: stop at the requested local or pushed state.
- `draft PR`: the change is not ready for review.

For local-only work without an explicit commit request, do not commit.

## Defaults

- Integration branch: `develop`.
- Task branches start from an up-to-date `develop`.
- Task pull requests target `develop`.
- Codex pull requests are draft unless the user explicitly requests otherwise.
- A request to execute GitFlow authorizes publication through a draft PR, never merge. Merge requires separate,
  current-user authorization after live release evidence exists.
- One issue owns one coherent branch and one pull request.
- Issues, branches, commits, PR titles, and PR bodies are written in English.
- Use one authenticated `gh` identity for issue, Project, and PR operations in a managed checkout. Use a connector only
  for a real capability gap and prove both identities match before mixing evidence.
- Set a native issue type on every Roadmap issue; never replace it with a label or title convention.
- Read-only inspection creates no issue, branch, commit, push, or PR.

## Private GitHub Free Baseline

Portable repository guidance assumes a private organization repository on GitHub Free. Revalidate the
[current GitHub plan capabilities](https://docs.github.com/en/get-started/learning-about-github/githubs-plans) before
proposing a setting change; public-repository enforcement or a temporary paid feature is not portability evidence.

| Posture     | Repository capability or setting                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Decision                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required    | Standard repository roles                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Grant `Write` only to contributors who need to push task branches, `Maintain` only to workflow operators, and `Admin` only to access, setting, and recovery owners. |
| Required    | Default branch and merge methods                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Use `develop` and allow merge commits only. Disable squash, rebase, auto-merge, automatic head deletion, and web-based branch updates.                              |
| Optional    | Web commit signoff and private forking                                                                                                                                                                                                                                                                                                                                                                                                                                           | Enable only for a separately accepted signoff or contributor-access need; neither replaces claim, review, validation, or release gates.                             |
| Unavailable | [Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches) and [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets)                                                                                                                                                                                                        | Do not claim that direct pushes, force pushes, deletion, pull requests, reviews, or checks are enforced by GitHub.                                                  |
| Unavailable | Required reviewers, [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners), [auto-merge](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/automatically-merging-a-pull-request), and [merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue) | Reviews and checks remain useful evidence, but GitHub cannot enforce the repository's acceptance and integration gates.                                             |
| Deferred    | Paid branch protection, rulesets, required reviews or checks, code ownership, and merge queue                                                                                                                                                                                                                                                                                                                                                                                    | Reconsider only after a plan upgrade or a demonstrated workflow need; availability alone does not activate a setting.                                               |

`Write` permission includes direct push and merge authority. Because GitHub Free cannot separate that authority for a
private repository, every contributor follows these compensating controls:

1. Roadmap claims and Worksets own task assignment and write conflicts. GitHub roles, local branches, and draft pull
   requests do not reserve scope.
2. Each contributor uses one claimed issue branch and publishes a draft pull request with exact-head validation
   evidence. Overlapping Worksets stop before either contributor writes.
3. Review follows the independent-review or documented solo fallback in
   [`github-roadmap-lifecycle.md`](github-roadmap-lifecycle.md). A green check, approval, or merge button is evidence,
   never release authorization.
4. Integration uses the explicit Merge train. A stale head is rebased onto current `origin/develop` and fully
   revalidated; nobody pushes or merges directly to `develop`, enables auto-merge, or substitutes a different merge
   method.
5. On an accidental direct push, merge, force push, branch deletion, or ambiguous setting change, stop further
   publication, snapshot the remote state, and recover through a reviewed issue and pull request. Never rewrite
   `develop`; revert harmful integrated changes with a new merge commit.

Repository settings remain manual external state. Before any mutation, capture the current values, name one intended
change and its rollback, obtain separate current-user approval, apply only that change, and reread the postcondition.
On failure or ambiguity, restore the captured value when uniquely safe; otherwise stop for owner-led recovery.

## Idempotent Start

Before a Git or GitHub mutation:

1. Run `git status --short --branch`.
2. Identify branch, upstream, uncommitted files, and relevant diffs.
3. Fetch when freshness, lookup, publication, or release depends on the remote.
4. Search for an equivalent issue, local branch, remote branch, commit, or PR.
5. Verify that `develop` can fast-forward to `origin/develop` when local synchronization is required.

Do not merge `origin/develop` into local `develop` during setup. Stop on divergence. Refresh a task branch only through
the rebase procedure below.

## Work Types

| Work                                                      | Native type  | Branch                | Indicator   |
| --------------------------------------------------------- | ------------ | --------------------- | ----------- |
| Accepted roadmap implementation                           | Feature/Tech | `feature/` or `tech/` | task ID     |
| Product feature outside an existing roadmap identifier    | Feature      | `feature/`            | `[Feature]` |
| Defect or regression                                      | Bug          | `bugfix/`             | `[Bug]`     |
| Documentation only                                        | Tech         | `tech/`               | `[Docs]`    |
| Tooling, workflow, contracts, CI, maintenance, tech debt  | Tech         | `tech/`               | `[Tech]`    |
| Research, configuration, or decision without runtime code | Action       | `tech/`               | `[Action]`  |
| Large grouped objective                                   | Epic         | `feature/` or `tech/` | `[Epic]`    |
| Urgent environment or production correction               | Bug/closest  | `hotfix/`             | `[Hotfix]`  |

Epics are never executable branches. The Blockout task identifier, when one exists, is retained as the issue and PR
indicator, for example `[REF-071]`.

## Labels

- Roadmap issues receive every `area:*` label required by `Workset.Areas` plus only useful transversal labels.
- Pull requests receive two to four useful labels.
- Labels are lowercase.
- Native type owns issue classification. Do not add `feature`, `bug`, `tech`, or `epic` to a Roadmap issue merely to
  duplicate its native type.
- Pull requests may use one type label plus relevant surface labels.
- Do not create a `blocked` label. The Project `Status` field owns that state.
- The complete Blockout label and area catalog, including exact colors and descriptions, is defined in
  [`github-taxonomy.md`](github-taxonomy.md).

## Names

Issue and pull request:

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

- Existing task identifier: `[TASK-ID] <brief action phrase>`.
- Other work: `<kind>: <brief action phrase>`.

Allowed kinds are `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, and `ci`.

## Standard Flow

1. Snapshot Git.
2. Identify or create the issue, set its native type, Track, Priority, and Execution Mode, and validate its Ready
   contract.
3. Claim it through Roadmap operations and obtain stable post-claim evidence.
4. For `PLAN_REQUIRED`, obtain current-user plan approval.
5. Create or reuse the task branch from current `develop`.
6. Implement only the frozen workset; expand scope through Roadmap operations before touching a new lock.
7. Run required generation and validation.
8. Inspect status and diff, stage explicit intended paths, and create one focused commit.
9. Push with tracking and create or update one draft PR targeting `develop`.
10. Apply two to four safe PR labels in a distinct metadata step.
11. Verify the intended labels and the issue's structural closing or cross-reference link.
12. Transition the issue to `In Review`, retain its assignment and workset reservation, and reread the target state.

## Review And Release

Before merge:

1. Reread the current PR, base, head, latest diff, linked issue, claim, workset, acceptance criteria, reviews, and
   checks.
2. Require separate current-user merge authorization. A Merge task invocation authorizes only its startup snapshot of
   structurally valid non-draft PRs; earlier execution, GitFlow approval, or a later ready-for-review transition is
   insufficient.
3. Require a non-draft PR whose diff remains inside the workset.
4. Require every applicable validation and required check to pass. A missing or failing check requires a recorded human
   waiver, except the narrowly documented zero-step GitHub billing classification in the lifecycle and merge runbook.
5. Require the Merge Train Runbook's complete local stack, health, Auth0 authentication, protected application access,
   and sign-out evidence on the exact head. This release smoke is never reduced to the changed workset.
6. Merge to `develop` through the repository-supported merge-commit path and delete only the selected PR's remote task
   branch with `--match-head-commit`.
7. Reread the merged PR, remote branch absence, issue, and Project item.
8. Complete the issue only after every completion guard passes, then reconcile direct dependents and parent Epics.
9. Obtain stable post-mutation snapshots, then let the Merge train recompute its remaining authorized snapshot against
   the new `develop`.

Absence of branch protection, rulesets, or required checks never waives these repository rules. Never enable
auto-merge by inference.

## Branch Refresh

Refresh a task branch with rebase:

1. Require a clean task worktree and prove no other worker is writing the branch.
2. Fetch `origin/develop` and the remote task branch and record the expected remote task head.
3. Rebase the task branch onto `origin/develop`; never merge `develop` into it.
4. Resolve only deterministic in-scope conflicts during ordinary task work. Otherwise abort and stop.
5. Rerun every validation affected by the resulting tree.
6. Push normally when unpublished; otherwise use `--force-with-lease` against the verified remote head.
7. Reread PR head, diff, checks, claim, and workset.

Never use plain `--force`, rebase `develop`, or rewrite a branch while another worker owns it. A refreshed head
invalidates prior checks and release evidence.

The explicitly invoked Merge train may perform this refresh in an isolated detached temporary worktree for each PR in
its startup snapshot. It must bind `--force-with-lease` to the verified old remote SHA, never mutate an existing local
task worktree, and never resolve a rebase conflict. On conflict it aborts, leaves the remote head unchanged, returns the
PR to draft, records evidence, retains `In Review`, and stops. A clean rebase with an equivalent effective diff remains
covered by the train invocation; a changed diff or risk requires a new approval.

## Link Mode

Represent every required post-merge validation, migration, or reconciliation as an unchecked acceptance criterion
before merge. Keep the issue assigned and `In Review` until it passes.

- Use `Refs #<issue>` while required post-merge criteria remain.
- Use `Closes #<issue>` only when merge can complete every remaining criterion.

A PR title, branch name, or commit message is not structural issue-link evidence.

## Scope Safety

- Treat uncommitted changes as user-owned until inspection proves otherwise.
- Stage only explicit intended paths.
- Do not mix formatting churn, generated churn, refactors, cleanup, or follow-up outside the issue workset.
- Never discard user work, use destructive Git, plain force-push, or delete a branch without explicit authority.
- The merge runbook may refresh only remote heads in its startup snapshot and delete only each confirmed merged PR's
  unchanged remote head branch.
- The controlled task-branch refresh above is the only routine history rewrite.
- When intended and unrelated changes overlap inseparably in one file, stop and ask.
- Contract-first work keeps source contracts, required generation, and minimal consumer compilation fixes in one
  coherent workset and PR.

## PR Body

Include:

- the structural issue link with the correct `Refs` or `Closes` mode;
- a concise summary;
- generation and checks run;
- skipped checks with reasons; and
- intentional follow-up only when it is explicitly out of scope.

Draft publication does not authorize merge. A merged PR does not alone complete a Roadmap issue.

## Post-Merge Local Sync

After an authorized merge, fetch `origin/develop`, fast-forward local `develop` with
`git merge --ff-only origin/develop`, and verify status and the resulting commit. If another worktree owns `develop`,
update only the remote-tracking ref and report the checkout that still needs synchronization.

The explicit Merge Train Runbook is the exception: it refreshes only authorized remote PR heads through isolated
temporary worktrees, never mutates existing local task branches, and ends with a reminder listing local branches that
need refresh.

## Final Report

Report issue, claim owner, workset, Project status, branch, commit, push, PR, validations, skipped checks, release
decision, and any dependency or Epic transition.
