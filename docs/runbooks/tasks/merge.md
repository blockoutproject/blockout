# Merge Runbook

> Migration status: dormant until Phase MRG-1000 in `docs/current/blockout-active-roadmap.md`. Use the local roadmap during migration.

Use this only when the current user explicitly asks to run the Blockout Merge task. One execution releases at most one
pull request. It never updates another pull-request branch.

## Outcome

Select the first eligible pull request by the deterministic order below, merge it to `develop`, delete its remote head
branch, reconcile its Roadmap state, and stop. When no pull request is eligible, make no mutation and report why
briefly.

## Required Reads

Read Roadmap operations, Roadmap lifecycle, and Git workflow before selection. Use fresh GitHub and complete Project
evidence; do not select from memory, local branches, a previous run, or a partial pull-request list.

## Eligibility

A pull request is eligible only when all of these conditions hold on its current head:

- it is open, non-draft, and targets `develop`;
- its head is a deletable same-repository task branch, never `develop` or another protected/integration branch;
- its branch already contains the current remote `develop` head; this runbook never refreshes it;
- it is structurally linked to one coherent `In Review` issue with exactly one assignee and a valid, conflict-free
  workset;
- its current diff remains inside that workset and every criterion required before merge is checked;
- every applicable validation and required check passes, a specific current-user waiver is already recorded on the
  unchanged head, or the single zero-step annotation proves the job never started because GitHub account payments
  failed or the spending limit must be increased; and
- GitHub reports no merge conflict or other release blocker.

Exclude ambiguous candidates. Never enable auto-merge, infer a check waiver outside the documented GitHub billing
exception, refresh a branch, or weaken the release guards because no other candidate is eligible.

## Selection

Build the complete eligible set, then select exactly one pull request:

1. exclude an issue while any native blocker remains open;
2. order by Roadmap Priority (`High`, `Normal`, `Low`);
3. use the live Project Track option order;
4. use the linked issue number, then the pull-request number.

The user's explicit request to run this Merge task authorizes one automatically selected eligible pull request. A
generic execution or GitFlow request does not. Stop and request a new decision if fresh evidence reveals a failing
check that is neither covered by a recorded waiver nor the documented GitHub billing exception, an unexpected diff,
or another release risk.

## Merge And Reconciliation

1. Reread the selected pull request, head, base, diff, checks, linked issue, criteria, claim, workset, and native
   relationships immediately before merge.
2. For the GitHub billing exception, add one PR comment naming the unchanged head SHA, check-run ID, and zero-step
   billing annotation. This recorded classification is the bypass; do not request another waiver or rerun the job.
3. Merge the unchanged head and request deletion of its remote branch with
   `gh pr merge --merge --delete-branch --match-head-commit <full-head-sha>`.
4. Reread the merged pull request and `develop` remotely, then verify that the merged PR's remote head ref is absent.
   If deletion failed, report the exact cleanup blocker; never delete a ref whose head has changed. Do not switch,
   fast-forward, rebase, merge, push, or otherwise mutate any local or remaining pull-request branch.
5. Complete the linked issue only when every completion guard passes: mark newly satisfied criteria as checked, set
   `Done`, remove all assignees, close completed, and reread.
6. Run dependency-unlock reconciliation, validate any newly unblocked issue before moving it to `Ready`, recalculate
   affected Epics, and require the lifecycle's stable postconditions.
7. Reread every remaining open pull request targeting `develop`. List each head branch that does not contain the new
   `develop` head; do not modify it.
8. Stop after this one release. A later merge requires a new explicit execution of this runbook.

## Final Report

Keep the response brief: identify the merged pull request, summarize the linked issue and Roadmap result, and mention
only a real blocker when no merge occurred.

The last content in the response must always be the branch reminder in the user's chat language. For French, use
exactly this shape and write nothing after it:

```text
Pensez à mettre à jour les branches suivantes :
- <remaining branch>
```

When no branch needs an update, end with:

```text
Pensez à mettre à jour les branches suivantes : aucune.
```
