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

## Read-Only Maaatch Adoption Handoff

The comparison below covers every Blockout focused reference and was made without modifying Maaatch or copying
business code. Blockout is the export source for these files. A shared boundary is adopted only when the complete
Maaatch file is byte-for-byte identical; partial copies and repository-specific forks are not adoption.

### Complete Blockout Compatibility Matrix

| Blockout reference                                                                                                             | Technical boundary                | Blockout route                                                   | Maaatch counterpart or target             | Classification and current state                                                  |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ---------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------- |
| [`backend-java-policy.md`](../../.agents/skills/blockout-best-practices/references/backend-java-policy.md)                     | Java backend architecture         | Java or backend module work                                      | `references/backend-java-policy.md`       | Shared; counterpart differs and must be replaced exactly                          |
| [`baseline-v1-policy.md`](../../.agents/skills/blockout-best-practices/references/baseline-v1-policy.md)                       | Product source gate               | Behavior or V1 scope                                             | `references/baseline-v1-policy.md`        | Shared; counterpart differs and must be replaced exactly                          |
| [`code-documentation-policy.md`](../../.agents/skills/blockout-best-practices/references/code-documentation-policy.md)         | Source documentation              | Handwritten public or local contracts                            | `references/code-documentation-policy.md` | Shared; counterpart differs and must be replaced exactly                          |
| [`contract-first.md`](../../.agents/skills/blockout-best-practices/references/contract-first.md)                               | OpenAPI and generated boundaries  | Contract, DTO, endpoint, or generated transport                  | `references/contract-first.md`            | Shared; counterpart differs and must be replaced exactly                          |
| [`figma-policy.md`](../../.agents/skills/blockout-best-practices/references/figma-policy.md)                                   | Figma interaction and design QA   | Figma read, write, or comparison                                 | `references/figma-policy.md`              | Shared; counterpart differs and must be replaced exactly                          |
| [`flyway.md`](../../.agents/skills/blockout-best-practices/references/flyway.md)                                               | Flyway migrations                 | Flyway-routed schema work                                        | No current counterpart                    | Technology-specific portable policy; adopt exactly only if Maaatch routes Flyway  |
| [`git-workflow.md`](../../.agents/skills/blockout-best-practices/references/git-workflow.md)                                   | Git and pull-request workflow     | Git or publication work                                          | `references/git-workflow.md`              | Shared; counterpart differs and must be replaced exactly                          |
| [`github-roadmap-governance.md`](../../.agents/skills/blockout-best-practices/references/github-roadmap-governance.md)         | Project governance                | Project structure or migration                                   | `references/github-roadmap-governance.md` | Shared; counterpart differs and must be replaced exactly                          |
| [`github-roadmap-lifecycle.md`](../../.agents/skills/blockout-best-practices/references/github-roadmap-lifecycle.md)           | Lifecycle and release             | Status, mode, completion, or release                             | `references/github-roadmap-lifecycle.md`  | Shared; counterpart differs and must be replaced exactly                          |
| [`github-roadmap-operations.md`](../../.agents/skills/blockout-best-practices/references/github-roadmap-operations.md)         | Discovery, claims, and Worksets   | Roadmap acquisition or scope                                     | `references/github-roadmap-operations.md` | Shared; counterpart differs and must be replaced exactly                          |
| [`github-roadmap-policy.md`](../../.agents/skills/blockout-best-practices/references/github-roadmap-policy.md)                 | Roadmap owner routing             | Roadmap policy lookup                                            | `references/github-roadmap-policy.md`     | Shared; counterpart differs and must be replaced exactly                          |
| [`github-taxonomy.md`](../../.agents/skills/blockout-best-practices/references/github-taxonomy.md)                             | Taxonomy decisions                | Track, label, identifier, or area policy                         | No current counterpart                    | Shared and adoptable unchanged; Maaatch keeps exact catalog values in its profile |
| [`java-testing-policy.md`](../../.agents/skills/blockout-best-practices/references/java-testing-policy.md)                     | Java testing                      | Backend Java tests                                               | `references/java-testing-policy.md`       | Shared; counterpart differs and must be replaced exactly                          |
| [`jpa-persistence-policy.md`](../../.agents/skills/blockout-best-practices/references/jpa-persistence-policy.md)               | JPA persistence                   | Entity, repository, relationship, or query                       | `references/jpa-persistence-policy.md`    | Shared; counterpart differs and must be replaced exactly                          |
| [`local-runtime-policy.md`](../../.agents/skills/blockout-best-practices/references/local-runtime-policy.md)                   | Local runtime and smoke lifecycle | Containers, environment, or runtime smoke                        | No current counterpart                    | Shared and adoptable unchanged; topology remains repository-owned                 |
| [`logging-policy.md`](../../.agents/skills/blockout-best-practices/references/logging-policy.md)                               | Safe operational logging          | Java, Python, or client logging                                  | `references/logging-policy.md`            | Shared; counterpart differs and must be replaced exactly                          |
| [`mapping-policy.md`](../../.agents/skills/blockout-best-practices/references/mapping-policy.md)                               | Boundary mapping                  | Transport, application, domain, provider, or persistence mapping | `references/mapping-policy.md`            | Shared; counterpart differs and must be replaced exactly                          |
| [`mobile-expo-policy.md`](../../.agents/skills/blockout-best-practices/references/mobile-expo-policy.md)                       | Expo and React Native             | Mobile application work                                          | No current counterpart                    | Technology-specific portable policy and exact Maaatch adoption target             |
| [`mobile-testing-policy.md`](../../.agents/skills/blockout-best-practices/references/mobile-testing-policy.md)                 | Mobile testing                    | Jest or React Native Testing Library                             | No current counterpart                    | Technology-specific portable policy and exact Maaatch adoption target             |
| [`python-scraper-policy.md`](../../.agents/skills/blockout-best-practices/references/python-scraper-policy.md)                 | Python scraper architecture       | Python scraper work                                              | No current counterpart                    | Technology-specific portable policy; route only for a compatible scraper          |
| [`python-scraper-testing-policy.md`](../../.agents/skills/blockout-best-practices/references/python-scraper-testing-policy.md) | Python scraper testing            | Scraper tests and fixtures                                       | No current counterpart                    | Technology-specific portable policy; route only for a compatible scraper          |
| [`rest-endpoint-policy.md`](../../.agents/skills/blockout-best-practices/references/rest-endpoint-policy.md)                   | REST endpoints                    | Controller, request, response, or HTTP boundary                  | `references/rest-endpoint-policy.md`      | Shared; counterpart differs and must be replaced exactly                          |
| [`risk-based-validation-policy.md`](../../.agents/skills/blockout-best-practices/references/risk-based-validation-policy.md)   | Risk-based validation             | Validation plan, skip, or fallback                               | No current counterpart                    | Shared and adoptable unchanged; repository commands remain in the router          |

