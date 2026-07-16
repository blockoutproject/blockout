# Runbooks

Runbooks are reusable procedures. They do not own task state or production authorization.

## Task Workflows

- [`tasks/discovery.md`](tasks/discovery.md): read-only task discovery after GitHub Roadmap activation.
- [`tasks/acquisition.md`](tasks/acquisition.md): claim a configured Roadmap task after activation.
- [`tasks/execution.md`](tasks/execution.md): execute approved work through validation and publication after activation.
- [`tasks/ready-drain.md`](tasks/ready-drain.md): drain compatible Ready tasks after activation.
- [`tasks/merge.md`](tasks/merge.md): merge only after explicit authorization and current evidence.

These GitHub workflows are dormant during local migration-roadmap mode. Use
[`../current/blockout-active-roadmap.md`](../current/blockout-active-roadmap.md) until Phase MRG-1000.

## Audit and Execution Pairs

- [`workspace-architecture/`](workspace-architecture/): monorepo structure and Nx/Maven/Expo/Docker alignment.
- [`environment-configuration/`](environment-configuration/): environment contract completeness and secret safety.
- [`application-logging/`](application-logging/): logging quality and sensitive-data safety.
- [`completed-tasks/`](completed-tasks/): verify delivered claims against source and evidence.

Audits are read-only. Their execution partner must revalidate every finding and preserve a real no-op outcome.
