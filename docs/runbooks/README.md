# Runbooks

Runbooks are reusable procedures. They do not own task state, product decisions, or delivery history.

## Task Workflows

- [`tasks/discovery.md`](tasks/discovery.md): read-only selection of the next executable task.
- [`tasks/acquisition.md`](tasks/acquisition.md): selection and immediate reservation of the next executable task.
- [`tasks/execution.md`](tasks/execution.md): execution of an approved task through validation and GitFlow.
- [`tasks/ready-drain.md`](tasks/ready-drain.md): orchestration of compatible Ready work into separate tasks and draft
  pull requests.
- [`tasks/merge.md`](tasks/merge.md): deterministic full-stack release train for the authorized non-draft PR snapshot.
- [`mobile/visual-validation.md`](mobile/visual-validation.md): simulator, native, and Figma evidence for an owning
  mobile execution.

These workflows use the compact Roadmap reader and the split operations, lifecycle, governance, taxonomy, and Git
workflow references from the Blockout best-practices skill.

## Audit And Execution Pairs

| Domain                                      | Audit                                                        | Execution                                                            |
| ------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Application logging                         | [`audit.md`](application-logging/audit.md)                   | [`execution.md`](application-logging/execution.md)                   |
| Completed tasks                             | [`audit.md`](completed-tasks/audit.md)                       | [`execution.md`](completed-tasks/execution.md)                       |
| Auth0 authentication flow                   | [`audit.md`](auth0-auth-flow/audit.md)                       | [`execution.md`](auth0-auth-flow/execution.md)                       |
| Expo / React Native / TypeScript complexity | [`audit.md`](expo-react-native-typescript-overkill/audit.md) | [`execution.md`](expo-react-native-typescript-overkill/execution.md) |
| Native component usage                      | [`audit.md`](native-component-usage/audit.md)                | [`execution.md`](native-component-usage/execution.md)                |
| Python complexity                           | [`audit.md`](python-overkill/audit.md)                       | [`execution.md`](python-overkill/execution.md)                       |
| Workspace architecture                      | [`audit.md`](workspace-architecture/audit.md)                | [`execution.md`](workspace-architecture/execution.md)                |

An audit is read-only while it inspects the repository and gathers evidence. It may publish a deduplicated Roadmap
finding only after the audit explicitly separates observation from publication. Its paired execution revalidates every
finding before editing and preserves a real no-op result. Ordinary Roadmap work continues to use the task execution
runbook.

## Invariants

- An audit remains read-only until its separate finding-publication phase.
- An execution runbook preserves a real no-op result when current source no longer supports a finding.
- Runbooks never replace Project status, issue Worksets, durable decisions, current source, or completion evidence.
- Do not add a flat catch-all procedure when one domain folder can own the reusable operation.
