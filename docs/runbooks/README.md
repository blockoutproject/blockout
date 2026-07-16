# Runbooks

Runbooks are reusable procedures. They do not own task state or production authorization.

## Task Workflows

- `tasks/discovery.md`: read-only task discovery.
- `tasks/acquisition.md`: claim a configured Roadmap task.
- `tasks/execution.md`: execute approved work through validation and publication.
- `tasks/merge.md`: merge only after explicit authorization and current evidence.

## Audit and Execution Pairs

- `workspace-architecture/`: monorepo structure and Nx/Maven/Expo/Docker alignment.
- `environment-configuration/`: environment contract completeness and secret safety.
- `application-logging/`: logging quality and sensitive-data safety.
- `completed-tasks/`: verify delivered claims against source and evidence.

Audits are read-only. Their execution partner must revalidate every finding and preserve a real no-op outcome.
