# Task Acquisition Runbook

> Migration status: dormant until Phase MRG-1000 in `docs/current/blockout-active-roadmap.md`. Use the local roadmap during migration.

Use this when a developer asks for new Blockout work and intends to continue with the acquired task. Acquisition selects
and reserves work as one logical operation; it does not merely propose a task.

## Rules

- Preserve unrelated user changes and start with `git status --short --branch`.
- Read `.agents/skills/blockout-best-practices/references/github-roadmap-operations.md` before querying or mutating the
  Project.
- In a managed local checkout, use one authenticated `gh` transport and run it outside the sandbox. Use the GitHub
  connector only as a fallback and require matching identities before mixing evidence.
- Use the read-only compact Project helper, then fetch detailed bodies/worksets only for relevant candidates and
  claims. Its `authenticatedLogin` is sufficient identity evidence for this workflow. Resolve IDs once for the
  uninterrupted workflow and reuse them only under the operations freshness guard.
- Ordinary collaborators use distinct accounts, and one account runs at most one ordinary acquisition workflow at a
  time. The Ready-drain exception uses issue-specific workers and may retain multiple compatible same-login
  `In Progress` claims. A login may also retain multiple coherent `In Review` reservations.
- Do not create a branch, develop a task-specific plan, or edit task files until acquisition succeeds.
- Do not create a mutating roadmap CLI, Markdown claim ledger, lease, or session-token subsystem.

## Required Read Set

Read the compact complete Roadmap index, current product/runtime context, agent brief, each relevant issue and workset,
native dependencies, linked PRs, scope-specific sources, and the additional frontend/Figma sources required by
discovery when the candidate is frontend-facing.

## Same-task Discovery Handoff

When an uninterrupted read-only discovery just proposed the target, obtain one fresh compact index and targeted
target/active-claim evidence. Reuse its detailed candidate, source-gate, dependency, workset, equivalent/delivered, and
source validation only when every decision-bearing value and relevant `updatedAt` is unchanged. Continue at the claim
read phase without rerunning selection.

Any drift, new task/session, incomplete prior read, changed login/repository/schema, or failed/ambiguous operation
invalidates this fast path and requires the complete calculation below.

## Select Without Announcing

1. Perform the complete live calculation from [`discovery.md`](discovery.md): validate all `Ready` candidates, active
   and quarantined claims, dependencies, labels, worksets, conflicts, deterministic ordering, and delivered-state
   challenges.
2. Keep the ranked result internal. Acquisition must not return an unreserved proposal.
3. Take the highest-ranked candidate and immediately rerun the claim read phase against fresh live state.
4. If it is now assigned, invalid, conflicting, delivered, replaced, or otherwise unavailable, exclude it with the
   exact reason and try the next ranked candidate.
5. Attempt at most three candidates. After the third invalidation or race, stop fail-closed and report all exclusions.

### Ready-drain targeted acquisition

The Ready-drain controller supplies one explicit issue number after its live pairwise compatibility calculation and
performs the canonical claim before creating the Codex task. The worker enters execution through the `RESUME` profile
and implements only that named claim. It does not rerank, fall through, or acquire another issue. If the target is no
longer unassigned `Ready`, has drifted, conflicts, or fails its contract, the controller skips it before task creation.
The durable `In Progress` claim makes duplicate controller wakes idempotent against GitHub state.

## Claim The Candidate

1. Confirm the source gate is not `BLOCK`, the Ready contract remains complete, the candidate is unassigned, and its
   workset is compatible with every active or quarantined claim.
2. Confirm the intended assignee is the authenticated GitHub user.
3. Stop an ordinary fresh acquisition when the authenticated login owns an `In Progress` issue, an assigned `Blocked`
   issue, or an incoherent `In Review` issue. For a Ready-drain controller claim, compatible coherent implementation
   and review claims remain active locks but do not block the named target. An assigned `Blocked` issue or an active
   claim with unparseable locks still stops all acquisition.
4. Add exactly that assignee through `gh api`.
5. Use the workflow's fresh `Status` and `In Progress` IDs to update the Project item through GraphQL.
6. Immediately reread the compact Project decision state, target issue, assignees, relevant worksets, and assignment
   timeline, then obtain a second consecutive snapshot with identical decision-bearing state.
7. Apply Roadmap operations' partial-claim recovery and simultaneous-claim arbitration whenever mutation evidence is
   ambiguous or a concurrent overlap appears. Release only the losing claim.

Acquisition succeeds only when the target is `In Progress`, has exactly the authenticated assignee, remains
conflict-free, exposes the active assignment event, and has two stable post-claim snapshots. Otherwise reconcile the
partial or losing claim and report failure.

## Execution Handoff

- `DEFAULT_EXECUTION`: enter [`execution.md`](execution.md) as `ACQUIRED_SAME_TASK` and continue from branch creation
  without selecting, assigning, or reloading unchanged sources again.
- `PLAN_REQUIRED`: switch to execution, develop the claimed plan, and obtain current-user approval before branch
  creation or task-file edits.
- If planning is abandoned, rejected, or handed back, remove the assignee, return the item to `Ready`, and reread both
  postconditions.
- If planning reveals a real blocker, apply the canonical `Blocked` guard and explicitly retain or release the workset.

## Response

Report the acquired issue, owner, `In Progress` status, Track, Priority, Execution Mode, source gate, workset,
compatibility result, assignment event, snapshot stability, excluded raced candidates, and the next execution gate. If
nothing was acquired, state that directly and leave no partial claim discoverable.
