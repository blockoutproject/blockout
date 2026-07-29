# Blockout Agent Brief

Last updated: 2026-07-29.

This is a descriptive ownership and adoption map. It is not a policy layer and does not repeat operational rules.

## Hierarchy

| Layer               | Purpose                                             | Blockout owner                                                                     |
| ------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Session guidance    | Current system, developer, and user intent          | Agent runtime                                                                      |
| Repository guidance | Stable coordinates and repository-wide invariants   | [`AGENTS.md`](../../AGENTS.md)                                                     |
| Repository router   | Source selection, repository map, validation routes | [`blockout-best-practices`](../../.agents/skills/blockout-best-practices/SKILL.md) |
| Focused policy      | One portable decision or technical boundary         | One file under `references/`                                                       |
| Repository profile  | Concrete Blockout values selected by the router     | One file under `overlays/`                                                         |
| Task runbook        | One operation sequence                              | One file under [`docs/runbooks/tasks/`](../runbooks/tasks/)                        |

Higher layers constrain lower ones. Focused policies own portable decisions; repository overlays supply concrete
values; runbooks orchestrate both. The selected issue owns the task objective, acceptance criteria, dependencies,
evidence, and frozen Workset.

## Decision Ownership

| Decision                                                                  | Single owner                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project evidence, Ready, Worksets, claims, conflicts, and scope expansion | [Roadmap operations](../../.agents/skills/blockout-best-practices/references/github-roadmap-operations.md)                                                                                                                                                                                                                                                                                                                           |
| Statuses, modes, transitions, completion, dependencies, and Epic rollup   | [Roadmap lifecycle](../../.agents/skills/blockout-best-practices/references/github-roadmap-lifecycle.md)                                                                                                                                                                                                                                                                                                                             |
| Blockout Project fields, views, Tracks, labels, and areas                 | Portable [Roadmap governance](../../.agents/skills/blockout-best-practices/references/github-roadmap-governance.md) and [taxonomy policy](../../.agents/skills/blockout-best-practices/references/github-taxonomy.md), plus the [Blockout Roadmap profile](../../.agents/skills/blockout-best-practices/overlays/github-roadmap-profile.md) and [taxonomy](../../.agents/skills/blockout-best-practices/overlays/github-taxonomy.md) |
| Blockout branches, PRs, repository settings, review, and integration      | Portable [Git workflow](../../.agents/skills/blockout-best-practices/references/git-workflow.md) plus the [Blockout Git profile](../../.agents/skills/blockout-best-practices/overlays/git-profile.md)                                                                                                                                                                                                                               |
| Blockout runtime and release smoke                                        | Portable [local runtime policy](../../.agents/skills/blockout-best-practices/references/local-runtime-policy.md) plus the [Blockout runtime profile](../../.agents/skills/blockout-best-practices/overlays/local-runtime-profile.md)                                                                                                                                                                                                 |
| Discovery, acquisition, execution, drain, and merge sequences             | The matching [task runbook](../runbooks/tasks/)                                                                                                                                                                                                                                                                                                                                                                                      |
| Product/runtime posture and closed boundaries                             | [`blockout-product-runtime-context.md`](blockout-product-runtime-context.md)                                                                                                                                                                                                                                                                                                                                                         |
| Architecture, durable decisions, and delivered scope                      | [`docs/architecture`](../architecture/), [`docs/decisions`](../decisions/), and [`docs/releases`](../releases/)                                                                                                                                                                                                                                                                                                                      |

## Read-Only Maaatch Adoption Map

The comparison below was made against the Maaatch repository without modifying it or copying business code. Maaatch
can consume any file under Blockout `references/**` unchanged; its own router supplies Maaatch-specific overlays.

| Portable layer     | Maaatch counterpart                              | Adoption rule                                                                                     |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Repository router  | `.agents/skills/maaatch-best-practices/SKILL.md` | Select shared references and Maaatch-owned overlays without changing the references.              |
| Focused policies   | Any applicable file under `references/**`        | Reuse the exact portable file unchanged for the same decision or technical boundary.              |
| Roadmap operations | `references/github-roadmap-operations.md`        | Reuse the neutral Ready, Workset, claim, conflict, and expansion policy unchanged.                |
| Roadmap lifecycle  | `references/github-roadmap-lifecycle.md`         | Reuse status and transition semantics; keep repository enforcement in the local Git overlay.      |
| Task runbooks      | Maaatch-owned task runbooks                      | Orchestrate Maaatch operations while linking shared references instead of copying their policies. |
| Repository values  | Maaatch-owned `overlays/**`                      | Own Maaatch paths, versions, providers, branches, commands, taxonomy, runtime, and design values. |
| Stable handoff     | `docs/current/maaatch-agent-brief.md`            | Describe ownership and adoption without duplicating the shared policies.                          |

The observed differences are overlay decisions, not forks of the portable workflow: Roadmap coordinates, repository
taxonomy, runtime stack, validation commands, release candidate cardinality, GitHub enforcement posture, and product
source gates remain repository-owned.

## Representative Walkthroughs

- Discovery and acquisition use the Blockout runbooks, with repository coordinates from `AGENTS.md` and fields from
  Roadmap governance.
- `PLAN_REQUIRED` is claimed through Roadmap operations, approved through lifecycle, then executed through the task
  runbook and Blockout Git workflow.
- Concurrent work is decided only by Workset locks in Roadmap operations; Tracks and branches never reserve scope.
- Draft publication follows the execution runbook while naming, labels, base branch, and review evidence come from the
  portable Git workflow and Blockout Git profile.
- Merge sequencing follows the neutral runbook while candidate selection, exact merge command, complete runtime proof,
  and final branch reminder come from the Blockout overlays.
