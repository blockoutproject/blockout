# F03 derived read and interaction model

F02 remains the persistence owner. This model adds public projections and minimal source metadata, not a second calendar store. [Read semantics](contracts/read-semantics.md) and [OpenAPI](contracts/consultation.openapi.yaml) own transport details.

## Persistent inputs

| Owner/input                        | Required facts                                                                                                                                   | Invariant                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| F02 Season                         | UUID, exact label, qualified startYear                                                                                                           | Most recent is chronological, not lexical or derived from match dates. F01 prepares it from published attribution.               |
| F02 Club/Team/Pool                 | IDs, effective presentation, allowed contacts, classification, season, visible relationships                                                     | Never substitute a namesake or source value suppressed by a manual/privacy decision.                                             |
| F02 Match                          | IDs, participation/pool, date-only or instant, official aggregate/finality, compatible sets, venue/referees, current restrictions and provenance | No undated public match; no inferred score, winner, end or qualification.                                                        |
| F02 source slots                   | informationSheet descriptor, scoresheet URL, professionalMedia URL with current source provenance/clear marker                                   | Unknown/failed observation does not erase a known admissible reference. A reference is not proof of document/media availability. |
| F01 qualified source reference     | Exact calendar sourceUrl and contextual correspondence                                                                                           | Serve the actually qualified FFVB calendar; no guessed URL from a pool code or duplicated match field.                           |
| F02 ranking/participation/locality | Official table and order, optional certain row-team association, visible participations, qualified municipal points                              | Standings cannot create participation or a map point; missing values never become zero.                                          |

No F03 table for pages, snapshots, document bytes, refresh receipts or media availability. Adopt additions through the F02 Liquibase baseline/change policy, not a migration executed during planning.

## Read projections

- `ClubDetailResponse`: identity, effective permitted contact/location fields and available seasons ordered by startYear descending/UUID ascending. Seasons come from viewable teams, including published future and closed seasons.
- `TeamDetailResponse`: seasonal identity, exact club link when viewable, classification and visible pool participations. One team identity can supply multiple standings tabs without multiple follows.
- `PoolDetailResponse`: identity, exact season/classification/competition context and known phase label. An unknown independent relationship is omitted, not guessed.
- `MatchDetailResponse`: current dated match summary, compatible detail, known venue/referees, professional media and applicable documents. F08 contribution state is fetched through its owner, not embedded here.
- `CalendarPageResponse`: ordered complete `days`, each with stable `groups` by pool and current match summaries; `evaluatedAt`, `groupingTimeZone`, optional `nextCursor`. No total count is promised.
- `StandingsResponse`: `AVAILABLE`, `NOT_PUBLISHED` or `UNAVAILABLE`, ordered official rows and known freshness. Only AVAILABLE carries rows, including a genuinely empty published table if the source establishes it. Unknown statistics omit their value, never zero-fill.
- `PoolMapResponse`: visible participant count, located participant count and reliable location groups. Each group carries exact team references; missing points do not imply no teams.
- `FreshnessResponse`: optional actual source observation/integration times; query `readAt` stays separate. Missing timestamps are unknown, not reconstructed from HTTP time.

Transport dates are ISO dates; established instants are UTC RFC3339 timestamps ending in Z. Public revisions, when needed, follow F02's decimal-string convention; no generic F03 revision is introduced. URLs are absolute supported destinations without embedded credentials. Public fields suppressed by privacy are omitted without revealing the suppressed value or a personal reason.

## Cursor and loading context

A calendar cursor is base64url encoded version-1 JSON with `resourceKind`, `resourceId`, applicable `seasonId`, `category`, `timeZone` and `lastDay`. Limit to 2,048 ASCII characters; strict parsing, recognized fields/version and exact context equality. First reads require category/timeZone and club seasonId; continuation sends the same parameters plus cursor. Malformed/mismatched cursors return 400 `INVALID_CALENDAR_CURSOR`; they do not grant access or trigger silent context substitution. No expiry, signature, server-side registry or persistent snapshot is needed for this public non-authorizing position. Current visibility is always rechecked.

Capture one server clock instant per request. At that instant select eligible days under restrictions/classification, sort in category direction, select at most eight distinct dates, then fetch every matching row in the first seven dates within the same read-only repeatable-read transaction. Produce a next cursor only when an eighth day exists. Unknown-time rows use their unconverted sporting date. Known instants use the cursor IANA timezone for the date expression. One bad/unavailable device timezone prevents a first read with a clear error; do not silently substitute Paris. A retained valid loading context can continue until refresh.

Group by pool UUID ascending. Known instants sort ascending in UPCOMING and descending in COMPLETED, followed by date-only rows; ties use match UUID ascending. UUID comparison uses canonical byte/hex ordering consistently in Java, SQL and TypeScript. No locale collation or inferred sporting priority.

Club teams use cursor pagination of 50 visible teams, name ascending under PostgreSQL C collation then UUID; the cursor binds club, season and last name/ID. A name correction may move across pages; the same deduplication/refresh policy applies. There is no total team cap. This separate ordinary list does not reuse calendar day cursors.

## Calendar mobile state

One retained screen owns selected tab, applicable season, loading timezone, ordered pages, deduplicated match IDs and a monotonically increasing request generation. TanStack Query owns responses; React owns local selection/refresh intent. Keys contain resource, season, category and loading timezone, with F05 account context only for private enrichments.

Initial read -> loaded or initial error. Append -> same loaded chain plus a validated new page, or retained chain plus page error. Refresh -> retain old chain while reading a new first page; success atomically replaces pages/cursor/context, resets to top, and rejects old-generation replies; failure keeps old pages and offers retry. Clear partial temporary refresh results after cancellation. Serialize pagination and refresh; do not append while a replacement is pending.

No loaded-list refetch on focus, foreground, reconnect or invalidation. Ordinary invalidation marks stale without refetch. A new screen opening intentionally starts a new read; returning to an already retained screen preserves its state. No persistent process-restart cache or claim of restoring a screen that navigation has destroyed. Loaded tab content may remain mounted within its owning retained screen; avoid remounting the whole page on a query success.

After travel, format instants in the current device zone while retaining group dates/continuation in the loading zone. Relative group labels use that retained date and loading-zone current date. Do not move rows or reevaluate their category locally. Refresh establishes a new loading zone and current grouping. A current detail response does not patch sporting values into an old calendar; known visibility/privacy restrictions still remove affected rows/fields and unsafe links from all controlled caches.

## Document state

Information-sheet reference: `season`, `organizerCode`, `matchCode` from attributable provider evidence. The adapter owns fixed HTTPS host/path and form names. Source descriptors remain private; the public projection exposes availability, not an arbitrary POST template.

Opening transitions: idle -> downloading -> native handoff -> closed; failures return to an actionable error state. Availability is AVAILABLE, ABSENT, UNAVAILABLE or INELIGIBLE; INELIGIBLE is used for scoresheet without definitive result. Only an AVAILABLE direct external document carries its URL. A retained internal reference is not deleted merely because display becomes ineligible.

Allow one opening per user action; cancel pending work when context/session is abandoned. Binary validation includes status, media type, PDF signature and bounded size. Native decoding can still reject a malformed PDF; a signature alone does not prove rendering. Temporary files use opaque names in a dedicated cache subdirectory, are never added to Query cache/SQL/object storage, and remain available until the viewer returns. Remove failed partial files, clean after closing, and sweep abandoned files at cold start. External apps may retain user-chosen copies; Blockout does not claim to control them.
