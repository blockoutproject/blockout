# Blockout Product and Runtime Context

Blockout is a production volleyball mobile platform composed of an Expo application, Spring Boot services, scheduled
Python scrapers, PostgreSQL databases, RabbitMQ, Elasticsearch, Auth0, S3-compatible storage, Expo notifications, and
supporting integrations.

## Runtime Boundaries

| Deployable           | Port | Primary dependencies                                          |
| -------------------- | ---: | ------------------------------------------------------------- |
| pools-service        | 8081 | PostgreSQL, RabbitMQ, Auth0                                   |
| teams-service        | 8082 | PostgreSQL, RabbitMQ, Auth0, S3                               |
| matches-service      | 8083 | PostgreSQL, RabbitMQ, Auth0, users-service                    |
| competition-service  | 8084 | PostgreSQL, RabbitMQ, Auth0                                   |
| users-service        | 8085 | PostgreSQL, RabbitMQ, Auth0, S3, teams-service, pools-service |
| clubs-service        | 8086 | PostgreSQL, RabbitMQ, Auth0, S3, Mapbox                       |
| search-worker        | 8087 | RabbitMQ, Elasticsearch, Auth0, domain APIs                   |
| search-service       | 8088 | Elasticsearch, Auth0                                          |
| mobile-gateway       | 8089 | Auth0, backend APIs, FFVB proxy                               |
| config-service       | 8090 | PostgreSQL, Auth0, S3                                         |
| reports-service      | 8091 | Auth0, S3, GitHub, Discord                                    |
| notification-service | 8092 | PostgreSQL, RabbitMQ, Auth0, Expo, domain APIs                |
| competition-scraper  | 8000 | Auth0, backend APIs, optional HTTP proxy                      |
| club-scraper         | 8001 | Auth0, backend APIs                                           |

## Migration Boundary

The monorepo is not yet the production deployment authority. Structural equivalence, shadow builds, runtime
configuration parity, and per-deployable rollback must be proven before any standalone source is retired.

Two uncommitted legacy working-tree changes were intentionally excluded from the initial import and must be reconciled
before the corresponding source freeze:

- `blockout-mobile-gateway/.../FfvbPublicController.java`
- `blockout-scraper/scrapers/pro_scraper.py`
