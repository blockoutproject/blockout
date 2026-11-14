# Implementation Plan: Pro entitlements and subscription continuity

**Branch**: `tech/48-pro-entitlements-plan` | **Date**: 2026-10-14 | **Spec**: [F09](spec.md)

**Input**: [spec.md](spec.md), [F13 foundation](../003-shared-quality/plan.md), [F05 account lifecycle](../005-accounts-identity/plan.md) and [F11 advertising](../004-advertising-privacy-legal/plan.md).

**Status**: Approved technical plan; [tasks](tasks.md) track implementation and qualification. The approved guest-entry and Account presentation constraints are defined in the [specification](spec.md#assumptions-and-dependencies).

## Summary

Use RevenueCat's native SDK state, Paywalls and Customer Center for the existing ad-free Pro benefit. Associate the SDK with the usable F05 business UUID and consume its native principal and private React/Query lifetime for account isolation. Guests receive the shared sign-in invitation without prices or a retained purchase intent. Paid continuity uses native restoration and verified manual assistance; gifts remain console operations.

No Pro HTTP endpoint, backend rights mirror, gift ledger, webhook, polling, persisted operation journal or automated recovery service is introduced.

## Technical Context

**Language/Version**: TypeScript with Expo SDK 58, React Native 0.88 and React 19.3.0, under [F13](../003-shared-quality/plan.md#technical-context).

**Primary Dependencies**: Paired `react-native-purchases` and `react-native-purchases-ui` 10.13.0, with their bundled native dependencies; existing account/navigation and F11 integrations. No direct override of the bundled native versions.

**Storage**: RevenueCat's native cache; current-account entitlement and operation presentation in memory. F05 owns PostgreSQL account/customer references. No new table, Liquibase change or persistent mobile business state.

**Testing**: Existing Jest Expo / React Native Testing Library approach for deterministic state/session variants, representative compatible native iOS/Android clients under F13 FR-029 and focused actual SDK/store observations. Physical devices and exact production-identity candidates remain required at their store/release boundaries. Test Store is useful for routine development but does not qualify either platform's billing.

**Target Platform**: Native iOS/Android under F13; iOS minimum 16.4. No Expo Go qualification.

**Project Type**: Mobile feature within the shared workspace; existing backend account cleanup remains F05-owned.

**Performance Goals**: No new performance, capacity, load or monthly-availability programme. Sporting consultation never waits for Pro verification.

**Constraints**: Existing RevenueCat project and products, business UUID identity rather than email, same native customer semantics across devices, explicit store actions, no new tier or custom refresh/grace period. No provider configuration is performed by this dossier.

**Scale/Scope**: Ad-free rights, provider UI, account isolation, native purchase/restore, private manual assistance and owner-only gifts. F14 owns cutover qualification.

## Constitution Check

| Principle                    | Evaluation                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification-led intent | Guest entry and shared provider presentation are integrated into F09. F14 records the absence of V1 gifts without weakening continuity for categories actually present. |
| II — Domain integrity        | F05 owns identity/erasure, F09 Pro consumption, F10 assistance, F11 advertising/privacy and F14 continuity. No new ownership or service boundary.                       |
| III — Approved design        | Existing scoped approvals remain applicable. The approved prototype and its Figma translation are explicitly approved for the shared invitation and guest Pro entry.    |
| IV — Contract first          | [Contracts](contracts/README.md) define SDK and consumer agreements. No new HTTP operation or editable copy of the canonical API is needed.                             |
| V — Simplicity               | Native SDK state/UI and manual intervention satisfy the agreed need. [Research](research.md) explains alternatives and evidence limits.                                 |

The [existing scoped approval](spec.md#assumptions-and-dependencies) and [Pro journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5258-5951) remain references for unchanged scope. The [shared-invitation reconciliation](spec.md#assumptions-and-dependencies) covers the shared invitation and guest Pro entry. These approvals do not qualify native authentication or billing.

## Project Structure

### Documentation (this feature)

```text
specs/006-pro-subscriptions/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/README.md
└── quickstart.md
```

### Source Code (repository root)

Feature locations:

```text
apps/mobile/src/features/pro/      # SDK state, provider presentation and account-safe callbacks
apps/mobile/src/features/account/  # existing F05 identity/session and shared guest invitation
```

**Structure Decision**: Keep Pro responsibilities in one feature with a narrow state interface to advertising and app chrome. Reuse account/session and navigation owners. No generic billing abstraction, alternate provider implementation or new backend module is justified.

## Identity and SDK lifecycle

Configure the native SDK once after F05 supplies a usable business UUID. On a later known-account switch, use native `logIn` for the new UUID; on logout use native `logOut`. Its resulting anonymous customer is SDK state only: guests neither consume those entitlements nor purchase/restore. Re-entry establishes the current usable account before any Pro operation.

The existing Pro owner waits for each native identity call to settle before starting another. On a native identity transition or pending F05 credential action, clear previous rights/styling and close provider UI; F05 does not wait for RevenueCat. Browser logout navigates to guest only after the SDK succeeds; cancellation/failure preserves the signed-in account with safe feedback. If an identity call is already running, let it finish, then apply the current account or guest target, skipping superseded intermediate targets. Keep only the current desired session and the in-flight call in memory, with no persistent queue, session registry or recovery service. A failed association for the current target leaves Pro unavailable until a later explicit entry retries it; no automatic retry loop is added.

Use F05's native Auth0 subject and current business UUID to attribute SDK reads and completion callbacks. React replaces the private account subtree when the native principal changes; no generic client epoch is retained. Publish rights and admit the paywall only after successful association for that session; current rights do not select a different provider surface. Ignoring an old promise result alone does not prevent its native identity mutation; the sequential calls above establish that boundary. A session change does not cancel, or imply cancellation of, a store transaction.

Consume `CustomerInfo.entitlements.active["Blockout Pro"]` and the SDK's known state. Register and remove the standard update listener with its owner. Its payload carries no F05 session attribution: use it only as a signal to read current native `CustomerInfo` after association, accepting the result only while that session remains current. Events during association need no replay because successful association supplies or reads current state. Accept current logIn and completed purchase/restore CustomerInfo directly, atomically clearing any older read token and verification failure; supplied outcomes require no immediate second read. First configuration without information and operations without supplied information retain the ordinary read. Keep ordinary foreground/listener reads and association retry at explicit entry; let the SDK decide caching and refresh. The listener is not a server push channel. There is no timer, forced network refresh, independent expiration calculation or persistence of a derived entitlement.

## Entitlement and operation presentation

The [data model](data-model.md) separates current entitlement from native operation facts. SDK-active rights suppress Blockout ads and select existing restrained Pro chrome; inactive rights delegate advertising eligibility to F11. No usable current state suppresses ads and the automatic Pro banner without inventing inactive rights or an app verification destination. Never derive inactivity from a transport failure.

Expose current membership to [F13 shared UI](../003-shared-quality/plan.md#tokens-and-appearance) through the existing narrow boundary, with no entitlement Query, second cache or custom expiry clock. Preserve the SDK listener, foreground reads and current supplied CustomerInfo acceptance under the sequential identity owner. An obsolete principal, business UUID or private lifetime cannot publish current rights.

The official Paywall owns purchase/restoration controls and native in-flight concurrency. Its callback outcomes distinguish cancellation, SDK-pending payment, ordinary failure, payment confirmation and entitlement activation. Accept supplied current CustomerInfo without a duplicate read. Announce activation only with active current-account rights; a resolved restore without active rights is not activation. Native pending/confirmed payment facts authorize no automatic Blockout replay; explicit native controls and their standard SDK/store behavior remain authoritative. Ordinary purchase/restore errors keep SDK-owned native feedback without duplicate Blockout toasts and permit another explicit SDK action, without an app Verify state, uncertainty lock or refresh-before-action requirement. An error proves neither a charge nor its absence. Independent gifts remain independent of payment facts.

The Modal lifetime controls presentation and feedback, not the native transaction. Closing or account departure unmounts it without creating cancellation or transfer. A disposed provider view need not callback: no global purchasing/restoring reservation waits for it. The surviving process-level SDK owner, listener and foreground reads continue to establish current rights. Queued results are accepted only for their current owner; retired view callbacks cannot reopen presentation, navigate or show old-account feedback.

## Entry, offers and assistance

The guest entry keeps the shared F05 invitation, artwork and Pro copy. It performs no offering lookup, shows no price and saves no purchase intent. Dismissal preserves its source; sign-in follows ordinary F05 navigation without reopening Pro.

Existing connected Profile and banner entries call the same Pro owner directly. Preserve banner visibility: a current usable SDK-inactive account with no unresolved purchase facts receives one banner above an already visible tab bar, while guests, active/gifted, unknown and pending/confirmed-unactivated cases receive none. [Pattern / Pro Offer 5116:12765](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5116-12765) and [Search instance 5137:73188](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5137-73188) remain composition references, including the transparent outer group and eight-point gap. [F13 FR-039](../003-shared-quality/spec.md#functional-requirements) owns route coverage, group visibility and one measured bottom reservation; this feature creates no separate visibility store or new banner placement.

For every explicit connected entry, establish the useful current usable-account/SDK association prerequisite and resolve the configured `offeringIdentifier` through the installed public SDK to a real offering. Use the existing V1 identifier `default` explicitly through `REVENUECAT_OFFERING_ID`, resolving the same published `Blockout Pro` Paywall with the existing project, products, entitlement and platform keys: no implicit `current`, cached catalogue admission, Query adapter, HTTP endpoint or fixed price. A missing offering or rejected pre-presentation association/resolution gives brief source feedback and allows a later explicit entry. After mounting, native loading/error/return behavior remains SDK-owned; no app callback or translation layer is invented for an error the public component does not expose. There is no commercial route, loading/catalogue/error page, Page/Header, recovery card or intermediate Open/Restore/Manage button.

The existing Pro provider owns a standard React Native `Modal` whose only child is official `RevenueCatUI.Paywall`, with ordinary `flex: 1` sizing and the explicit `offering` option. Use this same component for free, paid, gifted and unknown-rights accounts after association; do not call `presentPaywallIfNeeded` or select a direct active-account Customer Center branch. Native dismissal/hardware back closes the Modal and reveals its unchanged source. Logout, accepted erasure and account replacement remove the host immediately. No nested Blockout scroll, Sheet, custom provider UI or transaction recovery controller is added.

Configure useful supported restoration, subscription management/Customer Center and assistance actions inside the standard paywall journey. Remove the application `restorePurchases()` fallback and standalone `CustomerCenterView` entry. Paywall restore callbacks consume the provider’s result; they never invoke a second restore. Retain receipt-wide association in SDK behavior/private assistance guidance, independent gifts and original-store limits; add no app dialog or management redirect for limited native copy/actions. [F14](../014-v1-v2-transition/plan.md#subscription-price-and-provider-configuration) owns accepted launch pricing, cohort activation and continuity; native prices/terms remain provider values.

[Research](research.md#native-sdk-and-provider-ui) records installed public APIs and their real limits. Adapt this same shared paywall for the V2 ad-free-only journey; do not create another offering or Paywall. The current 2.99 EUR reference is not lowered during configuration: F14 coordinates the 1.99 EUR cutover through the stores under separate authorization. Configuration and action capabilities are qualified under T026, with their consuming native observations at T027/T034; configuration work and consumer qualification share valid evidence without waiting for each other’s issue closure. Observe what an already subscribed/gifted customer actually sees and what the standard original-store/assistance actions do. A generic Buy control may remain visible for active customers; the Paywall does not forward Customer Center Custom Actions to the app. These native presentation/action limits are accepted and reported, without an application purchase interceptor, hidden/disabled provider control, extra verification or substitute journey. This plan authorizes no provider/production change.

Use the standard configured assistance action where supported and transmit no receipt, CustomerInfo, customer identifier or raw SDK error automatically. Do not promise an authenticated F10 handoff through an absent Paywall callback or add URL interception/navigation to emulate it. The existing independent Profile support entry remains usable after provider opening failure. The missing Paywall Custom Action callback and any provider error/return behavior remain accepted native limits; do not emulate them. No second support form/channel, retention questionnaire or retention offer is introduced.

Prototype and Figma retain only the fictitious text placeholder for provider-owned content. Existing guest invitation, Profile and banner compositions keep their scoped approvals; the current native provider journey requires actual observation and establishes no wider design approval. Any later material Blockout composition change follows the constitution’s applicable prototype and separate Figma gates.

## Environments and continuity

Keep the existing RevenueCat project and native `Sandbox testing access: Anybody`. Use dedicated test accounts with Test Store for development and routine preproduction; qualify real Apple/Google sandbox purchases with the corresponding platform keys before release. Test Store keys never enter production candidates. A project can hold sandbox and production receipts for the same customer: these are not isolated identity namespaces. F05's original-target and test-account restrictions remain necessary for destructive cleanup.

The existing provider configuration determines Customer Center availability within the paywall journey; pricing eligibility is a time-bounded observation, not a permanent free-service guarantee. Use the existing RevenueCat subscription.

F14 retains historical associations and original references needed for explicit restore and scoped erasure. Creating the V2 UUID or signing in is not customer deletion. Accept native receipt-wide transfer; never merge Blockout profiles. The owner confirms there are no V1 gifts: verify that premise at cutover without designing a gift-migration engine. Future V2 gifts use supported owner console grant/change/revoke operations, independently of billing.

F05's local-first deletion and bounded provider attempts remain unchanged. Failure uses private diagnostics and manual repair; no rollback or pending account. Deletion does not cancel store billing. Restoration on a fresh UUID can recover paid rights, never deleted personal data or gifts.

## Verification and completion boundary

[Research](research.md) explains the selected native APIs and alternatives. [Quickstart](quickstart.md) defines integrated validation scenarios, prerequisites and expected outcomes under [F13's proportionate qualification](../003-shared-quality/plan.md#proportionate-qualification).

The existing offering test supplies a different `current` and proves explicit `default` selection. Review the complete retained territory/product/cohort/terms configuration and observe the same configured published `Blockout Pro` Paywall once per native platform; no qualification changes `current` solely to replay selection. Choose native price/period/trial/renewal formats from actual configured differences, beginning with French EUR and adding contrasting configured formats only where needed. F14 retains complete pricing/cohort preparation, activation and actual billing/renewal evidence; representative rendering cannot replace it.

Review the supported gift procedure and beneficiary checks once, preserving private before/after rights and billing checks and reread-before-repeat on uncertainty. Use focused gift/validity/coexistence reflection through each native SDK, deterministic application error/unknown/expired/gift variants and reusable T034 transfer/erasure evidence. Do not systematically inject provider-console failures or repeat every console operation on each platform.

Reuse deterministic stale read/listener/operation tests for response ordering and session isolation. Native observations retain ordinary account departure/return, process-wide SDK identity ordering/storage, cache/refresh and actual pending-transaction effects. App-owned active/neutral compositions cover both themes, a live transition, narrow/enlarged text and ordinary accessibility semantics across representative cases; no state × appearance × font × OS campaign or dedicated screen-reader campaign is required. Readability, scrolling, dismissal and actual restoration/management/assistance actions inside the native paywall journey remain separate from Blockout design comparison.

Reuse unchanged F05/F11/F13 and native evidence only for the mechanism, configuration and build boundary it demonstrates. Controlled tests establish no actual purchase, restoration, configured offering, gift or account-switch transaction. Missing SDK/provider/configuration/store observations remain in T012/T018/T026/T027/T034/T038/T042 and their owning issues; a qualification amendment does not complete them. No new implementation follows from removing a redundant manual case without an observed code gap.

The scoped prototype and Figma approvals for unchanged Blockout compositions are recorded in the specification. Check specifications and native planning artifacts together for documentary consistency and owner/consumer coverage. These artifacts establish no provider or runtime qualification.
