# Quickstart: validate search and discovery

**Scope**: [plan](plan.md), [data model](data-model.md) and [canonical contracts](contracts/README.md).

## Prerequisites

The executable foundation and verification commands are in the [README](../../README.md#verification), including [local search infrastructure](../../README.md#local-search-infrastructure). The later story scenarios below remain qualification work for their owning tasks.

Use synthetic sporting fixtures, PostgreSQL 18.6, OpenSearch 3.9.0 and the selected Java client on Java 25. Keep provider data and production credentials out of fixtures. Start the isolated services through the implementation's supported setup and apply its current baseline before the scenarios. Native checks use the F13 iOS/Android builds and established test tools.

## Contracts and access

Lint/bundle the canonical root and generate the Java/TypeScript consumers at the same source revision. Compile/test actual consumers and regenerate deterministically. Check absent fields, additive response properties, enum rejection, Unicode length, repeated UUID query-array encoding and cursor parsing and mode validation. Expected: 200 Unicode characters are accepted, longer input is rejected without truncation, all meaningful terms are retained, wrong parameter combinations fail, and invalid JSON never enters the cache as success.

Access checks require the packaged backend and generated mobile consumer from the same candidate, synthetic F02/F03 resources, and the existing F05/F09/F12 owners. Read as guest, free, Pro and unknown entitlement. Exercise maintenance and explicit bypass with absent, expired, wrong-environment and unauthorized tokens. Expected: public search needs no account; existing F12 refusals and safe Problem Details apply, with no downgrade of explicit bypass to public admission. Delay a response across session or bypass cancellation: it cannot admit old data or resume the action automatically.

For the read-failure boundary, independently stop the isolated engine, interrupt a request, return a native timeout or an engine partial-shard refusal, fail current hydration and exhaust traversal without an outcome. Exercise both an initial read and a read following usable pages. Expected: shared retryable unavailability and no-store, never successful empty JSON, a manufactured end or raw engine diagnostics. After recovery, only the explicit safe retry or another already-authorized read executes; a successful no-match response remains distinguishable from every failure.

Local engine checks use task-owned disposable TLS, credentials and index namespaces. Verify trusted TLS and hostname checks succeed while an untrusted CA, wrong hostname and invalid credential fail. Verify necessary operations in the owned namespace and refusal of unrelated namespaces. Keep credentials and detailed diagnostics private. These fixtures establish no hosted network, volume or environment configuration.

Use the [local preparation and TLS renewal commands](../../README.md#local-search-infrastructure) for the retained development instance. An interrupted first preparation must leave no published partial environment and allow a fresh attempt. Renewal must change only the TLS bundle, keep the password/security configuration and volume, and permit the restarted backend to reconnect using the same private environment. The Compose healthcheck must reject an invalid credential and require verified TLS with yellow/green cluster health; it does not qualify projections or current sporting data.

## Matching, choices and complete browsing

Seed names/context spread across fields, accents/case, verified aliases, scoped division abbreviations, formats/genders and same-named distinct identities. Exercise `eag ly`, `Eagles Lyon` and `Volly Lyon`; verify direct matches are favored and every term counts. Verify that query analysis retains whole normalized terms while index analysis produces prefixes: “Eagles Lyon” must not match an unrelated name/city merely because they start with E/L. Combined typo/partial-word forms are not an acceptance promise. Check full and intermediate prefixes near the accepted length boundary through the real analyzer, including folding expansion such as `ﬃ` → `ffi`; nonempty punctuation-only input must not become examples. Strict filters never broaden to fill results.

Include old and future seasons, an inactive division, a club without teams and an unattached professional team. Expected: options/defaults and all-season selection follow F04; absent relationships are not invented. Remove a selected choice, then independently fail the choices read: only established removal resets it.

With unchanged data, browse sets of 47 and more than 10,000 eligible matches, including equal scores. Expected: every identity exactly once, no total cap, no false total and no empty continuation pages. Interleave ineligible candidates and exhaust the processing bound: either eligible results/established end or ordinary retryable failure. Verify an unconsumed candidate is not skipped by the returned cursor. Change data or switch index generations during traversal, then refresh: current results recompose without mixing old pages or lasting omissions.

For empty text, verify five or fewer examples, stable retained order across tabs/detail return/refresh, exact filters, and no replacements after a retained example becomes restricted. Changing filters permits a new selection. The absence of a cursor in examples does not advertise catalogue completeness.

### Current options and retained filters

Open independent Team/Pool filter catalogues with historical/future/default/All seasons choices, then close, reset and apply a dirty draft. A new visit rereads options; a failed read preserves choices, while successful disappearance reconciles them. Check strict empty combinations, retained tab/text/criteria on ordinary detail return and obsolete requests. Compare [filter sheet](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=925-13145), [active toolbar](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4346-7264), [large-text sheet](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5448-13097) and [Select](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=164-200).

## Projection and privacy

Commit a name, alias, classification, club attachment or effective city change. Expected: the after-commit task reads current data and updates all dependent resources. Roll back the business write: no projection effect. Run the non-web operator entry point: it starts no second index scheduler, and its relevant changes appear through the serving backend’s next full rebuild. Change only a score: no unnecessary search rewrite. Restrict a city while the index still contains it: no old-city match or old contact reaches the response; a candidate may be temporarily omitted until reindexing.

For recovery checks, require the serving backend’s current-data projection, single scheduler and safe diagnostics described in the [projection plan](plan.md#projection-lifecycle), and use the [ordinary reconstruction procedure](../../infra/operations/README.md#search-projection-and-reconstruction). Before failure injection, record the backend build, isolated PostgreSQL/OpenSearch versions, namespace and three usable alias targets, with synthetic expected identities and a currently restricted witness. Use only the task-owned serving process and disposable infrastructure; observe private F13 diagnostics without publishing their payloads. These local checks select no hosted isolation, infrastructure restoration or provider alerting policy.

| Case                                   | Action and expected evidence                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One serving writer and non-web changes | Verify one local web-backend scheduler and stop its owned process before starting its replacement. Run the existing non-web operator with an authorized synthetic change: it starts no writer; the serving process's next full run reads the current value. Do not launch a second serving replica to test a topology the plan does not support.                                                                 |
| Lost and queued work                   | Fail a targeted update or stop the owned process before queued work runs, then restart through the ordinary startup path. Separately exercise the next fixed-delay full run. Lost work catches up without a retry record. Change a value while a full run is held: queued tasks reread current truth afterward, including current restrictions.                                                                  |
| Incomplete generation                  | Independently fail a bulk item, whole submission and final refresh. Previous usable aliases and authorized reads survive; no incomplete generation or false latest-full-success is published.                                                                                                                                                                                                                    |
| Unknown alias outcome and cleanup      | Lose the switch acknowledgement, including a switch applied after the caller reports failure. Report the run as failed without an alternate success reread; preserve active and uncertain candidates until a later acknowledged publication. Fail metadata lookup and deletion separately: no unsafe deletion or claim of successful cleanup; unrelated namespaces remain untouched.                             |
| Older authoritative fixture            | Reconcile current privacy restrictions before fixture data is accessible, then run the ordinary local serving-backend rebuild. Verify all three published aliases and actual current filtered searches before search is usable; an interrupted or failed rebuild remains unavailable when no usable generation exists. This exercises application reconstruction without an infrastructure backup/restore setup. |

For every case, verify failure/last-success evidence excludes query text, city/contact values, credentials and raw engine/provider payloads. A scheduled run or successful HTTP bulk envelope alone is not proof of a usable indexed generation. Dependency checks do not replace these local process/reconstruction scenarios.

Run these boundaries from the repository root after the README's contract bundle step:

```sh
./mvnw -B -ntp -pl apps/backend verify \
  -Dtest=ProjectSearchTest,SearchProjectionSchedulerTest \
  -Dit.test=SearchProjectionIntegrationTest,SearchDiagnosticsIntegrationTest,SearchProjectionConfigurationIntegrationTest
```

## Mobile journey

Search has no pull-to-refresh or refresh button. Verify that initial/new-read card retry still works, continuation remains available after pagination failure, and established exhaustion adds no “Fin des résultats” message. Controlled Query rereads verify same-context retention, cancellation and refusal boundaries without qualifying a user gesture or introducing background feedback. Use the [F13 native UI scenarios](../003-shared-quality/quickstart.md#native-ui-and-approved-design) for the shared presentation.

For the current intrinsic sheets, check short and long option catalogues on each required native
platform, in both themes and with enlarged system text. A short choice fits its content; overflow
stops at native available height and scrolls to the final choice or both filter actions. The
floating tab capsule must not cover a row or action. Open a choice from a dirty filter draft,
select and return, then exercise close, OS back, reset and apply: the existing RHF draft, applied
criteria and selected Search tab retain their established semantics. Reach the final rows and
actions through native scrolling, including keyboard dismissal before opening filters. This
qualifies actual reachability and shared row anatomy separately from JavaScript navigation tests;
JavaScript navigation checks do not establish native sheet geometry.

Using the existing Jest/native scenarios, change text/tabs/filters rapidly and deliver old requests late. Preserve independent filters, retained examples and valid scroll context. Check that successive cursors populate one infinite-query entry through `pageParam`; controlled rereads use standard Query traversal and preserve the prior authorized list on ordinary failure. Fail initial/next-page reads, retry explicitly, exercise controlled reread races, reconnect and switch accounts. Expected: no mixed contexts, silent replay, private old-session data or false end; authorized previous content remains usable until successful replacement.

Native checks require an identified iOS/Android development build and source revision with actual F13 controls/transport, F05 session, F09 entitlements, F12 admission and the relevant F03/F11/F10 integrations. Use the [native setup](../../README.md#native-ui-checks), explicit device/session IDs and synthetic data; record OS, viewport, appearance and system text size. Reuse compatible clients and restore changed device preferences afterward. Require actual session/restriction propagation, the existing support entry and sporting/ad-opening integration before exercising their native cases. Missing callsites, private destinations or provider/device prerequisites leave the corresponding case pending rather than being replaced by a mock result.

| Case                               | Action and expected evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared error, absence and retry    | On both platforms, compare successful no-match with failed initial/new-key reads, then retry explicitly. Fail append and an owner-authorized reread after accepted pages: criteria and still-authorized rows remain, failure is identifiable and failed append is not an end. A successful replacement admits only its context. Reconnect, foreground return and tab return must not replay a failed search. There is no Search pull-to-refresh, refresh button, end-of-results message or index-lag diagnostic.                                                                                                                             |
| Accessibility and appearance       | Repeat initial error, retained-result failure, pagination retry and strict no-match in light/dark, including live system appearance change, with VoiceOver on iOS. At ordinary and enlarged system text, verify tabs/selection, field and filter labels, distinguishing namesake context, loading/error semantics and reachable retry through native scrolling. Verify loading/error announcements with VoiceOver on iOS. Focus remains usable after retry and sheet return; states do not rely on color alone. Compare the exact approved references below, including shared F13 state anatomy; captures do not confer new design approval. |
| Current context and restrictions   | Delay text/tab/filter/session/bypass responses across changes and a pending append across an authorized reread. Old completions cannot replace or append to the current context. With actual session and sporting-owner integration, restrict a retained target and change accounts: known-ineligible content and private old-session work disappear despite an ordinary read failure. Failed options reads preserve prior choices; only a successful catalogue proves disappearance.                                                                                                                                                        |
| Sporting opening and advertising   | Once the sporting destination and shared advertising-opening callsites are integrated, open and return from the exact F03 target under guest/free/Pro/unknown entitlement. Apply the existing [F11 lifecycle](../004-advertising-privacy-legal/plan.md#mediation-and-presentation): search entry, filters, scrolling, retry/reread and return add no interstitial trigger; a failed advertisement does not strand a valid opening. Actual serving requires F11's authorized test units/devices and native provider qualification; never click real advertisements.                                                                           |
| Existing private reporting context | With the existing F10 entry connected, open it from the failed search and verify the available allowlisted screen/action/target context under [F10](../012-reports-feature-suggestions/spec.md#functional-requirements), with unknown values absent. Opening/cancelling collects no query analytics, geolocation, raw logs, credentials or implicit attachment and does not submit a report. A deliberate submission requires F10's qualified private destination and its own authorization; never publish support content or attachments in this repository.                                                                                |

Compare the native states with Product Design [error 946:3807](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=946-3807), [empty 947:3712](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=947-3712), [loading 952:14506](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=952-14506), [Entity Card 354:565](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=354-565) and [query-only toolbar 964:13401](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=964-13401), with the [F13 design and qualification limits](../003-shared-quality/quickstart.md#native-ui-and-approved-design). Validate examples, filters, continuation, destinations/advertising and app-shell integration separately. No unavailable filter is suggested by the bounded empty-state copy.

### Result cards and traversal

Browse 47 results as twenty/twenty/seven across one Query context. Fail append and retry the same cursor; preserve admitted cards and remove continuation only on established exhaustion. Repeated UUIDs retain first position and latest summary regardless of casing; equal names remain distinct. Open the selected namesake and return with tab/text/criteria/pages retained, without replay or an invented scroll guarantee.

### Result activation

Search card selection consumes F03's existing `useSportingNavigation` UUID routes and F11's `useSportingTransition` entry. The selected scene supplies its active state; F05 identity, F09 eligibility and F12 admission remain with their current owners. Search adds no counter, placement, SDK owner or restriction propagation mechanism.

### Read-failure recovery

Fail engine/hydration, timeout/partial shards, initial reads, retained-page rereads and append independently. Expect safe ordinary unavailability rather than Empty/end. Safe Retry uses the failed card/footer boundary without toast or implicit reconnect/focus replay. Delay old text/tab/filter/session/bypass responses and cancelled appends: none may enter the current context. Current refusal removes retained results before a later outage.

Verify F12 admission separately from ordinary read failure: a real HTTP 503 makes ordinary admission incomplete and removes ordinary routes. A removed visit is no longer a retained context; Search adds no bypass. Exercise native recovery with the actual F12 admission owner and ordinary routes.

### Current session, restriction and support integration

The reporting action reuses the approved [Search header 916:2892](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=916-2892), shared plain icon action and official Lucide Flag. The real F10 form receives only the finite “Recherche” origin from Search; its existing validated attempted-target mapping remains available for detail entries. Verify that query/filter/error payloads are excluded and cancel/return sends nothing, collects nothing extra and replays no action. No new form, support transport, private destination or F11 opening-counter call is introduced. Exercise native reachability and VoiceOver behavior on iOS separately from controlled transport checks.

### Retained examples

Exercise all three collections with five-or-fewer retained UUIDs, every exact filter, current visibility/city drift, independent clubs and unattached professional teams. Refresh preserves accepted order and never replaces a withdrawn example; no total or pagination is advertised. A failed detail may leave its benign card until the collection's own current server refresh. Expect ordinary unavailability on engine failure.

After generation, run `./mvnw -B -ntp -pl apps/backend verify -Dtest='Discovery*Test,!*IntegrationTest' -Dit.test=DiscoveryExamplesIntegrationTest` and the affected mobile discovery tests through the repository command.

## Evidence limits

Controlled SQL/engine/JavaScript checks do not establish native accessibility, actual advertising or hosted qualification. Exercise real local backend traversal, destination opening and the native matrix with their actual owner integrations and authorized test inputs.
