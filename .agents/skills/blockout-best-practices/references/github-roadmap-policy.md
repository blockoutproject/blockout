# GitHub Roadmap Policy

The `blockoutproject` organization
[Roadmap Project](https://github.com/orgs/blockoutproject/projects/4) for `blockoutproject/blockout` is the single
operational source of truth. This file routes operations and does not duplicate their detailed rules.

## Required Reference

| Operation                                                                    | Read                                                                                                                                                           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inspect, acquire, claim, resume, expand scope, or operate through a draft PR | [`github-roadmap-operations.md`](github-roadmap-operations.md)                                                                                                 |
| Drain compatible Ready issues into separate Codex tasks and draft PRs        | Operations plus [`ready-drain.md`](../../../../docs/runbooks/tasks/ready-drain.md)                                                                             |
| Snapshot and drain approved pull requests through the Merge train            | [`github-roadmap-lifecycle.md`](github-roadmap-lifecycle.md), [`git-workflow.md`](git-workflow.md), and [`merge.md`](../../../../docs/runbooks/tasks/merge.md) |
| Classify types or modes; transition, complete, reject, reconcile, or roll up | [`github-roadmap-lifecycle.md`](github-roadmap-lifecycle.md)                                                                                                   |
| Change Project fields, options, tracks, views, workflows, or migration state | [`github-roadmap-governance.md`](github-roadmap-governance.md)                                                                                                 |

Ordinary discovery, acquisition, and implementation through draft publication load operations only. Load lifecycle
for lifecycle or release decisions and governance only for structural Project work.

## Invariants

- The Project owns task existence, Status, Track, Priority, Execution Mode, ownership, and active claims.
- Issues own objectives, acceptance criteria, dependencies, evidence, and frozen worksets.
- Current source and architecture/evidence documents own durable product and technical intent.
- Closed issues, merged PRs, task evidence, and Git history own delivered history.
- No Markdown task ledger, draft Project item, hidden claim state, lease, or mutating roadmap helper may compete with
  GitHub.
- If complete Project evidence cannot be read for the decision, stop fail-closed.
