# Research: Pro entitlements and subscription continuity

## Native SDK and provider UI

**Decision**: Use paired `react-native-purchases` / `react-native-purchases-ui` 10.13.0 with their bundled iOS 5.95.0, Android 10.27.0 and hybrid-common 19.11.0 dependencies. Embed official `RevenueCatUI.Paywall` and `RevenueCatUI.CustomerCenterView` in the app-controlled sheet; use their dismissal callbacks and unmount on account changes. Customer Center's Custom Action closes Pro before opening F10; the ordinary profile support entry remains available after a provider UI failure.

**Rationale**: The [release](https://github.com/RevenueCat/react-native-purchases/releases/tag/10.13.0) and [versioned UI source](https://github.com/RevenueCat/react-native-purchases/blob/10.13.0/react-native-purchases-ui/src/index.tsx) expose the components, purchase/restore callbacks, `onDismiss` and `onCustomActionSelected`. The [paywall guide](https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls) documents the embedded component, explicit offering selection and app-owned removal of the view. Declared React Native/React minima fit F13; compilation against the selected Expo stack remains unexecuted. The React Native guide emphasizes `presentCustomerCenter`, while the published source also documents the embedded component needed to coordinate dismissal and navigation.

**Alternatives considered**: A custom paywall/management screen duplicates provider behavior. Uncontrolled presentation complicates the F10 handoff. A small wrapper around the official component supplies that actual responsibility without replacing provider content. A generic billing adapter or native-version override has no current benefit.

Customer Center's [no-subscription offering lookup](https://github.com/RevenueCat/purchases-ios/blob/5.95.0/RevenueCatUI/CustomerCenter/ViewModels/NoSubscriptionsCardViewModel.swift) can use `current` or a specific offering; an unset offering avoids a second purchase entry and accidental V1 presentation. Its [error view](https://github.com/RevenueCat/purchases-ios/blob/5.95.0/RevenueCatUI/Views/ErrorView.swift) supplies no F10 action. Native configuration plus the existing profile support entry covers these boundaries without recreating provider content. The separate V2 offering does not isolate shared Customer Center configuration from V1; coexistence must be checked before publishing those settings.

**Evidence limits**: [Customer Center configuration](https://www.revenuecat.com/docs/tools/customer-center/customer-center-configuration) documents custom actions and optional retention flows. Published [iOS purchase information](https://github.com/RevenueCat/purchases-ios/blob/5.95.0/RevenueCatUI/CustomerCenter/Data/PurchaseInformation.swift) and [Android purchase information](https://github.com/RevenueCat/purchases-android/blob/10.27.0/ui/revenuecatui/src/main/kotlin/com/revenuecat/purchases/ui/revenuecatui/customercenter/data/PurchaseInformation.kt) handle promotional/free purchase information. This supports using the native component for gifts but does not prove Blockout's final layout, localization, accessibility or complete native lifecycle.

## Identity, cache and uncertain outcomes

**Decision**: Use the usable business UUID, native identity methods, `CustomerInfo` and the existing F05 session generation. Keep operation presentation transient and provider recovery native.

**Rationale**: [Identifying customers](https://www.revenuecat.com/docs/customers/identifying-customers) recommends non-guessable identifiers and describes shared project identity, known-account login and anonymous creation on logout. [Customer information](https://www.revenuecat.com/docs/customers/customer-info) owns cache and updates; listeners do not receive server pushes. [Errors](https://www.revenuecat.com/docs/test-and-launch/errors) distinguish pending payment, cancellation and failure. Only supplied entitlement state decides activation.

**Alternatives considered**: Backend entitlement mirrors, webhooks, custom grace clocks, polling, persisted operation records and automatic retries add synchronization or recovery ownership without an accepted need. F05's existing generation is sufficient for rejecting obsolete application callbacks; no new session registry is required. A session change cannot guarantee cancellation or reassignment of a native transaction, so its complete behavior is tested rather than inferred.

**Evidence limits**: SDK source/documentation do not establish every interruption/account-switch/store outcome. Native transaction tests remain necessary; isolated receipt-path inspection is not proof of the full lifecycle. An uncertain payment is not safely retried as a new purchase merely because the app lost its result.

## Existing project and V2 presentation

**Decision**: Preserve the existing project, entitlement and products. Select a separate V2 offering/paywall using those products and ad-free-only copy; keep the V1 presentation during coexistence. Use simple Customer Center actions and the existing F10 support destination.

**Rationale**: Read-only console inspection on 2026-10-14 found `Blockout Pro`, monthly Apple `monthly`, Google `monthly:monthly`, Test Store `monthly`, the `default` offering and a published V1 paywall still advertising sporting benefits that V2 makes free. A separate presentation avoids changing V1 benefits during preparation and selects no new product or tier. The accepted F14 launch instead lowers the existing monthly EUR price to 1.99 EUR for new and existing subscribers using native store mechanisms; [F14 research](../014-v1-v2-transition/research.md#subscription-price-and-purchase-continuity) owns the current pricing evidence and activation constraints. Customer Center configuration was accessible. The account was PRO with usage below the displayed free threshold; this is current account evidence, not a guarantee of future pricing.

**Alternatives considered**: Editing the shared V1 paywall immediately affects an accepted coexistence boundary. A second project duplicates catalog/customer settings and does not solve identity continuity. Recreating provider screens or adding a second support-ticket channel has no useful role.

**Evidence limits**: No configuration was changed, no key was exported, and no real purchase/customer mutation was performed. Displayed paywall preview prices are not production price evidence. Before activation, qualify actual products, store terms, availability, UI and notification configuration; the console observation is not store approval.

## Test environments

**Decision**: Keep native sandbox access `Anybody`; use controlled test accounts, Test Store for routine development and real platform sandboxes for release qualification.

**Rationale**: [Sandbox access](https://www.revenuecat.com/docs/projects/sandbox-access) explains that restrictions apply to both Test Store and native sandboxes, allowing a transaction to be recorded without granting rights to an excluded customer. [Apple App Review](https://developer.apple.com/help/app-review/before-submitting-for-review/configure-in-app-purchases) tests purchases in sandbox. Taken together, an allowlist would risk excluding an unknown reviewer business UUID. Keeping the native default avoids that process; this is an inference from the two documented behaviors, not an Apple recommendation naming RevenueCat.

**Alternatives considered**: A customer allowlist adds reviewer/test administration; a second project introduces duplication and continuity work. Neither is needed for the accepted scope. [Sandbox documentation](https://www.revenuecat.com/docs/test-and-launch/sandbox) confirms test and production receipts can coexist on a customer; tests therefore use dedicated accounts, with no claim of project-level isolation.

## Restoration, gifts and erasure

**Decision**: Keep `Transfer to new App User ID`, with no separate sandbox restore mode; use explicit native restoration, supported owner console intervention and F05 local-first erasure. No V1 gift-migration mechanism is needed for the population the owner confirmed absent.

**Rationale**: The observed restore setting matches [native transfer behavior](https://www.revenuecat.com/docs/projects/restore-behavior). It can transfer a receipt's purchases rather than one selected benefit. [Customer profile operations](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile) and [support guidance](https://www.revenuecat.com/docs/dashboard-and-metrics/supporting-your-customers) supply grant/revoke/manual intervention mechanisms. Gifts remain tied to the beneficiary and do not cancel billing. F14 verifies applicable populations before cutover; F05 preserves discoverable original-target references for cleanup.

**Alternatives considered**: An automatic migration/recovery engine, per-purchase transfer guarantees, email-based merging and automatic compensatory gifts exceed the agreed behavior or provider guarantees. Manual assistance with verified evidence covers exceptions without a new service or ledger.

**Evidence limits**: Console settings are not successful restoration evidence. Both stores, cross-store assistance, independent gifts and deletion/recreation require controlled native qualification. No customer inventory proves absence of gifts; that premise comes from the owner and must be rechecked before cutover.
