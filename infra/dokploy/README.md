# Dokploy Production Handover

This runbook connects the Nx affected release workflow to the existing Blockout Dokploy environment. It does not
recreate or redesign retained PostgreSQL, RabbitMQ, Elasticsearch, storage, domains, or application runtime
configuration.

## One-Time Configuration

Reuse the existing Dokploy Docker application for each deployable image below. Configure each application to pull the
`production` tag, enable Auto Deploy, keep runtime secrets only in Dokploy, and record its generated webhook as the
matching GitHub `production` environment secret.

| Component              | GHCR image                                                         | GitHub secret                                          |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| `club-scraper`         | `ghcr.io/blockoutproject/blockout-club-scraper:production`         | `DOKPLOY_CLUB_SCRAPER_WEBHOOK_URL`                     |
| `clubs-service`        | `ghcr.io/blockoutproject/blockout-clubs-service:production`        | `DOKPLOY_CLUBS_SERVICE_WEBHOOK_URL`                    |
| `scraper-departmental` | `ghcr.io/blockoutproject/blockout-competition-scraper:production`  | `DOKPLOY_COMPETITION_SCRAPER_DEPARTMENTAL_WEBHOOK_URL` |
| `scraper-nat-pro`      | `ghcr.io/blockoutproject/blockout-competition-scraper:production`  | `DOKPLOY_COMPETITION_SCRAPER_NAT_PRO_WEBHOOK_URL`      |
| `scraper-regional`     | `ghcr.io/blockoutproject/blockout-competition-scraper:production`  | `DOKPLOY_COMPETITION_SCRAPER_REGIONAL_WEBHOOK_URL`     |
| `competition-service`  | `ghcr.io/blockoutproject/blockout-competition-service:production`  | `DOKPLOY_COMPETITION_SERVICE_WEBHOOK_URL`              |
| `config-service`       | `ghcr.io/blockoutproject/blockout-config-service:production`       | `DOKPLOY_CONFIG_SERVICE_WEBHOOK_URL`                   |
| `matches-service`      | `ghcr.io/blockoutproject/blockout-matches-service:production`      | `DOKPLOY_MATCHES_SERVICE_WEBHOOK_URL`                  |
| `mobile-gateway`       | `ghcr.io/blockoutproject/blockout-mobile-gateway:production`       | `DOKPLOY_MOBILE_GATEWAY_WEBHOOK_URL`                   |
| `notification-service` | `ghcr.io/blockoutproject/blockout-notification-service:production` | `DOKPLOY_NOTIFICATION_SERVICE_WEBHOOK_URL`             |
| `pools-service`        | `ghcr.io/blockoutproject/blockout-pools-service:production`        | `DOKPLOY_POOLS_SERVICE_WEBHOOK_URL`                    |
| `reports-service`      | `ghcr.io/blockoutproject/blockout-reports-service:production`      | `DOKPLOY_REPORTS_SERVICE_WEBHOOK_URL`                  |
| `search-service`       | `ghcr.io/blockoutproject/blockout-search-service:production`       | `DOKPLOY_SEARCH_SERVICE_WEBHOOK_URL`                   |
| `search-worker`        | `ghcr.io/blockoutproject/blockout-search-worker:production`        | `DOKPLOY_SEARCH_WORKER_WEBHOOK_URL`                    |
| `teams-service`        | `ghcr.io/blockoutproject/blockout-teams-service:production`        | `DOKPLOY_TEAMS_SERVICE_WEBHOOK_URL`                    |
| `users-service`        | `ghcr.io/blockoutproject/blockout-users-service:production`        | `DOKPLOY_USERS_SERVICE_WEBHOOK_URL`                    |

Configure GHCR credentials in Dokploy when the packages are private. The GitHub workflow publishes with its scoped
`GITHUB_TOKEN`; no registry password or Dokploy runtime secret is passed into image builds.

## Flyway Schedule Jobs

Create one disabled recurring Schedule Job per database owner. As in the Vytruve deployment, the intentionally dormant
cron expression is `0 0 1 1 *`; GitHub runs each job explicitly through the Dokploy CLI. Each job pulls the mutable
migration pointer and exits when Flyway `migrate` completes:

```bash
docker run --rm --pull=always --network dokploy-network \
  --env-file /etc/dokploy/blockout/<service>-migration.env \
  ghcr.io/blockoutproject/blockout-<service>-migration:production
```

