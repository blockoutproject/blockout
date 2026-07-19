# Blockout Source Baseline

## Purpose

`BOOT-001` imports application code from the following standalone commits. These commits remain the behavioral authority for the initial monorepo baseline.

| Standalone repository        | Commit                                     | Monorepo destination                |
| ---------------------------- | ------------------------------------------ | ----------------------------------- |
| `blockout-api-clubs`         | `4655f7de69df9854a35a7062cb60b65293e5ce42` | `apps/backend/clubs-service`        |
| `blockout-api-competition`   | `7e88fd34f0270dbbfc5a9f0be5d7bc295df9746c` | `apps/backend/competition-service`  |
| `blockout-api-config`        | `e2cfcf383cdc59c8466850518438c834a7b7c244` | `apps/backend/config-service`       |
| `blockout-api-matches`       | `dcf4f00599636ab25a33cacfd0c9ee477d651e45` | `apps/backend/matches-service`      |
| `blockout-api-notifications` | `cef516fd2b15d308f308b8b2d8169c3bce6abae5` | `apps/backend/notification-service` |
| `blockout-api-pools`         | `cc412b7b66c5fcb6be583fee1a3508cd3f926a99` | `apps/backend/pools-service`        |
| `blockout-api-reports`       | `5ee565bda73087a70b6f747162dca3d89493f87c` | `apps/backend/reports-service`      |
| `blockout-api-search`        | `1af0a2b2bd8537aba1c1e3838b145d760d916dea` | `apps/backend/search-service`       |
| `blockout-api-teams`         | `e70603fa1524b6bc0b13624195fda229e15ee686` | `apps/backend/teams-service`        |
| `blockout-api-users`         | `f4693e1141a2b55910bde7149c5489face9987cf` | `apps/backend/users-service`        |
| `blockout-mobile-gateway`    | `665e206fc82453e076c186be99d89f59c79da0f9` | `apps/backend/mobile-gateway`       |
| `blockout-worker-search`     | `6b8dff9f7df7e9a7d069271d59404714498f1bdc` | `apps/backend/search-worker`        |
| `blockout-scraper-clubs`     | `29efabe975c3222aae14a7253aa627d39c61a693` | `apps/backend/club-scraper`         |
| `blockout-scraper`           | `01d05346b7a8f81b00ad16f0618cb55060f111e8` | `apps/backend/competition-scraper`  |
| `blockout-mobile-app`        | `cfff3d7b9ade0e89f21af12cb21e4f0ba2902119` | `apps/frontend/mobile`              |
| `blockout-pgadmin`           | `1e62dc36c1a11b66edd7e448a96ed1db5315120e` | Compose reference only              |

Application sources were imported from Git objects. Standalone CI files, per-repository Compose files, and two workstation-only scraper `cmd.txt` notes were not imported. Monorepo project metadata, the Maven aggregators, the Expo Metro wrapper, and the root JavaScript lockfile are bootstrap-owned files.

The mobile root lock preserves every direct dependency version recorded by the standalone mobile lock. The two standalone TypeScript failures are retained as source limitations:

- `ApiErrorToast.tsx`: Node timeout type is not assignable to `number`;
- `useDeleteNotification.ts`: `MobileGatewayApi.deleteNotification` is missing.

The current dependency audit also contains inherited advisories in the imported Expo 54 baseline, including Axios and the Markdown renderer chain. Resolving them requires dependency or application changes and is outside the behavioral-freeze scope.

The complete Maven reactor packages successfully. Its inherited application-context test requires the external `AUTH0_ISSUER` environment value and therefore cannot start in an unconfigured checkout. This is a standalone source configuration limitation, not a compilation or monorepo integration failure; changing the test or application configuration is outside the behavioral-freeze scope.

## Runtime ports

| Application                 | Port |
| --------------------------- | ---: |
| pools service               | 8081 |
| teams service               | 8082 |
| matches service             | 8083 |
| competition service         | 8084 |
| users service               | 8085 |
| clubs service               | 8086 |
| search worker               | 8087 |
| search service              | 8088 |
| mobile gateway              | 8089 |
| config service              | 8090 |
| reports service             | 8091 |
| notification service        | 8092 |
| competition scraper metrics | 8000 |
| club scraper metrics        | 8001 |

## Local infrastructure ports

| Dependency              |  Port |
| ----------------------- | ----: |
| pools PostgreSQL        |  5432 |
| teams PostgreSQL        |  5433 |
| matches PostgreSQL      |  5434 |
| competition PostgreSQL  |  5435 |
| users PostgreSQL        |  5436 |
| clubs PostgreSQL        |  5437 |
| config PostgreSQL       |  5438 |
| notification PostgreSQL |  5439 |
| RabbitMQ                |  5672 |
| RabbitMQ management     | 15672 |
| Elasticsearch           |  9200 |
| pgAdmin                 |  5050 |
