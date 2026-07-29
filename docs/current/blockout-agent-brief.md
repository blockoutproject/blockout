# Blockout Agent Brief

Last updated: 2026-07-29.

This is a descriptive ownership and adoption map. It is not a policy layer and does not repeat operational rules.

## Hierarchy

| Layer              | Purpose                                             | Blockout owner                                                                     |
| ------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Session guidance   | Current system, developer, and user intent          | Agent runtime                                                                      |
| Repository overlay | Stable coordinates and repository-wide invariants   | [`AGENTS.md`](../../AGENTS.md)                                                     |
| Repository router  | Source selection, repository map, validation routes | [`blockout-best-practices`](../../.agents/skills/blockout-best-practices/SKILL.md) |
| Focused policy     | One decision or technical boundary                  | One file under `references/`                                                       |
| Task runbook       | One operation sequence                              | One file under [`docs/runbooks/tasks/`](../runbooks/tasks/)                        |

Higher layers constrain lower ones. Focused policies own decisions; runbooks orchestrate them. The selected issue owns
the task objective, acceptance criteria, dependencies, evidence, and frozen Workset.

## Decision Ownership

| Decision                                                                  | Single owner                                                                                                                                                                                          |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project evidence, Ready, Worksets, claims, conflicts, and scope expansion | [Roadmap operations](../../.agents/skills/blockout-best-practices/references/github-roadmap-operations.md)                                                                                            |
| Statuses, modes, transitions, completion, dependencies, and Epic rollup   | [Roadmap lifecycle](../../.agents/skills/blockout-best-practices/references/github-roadmap-lifecycle.md)                                                                                              |
| Blockout Project fields, views, Tracks, labels, and areas                 | [Roadmap governance](../../.agents/skills/blockout-best-practices/references/github-roadmap-governance.md) and [taxonomy](../../.agents/skills/blockout-best-practices/references/github-taxonomy.md) |
| Blockout branches, PRs, repository settings, review, and integration      | [Git workflow](../../.agents/skills/blockout-best-practices/references/git-workflow.md)                                                                                                               |
| Blockout runtime and release smoke                                        | [Local runtime policy](../../.agents/skills/blockout-best-practices/references/local-runtime-policy.md)                                                                                               |
| Discovery, acquisition, execution, drain, and merge sequences             | The matching [task runbook](../runbooks/tasks/)                                                                                                                                                       |
| Product/runtime posture and closed boundaries                             | [`blockout-product-runtime-context.md`](blockout-product-runtime-context.md)                                                                                                                          |
| Architecture, durable decisions, and delivered scope                      | [`docs/architecture`](../architecture/), [`docs/decisions`](../decisions/), and [`docs/releases`](../releases/)                                                                                       |

## Read-Only Maaatch Adoption Map

The comparison below was made against the Maaatch repository without modifying it or copying business code.

| Portable layer     | Maaatch counterpart                                      | Adoption rule                                                                                     |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Repository router  | `.agents/skills/maaatch-best-practices/SKILL.md`         | Keep Maaatch source routing, repository map, commands, and framework policies in its own overlay. |
| Roadmap operations | `references/github-roadmap-operations.md`                | Align to the neutral Ready, Workset, claim, conflict, and expansion policy unchanged.             |
| Roadmap lifecycle  | `references/github-roadmap-lifecycle.md`                 | Align status and transition semantics; keep repository review enforcement in the Git overlay.     |
| Task runbooks      | `docs/runbooks/tasks/{discovery,acquisition,...}.md`     | Reuse neutral operation sequences and route repository details through the Maaatch router.        |
| Git and release    | `references/git-workflow.md` plus local runtime policies | Retain Maaatch branch, candidate-count, validation, and release-smoke choices as overlay values.  |
| Stable handoff     | `docs/current/maaatch-agent-brief.md`                    | Convert repeated rules into the same descriptive ownership map when Maaatch adopts the hierarchy. |

The observed differences are overlay decisions, not forks of the portable workflow: Roadmap coordinates, repository
taxonomy, runtime stack, validation commands, release candidate cardinality, GitHub enforcement posture, and product
source gates remain repository-owned.

## Representative Walkthroughs

- Discovery and acquisition use the neutral runbooks, with Blockout coordinates from `AGENTS.md` and fields from
  Roadmap governance.
- `PLAN_REQUIRED` is claimed through Roadmap operations, approved through lifecycle, then executed through the task
  runbook and Blockout Git workflow.
- Concurrent work is decided only by Workset locks in Roadmap operations; Tracks and branches never reserve scope.
- Draft publication follows the execution runbook while naming, labels, base branch, and review evidence come from the
  Blockout Git workflow.
- Merge sequencing follows the neutral runbook while candidate selection, exact merge command, complete runtime proof,
  and final branch reminder come from the Blockout overlays.
