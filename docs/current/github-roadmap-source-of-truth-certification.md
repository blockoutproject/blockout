# GitHub Roadmap Source-of-Truth Certification

- Date: 2026-07-24
- Retirement issue: [#11 — GIT-012](https://github.com/blockoutproject/blockout/issues/11)
- Roadmap: [Blockout Roadmap](https://github.com/orgs/blockoutproject/projects/4)
- Governance baseline: [GitFlow Governance Certification](gitflow-governance-certification.md)

## Result

The live organization Roadmap is Blockout's only operational authority for task existence, selection, status,
priority, execution mode, ownership, claiming, dependencies, review, release, and cleanup. Issues own objectives,
acceptance criteria, dependencies, evidence, and frozen Worksets. The repository retains policies, runbooks, and
historical certification evidence, but no Markdown task or claim ledger.

This document certifies a migration snapshot; it does not track live task status. Agents must read the complete live
Project and the selected issue before acting.

## Migration Evidence

The pre-GitFlow migration steps remain recoverable from Git history:

| Step      | Delivered outcome                            | Commit     |
| --------- | -------------------------------------------- | ---------- |
| `GIT-001` | Captured the Maaatch governance baseline     | `4906a626` |
| `GIT-002` | Ported dormant Roadmap and GitFlow policies  | `f6c8fab8` |
| `GIT-003` | Defined taxonomy and issue contracts         | `2ca461a3` |
| `GIT-004` | Provisioned issue types and labels           | `872c58f4` |
| `GIT-005` | Configured the organization Roadmap Project  | `86e4de22` |
| `GIT-006` | Prepared CI and documentation for `develop`  | `8e594931` |
| `GIT-007` | Established `develop` and the merge contract | `287590f8` |
| `GIT-008` | Seeded the governed migration issues         | `f4ebe239` |

The live lifecycle then exercised the complete issue-to-release path:

| Step      | Issue | Pull request | Task commit | Merge commit | Terminal state           |
| --------- | ----- | ------------ | ----------- | ------------ | ------------------------ |
| `GIT-009` | [#8]  | [#12]        | `7527cf92`  | `c1fca275`   | Done, closed, unassigned |
| `GIT-010` | [#9]  | [#22]        | `5d76701d`  | `b6c1f585`   | Done, closed, unassigned |
| `GIT-011` | [#10] | [#26]        | `b30c0acc`  | `22f15641`   | Done, closed, unassigned |

[#8]: https://github.com/blockoutproject/blockout/issues/8
[#9]: https://github.com/blockoutproject/blockout/issues/9
[#10]: https://github.com/blockoutproject/blockout/issues/10
[#12]: https://github.com/blockoutproject/blockout/pull/12
[#22]: https://github.com/blockoutproject/blockout/pull/22
[#26]: https://github.com/blockoutproject/blockout/pull/26

GIT-012 publishes the final local-ledger retirement through issue [#11]. Its pull request, merge commit, post-merge CI,
terminal issue transition, branch deletion, and stable final snapshots remain structurally preserved on GitHub.

## Live Roadmap Audit

The final pre-publication audit verified:

- authenticated workflow identity `hugoecken`;
- sixteen Project fields with the exact ordered `Status`, `Track`, `Priority`, and `Execution Mode` vocabularies;
- the five governed views with their required layouts, filters, fields, grouping, and sorting;
- only `Auto-add sub-issues to project` and `Item added to project` enabled;
- exactly five native issue types and fifty-five governed repository labels;
- valid issue templates and canonical discovery, acquisition, execution, Ready-drain, and merge runbooks;
- no open pull request, draft Project item, incoherent claim, or migration-only branch other than the claimed GIT-012
  publication branch;
- `develop` as the default branch, merge commits enabled, squash, rebase, and auto-merge disabled, and explicit task
  branch deletion retained;
- the documented private-plan HTTP 403 limitation for branch protection and repository rulesets; and
- successful post-GIT-011 `Format` and `CI Push` runs on `develop` at `22f156415b79e69129841f8e00959a171451afff`.

Pre-existing historical branches and worktrees outside the GitFlow migration were preserved. They do not represent
active claims and are not an alternative task source.

Two consecutive complete compact Project reads matched at each decision boundary:

- reconciled Ready state before claim: `5b3a26c0f4e0256da69ce2c46378477deac825a388df0181621c721455e020d3`;
- stable claimed state: `5b79bfaf2c23e12f4bf8d335f94d200b7bb315e98782fafc41489bf7804814ba`; and
- final pre-publication state after the visible Workset expansion:
  `00a839125967d1267b955d596c0f4924f3843baf08c6f8323263f0cf39ff62bd`.

## Remaining Governed Work

GIT-011 migrated every unfinished local task exactly once:

- [#23 — REF-069](https://github.com/blockoutproject/blockout/issues/23) is unassigned `Ready`, Track `ACC`, Priority
  `Normal`, and `DEFAULT_EXECUTION`.
- [#24 — REF-070](https://github.com/blockoutproject/blockout/issues/24) is unassigned `Blocked` by the native open
  dependency on #23.
- [#25 — REF-071](https://github.com/blockoutproject/blockout/issues/25) is unassigned `Ready`, Track `ING`, Priority
  `Normal`, and `DEFAULT_EXECUTION`.

The deterministic product Ready order is #23 before #25. Issue #24 becomes eligible for reconciliation only after its
native blocker closes and its complete Ready contract is revalidated.

## Operational Entry Points

- Read [Blockout Agent Brief](blockout-agent-brief.md) for the stable handoff.
- Use [Task Discovery](../runbooks/tasks/discovery.md) for read-only selection.
- Use [Task Acquisition](../runbooks/tasks/acquisition.md) when work will continue.
- Use [Task Execution](../runbooks/tasks/execution.md) for an acquired issue.
- Use [Ready Drain](../runbooks/tasks/ready-drain.md) only for an explicitly authorized compatible frontier.
- Use [Single-PR Merge](../runbooks/tasks/merge.md) only with current-user merge authorization.

Delivered history is recoverable from Git commits, closed issues, merged pull requests, CI runs, and task-specific
certifications. None of those sources authorizes new work by continuity.
