# Java Testing Policy

- Preserve existing tests during migration.
- Use the backend reactor for broad validation and a module selector for focused checks.
- Context tests require development-shaped environment configuration; missing external configuration is not evidence of
  a compilation regression.
- Do not replace real integrations with broad mocks as part of workspace migration.
- Add tests only for behavior being changed or when explicitly requested.
- Classify failures caused by unavailable Docker, Auth0, network, database, RabbitMQ, Elasticsearch, or filesystem
  access separately from source regressions.
