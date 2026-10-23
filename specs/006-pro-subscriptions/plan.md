# Implementation Plan: Pro entitlements and subscription continuity

**Branch**: `tech/48-pro-entitlements-plan` | **Date**: 2026-10-14 | **Spec**: [F09](spec.md)

**Input**: [spec.md](spec.md), [F13 foundation](../003-shared-quality/plan.md), [F05 account lifecycle](../005-accounts-identity/plan.md) and [F11 advertising](../004-advertising-privacy-legal/plan.md).

**Status**: Prepared for PR review. The guest-entry prototype and Figma translation are explicitly approved; see [design evidence](spec.md#assumptions-and-dependencies). This dossier authorizes no production implementation or provider configuration.

## Summary

Use RevenueCat's native SDK state, Paywalls and Customer Center for the existing ad-free Pro benefit. Associate the SDK with the usable F05 business UUID and reuse its in-memory session generation to reject obsolete callbacks. Guests receive the shared sign-in invitation without prices or a retained purchase intent. Paid continuity uses native restoration and verified manual assistance; gifts remain console operations.

No Pro HTTP endpoint, backend rights mirror, gift ledger, webhook, polling, persisted operation journal or automated recovery service is introduced.

## Technical Context

**Language/Version**: TypeScript with Expo SDK 57, React Native 0.86 and React 19.2.3, under [F13](../003-shared-quality/plan.md#technical-context).

**Primary Dependencies**: Paired `react-native-purchases` and `react-native-purchases-ui` 10.13.0, with their bundled native dependencies; existing account/navigation and F11 integrations. No direct override of the bundled native versions.

**Storage**: RevenueCat's native cache; current-account entitlement and operation presentation in memory. F05 owns PostgreSQL account/customer references. No new table, Liquibase change or persistent mobile business state.

**Testing**: Existing Jest Expo / React Native Testing Library approach, plus physical iOS and Android tests with native development/store candidates. Test Store is useful for routine development but does not qualify either platform's billing.

**Target Platform**: Native iOS/Android under F13; iOS minimum 16.4. No Expo Go qualification.

**Project Type**: Mobile feature within the shared workspace; existing backend account cleanup remains F05-owned.

**Performance Goals**: No new performance, capacity, load or monthly-availability programme. Sporting consultation never waits for Pro verification.

**Constraints**: Existing RevenueCat project and products, business UUID identity rather than email, same native customer semantics across devices, explicit store actions, no new tier or custom refresh/grace period. No provider configuration is performed by this dossier.

**Scale/Scope**: Ad-free rights, provider UI, account isolation, native purchase/restore, private manual assistance and owner-only gifts. F14 owns cutover qualification.

## Constitution Check

| Principle                    | Evaluation                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification-led intent | Guest entry and V2 offer presentation are integrated into F09. F14 records the absence of V1 gifts without weakening continuity for categories actually present.  |
| II — Domain integrity        | F05 owns identity/erasure, F09 Pro consumption, F10 assistance, F11 advertising/privacy and F14 continuity. No new ownership or service boundary.                 |
| III — Approved design        | Existing scoped approvals remain applicable. Prototype `6858562` and its Figma translation are explicitly approved for the shared invitation and guest Pro entry. |
| IV — Contract first          | [Contracts](contracts/README.md) define SDK and consumer agreements. No new HTTP operation or editable copy of the canonical API is needed.                       |
| V — Simplicity               | Native SDK state/UI and manual intervention satisfy the agreed need. [Research](research.md) explains alternatives and evidence limits.                           |

The [existing scoped approval](https://github.com/blockoutproject/blockout/issues/34#issuecomment-6021179909) and [Pro journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5258-5951) remain references for unchanged scope. The [scoped reconciliation approval](https://github.com/blockoutproject/blockout/issues/48#issuecomment-6178680728) covers the shared invitation and guest Pro entry. These approvals do not qualify native authentication or billing.

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

Planned locations, not initialized here:

```text
apps/mobile/src/features/pro/      # SDK state, provider presentation and account-safe callbacks
apps/mobile/src/features/account/  # existing F05 identity/session and shared guest invitation
```

**Structure Decision**: Keep Pro responsibilities in one feature with a narrow state interface to advertising and app chrome. Reuse account/session and navigation owners. No generic billing abstraction, alternate provider implementation or new backend module is justified.

## Identity and SDK lifecycle

Configure the native SDK once after F05 supplies a usable business UUID. On a later known-account switch, use native `logIn` for the new UUID; on logout use native `logOut`. Its resulting anonymous customer is SDK state only: guests neither consume those entitlements nor purchase/restore. Re-entry establishes the current usable account before any Pro operation.

The existing Pro owner waits for each native identity call to settle before starting another. On a session change, immediately clear previous rights/styling and close provider UI; F05 logout and the rest of Blockout do not wait for RevenueCat. If an identity call is already running, let it finish, then apply the current account or guest target, skipping superseded intermediate targets. Keep only the current desired session and the in-flight call in memory, with no persistent queue, session registry or recovery service. A failed association for the current target leaves Pro unavailable until the existing explicit retry; no automatic retry loop is added.

Use F05's current UUID and transient session generation to scope reads and completion callbacks, including a return to the same UUID after logout. Publish rights and enable purchase/restoration only after successful association for that session. Ignoring an old promise result alone does not prevent its native identity mutation; the sequential calls above establish that boundary. A session change does not cancel, or imply cancellation of, a store transaction.

Consume `CustomerInfo.entitlements.active["Blockout Pro"]` and the SDK's known state. Register and remove the standard update listener with its owner. Its payload carries no F05 session attribution: use it only as a signal to read current native `CustomerInfo` after association, accepting the result only while that session remains current. Events during association need no replay because successful association reads current state. Request current information at ordinary integration points such as entry/foreground, explicit retry and completed operations; let the SDK decide caching and refresh. The listener is not a server push channel. There is no timer, forced network refresh, independent expiration calculation or persistence of a derived entitlement.

## Entitlement and operation presentation

The [data model](data-model.md) separates current entitlement from operation outcome. Active rights suppress Blockout ads and enable existing subtle Pro chrome. SDK-inactive state permits F11 to decide advertising. No usable current-account state suppresses ads and purchase invitations, with retry/support in the Pro context. Never infer inactivity from a failed network request.

Expose current eligible/ineligible presentation to [F13 shared UI](../003-shared-quality/plan.md#tokens-and-appearance) without a second entitlement cache. Subtle Pro accents apply only to the current active account; guest, inactive, unknown and old-session states supply none. System appearance and sporting context remain independent. Extend the existing session/entitlement tests and native qualification to verify accent removal and both appearances; provider-owned Paywall/Customer Center remain under the presentation boundaries below.

Use native callbacks/errors for cancellation, payment pending, definite failure and completed purchase/restoration. Confirmation requires an active entitlement for the current account. A successful restore without it is not Pro activation. An uncertain or paid-but-unverified outcome offers verification, restoration where appropriate and support, without blindly repeating payment. These presentation states are transient; after restart, re-establish native SDK/store state rather than maintain a second transaction journal. Native SDK/store recovery remains provider-owned.

## Entry, offers and assistance

The guest entry reuses F05's invitation artwork, sheet and controls with short Pro copy. No guest offer lookup or price is required. Sign-in closes the invitation and takes the ordinary account route; it does not reopen Pro or preserve an intended purchase. Closing the invitation preserves its originating context.

For a usable signed-in account, a thin Expo Router `fullScreenModal` route with `headerShown: false` hosts only official `RevenueCatUI.Paywall` when SDK state establishes inactivity. Its `onDismiss` removes that route; account changes immediately unmount its content without inferring cancellation of a store transaction. Use the component’s ordinary `flex: 1` sizing, with no Blockout page/chrome, Sheet, nested scroll container or provider-content mock at runtime. Select a separate V2 offering explicitly through its `offering` option, reusing the current products and `Blockout Pro` entitlement, so its ad-free-only copy does not alter the V1 presentation. Prices, periods and applicable terms come from the store/provider. [F14](../014-v1-v2-transition/plan.md#subscription-price-and-provider-configuration) coordinates the accepted 1.99 EUR monthly launch price on the existing products, including existing subscriber cohorts; this UI never substitutes a fixed price for the native offer. Missing or unavailable offers use the existing failure presentation with explicit retry and assistance, without an invented price.

Use official `RevenueCatUI.CustomerCenterView` alone in the same native route host for account management/restoration, including access independent of purchasing. The route handles only dismissal, old-session removal and the recognized Custom Action handoff that removes Pro before opening the existing F10 form. Reuse the F05 generation to reject obsolete callbacks. These two lifecycle needs justify the component host: the installed SDK exposes no public dismiss method for imperative paywall/Customer Center presentation, and Custom Actions do not automatically close it; see [versioned research](research.md#native-sdk-and-provider-ui). Keep ordinary store management, restoration and assistance; do not configure retention questionnaires/offers. Paid/gifted/unavailable cases remain distinguishable. Controlled tests exercise Blockout navigation and unmounting, while actual provider controls, store operations and accessibility require separate native F09 qualification.

Configure the native management and no-active-purchase paths with restoration and the F10 Custom Action where supported. Leave the Customer Center purchase offering unset: purchasing uses the explicitly selected V2 paywall, never an implicit `current` offering from another entry. Disable the built-in Contact Support action and in-app tickets so they do not create a second support channel. Qualify shared configuration changes against V1 during coexistence before publishing them. If Customer Center cannot load, the person can close it and use the existing F10 entry from the profile; assistance does not depend on RevenueCat availability. No custom provider error screen is added.

Prototype/Figma contain only fictitious text identifying the RevenueCat handoff; no offer, purchase, restoration or provider error UI is drawn. Updated captures are tracked by [F13 presentation evidence](../003-shared-quality/quickstart.md#native-mobile-and-approved-design). Those mocks establish navigation intent, not provider or store acceptance.

No receipts, complete SDK objects or customer payloads are automatically attached to support. Operator verification and private records follow F10/F11. Unsupported cross-store restoration uses that process without forced repurchase, identity merging or an automatic gift.

## Environments and continuity

Keep the existing RevenueCat project and native `Sandbox testing access: Anybody`. Use dedicated test accounts with Test Store for development and routine preproduction; qualify real Apple/Google sandbox purchases with the corresponding platform keys before release. Test Store keys never enter production candidates. A project can hold sandbox and production receipts for the same customer: these are not isolated identity namespaces. F05's original-target and test-account restrictions remain necessary for destructive cleanup.

The current account makes Customer Center available; pricing eligibility is a time-bounded observation, not a permanent free-service guarantee. Select no new RevenueCat subscription as part of this task.

F14 retains historical associations and original references needed for explicit restore and scoped erasure. Creating the V2 UUID or signing in is not customer deletion. Accept native receipt-wide transfer; never merge Blockout profiles. The owner confirms there are no V1 gifts: verify that premise at cutover without designing a gift-migration engine. Future V2 gifts use supported owner console grant/change/revoke operations, independently of billing.

F05's local-first deletion and bounded provider attempts remain unchanged. Failure uses private diagnostics and manual repair; no rollback or pending account. Deletion does not cancel store billing. Restoration on a fresh UUID can recover paid rights, never deleted personal data or gifts.

## Verification and completion boundary

[Research](research.md) records official documentation, source inspection and bounded console observations. [Quickstart](quickstart.md) defines future integrated qualifications. No native build, purchase, restoration, gift rendering or account-switch transaction has been qualified here.

The scoped prototype and Figma approvals are recorded in the specification. Check specifications and native planning artifacts together for documentary consistency and owner/consumer coverage. Publication follows [repository delivery policy](../../AGENTS.md#git-delivery); these artifacts establish no provider or runtime qualification.
