# FFVB Reference, Collection and Consultation Design

Authority: spec.md US2/US3/US4/US6/US8, FR-011–032, FR-046/049/050, SC-003/004/007/009.

## Delivery 1: Reference and Administration

Core-service hosts administration; sports is an in-process owner library. Identity verifies an active
existing profile with local ADMIN role on every administration operation, without permission caching.
A documented database-operations command grants/revokes ADMIN by exact issuer and subject; no self-grant
endpoint. Auth0 identities and billing associations are unchanged.

Routes (all below /api/v2):

- GET/PUT /admin/ffvb/configuration: read/replace enabled, explicit season and selected organizer sources.
- GET/POST /admin/divisions; PUT /admin/divisions/{divisionId}: list/create/replace name and active flag.
- GET /admin/ffvb/mappings: paginated observed provider labels, filter mapped/unmapped.
- PUT /admin/ffvb/mappings/{mappingId}: associate an observed label with division, format and gender.
- GET /imports/ffvb/configuration: scraper configuration; dedicated allowed M2M
  client and read:ffvb-configuration scope, never ordinary user tokens. The source list is limited to 256 entries. GET /imports/ffvb/mappings returns resolved mappings
  with the same page/pageSize contract and scope; collection discovery writes arrive with delivery 2.

Admin collections use page=0, pageSize=40/max100, deterministic name/ID ordering and hasNext; no exact
total required. Mutation returns 200; division creation 201 with Location. Missing resources 404,
conflicting division name 409, invalid values 400, inactive/missing/non-admin identity denied, storage
failure 503. Native ProblemDetail/shared error enum and Cache-Control private,no-store.
Configuration replacement stores author UUID and UTC timestamp and affects only future cycles.
Fresh configuration starts disabled with no selected season/sources; enabling requires explicit
season and at least one source. No source classification guessed from competition names. The excluded
organizers LIGU/LIGY/LIMART/LIMY/LIRE cannot be enabled in this FFVB increment.

Clubs have UUIDs and exact FFVB string codes (leading zeroes retained); optional name stays absent.
Divisions have UUID, unique name, active flag. Teams have UUID and unique club/season/division/format/
gender/canonical normalized name. Alias lookup by gender precedes lowercase, outer strip, curly
apostrophe replacement, hyphen-to-space and period removal. No accent/internal-space normalization.
Pools have UUID and unique provider/organizer/season/code, with explicit team memberships; removal
never globally deactivates a team used elsewhere. Match and historical standing references remain valid.
Team display changes keep UUID; new canonical provider names may create new UUIDs.
Mappings retain exact organizer/provider label and explicit division/format/gender; unknown labels are
unmapped. No manual team-rebinding API. Known aliases retain the current scraper's single source.

## Delivery 2: Collection and Durable Publication

Server allocates a monotonic cycle sequence before any provider download. Configuration is captured
for that cycle. Discover organizers/pools, composition, calendars and official standings separately.
Retain departmental/regional/national sources and exclusions. CSV Windows-1252 and HTML table variants
remain pure offline parsers. xxxxx is the documented exempt position: no fake team or public match;
other missing identifiers are invalid. Composition without standings can be complete.

One shared closed HTTP client, max ten concurrent provider requests, bounded supervised tasks, no
cycle overlap, coalesced lateness, clean awaited shutdown. Paris Saturday >=17:00/Sunday >=14:00 every
five minutes; otherwise thirty. Retry only the failing call. M2M credentials remain in scraper: cache
token across cycles to actual expiry minus margin, serialize renewals, cooldown failed acquisitions,
never loop token acquisition on API errors. Native Spring JWT/scope validation.

POST /imports/ffvb/cycles creates the cycle; discovery and closure are explicit scoped operations.
POST /imports/ffvb/observations accepts one pool/cycle observation and returns 202 + tracking Location
only after observation and job commit together. Same idempotency key/content returns its prior receipt;
different content 409. Store owner receipt independently of seven-day job retention. Maximum 4 MiB,
5000 matches, 256 participants/standing rows; reject oversize, never truncate. Job contains observation
reference only. Per-component complete/partial/unavailable/invalid states are explicit.

