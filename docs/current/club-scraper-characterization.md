# Club Scraper Characterization

REF-022 records the supported behavior of the imported club scraper before structural replacement. The tests use small,
sanitized FFVB address-book fragments and recording internal clients. They do not contact FFVB, Auth0, production
Blockout services, or another external system.

## Provider behavior

- The scraper obtains candidate club identifiers from `teams-service` and posts each identifier to the FFVB address
  book.
- FFVB response bytes are decoded as Windows-1252 with replacement for invalid bytes.
- A provider request has three attempts by default, a two-second delay, a twenty-second per-request timeout, disabled TLS
  verification, and concurrency bounded by the shared scraper semaphore.
- Club parsing preserves the imported label matching, duplicated-postal-code fallback, title capitalization, website
  trailing-slash removal, and the rule that an address with at least three comma-separated parts keeps the final two.
- Missing recognized markup currently returns a partial club. A parser exception is logged and returns no club.

## Write behavior

- Existing clubs are loaded before provider work and cloned into a mutable candidate cache.
- The provider may replace name, city, postal code, email, phone, website, and address. Owner-managed logo, coordinates,
  timestamps, and identity remain from the cached resource during that merge.
- A new club requires `id` and `rawName`. An unchanged club produces no HTTP write. A changed or inactive club is updated,
  and an inactive club is reactivated while retaining the owner logo.
- Create and update multipart JSON fields match the handwritten `CreateClubInternalRequest` and
  `UpdateClubInternalRequest` owned by `clubs-service`. The complete Python Club mirror matches
  `ClubInternalResponse`.
- Missing cached clubs are bulk-deactivated only after at least one non-empty FFVB page was retrieved. A complete provider
  outage skips bulk deactivation.

## Lifecycle behavior

- A config-service status failure fails closed and skips the run.
- The scheduler registers an interval run every sixty minutes, triggers the first run immediately, allows a thirty-second
  misfire grace period, and replaces an existing job.
- The process exposes Prometheus metrics on port `8001`. Both skipped and attempted runs update the execution-duration
  gauge.
- The Auth0 background loop retains the service token globally, waits 172,800 seconds after success, and retries after
  sixty seconds on failure.

These observations are compatibility requirements for REF-023. Surprising behavior is not an endorsement: changing it
requires a separately authorized correction with explicit tests.

## REF-023 replacement evidence

The production path now has one importable `blockout_club_scraper` package:

- `application` owns ingestion and create/update/no-op decisions;
- `infrastructure/blockout` owns Auth0, internal clients, and exact handwritten Java-owner transport mirrors;
- `infrastructure/ffvb` owns address-book HTTP, parsing, and the provider-local `FfvbClubRecord`;
- `infrastructure/scheduling`, `config`, and `observability` own process concerns;
- `main.py` delegates only to the composition root.

Before the legacy path was deleted, both parsers ran against the same three sanitized fixtures. Every semantic provider
field was identical for the complete page, duplicated-postal fallback, and missing-field page. After the switch, the
same fixtures and write traces protect create, update, reactivation, no-op, outage-safe deactivation, retries, internal
routes, native camelCase payloads, scheduler settings, metrics port, and Auth0 cadence.

`ClubInternalResponse`, `CreateClubInternalRequest`, `UpdateClubInternalRequest`,
`ScraperStatusInternalResponse`, `ScraperName`, and `BulkDeactivateClubsInternalRequest` are exact handwritten mirrors
of their Java owners. Provider fields use a separate `FfvbClubRecord` value and are mapped explicitly at the Blockout
boundary. Contract generation remains deferred.

Ruff 0.15.22 is pinned as the development formatter, import sorter, and baseline linter. Its Python 3.12 configuration
lives in the repository `pyproject.toml`; Nx only delegates `lint`, `format`, and `format-check` to Python. Production
dependencies and the image remain unchanged.
