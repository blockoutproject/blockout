# Repository Git Workflow

Read this reference before creating or changing an issue, branch, commit, push, pull request, label, title, or
publication artifact.

Git and GitHub mechanics live here. Roadmap selection, claims, and draft publication use
`github-roadmap-operations.md`; lifecycle and governance references are loaded only when the current transition needs
them.

The workflow is idempotent. After interruption, inspect Git and GitHub and continue from the first incomplete
postcondition. Never create a duplicate issue, branch, commit, or pull request when an equivalent artifact exists.
Current-user publication limits override the repository defaults below.

## Defaults

- The repository Git profile owns the integration branch, task branch prefixes, pull-request base, merge method,
  hosting-plan capabilities, and supported settings.
- Task branches start from the current configured integration branch.
- Task pull requests target the configured integration branch.
- Codex pull requests are draft unless the user explicitly requests otherwise.
- A request to execute GitFlow authorizes publication through a draft PR, never merge. Merge requires separate,
  current-user authorization after live release evidence exists.
- One issue owns one coherent branch and one pull request.
- Issues, branches, commits, PR titles, and PR bodies are written in English.
- Use one authenticated `gh` identity for issue, Project, and PR operations in a managed checkout. Use a connector only
  for a real capability gap and prove both identities match before mixing evidence.
- Set a native issue type on every Roadmap issue; never replace it with a label or title convention.
- Read-only inspection creates no issue, branch, commit, push, or PR.

## Repository Capability Profile

The repository Git profile must record repository visibility, hosting plan, roles, integration branch, merge methods,
branch and ruleset enforcement, review and check enforcement, auto-merge availability, and branch-deletion behavior.
Revalidate the [current GitHub plan capabilities](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)
before proposing a setting change.

Roadmap claims and Worksets own task assignment and write conflicts regardless of platform enforcement. GitHub roles,
local branches, and draft pull requests do not reserve scope. When the configured hosting plan cannot enforce a
repository guard, use the compensating controls defined by the repository Git profile and never describe evidence as
platform enforcement.

On an accidental direct push, merge, force push, branch deletion, or ambiguous setting change, stop further
publication, snapshot the remote state, and recover through a reviewed issue and pull request. Never rewrite the
integration branch; revert harmful integrated changes with a new commit using the configured integration method.

Repository settings remain manual external state. Before any mutation, capture the current values, name one intended
change and its rollback, obtain separate current-user approval, apply only that change, and reread the postcondition.
On failure or ambiguity, restore the captured value when uniquely safe; otherwise stop for owner-led recovery.

### Review Evidence Profile

Require approval on the current head from an independent contributor when one is available. New commits invalidate
that approval. When no independent contributor is available, the current user may authorize the exact head as a
documented solo fallback only after the author self-reviews the complete diff and every applicable validation passes.
The fallback must state that independent review was unavailable and never waives a failed check, unresolved review
request, stale head, Workset violation, or another release guard.

## Idempotent Start

Before a Git or GitHub mutation:

1. Run `git status --short --branch`.
2. Identify branch, upstream, uncommitted files, and relevant diffs.
3. Fetch when freshness, lookup, publication, or release depends on the remote.
4. Search for an equivalent issue, local branch, remote branch, commit, or PR.
5. Verify that the local integration branch can fast-forward to its remote-tracking branch when synchronization is
   required.

Do not merge the remote-tracking integration branch into its local branch during setup. Stop on divergence. Refresh a
task branch only through the rebase procedure below.

## Work Types

The repository taxonomy profile maps each native issue type to its Track identifier and the repository Git profile
maps it to branch prefix, title indicator, and commit convention. Epics are never executable branches. Retain an
existing task identifier in issue, pull-request, and task-commit titles.

## Labels

- Roadmap issues receive every `area:*` label required by `Workset.Areas` plus only useful transversal labels.
- Pull requests receive two to four useful labels.
- Labels are lowercase.
- Native type owns issue classification. Do not add `feature`, `bug`, `tech`, or `epic` to a Roadmap issue merely to
  duplicate its native type.
- Pull requests may use one type label plus relevant surface labels.
- Do not create a `blocked` label. The Project `Status` field owns that state.
- The complete label and area catalog, including exact colors and descriptions, is defined in
  [`github-taxonomy.md`](github-taxonomy.md).

## Names

Use the issue, pull-request, branch, task-commit, and non-task commit formats selected by the repository Git profile.
Titles and branch slugs remain concise and in the repository's configured file language.

## Task Workflow Profile

Use Roadmap operations for claims and scope, lifecycle for transition guards, and the execution runbook for sequencing.
Task branches start from the configured integration branch, draft pull requests target that branch, and publication
uses the naming, label, validation, and link-mode rules in this reference.

## Review And Release

Before merge:

1. Reread the current PR, base, head, latest diff, linked issue, claim, workset, acceptance criteria, reviews, and
   checks.
2. Require separate current-user merge authorization. A Merge task invocation authorizes the candidate set selected at
   startup by the repository Git profile; earlier execution, GitFlow approval, or a later ready-for-review transition
   is insufficient.
3. Require a non-draft PR whose diff remains inside the workset.
4. Require every applicable validation and required check to pass. Apply only an automatic check classification
   explicitly defined by the repository Git profile; every other missing or failing check requires an explicit
   head-bound human waiver.
5. Execute the complete profile in [`local-runtime-policy.md`](local-runtime-policy.md) on the exact head.
6. Merge each unchanged head separately with the exact head-bound method declared by the repository Git profile.
7. Reread the merged PR, remote branch absence, issue, and Project item.
8. Complete the issue only after every completion guard passes, then reconcile direct dependents and parent Epics.
9. Obtain stable post-mutation snapshots, then let the Merge train recompute its remaining authorized snapshot against
   the new integration head.

Absence of branch protection, rulesets, or required checks never waives these repository rules. Never enable
auto-merge by inference.

## Branch Refresh

Refresh a task branch with rebase:

1. Require a clean task worktree and prove no other worker is writing the branch.
2. Fetch the remote integration branch and remote task branch and record the expected remote task head.
3. Rebase the task branch onto the remote integration branch; never merge the integration branch into it.
4. Resolve only deterministic in-scope conflicts during ordinary task work. Otherwise abort and stop.
5. Rerun every validation affected by the resulting tree.
6. Push normally when unpublished; otherwise use `--force-with-lease` against the verified remote head.
7. Reread PR head, diff, checks, claim, and workset.

Never use plain `--force`, rebase the integration branch, or rewrite a branch while another worker owns it. A
refreshed head invalidates prior checks and release evidence.

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

After an authorized merge, fetch the configured integration branch, fast-forward its local branch with the command
declared by the repository Git profile, and verify status and the resulting commit. If another worktree owns the local
integration branch, update only the remote-tracking ref and report the checkout that still needs synchronization.

The explicit Merge Train Runbook is the exception: it refreshes only authorized remote PR heads through isolated
temporary worktrees, never mutates existing local task branches, and ends with a reminder listing local branches that
need refresh.

## Final Report

Report issue, claim owner, workset, Project status, branch, commit, push, PR, validations, skipped checks, release
decision, and any dependency or Epic transition.

The Merge train response must end with a branch reminder written in the user's chat language. List every remaining
local branch that needs refresh. When none remain, state explicitly in that language that no branch needs an update.
