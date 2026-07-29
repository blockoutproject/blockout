# Merge Train Runbook

Use this only when the current user explicitly asks to run the repository Merge task. One execution authorizes only
the startup candidate set defined by the repository release profile; it never authorizes a pull request that becomes
eligible later.

## Outcome

Build the authorized snapshot, order it deterministically, and drain it one pull request at a time. Rebase every
candidate onto the exact current remote integration head, obtain fresh head-bound checks and repository-defined
release proof, merge through the configured integration path, delete only the merged remote task branch, and reconcile
Roadmap state before continuing.

The train stops fail-closed at the first conflict, failed validation, failed repository release proof, unexpected diff,
moved head, repeated base race, or ambiguous release condition. Earlier successful merges remain merged; unprocessed
pull requests wait for another explicit execution.

## Required Reads

Read Roadmap operations, lifecycle, the repository Git and release policies, and the complete current Project before
snapshotting candidates. Use fresh remote Git and GitHub evidence, never memory, local branch lists, prior runs, or
partial pull-request lists.

## Authorized Snapshot

At startup:

1. list the pull requests eligible under the repository release profile;
2. retain only candidates whose same-repository head is a deletable task branch and whose structurally
   linked issue is a coherent `In Review` reservation with one assignee, a valid conflict-free Workset, and no open
   native blocker;
3. record each retained pull-request number and full head SHA;
4. normalize acceptance evidence on each unchanged head as described below; and
5. order the retained set by Roadmap Priority (`High`, `Normal`, `Low`), live Track option order, linked issue number,
   then pull-request number.

The explicit Merge task request authorizes only this ordered snapshot. Never add a pull request that becomes non-draft
or otherwise eligible after startup. Exclude an initially invalid or ambiguous pull request with its exact reason.

## Acceptance Evidence Normalization

For every snapshot candidate:

1. reread the unchanged head, diff, validations, checks, linked issue, and current acceptance criteria;
2. verify each unchecked criterion against authoritative evidence from that exact head;
3. check only objectively satisfied pre-merge criteria, then reread the issue; and
4. leave missing, ambiguous, subjective, or post-merge evidence unchecked.

An unchecked box alone is not evidence that work is incomplete. Normalization never authorizes invented evidence,
scope expansion, a weakened release guard, or a check waiver.

## Review Evidence Snapshot

For each unchanged candidate head, read lifecycle's concise review evidence from ordinary issue and PR content. Verify
that it names the full current SHA and records Workset, changed paths, validations, skips, review source, findings,
scope drift, and any separate release decision.

Classify clean, stale-head, failed-check, skipped-check, scope-drift, and unresolved-finding cases through lifecycle's
review-evidence table. Self-confidence and absence of comments are never review. A stale record is unusable even when
its effective diff looks unchanged.

If evidence is missing but can be established from the exact current head, append one concise Markdown comment after
self-review and validation. Never introduce or require an attestation schema, generated artifact, bot, workflow, or
privileged integration. Exclude secrets, personal data, provider payloads, absolute machine paths, local usernames,
and machine-specific process details.

## Candidate Refresh

Process the ordered snapshot sequentially against fresh remote state:

1. reread the candidate, remote task head, current remote integration head, claim, Workset, native relationships, and
   active writer evidence;
2. stop if another worker is writing the branch or its remote head differs from the snapshotted or subsequently
   recorded expected SHA;
3. create an isolated temporary worktree detached at the expected task head and rebase it onto the current integration
   head; never merge the integration branch into the task branch;
4. when the rebase conflicts, record the base SHA, candidate SHA, unmerged paths, and relevant earlier merged pull
   requests, abort the rebase, leave the remote head unchanged, return the pull request to draft, add one evidence
   comment, keep its issue assigned and `In Review`, clean up the temporary worktree, and stop the train;
5. after a clean rebase, require the effective diff to remain equivalent in intent, inside the frozen Workset, and free
   of an unexpected generated or unrelated path;
6. push the rebased detached head with an explicit
   `--force-with-lease=refs/heads/<branch>:<expected-old-sha>` refspec, never plain `--force`;
7. reread the pull request and use its new full head SHA for every later check and mutation; and
8. clean up only the train-owned temporary worktree.

A clean rebase that changes only commit identity does not require another user authorization. A changed effective diff,
conflict resolution, scope change, or changed release risk returns the pull request to draft, records the evidence, and
stops for a new approval.

## Head-Bound Checks

After every refresh:

1. wait for every applicable validation and required check on the new head;
2. classify completed checks through lifecycle's bounded summary, annotation, and failed-step procedure;
3. apply only an automatic check classification explicitly defined by the repository release profile and record its
   required evidence;
4. require every other check to pass or have an explicit head-bound human waiver; and
5. return the pull request to draft, record the exact failure, and stop the train when the gate does not pass.

Never reuse checks, waivers, annotations, reviews, or release evidence from the pre-rebase head.

## Repository Release Proof

Execute the complete release validation profile selected by the repository router against the exact rebased candidate
tree. Preserve user-owned processes, bind all evidence to the candidate head, record the required inventory and
cleanup, and stop fail-closed on any missing prerequisite or failed proof. Changed paths, Workset, risk classification,
or agent judgment do not redefine that profile.

## Merge And Reconciliation

Immediately before each merge:

1. reread the pull request, head, base, current remote integration head, diff, checks, release evidence, linked issue,
   criteria, claim, Workset, changed paths, reviews, skips, unresolved findings, and native relationships;
2. require the candidate branch to contain the exact current remote integration head;
3. if the integration head changed after validation, invalidate the candidate evidence and restart refresh, checks,
   and release proof; stop after the repository-defined retry bound;
4. merge the unchanged head through the exact command and method owned by the repository Git workflow;
5. reread the merged pull request and remote integration head, then verify that the unchanged remote task ref is
   absent;
6. complete the linked issue only when every completion guard passes: set `Done`, remove all assignees, close completed,
   and reread;
7. run dependency-unlock reconciliation, validate newly unblocked issues before `Ready`, recalculate affected Epics,
   and require lifecycle's stable postconditions; and
8. recompute every unprocessed candidate against the new integration head before continuing.

Require the current-user release authorization independently of implementation, validation, review, or evidence
normalization. A ready PR and green checks never supply that authorization.

Never merge two candidates as one commit, update a branch outside the startup snapshot, delete a moved ref, enable
auto-merge, infer a waiver, or roll back an earlier successful merge because a later candidate failed.

## Final Report

Identify every merged pull request and linked Roadmap result in order. When the train stops early, name the exact
candidate, preserved remote state, completed earlier merges, failure evidence, and clearing condition. Apply any final
response suffix required by the repository Git workflow.
