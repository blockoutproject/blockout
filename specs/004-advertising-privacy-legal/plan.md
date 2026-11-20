# Implementation Plan: Advertising, privacy and legal

**Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md) and the accepted [F13 foundation](../003-shared-quality/plan.md).

**Scope**: F11 technical choices and scoped design. [Tasks](tasks.md) track implementation and remaining provider/native qualifications; [quickstart](quickstart.md) defines validation prerequisites, scenarios and expected outcomes.

## Summary

Use the native Google Mobile Ads/UMP integration and Meta mediation for eligible free users, with one interstitial opportunity every ten eligible detail openings. Keep age treatment and consent local to the installation. Publish three static HTML legal documents with the existing backend and open them in the native integrated browser. Apply targeted club-contact restrictions through ordinary manual operations on existing metadata.

## Technical Context

**Language/Version**: TypeScript/Expo mobile and Java/Spring Boot backend; versions follow the [F13 technical context](../003-shared-quality/plan.md#technical-context).

**Primary Dependencies**: `react-native-google-mobile-ads` 17.4.0 and its compatible scoped Facebook mediation package/config plugin; SDK-pinned native dependencies, not manually upgraded adapters. Expo-compatible `expo-tracking-transparency` and `expo-web-browser`; `@react-native-community/slider` 5.2.1 for the selected Expo baseline. F13 owns the dependency installation/build toolchain.

**Storage**: Installation-local age category and declaration date; provider-owned native consent storage; memory-only advertising count and prepared ad. Static HTML files bundled with the backend. F02 PostgreSQL contact metadata for field restrictions. No server age/consent table or advertising-event history.

**Testing**: F13 Jest Expo/React Native Testing Library; JUnit/Spring MVC and PostgreSQL Testcontainers for existing affected backend boundaries. Representative native UI and ordinary session transitions use compatible iOS/Android development clients under [F13’s proportionate qualification](../003-shared-quality/plan.md#proportionate-qualification). Actual serving, consent/ATT and mediation retain physical-device/provider test ads and Ad Inspector evidence at their own boundaries.

**Target Platform**: Native iOS and Android; iOS minimum 16.4 from F13, Android SDK/build compatibility qualified against the selected SDK pins. No Expo Go evidence or new desktop/web application target.

**Project Type**: Mobile behavior plus existing backend publication and sporting privacy enforcement.

**Performance Goals**: Never wait for an ad to load before releasing an eligible sporting action; no benchmark, load/capacity programme or availability commitment.

**Constraints**: Native provider treatment and consent govern ad eligibility; unavailable ads never delay sporting access. EU27 store distribution preserves existing users and entitlements outside those storefronts.

**Scale/Scope**: One shared interstitial placement per mobile platform; Google and Meta mediation; three public legal documents; existing club contact fields. This plan does not establish product implementation or store/provider configuration.

## Constitution Check

| Principle                    | Application and current result                                                                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I — Specification-led intent | Agreed behavior is integrated in F11 and affected F02/F05/F09/F14 owners; no session narrative substitutes for requirements.                                                                                                                                       |
| II — Domain integrity        | F11 owns advertising/privacy/legal rules; F02 owns contact state and transactions, F05 identity/deletion, F09 entitlements, F10 support and F13 operations. No ownership transfer or new service.                                                                  |
| III — Design                 | **Passed**: explicit prototype and Figma approvals cover age declaration, renewal/correction, privacy settings, search without a counter and the public-document native-browser handoff. Provider simulations prove neither native behavior nor supplier approval. |
| IV — Contract-first          | Existing canonical HTTP sources stay under `contracts/http/`. No new mobile JSON API for age, consent or documents. [Boundary documentation](contracts/README.md) identifies actual suppliers/consumers and F02 semantics.                                         |
| V — Proportionate simplicity | Native privacy, mediation and browser mechanisms; one prepared ad; manual field restrictions and rights handling. [Research](research.md) records alternatives and limitations.                                                                                    |

**Approved design**: the approved prototype, with the authorized search-counter removal. Figma: [age declaration/renewal](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=6650-4899), [privacy/correction](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5272-10390), [search](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=916-2832), published [Age Selector](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=3681-609), and [public-document browser handoff](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5197-5300). Approval covers light/dark, compact-width and enlarged-text specimens; indicative browser controls define no custom reader.

The post-design constitution check identifies no exception. Design approval establishes the reviewed experience; implementation and provider activation retain their separate authorization and qualification requirements.

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
apps/mobile/src/features/advertising/     # age, eligibility, provider integration and single ad lifecycle
apps/mobile/src/features/privacy/         # information/choice entries and browser handoff
apps/backend/src/main/resources/static/legals/  # imprint.html, privacy.html, terms.html
contracts/http/mobile/openapi.yaml       # existing contact representations; one canonical authority
```

**Structure Decision**: Keep the mobile runtime in the advertising owner, with thin calls from actual sporting transitions. Reuse F05/F09 session/entitlement state and F02 contact transactions; do not add a service per feature or a generic provider framework. Map stable extensionless `/legals/{kind}` URLs to the bundled HTML resources through ordinary backend routing.

Blockout-owned age/privacy controls consume the [F13 UI foundation](../003-shared-quality/plan.md#native-ui-and-approved-design) before screen integration. F11 retains the age-selector behavior and privacy composition; shared buttons, fields and sheets supply presentation. The privacy menu closes before the short correction sheet opens; cancellation restores privacy navigation without changing the declaration. Never stack the two sheets or turn the age selector into a text-entry form. Native UMP and browser surfaces retain their provider/platform ownership and qualification. The changed sequencing/design evidence follows [F13 presentation evidence](../003-shared-quality/quickstart.md#native-ui-and-approved-design); other approved age content remains unchanged.

## Advertising integration

### Age and privacy before initialization

1. Keep the approved age declaration, renewal and correction while the target audience, store declarations and applicable obligations are unverified. Under-16 and missing, invalid or expired declarations suppress ads. F12 gates and current F09 rights constrain advertising. Known Pro avoids unnecessary prompts. Unresolved signed-in rights suppress ads and purchase invitations.
2. Keep the native slider and existing React Hook Form/Zod boundary. Explicit selection is 0 to 100 (100+), with category/date retained locally. Use [F13 form-read presentation](../003-shared-quality/plan.md#frontend-form-conventions) for the initial storage read and same-card Retry. A loaded correction starts no read. Storage acknowledgement completes confirmation and the native flow runs independently. Follow the [owning form requirements](spec.md#entitlements-and-advertising-choices) for presentation, renewal and cancellation.
3. Apply native age treatment before ad requests and supply UMP's under-age-of-consent flag separately. Under 16 or unknown use child protection and no serving. Ages 16–17 use `TEEN` and maximum content rating `T`. Adults use `UNSPECIFIED` and maximum `T`. Provider configuration and qualification must cover eligible teen treatment and exclude sources or formats that cannot honor it.
4. Use UMP for the applicable launch information update, required consent form and current `canRequestAds`. Rely on provider serving decisions and native persistence. Ad requests leave serving-mode selection to the native SDK. The app keeps no copy of native choices. Configure the European message for `Everywhere` and include Meta in Privacy & messaging with the applicable Additional Consent integration.
5. Keep the system-only Expo ATT request on iOS after the applicable UMP flow. Read the native purpose choices only to decide whether an eligible adult can receive that system prompt. Honor refusal, missing consent and the current system authorization. Configure V2 without a second UMP IDFA prompt. Where required on older iOS versions, apply the documented Meta setting using actual system authorization and applicable consent. Verify native refusal and teen treatment before activation. Android has no ATT prompt.

Show “Choix publicitaires” when UMP reports `privacyOptionsRequirementStatus = REQUIRED` and call its native privacy-options API. Update applicability and request eligibility from the SDK result. Suspend serving and discard incompatible prepared ads during applicable age or choice changes. A change to the effective age category reapplies the native request configuration and UMP age context before serving resumes. Recover through the existing explicit privacy action without resetting stored consent. The two approved native sheets replace each other for correction and return.

### Runtime composition

`RootLayout` owns the installation-wide UMP and interstitial integration above the Auth0-subject-keyed private subtree. `AgeDeclarationProvider` owns category/date persistence and passes the current age, admission and advertising eligibility inputs. Refresh UMP on applicable launches and actual age changes. Account or Pro-state arrival/change alone never repeats the update. If a form step is deferred for known Pro, it can continue from the successful information update when applicable. Obsolete age-context results cannot authorize requests.

Consume F09's current `ProState`, F05's current account boundary and F12 admission. An account or Pro-state change retires the old prepared ad and reassesses eligibility. It leaves the applicable installation consent state intact. Public detail navigation and privacy controls continue independently of purchase and ad readiness.

The existing sporting navigator supplies accepted deliberate detail openings from F03 resource/calendar links, F04 search cards, F06 personal journeys and eligible F07 in-app links. System notification taps, direct links, external streams and private moderation cross-links use their ordinary destinations without counting. The sporting navigator retains route validity and normal history. A late callback cannot navigate from a retired route or account.

### Mediation and presentation

Use one standard V2 AdMob interstitial unit and its Meta Audience Network bidding placement per OS. Meta is the sole added mediation partner. Keep V1 configuration usable while it is supported. Validate real app and ad-unit identifiers for production builds. Verify provider ownership and the actual mapping during provider qualification. Sample app and ad-unit IDs are for nonproduction test builds.

Keep one runtime count and one prepared interstitial. Count a deliberate detail opening for an otherwise eligible guest or confirmed-free account with a usable age category eligible for ads. Count independently of UMP readiness and ad fill. On the tenth, start a new cycle and attempt presentation only when a current ad is ready and the active route offers a natural break before opening the detail. Otherwise open the detail immediately. Foreground return alone neither counts nor resets the cycle.

Use the existing `InterstitialAd.createForAdRequest`, load/listener, show and disposal APIs. Apply the documented one-hour freshness limit at use. Only an eligible, preloaded ad may interrupt a detail opening. Use native dismissal/error events and show rejection to release the valid destination once. Successful show-call resolution alone is insufficient. Discard obsolete ad callbacks and leave stale destinations to the navigation owner. A late load only prepares a future opportunity. Retry loading through ordinary eligible events after failure, without waiting in navigation or adding a retry loop. An exceptional missing SDK callback may require restart without replay. [Wrapper and freshness rationale](research.md#advertising-lifecycle-and-failure-limits)

Qualify native presentation and dismissal of actual Google and Meta test creatives and a user-facing path for reporting inappropriate ads on iOS. If meeting that requirement needs a new Blockout-owned interaction, use the constitution’s prototype and Figma approvals before implementing it. The revised cadence uses the existing detail transition and supplier presentation, with no change to the approved Blockout compositions.

## Legal content and shared privacy

Publish static UTF-8 HTML for `imprint`, `privacy` and `terms`, containing a nonempty title, free-form version, complete body and truthful modification date. Review the actual text before publication. Reuse the public `/legals/privacy` URL and its external account-deletion directions; define the other public document paths consistently. Ordinary backend routes serve the same pages to the mobile browser and external/store readers, without authentication or advertising scripts/cookies.

Use Expo `WebBrowser.openBrowserAsync`: iOS integrated browser and Android Custom Tabs own reading, return and network controls. `useLegalDocuments` keeps native opening failure feedback at the original action; another explicit link press retries opening. Add no document-read query or recovery screen. Provide an explicit missing-page response. A backend outage affects reading; failed delivery preserves valid content without guaranteeing uninterrupted access.

F11 requires restricted club contacts to stay absent through collection, editing and restoration. Apply the [F02 field-restriction transaction](../002-sporting-data/data-model.md#presentation-and-privacy) through authorized manual operations; the existing contracts retain null representations and conflict semantics. No dedicated screen or privacy endpoint is added.

Do not build generalized referee/person suppression. Other individual requests remain manual under F11; F05 deletion and [F10 private support](../012-reports-feature-suggestions/plan.md#privacy-recovery-and-shared-owners) retain their own handling. F10 owns submission, complete-intake marking and explicit retry; its secondary signal contains no personal content. The [manual support procedure](../../infra/operations/README.md#private-support-intake-and-replies) limits GitHub/file access to authorized handling, uses the supplied address for replies and handles incomplete attempts or rare duplicates by private inspection and closure. No receipt lookup, repair automation or new tracking store is added. Closure, account deletion and unlinking prove no file-byte erasure; applicable rights cover the ticket and files at their actual provider locations, with pending actions kept distinct. No periodic purge, post-closure deadline or independent Blockout support backup is introduced.

The [prepared A20–A24 cases](quickstart.md#support-privacy-cases) reuse F10's existing form, image, submission and provider-boundary tests. They establish expected outcomes only; actual private file access/erasure and the integrated journey retain [T035](tasks.md#integration-and-qualification-for-user-story-5) and F10's qualification prerequisites. Before restored data is reopened, manually reconcile current restrictions, erasures, rights and expiry under F13. No infrastructure backup or log-storage duration is selected; each domain retains its purpose limits.

## Consumers and release conditions

- **F02**: contact metadata, collection/edit enforcement, current restrictions and null representations; reuse existing contracts and club locking.
- **F05**: account/session changes update advertising eligibility and retire prepared ads, without restarting unchanged installation preparation. The advertising declaration does not create a profile field, account age gate or provider identity mapping. Existing synchronous local deletion/manual external cleanup is unchanged.
- **F09**: current rights decide loading/presentation, without owning installation consent preparation. Active Pro avoids unnecessary prompts; unknown state suppresses ads and repurchase encouragement. Existing connected Pro entries open the same configured native Paywall after account/SDK association; this does not widen the free-account banner’s visibility or establish free rights. F09 qualifies the actual subscriber/unknown-state proposals and provider restoration/management journey. Qualify offer availability alongside EU27 distribution without revoking existing rights.
- **F12**: preserve all three global access gates; no blocked legal-link entry or privacy/support route bypass.
- **F13**: ordinary private diagnostics and manual restoration; existing stack, no new operational service or recovery programme.
- **F14**: EU27 new-download availability, existing users abroad, store update/redownload and entitlements; the mandatory age declaration stays independent of F14’s common first-V2 discovery, and does not replay completed V2 onboarding.

Before provider/store activation, qualify the actual audience and applicable declarations, EU27 app/offer availability, European UMP and the sole iOS ATT path, Meta bidding and the public `app-ads.txt` on the store-listed domain. Keep V1 seller entries while supported placements use them. A public seller-file response establishes reachability only. Any material change to the retained age journey requires the audience decision followed by the constitution’s prototype and Figma approvals.

Start the V2 ad units with **Google optimized / All prices**. Compare revenue, match rate and show rate by platform and ad source in existing reporting. Evaluate **High engagement** on supported standard units against revenue per active user and retention where those data exist. Qualify applicable presentation/close rules and account for app-wide effects on V1 before changing the setting. No-fill is an ordinary provider outcome. Report integration failures through existing filtered diagnostics. [eCPM floors](https://support.google.com/admob/answer/3418058) · [Ads Activity report](https://support.google.com/admob/answer/10979428) · [High engagement](https://support.google.com/admob/answer/15525707)

## Verification and evidence

[Research](research.md) distinguishes documented capabilities, inspected configuration and unverified native integration. [Quickstart](quickstart.md) is the bounded validation guide; no fabricated runnable application commands are introduced.

Eligibility tests cover permission outcomes and admission/choice refusals from F09’s current public `ProState`. F09 owns entitlement derivation, SDK attribution and identity transitions; F11 privacy, lifecycle and sporting-entry suites cover the cadence, excluded entries, current rights, unchanged installation preparation, actual age/choice changes and obsolete advertising callbacks. Native clients exercise ordinary session/Pro transitions and representative age, correction, privacy and browser compositions, including active/neutral Profile context. Across those selected cases cover both themes and a live appearance transition, narrow/enlarged text, reduced motion, names/roles/states, content order, ordinary keyboard/focus and reachable actions; do not multiply every SDK state by each appearance, font size and OS. Native UMP/ATT forms and serving/mediation keep focused provider-owned readability, refusal/return, actual permission/storage and eligibility observations, separate from Blockout UI comparison.

Reuse existing evidence only while its source, mechanism, native dependencies, runtime and relevant configuration still apply under F13. Missing actual consent, serving, mediation, configuration and private-rights evidence remains in T010/T020/T031/T035/T038–T040/T043; legal-processing review remains T039. No removed or reused scenario supplies a new passing provider or release result.

Coverage: FR-001–006 shared counter/native lifecycle; FR-007–014 entitlement, age, consent and permissions; FR-015–020 public legal pages; FR-021–027 contact restriction/minimization/restoration; FR-028–037 existing support, rights and truthful publication responsibilities. Changes do not relax private support, original-target cleanup evidence limits or legal rights handling.

Apply the [README documentation checks](../../README.md#verification) to the delivery; GitHub records their results. These checks establish no native build, ad delivery, store approval, legal compliance or provider setting. No tasks, implementation or issue closure follows automatically.
