# Blockout Monorepo Architecture

## Layout

```text
apps/
  backend/                 Maven multi-module Spring Boot reactor
  frontend/mobile/         Nx Expo application
  scrapers/                Explicit Nx Python deployables
infra/
  compose/                 Central local Docker orchestration
docs/                      Current context, architecture, migration, runbooks
tools/scripts/             Repository validation and maintenance scripts
```

## Ownership

- Root npm and lockfile own JavaScript tooling and Expo dependencies.
- Root Maven POM aggregates `apps/backend`.
- Backend parent POM owns Java 21 and Spring Boot dependency management.
- Each deployable owns source, Dockerfile, runtime configuration, and `.env.example`.
- `infra/compose/docker-compose.app.yml` owns local application databases.
- `infra/compose/docker-compose.third-party.yml` owns shared local dependencies.

## Nx Integration

- `@nx/maven` infers Maven modules.
- `@nx/expo/plugin` infers Expo targets.
- Scrapers and infrastructure use explicit `project.json` files.
- Nx provides the stable command surface; framework-native tools remain authoritative inside targets.

## Non-goals

- No service merge or database merge.
- No contract or endpoint redesign.
- No package-architecture rewrite during migration.
- No production deployment consolidation before per-deployable cutover.