Worker prepares outside long SQL transactions, locks publication scope, rejects superseded sequence,
and publishes calendar with required teams/memberships plus durable sporting events atomically under
the current job lease. Lost lease yields no effects. Standings publish independently. Track received,
processing, published, rejected, temporarily failed and superseded; preserve component outcomes.
Admin failed-import listing/retry reuses durable job budgets, preserving ordering and idempotency.

Partial/failed data never deactivates. Recognized empty initial calendar is allowed, but never erases
a populated prior calendar. Membership retirement requires complete composition; pool retirement
requires complete discovery and a sufficiently complete finished cycle. Interrupted cycles do no
cleanup. Missing optional data retains trusted values. Events use entity/revision uniqueness, no jobs
for absent consumers; initial historical results do not produce new-result notifications.

Known schedule: source date/time, IANA zone, UTC Instant. Date-only: source date and zone, no instant.
Current FFVB sources explicitly Europe/Paris. Unproven 00:00 yields date-only; preserve prior reliable
time only for unchanged date AND zone. Reject unresolved DST gaps/overlaps, never arbitrarily convert.
Typed date/timestamptz storage, source zone separate. Results contain set score/details, official F/P
markers explicitly, never fake zeroes. Removed published results retain prior proof with operator
conflict. Continue other valid changes. No standings computed from matches.

Official standing snapshots retain position/ties/row order, points and supplied optional stats,
collectedAt and optional officialUpdatedAt. MAX is representable as supplied, never 1000. F. remains
source-labelled supplementary information, not an inferred numerical penalty. Partial/invalid/wrong-
context standings retain last usable snapshot; no snapshot means explicit unavailable. Historical
snapshot team references are not rewritten by later matching. JSONB is reserved for normalized
observations and technical structured data; published sporting fields use typed columns.

## Delivery 3: Public Consultation

Public pool list/detail/participants/official-standing, team detail/pools and match detail are local
side-effect-free projections, without recursive rankings/clubs. Unbounded collections paginate.
GET /matches requires exactly poolId OR teamId, status upcoming|completed, timeZone default UTC,
limit default40/max100, optional cursor. No global/favorite feed. Days ascending upcoming/descending
completed, stable pool context, corresponding time direction, date-only last in group, immutable ID
as tie-breaker. Real local day half-open bounds handle 23/25-hour days; date-only uses announced date.

Cursor lasts thirty minutes and binds selection/timezone/limit/asOf/last position/calendar revision.
Sign through existing JWT library and dedicated cursor key. Pool/team revisions change for membership,
date or status affecting selection/order, not identical observations or label/score-only edits. Read
revision+page in one consistent read transaction; no transaction survives a request. Invalid 400,
expired/incompatible 409 with refresh code, absent/inactive resource404. Mobile presentation is deferred.

## Evidence and Boundaries

Use real PostgreSQL for uniqueness, transactions, concurrency, privileges and Liquibase. Test aliases,
new provider names, multiple pools, exact codes, admin revocation, wrong user/client/scope and inactive
profiles. Fifteen authentic reduced fixtures demonstrate format variety, not complete-pool scale. Add
explicitly synthetic complete fixtures for publication/reconciliation and pagination. Verify F/P/MAX,
exempt positions, no standings, optional data, stale ordering, idempotency, leases/crash/retry, removed
results, dates in Paris/Montreal/UTC/Kolkata and cursor expiry/invalidation.

Generate/compile Java/Python/TypeScript, check unchanged legacy parser outputs for shared changes,
ArchUnit/Nx, full Maven/scraper/workspace, real Docker controlled-provider collection -> receipt ->
worker -> reads/restart. Micrometer measures bounded collection/publication outcomes/duration/lag,
unmapped labels, conflicts, last success vs last actual change. No entity/user IDs as labels. Verify
Prometheus scrapes and Grafana panels. Controlled complete-observation publication must finish in
under five minutes; real qualification at 2x measured Sunday peak remains separate.

No LNV, club directory enrichment, search, favorites, lives, notifications, mobile rebuild, production
deploy/reset or native purchase continuity in these deliveries.
