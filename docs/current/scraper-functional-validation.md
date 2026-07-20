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

## REF-026 provider and local read smoke

On 2026-07-20, the hardened competition provider boundaries were exercised in
read-only mode against the current public pages. Verified HTTPS and decoding
returned 13 supported regional leagues, 67 departmental committees, 29 national
pools, 132 complete ABCCS/3MA calendar rows, and 4, 4, and 165 Data Project live
match blocks for competitions 124, 125, and 126. No LNV XML request or external
write was performed.

The five required local Java APIs started successfully against the existing
PostgreSQL and RabbitMQ containers. Authenticated read clients for raw division
mappings, pools, teams, matches, and competition associations returned valid
empty typed collections from the current local databases. The scraper status
read remains blocked before scraper startup: `config-service` returns HTTP 500
because the lowercase path value `competition_scraper` is converted directly to
the uppercase Java `ScraperName` enum. This pre-existing Java boundary mismatch
is outside REF-026 and requires its own focused correction before a complete
scheduled local run can be certified.
