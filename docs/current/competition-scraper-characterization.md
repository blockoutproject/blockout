# Competition Scraper Characterization

REF-024 records the imported competition scraper as an executable oracle before any structural replacement. REF-025
keeps that behavior behind an application-local `scraper` package. The test suite uses real source-derived FFVB/LNV
HTML, XML, and CSV excerpts plus recording adapters. It does not contact FFVB, LNV, Auth0, production Blockout APIs, or
another external system during execution.

## Runtime and scheduling

- The default source order is `regional`, `departmental`, `national`, then `pro`. At most two top-level scrapers run at
  once. Provider HTTP concurrency is ten per scraper, regional/departmental/national league work is bounded to eight,
  professional pool work is bounded to eight, and pool-level CSV/live work is bounded to twenty.
- The status route is checked through a temporary ten-second session before each run. A disabled status or status error
  fails closed and returns `False`; the scheduler therefore retries on its next minute tick.
- The ingestion session trusts proxy environment variables, uses a ten-second total timeout, a twenty-connection
  connector, and disabled connector TLS verification. Provider GET and CSV POST calls use three attempts, five-second
  retry delays, twenty-second timeouts, their own semaphores, and disabled request TLS verification.
- FFVB GET and CSV bytes use Windows-1252. Other GET providers use UTF-8.
- APScheduler polls every sixty seconds with one coalesced instance, a thirty-second misfire grace period, and immediate
  first polling. Effective Europe/Paris cadence is thirty minutes on weekdays, five minutes after 17:00 Saturday, and
  five minutes after 14:00 Sunday.
- Prometheus starts on port `8000`. Every attempted or skipped run updates the process duration gauge; each concrete
  scraper updates its own duration gauge.
- Auth0 machine tokens are cached under a lock and refreshed five minutes before expiry. A refresh failure waits sixty
  seconds. Disabling M2M produces no authorization header.

## FFVB discovery and CSV ingestion

- Regional pages derive league name and `codent` from colored tables. Departmental pages derive each department from
  list entries and strip prefixes such as `75` or `07/26`. Both skip `LIGU`, `LIMY`, `LIMART`, `LIRE`, and `LIGY`, and
  downgrade discovered FFVB links to HTTP.
- Regional and departmental league pages derive the season and pool code from `saison` and `poule`. National discovery
  uses league `ABCCS`, derives `YYYY/YYYY` from `.htm` links, and derives the pool code from the filename suffix.
- A raw division must already exist and be fully mapped before its pool is ingested. A missing mapping is created without
  processing that pool in the same run; an incomplete mapping is skipped.
- FFVB calendar exports are semicolon-delimited and require the twelve named columns protected by fixtures. Rows require
  match code, both club identifiers, and a valid date/time before any owner mutation.
- The write sequence is pool, teams, pool-team associations, cached match decisions, HTML ranking statistics, then
  missing team/match cleanup. An unavailable CSV keeps an existing pool in the observed set to avoid false pool
  deactivation. Invalid rows stop before owner writes.
- Ranking HTML currently remains the active statistics path because `has_anomalous_match` is always `True`; the direct
  per-match calculation is dormant. This is a characterized fact, not a recommended design.

## Professional enrichment and source priority

- Professional ingestion is fixed to season `2026/2027`, league `AALNV`, and pools `MSL`, `PAZ`, `LBM`, `SPS`, and
  `FAZ`. Each pool runs FFVB CSV first, LNV match/rank XML second, and DataProject live HTML last.
- FFVB owns pool/team identifiers, venue, and referees. LNV XML owns match date, set result, and detailed score. LNV HTML
  owns only `liveCode`. `DataSourcePriority` is the local application policy `DB=0`, `FFVB=1`, `LNV_XML=2`,
  `LNV_HTML=3`.
- LNV local datetimes are interpreted in Europe/Paris and converted to UTC. Invalid set results become `0-0`; zero set
  details are omitted.
- Rank XML replaces the raw association counters after team alias and owner lookup. Cached XML ratios are not copied;
  finalization recomputes coefficients from won/lost sets and points, using `1000.0` when the denominator is zero.
- DataProject live matching resolves both aliased teams and finds the cached match by pool, team pair, and calendar date
  before applying the numeric match identifier.
- XML parser failures, missing main HTML identifiers, unknown teams, and pool-chain exceptions are isolated and logged
  without aborting another professional pool. Technical failure paths are injected around authentic documents rather
  than represented by invented provider fixtures.

## Internal boundaries and writes

- The complete handwritten mirrors for Team, Pool, Match, CompetitionAssociation, RawDivisionMapping, and ScraperStatus
  match the current Java-owner field sets and native camelCase JSON. Write payloads remain purpose-specific and omit
  owner-managed response fields.
- Pool and Team decisions validate required identity fields, retain owner IDs, compare only their existing legacy field
  lists, reactivate when allowed, and avoid unchanged writes.
- Match finalization creates new entries, updates only entries with scheduled changes, skips unchanged entries, isolates
  each owner failure, then clears the cache. Association finalization writes changed entries concurrently, computes
  coefficients, then clears its cache.
- Cleanup routes use `missingPoolIds`, `missingTeamIds`, and `missingMatchCodes`. Professional ingestion does not perform
  the regional/national missing-pool cleanup.
- Handwritten transport mirrors now use their exact owner-facing `*InternalRequest` and `*InternalResponse` names.
  Purpose-specific create, update, and bulk request classes prevent response-only fields from leaking into writes. They
  remain handwritten until the separately authorized contract-first phase.

The unused local `Format`, `Gender`, and `MatchStatus` copies were removed. Contract-owned enums will ultimately come
from shared owner contracts, while the application policy `DataSourcePriority` remains local.

## REF-025 structure and evidence

- `main.py` delegates to `scraper.bootstrap`; orchestration lives under `scraper/application`, provider-independent rules
  under `scraper/domain`, and FFVB, LNV, Blockout, and scheduling adapters under `scraper/infrastructure`.
- Provider HTTP access, match change tracking, association statistics, and pure LNV parsing are explicit seams. The old
  top-level `api`, `models`, `scrapers`, `services`, and `utils` import paths are no longer used.
- The offline suite contains 55 passing tests. Fixture provenance is recorded beside the fixtures, including archived
  official LNV XML because the live XML endpoints returned HTTP 403 during the refactor.
- Runtime dependencies contain only packages imported by the application. Pytest and Ruff are development-only; Ruff
  0.15.22 supplies the standard lint and format targets.
