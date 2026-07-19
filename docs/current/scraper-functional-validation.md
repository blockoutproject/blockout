# Scraper Functional Validation

## Scope

REF-004 validated both Python scrapers against the local Blockout application
stack on 2026-07-19. PostgreSQL, RabbitMQ, Elasticsearch, and the six required
Java APIs ran with local configuration. A localhost-only JWT issuer replaced
Auth0 for the test; no real credential was stored or sent.

The schedulers and provider downloads were not started. Controlled HTML and CSV
fixtures exercised the parsers without contacting FFVB or LNV.

## Club scraper

The validation:

- read `SCRAPER_CLUBS` from `config-service` directly as `lastUpdate`;
- parsed a controlled club page;
- created and then idempotently updated club `REF004` through the scraper API
  client;
- reloaded the persisted club from `clubs-service` and verified camelCase JSON;
- ran the disabled scraper branch, observed its structured skip log, and
  verified the execution-duration metric was updated.

## Competition scraper

The validation:

- read `SCRAPER` from `config-service` directly as `lastUpdate`;
- parsed one controlled competition CSV row;
- created and then idempotently updated the `REF004 Functional Team` through
  the scraper API client;
- queried `teams-service` with the native `clubId` parameter;
- reloaded the persisted team from `teams-service` and verified camelCase JSON;
- ran the disabled scraper branch, observed its structured skip log, and
  verified the execution-duration metric was updated.

The read routes used by `pools-service`, `matches-service`, and
`competition-service` also responded successfully against the same local stack.

## Verification

- Club scraper contract tests: 4 passed offline.
- Competition scraper contract tests: 4 passed offline.
- Python syntax checks: passed offline for both applications.
- Reports-service native camelCase serialization test: passed.
- Persisted club and team responses contained `rawName`, `postalCode`,
  `clubId`, `shortName`, `divisionId`, and `lastUpdate`; the corresponding
  snake_case fields were absent.

This validation proves the local Blockout parsing and application-write paths.
It intentionally does not certify the availability or current HTML/XML shape of
external providers; those require a separate provider integration test.
