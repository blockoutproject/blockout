# Runbooks

Runbooks are reusable procedures. They do not own task state, product decisions, or delivery history.

## Task Workflows

- [`tasks/discovery.md`](tasks/discovery.md): read-only selection of the next executable task.
- [`tasks/acquisition.md`](tasks/acquisition.md): selection and immediate reservation of the next executable task.
- [`tasks/execution.md`](tasks/execution.md): execution of an approved task through validation and GitFlow.
- [`tasks/ready-drain.md`](tasks/ready-drain.md): orchestration of compatible Ready work into separate tasks and draft
  pull requests.
- [`tasks/merge.md`](tasks/merge.md): deterministic release of at most one eligible pull request without modifying
  remaining pull-request branches.

These workflows use the compact Roadmap reader and the split operations, lifecycle, governance, taxonomy, and Git
workflow references from the Blockout best-practices skill.

## Domain Runbooks

Domain runbooks are grouped by responsibility. A read-only recurring audit uses `audit.md`; its paired correction path
uses `execution.md` and must revalidate every finding before editing. Ordinary Roadmap work continues to use the task
execution runbook.

The initial cleaned baseline contains only task workflows. Domain audit and execution pairs are added only when their
scope, evidence rules, deduplication ownership, and scheduled invocation are defined together.

## Invariants

- An audit remains read-only until its separate finding-publication phase.
- An execution runbook preserves a real no-op result when current source no longer supports a finding.
- Runbooks never replace Project status, issue Worksets, durable decisions, current source, or completion evidence.
- Do not add a flat catch-all procedure when one domain folder can own the reusable operation.
