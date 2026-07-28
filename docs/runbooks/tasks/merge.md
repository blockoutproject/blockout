# Merge Train Runbook

Use this only when the current user explicitly asks to run the Blockout Merge task. One execution authorizes the
complete startup snapshot of structurally valid, open, non-draft pull requests targeting `develop`; it never authorizes
a pull request that becomes non-draft later.

## Outcome

Build the authorized snapshot, order it deterministically, and drain it one pull request at a time. Rebase every
candidate onto the exact current remote `develop`, obtain fresh head-bound checks, prove the complete local stack and
authentication flow, merge through the supported merge-commit path, delete only the merged remote task branch, and
reconcile Roadmap state before continuing.

The train stops fail-closed at the first conflict, failed validation, unhealthy runtime, authentication failure,
unexpected diff, moved head, repeated base race, or ambiguous release condition. Earlier successful merges remain
merged; unprocessed pull requests wait for another explicit execution.

## Required Reads

Read Roadmap operations, lifecycle, Git workflow, local runtime policy, and the complete current Project before
snapshotting candidates. Use fresh remote Git and GitHub evidence, never memory, local branch lists, prior runs, or
partial pull-request lists.

## Authorized Snapshot

At startup:

1. list every open pull request targeting `develop`;
2. retain only non-draft pull requests whose same-repository head is a deletable task branch and whose structurally
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

## Candidate Refresh

Process the ordered snapshot sequentially against fresh remote state:

1. reread the candidate, remote task head, current `origin/develop`, claim, Workset, native relationships, and active
   writer evidence;
2. stop if another worker is writing the branch or its remote head differs from the snapshotted or subsequently
   recorded expected SHA;
3. create an isolated temporary worktree detached at the expected task head and rebase it onto current
   `origin/develop`; never merge `develop` into the task branch;
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
3. for the documented zero-step GitHub billing exception, comment with the unchanged head SHA, check-run ID, and single
   billing annotation;
4. require every other check to pass or have an explicit head-bound human waiver; and
5. return the pull request to draft, record the exact failure, and stop the train when the gate does not pass.

Never reuse checks, waivers, annotations, reviews, or release evidence from the pre-rebase head.

## Complete Local Runtime Proof

The Merge train must validate the exact rebased candidate tree with the complete supported local topology. Changed
paths, Workset, risk classification, or agent judgment may not reduce this topology.

1. Inspect existing Docker, ports, Java/Python processes, Metro, installed development clients, and simulator or device
   state. Preserve user-owned processes and record every process started by the train.
2. Start both `infra/compose/docker-compose.third-party.yml` and `infra/compose/docker-compose.app.yml` under the
   `blockout` Compose project. Every declared PostgreSQL, RabbitMQ, Elasticsearch, and pgAdmin container must be running
   and healthy when a health check exists.
3. Start every Java application from the rebased candidate tree, including all services, the mobile gateway, search
   service, and search worker. Verify every configured health endpoint and keep the complete Java topology alive
   together.
4. Start both Python scrapers in their documented safe local mode with production providers and uncontrolled external
   writes disabled. Verify that each process starts and reaches its documented local readiness state.
5. Start Metro from the same candidate tree on the repository-supported port and launch the complete Expo application
   in an installed supported development client. A Metro process without a running application is insufficient.
6. Use a provider-supported local or test Auth0 identity to complete login through the visible application flow, reach
   a protected application surface that exercises the mobile-to-gateway path, and sign out. Never add or use an
   authentication bypass, embedded credential, wildcard origin, mocked provider state, or production identity.
7. Treat a missing credential, unavailable runtime prerequisite or development client, port collision that cannot be
   safely resolved, unsafe scraper path, unhealthy component, incomplete protected flow, or sign-out failure as a
   release blocker. Return the pull request to draft, record the exact clearing condition, stop train-owned processes,
   and stop the train.
8. Record the candidate SHA, complete component inventory, health evidence, authenticated flow, and cleanup result on
   the pull request without exposing secrets, provider payloads, or personal data.

Healthy infrastructure may be reused for the next candidate only after every component is reverified. Restart every
repository application from the next candidate tree so the evidence always binds to the head being merged. Stop only
train-owned processes when the evidence session ends.

## Merge And Reconciliation

Immediately before each merge:

1. reread the pull request, head, base, current remote `develop`, diff, checks, runtime evidence, linked issue, criteria,
   claim, Workset, reviews, and native relationships;
2. require the candidate branch to contain the exact current remote `develop` head;
3. if `develop` changed after validation, invalidate the candidate evidence and restart refresh, checks, and complete
   runtime proof; stop after three consecutive base invalidations;
4. merge the unchanged head with
   `gh pr merge --merge --delete-branch --match-head-commit <full-head-sha>`;
5. reread the merged pull request and remote `develop`, then verify that the unchanged remote task ref is absent;
6. complete the linked issue only when every completion guard passes: set `Done`, remove all assignees, close completed,
   and reread;
7. run dependency-unlock reconciliation, validate newly unblocked issues before `Ready`, recalculate affected Epics,
   and require lifecycle's stable postconditions; and
8. recompute every unprocessed snapshot candidate against the new `develop` before continuing.

Never merge two candidates as one commit, update a branch outside the startup snapshot, delete a moved ref, enable
auto-merge, infer a waiver, or roll back an earlier successful merge because a later candidate failed.

## Final Report

Identify every merged pull request and linked Roadmap result in order. When the train stops early, name the exact
candidate, preserved remote state, completed earlier merges, failure evidence, and clearing condition.

The last content in the response must always be the branch reminder in the user's chat language. For French, use:

```text
Pensez à mettre à jour les branches suivantes :
- <remaining branch>
```

When no branch needs an update, end with:

```text
Pensez à mettre à jour les branches suivantes : aucune.
```
