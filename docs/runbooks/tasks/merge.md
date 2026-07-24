# Merge Runbook

Use this only after GIT-009 when the current user explicitly asks to run the Blockout Merge task. One execution releases
at most one PR and never updates another PR branch.

## Outcome

Select the first eligible PR by deterministic order, merge it to `develop`, delete its unchanged remote task branch,
reconcile Roadmap state, and stop. When none is eligible, make no mutation and report the exact reason.

## Required Reads

Read Roadmap operations, lifecycle, and Git workflow. Use fresh complete Project and GitHub evidence, never memory,
local branch lists, prior runs, or partial PR lists.

## Acceptance Evidence Normalization

Before eligibility:

1. Reread unchanged head, diff, validations, checks, linked issue, and criteria.
2. Verify each unchecked criterion against authoritative evidence from that head.
3. Check only objectively satisfied pre-merge criteria and reread the issue.
4. Leave ambiguous, subjective, missing, or post-merge criteria unchecked and exclude with exact reason.

An unchecked box is not itself proof that work is incomplete; the merge task owns this bounded normalization and may
not invent evidence.

## Eligibility

A PR is eligible only when:

- it is open, non-draft, and targets `develop`;
- its same-repository head is a deletable task branch, never `develop`, `main`, or another protected branch;
- its branch contains current remote `develop`;
- it is structurally linked to one coherent `In Review` issue with one assignee and valid conflict-free Workset;
- its current diff remains inside that Workset and all pre-merge criteria are checked;
- every applicable validation and required check passes, has a recorded head-bound human waiver, or matches the exact
  zero-step GitHub billing exception; and
- GitHub reports no merge conflict or release blocker.

Never auto-merge, infer a waiver, refresh a candidate branch, or weaken guards because no alternative is eligible.

## Selection

Build the complete eligible set:

1. Exclude issues with open native blockers.
2. Sort by Priority (`High`, `Normal`, `Low`).
3. Use live Track order.
4. Use issue number, then PR number.

The explicit Merge task request authorizes one automatically selected eligible PR, not any other merge.

## Merge And Reconciliation

1. Reread selected PR, head, base, diff, checks, issue, criteria, claim, Workset, and native relationships.
2. For the billing exception, comment with unchanged head SHA, check-run ID, and the single zero-step annotation.
3. Merge the unchanged head with merge commit, delete branch, and match the recorded head SHA.
4. Reread merged PR and remote `develop`; verify the remote head ref is absent. Never delete a moved ref.
5. Complete the issue only after all guards pass: Done, unassigned, closed completed, reread.
6. Reconcile dependents, validate newly unblocked issues before Ready, recalculate Epics, and obtain stable snapshots.
7. Reread remaining open PRs to `develop` and list branches that no longer contain current `develop`; do not modify them.
8. Stop after one release.

## Final Report

Briefly identify the merged PR, linked issue and Roadmap result, or the real blocker when no merge occurred.

The final content must be the branch reminder in the user's chat language. In French, write exactly:

```text
Pensez à mettre à jour les branches suivantes :
- <remaining branch>
```

When none needs refresh:

```text
Pensez à mettre à jour les branches suivantes : aucune.
```
