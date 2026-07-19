# Blockout

Blockout is an Nx monorepo that keeps each application on its native toolchain.

- Java backend applications use Maven.
- The mobile application uses Expo.
- Python scrapers use Python 3.12 and their own runtime dependencies.
- Local databases and shared dependencies use Docker Compose.

Nx provides one project graph without replacing Maven, Expo, Python, or Docker.

## Structure

```text
apps/
  backend/   Java services, workers, gateway, and Python scrapers
  frontend/  Expo mobile application
infra/
  compose/   Local application databases and shared third-party services
docs/        Current baseline, roadmap, and runbooks
```

## Start here

```bash
npm ci
npm exec nx show projects
mvn -f pom.xml clean package -DskipTests
```

Local infrastructure is split into two Compose files:

```bash
docker compose \
  -f infra/compose/docker-compose.app.yml \
  -f infra/compose/docker-compose.third-party.yml \
  up -d
```

Application processes run outside Compose through their native commands or Nx targets. See [local development](docs/runbooks/local-development.md), the [source baseline](docs/current/source-baseline.md), and the [roadmap](docs/current/roadmap.md).
