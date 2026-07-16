# GitHub Roadmap Governance

> Migration status: dormant until Phase MRG-1000 in `docs/current/blockout-active-roadmap.md`. The local roadmap remains authoritative and these GitHub rules must not be activated early.

Read this reference only for Roadmap Project structure, fields, tracks, priorities, views, workflows, migrations, or
governance validation. Ordinary task operations use
[`github-roadmap-operations.md`](github-roadmap-operations.md).

## Source Ownership

| Question                                                  | Authoritative source                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Tasks, status, Track, Priority, Execution Mode, ownership | Roadmap Project                                                          |
| Compatibility and reservations                            | Live Project items plus issue worksets                                   |
| Objective, acceptance, dependencies, evidence             | Issue, native relationships, comments, linked PR                         |
| Product and architecture boundaries                       | `docs/architecture/**`, `docs/decisions/**`, current source              |
| Delivered history                                         | Closed issues, merged PRs, Git history                                   |
| Deferred ideas                                            | Relevant architecture/decision source outside the Project until promoted |

No draft items, parallel Markdown ledger, hard-coded reusable IDs, or hidden claim store may compete with the Project.

## Fields

The lifecycle `Status` options are `Triage`, `Backlog`, `Ready`, `In Progress`, `In Review`, `Blocked`, `Done`, and
`Rejected / Replaced`.

Track options are `SET`, `CMP`, `PUB`, `FIG`, `Foundation`, and `Platform`. Use `Platform` for GitHub, CI, developer
tooling, repository workflow, and governance.

Priority is mandatory for every accepted non-Epic item in `Backlog`, `Ready`, `In Progress`, `In Review`, or
`Blocked`: `High`, `Normal`, then `Low`. Only `Triage` may omit it. Priority orders compatible candidates; it is not
effort or severity. Same-priority candidates use the live Track option order then issue number. Resolve a missing
accepted-item priority from an explicit issue, parent, or accepted Roadmap source; otherwise inherit it only when all
comparable accepted siblings have one value, then use `Normal` as the explicit fallback. Never rewrite an existing
priority without explicit human direction or deterministic repository evidence.

Execution Mode options are `DEFAULT_EXECUTION` and `PLAN_REQUIRED` as defined by the lifecycle reference.

Resolve node, field, option, issue-type, relationship, view, and workflow IDs live by name. A migration recovery
snapshot may record ephemeral IDs as evidence, but reusable files must never retain them.

## Tool Boundaries

Use `gh api graphql` for Project metadata, fields, items, views/workflows, native issue types and relationships,
assignment events, and cross-reference evidence. Use the browser only for configuration or mutation GitHub does not
expose through GraphQL. Missing permissions or fields are failed preconditions, not permission to guess or switch to an
unverified mutation path.

For a structural governance mutation, query the live Project and exact field/option by name immediately before the
operation and reread the affected state afterward. Operational workflows may reuse IDs only within the freshness
contract owned by the operations reference.

## Views

Maintain this baseline unless an accepted governance task explicitly changes it:

| View                  | Filter                                                      | Presentation                                                                        |
| --------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `🎯 Delivery`         | `status:Ready,"In Progress","In Review",Blocked -type:Epic` | Board grouped by Status                                                             |
| `🚀 Ready Candidates` | `status:Ready -type:Epic`                                   | Table sorted by Priority and live Track order; issue number breaks ties client-side |
| `🧭 By Track`         | `-status:Done -type:Epic`                                   | Table grouped by Track and sorted by Status                                         |
| `🧭 Intake & Backlog` | `status:Triage,Backlog,Blocked -type:Epic`                  | Table grouped by Status                                                             |
| `✅ Done`             | `status:Done`                                               | Table grouped by Track and sorted by Closed ascending                               |

Show `Priority`, `Track`, `Execution Mode`, labels, assignees, and linked PRs where relevant. Keep only the automated
workflows that auto-add native sub-issues and set newly added items to `Triage`; disable the broad open issue/PR
auto-add rule and keep lifecycle transitions agent-controlled.

Treat view filters, grouping, sorting, visible fields, and workflow enabled state as live configuration. Read them
through GraphQL when exposed and use an authenticated browser only for unexposed details or authorized changes.

## Migration Safety

Project schema or bulk-state migration requires one claimed governance issue whose external lock reserves the Project.
Before mutation:

1. establish issue and recovery owner;
2. capture a complete paginated recovery snapshot of fields/options, items/values, assignees, relationships, views,
   workflows, and repository issue types;
3. record intended mutations, invariants, and rollback order in the governance issue;
4. stabilize paginated decision-bearing connections with two matching complete reads, stopping after three unstable
   attempts;
5. mutate one bounded capability at a time and reread it.

On interruption, compare live state with the recovery snapshot and resume only at the first uniquely determined
missing postcondition. Ambiguity stops for human recovery. Never run ordinary task acquisition during an unresolved
Project migration.

## Governance Validation

After structural changes, prove:

- one Tech issue can move through create, `Triage`, accepted state, claim, draft PR, `In Review`, and terminal cleanup;
- one conflicting workset is excluded while disjoint work remains selectable;
- one login can retain multiple compatible, structurally linked `In Review` reservations while owning no more than one
  `In Progress` issue, and a conflicting Ready candidate remains unavailable;
- Epics never become executable claims;
- Ready/active-claim views agree with live field values;
- every configured workflow preserves lifecycle invariants; and
- documentation links, terminology, compact Project reads, and Git diff checks pass.
