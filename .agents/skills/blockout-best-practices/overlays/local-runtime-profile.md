# Blockout Local Runtime Profile

This overlay supplies the exact runtime and release-smoke topology to the portable local runtime policy.

- Third-party Compose: `infra/compose/docker-compose.third-party.yml`
- Application Compose: `infra/compose/docker-compose.app.yml`
- Compose project: `blockout`
- Required infrastructure: PostgreSQL, RabbitMQ, Elasticsearch, and pgAdmin
- Required applications: every Java service and worker, both Python scrapers in safe local mode, Metro, and the
  installed Expo development client
- Scraper gates: `SCRAPER` and `SCRAPER_CLUBS`
- Identity proof: visible Auth0 login, protected mobile-to-gateway flow, and sign-out with a supported test identity
- Mobile platforms: iOS and Android
- Visual capture authority: iOS simulator
- Metro port: `8100`
- `pools-service` application port: `8081`

The complete release smoke uses both Compose definitions, the full application topology, the authenticated flow, and
head-bound cleanup evidence.

A candidate that passes the portable documentation-only release classification does not use this runtime smoke.
Its Blockout release proof is the applicable documentation validation, guidance-consistency walk-through, GitHub
checks, review evidence, exact-head binding, and explicit human release authorization. Any code, test, contract,
generated, dependency, configuration, executable, automated-workflow, binary, ambiguous, or mixed diff uses the
complete runtime smoke above.
