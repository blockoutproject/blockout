# Quickstart: validate sporting integration

**Scope**: [plan](plan.md), [data model](data-model.md), [contracts](contracts/README.md).

## Prerequisites

Use the executable Maven/npm targets and focused sporting test commands in [README verification](../../README.md#verification). Use controlled HTTP peers and synthetic data for automated boundary checks; the business, database and native journeys below require their actual owning implementations.

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

Run the [opt-in collector-to-sporting command](../../README.md#collector-to-sporting-qualification) with a separately packaged backend, generated clients, synthetic supplier/token peers and disposable migrated PostgreSQL under the restricted application role.

Verify confirmed admission before provider work, pre-read ordinal allocation, stable identities through late reads/postponement and initial-import announcement suppression. Lose admission/completion acknowledgements and check the [F01 uncertainty cases](../001-source-acquisition/quickstart.md#ordered-uncertainty-cases) without mutation replay. Hold an in-flight match transaction while replacing the collector: replacement waits, committed facts survive and subsequent old-incarnation writes are refused.

Use [F01 partial-success/absence cases](../001-source-acquisition/quickstart.md#collector-partial-success-and-absence) for that broader boundary. Ordinary CI skips the opt-in runtime without its explicit inputs; synthetic peers establish no live supplier/Auth0 or native-push result.

### Result announcement transaction

Race real F08 publication with first final-result acceptance in both orders. Expect the F07 allowance/inbox participant to share the match transaction: inbox failure rolls it back; post-commit push failure does not. Include zero recipients, initial finished discovery/reconstruction, corrections and withdrawal/restoration. Use [F07's producer cases](../011-notifications-delivery/quickstart.md#atomic-producer-and-link-qualification) for allowance and delivery boundaries.

## Contracts and fields

Generate actual Spring interfaces/DTOs, RestClient and mobile consumers from the canonical roots; compile and exercise real request/response binding. Cover omitted/null/value, strict unknown request fields, tolerant response additions, unknown enums, dates, safe Problem Details and bounded partial outcomes. Regeneration must be deterministic without template patches or committed generated output.

Exercise club, team and division atomic multipart PATCH presentation saves through real MVC and mobile transport: JSON metadata with explicit nulls, image replacement, automatic-logo restoration and name/color changes in the same transaction. Reject an invalid image without saving another part of the form. Verify that `keep`/`automatic` reject an unexpected image and `replace` requires one. Pool PUT edits accept complete JSON names only and reject missing required fields, image or logo-action fields. Repeat an already-current permitted write: expect no new revision, image association or lifecycle transition. Contacts PATCH must apply all supplied fields or none. Division POST must return a usable Location matching the response identity; unsupported media types return 415.

Verify `Cache-Control: no-store` on administration/ingestion successes and errors, and the Bearer challenge on 401; the application-owned query cache must still obey account-switch and permission rules.

Try wrong-environment M2M tokens and unauthorized/stale administrative commands. Expect no effects. Lose a response and read current state before an explicit retry; no automatic mutation replay. Exceed the calendar/image bounds and verify explicit refusal, never truncation or deletion of valid images. Qualify a complete source-season catalog against the 8-MiB JSON bound; include repeated pool labels under distinct compound contexts and identical duplicates. Expect positional result correlation, one atomic catalog commit, and no absence change for stale, invalid or oversized input.

### Generated facts and public reads

Use the [opt-in runtime](../../README.md#collector-to-sporting-qualification) to submit facts through the generated collector mapper/RestClient and ingestion interface, then read anonymous F03 HTTP responses through the generated mobile schemas. Do not replace those reads with constructed response DTOs.

Exercise numeric final/provisional/unconfirmed results; synthetic `F`, `P`, `3/F`, `3/P`, `F/F` and `2/F`; date-only facts and FFVB `00:00`; unusable sets beside a usable overall result; retained compatible sets with independent freshness; supplied/unknown publication time; stale whole observations; and a newer logical read containing older supplier publication. Expect the accepted publication-age limitation without page-priority or publication-time ordering.

Submit a logo with supplied/omitted publication metadata and compare the actual F03 binary response to the synthetic PNG. Verify private qualified document locators, information independent of result, professional finality, withdrawal/restoration and rescheduling under stable identity. F03 exposes only backend document subresources; ineligible binary requests return NotFound before supplier access.

For standings, preserve official order, unknown rank/statistics, nonnumeric ratios, exact/absent participant links and the usable table's own freshness through non-publication/failure. Distinguish no table, `not-published` and published Empty. Synthetic special notations establish no provider-observed sample; [source interpretation](research.md#supplier-interpretation-limits) and [F03 document/native boundaries](../007-sporting-consultation/plan.md#maps-and-documents) retain their own requirements.

## Classification and division editors

Use the existing F05 session and F12 operational admission. Enter pack/pool classification from discovered collection children with collection-read and classification-action grants. `manageSportingClassification` and `manageDivisionLifecycle` independently admit technical administration and the division list; collection, presentation and activity retain separate grants. Routes live under `apps/mobile/src/app/(operations)/administration/`.

Exercise complete overrides, explicit null/inheritance, incomplete/inactive choices, all-request conflict refusal, retained dirty input, failed then successful current-state recovery and protected-route withdrawal/reentry. Create a division through the name/color/logo form with generated multipart metadata, native confirmation and no activity write. A lost response must not cause automatic duplicate creation; reread before another explicit command.

Compare the [mapping controls](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4652-28674), [division catalogue](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1340-9338), [creation](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1370-10242) and [gradient/lifecycle](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1368-10291). Native design qualification requires actual integrated journeys; implementation illustrations and controlled native SDK/HTTP inputs cannot establish that qualification.

## Presentation, contacts and continuity

Edit a team while its parent club artwork changes. Expect KEEP and own-name edits to use the team's presentation revision, REPLACE to preserve precedence and AUTOMATIC to resolve the latest fallback. Hold a separate parent-club row lock and verify the independent team edit can complete. Preserve own-team stale/no-op protection, current grants and privacy restrictions.

For a retained-chain upgrade, preserve applied checksums, accepted image bytes/media type/name and own presentation/locality/contact revisions. Stop incompatible writers before the contract change; removed club-logo counters and F01 outage clocks require compatible forward repair rather than a claimed schema rollback. Check clean creation separately on a disposable database.

Invoke `prepareSportingLogo` with the actual native file owner: await copy completion, preserve borrowed input bytes and dispose only owned output. Qualify picker/editor/upload separately on the native platforms.

In existing native journeys, verify a professional team with no club remains readable/followable without a club link or invented point. Exercise team override → LNV → optional club → missing artwork, plus unchanged nonprofessional inheritance. Fail logo retrieval/replacement and retain the last valid presentation. Check both themes, enlarged text, focus and meaningful accessible action labels.

For native presentation checks, use the exact [approved editor, professional-team, partial-map and
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
require the actual native journeys and separately authorized private recovery inputs.

Change effective address/city/postcode while a geocoding response is in flight: the old point must not return. A street-only effective correction must advance locality revision and clear the old point; an overridden source change must preserve both. Exercise source/manual/hidden modes, restrictions, deliberate absence and return to source independently. Missing city suppresses the complete target context and point; absent address with usable city permits municipality lookup. An unambiguous municipality fallback is a valid located point without repeated address upgrade or normal-rerun recalculation. Retain no former personal details or new precision state. Qualify these effective-context cases through the [current locality boundary](plan.md#presentation-administration-and-locality); municipality-only inputs do not establish the full-address behavior.

Exercise standings with and without a retained usable table: `published` with empty rows remains an available table; `not-published` with empty arrays is qualified absence, and a failed/unreadable read is neither. Preserve a still-usable retained table and its own freshness on failure or non-publication; without one, F03 distinguishes qualified absence from unavailable acquisition. Reject non-publication with nonempty arrays and stale absence observations without effects. A successful table containing an unlinked row preserves official order without a fabricated team. Close a season and verify history remains while new cycles are refused. F14 logo preservation and controlled initial reconstruction remain prerequisites for any separately authorized transition, not actions of this quickstart.

### Collector logo and locality acceptance

Use the [disposable-runtime procedure](../../README.md#collector-to-sporting-qualification), package/migrate the backend, then select `-Dit.test=CollectorPresentationBoundaryIntegrationTest,CollectorSportingBoundaryIntegrationTest` with `-Dblockout.qualify-collector-sporting=true`. Run against explicit database/backend properties; ordinary CI skips execution without these inputs.

Exercise repeated matches/pools and two teams sharing one image URL. Expect one acquisition per distinct resolved team per passage, including failed attempts. Detect PNG bytes independently of a JPEG name/type. HTTP 404, corrupt data, unsupported GIF and oversized/hostile-dimension images preserve accepted source/manual presentation while valid matches commit.

Read current locality targets after admission and submit that revision. Change effective address/city/postcode or return to source while the provider is in flight: expect stale-result refusal, no forbidden context publication and no withdrawal after technical acquisition failure. Manual locality and intentional absence survive recollection; masked source changes preserve point/revision. An unambiguous municipality fallback remains located without recalculation.

Send actual Servlet multipart PATCH with explicit-null JSON metadata and image bytes. Invalid replacement preserves the entire previous form/revision; automatic restoration returns accepted source bytes. Keep loopback supplier/identity checks distinct from live provider reads, native networking, private rights handling and protected-logo recovery.

### Current visibility and projection boundary

Verify current canonical visibility and permitted presentation on every public read, independently of index catch-up. Retained internal identity reads remain available to acquisition. Known date without time remains eligible; dateless/withdrawn matches do not. Preserve standings labels/order/statistics while removing links to unavailable participants.

Exercise source/manual/hidden contact modes, restrictions and restored prohibited values through actual owner reads. Restricted source/manual values remain cleared or absent; no index document supplies authoritative hydration. After commit, hand off only affected identities/scopes; rollback emits no projection work and score-only changes add none.

For collector-to-location validation, create fresh disposable PostgreSQL from the unchanged Liquibase schema definitions and use ordinary collector admission/targets/F02 acceptance for a representative classified pool and its encountered club sheets/geocoding. Verify address-first results, valid municipality fallback, current-target restrictions and subsequent effective-context changes rejecting old responses. Existing fields support this behavior without a data-update change set or requalification of old municipality results. Task-local recreation requires verified ownership and grants no production reset. The [plan](plan.md#presentation-administration-and-locality) owns that scope.

### Current restrictions and presentation

Use disposable migrated PostgreSQL and TLS OpenSearch with real F01/F02/F03/F04/F06 owners. Delay projection, perform current public/personal reads against old candidates, then consume committed scopes and publish catch-up/full replacement.

1. Withdraw catalog presence, accept a qualified current empty calendar and deactivate a division independently. Expect public lists/search/examples, old detail/calendar/image links, club teams and personal reads to refuse hidden targets before catch-up.
2. Restore each cause separately. Expect stable identities/follow tuples, no transfer to a same-named team in another season and no restoration while another hiding cause remains. Another admitted participation may keep the original team usable.
3. Pause/close a season. Expect retained consultation/follows and only already-admitted work to drain.
4. Change source/manual full/short names, technical aliases, permitted locality and contact restrictions. Expect current F03 responses and hydrated search to use current accepted values, reject stale-city candidates before reindexing and never republish restricted values through recollection/restoration.
5. Compare effective address/city/postcode changes with masked source changes. Expect only effective changes to invalidate the point/revision and old in-flight results; verify the revised boundary through fresh collector ingestion as above.
6. Read inherited club logos across seasons, manual/LNV priority and optional professional-club associations through public binary reads. Expect no copied team image or invented identity.

Run after contract bundling:

```sh
NX_LOAD_DOT_ENV_FILES=false npx nx run http-contracts:bundle
./mvnw -B -ntp -pl apps/backend verify \
  -Dtest=ReadSearchTest \
  -Dit.test=CurrentRestrictionsIntegrationTest,CurrentPresentationIntegrationTest
NX_LOAD_DOT_ENV_FILES=false npx nx run backend:test
```

Use [F13 current-truth scenarios](../003-shared-quality/quickstart.md#current-sporting-truth) and [generated facts/public reads](#generated-facts-and-public-reads) for complementary boundaries. Controlled clocks, provider facts, identities and private-rights inputs do not establish actual providers, native accessibility, protected V1-logo recovery, backup restoration or production qualification.