The 15 same-named counterparts above currently fail exact comparison. Their Maaatch-specific paths, commands, versions,
providers, migration choices, frontend values, and Project coordinates must move to Maaatch-owned router or overlays
before Maaatch replaces each applicable reference with the complete Blockout file.

### Maaatch-Only Adjacent Boundaries

| Maaatch reference                      | Classification                    | Blockout decision                                             |
| -------------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| `references/frontend-web-policy.md`    | Technology-specific Maaatch route | Do not add or route while Blockout has no web frontend        |
| `references/liquibase.md`              | Technology-specific Maaatch route | Keep Flyway as Blockout's routed migration policy             |
| `references/rest-pagination-policy.md` | Maaatch-owned contract boundary   | Do not impose a repository-wide pagination policy on Blockout |

### Exact Adoption Procedure

1. Create a separately owned Maaatch task; this handoff authorizes no Maaatch mutation.
2. Move Maaatch identity, paths, packages, commands, versions, providers, ports, branches, design identifiers, domain
   values, and technology selection into its router or overlays.
3. Replace each applicable focused reference as one complete file from the Blockout export source.
4. Prove byte-for-byte equality with exact file comparison and walk the Maaatch router for every adopted boundary.
5. Keep non-applicable technology policies available as targets without routing them.

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
