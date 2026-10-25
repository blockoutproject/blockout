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

This is synthetic cross-owner runtime evidence. The broader partial-success/absence qualification remains [F01 T032](../001-source-acquisition/tasks.md) under the separately owned [#194](https://github.com/blockoutproject/blockout/issues/194) scope; this suite does not qualify live supplier contents, club/geocoding acquisition, actual Auth0, mobile, push delivery or production operations. Ordinary CI compiles this opt-in suite and skips execution without its explicit runtime inputs.

### Result announcement transaction — #252

T029/T033 bind `MatchAcceptanceService` to the real F08 current-public-link and F07 required
announcement participant. [The result-producer regression](../../apps/backend/src/test/java/com/blockout/backend/sporting/application/ResultAnnouncementIntegrationTest.java)
and [cross-owner cases](../../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAnnouncementsIntegrationTest.java)
qualify both concurrent publication/result orders, real inbox-constraint rollback, zero recipients,
initial finished discovery/trusted reconstruction, corrections, withdrawal/restoration and
post-commit failure. [F07's qualification](../011-notifications-delivery/quickstart.md#atomic-producer-and-link-qualification--252)
owns the detailed allowance and delivery limits. These are synthetic SQL/producer proofs, not
provider-content, native-push, real moderation or operational purge qualification.

## Contracts and fields

Generate actual Spring interfaces/DTOs, RestClient and mobile consumers from the canonical roots; compile and exercise real request/response binding. Cover omitted/null/value, strict unknown request fields, tolerant response additions, unknown enums, dates, safe Problem Details and bounded partial outcomes. Regeneration must be deterministic without template patches or committed generated output.

Exercise club, team and division atomic multipart PATCH presentation saves through real MVC and mobile transport: JSON metadata with explicit nulls, image replacement, automatic-logo restoration and name/color changes in the same transaction. Reject an invalid image without saving another part of the form. Verify that `keep`/`automatic` reject an unexpected image and `replace` requires one. Pool PUT edits accept complete JSON names only and reject missing required fields, image or logo-action fields. Repeat an already-current permitted write: expect no new revision, image association or lifecycle transition. Contacts PATCH must apply all supplied fields or none. Division POST must return a usable Location matching the response identity; unsupported media types return 415.

Verify `Cache-Control: no-store` on administration/ingestion successes and errors, and the Bearer challenge on 401; the application-owned query cache must still obey account-switch and permission rules.

Try wrong-environment M2M tokens and unauthorized/stale administrative commands. Expect no effects. Lose a response and read current state before an explicit retry; no automatic mutation replay. Exceed the calendar/image bounds and verify explicit refusal, never truncation or deletion of valid images. Qualify a complete source-season catalog against the 8-MiB JSON bound; include repeated pool labels under distinct compound contexts and identical duplicates. Expect positional result correlation, one atomic catalog commit, and no absence change for stale, invalid or oversized input.

## Classification and division editors — #178

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

The mobile correction uses [Product Design mapping controls](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4652-28674), [division catalogue](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1340-9338), [creation](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1370-10242) and [gradient/lifecycle](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1368-10291). The selectors follow UI Library `164:200`; color derivation follows its Color notes `3193:116`/`3193:125`. Selection uses F13's native stack sheet and the existing RHF control. Lifecycle recovery shares the presentation editor's original revision and explicit reread; no per-card recovery store remains. The catalogue uses a virtualized list, local name/activity filters and one editor entry per editable row. Tests also cover readable division foregrounds, automatic-gradient restoration and dirty presentation values surviving an independent activity command.

T018 remains incomplete against the entire approved journey. Current OpenAPI reads expose individual classifications and division presentation/activity, but no global mapping projection with source/season filters and pack/pool summaries, nor division pool counts. This delivery stays within the mobile scope: no new backend/database reads, client-side N+1 reconstruction or invented counts. Classification therefore keeps its existing contextual route rather than claiming the inline global catalogue. Full preview transitions and F03/F10 navigation remain outside these editor routes; root/public navigation is unchanged. Ordinary actions scroll with fields and confirmations use native alerts, as already selected by F13. These limits are not design acceptance.

Native examples were exercised on application revision `6735bb0`, iPhone 18 Pro B / iOS 27.0, 402 × 874 logical points, system text size `large`, with the actual F05/F12 session/admission, generated clients and unchanged backend against isolated synthetic data. Observed: active/inactive catalogue filtering and creation entry; native creation confirmation and persisted creation; keyboard-open scrolling to the save action; independent deactivation/reactivation; native division/genre/format sheets retaining the RHF draft; complete pool correction persisted as Ligue B / `4x4` / `mixed`; and Light/Dark appearance. [Nine reviewed captures](https://github.com/blockoutproject/blockout/pull/502#issuecomment-6395696451) are attached to the PR Conversation, outside Git.

The development client's floating tools window intercepted the catalogue's + target. Its installed SDK launch option `__expo_disable_fab=1` restored normal entry; no application workaround was retained. The native flow began from an admitted session: initial development-client restoration/deep-link attempts produced a `ROUTE_NAMES_CHANGED` warning and the ordinary empty launcher. These captures do not qualify cold restoration/deep links. The semantic creation-entry case also passes through the actual protected route tree in the classification suite.

This sample does not establish strict complete Figma fidelity, Android, narrow/enlarged-text, screen-reader, logo-provider or failure/uncertainty qualification. T055, [#433](https://github.com/blockoutproject/blockout/issues/433) live Dynamic Type and [#449](https://github.com/blockoutproject/blockout/issues/449) minimum-iOS input remain pending. The native session and task-owned services were released after capture.

## Presentation, contacts and continuity

In existing native journeys, verify a professional team with no club remains readable/followable without a club link or invented point. Exercise team override → LNV → optional club → missing artwork, plus unchanged nonprofessional inheritance. Fail logo retrieval/replacement and retain the last valid presentation. Check both themes, enlarged text, focus and meaningful accessible action labels.

For T045, use the exact [approved editor, professional-team, partial-map and
320-point/200% references](plan.md#consumer-and-design-reconciliation). Prepare
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

### Collector logo and locality acceptance — #200

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
those remain with their owning tasks, including T055/T056 and F01 T058/#201. The
retained #433 live Dynamic Type and #449 iOS 17 input limits are unchanged.

### Current visibility and projection boundary

F02 T035–T040 are exercised by `SportingVisibilityIntegrationTest`, `SportingProjectionIntegrationTest` and `SportingReadServiceTest`, alongside the existing calendar/identity/classification suites. The integration suites use the real F01 admission, closure and completion services with explicitly migrated disposable PostgreSQL 18.6 and the restricted application role.

Current public reads recheck canonical visibility, permitted municipality, qualified aliases and participation; they never hydrate from an index document. Retained internal identity reads remain available to acquisition. A known date without a time remains eligible; a dateless or withdrawn match does not. Official standings retain labels, order and statistics while dropping links to unavailable participants. `SportingProjectionChanges.Changed` carries only identities/scopes after commit; `projectionDependents` expands current retained relations in batches, including hidden identities needing index removal. Rollback emits no handoff and score-only changes submit no search work. No request queue or recovery state is stored.

Presentation inputs now include independent current full/short names and permitted effective city, with current club names in dependent team reads. `SportingPresentationIntegrationTest` exercises atomic names/images, independent contact modes, current field restrictions, locality revisions, cross-season logo inheritance and LNV/manual precedence against the migrated PostgreSQL baseline. It also checks account-grant withdrawal, restriction/collection exclusion and the F01 incarnation fence through the source-image commit. Restricted source/manual contact columns are cleared; a synthetic restored value behind a retained restriction remains absent from owner reads. This is controlled backend evidence, not a backup-restoration or F14 qualification.

`SportingPresentationWebMvcTest`, the extended `SportingIngestionWebMvcTest` and `DivisionAdministrationWebMvcTest` exercise generated request/response binding, explicit nulls, media types, current permissions, safe errors and atomic save admission. `SportingPresentationMultipartIntegrationTest` sends real multipart PATCH requests over loopback to the selected Servlet runtime with the production controller and controlled use cases. It verifies required-null metadata, original image bytes and the exact 5,242,880-byte boundary. The actual PNG/JPEG decoder and 4,194,304-pixel ceiling remain the shared JDK validator's responsibility. `IngestionBodyLimitAdviceTest` proves the source-image cutoff before native `Resource` conversion with declared and unknown body lengths; the ingestion MVC suite verifies refusal before any image use case. The professional artwork case also reads distinct effective/manual and automatic bytes before removing the manual image. These cases establish Servlet binding and the bounded owner transactions separately; they do not qualify a native mobile transport.

F01 consumes current permitted municipal context and its revision through the existing read boundary. A missing/restricted effective municipality suppresses the complete served geocoding context. A postal identifier remains optional under that boundary; a qualified unambiguous result for the current context supplies the point. Street-only and masked source changes do not create a locality revision or a new need. F01 retains all attempts, cadence, one-hour deadline, pauses and relaunch ownership. F03/F04/F06 surface, index scheduling/rebuild/recovery and real follow qualification remain T041; these backend suites do not complete it. No provider, native-device or production qualification is claimed.
