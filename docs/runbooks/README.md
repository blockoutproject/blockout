# Runbooks

Runbooks are reusable procedures. They do not own task state or production authorization.

## Task Workflows

- [`tasks/execution.md`](tasks/execution.md): select the next local roadmap task, execute and validate it, record its
  evidence, commit it, and push it directly to `main`.

This is the only active task workflow during migration. GitHub acquisition, branch, pull-request, ready-drain, and
merge runbooks return only when Phase MRG-1000 activates the final Maaatch GitFlow.

## Audit and Execution Pairs

- [`workspace-architecture/`](workspace-architecture/): monorepo structure and Nx/Maven/Expo/Docker alignment.
- [`environment-configuration/`](environment-configuration/): environment contract completeness and secret safety.
- [`application-logging/`](application-logging/): logging quality and sensitive-data safety.
- [`completed-tasks/`](completed-tasks/): verify delivered claims against source and evidence.

Audits are read-only. Their execution partner must revalidate every finding and preserve a real no-op outcome.
