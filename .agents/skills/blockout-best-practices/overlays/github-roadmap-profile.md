# Blockout GitHub Roadmap Profile

This overlay supplies repository-specific Project values to the portable Roadmap governance policy.

## Operational Coordinates

- Authenticated CLI: `gh`
- Complete read-only Project helper:
  `.agents/skills/blockout-best-practices/scripts/read-roadmap-project.sh`
- Issue and pull-request reads: `gh issue view` and `gh pr view`
- Project and relationship mutations: `gh api graphql`
- Issue, pull-request, label, repository, and branch mutations: dedicated `gh` commands or REST
- Local repository reads and validation run inside the managed checkout; network operations and `.git` writes use the
  environment-authorized path on their first attempt.

## Track Routing

The ordered Track vocabulary is `ACC`, `CMP`, `ING`, `FIG`, `Foundation`, and `Platform`. Ownership and identifier
prefixes are defined in [`github-taxonomy.md`](github-taxonomy.md).

## Views And Workflows

GIT-005 reproduces this baseline:

| View                  | Filter                                                      | Presentation                                          |
| --------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| `🎯 Delivery`         | `status:Ready,"In Progress","In Review",Blocked -type:Epic` | Board grouped vertically by Status                    |
| `🚀 Ready Candidates` | `status:Ready -type:Epic`                                   | Table sorted by Priority then live Track order        |
| `🧭 By Track`         | `-status:Done -type:Epic`                                   | Table grouped by Track and sorted by Status           |
| `🧭 Intake & Backlog` | `status:Triage,Backlog,Blocked -type:Epic`                  | Table grouped by Status                               |
| `✅ Done`             | `status:Done`                                               | Table grouped by Track and sorted by Closed ascending |

Show Priority, Track, Execution Mode, labels, assignees, linked pull requests, and sub-issue progress where relevant.
Keep only the workflows that auto-add native sub-issues and set newly added items to `Triage`. Disable broad issue or
pull-request auto-add and automatic lifecycle transitions.
