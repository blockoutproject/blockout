# GitFlow Governance Certification

- Date: 2026-07-24
- Governance issue: [#9 — GIT-010](https://github.com/blockoutproject/blockout/issues/9)
- Roadmap: [Blockout Roadmap](https://github.com/orgs/blockoutproject/projects/4)

## Result

Blockout's live GitHub Roadmap and GitFlow satisfy the governance contract defined by the repository policies. The
validation exercised deterministic selection, conflict handling, recovery, Ready-drain isolation, planning gates,
review reservations, dependency reconciliation, Epic rollup, release selection, and terminal cleanup against live
GitHub state.

The validation used bounded disposable issues and branches. None of their repository artifacts reached `develop`, and
every disposable GitHub artifact was reconciled terminally.

## Static Governance Audit

| Capability             | Certified state                                                                                                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project fields         | Sixteen live fields. `Status`, `Track`, `Priority`, and `Execution Mode` expose the exact ordered policy vocabularies.                                                                                                                                                             |
| Project views          | The five required views exist with the exact filters, layouts, fields, grouping, and sorting: `🎯 Delivery`, `🚀 Ready Candidates`, `🧭 By Track`, `🧭 Intake & Backlog`, and `✅ Done`.                                                                                           |
| Project workflows      | Only `Auto-add sub-issues to project` and `Item added to project` are enabled. The broad issue, pull-request, and lifecycle automations remain disabled.                                                                                                                           |
| Native issue types     | Exactly `Action`, `Bug`, `Epic`, `Feature`, and `Tech` are enabled with the governed colors and descriptions.                                                                                                                                                                      |
| Labels                 | The live repository has exactly the 55 labels defined by the Blockout taxonomy, including exact names, colors, and descriptions.                                                                                                                                                   |
| Issue templates        | Five templates map exactly to the five native types and link to the live Roadmap. The four executable types require acceptance criteria, dependencies, and a Workset. The Epic template correctly remains an unassigned, non-executable native sub-issue rollup without a Workset. |
| Workflow syntax        | All three workflow files parse successfully: `ci-pr.yml`, `ci-push.yml`, and `format.yml`.                                                                                                                                                                                         |
| Merge settings         | Default branch `develop`; merge commits enabled; squash, rebase, and auto-merge disabled; automatic branch deletion disabled.                                                                                                                                                      |
| Open pull requests     | No unrelated open pull request remained at the end of the disposable validation.                                                                                                                                                                                                   |
| Protection enforcement | GitHub returns HTTP 403 with the private-plan upgrade requirement for both branch protection and repository rulesets. The documented fail-closed release policy therefore remains the enforceable guard available to this private repository.                                      |

The Ready Candidates view orders Priority ascending, then Track ascending. The policy's final issue-number tiebreak is
applied by the compact discovery calculation because the Project view does not expose a third issue-number sort.

## Live Behavioral Matrix

| Invariant                                  | Live evidence                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic selection and Epic exclusion | Two complete snapshots matched with SHA-256 `51ed1a3e1518c65978ca7165adb716211d7685e04b9dfa9102ddbba540b90512`. The Ready order was Foundation/High `#19`, then Platform/High `#14`, `#15`, `#16`, then Platform/Normal `#17`; Epic `#13` was excluded.                                                       |
| Partial-claim recovery                     | An assignment-only partial claim on `#16` was detected, released, and followed by two matching unassigned Ready snapshots with SHA-256 `287b79069c4fc4f3d0b5ac964f525490f5b57dc74ca019f94bc456776901d032`.                                                                                                    |
| Disjoint Ready-drain claims                | Workers `#14` and `#15` acquired disjoint Worksets in separate fresh worktrees. Their stable claim snapshot hashes were `ed17ca9f788e5f82cec94af6c23ccfc1f97f8d0a472c52141b271ddf21f2e5f9` and `1362ab6f360336ff348e69ec78057588a3c15730f7abc7854a9e4eb229243e55`.                                            |
| Conflicting Workset exclusion              | Probe `#16` shared worker A's write lock and was excluded while worker A owned it. A deliberately simultaneous later claim lost to the earlier active assignment event and recovered to stable unassigned Ready state with SHA-256 `bc0b52e5938ab40142c7e97127be64684483ae7bc77e0359f796438a64cf0902`.        |
| Scope expansion                            | Worker A expanded its visible Workset to one new disjoint path before access. A second attempted expansion onto worker B's active lock was rejected without touching that path.                                                                                                                               |
| Same-login review reservations             | Workers `#14` and `#15` coexisted in `In Review`, each with one assignee and one structurally linked draft pull request. Their stable combined snapshot hash was `110735caeafcf63d39bc313cf911481162a674babfa7ee2ef9cb107569a56b0b`.                                                                          |
| Resume                                     | Both worker worktrees, branch heads, clean states, draft pull requests, claims, and structural links were reconstructed from Git and GitHub state after interruption.                                                                                                                                         |
| `PLAN_REQUIRED` gate                       | Probe `#17` remained unassigned and produced no branch, edit, commit, or pull request without current-user plan approval. It was excluded from default Ready-drain execution and then terminally rejected.                                                                                                    |
| Dependency unlock                          | `#18` remained natively blocked by worker A. After `#14` closed, its blocker relationship was reread and its complete Ready contract was validated before moving it from `Blocked` to `Ready`; it was then terminally rejected without execution.                                                             |
| Epic rollup                                | Native Epic `#13` remained unassigned and unclaimable, rolled to `In Progress` from active children `#14/#15`, then reconciled to `Rejected / Replaced` after both children closed `Not planned`.                                                                                                             |
| Merge selection                            | With two open draft validation pull requests and no eligible ready pull request, the merge runbook performed a no-op. Pull-request and remote-reference state stayed byte-identical with SHA-256 `8f1a880ba1e8f464e5042a186a4cfb70170e3425a824a5efbc2af3f58e4d8c48`; neither validation branch was refreshed. |

## Ready-Drain Publication And Cleanup

The two disposable workers published isolated artifacts only:

| Worker | Commit                                     | Draft pull request                                         | Terminal outcome     |
| ------ | ------------------------------------------ | ---------------------------------------------------------- | -------------------- |
| `#14`  | `11bf5f598018ad300aaa92ba4dba8e1eaf32c423` | [#20](https://github.com/blockoutproject/blockout/pull/20) | Closed without merge |
| `#15`  | `59860b74f49d3aa96e8213f665f1e397cc16ca51` | [#21](https://github.com/blockoutproject/blockout/pull/21) | Closed without merge |

Both remote task branches were verified unchanged before deletion. Their local branches and dedicated worktrees were
then removed. No branch matching the disposable issue numbers remains locally or remotely. Unrelated pre-existing
worktrees and branches were preserved.

Issues `#13` through `#19` are all closed with reason `Not planned`, unassigned, and
`Rejected / Replaced`. No draft Project item, active disposable claim, open disposable pull request, or merged
validation file remains.

Two consecutive normalized final reads matched:

- Project item state SHA-256: `fbc0a6904585247262d82d1bc7db9b389e5b7a1bcea3f726a44735e333a5b6fe`.
- Issue lifecycle state SHA-256: `a27d713bf651d7ba6ba11afd448331f0943cea8d70102b1c8bb2af4c0b6b9240`.

At the end of the disposable validation, the pre-publication state contained one ordinary active claim: GIT-010 `#9`,
assigned to the authenticated user in `In Progress`. GIT-011 `#10` and GIT-012 `#11` were then open, unassigned, and
natively `Blocked`. Their later lifecycle evidence is recorded in the
[Roadmap source-of-truth certification](github-roadmap-source-of-truth-certification.md).

## CI Evidence

The real GIT-009 canary pull request [#12](https://github.com/blockoutproject/blockout/pull/12) exercised the authorized
merge-commit path into `develop`. Its post-merge head
`c1fca2759103ae81890783df4f671be2d0d3b0ef` passed:

- [Format run 30092719954](https://github.com/blockoutproject/blockout/actions/runs/30092719954), including
  `npm run format:check`.
- [CI Push run 30092720151](https://github.com/blockoutproject/blockout/actions/runs/30092720151), including successful
  `contracts`, `backend`, `python`, and `frontend` jobs.

This proves the repository's merged integration head is checked across OpenAPI generation, Java compilation, Python
client generation and tests, Python scraper lint/syntax/tests, mobile generation/lint/typecheck/tests/export, and
repository formatting.

## Publication Evidence

The certification's repository publication, structural pull-request link, review reservation, authorized merge, final
issue closure, dependent reconciliation, and post-merge CI evidence are retained on
[GIT-010 issue #9](https://github.com/blockoutproject/blockout/issues/9) and
[pull request #22](https://github.com/blockoutproject/blockout/pull/22). GIT-010 is `Done`, closed as completed, and
unassigned after merge commit `b6c1f58512fac8e7e3a137c0309bde2e47a682f9`; its post-merge Format and CI Push runs
completed successfully.
