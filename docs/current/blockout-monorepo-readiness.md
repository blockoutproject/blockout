# Blockout Monorepo Readiness

Last verified: 2026-07-16.

## Executive Status

The monorepo is currently a validated build source, not a production deployment source.

- Existing standalone repositories still build and publish production images.
- A standalone `main` push publishes its `blockoutproject/*:latest` image and calls that repository's
  `DOKPLOY_WEBHOOK_URL`.
- A monorepo `main` push only runs shadow CI. It does not log in to Docker Hub, publish an image, or call Dokploy.
- The monorepo GitHub repository currently has no Actions secrets, variables, or environments configured.

Production therefore continues to work through the standalone repositories, but disabling those workflows now would
stop automatic deployments.

## Verified Working

- The Maven reactor compiles all Spring Boot modules.
- All twelve backend Dockerfiles build complete images from the `apps/backend` context.
- Backend runtime images preserve the standalone Java base image, entrypoint, and exposed port.
- Both scraper images build and exclude runtime `.env` files.
- Mobile typecheck and Android/iOS exports pass locally; Android export also passes in CI.
- Local Compose configuration resolves with eight PostgreSQL databases plus RabbitMQ, Elasticsearch, and pgAdmin.
- Environment examples cover every referenced runtime variable.

## Not Yet Production-Ready

1. No path-scoped production workflows exist in the monorepo.
2. No Docker Hub credentials or Dokploy webhook secrets exist in the monorepo repository.
3. The old backend workflow build context (`.`) cannot be copied unchanged. A monorepo backend image must use
   `apps/backend` as its context and `apps/backend/<service>/Dockerfile` as its Dockerfile.
4. Every standalone repository owns a different webhook under the same secret name, `DOKPLOY_WEBHOOK_URL`. A single
   repository cannot use that one repository-level secret name for fourteen targets. Use one protected GitHub
   Environment per deployable or distinct per-deployable secret names.
5. Deployment workflows must be path-scoped. A general monorepo `main` push must not rebuild and redeploy all
   services.
6. Runtime startup against production-shaped dependencies has not been smoke-tested from monorepo images.
7. The imported Spring context tests still need dedicated test configuration and disposable dependencies.
8. The scrapers have syntax and image-build validation but no collected behavioral tests.
9. `reports-service` still references the historical `blockout-api-reports` repository and needs an explicit cutover
   decision.
10. Mobile release validation still requires online EAS builds and installed-device smoke tests.

## Current Production Image Map

| Monorepo project                    | Existing production image                           |
| ----------------------------------- | --------------------------------------------------- |
| `com.blockout:clubs-service`        | `blockoutproject/blockout-api-clubs:latest`         |
| `com.blockout:competition-service`  | `blockoutproject/blockout-api-competitions:latest`  |
| `com.blockout:config-service`       | `blockoutproject/blockout-api-config:latest`        |
| `com.blockout:matches-service`      | `blockoutproject/blockout-api-matches:latest`       |
| `com.blockout:mobile-gateway`       | `blockoutproject/blockout-mobile-gateway:latest`    |
| `com.blockout:notification-service` | `blockoutproject/blockout-api-notifications:latest` |
| `com.blockout:pools-service`        | `blockoutproject/blockout-api-pools:latest`         |
| `com.blockout:reports-service`      | `blockoutproject/blockout-api-reports:latest`       |
| `com.blockout:search-service`       | `blockoutproject/blockout-api-search:latest`        |
| `com.blockout:search-worker`        | `blockoutproject/blockout-worker-search:latest`     |
| `com.blockout:teams-service`        | `blockoutproject/blockout-api-teams:latest`         |
| `com.blockout:users-service`        | `blockoutproject/blockout-api-users:latest`         |
| `@blockout/competition-scraper`     | `blockoutproject/blockout-scraper:latest`           |
| `@blockout/club-scraper`            | `blockoutproject/blockout-scraper-clubs:latest`     |

Do not rename these images during structural migration. Dokploy must first validate an immutable image candidate from
the monorepo, then deliberately switch one deployable at a time.

## Safe Next Deployment Step

Create one manually triggered, path-scoped shadow publication workflow for a single low-risk service. It should build
an immutable `monorepo-<git-sha>` tag, publish without replacing `latest`, and stop before calling Dokploy. After the
candidate has passed startup and smoke checks, configure that service's protected environment and perform its
individual cutover using the migration runbook.
