# Git And Issue Workflow

## Recommending The Next Issue

When a human asks which issue should be taken next, inspect repository issues and recommend one. This read-only triage does not claim or start work.

An issue is eligible when it is open, unassigned, has no open native blocker, has no obvious open pull request delivering the same scope, and contains or resolves to the authority required for its kind of work.

- A Figma issue resolves to the sources and evidence required by `figma.md`.
- An implementation issue contains a task identifier that resolves uniquely through `tasks.md` to the approved plan and specification.
- A repository or maintenance issue states its objective, scope, acceptance criteria, and authoritative sources directly.

Do not create a separate functional issue solely to authorize Spec Kit artifacts. The applicable
official `speckit-*` skills govern those artifacts and their implementation issues.

When several issues are eligible:

1. Compare them with assigned issues, open pull requests, and other visible work in progress, including issue-linked local branches or worktrees when relevant.
2. Prefer the issue whose domain and likely changed boundaries minimize conflict with active work.
3. Then prefer prerequisite work that unlocks more downstream issues or preserves a coherent product sequence.
4. Consider scope clarity, delivery risk, and the size of the independently verifiable outcome.
5. Recommend one issue with a concise rationale. If the trade-off is genuinely close, mention the strongest alternative without refusing to choose.

Do not self-assign or begin work on the recommended issue until the human confirms its issue number. GitHub assignment is the only claim; local branches and worktrees may inform overlap analysis but never claim an issue. Maintain no file lock or parallel task state.

## Executing A Confirmed Issue

1. Read the confirmed issue, its native blockers, and resolved sources again because state may have changed since recommendation. For an implementation issue, resolve its task ID to `tasks.md`, then load the corresponding `plan.md`, `spec.md`, and constitution.
2. Refuse if an open blocker remains or the issue is assigned to someone else. Check open pull requests for obvious overlap.
3. Self-assign.
4. Synchronize `develop`, then branch as `feature/<issue>-<slug>`, `bugfix/<issue>-<slug>`, or `tech/<issue>-<slug>`.
5. Implement the complete confirmed scope, run proportionate validation, and self-review the result.
6. Organize commits intentionally so each commit is coherent and the series tells the delivery story without unrelated changes.
7. Push the topic branch and open a draft pull request targeting `develop`. Use `Closes #N` when merging the pull request will completely deliver the issue. Use `Refs #N` only when the pull request is intentionally partial or the issue must remain open, and explain why in the pull request body.
8. Report the draft pull request and stop. Readiness, further review changes, and merge remain human-directed dialogue.

## Integrating Topic Pull Requests

An explicit human request to merge authorizes taking the pull request out of draft when necessary, unless the human separates those approvals.

Before merging:

1. Re-read the pull request, linked issue, latest review state, unresolved conversations, mergeability, and checks for the current head commit.
2. Confirm that the pull request targets `develop`, fully delivers the linked issue when it uses `Closes #N`, and has no unresolved actionable review feedback.
3. Confirm that required checks are green. If checks are running, failing, stale, or cannot be verified, do not merge; report the exact state instead.
4. Confirm that the intended topic branch and local checkout are known and that cleanup will not overwrite unrelated or uncommitted work.

If the topic branch is behind `origin/develop`, rebase the topic branch onto the current
`origin/develop`, push the rewritten topic branch with `--force-with-lease`, and restart
verification on its new head. Never rebase or force-push `develop` or `main`.

Merge the topic pull request into `develop` with a merge commit. Do not use GitHub rebase
merge or squash merge: the merge commit preserves the pull request boundary, while the
topic commits preserve the delivery history. After GitHub reports a successful merge:

1. Verify that the linked issue is closed when delivery is complete; close it if necessary, then unassign it.
2. Switch the working checkout to `develop`, fetch `origin`, and fast-forward local `develop` to `origin/develop`. Never discard unrelated local changes to force synchronization.
3. Resolve and verify the exact merged topic branch, confirm GitHub deleted it remotely or
   delete it if needed, then delete it from local storage. Never broaden cleanup to other
   branches, and stop if deletion is unsafe or the branch is checked out elsewhere.
4. Report the integrated commit range, issue state, branch cleanup, synchronized checkout state, and any remaining limitation.

Closing a blocker can make several issues eligible. Do not claim another issue automatically; when asked what comes next, recompute eligibility from current issue, assignment, dependency, and pull request state.

## Direct Changes To Develop

Direct pushes to `develop` are reserved for explicit human direction on small, non-functional repository maintenance such as documentation wording or repository metadata. Synchronize with `origin/develop` using fast-forward-only operations, make one focused commit, run proportionate validation, and report the pushed commit.

Use a confirmed issue, topic branch, and pull request for changes to product behavior, contracts, dependencies, migrations, authentication, CI, or architecture. Never use a direct push to bypass review, unresolved feedback, failing checks, or an active overlapping pull request.

## Promoting Develop To Main

Create a release pull request from `develop` to `main`. Verify its release scope, review state, mergeability, and required checks for the current head commit. Merge it with a merge commit only after an explicit human request, then verify that `main` contains the expected release and synchronize local branches with fast-forward-only operations.

## Figma-Only Delivery

For a Figma-only issue, do not create a documentation pull request. Record the required evidence, obtain explicit human approval, then close and unassign the issue. Recompute later recommendations from the resulting dependency state in the same way as after a merged code delivery.

When abandoning any claimed work, unassign the issue and report what remains.