| Database owner         | Migration image                                                              | GitHub variable                                      |
| ---------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| `clubs-service`        | `ghcr.io/blockoutproject/blockout-clubs-service-migration:production`        | `DOKPLOY_CLUBS_SERVICE_MIGRATION_SCHEDULE_ID`        |
| `competition-service`  | `ghcr.io/blockoutproject/blockout-competition-service-migration:production`  | `DOKPLOY_COMPETITION_SERVICE_MIGRATION_SCHEDULE_ID`  |
| `config-service`       | `ghcr.io/blockoutproject/blockout-config-service-migration:production`       | `DOKPLOY_CONFIG_SERVICE_MIGRATION_SCHEDULE_ID`       |
| `matches-service`      | `ghcr.io/blockoutproject/blockout-matches-service-migration:production`      | `DOKPLOY_MATCHES_SERVICE_MIGRATION_SCHEDULE_ID`      |
| `notification-service` | `ghcr.io/blockoutproject/blockout-notification-service-migration:production` | `DOKPLOY_NOTIFICATION_SERVICE_MIGRATION_SCHEDULE_ID` |
| `pools-service`        | `ghcr.io/blockoutproject/blockout-pools-service-migration:production`        | `DOKPLOY_POOLS_SERVICE_MIGRATION_SCHEDULE_ID`        |
| `teams-service`        | `ghcr.io/blockoutproject/blockout-teams-service-migration:production`        | `DOKPLOY_TEAMS_SERVICE_MIGRATION_SCHEDULE_ID`        |
| `users-service`        | `ghcr.io/blockoutproject/blockout-users-service-migration:production`        | `DOKPLOY_USERS_SERVICE_MIGRATION_SCHEDULE_ID`        |

Each root-owned env file is mode `600` and contains only the credentials for its database:

```dotenv
FLYWAY_URL=jdbc:postgresql://<dokploy-postgres-service>:5432/<database>
FLYWAY_USER=<database-user>
FLYWAY_PASSWORD=<database-password>
```

When database credentials rotate, update the owning application's `DATASOURCE_*` values and its migration env file
together. Before the next release, verify that `FLYWAY_URL`, `FLYWAY_USER`, and `FLYWAY_PASSWORD` still match the
application's `DATASOURCE_URL`, `DATASOURCE_USERNAME`, and `DATASOURCE_PASSWORD`, and preserve root ownership and mode
`600` on the migration env file.

Application containers set `SPRING_FLYWAY_ENABLED=false`. Local Maven and Testcontainers execution keep the existing
Spring Boot Flyway startup behavior.

Configure the GitHub `production` environment with:

- a custom deployment branch policy limited to `main`;
- no administrator bypass;
- the 16 application webhook secrets listed above;
- the `DOKPLOY_API_KEY` secret used only by blocking migration jobs;
- the non-secret `DOKPLOY_URL` and eight migration Schedule Job ID variables listed above;
- the non-secret `CONTAINER_PLATFORM` variable, normally `linux/amd64`.

Protect `develop` and `main` with pull requests, resolved conversations, and the `verify` check. The workflow also
rejects any pull request to `main` that is not the repository's `develop` branch.

## Dokploy Runtime Contract

Dokploy owns all database, broker, storage, provider, authentication, routing, and application environment values.
Do not place those values in GitHub Actions, image build arguments, repository files, or review evidence.

Each application must have a finite health check and a failure policy appropriate to its runtime. Java services and the
gateway must not be considered ready until their Spring process can serve traffic. Scrapers and the search worker must
remain failed when their long-running process exits unexpectedly. Webhook acceptance alone is not readiness evidence;
inspect the corresponding Dokploy deployment record and health state after the first controlled production release.

Keep retained infrastructure outside application resources so an image deployment or rollback cannot recreate or
remove persisted data.

## Release Behavior

Nx selects affected applications from the last successful workflow range. A documentation-only change with no affected
container target skips production. Shared OpenAPI, Maven parent/shared-model, Python workspace, or Docker-context
changes propagate through the Nx graph to their real image consumers.

The workflow publishes all selected immutable SHA images before changing any `production` tag. It then runs every
selected migration job sequentially before changing any application pointer. A failed publication prevents every
migration and deployment. A failed migration prevents every application deployment. A failed Dokploy webhook stops
subsequent deployment steps and remains visible in the GitHub release job.

## Rollback

Use the manual `Roll back application` GitHub workflow with:

- one component;
- its previously published `sha256` digest;
- the full source revision carried by that image.

The workflow retags only that digest as `production` and calls only the matching webhook. It does not rebuild source,
reverse Flyway migrations, restart retained infrastructure, or roll back another component. Schema evolution must
remain backward compatible with the immediately previous application image when operational rollback is required.
