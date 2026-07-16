# Blockout Product And Runtime Context

This document summarizes the currently delivered runtime posture and the boundaries that structural migration must not
reopen. It is not the migration roadmap.

## Sources Of Truth

| Question                                             | Source                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Migration tasks, order, dependencies, and completion | [`blockout-active-roadmap.md`](blockout-active-roadmap.md)                       |
| Delivered runtime behavior                           | Current source, deployed behavior, and existing tests                            |
| Production deployment authority                      | Standalone repositories and live Dokploy configuration                           |
| Product and architecture boundaries                  | [`../architecture/`](../architecture/) and future durable decisions              |
| Repository operating rules                           | [Blockout Best Practices](../../.agents/skills/blockout-best-practices/SKILL.md) |

## Current Runtime Posture

Blockout is a production volleyball mobile platform composed of an Expo application, Spring Boot services, scheduled
Python scrapers, PostgreSQL databases, RabbitMQ, Elasticsearch, Auth0, S3-compatible storage, Expo notifications, and
supporting integrations.

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

Verify these statements against current source and live deployment configuration before changing behavior.

## Boundaries That Stay Closed

- The monorepo is not production deployment authority until each deployable completes cutover.
- Structural similarity with Maaatch does not import Maaatch product behavior, domain models, or Next.js assumptions.
- Contract-first migration must preserve existing endpoint and payload behavior until an explicit product task changes
  it.
- Service and database ownership remain separate.
- Expo signing credentials, Firebase files, EAS credentials, Docker Hub credentials, and Dokploy webhooks remain
  external secrets.
- The two excluded legacy working-tree changes remain unresolved until explicitly reconciled.

## Maintenance

Update this file only when delivered runtime posture or a durable closed boundary changes. Put migration task state in
the active roadmap, durable decisions in `docs/decisions/**`, architecture state in `docs/architecture/**`, and detailed
validation evidence in Git and CI.
