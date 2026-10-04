# F03 public read semantics

**Source**: [OpenAPI](consultation.openapi.yaml), [specification](../spec.md), F13 [transport](../../003-shared-quality/contracts/api.md). All eleven operations are public sporting reads; optional account authentication enables F12 bypass but grants no sporting mutation. Unknown query fields and malformed IDs/zones/cursors return 400. Missing or deliberately hidden targets return the same safe 404.

## Admission and consistency

Apply F12 maintenance admission before the use case. `503 MAINTENANCE_ACTIVE` includes F12's typed maintenance projection and is recognized before F13 retry classification. A configuration failure is `503 CONFIGURATION_UNAVAILABLE`, not invented maintenance. The mobile retains its accepted startup-only minimum-version policy. Blockout-owned responses use `Cache-Control: no-store`; TanStack retention is controlled explicitly by F03, not HTTP freshness.

Read current F02 entity/parent/division/participation visibility on every request. Undated matches are unavailable on detail and calendar routes. Independent section reads may succeed/fail independently; a stale header is not permission for its endpoints. Never return old restricted source contacts, referee values, coordinates or logos as a fallback. Return known permitted data without waiting for Pro or personal follow state. F09 affects advertisements only.

Common detail queries do not fetch tab payloads. Club Information is the club-detail operation; its explicit refresh can therefore update its season list. Team standings tabs all call the same pool-standings operation with their exact pool IDs; calendar tabs aggregate all visible team participations. Club teams/calendar carry explicit sporting seasonId. An authorized but currently empty club/season slice returns empty data; it is not proof that the season selector must change. Only a successful common detail response establishes available seasons.

## Whole-day reads

Follow [cursor algorithm](../data-model.md#cursor-and-loading-context). Responses contain up to seven nonempty days, never partial days or empty placeholders. `evaluatedAt` identifies the per-request classification clock. It is not a provider timestamp and does not establish a cross-page snapshot. A continuation with no remaining matches legitimately returns no days and no cursor. When client deduplication removes every card from a received page, still advance by the returned cursor and retain explicit further loading; do not infer end from the reduced card count.

A cursor is valid for its bound context, not a historical set of row values. Concurrent changes can move a match into or beyond previously traversed dates. Deduplicate by UUID, retain the first already displayed representation, and use explicit first-page refresh to reconstruct current state. Do not restart automatically or add global revision fencing. A timezone change does not alter the cursor context; newly selected season/resource/category is a different query context.

## Conditional payloads

Every consumed field is runtime-validated before cache success, including these conditions beyond primitive OpenAPI validation:

- Schedule `INSTANT` requires only `instant`; `DATE_ONLY` requires only `date`. No undated public schedule. UTC instants must be valid, not normalized from malformed strings.
- Result `ABSENT` carries no aggregate or sets. `PROVISIONAL` and `DEFINITIVE` require the two official aggregate tokens. Tokens are nonnegative integers, F or P; no invented winner. Set detail is independent: `AVAILABLE` requires its ordered sets; absent/unavailable detail forbids them. Golden-set presence/points remain separately explicit; no fabricated sixth set or score.
- Calendar category is computed from the current read, not the presence of any provisional score. An unavailable-result indication is derived only for COMPLETED lacking a definitive result.
- Public permitted optional scalar fields are omitted when no usable value exists; null is not accepted unless explicitly declared. Collection emptiness is not a technical error. Actual field/source unavailability is carried in freshness/section status, without disclosing a withheld personal value.
- Ranking AVAILABLE carries rows; NOT_PUBLISHED/UNAVAILABLE does not. Ordered statistics retain source codes/labels/value tokens; missing value is unknown, official row order is not recomputed rank. An unlinked row keeps its source label and omits teamId.
- Information-sheet AVAILABLE has no external URL: use the fixed matchId relay operation. Scoresheet AVAILABLE requires a qualified external URL and a definitive match result; otherwise INELIGIBLE or unavailable/absent applies. Professional media is an optional source-owned URL, never an F08 contribution.
- Map counts refer to visible participations. locatedParticipantCount equals the number of teams across reliable groups, not the number of coordinates; zero groups with positive participantCount means no reliable locations. Group by exact qualified municipality code and coordinates, not proximity or displaced points.

All response objects allow unknown additive fields recursively under F13. Unknown consumed enums fail safely rather than granting availability. Current owner facts take precedence over presentation state.

## PDF relay and errors

GET information-sheet accepts only matchId. Resolve current viewability and descriptor within a short SQL read, then call `https://www.ffvbbeach.org/ffvbapp/adressier/fiche_match_ffvb.php` with form-encoded `wss_saison`, `codmatch`, `codent`. No provider call inside SQL, no arbitrary destination, no cookies/tokens forwarded from the caller. Reject unqualified redirects rather than following arbitrary hosts. No provider HTML/PDF body in logs.

Use an eight-second total upstream deadline, no backend automatic retry, and a 10 MiB decoded response limit. These are protective transport bounds, not performance objectives. Validate successful status, application/pdf media type and `%PDF-` signature before returning buffered bytes. Recheck match visibility and the descriptor after fetching, outside the provider call, before handing off bytes; discard when hidden or descriptor changed. A changed descriptor returns 409 `DOCUMENT_REFERENCE_CHANGED`; no automatic replay. Return inline PDF with a generic filename and no-store. The relay never writes a disk/object-store archive.

Use 404 `NOT_FOUND` for hidden/undated match, 404 `DOCUMENT_UNAVAILABLE` for absent reference, 410 `DOCUMENT_EXPIRED` only when explicit supplier evidence establishes expiry, 502 `DOCUMENT_INVALID_RESPONSE` for HTML/invalid/oversized PDF, and 503 `DOCUMENT_SOURCE_UNAVAILABLE` for supplier transport failure. Unknown upstream absence/failure is not diagnosed as expiry. Errors follow F13 ProblemDetail and include only safe French information.

Mobile binary reads use F13's ten-second end-to-end read deadline and at most its one eligible retry; the backend does not add a second retry layer. Parse typed business refusals first, including F12 maintenance. An invalid PDF/body is a contract failure, not retryable simply because its status is 502. Native UI viewing has no network deadline once handoff succeeds.

For a direct scoresheet URL, download with a separate external transport without bearer, bypass or Blockout cookies; retain the same size/deadline/signature protections. Abort redirects outside qualified provider destinations. Scoresheet eligibility is re-established with a current match-detail read before starting a document action; relay eligibility is also enforced server-side. Do not archive or run background availability probes. `opened` or a returned activity result never proves that the PDF was read successfully.
