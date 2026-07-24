# GitHub Roadmap Governance

Read this reference only for Roadmap structure, fields, Tracks, priorities, views, workflows, migrations, or governance
validation. Ordinary task operations use [`github-roadmap-operations.md`](github-roadmap-operations.md).

## Source Ownership

| Question                                                  | Authority                                              |
| --------------------------------------------------------- | ------------------------------------------------------ |
| Tasks, Status, Track, Priority, Execution Mode, ownership | Roadmap Project                                        |
| Compatibility and reservations                            | Live Project items plus issue worksets                 |
| Objective, acceptance, dependencies, evidence             | Issue, native relationships, comments, linked PR       |
| Product and architecture boundaries                       | `docs/current/**`, current source, and accepted issues |
| Delivered history                                         | Closed issues, merged PRs, task evidence, Git history  |
| Deferred ideas                                            | Relevant source outside the Project until promoted     |

No draft item, parallel Markdown ledger, reusable hard-coded ID, or hidden claim store may compete with the Project.

## Fields

The lifecycle `Status` options, in order, are:

1. `Triage`
2. `Backlog`
3. `Ready`
4. `In Progress`
5. `In Review`
6. `Done`
7. `Blocked`
8. `Rejected / Replaced`

The ordered Track vocabulary is `ACC`, `CMP`, `ING`, `FIG`, `Foundation`, and `Platform`, with ownership and identifier
prefixes defined in [`github-taxonomy.md`](github-taxonomy.md). Track follows the primary outcome rather than touched
paths, does not reserve files, and never decides conflicts.

Priority is mandatory on every accepted non-Epic item in `Backlog`, `Ready`, `In Progress`, `In Review`, or `Blocked`:
`High`, `Normal`, then `Low`. `Triage` alone may omit it. Priority orders compatible candidates and is not effort or
severity. Equal priority uses live Track order then issue number.

Resolve a missing accepted-item priority from explicit issue, parent, or accepted Roadmap evidence. Inherit only when
all comparable accepted siblings have one value; otherwise use `Normal` as the explicit fallback. Never overwrite an
existing priority without human direction or deterministic source evidence.

Execution Mode options are `DEFAULT_EXECUTION` and `PLAN_REQUIRED` as defined by lifecycle.

Resolve Project, node, field, option, issue-type, relationship, view, and workflow IDs live by name. A recovery
snapshot may retain ephemeral IDs as evidence, but reusable repository files may not.

## Tool Boundaries

- Use `gh api graphql` for Project metadata, fields, items, views, workflows, native issue types and relationships,
  assignment events, and cross-reference evidence.
- Use dedicated `gh` commands or REST for issue, PR, label, repository, and branch operations.
- Use an authenticated browser only for an authorized Project configuration detail that GraphQL cannot expose or
  mutate.
- Missing permissions or fields are failed preconditions, not authority to guess.

Immediately before a structural mutation, resolve the live Project and exact target by name. Reread the affected state
afterward. Operational reuse of IDs follows the freshness rules in operations.

## Views

GIT-005 reproduces this baseline:

| View                  | Filter                                                      | Presentation                                          |
| --------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| `🎯 Delivery`         | `status:Ready,"In Progress","In Review",Blocked -type:Epic` | Board grouped vertically by Status                    |
| `🚀 Ready Candidates` | `status:Ready -type:Epic`                                   | Table sorted by Priority then live Track order        |
| `🧭 By Track`         | `-status:Done -type:Epic`                                   | Table grouped by Track and sorted by Status           |
| `🧭 Intake & Backlog` | `status:Triage,Backlog,Blocked -type:Epic`                  | Table grouped by Status                               |
| `✅ Done`             | `status:Done`                                               | Table grouped by Track and sorted by Closed ascending |

Show Priority, Track, Execution Mode, labels, assignees, linked PRs, and sub-issue progress where relevant. Keep only
the workflows that auto-add native sub-issues and set newly added items to `Triage`. Disable broad issue/PR auto-add
and automatic lifecycle transitions.

Treat view filters, layout, grouping, sorting, visible fields, and workflow enabled state as live configuration. Use
GraphQL when exposed and an authenticated browser only for an authorized unexposed operation.

## Migration Safety

A Project schema or bulk-state migration requires one claimed governance issue whose external lock reserves the
Project. Before mutation:

1. Establish the issue and recovery owner.
2. Capture a complete paginated recovery snapshot of fields, options, items, values, assignees, relationships, views,
   workflows, repository settings, labels, and issue types.
3. Record intended mutations, invariants, and rollback order on the issue.
4. Stabilize paginated decision-bearing connections with two matching reads, stopping after three unstable attempts.
5. Mutate one bounded capability and reread it before continuing.

On interruption, compare live state to the snapshot and resume only at the first uniquely determined missing
postcondition. Ambiguity stops for human recovery. Never acquire ordinary work during unresolved governance migration.

## Governance Validation

After structural changes, prove:

- one Tech issue moves through creation, `Triage`, accepted state, claim, draft PR, `In Review`, and terminal cleanup;
- a conflicting workset is excluded while disjoint work remains selectable;
- one login may retain multiple compatible, structurally linked `In Review` reservations while ordinary acquisition
  owns no more than one `In Progress` issue;
- Epics are never executable claims;
- Ready and active-claim views agree with live fields;
- configured workflows preserve lifecycle invariants;
- repository merge settings and CI gates match policy; and
- documentation links, terminology, compact reads, formatting, and Git diff checks pass.
