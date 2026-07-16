# Backend Java Policy

Blockout backend services are independent Spring Boot applications assembled by one Maven reactor.

## Maven

- The root aggregator owns `apps/backend`; the backend parent owns every service module.
- Services inherit `com.blockout:backend:0.0.1-SNAPSHOT` through `../pom.xml`.
- Java is 21 and Spring Boot dependency management is owned by the backend parent.
- Use `mvn -f apps/backend/pom.xml ...` for reactor validation.
- Do not add a second Spring Boot parent or a service-local dependency-management stack.

## Existing Architecture

The imported services currently use technical packages such as controllers, services, repositories, models, config,
listeners, and exceptions. Preserve that architecture during migration work. Feature-first restructuring requires a
separate bounded decision and must not be mixed into deployment, environment, or monorepo tasks.

- Controllers stay thin.
- Services own orchestration and business behavior.
- Repositories own persistence access.
- HTTP, messaging, S3, Auth0, and search integrations remain explicit adapters.
- Do not move behavior between services without an explicit ownership decision.
- Preserve JSON naming, endpoint paths, message names, and error behavior unless the task intentionally changes the
  public contract.

## Docker

Every service Dockerfile uses `apps/backend` as build context so the shared parent POM is available. A service-local
Compose file therefore uses `context: ..` and `dockerfile: <service>/Dockerfile`.
