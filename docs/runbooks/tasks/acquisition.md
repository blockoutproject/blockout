# Task Acquisition Runbook

Use this when a developer wants new work and intends to continue. Acquisition selects and reserves one task as one
operation; it does not return an unreserved proposal.

## Rules

- Preserve unrelated work and start with `git status --short --branch`.
- Read Roadmap operations before querying or mutating the Project and lifecycle when mode or transition decisions are
  required.
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

1. Execute operations' immediate pre-mutation read phase for the selected target.
2. Apply its assignment and `In Progress` mutation phase.
3. Apply its partial-claim recovery and simultaneous arbitration on ambiguity or overlap.
4. Continue only after operations' complete stable-claim postcondition passes; otherwise leave no partial claim
   discoverable.

## Execution Handoff

- `DEFAULT_EXECUTION`: enter [`execution.md`](execution.md) as `ACQUIRED_SAME_TASK`.
- `PLAN_REQUIRED`: enter the execution runbook's Planning Gate.
- If planning is abandoned, remove the assignee, restore Ready, and reread both postconditions.
- If planning exposes a real blocker, use lifecycle's Blocked guard and explicitly retain or release the reservation.

## Response

Report acquired issue, owner, status, Track, Priority, Execution Mode, source gate, Workset, compatibility, assignment
event, snapshot stability, raced exclusions, and next execution gate. If nothing was acquired, state that and leave no
partial claim.
