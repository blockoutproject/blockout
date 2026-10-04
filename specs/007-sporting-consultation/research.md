# F03 research and decisions

**Authority**: [specification](spec.md), [architecture](../../docs/architecture.md), [proportionate planning](../../AGENTS.md). Research establishes design feasibility, not a delivered runtime. The owner's 2026-10-09 instructions select stable lists, active-tab refresh and direct PDFs.

## D01 — Focused reads

**Decision.** Separate common resource information from calendar, standings, map and team-list operations. Initial page entry reads common information and the first tab; tab refresh reads that tab only. A club's Information tab uses the club-detail operation itself.

**Rationale.** Calendars paginate while identities and rankings have different shapes/failure boundaries. A single entire-page response complicates pagination and rereads invisible content.

**Alternatives and cost.** One large page DTO saves an initial request but couples independent sections. One endpoint per database entity exposes persistence rather than journeys. Selected reads add a small explicit query per visible section; no gateway service is created.

**Proof.** Independent failure, no sibling/header request on tab refresh, and route/back-navigation tests. F02 supplies views through its application API.

## D02 — Whole-day cursor without snapshots

**Decision.** Seven eligible complete days per page; stateless versioned cursor bound to resource/season/category/loading timezone and last day. JPA/HQL selects eight eligible dates, uses the first seven and obtains all their authorized matches in one short read-only repeatable-read transaction. The eighth date establishes continuation. Read evaluation time is captured once per request, not frozen across pages.

**Rationale.** F03 requires whole days and complete history. Selecting days first avoids a match limit cutting one day in two. PostgreSQL snapshot isolation covers the two statements, not a browsing session.

**Alternatives and cost.** Offset over matches splits dates and shifts under edits. Loading all history is unnecessary. Persistent snapshots or a global revision fence add storage/write coupling and disruptive restarts. Current reads plus UUID deduplication and explicit restart on refresh accept temporary movement across previously read boundaries.

