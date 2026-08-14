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
docs/        Architecture, current context, durable decisions, and release snapshots
```

Nx 23 provides the project graph and task orchestration. Maven remains authoritative for Java, uv for Python, Expo for
the mobile application, and Docker Compose for local infrastructure. OpenAPI Generator and Orval produce transport
models and clients from the V1 contracts; generated sources remain outside Git.

## Prerequisites

- Node.js 24 and npm 11
- Java 25
- Python 3.14.6 and uv 0.11.32
- Docker with Compose
- Xcode or Android Studio only for native mobile builds

## Verify The Workspace

Install the locked dependencies:

```bash
npm ci
uv sync --locked --all-packages
```

Verify every workspace owner with one command:

```bash
npm run verify
```

The command tests and regenerates the contracts, verifies backend schema-mapping freshness, runs the complete backend
Maven reactor through the root wrapper, builds and tests the shared Python contract-client wheel, verifies both
scrapers, and generates, lints, typechecks, tests, and exports the Expo mobile application. Nx uses local caching while
Maven, uv, and Expo remain authoritative for their own toolchains.

Backend verification uses repository-defined, non-secret test values equivalent to CI; it does not read or replace
local runtime credentials. Run `uv sync` only from the repository root. uv owns the single workspace `.venv`; Nx
orchestrates Python tasks without modifying that environment.

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

Verification does not start Docker Compose, databases, brokers, backend services, scrapers, Metro, simulators, EAS, or
store builds. Application `.env.local` files and service startup remain separate local-runtime steps.

The complete command keeps the focused entry points independently available:

```bash
npm run contracts:test
npm run contracts:generate
npm run contracts:check-mappings
npm run backend:verify
npm run python-clients:verify
npm run scrapers:verify
npm run mobile:codegen
npm run mobile:lint
npm run mobile:typecheck
npm run mobile:test
npm run mobile:export
npm run format
npm run format:check
```

`npm run format` is the canonical formatter for the complete repository: Prettier handles JavaScript, TypeScript, JSON,
YAML, and Markdown; Spotless with google-java-format handles Java; and Ruff handles Python. Editors may run these tools
on save, but repository commands remain authoritative for agents and contributors.

## Continuous Integration

GitHub Actions installs the locked dependencies and runs the same `npm run verify` command used locally. The workflow
contains one verification job; container build and delivery can be introduced independently from this baseline.

See the [documentation index](docs/README.md) and the
[Blockout V1 baseline](docs/releases/blockout-v1-baseline.md).

## Security

Use [SECURITY.md](SECURITY.md) to report a vulnerability privately. OAuth client IDs and the mobile Google service
configuration are public application identifiers; OAuth client secrets, provider credentials, signing keys, and user
credentials must never be committed.

## License

No open-source license is currently granted. A clean snapshot can be published for inspection, but reuse and
redistribution remain reserved until the owner explicitly selects and adds a license.
