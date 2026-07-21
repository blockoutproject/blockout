# Club Scraper Characterization

REF-022 records the supported behavior of the imported club scraper before structural replacement. The tests use
sanitized FFVB address-book fixtures and recording internal clients. They do not contact FFVB, Auth0, production
Blockout
services, or another external system. Every HTML fixture is derived from a real FFVB response; technical failure tests
inject the failure while reusing one of those pages.

## Provider behavior

- The scraper obtains candidate club identifiers from `teams-service` and posts each identifier to the FFVB address
  book.
- FFVB response bytes are decoded as Windows-1252 with replacement for invalid bytes.
- A provider request has three attempts by default, a two-second delay, a twenty-second per-request timeout, disabled
  TLS
  verification, and concurrency bounded by the shared scraper semaphore.
- Club parsing preserves the imported label matching, title capitalization, website trailing-slash removal, and the rule
  that an address with at least three comma-separated parts keeps the final two.
- The imported duplicated-postal-code fallback remains in production code, but no matching response was observed in the
  fifty-page sample, so no invented HTML fixture asserts it. A parser exception is logged and returns no club.

## Write behavior

- Existing clubs are loaded before provider work and cloned into a mutable candidate cache.
- The provider may replace name, city, postal code, email, phone, website, and address. Owner-managed logo, coordinates,
  timestamps, and identity remain from the cached resource during that merge.
- A new club requires `id` and `rawName`. An unchanged club produces no HTTP write. A changed or inactive club is
  updated,
  and an inactive club is reactivated while retaining the owner logo.
- Create and update multipart JSON fields match the handwritten `CreateClubInternalRequest` and
  `UpdateClubInternalRequest` owned by `clubs-service`. The complete Python Club mirror matches
  `ClubInternalResponse`.
- Missing cached clubs are bulk-deactivated only after at least one non-empty FFVB page was retrieved. A complete
  provider
  outage skips bulk deactivation.

## Lifecycle behavior

- A config-service status failure fails closed and skips the run.
- The scheduler registers an interval run every sixty minutes, triggers the first run immediately, allows a
  thirty-second
  misfire grace period, and replaces an existing job.
- The process exposes Prometheus metrics on port `8001`. Both skipped and attempted runs update the execution-duration
  gauge.
- The Auth0 background loop retains the service token globally, waits 172,800 seconds after success, and retries after
  sixty seconds on failure.

These observations are compatibility requirements for REF-023. Surprising behavior is not an endorsement: changing it
requires a separately authorized correction with explicit tests.

## REF-023 replacement evidence

The production path now has one importable `scraper` package next to `tests`. The enclosing `club-scraper` application
directory already supplies the role, so the local package does not repeat either `Blockout` or `club`. The future
`competition-scraper` follows the same application-local `scraper` convention:

- `application` owns ingestion and create/update/no-op decisions;
- `infrastructure/blockout` owns Auth0, internal clients, and exact handwritten Java-owner transport mirrors;
- `infrastructure/ffvb` owns address-book HTTP, parsing, and the provider-local `FfvbClubRecord`;
- `infrastructure/scheduling`, `config`, and `observability` own process concerns;
- `main.py` delegates only to the composition root.

Before the legacy path was deleted, both parsers ran against the same controlled inputs. Those earlier constructed HTML
fragments are now superseded and removed. The current source-derived fixtures and write traces protect parsing, create,
update, reactivation, no-op, outage-safe deactivation, retries, internal routes, native camelCase payloads, scheduler
settings, metrics port, and Auth0 cadence.

`ClubInternalResponse`, `CreateClubInternalRequest`, `UpdateClubInternalRequest`,
`ScraperStatusInternalResponse`, `ScraperName`, and `BulkDeactivateClubsInternalRequest` are exact handwritten mirrors
of their Java owners. Provider fields use a separate `FfvbClubRecord` value and are mapped explicitly at the Blockout
boundary. Contract generation remains deferred.

Ruff 0.15.22 is pinned as the development formatter, import sorter, and baseline linter. Its Python 3.12 configuration
lives in the repository `pyproject.toml`; Nx only delegates `lint`, `format`, and `format-check` to Python. Production
dependencies and the image remain unchanged.

## Live-provider fixture evidence

On July 20, 2026, the FFVB address-book form was exercised with eight department values: `01`, `13`, `29`, `33`, `59`,
`75`, `971`, and `974`. Fifty club detail pages were sampled evenly across the returned lists. The temporary raw
captures
were used only for structural analysis and are not committed.

The sample contained 25 exact DOM signatures, but most differences belonged to unrelated league, committee, or contact
tables. Fourteen layouts were distinct for the fields read by the club parser and are preserved directly under
`tests/fixtures/ffvb` as complete source-derived pages. They cover:

- two, three, and four address lines before the postal row;
- mobile-only, landline-only, and landline-then-mobile contact rows;
- club website rows that contain a value and pages where the row is absent;
- metropolitan, accented, hyphenated, and overseas city values;
- one live malformed postal row containing two postal codes and no city.

Across the fifty pages, 22 had two address lines, 21 had three, and 7 had four. Thirty-five exposed only a mobile label,
3 only a landline label, and 12 exposed landline followed by mobile. Twenty-six had a club website and 24 did not. Every
sampled page had a club title, an email link, a phone value, and a social-address table. Forty-nine yielded a postal
code
and city; the malformed `97460 97490` row intentionally remains a partial result rather than inventing a locality.

Each committed fixture retains the provider's full table structure and records its source club identifier in an HTML
comment. Personal email, phone, correspondent, and street values are replaced with deterministic test values. This keeps
the parser evidence suitable for a public repository without weakening the structural coverage. No constructed provider
HTML remains: the parser-exception test reuses a source-derived page and injects the BeautifulSoup failure directly.
