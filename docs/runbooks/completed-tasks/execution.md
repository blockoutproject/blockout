# Completed Tasks Execution

Use this runbook only for a claimed reconciliation issue produced by the completed-tasks audit.

## Preconditions

- Re-read two stable snapshots of the issue, Roadmap item, pull request, merge commit, and dependent graph.
- Confirm the mismatch still exists and is not normal GitHub eventual consistency.
- Load the Roadmap lifecycle or governance reference only for the transition being corrected.
- Do not change application code unless the claimed Workset explicitly includes a missing delivery artifact.

## Procedure

1. Identify the smallest authoritative correction:
   - synchronize closed/open issue state;
   - set the correct Roadmap status;
   - release a stale assignee;
   - restore a missing issue/PR relationship;
   - reconcile a dependent or parent Epic;
   - document a genuine delivery gap for separate implementation.
2. Apply at most the transitions authorized by the issue.
3. Never rewrite merge history, force-push, recreate a merged branch, fabricate a check result, or mark incomplete work
   complete.
4. Read two post-mutation snapshots and confirm the native state converges.
5. Close the reconciliation issue only when the durable source of truth is consistent.

## Result

Report every before/after native state, mutation performed, stable verification, and any remaining gap that requires a
new task.
