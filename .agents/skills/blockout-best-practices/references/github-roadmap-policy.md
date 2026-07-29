# GitHub Roadmap Policy

Repository coordinates and the operational source of truth are declared once in the root `AGENTS.md`. This file only
routes Roadmap decisions and procedures to their owners.

## Required Reference

| Operation                                                                    | Read                                                                                                                                                                               |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inspect, acquire, claim, resume, or expand scope                             | [`github-roadmap-operations.md`](github-roadmap-operations.md) and the matching task runbook                                                                                       |
| Publish a draft PR and enter review                                          | Operations, [`git-workflow.md`](git-workflow.md), [`github-roadmap-lifecycle.md`](github-roadmap-lifecycle.md), and [`execution.md`](../../../../docs/runbooks/tasks/execution.md) |
| Drain compatible Ready issues into separate Codex tasks and draft PRs        | Operations plus [`ready-drain.md`](../../../../docs/runbooks/tasks/ready-drain.md)                                                                                                 |
| Snapshot and drain approved pull requests through the Merge train            | [`github-roadmap-lifecycle.md`](github-roadmap-lifecycle.md), [`git-workflow.md`](git-workflow.md), and [`merge.md`](../../../../docs/runbooks/tasks/merge.md)                     |
| Classify types or modes; transition, complete, reject, reconcile, or roll up | [`github-roadmap-lifecycle.md`](github-roadmap-lifecycle.md)                                                                                                                       |
| Change Project fields, options, tracks, views, workflows, or migration state | [`github-roadmap-governance.md`](github-roadmap-governance.md)                                                                                                                     |

Ordinary discovery and acquisition load operations plus their runbook. Execution adds the Git workflow for
publication and lifecycle when it classifies an Execution Mode or changes Status. Load governance only for structural
Project work.
