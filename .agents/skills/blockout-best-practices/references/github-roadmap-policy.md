# GitHub Roadmap Policy

Repository coordinates and the operational source of truth are declared once in the repository guidance selected by
the router. This file only routes Roadmap decisions and procedures to their owners.

## Required Reference

| Operation                                                                    | Read                                                                                                                               |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Inspect, acquire, claim, resume, or expand scope                             | [`github-roadmap-operations.md`](github-roadmap-operations.md) and the matching task runbook selected by the repository router     |
| Publish a draft PR and enter review                                          | Operations, [`git-workflow.md`](git-workflow.md), lifecycle, and the execution runbook selected by the repository router           |
| Drain compatible Ready issues into separate tasks and draft PRs              | Operations plus the Ready-drain runbook selected by the repository router                                                          |
| Snapshot and drain approved pull requests through the Merge train            | [`github-roadmap-lifecycle.md`](github-roadmap-lifecycle.md), [`git-workflow.md`](git-workflow.md), and the selected merge runbook |
| Classify types or modes; transition, complete, reject, reconcile, or roll up | [`github-roadmap-lifecycle.md`](github-roadmap-lifecycle.md)                                                                       |
| Change Project fields, options, tracks, views, workflows, or migration state | [`github-roadmap-governance.md`](github-roadmap-governance.md)                                                                     |

Ordinary discovery and acquisition load operations plus their runbook. Execution adds the Git workflow for
publication and lifecycle when it classifies an Execution Mode or changes Status. Load governance only for structural
Project work.
