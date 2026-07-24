# Blockout System Model V1

This model describes the current repository and runtime boundaries. It records ownership, not task sequencing.

## Workspace

```text
apps/
  backend/   Spring Boot services, workers, gateway, and Python scrapers
  frontend/  Expo and React Native mobile application
libs/shared/
  contracts/                OpenAPI sources and ignored generated bundles
  python-contract-clients/  Ignored generated Python models and HTTPX clients
infra/
  compose/   Local PostgreSQL, RabbitMQ, Elasticsearch, and pgAdmin
```

Nx owns the cross-ecosystem project graph and orchestration. Maven remains authoritative for Java, uv for Python, Expo
for mobile, and Docker Compose for local infrastructure.

## Application Ownership

- `clubs-service` owns clubs.
- `teams-service` owns teams.
- `pools-service` owns pools and rankings.
- `matches-service` owns matches and live-link moderation.
- `competition-service` owns competition associations.
- `users-service` owns users and favorites.
- `notification-service` owns user notifications and delivery attempts.
- `reports-service` owns support-report creation.
- `config-service` owns application status, divisions, legal documents, scraper status, and provider mappings.
- `search-service` owns search reads; `search-worker` owns search projection maintenance.
- `mobile-gateway` owns mobile-facing orchestration, not the underlying business resources.
- `club-scraper` and `competition-scraper` own provider ingestion workflows, not the resources they update.

## Boundary Rules

- Every complete resource has one owner. Complete mirrors agree with that owner.
- OpenAPI sources own transport shape. Generated Java, TypeScript, and Python artifacts stay inside adapters or client
  boundaries.
- Application commands and views stay distinct from transport objects.
- JPA entities remain inside persistence adapters and never become controller responses.
- Provider payloads are mapped explicitly and do not become Blockout domain or transport models.
- Purpose-specific messages and projections may be smaller than complete resources when their names and consumers make
  that role explicit.
- Blockout-owned HTTP JSON uses camelCase. Database, environment, protocol, and provider names retain their native
  conventions.

## Runtime Topology

- PostgreSQL stores service-owned relational state.
- RabbitMQ carries purpose-specific asynchronous messages.
- Elasticsearch stores search projections, rebuilt and updated by the search worker.
- The mobile application reaches the service system through the mobile gateway and generated clients.
- Python scrapers call owner APIs through shared generated clients and preserve external-provider concerns in local
  adapters.

## Architecture Gate

Source and current tests must support a proposed behavior before it becomes executable. New services, shared libraries,
complete mirrors, transport changes, or ownership changes require an explicit Roadmap issue and proportionate
generation and consumer validation.
