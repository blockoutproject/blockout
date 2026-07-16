# Local Docker Platform

Blockout follows the Maaatch local-infrastructure layout: all Docker Compose orchestration is centralized here.
Application processes are normally started through Maven, Nx, or Python outside Compose.

## Start

```bash
cp infra/compose/.env.example infra/compose/.env
npm exec nx run @blockout/local-platform:serve
```

The app file owns the eight service-local PostgreSQL databases. The third-party file owns RabbitMQ, pgAdmin,
Elasticsearch, and Kibana. Optional profiles expose the scraper VPN and observability stack:

```bash
docker compose --file infra/compose/docker-compose.third-party.yml --profile scraping up
docker compose --file infra/compose/docker-compose.third-party.yml --profile observability up
docker compose --file infra/compose/docker-compose.third-party.yml --profile tooling up
docker compose --file infra/compose/docker-compose.third-party.yml --profile gateway up
```

Real credentials stay in the ignored `infra/compose/.env`.
