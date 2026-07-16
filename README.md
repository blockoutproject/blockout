# BlockOut

BlockOut is an Nx monorepo for the mobile application, Spring Boot services, Python scrapers, and local platform tooling.

The workspace intentionally follows the same structural conventions as Maaatch: deployable applications live under `apps`, Spring Boot services form a Maven reactor, frontend applications use the relevant Nx plugin, and non-plugin applications are declared with explicit Nx projects.

## Requirements

- Node.js 22 and npm 10 or later
- Java 21 and Maven 3.9 or later
- Python 3.12 for local scraper development
- Docker for scraper images and local platform tooling

## Workspace

```text
apps/
  backend/
    clubs-service/
    competition-service/
    config-service/
    matches-service/
    mobile-gateway/
    notification-service/
    pools-service/
    reports-service/
    search-service/
    search-worker/
    teams-service/
    users-service/
  frontend/
    mobile/
  scrapers/
    club-scraper/
    competition-scraper/
infra/
  compose/
    docker-compose.app.yml
    docker-compose.third-party.yml
```

## Install and inspect

```bash
npm ci
npm exec nx show projects
```

Each deployable owns a safe `.env.example`. Run `npm run validate:env` to verify that every runtime variable
referenced by Spring, Python, Expo, or Compose is documented.

## Backend

The root Maven reactor and the backend parent POM mirror the Maaatch Maven integration pattern. Nx discovers every Maven module through `@nx/maven`.

```bash
mvn -f apps/backend/pom.xml -DskipTests compile
npm exec nx show project com.blockout:clubs-service
docker build --file apps/backend/clubs-service/Dockerfile --tag blockout-shadow/clubs-service:local apps/backend
```

Backend Dockerfiles use `apps/backend` as their build context so each service can resolve the shared Maven parent POM.

## Mobile application

The Expo SDK 54 application is located at `apps/frontend/mobile` and is inferred by `@nx/expo`.

```bash
npm exec nx run @blockout/mobile:typecheck
npm exec nx run @blockout/mobile:export --platform=android
npm exec nx run @blockout/mobile:start
```

Native Google Services configuration is injected through `GOOGLE_SERVICES_JSON`; the credential file is not stored in Git.

## Scrapers

The scrapers intentionally use explicit Nx projects rather than a Python plugin.

```bash
npm exec nx run @blockout/competition-scraper:syntax-check
npm exec nx run @blockout/club-scraper:syntax-check
npm exec nx run @blockout/competition-scraper:docker-build
npm exec nx run @blockout/club-scraper:docker-build
```

## Local platform

All local Docker orchestration is centralized under `infra/compose`, following the Maaatch split between application
databases and third-party dependencies.

```bash
cp infra/compose/.env.example infra/compose/.env
npm exec nx run @blockout/local-platform:config
npm exec nx run @blockout/local-platform:serve
```

## Production migration

This repository does not own production deployments yet. Existing repositories remain authoritative until each deployable is cut over independently and verified. See [the monorepo cutover runbook](docs/migration/monorepo-cutover.md).

## Agentic operation

Agents start with [`AGENTS.md`](AGENTS.md), [Blockout Best Practices](.agents/skills/blockout-best-practices/SKILL.md),
and the [current agent brief](docs/current/blockout-agent-brief.md). The [documentation index](docs/README.md) routes
architecture, migration, audit, execution, and GitHub workflow tasks.
