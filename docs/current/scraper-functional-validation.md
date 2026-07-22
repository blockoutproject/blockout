# Scraper Functional Validation

> Historical evidence: this records the pre-refactor local validation. REF-059 contains the certified current flow.

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
empty typed collections from the current local databases. A follow-up check on
2026-07-21 used the competition scraper's real authenticated client and stable
`SCRAPER` path value. `config-service` returned the typed `SCRAPER` status with
its persisted `lastUpdate`; the current local value was disabled. The stable
identifier therefore aligns across the Python client, Java enum, and database.

## REF-027 competition persistence certification

On 2026-07-21, the competition scraper wrote six disposable flows through the
real local owner APIs and then read their persisted state back:

- departmental PTRA69/BM1: 1 pool, 9 teams, 9 associations, and 72 matches;
- regional LIRA/PFA: 1 pool, 10 teams, 10 associations, and 90 matches;
- national ABCCS/EFA: 1 pool, 13 teams, 13 associations, and 111 valid matches;
- professional PAZ, LBM, and FAZ: 3 pools, 31 teams, 31 associations, and 204
  matches, with respectively 4, 165, and 4 persisted Data Project live codes.

The EFA export contained 22 invalid rows among 132 provider rows. A disposable
active team pair, association pair, and match seeded before ingestion remained
active, proving that incomplete input does not authorize destructive cleanup.
Repeating all six source flows produced an identical owner-state snapshot.

This run also exposed and corrected two provider-boundary defects. FFVB ranking
parsing now scopes rows and cells to their direct table so the provider's nested
calendar table cannot become ranking data. Association finalization now writes
only teams touched by an observed ranking row, preventing absent rankings from
replacing owner statistics with fabricated zero totals and `1000` coefficients.

The three professional CSV sources currently configured for 2026/2027 contain
headers but no match rows. The certification therefore used their populated
2025/2026 exports together with the current public Data Project pages. This was
a temporary validation override only; production configuration and source code
remain on 2026/2027. LNV XML remained unavailable, was not called, and its code
was not changed. The persisted `SCRAPER` status remained disabled before and
after the run. All disposable database records and their local queue messages
were removed afterwards.
