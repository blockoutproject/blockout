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

## Backend Contract And Data Architecture

[`blockout-backend-contract-data-architecture.md`](blockout-backend-contract-data-architecture.md) owns the approved
target separation between source contracts, generated DTOs, application records, domain concepts, JPA entities,
events, mappers, BFF projections, Expo clients, and scraper adapters. Apply it only through the ordered migration
roadmap so current production behavior and deployable boundaries remain stable.

## Nx Integration

- `@nx/maven` infers Maven modules.
- `@nx/expo/plugin` infers Expo targets.
- Scrapers use explicit `project.json` files.
- Local Compose files are intentionally not an Nx project, matching Maaatch.
- Nx provides the stable command surface; framework-native tools remain authoritative inside targets.

## Non-goals

- No service merge or database merge.
- No contract or endpoint redesign.
- No bulk package-architecture rewrite outside the owning migration slice.
- No production deployment consolidation before per-deployable cutover.
