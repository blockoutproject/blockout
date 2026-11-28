# Quickstart: validate sporting integration

**Scope**: [plan](plan.md), [data model](data-model.md), [contracts](contracts/README.md).

Native accessibility verification follows [F13 FR-030](../003-shared-quality/spec.md#platforms-accessibility-and-bounded-continuity).

## Prerequisites

Use the executable Maven/npm targets and focused sporting test commands in [README verification](../../README.md#verification). Use controlled HTTP peers and synthetic data for automated boundary checks; the business, database and native journeys below require their actual owning implementations.

Use isolated PostgreSQL at the [F13-selected version](../003-shared-quality/plan.md#technical-context), the F13 contract toolchain and synthetic/minimized supplier observations. Keep raw supplier documents and personal contact data outside public fixtures. Prototype/browser evidence does not establish native or provider behavior.

## Identities and useful partial success

Integrate a complete contextual calendar, then replay it and postpone a known match. Expect stable identifiers and no duplicate participation or notification. Cover same club with distinct named teams, one team in multiple compatible pools, new season, qualified LNV team without club, optional technical attachment and a recognized bye without a fictional opponent.

Accept encounters concurrently in two compatible pools. Use matching club and comparison names for FFVB and the same `TeamID` values within one LNV championship. Expect a distinct match UUID per pool and shared participant UUIDs. Reuse FFVB names under a distinct club, classification and season and check the distinct keys. Race first encounters for one FFVB club across seasons and verify rollback of the losing item. Reuse an LNV `TeamID` in another championship of the same season and in another season of the same championship. Submit a known LNV encounter with a different established `TeamID` that has the same label and expect refusal with the original participant retained. Check the [matching PostgreSQL constraints](data-model.md#corrections-and-provider-references). Classify a qualified pool using a newly created editorial division and verify that its provider reference still resolves the same UUID.

Read regular FFVB and clubless LNV teams through F03's sporting summary. Verify the optional club relation and [F02 professional context](plan.md#professional-context). Use the established matches at F08's contribution eligibility boundary and compare decisions under the same otherwise eligible context.

Use the existing [sporting acceptance and technical corrections](../../infra/operations/README.md#sporting-acceptance-and-technical-corrections) procedure for bounded outcome inspection and controlled alias, division-term or professional-club corrections.

Submit 100 matches with one local failure. Expect 99 successful updates retained, the failed match unchanged and no absence reconciliation. Compare malformed global context, contradictory duplicates, a truly empty current calendar and wholly empty historical reconstruction. None may turn a parsing failure into a successful empty observation.

## Ordering and transactions

Delay an older calendar and detail response until after a newer observation. Expect complete rejection of old match facts and no stale participation restoration or absence finalization. Admit a newer calendar while an older request is between match transactions; only the current successful complete calendar may reconcile absence.

Race classification correction with match integration and test a shared-participation collision. Expect all-or-nothing administrative correction, stable identities and preserved customizations. Test division deactivation and source withdrawal as independent reasons; ordinary collection cannot lift them.

Exercise numeric and recognized special results with provisional, final and unconfirmed finality through ingestion and consultation. Preserve notation independently; only a final result establishes a definitive-result transition.

Use the [result announcement transaction cases](#result-announcement-transaction) for the calendar's independent commit and the required F07 participant.

Carry supplied and omitted `providerPublishedAt` through the actual generated collector/backend boundary, including image metadata. Verify retained fact groups keep their own timestamps, newly accepted facts without a publication time remain unknown, and source publication time cannot overturn the logical token.

### Collector-to-sporting boundary

Run the [opt-in collector-to-sporting command](../../README.md#collector-to-sporting-qualification) with a separately packaged backend, generated clients, synthetic supplier/token peers and disposable migrated PostgreSQL under the restricted application role.

Verify confirmed admission before provider work, pre-read ordinal allocation, stable identities through late reads/postponement and initial-import announcement suppression. Lose admission/completion acknowledgements and check the [F01 uncertainty cases](../001-source-acquisition/quickstart.md#ordered-uncertainty-cases) without mutation replay. Hold an in-flight match transaction while replacing the collector: replacement waits, committed facts survive and subsequent old-incarnation writes are refused.

Use [F01 partial-success/absence cases](../001-source-acquisition/quickstart.md#collector-partial-success-and-absence) for that broader boundary. Ordinary CI skips the opt-in runtime without its explicit inputs; synthetic peers establish no live supplier/Auth0 or native-push result.

### Result announcement transaction

After [bundling the contracts](../../README.md#verification), run the focused PostgreSQL cases:

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=ResultAnnouncementTest -Dit.test=ResultAnnouncementIntegrationTest,TransitionAnnouncementIntegrationTest
```

On disposable migrated PostgreSQL, make the current F08 public-link read fail and submit a complete current calendar containing a valid date-only match. Run the case for FFVB and LNV. Verify the persisted match and date, absence reconciliation and its recorded calendar completion, and zero new announcement facts or inbox entries.

Submit a provisional score for a known match with the same read unavailable. Verify the committed score and calendar completion. When a final score later arrives with the reader available, verify that F07 can still consume the final-result allowance.

Fail the same public-link read while accepting an eligible first final result. Verify the match's prior facts, the independent commit of a dated sibling and the absence of new announcements. Also withdraw a retained final result with no prior announcement fact. A failure to persist the required F07 fact preserves the final result. A later successful withdrawal records silent processing and clears the result. When a known match receives a recognized final forfeit without numeric sets, verify that F07 consumes the result even with an empty audience.

Use [F07's atomic producer and link qualification](../011-notifications-delivery/quickstart.md#atomic-producer-and-link-qualification) for first final results and publication in both orders, required participant rollback, after-commit handoff, single audience selection and preservation of consumed categories through corrections and withdrawal/restoration.

## Contracts and fields

Generate actual Spring interfaces/DTOs, RestClient and mobile consumers from the canonical roots; compile and exercise real request/response binding. Cover omitted/null/value, strict unknown request fields, tolerant response additions, unknown enums, dates, safe Problem Details and bounded partial outcomes. Regeneration must be deterministic without template patches or committed generated output.

Exercise club, team and division atomic multipart PATCH presentation saves through real MVC and mobile transport: JSON metadata with explicit nulls, image replacement, automatic-logo restoration and name/color changes in the same transaction. Reject an invalid image without saving another part of the form. Verify that `keep`/`automatic` reject an unexpected image and `replace` requires one. Pool PUT edits accept complete JSON names only and reject missing required fields, image or logo-action fields. Repeat an already-current permitted write: expect no additional image association or lifecycle transition. Contacts PATCH must apply all supplied fields or none. Division POST must return a usable Location matching the response identity; unsupported media types return 415.

Verify `Cache-Control: no-store` on administration/ingestion successes and errors, and the Bearer challenge on 401; the application-owned query cache must still obey account-switch and permission rules.

Try wrong-environment M2M tokens and unauthorized administrative commands and current domain conflicts. Expect no effects. Lose a response, retain editable input and ordinary mutation feedback, and explicitly retry without a verification prerequisite; current server authorization and domain validation remain effective and no write replays automatically. Exceed the calendar/image bounds and verify explicit refusal, never truncation or deletion of valid images. Qualify a complete source-season catalog against the 8-MiB JSON bound; include repeated pool labels under distinct compound contexts and identical duplicates. Expect positional result correlation, one atomic catalog commit, and no absence change for stale, invalid or oversized input. On a preparing season with ordinary admitted discovery, accept a complete catalog, then read partial, wrong-context and unavailable content. Verify accepted entries, mappings, visibility and complete read timestamp are preserved. Accept a later complete catalog that removes a pool, then reintroduces it in the same source and season. Verify catalog absence/reappearance and identity/mapping retention independently of calendar-empty and division restrictions. Use the [F01 catalogue and activation cases](../001-source-acquisition/quickstart.md#source-preparation-and-seasons) for the admitted provider and generated operator boundaries.

For [catalog authority](plan.md#catalog-authority), submit the same omission first as partial and then as complete evidence. Place the omitted pool in a different pack or phase within the binding. Check that an otherwise similar pool in a different organizer or season keeps its existing presence through both observations. Verify that the returning pool has the original UUID and retained classification.

### Generated facts and public reads

Use the [opt-in runtime](../../README.md#collector-to-sporting-qualification) to submit facts through the generated collector mapper/RestClient and ingestion interface, then read anonymous F03 HTTP responses through the generated mobile schemas. Do not replace those reads with constructed response DTOs.

Exercise numeric final/provisional/unconfirmed results; synthetic `F`, `P`, `3/F`, `3/P`, `F/F` and `2/F`; date-only facts and FFVB `00:00`; unusable sets beside a usable overall result; retained compatible sets with independent freshness; supplied/unknown publication time; stale whole observations; and a newer logical read containing older supplier publication. Expect the accepted publication-age limitation without page-priority or publication-time ordering.

Submit a logo with supplied/omitted publication metadata and compare the actual F03 binary response to the synthetic PNG. Verify private qualified document locators, information independent of result, professional finality, withdrawal/restoration and rescheduling under stable identity. F03 exposes only backend document subresources; ineligible binary requests return NotFound before supplier access.

For standings, compare the complete parsed provider sequence to the persisted `row_index` and the order in the public response. Repeat with a newer qualified observation changing only the supplied row sequence. Verify that any printed ranks, absent ranks and statistics, nonnumeric ratios, exact or absent team links and the usable table's own freshness keep their meaning through non-publication and failure. Distinguish no table, `not-published` and published Empty. Synthetic special notations establish no provider-observed sample; [source interpretation](research.md#supplier-interpretation-limits) and [F03 document/native boundaries](../007-sporting-consultation/plan.md#maps-and-documents) retain their own requirements.

## Classification and division editors

Use the existing F05 session and current F12 grants. With `manageSportingClassification` alone, read the Mapping pack list, detail and filter options through the generated contract, then read the selected correction target. With `manageCollection` alone, confirm that Collection Sources is readable and the Mapping operations are refused. Also verify unauthenticated and revoked access at their normal boundaries. Division catalogue read alternatives, division lifecycle and presentation keep their own permissions. Collection child traversal continues to show the read-only catalogue.

Use migrated PostgreSQL and qualified catalogue fixtures, including a preparing season, the same organizer in two seasons, different organizers with comparable pack labels, a childless pack and inherited/custom/unclassified pools. Use a small page size and tied pack or pool labels. Verify pack, pool and source search, combined status/source/season criteria before paging, cross-season source filtering, stable continuation and independent bounded filter options with the newest season first. A child search match selects the pack and leaves the full child population traversable. Check the total and effective classified pool counts, aggregate status and nullable default independently, including a pack without a default whose pools are all custom classified and the childless default fallback. Verify that pool modes, effective values, established labels and exact editor IDs survive the generated HTTP boundary. Check the page, search and label bounds, and an unknown pack.

Use the [approved Mapping references](plan.md#consumers-and-approved-design) on compatible iOS and Android development builds with controlled data. Leave a qualified season preparing and read the same discovered pack and pools in the [read-only F01 source catalogue](../001-source-acquisition/quickstart.md#source-preparation-and-seasons) and Mapping. A classification-only operator can open Mapping from Profile without a Collection Sources read. A collection-only operator can browse Collection Sources and has no Mapping access. Check the protected route after access is withdrawn.

Start with the default latest season, then choose an older season and “Toutes les saisons” separately. Apply “Statut” and “Source” and use Search. Compare the pinned field, filter and scroll material with Rechercher. Verify that the first pack uses the shared list inset and that Empty and Error use the shared state inset below the controls. Verify that both badges sit below each title and source, aligned with the text. Check no default with none, some and all pools classified, a default with both inherited and custom-classified pools, and an empty pack with and without a default. The pack matched through one pool still shows coverage for every pool in the pack. Open a pack with a matching child, verify that the contextual header shows its source and season and continue through its full child list. Back restores the chosen season and the other list criteria and scroll position.

In N2F from Championnats nationaux (2026–2027), save “Nationale 2 · 6 × 6 · Féminin”. Poule A and Poule B show “Du pack” with the accepted default. Separately, in CFA from Ligue Île-de-France (2026–2027), keep Tour 1 custom and open Tour 2 from “À classer”. Save “M18 Régionale · 6 × 6 · Féminin” in “Personnalisé”. Both acknowledged saves close their sheet, show one green confirmation at the top, and update the accepted details. The Tour 2 override survives a later CFA pack change.

Check “Du pack” in a visit without a division catalogue read and verify a pack and inherited pool with no classification. Switching to “Personnalisé” requires a division. Verify that a conflicting or failed save keeps the exact draft with ordinary feedback and that dirty Back can be refused or accepted through the existing discard decision.

Fail the catalogue required by a dirty “Personnalisé” visit after its configured retries. The common Error Card replaces the entire editor. While explicit Retry reads, keep the card and show actual button progress. Success restores the mounted draft and repeated failure keeps Retry available. The card never submits the draft. A catalogue transport failure must not present an absent division. Verify incomplete and inactive selections and retain the current validation and identity corrections under A07–A10.

Load the bounded Divisions catalogue with search/activity criteria, then exhaust a complete reread. Results disappear behind the common card while criteria and independently authorized creation remain available; no read toast or competing pull is shown. Explicit Retry retains the card and shows button progress only during that catalogue GET. Repeat failure, then restore success and verify the same criteria and applicable rows. Retry sends no write and criteria never gate a creation form.

Open the native creation route with only the F12 division lifecycle grant. Enter a free name in the shared name/color/logo form. Before submission, check that this visit reads the account without a catalogue or resource GET and offers no source selection. Save directly through generated multipart metadata, with no extra confirmation or activity write. Submit a duplicate differing only by letter case: the server 409 remains at the name field and preserves all entered values and the logo candidate. A non-name refusal on creation keeps ordinary feedback and editable values, without unavailable reread advice. Accept POST 201 and verify the terminal form retains the accepted name, colors and identity. Exercise the existing reset/discard paths and fail a later GET: none restores the empty creation draft or labels that read failure as a failed save. With a logo, check the accepted preview uses the new division’s binary read and the prepared upload is released after settlement. Check dirty Back, leave a POST pending through logout or lifecycle grant revocation, and deliver the response afterwards. A fresh visit or a retained draft must not consume that old acknowledgement. An independently observed catalogue can still see the accepted division after settlement without rereading another division’s detail. When current catalogue metadata has no logo, the row uses the absence fallback even if an earlier binary read remains cached. Map an already covered pool to that division through the normal classification command, then resolve it by the same provider key and check the same UUID, pack and source.

For classification and existing presentation, save an older valid draft after newer manual/source data. Only submitted manual fields may change. Omitted PATCH fields preserve current values and explicit null retains its removal meaning. Current permission, uniqueness, privacy and complete sporting-scope collisions still refuse without partial effects. In a presentation visit, fail a save response and retain the exact draft, target and prepared file for another explicit save. After an acknowledged presentation save, fail the normal invalidated read and recover through the whole-form card. Accepted defaults, the mounted draft and the scroller survive, and read Retry sends no write. Keep division activity separate and retain unsaved-draft exit guards.

Compare the [division catalogue](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1340-9338), [creation](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1370-10242) and [custom gradient](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4604-31796), [deactivation](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1404-12777) and [reactivation](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1405-12885). Verify the preview’s primary-only fallback and three authored stops in their entered order through the shared sporting paint, keeping validation and submitted values independent of the native fill. Native design qualification requires actual integrated journeys; implementation illustrations and controlled native SDK/HTTP inputs cannot establish that qualification.

## Presentation, contacts and continuity

In the [Team, professional Team and Pool editors](plan.md#consumers-and-approved-design), open resources with automatic names and with independent overrides. Verify both effective names and both automatic hints. Save a team logo without editing the names and check its multipart metadata preserves their manual values or `null`. Clear a customized full or short name, save and check the accepted automatic value reappears while the other field keeps its mode. Retain the exact editable draft after a refused save.

Edit a team while its parent club artwork changes. KEEP and omitted fields preserve current manual state, REPLACE preserves precedence and AUTOMATIC resolves the latest permitted fallback. The valid command requires no editing revision. Preserve current grants, privacy restrictions, UUID and native transaction protection.

Qualify on fresh disposable PostgreSQL under [F13’s schema lifecycle](../003-shared-quality/plan.md#runtime-data-and-consistency). Verify the accepted S3 bytes, SQL media type and association, names, locality/observation revisions and native persistence versions through the ordinary owner operations. Fail an upload and a SQL publication and check the last accepted logo remains readable. Verify superseded objects after replacement or automatic restoration and reuse the same accepted source object for repeated identical bytes. [F13](../003-shared-quality/quickstart.md#preproduction-application-images) owns hosted qualification after schema compatibility is established.

Exercise the [shared single-image cases](../003-shared-quality/quickstart.md#single-image-fields) in the manual club, team and division logo flow. Trace the shared form for all consumers and use representative native visits, including division creation and editing. Check the native square crop frame after selection, including an already-square source. Cancel without changing the draft, confirm a replacement locally before explicit Save, reset a customization without preview and retain a candidate through remote refusal. Verify nonprofessional club inheritance and professional team → LNV → optional club precedence using different source images. Changing or losing parent media never removes an unsaved team choice or grants new removal rights. Pool editing stays names-only. Current permission loss makes callbacks from an already open OS menu inert; cancellation/dismissal remains system-owned, without requiring dynamically disabled native buttons; prepared work stays with its original field/session. Multi-image support remains F10-owned.

Confirm the crop and inspect the actual native-delivered file. Confirm the preview uses the prepared copy and compare its bytes and the multipart image to the PNG/JPEG delivered by the picker, including a rectangular result if returned. Check the 5 MiB bound and await the owned app copy before releasing the picker-delivered file. The library original remains unchanged. Keep a prepared candidate while a save borrows it, including field replacement or route exit; release it only when its last owner/request is done. A failed save retains the mounted candidate for explicit retry, while accepted saving or explicit discard releases the owned candidate without resetting accepted form values. Qualify picker/editor/upload separately on the native platforms. These checks establish the selected file/request lifetime, not broader provider or SDK erasure.

In existing native journeys, verify a professional team with no club remains readable/followable without a club link or invented point. Exercise team override → LNV → optional club → missing artwork, plus unchanged nonprofessional inheritance. Fail logo retrieval/replacement and retain the last valid presentation. Check both themes, enlarged text, focus and meaningful accessible action labels.

For native presentation checks, use the exact [approved editor, professional-team, partial-map and
320-point/200% references](plan.md#consumers-and-approved-design). Prepare
demonstration resources and a current account with `manageSportingPresentation`;
classification, lifecycle, moderation and Pro alone must grant no editor access.
Enter the club, team, pool and division presentation routes through their resource
action and the actual F12 operational group. Confirm that club edits have the
prefilled name, logo and six direct contact inputs in the same form with one
Save. Team/pool edits contain independent full/short names, pools have no image,
and division name/colors/logo do not change activity.

On native iOS and Android, run both system themes at ordinary and narrow widths,
then enlarged text including the approved 320-point/200% specimen. Check labels,
passive image display, replacement and restoration, validation focus, keyboard
reachability of the final field/save action, and back/gesture cancellation versus
explicit draft discard. This preparation does not
qualify the separately retained iOS text-resizing/minimum-iOS limits.

Delay the first Presentation response until after mount, then verify that names,
logo intent and the one useful editing baseline become ready together. Dirty a field and
prepare a replacement logo; a background response with newer server values must not
rebase either. Accept a save, explicitly discard subsequent edits and exercise the
existing discard separately, retaining the native scroller and file owner.

Save names and a nonsquare PNG/JPEG in one multipart request, including manual
logo → automatic → missing fallback, and reject invalid/oversized artwork without
changing names or the last valid image. Exercise protected binary retrieval under
current visibility/maintenance, including an unavailable logo with usable editor
fields. Refuse a private-logo or resource read, then fail its next explicit read
with a network error: report the current error and keep withdrawn bytes/values
unavailable; an admissible local draft remains intact. Keep dirty fields during
refetch. Race another editor, lose a save response, fail the subsequent read and
withdraw the action grant/session while the picker or save is pending. Ordinary
failed/lost saves retain exact input and allow another explicit save under current
domain rules, with normal settlement invalidation and no successful-read
prerequisite. An older valid draft can save after newer manual values without Relire; only submitted fields change. Current business collisions, permissions and privacy restrictions still refuse without partial effects. A failed required read masks the editable zone under the common F13 card while retaining its draft. No mutation may replay automatically. A current
matching state establishes only the observed outcome, never a historical receipt.

In the F03-owned journey, separately check the professional team without a club,
the optional club link when present, and partial maps without invented locations.
Actual private A39 qualification and SC-007's corresponding recovery boundary
belong to [F14 T029](../014-v1-v2-transition/tasks.md#phase-5-user-story-3--rebuild-data-without-losing-protected-elements-priority-p1),
using the [F14 protected-logo scenarios and private-evidence limits](../014-v1-v2-transition/quickstart.md#protected-logo-rehearsal).
Use separately authorized private inputs: certain identity with retained file,
unresolved/missing identity with retained association, and certain identity with
missing file. Reapply only validated bytes for a certain exact identity; preserve
normal team inheritance, keep unresolved evidence private and report missing bytes
explicitly. A retained URL does not establish file preservation. Never publish
recovery associations, original URLs, personal diagnostics or files in this
repository/PR. Controlled rehearsals and completed native editor checks do not
establish this real V1 preservation/reassociation qualification.

Change effective address/city/postcode while a geocoding response is in flight: the old point must not return. A street-only effective correction must advance locality revision and clear the old point; an overridden source change must preserve both. Exercise source/manual/hidden modes, restrictions, deliberate absence and return to source independently. Missing city suppresses the complete target context and point; absent address with usable city permits municipality lookup. An unambiguous municipality fallback is a valid located point without repeated address upgrade or normal-rerun recalculation. Retain no former personal details or new precision state. Qualify these effective-context cases through the [current locality boundary](plan.md#presentation-administration-and-locality); municipality-only inputs do not establish the full-address behavior.

For the club editor, start with a fictional incorrect source postal code. Save a manual correction and deliberately clear a contact in the same form. Verify the corrected postal code and address are used by the next eligible geocoding target. Then import a later FFvolley value and reopen the editor: the manual correction stays effective, the original hint changes, and the deliberate absence persists. Use “Reprendre FFvolley” on the postal code and verify that only its mode returns to source. Exercise a failed Contacts read and Retry, a refused manual value and an ordinary failed save. When both presentation and contacts are edited, acknowledge the first command and fail the second. The accepted group must remain visible and the next explicit save must send only the outstanding group.

Exercise standings with and without a retained usable table: `published` with empty rows remains an available table; `not-published` with empty arrays is qualified absence, and a failed/unreadable read is neither. Preserve a still-usable retained table and its own freshness on failure or non-publication; without one, F03 distinguishes qualified absence from unavailable acquisition. Reject non-publication with nonempty arrays and stale absence observations without effects. A successful table containing an unlinked row preserves official order without a fabricated team. Close a season and verify history remains while new cycles are refused. F14 logo preservation and controlled initial reconstruction remain prerequisites for any separately authorized transition, not actions of this quickstart.

### Collector logo and locality acceptance

Use the [disposable-runtime procedure](../../README.md#collector-to-sporting-qualification), package/migrate the backend, then select `-Dit.test=CollectorPresentationBoundaryIntegrationTest,CollectorSportingBoundaryIntegrationTest` with `-Dblockout.qualify-collector-sporting=true`. Run against explicit database/backend properties; ordinary CI skips execution without these inputs.

Exercise repeated matches/pools and two teams sharing one image URL. Expect one acquisition per distinct resolved team per passage, including failed attempts. Detect PNG bytes independently of a JPEG name/type. HTTP 404, corrupt data, unsupported GIF and oversized/hostile-dimension images preserve accepted source/manual presentation while valid matches commit. Verify the accepted source logo by reading the ordinary sporting binary route; a manual override and its removal preserve the current source association.

Read current locality targets after admission and submit that revision. Change effective address/city/postcode or return to source while the provider is in flight: expect stale-result refusal, no forbidden context publication and no withdrawal after technical acquisition failure. Manual locality and intentional absence survive recollection; masked source changes preserve point/revision. An unambiguous municipality fallback remains located without recalculation.

Send actual Servlet multipart PATCH with explicit-null JSON metadata and image bytes. Invalid replacement preserves the entire previous form state; automatic restoration returns accepted source bytes. Keep loopback supplier/identity checks distinct from live provider reads, native networking, private rights handling and protected-logo recovery.

### Current visibility and projection boundary

Verify current canonical visibility and permitted presentation on every public read, independently of index catch-up. Retained internal identity reads remain available to acquisition. Known date without time remains eligible; dateless/withdrawn matches do not. Preserve standings labels/order/statistics while removing links to unavailable participants.

Exercise source/manual/hidden contact modes, restrictions and restored prohibited values through actual owner reads. Restricted source/manual values remain cleared or absent; no index document supplies authoritative hydration. After commit, hand off only affected identities/scopes; rollback emits no projection work and score-only changes add none.

For collector-to-location validation, create fresh disposable PostgreSQL from the current initial Liquibase schema definitions and use ordinary collector admission/targets/F02 acceptance for a representative classified pool and its encountered club sheets/geocoding. Verify address-first results, valid municipality fallback, current-target restrictions and subsequent effective-context changes rejecting old responses. Existing fields support this behavior without a data-update change set or requalification of old municipality results. Task-local recreation requires verified ownership and grants no production reset. The [plan](plan.md#presentation-administration-and-locality) owns that scope.

### Current restrictions and presentation

Use disposable migrated PostgreSQL and TLS OpenSearch with real F01/F02/F03/F04/F06 owners. Delay projection, perform current public/personal reads against old candidates, then consume committed scopes and publish catch-up/full replacement.

1. Withdraw catalog presence, accept a qualified current empty calendar and deactivate a division independently. Expect public lists/search/examples, old detail/calendar/image links, club teams and personal reads to refuse hidden targets before catch-up.
2. Restore each cause separately. Expect stable identities/follow tuples, no transfer to a same-named team in another season and no restoration while another hiding cause remains. Another admitted participation may keep the original team usable.
3. Pause/close a season. Expect retained consultation/follows and only already-admitted work to drain.
4. Change source/manual full/short names, technical aliases, permitted locality and contact restrictions. Check the current card names and rejection of stale-city candidates before reindexing. Verify alias matching after [index catch-up](../008-search-discovery/quickstart.md#projection-and-privacy) and verify restricted values stay hidden through recollection and restoration.
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
