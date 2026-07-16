# GitHub Roadmap Policy

> Migration status: dormant until Phase MRG-1000 in `docs/current/blockout-active-roadmap.md`. The local roadmap remains authoritative and these GitHub rules must not be activated early.

The organization [Roadmap Project](https://github.com/orgs/blockoutproject/projects/1) for `blockoutproject/blockout` is the single
operational source of truth. This index routes each operation to one focused owner; it does not repeat their rules.

## Required Reference

| Operation                                                                                                                | Read                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inspect, acquire, claim, resume, expand scope, or operate an issue/PR through draft publication                          | [`github-roadmap-operations.md`](github-roadmap-operations.md)                                                                                                 |
| Drain compatible Ready issues into separate Codex tasks and draft PRs                                                    | [`github-roadmap-operations.md`](github-roadmap-operations.md) plus [`ready-drain.md`](../../../../docs/runbooks/tasks/ready-drain.md)                         |
| Select and merge one eligible pull request                                                                               | [`github-roadmap-lifecycle.md`](github-roadmap-lifecycle.md), [`git-workflow.md`](git-workflow.md), and [`merge.md`](../../../../docs/runbooks/tasks/merge.md) |
| Classify issue type or execution mode, transition lifecycle state, review, release, complete, reject, or roll up an Epic | [`github-roadmap-lifecycle.md`](github-roadmap-lifecycle.md)                                                                                                   |
| Change Project fields, options, tracks, priorities, views, workflows, migration state, or governance structure           | [`github-roadmap-governance.md`](github-roadmap-governance.md)                                                                                                 |

Ordinary next-task discovery, acquisition, and execution through a draft PR read the operations reference only. Load
the lifecycle reference when a lifecycle decision or release guard is needed. Load governance only for Project
configuration or structural changes.

## Invariants

- The Project owns task existence, status, track, priority, mode, ownership, and active claims.
- Issues own objective, scope, workset, dependencies, and acceptance evidence.
- Architecture and decision documents own durable product and technical intent.
- Closed issues, merged pull requests, and Git history own delivered history.
- No Markdown task ledger, hidden claim state, or mutating roadmap helper may compete with GitHub.
- If the Project cannot be read completely enough for the current decision, stop fail-closed.
