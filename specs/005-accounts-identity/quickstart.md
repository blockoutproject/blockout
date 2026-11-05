# Quickstart: validate account lifecycle

## Prerequisites

Use the [README verification commands](../../README.md#verification) for implemented boundaries. The scenarios below qualify the [F05 implementation](plan.md) as their owning tasks and native/provider prerequisites become available; passing controlled tests does not complete those scenarios.

Prepare synthetic principals for shared email, existing linked identities, missing email/age and dedicated preproduction signup, plus two devices and qualification purchase/gift accounts. Keep private evidence outside the repository. Destructive provider tests require authorization and must not target social or cross-connection principals from preproduction.

## Contracts and profile data

1. **Generate and compile** the canonical mobile contract through the [F13 toolchain](../003-shared-quality/quickstart.md#contract-boundary). Exercise multipart binding, omission/null, the photo-action enum, username normalization, shared Problem Details, bodyless 204 and binary responses. **Expected:** valid requests/responses cross the Java/TypeScript boundary; invalid ones are refused before persistence or caching.
2. **Race creation and profile edits** with PostgreSQL Testcontainers: one principal, competing usernames, disjoint fields and the same field. **Expected:** one account per principal, case-insensitive username uniqueness, shared email allowed, omitted fields preserved and last accepted supplied value retained. A supplied unchanged username succeeds; an empty change document is refused.
3. **Save and remove photos** together with username changes; submit malformed, oversized and non-square content. **Expected:** atomic save, previous profile preserved on refusal, accepted pixels within the contract bounds without unrelated metadata, removal only by explicit intent.

### Profile editing

Run the backend/mobile targets from [README verification](../../README.md#verification) with generated transport, real SQL transactions and native form owners. Keep ImageIO preparation outside SQL and accepted multipart bytes in bounded memory. Qualify actual crop, hosted login, F12 admission and physical-device interaction separately from controlled native/network inputs.

## Authentication and isolation

### Account access

Use current F12 admission with generated account routes. Only `GET /accounts/me` skips ordinary admission; inactive maintenance permits first establishment without an existing profile. Active personal bypass requires the exact principal's usable account and current grant under the account lock.

Delay provider I/O after capturing that UUID, then erase/replace the account. Expect establishment/original-resource operations to refuse using the old admission for another UUID. Current maintenance reads end before external calls. Use the root's sole F12 admission owner without an account-owned mirror.

Run the workspace verification with controlled provider HTTP for exact principal lookup, token reuse, bounded token/resource failures and concurrent creation/replacement. Verify GET neither creates nor calls Auth0. These checks do not establish live hosted login, secure native storage or deployed provider configuration.

### Account age

Use known, absent and recovered provider dates through explicit establishment. Expect known age to survive missing provider data/outage, absent age to remain null, explicit retry to fill it and a new business lifecycle to use the actual surviving/recreated principal's date, including linked identities. F08 owns thresholds/moderation policy.

Trigger age retry through the overview/editor using a bodyless POST. Reject malformed evidence, preserve profile editing when age is unknown and keep confirmed invalidation with the original private client. A lost acknowledgement may resolve through current GET; an absent account offers explicit sign-in/establishment retry. Switch principal during completion and expect a fresh private client without old callbacks. Qualify actual provider deletion/recreation and F08/F14 integration separately.

### Push and entitlement session consumers

Capture the current F07 association synchronously on departure and wait at most three seconds for its single removal attempt before native logout/clearing. Fail removal/badge work: expect no retained retry credential/queue and no block on local departure. Failed browser logout stays authenticated; explicit local clearing remains available.

Delay the actual RevenueCat consumer through sign-out and verify its global identity ordering independently from push cleanup. Global native owners outlive the private QueryClient replacement. Use [F07 session cases](../011-notifications-delivery/quickstart.md#essential-scenarios) for generated DELETE, token/badge and old-push behavior; physical credentials/provider delivery retain the following device cases.

### Provider and device qualification

1. **Sign in on physical iOS/Android:** production Google/Apple and dedicated preproduction email/password signup. Exercise callback, cancellation, outage, explicit restoration retry, renewal and failed browser logout. **Expected:** configured environment/client/audience restrictions apply. Successful SDK logout and explicit local clearing enter guest mode; cancelled/failed browser logout remains authenticated and retryable. Controlled lifetime tests do not certify native storage or SDK-internal ordering. This does not claim global provider logout.
2. **Read and establish accounts:** ordinary GET, first establishment without usable email, explicit login with provider failure, missing-age retry, linked methods and same-email distinct principals. **Expected:** GET neither creates nor contacts Auth0; missing first email blocks creation; known email/age survive failure; only age-dependent actions wait for unknown age.
3. **Switch A → B** while queries, photo preparation and entitlement callbacks are delayed. **Expected:** A's private data/forms/cache callbacks cannot populate B's fresh lifetime, and credential handoff rejects a mismatched subject. Exercise A → guest → A as ordinary same-account freshness, without a custom generation guarantee. Different-owner, visitor, expired/wrong-client/environment and collector credentials cannot perform owner operations.
4. **Fail push disassociation on logout, then reassociate B.** **Expected:** local logout succeeds without durable retry; delayed A removal cannot remove B. Any still-delivered A system push cannot expose A's private inbox under guest/B.

## Native photo and shared control

Select large, rotated and transparent assets, including supported source formats needing conversion; crop, cancel, fail preparation and save. **Expected:** the library original remains unchanged; prepared output is square, not enlarged, at most 1024 pixels per side and 5 MiB. Qualify the documented iOS large-image crop limitation.

Apply [F13 accessibility checks](../003-shared-quality/quickstart.md#native-ui-and-approved-design) to the common image control, including native permission denial, 320-point layout and both themes. **Expected:** profile, sporting and support fields share selection/replacement/removal behavior while retaining owner-specific limits and removal meaning. The prototype omits native picker/crop UI and cannot qualify it.

## Profile overview and editor qualification

Follow [A33–A34](spec.md#user-story-2--use-and-customize-a-minimal-profile-priority-p2) and the exact overview/editor, guest, unavailable and administration [design references](spec.md#design-evidence). Open Profile, edit the current identity, cancel clean/dirty drafts, save a valid change, switch tabs during a pending save, and retry a failed profile read. Keep ordinary public navigation and Support reachable outside F12 gates; the ready overview exposes its owner-controlled privacy/session entries, and current capability grants alone expose administration. Verify enlarged text, both appearances, actual keyboards and trailing content clearance with the measured ordinary capsule. Read-only legal rows remain unavailable until [F11 legal implementation](../004-advertising-privacy-legal/tasks.md#phase-5-user-story-3--read-and-maintain-reliable-legal-documents-priority-p1); account deletion remains with [US5](tasks.md#phase-6-user-story-5--erase-the-account-and-return-safely-priority-p1).

Exercise overview/editor separation, unchanged/reverted saving, clean/dirty cancellation, refusal then acknowledgement, retained drafts across tabs, accepted background save without stealing navigation, direct editor anchoring, guest access and explicit initial-read retry. After `hasPhoto=false`, cached media must disappear. Pro presentation uses only current SDK evidence and disappears on session invalidation; unknown never becomes free status.

### Account and photo readiness — A34

Hold the initial account/session read and verify one whole-page skeleton/recovery composition until the account is usable. Hold/fail/refuse the optional overview photo independently: known identity, email, entries and header editing remain usable. A terminal HTTP 503 uses local fallback; explicit native pull restores accepted media after success. A later HTTP 403 removes both layers. `hasPhoto=false` displays absence without a photo read; sign-out removes identity/photo/edit action.

Keep the editor's initial-photo prerequisite and admitted-draft safeguards. Verify independent foreground/decorative decoding failures, replacement/removal and source/session withdrawal through the [F13 media/native scenarios](../003-shared-quality/quickstart.md#native-qualification-limits). Unknown Pro does not delay Profile readiness.

Initial loading/full-body Error omits pull-to-refresh and uses safe Retry; retained content/drafts keep eligible native refresh. Check actual keyboard retention/discard, both themes and enlarged text. Use the [approved readiness scope](../003-shared-quality/spec.md#evidence-scope), not F12's separate admission gate, to assess Account rendering; provider cold start, crop, screen readers and the wider Account matrix need their actual native/provider inputs.

## Erasure and return

Qualify the ordinary profile-to-erasure screen with the unchanged consequences, checkbox, plain store-billing notice and actions. Cancel/back has no deletion effect; large text and native navigation keep all content reachable. Use the applicable [design evidence](spec.md#design-evidence). Hosted Auth0 login remains provider-owned; fictitious design handoff text does not qualify its actual browser return, cancellation or session behavior.

1. **Fail the local transaction and race personal writes with deletion.** **Expected:** rollback preserves the account/session and starts no external deletion; committed deletion removes the profile/photo/associations together and preserves unowned content and moderation. No writer recreates personal data for the absent original UUID.
2. **Fail each provider call or its target lookup after local commit.** **Expected:** other known targets are attempted once, business data stays deleted and 204 leads directly to guest home. Private diagnostics support manual repair without a pending record, polling or replay. A process stop between commit and logging demonstrates the accepted unreported-cleanup gap.
3. **Lose the DELETE response and reread the original UUID.** **Expected:** ordinary reads resolve presence/absence without replay; unavailable reads permit local sign-out with an ordinary error and no false confirmation. Repeating DELETE for the absent original returns 404 without provider calls or effects on a replacement account.
4. **Register again after successful and failed provider cleanup.** **Expected:** new business UUID with no old data/grants/gifts; actual current Auth0 date, including an unchanged date after failed identity removal. RevenueCat asynchronous success needs no polling. Check second-device SDK behavior, ordinary overlap errors/manual assistance and the accepted same-subject token limit in [FR-035](spec.md#deletion-and-return), without assuming immediate global revocation.
5. **Inspect synthetic cleanup failures and the native alert.** **Expected:** only authorized original-target references in private 14-day logs; no email, profile, photo, credentials or raw payloads, and no personal references in Discord. Verify safe manual targeting and existing private support handling for an unresolved case beyond retention. Alert closure alone does not prove repair.

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

Use the [native Grafana condition](../../infra/observability/README.md#private-account-cleanup-f05) for `manual_attention`, extracting only nonpersonal notification fields. Follow the [manual cleanup procedure](../../infra/operations/README.md#private-account-cleanup) for current-use checks, exact original provider targets, preproduction scope and still-justified private retention beyond 14 days.

Exercise live Loki/Discord evaluation, host/provider retention and private support access only with their actual authorized tools. Local formatting, synthetic diagnostics and source consistency establish no destructive provider or operational outcome. Preserve the accepted unlogged post-commit interruption gap.

## Integration with other owners

- **F09 purchases:** restore a valid qualification purchase after business deletion on each original store. Verify current-account assignment without old data/gifts; use [F09 qualification](../006-pro-subscriptions/spec.md#success-criteria) for receipt-wide transfer and assisted exceptions.
- **F14 continuity:** supply the necessary historical customer references and valid-gift evidence to the [transition qualification](../014-v1-v2-transition/spec.md#success-criteria). Native restoration does not prove population coverage or erase old customer records.
- **F10/F11 private requests:** exercise the existing public privacy-page route under [FR-037–FR-038](spec.md#deletion-and-return); ownership verification precedes erasure and outcome communication remains truthful. Inspect diagnostics against the scoped F05/F11 exception and all remaining exclusions.
- **F13 restoration:** include deleted business accounts and known outstanding provider cleanup in the [isolated restore qualification](../003-shared-quality/quickstart.md#initial-restore-and-activation-condition); current erasure, rights and expiry apply before affected access or push resumes.