**Proof.** Real PostgreSQL: mixed date-only/instant rows, empty gaps, full day, equal times, concurrent edits between pages and consistent date selection within one response. [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [date/time functions](https://www.postgresql.org/docs/current/functions-datetime.html), [Hibernate HQL](https://docs.hibernate.org/orm/7.1/querylanguage/html_single/). HQL function/cast support is qualified on the F13-selected runtime before accepting the query; no unapproved native-SQL fallback.

## D03 — Stable native lists

**Decision.** Use native virtualized lists with stable keys. Retain loaded data on focus, foreground, reconnect and ordinary invalidation. Manual refresh fetches a new first page before replacing the old chain; no position restoration after success. Maintain one pagination/refresh owner and discard old-generation replies.

**Rationale.** The owner prioritizes stable headers, rows and scrolling. Automatically changing data does not guarantee position preservation, especially with variable text heights.

**Alternatives and cost.** Automatic refresh with scroll anchoring requires additional reconciliation; automatic reset loses the user's place. Standard InfiniteQuery refetch rereads pages sequentially, so do not use it to implement the accepted first-page-only reset. No FlashList migration is justified by the current requirement.

**Proof.** Gesture/request-count tests and real-device scroll/back/foreground checks. [React Native SectionList](https://reactnative.dev/docs/0.86/sectionlist), [TanStack infinite queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries), [AppState](https://reactnative.dev/docs/0.86/appstate).

## D04 — Time and travel

**Decision.** Backend returns established UTC instants or date-only values. Current reads classify using definitive result, otherwise H+6 elapsed hours or next Paris midnight. Mobile formats instants locally. Retained group dates keep the loading zone after travel; subsequent pages retain the cursor's zone. Refresh reconstructs in the current zone.

**Rationale.** Timezone conversion is ordinary formatting. Repartitioning a retained paginated list on an uncommon travel event is not required by the owner. Date-only data is never converted to a made-up midnight instant.

**Alternatives and cost.** Automatic reset or local merging across tabs adds lifecycle behavior the owner rejected. The explicit tradeoff is a temporary mismatch between retained group day and newly formatted time; no special warning screen, polling or repair engine is added. Relative headers are formatted from their retained group date in the loading zone; detail labels use the current zone.

**Proof.** Paris/New York, DST 23/25-hour days, exact H+6, date-only boundary and foreground with no calendar request. [Expo Localization](https://docs.expo.dev/versions/latest/sdk/localization/). No foreground time conversion is evidence of newly fetched sporting data.

## D05 — Seasons and read ownership

**Decision.** Canonical F02 season stores `startYear` from qualified published season attribution; preserve its exact display label. F01 preparation resolves the year from its candidate, never from match dates or an increment. F03 orders visible club seasons by startYear descending then UUID. A successful season-list read, not an empty calendar, establishes disappearance.

**Alternatives and cost.** Lexical labels or max(match date) produce incorrect order. A user-editable ordering control is unnecessary. This adds one canonical numeric field and provider qualification; unknown attribution remains a candidate rather than a fictitious season.

**Proof.** Upcoming published season, closed history, postponed match, unavailable header, retained selection and confirmed disappearance.

## D06 — Source references and direct PDF

**Decision.** Add separate F02 observations for information-sheet descriptor, scoresheet URL and professional-media URL. Preserve F02 state/value/provenance rules. The official-calendar URL stays on the qualified F01 source reference. F03's relay takes only match ID, submits the fixed FFVB information-sheet form outside SQL, verifies a PDF response and returns bytes without persistence.

**Observed evidence, 2026-10-09.** Seven successful sequential direct HTTP reads: three reads of the [ABCCS/3FA 2026/2027 calendar](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=ABCCS&poule=3FA), two document GETs and two information-sheet POSTs. One initial sandbox DNS failure did not reach the provider; one inaccessible web-tool open is separate. No raw response or PDF was saved as a repository fixture.

| Source-emitted operation                                                                                                    | Observed response                                      |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Information form `../adressier/fiche_match_ffvb.php`, POST fields `wss_saison=2026/2027`, `codmatch=3FA013`, `codent=ABCCS` | HTTP 200, application/pdf, PDF signature, 5,066 bytes  |
| Same fields attempted as GET query                                                                                          | HTTP 200, text/html, 119 bytes, no PDF signature       |
| Same POST for played match `3FA007`                                                                                         | HTTP 200, application/pdf, PDF signature, 5,165 bytes  |
| Published `../resu/ffvolley_fdme.php?saison=2026/2027&codent=ABCCS&codmatch=3FA007`, GET                                    | HTTP 200, application/pdf, PDF signature, 34,347 bytes |

The page emits forms, not a universal documented PDF API. These samples establish a fixed adapter mechanism, not exhaustive historical/regional coverage or provider guarantees. Information-sheet access after a result is supported by the played sample. Sheet-content fidelity and native rendering remain future evidence.

**Alternatives and cost.** Opening the official calendar would add a manual step; the owner chose direct PDF. A GET-only link fails for the observed information form. Archiving every PDF or building a document service is unnecessary. The relay adds one existing-backend operation and a bounded supplier adapter. F01 collects descriptors, not PDF bytes; F03 consults a document on demand without performing sporting ingestion.

**Proof.** Qualified reference attribution, fixed host/path/form fields, valid PDF versus HTTP200 HTML, before/after result, restrictions and lost/aborted response. No liveCode-to-video conversion or new LNV TV discovery: F07 FR-039 remains authoritative.

## D07 — Native document handoff

**Decision.** Download with the appropriate HTTP transport before preview. Blockout requests retain F05/F12 headers; external requests never receive them. Use expo-file-system cache, iOS Quick Look through a narrow local Expo module, Android ACTION_VIEW/content URI through expo-intent-launcher. Remove temporary files after viewer completion and clean abandoned files at cold start.

**Rationale.** Opening the backend URL directly in a browser loses application bearer/bypass headers and prevents controlled API error handling. Temporary storage is needed for ordinary platform file viewing, not offline archival.

**Alternatives and cost.** A WebView/custom PDF renderer adds rendering ownership; a signed-link subsystem adds token issuance and expiration solely to bridge the browser. System preview needs a small iOS binding and native qualification, but no new PDF provider. Sharing alone is not treated as proof of reading.

**Proof.** [Quick Look](https://developer.apple.com/documentation/quicklook/qlpreviewcontroller), [Expo local modules](https://docs.expo.dev/modules/get-started/), [FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/), [IntentLauncher](https://docs.expo.dev/versions/latest/sdk/intent-launcher/), [WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser/). Actual readers, cancellation, temporary URI lifetime and cleanup require iOS/Android builds; package documentation is not native evidence.

## D08 — Maps, restrictions and integrations

**Decision.** Use accepted react-native-maps providers and municipal points from visible participations. Same-point teams use the existing selection panel. Keep ranking failure separate. Resolve F06/F08/F10 interfaces through their owners; known restrictions immediately suppress obsolete projections, including private account data under F05.

**Alternatives and cost.** Deriving points from ranking rows drops valid participants; geolocation, displaced coordinates or a new clustering platform are unnecessary. Copying follow/contribution state into sport creates competing owners. Selected explicit interfaces require their real integrations before whole-feature acceptance.

**Proof.** [Expo map integration](https://docs.expo.dev/versions/latest/sdk/map-view/), exact approved states in [mobile/design](contracts/mobile-and-design.md), map without standings, shared point, denied resource, guest/free/Pro/unknown entitlements and account replacement. Provider attribution on native maps follows Apple/Google, not the prototype's OpenStreetMap artwork.
