# Implementation Plan: Advertising, privacy and legal

**Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md) and the accepted [F13 foundation](../003-shared-quality/plan.md).

**Scope**: F11 technical choices and scoped design. [Tasks](tasks.md) track implementation and remaining provider/native qualifications; [quickstart](quickstart.md) defines validation prerequisites, scenarios and expected outcomes.

## Summary

Use Google Mobile Ads and UMP with Meta Audience Network bidding, one preloaded interstitial and one opportunity every ten eligible sporting navigations. Remove installation age collection and use provider-owned consent. Publish three static HTML legal documents with the existing backend and open them in the native integrated browser. Apply targeted club-contact restrictions through ordinary manual operations on existing metadata.

## Technical Context

**Language/Version**: TypeScript/Expo mobile and Java/Spring Boot backend; versions follow the [F13 technical context](../003-shared-quality/plan.md#technical-context).

**Primary Dependencies**: `react-native-google-mobile-ads` 17.4.0 and its compatible scoped Facebook mediation package/config plugin; SDK-pinned native dependencies, not manually upgraded adapters. Expo-compatible `expo-tracking-transparency` for the supported older-iOS Meta handoff and `expo-web-browser` for legal documents. F13 owns the dependency installation/build toolchain.

**Storage**: Provider-owned native consent storage and one in-memory advertising count and prepared ad. Static HTML files bundled with the backend. F02 PostgreSQL contact metadata for field restrictions.

**Testing**: F13 Jest Expo/React Native Testing Library; JUnit/Spring MVC and PostgreSQL Testcontainers for existing affected backend boundaries. Representative native UI and ordinary session transitions use compatible iOS/Android development clients under [F13’s proportionate qualification](../003-shared-quality/plan.md#proportionate-qualification). Actual serving, consent/ATT and mediation retain physical-device/provider test ads and Ad Inspector evidence at their own boundaries.

**Target Platform**: Native iOS and Android; iOS minimum 16.4 from F13, Android SDK/build compatibility qualified against the selected SDK pins. No Expo Go evidence or new desktop/web application target.

**Project Type**: Mobile behavior plus existing backend publication and sporting privacy enforcement.

**Performance Goals**: Never wait for an ad to load before releasing an eligible sporting action; no benchmark, load/capacity programme or availability commitment.

**Constraints**: Native provider treatment and consent govern ad eligibility; unavailable ads never delay sporting access. EU27 store distribution preserves existing users and entitlements outside those storefronts.

**Scale/Scope**: One shared interstitial placement per mobile platform; Google and Meta mediation; three public legal documents; existing club contact fields. This plan does not establish product implementation or store/provider configuration.

## Constitution Check

| Principle                    | Application and current result                                                                                                                                                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification-led intent | Agreed behavior is integrated in F11 and affected F02/F05/F09/F14 owners; no session narrative substitutes for requirements.                                                                                                                                           |
| II — Domain integrity        | F11 owns advertising/privacy/legal rules; F02 owns contact state and transactions, F05 identity/deletion, F09 entitlements, F10 support and F13 operations. No ownership transfer or new service.                                                                      |
| III — Design                 | **Passed for this revision**: the prototype and Figma received separate approval for direct guest entry and the conditional advertising choices action.                                                                                                                |
| IV — Contract-first          | Existing canonical HTTP sources stay under `contracts/http/`. The provider SDK owns advertising consent. Public legal pages retain the existing HTML endpoints. [Boundary documentation](contracts/README.md) identifies actual suppliers/consumers and F02 semantics. |
| V — Proportionate simplicity | Native privacy, mediation and browser mechanisms; one prepared ad; manual field restrictions and rights handling. [Research](research.md) records alternatives and limitations.                                                                                        |

**Design reconciliation**: The approved [prototype](https://github.com/blockoutproject/product-prototype) and [discovery flow](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=787-21) lead from guest selection directly to Search. The [advertising choices journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5272-10390) opens the native form directly from the [guest profile](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5478-27713) or the [signed-in profile](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1131-1082) when UMP requires the action. [The profile without that requirement](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5303-12060) omits the row. Preserve [Search without a visible count](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=916-2832) and the [public-document handoff](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5197-5300).

## Project Structure

### Documentation (this feature)

```text
specs/004-advertising-privacy-legal/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/README.md
└── quickstart.md
```

Specifications and planning artifacts are reviewed together after design reconciliation.

### Source Code (repository root)

Application locations within the [F13 workspace](../003-shared-quality/plan.md#project-structure):

```text
apps/mobile/src/features/advertising/     # consent, eligibility and one interstitial
apps/mobile/src/features/privacy/         # information/choice entries and browser handoff
apps/backend/src/main/resources/static/legals/  # imprint.html, privacy.html, terms.html
contracts/http/mobile/openapi.yaml       # existing contact representations; one canonical authority
```

**Structure Decision**: Keep the mobile runtime in the advertising owner, with thin calls from actual sporting transitions. Reuse F05/F09 session/entitlement state and F02 contact transactions; do not add a service per feature or a generic provider framework. Map stable extensionless `/legals/{kind}` URLs to the bundled HTML resources through ordinary backend routing.

The applicable advertising choices action uses the [F13 UI foundation](../003-shared-quality/plan.md#native-ui-and-approved-design) and opens the provider-owned form. The approved profile compositions place the action below Blockout Pro when required. Public documents keep their existing browser handoff.

## Advertising integration

### Consent and current eligibility

Keep one owner for installation UMP state across private session remounts. On the first ordinarily admitted entry after discovery, use `AdsConsent.requestInfoUpdate()` and `loadAndShowConsentFormIfRequired()` from the installed wrapper. The separate calls allow the form to respect current admission and established Pro state. Keep only the SDK's request permission and whether it requires a privacy entry in the presentation state. After an update failure use the permission returned by `AdsConsent.getConsentInfo()`. UMP and the ad networks consume the applicable choices and determine the serving mode.

When UMP reports `REQUIRED`, expose the applicable advertising choices action and use `AdsConsent.showPrivacyOptionsForm()`. Retire a prepared ad before opening the form and read back current native permission and form applicability after it closes. The native form owns consent persistence. Start the Mobile Ads SDK once when an ordinarily admitted guest or confirmed free account can request ads. Keep delayed app measurement and wait for SDK initialization before preloading.

Use UMP's documented iOS IDFA-message support for any authorized ATT prompt. For iOS versions earlier than 17, use the existing Expo permission read to forward the actual system status to Meta before Mobile Ads initialization. The same provider message can be configured without adding a parallel in-app prompt. FR-010 and the release checks govern enabling real ads.

### Runtime composition

The single advertising owner keeps the counter and prepared interstitial in memory. Read F12 ordinary admission and current F09 guest/free state before loading or showing. Loss of permission discards preparation. A retained navigation continuation executes only while its original navigation and session are still current.

Integrate at the existing in-app sporting page navigation boundary, including Search, sporting relationships and personal calendar/followed cards. Use the existing router and link APIs directly for system notifications and external live links. Remove age routes, the age selector and storage, its entry guards and its dedicated dependency. Remove invalidated fixtures and assertions while retaining tests of independent account, access and navigation behavior.

### Mediation and presentation

Use one standard V2 AdMob interstitial unit per platform and the matching Meta bidding placement in its mediation group. Existing mobile dependencies and supported native pins supply both networks. Google demo IDs support local testing. In production, a platform with a real AdMob app ID can keep its UMP choices available even with no interstitial unit. Serving requires a real app ID and a real unit. V1 stays on its existing units until cutover.

Use the imperative `InterstitialAd` API. Preload one ad while eligible and check the documented one-hour expiry before use. Count eligible navigations in groups of ten. When the tenth cannot present a ready ad, open the destination immediately and start a new cycle. Save only the continuation for a presentation attempt. Consume it once on dismissal or presentation failure, including a rejected `show()`. After dismissal, preload the next ad if eligible. An ad loaded after navigation never presents by itself. [Research](research.md#advertising-lifecycle-and-failure-limits) explains the API choice.

## Legal content and shared privacy

Publish static UTF-8 HTML for `imprint`, `privacy` and `terms`, containing a nonempty title, free-form version, complete body and truthful modification date. Review the actual text before publication. Reuse the public `/legals/privacy` URL and its external account-deletion directions; define the other public document paths consistently. Ordinary backend routes serve the same pages to the mobile browser and external/store readers, without authentication or advertising scripts/cookies.

Use Expo `WebBrowser.openBrowserAsync`: iOS integrated browser and Android Custom Tabs own reading, return and network controls. `useLegalDocuments` keeps native opening failure feedback at the original action; another explicit link press retries opening. Add no document-read query or recovery screen. Provide an explicit missing-page response. A backend outage affects reading; failed delivery preserves valid content without guaranteeing uninterrupted access.

F11 requires restricted club contacts to stay absent through collection, editing and restoration. Apply the [F02 field-restriction transaction](../002-sporting-data/data-model.md#presentation-and-privacy) through authorized manual operations; the existing contracts retain null representations and conflict semantics. No dedicated screen or privacy endpoint is added.

Do not build generalized referee/person suppression. Other individual requests remain manual under F11; F05 deletion and [F10 private support](../012-reports-feature-suggestions/plan.md#privacy-recovery-and-shared-owners) retain their own handling. F10 owns submission, complete-intake marking and explicit retry; its secondary signal contains no personal content. The [manual support procedure](../../infra/operations/README.md#private-support-intake-and-replies) limits GitHub/file access to authorized handling, uses the supplied address for replies and handles incomplete attempts or rare duplicates by private inspection and closure. No receipt lookup, repair automation or new tracking store is added. No periodic purge, post-closure deadline or independent Blockout support backup is introduced.

The [prepared A20–A24 cases](quickstart.md#support-privacy-cases) reuse F10's existing form, image, submission and provider-boundary tests. They establish expected outcomes only; actual private file access and the integrated journey retain [T035](tasks.md#integration-and-qualification-for-user-story-5) and F10's qualification prerequisites. Before restored data is reopened, manually reconcile current restrictions, erasures, rights and expiry under F13. No infrastructure backup or log-storage duration is selected; each domain retains its purpose limits.

## Consumers and release conditions

- **F02**: contact metadata, collection/edit enforcement, current restrictions and null representations; reuse existing contracts and club locking.
- **F05**: account/session changes update advertising eligibility and invalidate an obsolete navigation continuation. Consent stays with the provider on the installation. Existing synchronous local deletion and manual external cleanup retain their own owner.
- **F09**: current rights decide loading/presentation, without owning installation consent preparation. Active Pro avoids unnecessary prompts; unknown state suppresses ads and repurchase encouragement. Existing connected Pro entries open the same configured native Paywall after account/SDK association; this does not widen the free-account banner’s visibility or establish free rights. F09 qualifies the actual subscriber/unknown-state proposals and provider restoration/management journey. Qualify offer availability alongside EU27 distribution without revoking existing rights.
- **F12**: preserve all three global access gates; no blocked legal-link entry or privacy/support route bypass.
- **F13**: ordinary private diagnostics and manual restoration; existing stack, no new operational service or recovery programme.
- **F14**: EU27 new-download availability, existing users abroad, store update/redownload and entitlements. Advertising does not control discovery completion or ordinary access.

The current Google Play declaration targets ages 13–15, 16–17 and 18+. Keep production V2 interstitial unit IDs unset until the applicable requirements for serving without age collection and actual provider behavior have been qualified for that audience. Before enabling serving, also confirm EU27 app and offer availability, UMP partner configuration and the public `app-ads.txt`. Equativ seller entries can be removed after their last supported V1 use.

Use provider consoles for revenue, impressions and fill. No-fill is not an application incident. Existing Sentry/native diagnostics cover actual integration errors/crashes without age, consent strings, ad identifiers or personal payloads. No new advertising analytics pipeline.

## Verification and evidence

[Research](research.md) distinguishes documented capabilities, inspected configuration and unverified native integration. [Quickstart](quickstart.md) is the bounded validation guide; no fabricated runnable application commands are introduced.

Verify the tenth navigation with a ready ad, the tenth without an ad, a subsequent fresh cycle, and direct system notification and external live-link navigation. Check loss of eligibility, dismissal and presentation failure, and a UMP choice change. Reuse F09 coverage for entitlement derivation and account isolation. In representative native builds, confirm ordinary entry without age collection and the applicable privacy action. Qualify real consent, ATT and Google/Meta test serving at their native boundaries.

Reuse existing evidence only while its source, mechanism, native dependencies, runtime and relevant configuration still apply under F13. T010, T020, T031, T035, T038, T040 and T043 own qualification for consent, serving, mediation, configuration and private rights. T039 owns legal-processing review. No removed or reused scenario supplies a new passing provider or release result.

Coverage: FR-001–006 shared counter/native lifecycle; FR-007–014 entitlement, advertising choices and permissions; FR-015–020 public legal pages; FR-021–027 contact restriction/minimization/restoration; FR-028–037 existing support, rights and truthful publication responsibilities. Changes do not relax private support, original-target cleanup evidence limits or legal rights handling.

Apply the [README documentation checks](../../README.md#verification) to the delivery; GitHub records their results. These checks establish no native build, ad delivery, store approval, legal compliance or provider setting. No tasks, implementation or issue closure follows automatically.
