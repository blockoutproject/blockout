# BlockOut

BlockOut is an Nx monorepo for the mobile application, backend services, workers, scrapers, and infrastructure tooling.

The repository is being introduced alongside the existing production repositories. Production deployments remain owned by the existing repositories until each deployable is explicitly migrated and verified.

## Requirements

- Node.js 22
- npm 11
- Java 21 for backend services

## Workspace

```text
apps/
  frontend/
    mobile/     Expo application
  backend/      Spring Boot services (planned)
  scrapers/     Python scrapers (planned)
infra/          Local and deployment infrastructure (planned)
```

## Mobile application

The generated mobile shell is intentionally pinned to Expo SDK 54 to match the current production application during the monorepo migration.

```bash
npm install
npm exec -- nx run @blockout/mobile:typecheck
npm exec -- nx export @blockout/mobile --platform=web
npm exec -- nx start @blockout/mobile
```

Native commands require the corresponding local toolchain:

```bash
npm exec -- nx run @blockout/mobile:run-ios
npm exec -- nx run @blockout/mobile:run-android
```

## Deployment safety

- This repository must not trigger production deployments during the import and shadow-build phases.
- Production image names and Dokploy webhooks are migrated one deployable at a time.
- Secrets, service-account files, signing keys, database volumes, and data exports must never be committed.
- A deployable becomes owned by this repository only after its build, health check, rollback path, and Dokploy deployment have been verified.
