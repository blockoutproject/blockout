# Agent Delivery Governance

Last updated: 2026-07-29.

## Repository Control Model

Blockout uses the repository-level `develop-release-controls` ruleset while
`blockoutproject/blockout` is public. Public visibility is an explicit part of the approved control model because
GitHub Free exposes repository rulesets and protected branches for public organization repositories.

If the repository becomes private without a GitHub plan that supports equivalent controls, release fails closed. The
ruleset must not be removed, weakened, or replaced by a workflow-only check: a workflow that runs after a push cannot
prevent that push.

Public-fork security belongs to issue #66. Portable policy extraction and distribution belongs to issue #91. This
document records only Blockout's concrete repository settings.

## Enforced Control Matrix

| Boundary            | Required state         | Enforcement                                   |
| ------------------- | ---------------------- | --------------------------------------------- |
| Integration branch  | `develop`              | Repository default branch and ruleset target  |
| Direct updates      | Pull request required  | Active ruleset with no bypass actors          |
| Force pushes        | Rejected               | `non_fast_forward` rule                       |
| Branch deletion     | Rejected               | `deletion` rule                               |
| Head freshness      | Current with `develop` | Strict required-status-check policy           |
| Reviews             | Zero GitHub approvals  | Avoids a single-maintainer deadlock until #75 |
| Conversations       | Every thread resolved  | Pull-request rule                             |
| Merge methods       | Merge commits only     | Squash and rebase merge disabled              |
| Automatic merge     | Disabled               | Remains gated by #78                          |
| Task-branch cleanup | Automatic after merge  | Repository `delete_branch_on_merge` setting   |

The following GitHub Actions checks are required from the current pull-request head:

- `Check repository formatting`
- `backend`
- `contracts`
- `frontend`
- `merge-control`
- `python`

Each check is bound to the GitHub Actions integration. A new commit invalidates the previous head's evidence. A base
change leaves the pull request blocked until the branch is refreshed and every required check succeeds again.

## Pull-Request Verification

The `merge-control` job keeps the Blockout-specific assertions directly in its workflow. It reads the live repository
through the GitHub API and fails when:

- repository visibility or merge settings drift;
- the named ruleset is missing, duplicated, disabled, or retargeted;
- a bypass actor is introduced;
- a required rule or status check is missing; or
- review, conversation-resolution, or freshness parameters change.

The workflow intentionally runs on pull requests to `develop` and through manual dispatch. Continuous or scheduled
governance monitoring remains owned by issue #71. Reusable configuration, schemas, and policy tooling remain owned by
issue #91; this repository-specific control does not create a competing policy bundle.

## Recovery

The recovery owner is `@hugoecken`.

1. Capture the live repository settings and the complete named ruleset before changing either.
2. Keep the pull-request requirement, existing five application checks, force-push rejection, and deletion rejection
   active while diagnosing a failure.
3. If the new `merge-control` check is misconfigured and blocks every pull request, remove only that required context,
   repair the workflow on a task branch, and restore the context after it succeeds on the new head.
4. Never enable direct pushes, a bypass actor, squash merge, rebase merge, or automatic merge as a recovery shortcut.
5. Rerun the workflow and controlled negative scenarios before declaring recovery complete.

Every recovery mutation needs current-user authorization and head-bound evidence. Repository administrators are not
an implicit bypass.

## Release Evidence

Issue #70 owns the initial positive and negative evidence for direct-push rejection, stale heads, missing checks,
conversation resolution, merge strategy, and task-branch cleanup. Later changes must preserve that evidence contract.

Automatic task-branch deletion is finally proven only after an explicitly authorized merge. Until that post-merge
check passes, issue #70 remains assigned and in review.
