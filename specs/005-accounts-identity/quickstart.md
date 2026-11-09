# Quickstart: validate account lifecycle

Native accessibility verification follows [F13 FR-030](../003-shared-quality/spec.md#platforms-accessibility-and-bounded-continuity).

## Prerequisites

Use the [README verification commands](../../README.md#verification) for implemented boundaries. The scenarios below qualify the [F05 implementation](plan.md) as their owning tasks and native/provider prerequisites become available; passing controlled tests does not complete those scenarios.

Prepare synthetic principals for shared email, existing linked identities, missing email/age and dedicated preproduction signup. Use compatible native iOS/Android clients for functional cases; prepare physical devices and qualification purchase/gift accounts where the actual SDK/provider boundary requires them. Keep private evidence outside the repository. Destructive provider tests require authorization and must not target social or cross-connection principals from preproduction.

## Contracts and profile data

1. **Generate and compile** the canonical mobile contract through the [F13 toolchain](../003-shared-quality/quickstart.md#contract-boundary). Exercise multipart binding, omission/null, the photo-action enum, username normalization, shared Problem Details, bodyless 204 and binary responses. **Expected:** valid requests/responses cross the Java/TypeScript boundary; invalid ones are refused before persistence or caching.
2. **Race creation and profile edits** with PostgreSQL Testcontainers: one principal, competing usernames, disjoint fields and the same field. **Expected:** one account per principal, case-insensitive username uniqueness, shared email allowed, omitted fields preserved and last accepted supplied value retained. A supplied unchanged username succeeds; an empty change document is refused.
3. **Save and remove photos** together with username changes; submit malformed, oversized and non-square content. **Expected:** atomic save, previous profile preserved on refusal, accepted pixels within the contract bounds without unrelated metadata, removal only by explicit intent.

### Profile editing

Run the backend/mobile targets from [README verification](../../README.md#verification) with generated transport, real SQL transactions and native form owners. Keep ImageIO preparation outside SQL and accepted multipart bytes in bounded memory. Fail a profile-save response after dispatch: retain ordinary error/input state, allow a later explicit submission and keep original-account rereading optional; no read or credential renewal replays the write. Qualify actual crop, hosted login, F12 admission and required physical-device behavior separately from controlled native/network inputs.

## Authentication and isolation

### Common member admission and account availability

Use the actual root/Router composition and the shared account provider. Keep the public configuration known/admitted, then hold or fail the first authenticated account read. Expect one initial member waiting/recovery state, explicit read Retry, local credential clearing to enter guest navigation, and help with return to the requested destination. No Retry creates an account or opens hosted login. A current 404 offers explicit account establishment; an HTTP 401 alone does not establish nonrenewable native credentials. Repeat with public maintenance, failed complete checking and an unsatisfied minimum version: those public gates retain precedence and suppress ordinary help/sign-in routes.

After an account has loaded, fail an enabled reread technically: expect the same matching UUID/data and admitted stack. Current 401/403/404 withdraws the account; a later 503 leaves it unavailable and reports the latest failed read. A successful read can restore availability, including a new UUID under the same Auth0 subject. Verify Home's personal choice resets for that replacement while same-UUID technical failure preserves it; private keys, forms and SDK associations must retain their original ownership.

Exercise a remembered notification, a cold/direct ordinary destination, support roundtrip, explicit establishment and reauthentication return through the actual Router, preserving exact personal acknowledgment ownership separately from public Match navigation. Observe representative foreground rereading on an explicitly named compatible native device/session. Controlled `AppState` callbacks prove only the JavaScript subscription; actual native SDK/storage/provider proof remains separate. Use the existing account, access, notification and personal identity suites for exact races, then the applicable README checks. Prototype/Figma review and screenshots do not establish native/provider acceptance.

### Account access

Use current F12 admission with generated account routes. Only `GET /accounts/me` skips ordinary admission; inactive maintenance permits first establishment without an existing profile. Active personal bypass requires the exact principal's usable account and current grant under the account lock.

Delay provider I/O after capturing that UUID, then erase/replace the account. Expect establishment/original-resource operations to refuse using the old admission for another UUID. Current maintenance reads end before external calls. Use the root's sole F12 admission owner without an account-owned mirror.

Run the workspace verification with controlled provider HTTP for exact principal lookup, token reuse, bounded token/resource failures and concurrent creation/replacement. Verify GET neither creates nor calls Auth0. These checks do not establish live hosted login, secure native storage or deployed provider configuration.

### Account age

Use known, absent and recovered provider dates through explicit establishment. Expect known age to survive missing provider data/outage, absent age to remain null, explicit retry to fill it and a new business lifecycle to use the actual surviving/recreated principal's date, including linked identities. F08 owns thresholds/moderation policy.

Trigger age retry through the overview/editor using a bodyless POST. Reject malformed evidence, preserve profile editing when age is unknown and keep confirmed invalidation with the original private client. A lost acknowledgement may resolve through current GET; an absent account offers explicit sign-in/establishment retry. Switch principal during completion and expect a fresh private client without old callbacks. Qualify actual provider deletion/recreation and F08/F14 integration separately.

### Push and entitlement session consumers

Capture the current F07 association synchronously on departure and wait at most three seconds for its single removal attempt before native logout/clearing. Fail removal/badge work: expect no retained retry credential/queue and no block on local departure. Failed browser logout stays authenticated; explicit local clearing remains available.

Exercise delayed RevenueCat callbacks and identity ordering deterministically through its actual consumer, independently from push cleanup. Global native owners outlive the private QueryClient replacement. Use [F07 session cases](../011-notifications-delivery/quickstart.md#essential-scenarios) for generated DELETE, token/badge and old-push behavior; actual SDK identity ordering, storage and provider delivery retain their focused native/provider checks.

### Deterministic session boundaries

Use the implemented F05/session/Query owners with controlled native/network I/O. Delay A's account/photo queries, preparation, form completion, entitlement callbacks and push removal/registration, then switch to B or guest. **Expected:** A's private data/forms/cache callbacks cannot populate B's fresh lifetime; credential handoff rejects a mismatched subject; stale removal cannot delete B's exact destination. Exercise A → guest → A as ordinary same-account freshness, without a custom generation guarantee. Different-owner, visitor, expired/wrong-client/environment and collector credentials cannot perform owner operations. Consumers add checks for their distinct effect instead of repeating the same race for every screen.

### Provider and device qualification

1. **Sign in on actual native iOS/Android builds:** production Google/Apple and dedicated preproduction email/password signup. Exercise callback, cancellation, outage, explicit restoration retry, renewal and failed browser logout. **Expected:** configured environment/client/audience restrictions apply. Successful SDK logout and explicit local clearing enter guest mode; cancelled/failed browser logout remains authenticated and retryable. Verify actual secure storage/renewal separately from controlled lifetime tests. Use physical hardware where the SDK/provider boundary requires it; no result claims global provider logout.
2. **Read and establish accounts:** ordinary GET, first establishment without usable email, explicit login with provider failure, missing-age retry, linked methods and same-email distinct principals. **Expected:** GET neither creates nor contacts Auth0; missing first email blocks creation; known email/age survive failure; only age-dependent actions wait for unknown age.
3. **Run an ordinary native session smoke:** sign in, open/edit Profile, move between routes, sign out or explicitly leave locally, then sign in as B. **Expected:** current identity, permitted actions and draft/cache lifetimes follow the current account; public sporting access remains usable. Reuse applicable native evidence and keep precisely timed response races in the deterministic suite.
4. **Verify distinct SDK/global effects:** exercise native RevenueCat identity changes and entitlement reflection, then F07 disassociation/reassociation and an old push under guest/B using authorized fixtures. **Expected:** actual identity ordering and storage respect their owners; local departure does not acquire a durable retry, and old pushes expose no private inbox under guest/B. Preserve the accepted possibility of an already sent old registration arriving last until ordinary reassociation. Controlled callbacks do not prove provider reflection, system delivery or recall.

## Native photo and shared control

Select large, rotated and transparent assets, including supported source formats needing conversion; crop, cancel, fail preparation and save on compatible native clients. **Expected:** the library original remains unchanged; prepared output is square, not enlarged, at most 1024 pixels per side and 5 MiB. Qualify the documented iOS large-image crop limitation and use physical assets/devices where their actual source or SDK behavior requires them.

Apply [F13 single-image qualification](../003-shared-quality/quickstart.md#single-image-fields) to Profile and representative sporting logo owners, including native permission denial, a narrow layout and enlarged content. **Expected:** one Add/Edit entry opens standard OS choices with Cancel and no camera, known presence permits explicit removal without a preview, and preparation/authorization retain their own guards. Profile uses the same 80-point rounded-square media slot as logo fields in empty, loaded, skeleton, failed and prepared-candidate states. Loaded/candidate bitmaps fill its full bounds without inner padding or frame, using proportional `cover` cropping without stretching. Square crop and upload bounds remain profile-owned. Multi-image support attachments retain their existing F10 control and separate qualification. The prototype omits native picker/crop UI and cannot qualify it.

## Profile overview and editor qualification

Follow [A33–A34](spec.md#user-story-2--use-and-customize-a-minimal-profile-priority-p2) and the exact overview/editor, guest, unavailable and administration [design references](spec.md#design-evidence). Open Profile, edit the current identity, cancel clean/dirty drafts, save a valid change, switch tabs during a pending save, and retry a failed profile read. Keep ordinary public navigation and Support reachable outside F12 gates; the ready overview exposes its owner-controlled privacy/session entries, and current capability grants alone expose administration. Verify enlarged text, both appearances, actual keyboards and trailing content clearance with the measured ordinary capsule. Open the delivered legal rows and sign-in footer links through the [F11 native-browser handoff](../004-advertising-privacy-legal/plan.md#legal-content-and-shared-privacy); verify public reading independently of account/Pro and preserve F12 in-app gates. Signed-in deletion and granted video moderation open their delivered owner routes; only genuinely undelivered destinations, including Mapping des poules, remain disabled. Validate account deletion independently under the [erasure boundary](plan.md#erasure-and-manual-resolution).

Exercise overview/editor separation, unchanged/reverted saving, clean/dirty cancellation, refusal then acknowledgement, retained drafts across tabs, accepted background save without stealing navigation, direct editor anchoring, guest access and explicit initial-read retry. After `hasPhoto=false`, cached media must disappear. Pro presentation uses only current SDK evidence and disappears on session invalidation; unknown never becomes free status.

### Account and photo readiness — A34

Hold the initial account/session read and verify one whole-page skeleton/recovery composition until the account is usable. Hold/fail/refuse the optional overview photo independently: known identity, email, entries and header editing remain usable. A terminal HTTP 503 uses local fallback; explicit native pull restores accepted media after success. A later HTTP 403 removes both layers. `hasPhoto=false` displays absence without a photo read; sign-out removes identity/photo/edit action.

Open the authorized editor while the existing photo is pending, failed or refused. The username, read-only email, Save/Cancel and eligible native refresh remain present; only initial account/session failure blocks the body. Modify text and save while the photo has no preview: the multipart request omits photo intent and preserves the accepted photo. Open the photo choices, close without changing the draft, replace an unavailable image, and explicitly remove a known image without preview. A late remote read cannot restore a removal or replace a local candidate. Only the main Save commits these intentions. Verify direct-preview dismissal, OS-menu cancellation and Photos handoff, inert obsolete callbacks after current authorization withdrawal, prepared-file ownership and first/last-field/final-action reachability with enlarged content. Use the [shared single-image cases](../003-shared-quality/quickstart.md#single-image-fields); unknown Pro never delays readiness.

Initial loading/full-body Error omits pull-to-refresh and uses safe Retry; retained content/drafts keep eligible native refresh. Check actual keyboard retention/discard, both themes and enlarged text. Use the [approved readiness scope](../003-shared-quality/spec.md#evidence-scope), not F12's separate admission gate, to assess Account rendering; provider cold start, crop and the wider Account matrix need their actual native/provider inputs.

## Erasure and return

Qualify the ordinary profile-to-erasure screen with the unchanged consequences, checkbox, plain store-billing notice and actions. Cancel/back has no deletion effect; large text and native navigation keep all content reachable. Use the applicable [design evidence](spec.md#design-evidence). Hosted Auth0 login remains provider-owned; fictitious design handoff text does not qualify its actual browser return, cancellation or session behavior.

1. **Fail the local transaction and race personal writes with deletion.** **Expected:** rollback preserves the account/session and starts no external deletion; committed deletion removes the profile/photo/associations together and preserves unowned content and moderation. No writer recreates personal data for the absent original UUID.
2. **Fail each provider call or its target lookup after local commit.** **Expected:** other known targets are attempted once, business data stays deleted and 204 leads directly to guest home. Private diagnostics support manual repair without a pending record, polling or replay. The accepted interruption-before-log gap remains a limitation, without a dedicated process-stop qualification exercise.
3. **Lose the DELETE response and reread the original UUID.** **Expected:** ordinary reads resolve presence/absence without replay; unavailable reads permit local sign-out with an ordinary error and no false confirmation. Repeating DELETE for the absent original returns 404 without provider calls or effects on a replacement account.
4. **Register again after successful and failed provider cleanup.** **Expected:** new business UUID with no old data/grants/gifts; actual current Auth0 date, including an unchanged date after failed identity removal. RevenueCat asynchronous success needs no polling. Check second-device SDK behavior, ordinary overlap errors/manual assistance and the accepted same-subject token limit in [FR-035](spec.md#deletion-and-return), without assuming immediate global revocation.
5. **Inspect synthetic cleanup failures.** **Expected:** only authorized original-target references in private diagnostics; no email, profile, photo, credentials or raw payloads, and no personal references in public artifacts. Verify safe manual targeting and purpose-limited private handling of unresolved cases. A diagnostic is not proof of repair.

### Mobile erasure

Use the ordinary Profile-stack confirmation and shared controls with the [approved design](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1149-3128). Capture the original UUID once, then erase/replace the current account while the route or request is pending. Expect exact-original rereads, no automatic DELETE replay and direct guest return after 204 or confirmed original absence.

Complete A after B signs in: the credential/clear action must retain its captured subject and cannot dispatch/clear B. If native clearing fails after confirmed erasure, keep only explicit local-departure retry and blocked Back; do not abandon A's confirmed cleanup because its route unmounted. Installation/discovery markers remain unchanged. Qualify refusal/cancellation, uncertain response/reread, themes, large text and native navigation on both actual platforms; controlled Auth0/HTTP input does not establish provider deletion or store billing.

### Server erasure

Run the committed backend target (`npx nx run backend:test`). For focused iteration after `npm run bundle:contracts`:

```sh
./mvnw -B -ntp -pl apps/backend verify \
  -Dtest='AccountErasureWebMvcTest,OriginalTargetCleanupTest,ErasureDiagnosticsTest,AccountCleanupConfigurationTest' \
  -Dit.test='EraseAccountIntegrationTest,NotificationErasureIntegrationTest,ContributionErasureIntegrationTest,AccountCleanupIntegrationTest'
```

Use actual account/photo/F06/F07/F08/F12 persistence participants on disposable migrated PostgreSQL. Fail a required participant and final account deletion: expect complete rollback with no provider call. After commit, verify provider work has no SQL transaction, targets only captured originals and attempts each known target independently.

Use controlled HTTP for exact Auth0 targets, exclusive preproduction connection/link checks, unsafe-scope refusal, total deadlines including progressive bodies, no redirect/replay after dispatched destructive calls and RevenueCat's queued acknowledgement. Force destructive cleanup off independently of inherited test configuration; qualify actual provider effects separately.

Provider cleanup remains disabled in committed defaults. The [environment example](../../apps/backend/.env.example) owns inputs. Preproduction requires exclusive original Auth0 connection evidence and individually verified test-only RevenueCat IDs; missing evidence permits local deletion with private manual diagnostics. F14 owns historical target discovery/coverage; no email search, alias expansion or persistent reference registry is introduced.

### Local erasure races and return

Race actual photo preparation/replacement/removal with erasure on both sides of the account lock. Expect writer-first data to be removed by erasure, erasure-first writes to refuse the absent original and rollback to preserve exact profile/photo/personal rows without external cleanup.

Pause generated multipart PATCH after preparation outside SQL, erase and explicitly re-establish the principal, then save different replacement pixels. Resume the old PATCH: expect 404 without changing replacement identity/profile/photo. Repeat delayed provider synchronization against the replaced UUID.

Create actual follows, inbox/destinations, contributions/reports/holds and grants. Erase then establish again: expect a fresh UUID, neutral profile and no old personal associations/history/grants. Preserve nonpersonal content, chronology, quotas, lineage, report counts and processed-announcement facts; remove only original personal attribution/reasons. Include actual sporting-root/account-lock writer orders, reassociation and in-flight-delivery work.

Under a surviving subject, current baseline authority may operate on the new UUID; old-UUID commands cannot target it. This does not establish real token expiry/revocation or provider gift deletion/restoration. Use F09/F14 and the provider/device cases for actual gifts, store restoration, concurrent cleanup/return, other-device SDKs and historical continuity.

### Private cleanup operations

Inspect the local `manual_attention` diagnostic and follow the [manual cleanup procedure](../../infra/operations/README.md#private-account-cleanup) for current-use checks, exact original provider targets, dedicated test-identity scope and purpose-limited private handling.

Exercise actual provider cleanup and private support access only with their authorized tools. Local formatting, synthetic diagnostics and source consistency establish no destructive provider outcome. Preserve the accepted unlogged post-commit interruption gap.

## Integration with other owners

- **F09 purchases:** restore a valid qualification purchase after business deletion on each original store. Verify current-account assignment without old data/gifts; use [F09 qualification](../006-pro-subscriptions/spec.md#success-criteria) for receipt-wide transfer and assisted exceptions.
- **F14 continuity:** supply the necessary historical customer references and valid-gift evidence to the [transition qualification](../014-v1-v2-transition/spec.md#success-criteria). Native restoration does not prove population coverage or erase old customer records.
- **F10/F11 private requests:** exercise the existing public privacy-page route under [FR-037–FR-038](spec.md#deletion-and-return); ownership verification precedes erasure and outcome communication remains truthful. Inspect diagnostics against the scoped F05/F11 exception and all remaining exclusions.
- **Current restrictions on reused data:** include deleted business accounts and known outstanding provider cleanup in disposable older-data fixtures under the [shared data-integrity boundary](../003-shared-quality/quickstart.md#retained-data-and-club-logo-continuity); current erasure, rights and expiry apply before affected access or push resumes.
