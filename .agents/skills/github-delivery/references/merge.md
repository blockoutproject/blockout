# Human-directed integration

1. Re-read the PR, linked issue, base branch, current head, review state, unresolved conversations, mergeability and required checks. Confirm complete delivery before using `Closes`.
2. Actionable unresolved feedback or failing/running/stale/unverifiable required checks block the merge. Report the actual state rather than weakening a gate.
3. Know the intended checkout and topic branch. Preserve unrelated work and active worktrees.
4. If an authorized owned topic is behind its base and the accepted workflow requires it, rebase onto the current remote base, push with `--force-with-lease`, then re-run affected verification on the new head. Never force-push shared integration branches or another person's work.
5. Merge with a merge commit only after the explicit request and successful verification. Do not silently substitute squash/rebase merge if repository settings prevent it.
6. Confirm GitHub reports the merge. Verify/close the fully delivered linked issue if necessary, then unassign it. Fast-forward the local integration checkout safely to remote.
7. Resolve the exact merged branch, confirm remote deletion or delete it when safe, and remove that local branch only when not checked out elsewhere. Never broaden cleanup or discard changes.
8. Report merged commit, issue state, cleanup, synchronized checkout and limitations. Do not claim the next issue.

For applications with `develop`/`main`, promotion is a separate release PR from develop to main with its own explicit merge request and checks. For a skills repository delivering directly to main, a tag/release is optional, not part of the copying procedure.
