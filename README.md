# Blockout

Blockout is a volleyball companion application that collects FFVB and LNV competition data and exposes it through an
Expo mobile application. This repository contains the complete application as one Nx monorepo while preserving each
ecosystem's native toolchain.

## Architecture

```text
apps/
  backend/   Spring Boot services, workers, gateway, and Python scrapers
  frontend/  Expo and React Native mobile application
libs/shared/
  contracts/ OpenAPI sources and ignored generated bundles
  python-contract-clients/ Ignored generated Python models and HTTPX clients
infra/
  compose/   Local PostgreSQL, RabbitMQ, Elasticsearch, and pgAdmin services
docs/        Architecture records, completed refactor evidence, and runbooks
```

Nx 23 provides the project graph and task orchestration. Maven remains authoritative for Java, uv for Python, Expo for
the mobile application, and Docker Compose for local infrastructure. OpenAPI Generator and Orval produce transport
models and clients from the V1 contracts; generated sources remain outside Git.

## Prerequisites

- Node.js 22 and npm 10
- Java 21 and Maven 3.9
- Python 3.12 and uv 0.11.29
- Docker with Compose
- Xcode or Android Studio only for native mobile builds

## Bootstrap

Install the JavaScript and Python workspaces, inspect the Nx projects, and build the backend:

```bash
npm ci
uv sync --locked --all-packages
npm exec -- nx run @blockout/contracts:generate-openapi-bundles
npm exec -- nx show projects
mvn -f pom.xml clean package -DskipTests
```

Each deployable application owns a safe `.env.example`. Copy only the applications you want to run to an ignored
`.env.local`, then replace the documented `replace-me` values with development credentials. Never commit local
environment files, tokens, private keys, or production data.

Start the shared local infrastructure under the stable `blockout` Compose project:

```bash
docker compose --project-name blockout \
  -f infra/compose/docker-compose.app.yml \
  -f infra/compose/docker-compose.third-party.yml \
  up -d
```

Application processes run outside Compose through their native commands or Nx targets. Inspect the owning project with
`npm exec -- nx show project <project-name>` before starting a process.

## Verification

```bash
npm run format
npm exec -- nx run @blockout/contracts:test
npm exec -- nx run @blockout/club-scraper:test
npm exec -- nx run @blockout/competition-scraper:test
npm exec -- nx run @blockout/mobile:typecheck
npm exec -- nx run @blockout/mobile:test
mvn -f pom.xml test
npm run format:check
```

`npm run format` is the canonical formatter for the complete repository: Prettier handles JavaScript, TypeScript, JSON,
YAML, and Markdown; Spotless with google-java-format handles Java; and Ruff handles Python. Editors may run these tools
on save, but repository commands remain authoritative for agents and contributors.

See the [documentation index](docs/README.md), the
[live Roadmap](https://github.com/orgs/blockoutproject/projects/4), and the
[Blockout V1 baseline](docs/releases/blockout-v1-baseline.md).

## Security

Use [SECURITY.md](SECURITY.md) to report a vulnerability privately. OAuth client IDs and the mobile Google service
configuration are public application identifiers; OAuth client secrets, provider credentials, signing keys, and user
credentials must never be committed.

## License

No open-source license is currently granted. A clean snapshot can be published for inspection, but reuse and
redistribution remain reserved until the owner explicitly selects and adds a license.
