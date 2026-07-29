# Task Acquisition Runbook

Use this when a developer wants new work and intends to continue. Acquisition selects and reserves one task as one
operation; it does not return an unreserved proposal.

## Rules

- Preserve unrelated work and start with `git status --short --branch`.
- Read Roadmap operations before querying or mutating the Project.
- Use one authenticated `gh` identity and the compact read-only helper.
- Resolve IDs live once and reuse them only under operations' freshness guard.
- Do not create a branch, develop a task plan, or edit task files until the claim is stable.
- Do not create a mutating roadmap CLI, Markdown ledger, lease, or hidden claim state.

## Required Reads

Read the complete Project index, relevant candidate and active issues, Worksets, native dependencies, linked PRs,
scope-specific policy/source evidence, and every additional authority selected during discovery.

## Select Without Announcing

1. Perform discovery's complete calculation.
2. Repair reconciliation drift through lifecycle before ranking the affected issue.
3. Keep the ranked candidate internal and immediately rerun its claim read phase.
4. Exclude a target that became assigned, invalid, conflicting, delivered, blocked, or replaced and try the next.
5. Stop fail-closed after three concurrent invalidations and report every exclusion.

### Ready-drain target

The controller provides one explicit issue and performs the canonical claim before creating its worker. The worker
enters execution through `RESUME`, implements only that issue, and never reranks or falls through. The controller skips
the target if it is no longer unassigned Ready or fails its contract.

## Claim

1. Require source gate not `BLOCK`, complete Ready metadata, unassigned target, and compatibility with every active or
   quarantined Workset.
2. Require the intended assignee to equal the authenticated login.
3. For ordinary acquisition, stop on a same-login In Progress issue, assigned Blocked issue, or incoherent In Review
   issue. Compatible coherent review reservations remain allowed.
4. Add exactly the authenticated login as assignee.
5. Set Project Status to `In Progress`.
6. Immediately obtain two consecutive matching snapshots of target, assignees, assignment event, active/quarantined
   claims, Worksets, and conflicts.
7. Apply operations' partial-claim recovery and simultaneous arbitration on ambiguity or overlap.

Success requires `In Progress`, one intended assignee, an active assignment event, no conflict, and stable snapshots.
Otherwise leave no partial claim discoverable.

## Execution Handoff

- `DEFAULT_EXECUTION`: enter [`execution.md`](execution.md) as `ACQUIRED_SAME_TASK`.
- `PLAN_REQUIRED`: create the claimed plan and obtain current-user approval before branch or task-file edits.
- If planning is abandoned, remove the assignee, restore Ready, and reread both postconditions.
- If planning exposes a real blocker, use lifecycle's Blocked guard and explicitly retain or release the reservation.

## Response

Report acquired issue, owner, status, Track, Priority, Execution Mode, source gate, Workset, compatibility, assignment
event, snapshot stability, raced exclusions, and next execution gate. If nothing was acquired, state that and leave no
partial claim.
