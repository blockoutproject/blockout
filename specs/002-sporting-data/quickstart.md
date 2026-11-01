# Quickstart: validate sporting integration

**Scope**: [plan](plan.md), [data model](data-model.md), [contracts](contracts/README.md).

## Prerequisites

Use the executable Maven/npm targets and focused sporting test commands in [README verification](../../README.md#verification). The boundary suites exercise generated MVC binding/mapping, collector serialization and mobile response validation before Query admission. They use controlled HTTP peers and synthetic data; the business, database and native journeys below require their owning implementations.

Use isolated PostgreSQL at the [F13-selected version](../003-shared-quality/plan.md#technical-context), the F13 contract toolchain and synthetic/minimized supplier observations. Keep raw supplier documents and personal contact data outside public fixtures. Prototype/browser evidence does not establish native or provider behavior.

## Identities and useful partial success

Integrate a complete contextual calendar, then replay it and postpone a known match. Expect stable identifiers and no duplicate participation or notification. Cover same club with distinct named teams, one team in multiple compatible pools, new season, qualified LNV team without club, optional technical attachment and a recognized bye without a fictional opponent.

Submit 100 matches with one local failure. Expect 99 successful updates retained, the failed match unchanged and no absence reconciliation. Compare malformed global context, contradictory duplicates, a truly empty current calendar and wholly empty historical reconstruction. None may turn a parsing failure into a successful empty observation.

## Ordering and transactions

Delay an older calendar and detail response until after a newer observation. Expect complete rejection of old match facts and no stale participation restoration or absence finalization. Admit a newer calendar while an older request is between match transactions; only the current successful complete calendar may reconcile absence.

Race classification correction with match integration and test a shared-participation collision. Expect all-or-nothing administrative correction, stable identities and preserved customizations. Test division deactivation and source withdrawal as independent reasons; ordinary collection cannot lift them.

Exercise numeric and recognized special results with provisional, final and unconfirmed finality through ingestion and consultation. Preserve notation independently; only a final result establishes a definitive-result transition.

Race first final result with F08 publication. Expect the F07 composition matching the accepted order. Fail internal inbox persistence: only that match rolls back. Fail push after commit: score and inbox remain. Verify initial imports, unchanged results, corrections and withdrawal/restoration do not duplicate consumed announcements or resurrect purged inbox entries.

Carry supplied and omitted `providerPublishedAt` through the actual generated collector/backend boundary, including image metadata. Verify retained fact groups keep their own timestamps, newly accepted facts without a publication time remain unknown, and source publication time cannot overturn the logical token.

### Collector-to-sporting boundary

T026 uses [CollectorSportingBoundaryIntegrationTest](../../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorSportingBoundaryIntegrationTest.java) with the [explicit disposable-runtime command](../../README.md#collector-to-sporting-qualification). The production collector lifecycle, passage, generated RestClient APIs and mappers call a separately packaged backend. Its real security filters validate locally signed synthetic collector credentials, and its real F01/F02 services commit against the Liquibase-migrated PostgreSQL 18.6 baseline under the restricted application role. Only supplier interpretation/discovery and response-loss injection are controlled.

The suite covers confirmed admission before provider work, pre-read ordinal allocation, backend-owned initial-import suppression through the real announcement participant, stable match/team/participation identities through late reads and postponement, and acquisition success remaining distinct from uncertain sporting integration. Lost admission and completion acknowledgements use a read of the original cycle; an unavailable confirmation stays uncertain, with no mutation replay. A collected response submitted after incarnation replacement is refused without new identities or completion, while already committed data survives. PostgreSQL connection-level blocking evidence verifies replacement waiting for an in-flight match transaction; subsequent old-context writes are refused.

This is synthetic cross-owner runtime evidence. The broader partial-success/absence qualification remains [F01 T032](../001-source-acquisition/tasks.md) under the separately owned [collector-to-sporting qualification](../001-source-acquisition/quickstart.md#collector-partial-success-and-absence-t032) scope; this suite does not qualify live supplier contents, club/geocoding acquisition, actual Auth0, mobile, push delivery or production operations. Ordinary CI compiles this opt-in suite and skips execution without its explicit runtime inputs.

### Result announcement transaction

T029/T033 bind `AcceptMatchObservation` to the real F08 current-public-link and F07 required
announcement participant. [The result-producer regression](../../apps/backend/src/test/java/com/blockout/backend/sporting/application/ResultAnnouncementIntegrationTest.java)
and [cross-owner cases](../../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAnnouncementsIntegrationTest.java)
qualify both concurrent publication/result orders, real inbox-constraint rollback, zero recipients,
initial finished discovery/trusted reconstruction, corrections, withdrawal/restoration and
post-commit failure. [F07's qualification](../011-notifications-delivery/quickstart.md#atomic-producer-and-link-qualification)
owns the detailed allowance and delivery limits. These are synthetic SQL/producer proofs, not
provider-content, native-push, real moderation or operational purge qualification.

## Contracts and fields

Generate actual Spring interfaces/DTOs, RestClient and mobile consumers from the canonical roots; compile and exercise real request/response binding. Cover omitted/null/value, strict unknown request fields, tolerant response additions, unknown enums, dates, safe Problem Details and bounded partial outcomes. Regeneration must be deterministic without template patches or committed generated output.

Exercise club, team and division atomic multipart PATCH presentation saves through real MVC and mobile transport: JSON metadata with explicit nulls, image replacement, automatic-logo restoration and name/color changes in the same transaction. Reject an invalid image without saving another part of the form. Verify that `keep`/`automatic` reject an unexpected image and `replace` requires one. Pool PUT edits accept complete JSON names only and reject missing required fields, image or logo-action fields. Repeat an already-current permitted write: expect no new revision, image association or lifecycle transition. Contacts PATCH must apply all supplied fields or none. Division POST must return a usable Location matching the response identity; unsupported media types return 415.

Verify `Cache-Control: no-store` on administration/ingestion successes and errors, and the Bearer challenge on 401; the application-owned query cache must still obey account-switch and permission rules.

Try wrong-environment M2M tokens and unauthorized/stale administrative commands. Expect no effects. Lose a response and read current state before an explicit retry; no automatic mutation replay. Exceed the calendar/image bounds and verify explicit refusal, never truncation or deletion of valid images. Qualify a complete source-season catalog against the 8-MiB JSON bound; include repeated pool labels under distinct compound contexts and identical duplicates. Expect positional result correlation, one atomic catalog commit, and no absence change for stale, invalid or oversized input.

### Generated facts and public reads (T034)

[CollectorSportingReadIntegrationTest](../../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorSportingReadIntegrationTest.java)
extends the [existing opt-in runtime](../../README.md#collector-to-sporting-qualification),
with the same explicit disposable database, repackaged backend and local signed
collector credentials. The production collector mapper and generated RestClient
submit facts to the backend's generated ingestion interfaces. Anonymous HTTP
reads then exercise F03's real generated-interface adapters and response mapping;
no response DTO is constructed to replace those reads.

The cases cover numeric final/provisional/unconfirmed results; synthetic `F`, `P`,
`3/F`, `3/P`, `F/F` and `2/F`; partial date-only facts and FFVB `00:00`; unusable
sets beside a usable overall result; retained compatible sets with independent
freshness; supplied versus unknown publication time; stale whole observations;
and a newer logical read containing an older supplier publication. The last case
preserves the accepted publication-age limitation rather than introducing page
priority or publication-time ordering.

The binary image case submits a generated logo request with supplied or omitted
publication metadata, checks the retained timestamp and compares the real F03
logo response to the original synthetic PNG bytes.

Document cases cover private qualified locators, information independent of a
result, professional scoresheet/statistics finality, result withdrawal/restoration
and rescheduling under the same identity. F03 responses expose backend document
subresources only. Ineligible binary requests return NotFound before supplier
fetching. Eligible PDF bytes are not requested. Standings retain official row and
column order, absent rank/statistics, nonnumeric ratios, exact participant links,
unmatched rows and original table freshness through non-publication or a recorded
acquisition failure. No-table, not-published and published-empty remain distinct.

All input facts and publication timestamps in this suite are synthetic regression
evidence, including every special notation; they add no provider-observed sample
or coverage claim. Existing [source interpretation limits](research.md#supplier-interpretation-limits)
remain applicable. Actual source association, PDF relay and physical/native
qualification remain with [F03 T057/T058](../007-sporting-consultation/tasks.md),
and this qualification completes no other F02 task or release gate.

Executed on 2026-10-31 in the issue-205 worktree against unchanged backend source
`4690a987bbf061245b24c0ec711fd65550c73bdd`. Its repackaged Spring Boot JAR had
SHA-256 `ffe986e26ec7b27ce9b89a507e29675d210e6f5b67b536611baeb8c2ac474ae3`.
PostgreSQL 18.6 used the newly created Compose project
`blockout-205-qualification` on loopback 5585, with explicit Liquibase migration
and the restricted application runtime role; suite-owned backends used 8385 and
local signed identities. The Java 25.0.4 runtime was Microsoft OpenJDK; the CI
vendor remains Temurin. No JVM, dependency or contract configuration changed.

Passed: all 25 new T034 cases and the complete `collector:test` target (215
Surefire + 197 Failsafe cases, no skips), including the existing admission,
ordering/transaction, partial-success, contextual-identity and presentation
qualifications. Complementary backend checks passed 97 unit/MVC/contract cases
and 63 Failsafe cases in `CalendarAcceptanceIntegrationTest`,
`MatchDetailsAndStandingsIntegrationTest`, `PoolConsultationIntegrationTest` and
`MatchDocumentsIntegrationTest`. Contract lint/bundling, actual Java generation,
compilation, Checkstyle, Spotless, repository Prettier and diff hygiene passed.
The handwritten test source blob is
`02beb7c7e6911f8368fe78e63a67dc8107a96911`; no production change was needed.

The suite-owned backend/signing listeners and clients closed after execution.
The isolated Compose container, network and volume were removed. These synthetic
HTTP/SQL/reference results complete only T034, with the provider/native and
publication-age limits above unchanged.

## Classification and division editors

T014/T018 use the existing F05 session and F12 operational admission. Enter pack/pool
classification from the discovered collection children with both the collection
read and classification action grants. `manageSportingClassification` and
`manageDivisionLifecycle` independently admit technical administration and the
division list; collection, presentation and activity remain separate grants.
Routes live under `apps/mobile/src/app/(operations)/administration/`.

The [classification suite](../../apps/mobile/src/features/sporting-administration/__tests__/classification.test.tsx)
exercises complete overrides, explicit null/inheritance, incomplete/inactive
choices, all-request conflict feedback, retained dirty values, failed and
successful current-state recovery, distinct canonical conflict reasons, invalidation
of previously loaded club teams, independent activity and real protected-route
removal/reentry. The [presentation suite](../../apps/mobile/src/features/sporting-administration/__tests__/presentation.test.tsx)
adds division creation through the same RHF/Zod name/color/logo form and generated
multipart client with an `application/json` metadata part, native confirmation, duplicate-name handling after a lost
response and no activity write. Native SDK credentials and HTTP are controlled in
Jest; these tests do not qualify backend transaction outcomes, provider identity
or native rendering.

[T014/T018](tasks.md) cover the bounded mobile editor, its administration entry and controlled tests. It adds no global mapping projection, catalogue API or broader acceptance requirement to T018.

Implementation inputs include [Product Design mapping controls](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4652-28674), [division catalogue](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1340-9338), [creation](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1370-10242) and [gradient/lifecycle](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1368-10291). These identify design sources, not a passed fidelity comparison. The implementation uses F13 native stack sheets and the existing RHF control; lifecycle and presentation retain independent commands with one revision/recovery owner.

The retained captures for [T014/T018](tasks.md) are implementation illustrations only. They are not native, visual, provider or integrated-journey evidence and must not be reused as acceptance, passed scenarios or partial qualification. T055 remains wholly unexecuted for completion purposes and must be performed afresh using its owning specification, approved plan and [prepared scenarios](#presentation-contacts-and-continuity). Future agents must assess the current implementation independently, without inheriting conclusions from that exploration. Related [F13 live Dynamic Type and iOS input qualifications](../003-shared-quality/quickstart.md#profile-forms-and-contextual-sheets) remain with their owner.

## Presentation, contacts and continuity

In existing native journeys, verify a professional team with no club remains readable/followable without a club link or invented point. Exercise team override → LNV → optional club → missing artwork, plus unchanged nonprofessional inheritance. Fail logo retrieval/replacement and retain the last valid presentation. Check both themes, enlarged text, focus and meaningful accessible action labels.

For T045, use the exact [approved editor, professional-team, partial-map and
320-point/200% references](plan.md#consumers-and-approved-design). Prepare
demonstration resources and a current account with `manageSportingPresentation`;
classification, lifecycle, moderation and Pro alone must grant no editor access.
Enter the club, team, pool and division presentation routes through their resource
action and the actual F12 operational group. Confirm that club edits contain one
name, team/pool edits contain independent full/short names, pools have no image,
and division name/colors/logo do not change activity. No contact-correction form
is part of this mobile scope.

On native iOS and Android, run both system themes at ordinary and narrow widths,
then enlarged text including the approved 320-point/200% specimen. With VoiceOver
or TalkBack, check labels, image preview/close, replacement and restoration,
validation focus, keyboard reachability of the final field/save action, and
back/gesture cancellation versus explicit draft discard. This preparation does
not qualify the separately retained iOS text-resizing/minimum-iOS limits.

Save names and a nonsquare PNG/JPEG in one multipart request, including manual
logo → automatic → missing fallback, and reject invalid/oversized artwork without
changing names or the last valid image. Exercise protected binary retrieval under
current visibility/maintenance, including an unavailable logo with usable editor
fields. Keep dirty fields during refetch. Race another editor, lose a save
response, fail the subsequent read and withdraw the action grant/session while
the picker or save is pending. No mutation may replay automatically; re-enable an
explicit retry only after a successful original-target read, preserving dirty
fields and updating untouched fields/current revision. A current matching state
establishes only the observed outcome.

In the F03-owned journey, separately check the professional team without a club,
the optional club link when present, and partial maps without invented locations.
For A39, use private F14 recovery inputs: certain identity with retained file,
unresolved/missing identity with retained association, and certain identity with
missing file. Reapply only the certain retained file; keep unresolved evidence
private and report missing bytes explicitly. Never publish recovery associations,
original URLs, personal diagnostics or files in this repository/PR. These cases
are prepared here; execution remains with T055/T056 and their authorized inputs.

Change effective municipality/postal context while a geocoding response is in flight: the old point must not return. A street-only or overridden source change must not move it. Exercise each contact mode and current privacy restrictions without retaining former personal details.

Exercise standings with and without a retained usable table: `published` with empty rows remains an available table; `not-published` with empty arrays is qualified absence, and a failed/unreadable read is neither. Preserve a still-usable retained table and its own freshness on failure or non-publication; without one, F03 distinguishes qualified absence from unavailable acquisition. Reject non-publication with nonempty arrays and stale absence observations without effects. A successful table containing an unlinked row preserves official order without a fabricated team. Close a season and verify history remains while new cycles are refused. F14 logo preservation and controlled initial reconstruction remain prerequisites for any separately authorized transition, not actions of this quickstart.

### Collector logo and locality acceptance

T054 uses [CollectorPresentationBoundaryIntegrationTest](../../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorPresentationBoundaryIntegrationTest.java)
with the [disposable-runtime procedure](../../README.md#collector-to-sporting-qualification).
Package and migrate the backend as documented, then select
`-Dit.test=CollectorPresentationBoundaryIntegrationTest,CollectorSportingBoundaryIntegrationTest`
with `-Dblockout.qualify-collector-sporting=true`. Both suites run serially against the
explicit database/backend properties. Ordinary CI compiles them and skips execution
without these opt-in inputs. The dedicated `collector-presentation.sql` supplements
the existing reset fixture only in that disposable database.

On 2026-10-25, the issue-200 worktree qualified the production collector lifecycle,
passage, generated ingestion clients/mappers, backend security/controllers and
F01/F02 commits on PostgreSQL 18.6, explicitly migrated with Liquibase. The isolated
Compose project was `blockout-issue-200`, PostgreSQL port 5500 and backend port 8200;
the backend used the restricted application role. Collector `verify` passed 284
ordinary tests plus 13 presentation/locality and 10 existing cross-owner runtime
cases. Backend packaging, contract lint/bundling, Checkstyle, Spotless and repository
Prettier passed.

The 13 cases establish:

- One image acquisition per distinct resolved team across repeated matches and
  pools with distinct calendar URLs in a passage, including failed attempts. Two teams sharing one URL still
  receive their independent acquisition. PNG content served under a JPEG name/type
  is retained as PNG.
- HTTP 404, corrupt bytes, a valid unsupported GIF and a decodable PNG above 5,242,880 bytes preserve the last
  accepted source image, manual logo and name while every usable match commits.
  The oversized PNG remains below the decoded-pixel and 8-MiB transport bounds.
- Target reads resolve a correction made after admission. The generated locality
  request carries that current revision; a correction while acquisition is in flight
  or an explicit return to source rejects the earlier point. Technical acquisition
  failure sends no further locality proposal and preserves a valid current point.
- Current restrictions prevent municipal acquisition and source-field republication.
  Manual locality and deliberate absence survive club recollection; source changes
  masked by corrections and street-only edits preserve the point and locality revision.
- Real Servlet multipart PATCH binds JSON metadata with explicit nulls and image
  bytes. Invalid replacement preserves the whole previous form/revision; automatic
  restoration serves the accepted source bytes through the real image read.

Calendar, club-page and municipal interpretation are controlled inputs. Image GETs
use the production LNV image/Apache transport against a loopback HTTP server;
locally signed credentials exercise real security without Auth0 access. Contact
corrections use the real administrative HTTP API. The no-public-endpoint F11
restriction is seeded as current SQL state, so these cases do not qualify the manual
rights procedure itself. Administrative multipart uses Spring RestClient, not the
native mobile networking stack. No live FFVB/IGN/LNV reads, provider coverage,
native design/accessibility, production or protected-logo recovery are certified;
those remain with their owning tasks, including T055/T056 and [F01 T058](../001-source-acquisition/tasks.md). The
retained [F13 live Dynamic Type and iOS 17 input limits](../003-shared-quality/quickstart.md#profile-forms-and-contextual-sheets) are unchanged.

### Current visibility and projection boundary

F02 T035–T040 are exercised by `SportingVisibilityIntegrationTest`, `SportingProjectionIntegrationTest` and `ReadSportingDataTest`, alongside the existing calendar/identity/classification suites. The integration suites use the real F01 admission, closure and completion services with explicitly migrated disposable PostgreSQL 18.6 and the restricted application role.

Current public reads recheck canonical visibility, permitted municipality, qualified aliases and participation; they never hydrate from an index document. Retained internal identity reads remain available to acquisition. A known date without a time remains eligible; a dateless or withdrawn match does not. Official standings retain labels, order and statistics while dropping links to unavailable participants. `SportingProjectionChanges.Changed` carries only identities/scopes after commit; `projectionDependents` expands current retained relations in batches, including hidden identities needing index removal. Rollback emits no handoff and score-only changes submit no search work. No request queue or recovery state is stored.

Presentation inputs now include independent current full/short names and permitted effective city, with current club names in dependent team reads. `SportingPresentationIntegrationTest` exercises atomic names/images, independent contact modes, current field restrictions, locality revisions, cross-season logo inheritance and LNV/manual precedence against the migrated PostgreSQL baseline. It also checks account-grant withdrawal, restriction/collection exclusion and the F01 incarnation fence through the source-image commit. Restricted source/manual contact columns are cleared; a synthetic restored value behind a retained restriction remains absent from owner reads. This is controlled backend evidence, not a backup-restoration or F14 qualification.

`SportingPresentationWebMvcTest`, the extended `SportingIngestionWebMvcTest` and `DivisionAdministrationWebMvcTest` exercise generated request/response binding, explicit nulls, media types, current permissions, safe errors and atomic save admission. `SportingPresentationMultipartIntegrationTest` sends real multipart PATCH requests over loopback to the selected Servlet runtime with the production controller and controlled use cases. It verifies required-null metadata, original image bytes and the exact 5,242,880-byte boundary. The actual PNG/JPEG decoder and 4,194,304-pixel ceiling remain the shared JDK validator's responsibility. `IngestionBodyLimitAdviceTest` proves the source-image cutoff before native `Resource` conversion with declared and unknown body lengths; the ingestion MVC suite verifies refusal before any image use case. The professional artwork case also reads distinct effective/manual and automatic bytes before removing the manual image. These cases establish Servlet binding and the bounded owner transactions separately; they do not qualify a native mobile transport.

F01 consumes current permitted municipal context and its revision through the existing read boundary. A missing/restricted effective municipality suppresses the complete served geocoding context. A postal identifier remains optional under that boundary; a qualified unambiguous result for the current context supplies the point. Street-only and masked source changes do not create a locality revision or a new need. F01 retains all attempts, cadence, one-hour deadline, pauses and relaunch ownership. The owner-only suites above do not themselves complete T041; its implemented consumer evidence is recorded below. No provider, native-device or production qualification is claimed.

### T041 current restrictions and presentation

[CurrentRestrictionsIntegrationTest](../../apps/backend/src/test/java/com/blockout/backend/search/application/CurrentRestrictionsIntegrationTest.java)
uses actual admitted F01 cycles, F02 catalog/calendar/division commands, F03 public
HTTP reads and F06 desired-state follows, personal lists, season options and the
personal calendar. The real F04 `ProjectSearch`, matching adapter and native
projection writer use disposable TLS OpenSearch 3.9.0 alongside explicitly
Liquibase-migrated PostgreSQL 18.6 under the restricted application role.
Projection execution is delayed explicitly; catch-up consumes the actual committed
identity scopes since the preceding publication and rereads current SQL. Consumed
events and rebuild preparation events are cleared between observations. No sporting, follow, hydration or projection
owner is replaced by a double.

The cases observe old native candidates before catch-up and separately verify
targeted deletion/return and complete generation replacement. Catalog absence,
one qualified empty current calendar and division inactivity exclude retained
targets from fresh public/personal requests, old detail/calendar/image links,
club teams and search examples. Catalog rediscovery, calendar return and division
reactivation remove only their own cause. Individual match withdrawal also
defeats completed-calendar selection despite a retained accepted final score.
Another admitted participation keeps the original team usable. Every transition
preserves complete original follow tuples; an identically named team in another
season acquires no implicit relation. Real pause/closure retain consultation and
follows while the already-running cycle finishes once and further acquisition
is refused.

[CurrentPresentationIntegrationTest](../../apps/backend/src/test/java/com/blockout/backend/search/application/CurrentPresentationIntegrationTest.java)
completes T053's consumer chain: current source and independent manual full/short
names, a qualified technical alias, permitted locality and field restrictions
reach effective F03 responses and actual native F04 documents. A stale city
candidate is rejected before reindexing, even when its name also matches. The
existing private F11 operation is exercised with fictitious inputs; source
restoration and recollection cannot republish a restricted field. Street-only
and masked source changes preserve the point/revision and produce no new F01
geocoding need; a changed effective context rejects an old in-flight result.
Current club-logo inheritance spans two seasons without copied team bytes,
while manual team and accepted LNV priority are checked through actual public
binary reads and search hydration. Exact synthetic optional-club association
preserves the professional team's native identity.

Run after the existing contract bundle target:

```sh
NX_LOAD_DOT_ENV_FILES=false npx nx run http-contracts:bundle
./mvnw -B -ntp -pl apps/backend verify \
  -Dtest=ReadSearchTest \
  -Dit.test=CurrentRestrictionsIntegrationTest,CurrentPresentationIntegrationTest
NX_LOAD_DOT_ENV_FILES=false npx nx run backend:test
```

The [existing owner cases](../../testing/integration-tests.md#sportingvisibilityintegrationtest)
retain partial/failed/wrong-context input, source-authority, historical-empty
reconstruction and standings limits. `SportingPresentationIntegrationTest`,
`SearchCurrentDataIntegrationTest`, `ProjectSearchTransactionIntegrationTest`,
`SearchProjectionIntegrationTest`, `FollowListsIntegrationTest`,
`FollowOptionsIntegrationTest` and `PersonalCalendarIntegrationTest` retain their
own transaction, matching, publication/failure and composition boundaries.
Freshly integrated [F13 current-truth evidence](../003-shared-quality/quickstart.md#current-sporting-truth-qualification-a01a03-t021)
and [T034 generated facts/public reads](#generated-facts-and-public-reads-t034)
remain complementary; no collector/provider result is inferred from these new
in-process scenarios.

Clock, source facts, image/geocoding inputs, test JWT principal, exact technical
alias/club associations and authorization of the private rights operation are
controlled. This qualifies fresh server reads and real local SQL/index catch-up;
it does not establish retained native-screen behavior, live scheduler timing,
actual IGN/LNV/FFVB responses, private rights handling, backup restoration,
physical/native accessibility, protected V1 logo recovery or production approval.
T055/T056, F01 provider qualifications and the other owners' native/operational
tasks remain separate and unchecked where unfinished.

Executed on 2026-10-31 at qualification source
`3647b27de0a6afcf0be6170dcb9776ac7d2b5bb0`, against unchanged production sources at
`94f127b1c3b6a3804743d097e579d618b7756cfb`. The final handwritten test blobs are
`9a31049bea013d97ad389abfb2c3fc35e9367e8f` (restrictions) and
`759107ed3fa1ac1df20038b9f38a2a0bd43572b2` (presentation). The local Maven
`0.0.0-SNAPSHOT` build used Microsoft OpenJDK 25.0.4, Node 24.18.0 and npm 12.0.1;
CI retains Temurin. Spring tests execute compiled application classes; the
packaged JAR from the final focused verification has SHA-256
`227abf150ec14c04551492d6bd66bd5e24f5bac9afec74012cc4c7e97a16ea56`.

Passed: complete `backend:test` (1,464 Surefire; 1,178 Failsafe passed and one
unrelated opt-in F12 consumer case skipped because `BLOCKOUT_ACCESS_CONSUMERS_TEST`
was absent), then the final focused 14 cross-owner cases plus six `ReadSearchTest`
cases with no skips. This includes the existing owner suites named above;
`FollowListsIntegrationTest`, `FollowOptionsIntegrationTest` and
`PersonalCalendarIntegrationTest` passed 17, eight and 30 cases respectively.
Contract lint/bundling, real backend generation/compilation, Checkstyle,
Spotless, repository Prettier, added local links/anchors and diff hygiene passed.
Only T041 is completed by this qualification; T053's consumer evidence is now
available without changing its implementation or any common contract.

## Team presentation independence (2026-11-01)

Requalify parent-only artwork changes while a team editor is open: KEEP and an own-name edit succeed against the unchanged team revision, current inheritance across seasons remains live, REPLACE preserves precedence and AUTOMATIC resolves the latest fallback. Preserve own-team stale/no-op conflicts, classification/locality revisions, season/current grants and club-contact privacy locks. Verify the appended migration against an already-applied chain with retained synthetic artwork as well as clean creation. Current controlled results and the retained upgrade are recorded below and in the appended [tasks](tasks.md); historical parent-revision conflict assertions do not qualify this accepted replacement.

## Independent team presentation qualification (2026-11-01)

Source/test revision: pending delivery commit; verified working tree is based on `5a72566ce210e3a3e475dd979ab009e7c296fd54`. The delivery must replace this provisional revision before publication.

All 35 current `SportingPresentationIntegrationTest` cases pass in the coordinated clean backend run. The changed inheritance case accepts KEEP and a name edit after parent-only artwork changes while preserving current cross-season fallback. A concurrent PostgreSQL case completes the team edit while a separate club row lock remains held. Existing own-team conflict, precedence, season/current-grant, classification/locality and club-contact restrictions continue to pass. The run's unrelated collection fixture failure is not presented as a globally successful initial run.

A separate task-owned PostgreSQL 18.6/Liquibase probe applies the exact 11-changeSet chain from `5a72566ce210e3a3e475dd979ab009e7c296fd54`, inserts synthetic retained club and collection rows, then applies the current chain. All 11 applied checksums remain unchanged and exactly two appended changes run. The BS-01 change removes only `sporting_club.logo_revision`; club bytes/media type/name and own presentation/locality/contact revisions remain unchanged. The coordinated F01 change removes only its two obsolete clocks, preserving current operational evidence. The task database is removed afterward. This proves the scoped retained upgrade and clean suite creation, without resetting retained environments or claiming production rollout/rollback. Removed counters/clocks cannot be recovered by a schema rollback; stop incompatible writers and use compatible forward repair.

No native visual/editor rendering, provider image acquisition, real V1 logo preservation operation or production migration occurred. Historical qualifications retain their original revisions and limits.
