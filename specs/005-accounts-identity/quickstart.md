# Quickstart: validate account lifecycle

## Prerequisites

Use the [README verification commands](../../README.md#verification) for implemented boundaries. The scenarios below qualify the [F05 implementation](plan.md) as their owning tasks and native/provider prerequisites become available; passing controlled tests does not complete those scenarios.

Prepare synthetic principals for shared email, existing linked identities, missing email/age and dedicated preproduction signup, plus two devices and qualification purchase/gift accounts. Keep private evidence outside the repository. Destructive provider tests require authorization and must not target social or cross-connection principals from preproduction.

## Contracts and profile data

1. **Generate and compile** the canonical mobile contract through the [F13 toolchain](../003-shared-quality/quickstart.md#contract-boundary). Exercise multipart binding, omission/null, the photo-action enum, username normalization, shared Problem Details, bodyless 204 and binary responses. **Expected:** valid requests/responses cross the Java/TypeScript boundary; invalid ones are refused before persistence or caching.
2. **Race creation and profile edits** with PostgreSQL Testcontainers: one principal, competing usernames, disjoint fields and the same field. **Expected:** one account per principal, case-insensitive username uniqueness, shared email allowed, omitted fields preserved and last accepted supplied value retained. A supplied unchanged username succeeds; an empty change document is refused.
3. **Save and remove photos** together with username changes; submit malformed, oversized and non-square content. **Expected:** atomic save, previous profile preserved on refusal, accepted pixels within the contract bounds without unrelated metadata, removal only by explicit intent.

### Profile editing construction

The profile MVC, ImageIO and PostgreSQL suites exercise the generated multipart/binary boundary, whole-save refusals, original-row locking, competing usernames, omitted fields, replacement/removal and deletion races. Image preparation finishes before the SQL transaction; bounded accepted multipart parts and ImageIO streams remain in memory. The mobile form/preparation suites retain real RHF/Zod, Query, session generation and generated transport, with controlled native/network I/O. They cover preserved drafts, explicit photo intent, original-target rereads after uncertain responses and delayed work across A → guest → A. Run them through the normal README verification commands. These construction checks do not qualify actual native crop, provider login, F12 admission or the physical-device cases in T049.

## Authentication and isolation

### Account access construction

The account MVC suite uses the generated `AccountsApi`, current F12 permissions and a controlled `AccountAdmission`; only `GET /accounts/me` skips ordinary admission. The real backend now requires F12's `MaintenanceAdmission` implementation, which reads current PostgreSQL maintenance before ordinary account work. Inactive maintenance permits first establishment without an existing profile; active personal bypass requires the exact validated principal's usable business account and current grant under the account lock. Admission ends before provider I/O and returns the exact bypass-authorized UUID. Establishment retains that original and refuses its disappearance or replacement before capture; original-resource operations likewise cannot use its admission for another UUID. `AccountMaintenanceAdmissionIntegrationTest` exercises this actual wiring, active refusals, revocation, ownership, invalid configuration and activation ordering. Its first-profile regression returned 503 before this binding was implemented. The native routes still consume `AccountAdmissionProvider`, defaulting to unavailable until F12 T028 supplies its real policy. Other domain admission, native gates and operational activation remain separate qualification. Guest-home and legal/support destinations retain their F14/F10/F11 owners; account screens hand off navigation without owning those journeys.

Run the normal workspace verification, including `AccountAccessWebMvcTest`, `Auth0PrincipalClientTest`, `Auth0ConfigurationIntegrationTest`, `Auth0PropertiesIntegrationTest`, `EstablishAccountIntegrationTest` and mobile `sign-in.test.tsx`. The provider suite exercises the real Auth0 Java SDK and Spring OAuth client against controlled responses/local HTTP, with bounded token/resource failures and token reuse. The SQL suite checks service orchestration, concurrent creation and deletion/replacement during provider I/O. Mobile tests control native I/O and admission while retaining the actual session, Query and transport owners. These checks establish neither real hosted login nor native storage, provider configuration or the physical-device cases below.

### Account-age construction

`EstablishAccountAgeTest` exercises explicit establishment with controlled provider/store outcomes: known evidence survives an outage or missing provider date, absent age stays null, explicit recovery fills it, and a new business lifecycle uses the surviving or recreated principal's date, including linked-identity evidence. Existing Auth0 HTTP and PostgreSQL establishment suites retain the real decoding, out-of-transaction lookup and original-UUID race checks. The immutable account snapshot and existing `principalCreatedAt` response retain F05 evidence for F08; threshold and moderation policy remain F08-owned.

Mobile `account-age-retry.test.tsx` exercises the profile with real session, Query, generated transport and form owners. A user-triggered bodyless POST reuses valid credentials, preserves username/photo drafts and current administration access, and rejects malformed evidence and old-generation results. Delayed POST/PATCH responses in both orders preserve confirmed photos and provider evidence through field-owned cache updates. Null evidence retains explicit retry without blocking profile editing. Run these suites through the normal README verification commands. Controlled cleanup fixtures establish neither real provider deletion/recreation nor F08/F14 integration; T023 remains pending.

### Push and entitlement session consumers

The root supplies F07's exact-association removal to the existing F05 session owner. A departure
captures that resource synchronously, invalidates private generations immediately, waits at most
three seconds for F07's single removal attempt, then performs native credential clearing. Network,
badge or browser failure supplies no retry credential or queue. `ProProvider` remains the sole
RevenueCat owner and receives invalidation without waiting for push cleanup.

The [session-consumer cases](../../apps/mobile/src/features/accounts/__tests__/session-consumers.test.tsx)
cover removal ordering/failure and a delayed actual RevenueCat consumer through sign-out. The
[F07 construction](../011-notifications-delivery/quickstart.md#push-association-and-session-construction)
owns generated DELETE, token acquisition, badge and old-push cases; existing profile/preparation
and private-query cases retain their old-generation coverage. These controlled SDK/network boundaries
do not qualify physical credential storage, provider delivery or the following T020/device scenarios.

### Provider and device qualification

1. **Sign in on physical iOS/Android:** production Google/Apple and dedicated preproduction email/password signup. Exercise callback, cancellation, outage, explicit restoration retry, renewal and failed browser logout. **Expected:** configured environment/client/audience restrictions apply, and local logout clears credentials/private state despite browser failure, using the native SDK lifecycle. Business-generation tests do not certify native storage or SDK-internal ordering. This does not claim global provider logout.
2. **Read and establish accounts:** ordinary GET, first establishment without usable email, explicit login with provider failure, missing-age retry, linked methods and same-email distinct principals. **Expected:** GET neither creates nor contacts Auth0; missing first email blocks creation; known email/age survive failure; only age-dependent actions wait for unknown age.
3. **Switch A → B and A → guest → A** while queries, photo preparation and entitlement callbacks are delayed. **Expected:** no prior-session result or unaccepted action enters the new session. Different-owner, visitor, expired/wrong-client/environment and collector credentials cannot perform owner operations.
4. **Fail push disassociation on logout, then reassociate B.** **Expected:** local logout succeeds without durable retry; delayed A removal cannot remove B. Any still-delivered A system push cannot expose A's private inbox under guest/B.

## Native photo and shared control

Select large, rotated and transparent assets, including supported source formats needing conversion; crop, cancel, fail preparation and save. **Expected:** the library original remains unchanged; prepared output is square, not enlarged, at most 1024 pixels per side and 5 MiB. Qualify the documented iOS large-image crop limitation.

Apply [F13 accessibility checks](../003-shared-quality/quickstart.md#native-mobile-and-approved-design) to the common image control, including native permission denial, 320-point layout and both themes. **Expected:** profile, sporting and support fields share selection/replacement/removal behavior while retaining owner-specific limits and removal meaning. The prototype omits native picker/crop UI and cannot qualify it.

## Erasure and return

Qualify the ordinary profile-to-erasure screen with the unchanged consequences, checkbox, plain store-billing notice and actions. Cancel/back has no deletion effect; large text and native navigation keep all content reachable. Use the revised [design evidence](spec.md#design-evidence), not the former sheet captures. Hosted Auth0 login remains provider-owned; fictitious design handoff text does not qualify its actual browser return, cancellation or session behavior.

1. **Fail the local transaction and race personal writes with deletion.** **Expected:** rollback preserves the account/session and starts no external deletion; committed deletion removes the profile/photo/associations together and preserves unowned content and moderation. No writer recreates personal data for the absent original UUID.
2. **Fail each provider call or its target lookup after local commit.** **Expected:** other known targets are attempted once, business data stays deleted and 204 leads directly to guest home. Private diagnostics support manual repair without a pending record, polling or replay. A process stop between commit and logging demonstrates the accepted unreported-cleanup gap.
3. **Lose the DELETE response and reread the original UUID.** **Expected:** ordinary reads resolve presence/absence without replay; unavailable reads permit local sign-out with an ordinary error and no false confirmation. Repeating DELETE for the absent original returns 404 without provider calls or effects on a replacement account.
4. **Register again after successful and failed provider cleanup.** **Expected:** new business UUID with no old data/grants/gifts; actual current Auth0 date, including an unchanged date after failed identity removal. RevenueCat asynchronous success needs no polling. Check second-device SDK behavior, ordinary overlap errors/manual assistance and the accepted same-subject token limit in [FR-035](spec.md#deletion-and-return), without assuming immediate global revocation.
5. **Inspect synthetic cleanup failures and the native alert.** **Expected:** only authorized original-target references in private 14-day logs; no email, profile, photo, credentials or raw payloads, and no personal references in Discord. Verify safe manual targeting and existing private support handling for an unresolved case beyond retention. Alert closure alone does not prove repair.

## Integration with other owners

- **F09 purchases:** restore a valid qualification purchase after business deletion on each original store. Verify current-account assignment without old data/gifts; use [F09 qualification](../006-pro-subscriptions/spec.md#success-criteria) for receipt-wide transfer and assisted exceptions.
- **F14 continuity:** supply the necessary historical customer references and valid-gift evidence to the [transition qualification](../014-v1-v2-transition/spec.md#success-criteria). Native restoration does not prove population coverage or erase old customer records.
- **F10/F11 private requests:** exercise the existing public privacy-page route under [FR-037–FR-038](spec.md#deletion-and-return); ownership verification precedes erasure and outcome communication remains truthful. Inspect diagnostics against the scoped F05/F11 exception and all remaining exclusions.
- **F13 restoration:** include deleted business accounts and known outstanding provider cleanup in the [isolated restore qualification](../003-shared-quality/quickstart.md#initial-restore-and-activation-condition); current erasure, rights and expiry apply before affected access or push resumes.
