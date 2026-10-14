# Implementation Plan: Pro entitlements and subscription continuity

**Branch**: `tech/48-pro-entitlements-plan` | **Date**: 2026-10-14 | **Spec**: [F09](spec.md)

**Input**: [#48](https://github.com/blockoutproject/blockout/issues/48), the approved [F13 foundation](../003-shared-quality/plan.md), [F05 account lifecycle](../005-accounts-identity/plan.md) and [F11 advertising](../004-advertising-privacy-legal/plan.md).

**Status**: Draft pending the guest Pro invitation's prototype approval, Figma reconciliation and separate Figma approval. The agreed technical decisions below authorize no production implementation or provider configuration.

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

| Principle                    | Evaluation                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification-led intent | Guest entry and V2 offer presentation are integrated into F09. F14 records the absence of V1 gifts without weakening continuity for categories actually present. |
| II — Domain integrity        | F05 owns identity/erasure, F09 Pro consumption, F10 assistance, F11 advertising/privacy and F14 continuity. No new ownership or service boundary.                |
| III — Approved design        | Existing scoped approvals remain applicable. The new guest invitation is pending prototype and Figma approvals; finalization is blocked until both are recorded. |
| IV — Contract first          | [Contracts](contracts/README.md) define SDK and consumer agreements. No new HTTP operation or editable copy of the canonical API is needed.                      |
| V — Simplicity               | Native SDK state/UI and manual intervention satisfy the agreed need. [Research](research.md) explains alternatives and evidence limits.                          |

The [existing scoped approval](https://github.com/blockoutproject/blockout/issues/34#issuecomment-6021179909) and [Pro journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5258-5951) remain references for unchanged scope. The scoped reconciliation is allowed by principle III while independent planning proceeds. It is not a waiver of either design approval. Recheck this table after reconciliation before reporting the dossier complete.

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

Use F05's current UUID and transient session generation to scope reads, listeners and completion callbacks. On account change, invalidate the previous local view, remove its Pro styling, close its provider UI and ignore late results. Await successful current-account association before presenting purchasing/restoration controls. Failed association leaves Pro unavailable for that account without blocking public sport. Do not cancel or infer cancellation of a store transaction from a session transition.

Consume `CustomerInfo.entitlements.active["Blockout Pro"]` and the SDK's known state. Register and remove the standard update listener with its owner. Request current information at ordinary integration points such as entry/foreground, explicit retry and completed operations; let the SDK decide caching and refresh. The listener is not a server push channel. There is no timer, force-refresh loop, independent expiration calculation or persistence of a derived entitlement.

## Entitlement and operation presentation

The [data model](data-model.md) separates current entitlement from operation outcome. Active rights suppress Blockout ads and enable existing subtle Pro chrome. SDK-inactive state permits F11 to decide advertising. No usable current-account state suppresses ads and purchase invitations, with retry/support in the Pro context. Never infer inactivity from a failed network request.

Use native callbacks/errors for cancellation, payment pending, definite failure and completed purchase/restoration. Confirmation requires an active entitlement for the current account. A successful restore without it is not Pro activation. An uncertain or paid-but-unverified outcome offers verification, restoration where appropriate and support, without blindly repeating payment. These presentation states are transient; after restart, re-establish native SDK/store state rather than maintain a second transaction journal. Native SDK/store recovery remains provider-owned.

## Entry, offers and assistance

The guest entry reuses F05's invitation artwork, sheet and controls with short Pro copy. No guest offer lookup or price is required. Sign-in closes the invitation and takes the ordinary account route; it does not reopen Pro or preserve an intended purchase. Closing the invitation preserves its originating context.

For a usable signed-in account, present the official paywall when SDK state establishes inactivity. Select a separate V2 offering explicitly, reusing the current products and `Blockout Pro` entitlement, so its ad-free-only copy does not alter the V1 presentation. Prices, periods and applicable terms come from the store/provider. Missing or unavailable offers use the existing failure presentation with explicit retry and assistance, without an invented price.

Use official `RevenueCatUI.CustomerCenterView` within the existing dismissible presentation for account management/restoration, including access independent of purchasing. A narrow wrapper owns closing and the native Custom Action callback to close Pro before navigating to the existing F10 form. It does not rebuild Customer Center. Keep ordinary store management, restoration and assistance; do not configure retention questionnaires/offers. Paid/gifted/unavailable cases remain distinguishable; actual native rendering is a release qualification.

No receipts, complete SDK objects or customer payloads are automatically attached to support. Operator verification and private records follow F10/F11. Unsupported cross-store restoration uses that process without forced repurchase, identity merging or an automatic gift.

## Environments and continuity

Keep the existing RevenueCat project and native `Sandbox testing access: Anybody`. Use dedicated test accounts with Test Store for development and routine preproduction; qualify real Apple/Google sandbox purchases with the corresponding platform keys before release. Test Store keys never enter production candidates. A project can hold sandbox and production receipts for the same customer: these are not isolated identity namespaces. F05's original-target and test-account restrictions remain necessary for destructive cleanup.

The current account makes Customer Center available; pricing eligibility is a time-bounded observation, not a permanent free-service guarantee. Select no new RevenueCat subscription as part of this task.

F14 retains historical associations and original references needed for explicit restore and scoped erasure. Creating the V2 UUID or signing in is not customer deletion. Accept native receipt-wide transfer; never merge Blockout profiles. The owner confirms there are no V1 gifts: verify that premise at cutover without designing a gift-migration engine. Future V2 gifts use supported owner console grant/change/revoke operations, independently of billing.

F05's local-first deletion and bounded provider attempts remain unchanged. Failure uses private diagnostics and manual repair; no rollback or pending account. Deletion does not cancel store billing. Restoration on a fresh UUID can recover paid rights, never deleted personal data or gifts.

## Verification and completion boundary

[Research](research.md) records official documentation, source inspection and bounded console observations. [Quickstart](quickstart.md) defines future integrated qualifications. No native build, purchase, restoration, gift rendering or account-switch transaction has been qualified here.

Finalize only after the guest prototype and corresponding Figma revision are explicitly approved, then run repository documentary checks and review the owning/consumer consistency. Deliver specifications and native artifacts together through a draft PR to `develop`. Do not generate tasks, configure providers, implement the product, merge or close #48 automatically.
