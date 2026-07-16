# Monorepo Migration and Production Cutover

## Objective

Move every BlockOut deployable into the Nx monorepo without interrupting the production deployment path currently owned by the standalone repositories.

The target structure follows Maaatch conventions:

- Spring Boot applications are Maven reactor modules under `apps/backend` and are discovered by `@nx/maven`.
- The Expo application lives under `apps/frontend/mobile` and is discovered by `@nx/expo`.
- Python scrapers live under `apps/scrapers` and use explicit `project.json` files with `nx:run-commands` targets.
- Local platform tooling lives under `infra` and uses an explicit Nx project.

## Repository map

| Standalone repository        | Monorepo path                       | Nx project                          |
| ---------------------------- | ----------------------------------- | ----------------------------------- |
| `blockout-api-clubs`         | `apps/backend/clubs-service`        | `com.blockout:clubs-service`        |
| `blockout-api-competition`   | `apps/backend/competition-service`  | `com.blockout:competition-service`  |
| `blockout-api-config`        | `apps/backend/config-service`       | `com.blockout:config-service`       |
| `blockout-api-matches`       | `apps/backend/matches-service`      | `com.blockout:matches-service`      |
| `blockout-mobile-gateway`    | `apps/backend/mobile-gateway`       | `com.blockout:mobile-gateway`       |
| `blockout-api-notifications` | `apps/backend/notification-service` | `com.blockout:notification-service` |
| `blockout-api-pools`         | `apps/backend/pools-service`        | `com.blockout:pools-service`        |
| `blockout-api-reports`       | `apps/backend/reports-service`      | `com.blockout:reports-service`      |
| `blockout-api-search`        | `apps/backend/search-service`       | `com.blockout:search-service`       |
| `blockout-worker-search`     | `apps/backend/search-worker`        | `com.blockout:search-worker`        |
| `blockout-api-teams`         | `apps/backend/teams-service`        | `com.blockout:teams-service`        |
| `blockout-api-users`         | `apps/backend/users-service`        | `com.blockout:users-service`        |
| `blockout-mobile-app`        | `apps/frontend/mobile`              | `@blockout/mobile`                  |
| `blockout-scraper`           | `apps/scrapers/competition-scraper` | `@blockout/competition-scraper`     |
| `blockout-scraper-clubs`     | `apps/scrapers/club-scraper`        | `@blockout/club-scraper`            |
| `blockout-pgadmin`           | `infra/local-platform`              | `@blockout/local-platform`          |

All imports preserve the committed `main` history of their source repository.

## Current migration stage

- Application histories are imported.
- Nx, Maven, Expo, scraper, and local platform integration is active.
- CI performs shadow validation only.
- No monorepo workflow logs in to Docker Hub, pushes an image, calls a Dokploy webhook, or deploys production.
- Every standalone repository remains the production source of truth until its individual cutover is complete.

At import time, two local uncommitted changes were intentionally not copied into the monorepo:

- `blockout-mobile-gateway/src/main/java/com/blockout/mobilegateway/controllers/v1/publicapi/FfvbPublicController.java`
- `blockout-scraper/scrapers/pro_scraper.py`

These changes must be committed in their source repository or reconciled explicitly before the corresponding final source freeze.

## Shadow validation

The safe validation baseline is:

```bash
npm ci
npm exec nx run @blockout/mobile:typecheck
npm exec nx run @blockout/mobile:export --platform=android
mvn -f apps/backend/pom.xml -DskipTests compile
npm exec nx run @blockout/competition-scraper:docker-build
npm exec nx run @blockout/club-scraper:docker-build
npm exec nx run @blockout/local-platform:config
```

Backend images must use `apps/backend` as their Docker build context. For example:

```bash
docker build --file apps/backend/clubs-service/Dockerfile --tag blockout-shadow/clubs-service:local apps/backend
```

The imported Spring Boot context tests currently require runtime configuration such as `AUTH0_ISSUER`. Until dedicated test profiles are added, shadow CI compiles the full Maven reactor but does not claim that runtime-dependent tests pass.

## Deployment invariants

1. A standalone repository owns production until its cutover checklist is complete.
2. A monorepo push must never deploy every application.
3. Each deployment workflow must be scoped to one deployable and its owned paths.
4. Production images must use an immutable candidate tag before any `latest` promotion.
5. Dokploy webhooks and production credentials must be configured per deployable and must never be committed.
6. Only one deployable is cut over at a time.
7. The old workflow remains available as the rollback path until the new path has been observed successfully.

## Per-deployable cutover checklist

Repeat this sequence independently for each backend service, scraper, and the mobile release workflow:

1. Announce and start a short source freeze for the standalone repository.
2. Verify its clean working tree and compare local `main`, remote `main`, and the imported monorepo history.
3. Reconcile every missing commit and intentional local delta in the monorepo path.
4. Run the deployable's complete local shadow validation.
5. Build and push an immutable candidate image, for example `<image>:monorepo-<git-sha>`, without replacing `latest`.
6. Validate the candidate image with the production environment contract, health endpoint, logs, and dependent services.
7. Add a path-scoped monorepo deployment workflow for that deployable only.
8. Configure its Docker Hub and Dokploy secrets in the monorepo repository.
9. Trigger the first deployment manually and observe health, logs, and primary user flows.
10. If validation fails, redeploy the last standalone image and keep the standalone workflow active.
11. If validation succeeds, promote the verified image, disable the standalone deployment workflow, and record the cutover commit and image digest.
12. Observe at least one normal monorepo deployment before archiving the standalone repository.

## Mobile-specific cutover

The mobile application is not deployed through Dokploy. Its cutover must separately verify EAS project ownership, build profiles, update channels, signing credentials, `GOOGLE_SERVICES_JSON`, and store release procedures. The standalone mobile repository remains the release fallback until an installed monorepo-built binary has been tested on both iOS and Android.

## Completion criteria

The migration is complete only when every deployable has:

- an owned Nx project and repeatable validation command;
- an immutable production artifact built from the monorepo;
- a verified deployment or mobile release path;
- a documented rollback artifact;
- its standalone deployment workflow disabled;
- its standalone repository archived or clearly marked read-only.
