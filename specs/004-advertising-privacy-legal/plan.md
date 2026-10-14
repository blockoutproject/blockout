# Implementation Plan: Advertising, privacy and legal

**Branch**: `tech/45-advertising-privacy-plan` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-advertising-privacy-legal/spec.md`; [issue #45](https://github.com/blockoutproject/blockout/issues/45).

**Status**: Technical decisions and affected prototype/Figma scope approved; dossier ready for owner review. No product runtime or provider configuration is implemented by this planning issue.

## Summary

Use the native Google Mobile Ads/UMP integration and Meta mediation for eligible free users, with one shared ten-action interstitial counter. Keep age treatment and consent local to the installation. Publish three static HTML legal documents with the existing backend and open them in the native integrated browser. Apply targeted club-contact restrictions through ordinary manual operations on existing metadata.

The owning specification includes the agreed product corrections. The affected prototype and Figma scope has passed explicit owner review; existing approvals remain applicable to unchanged journeys.

## Technical Context

**Language/Version**: TypeScript on the [F13](../003-shared-quality/plan.md) Expo SDK 57 / React Native 0.86 / React 19.2.3 stack; Java 25 / Spring Boot 4.1.1 for backend-owned static content and existing sporting transactions.

**Primary Dependencies**: `react-native-google-mobile-ads` 17.2.0 and its compatible scoped Facebook mediation package/config plugin; SDK-pinned native dependencies, not manually upgraded adapters. Expo 57 `expo-tracking-transparency` and `expo-web-browser`; `@react-native-community/slider` 5.2.0 as recommended by Expo 57. F13 owns the dependency installation/build toolchain.

**Storage**: Installation-local age category and declaration date; provider-owned native consent storage; memory-only advertising count and prepared ad. Static HTML files bundled with the backend. F02 PostgreSQL contact metadata for field restrictions. No server age/consent table or advertising-event history.

**Testing**: F13 Jest Expo/React Native Testing Library; JUnit/Spring MVC and PostgreSQL Testcontainers for existing affected backend boundaries. Physical iOS/Android devices, provider test ads and Ad Inspector for native qualification.

**Target Platform**: Native iOS and Android; iOS minimum 16.4 from F13, Android SDK/build compatibility qualified against the selected SDK pins. No Expo Go evidence or new desktop/web application target.

**Project Type**: Mobile behavior plus existing backend publication and sporting privacy enforcement.

**Performance Goals**: Never wait for an ad to load before releasing an eligible sporting action; no benchmark, load/capacity programme or availability commitment.

**Constraints**: No minimum account age, country lookup, custom consent parser, custom ad watchdog, extra advertising provider, universal erasure registry or automatic recovery service. EU27 store distribution preserves existing users and entitlements outside those storefronts.

**Scale/Scope**: One shared interstitial placement per mobile platform; Google and Meta mediation; three public legal documents; existing club contact fields. No product implementation, store/provider changes, task generation or automatic issue closure in #45.

## Constitution Check

| Principle                    | Application and current result                                                                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I — Specification-led intent | Agreed behavior is integrated in F11 and affected F02/F05/F09/F14 owners; no session narrative substitutes for requirements. The source, consumer and contract consistency review is complete.                                                                     |
| II — Domain integrity        | F11 owns advertising/privacy/legal rules; F02 owns contact state and transactions, F05 identity/deletion, F09 entitlements, F10 support and F13 operations. No ownership transfer or new service.                                                                  |
| III — Design                 | **Passed**: explicit prototype and Figma approvals cover age declaration, renewal/correction, privacy settings, search without a counter and the public-document native-browser handoff. Provider simulations prove neither native behavior nor supplier approval. |
| IV — Contract-first          | Existing canonical HTTP sources stay under `contracts/http/`. No new mobile JSON API for age, consent or documents. [Boundary documentation](contracts/README.md) identifies actual suppliers/consumers and F02 semantics.                                         |
| V — Proportionate simplicity | Native privacy, mediation and browser mechanisms; one prepared ad; manual field restrictions and rights handling. [Research](research.md) records alternatives and limitations.                                                                                    |

The owner approved prototype `89f60e9`; the subsequently authorized search-counter removal is included in `b28c005`. Approved Figma scope: [age declaration and renewal](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=6650-4899), [privacy settings and age correction](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5272-10390), and [search without a character counter](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=916-2832). These use the published [Age Selector](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=3681-609), with light/dark, compact-width and enlarged-text specimens. The owner approved this scope on October 14. The owner also explicitly approved the [public-document browser handoff](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5197-5300); its indicative native controls do not define a custom Blockout reader.

The post-design constitution check identifies no exception. The combined specification and planning delivery remains subject to owner review; these design approvals authorize neither product implementation nor provider activation.

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

No `tasks.md` is generated. Specifications and planning artifacts are reviewed together after design reconciliation.

### Source Code (repository root)

Planned locations within F13's future workspace; these application directories are not initialized by #45:

```text
apps/mobile/src/features/advertising/     # age, eligibility, provider integration and single ad lifecycle
apps/mobile/src/features/privacy/         # information/choice entries and browser handoff
apps/backend/src/main/resources/static/legals/  # imprint.html, privacy.html, terms.html
contracts/http/mobile/openapi.yaml       # existing contact representations; one canonical authority
```

**Structure Decision**: Keep the mobile runtime in the advertising owner, with thin calls from actual sporting transitions. Reuse F05/F09 session/entitlement state and F02 contact transactions; do not add a service per feature or a generic provider framework. Map stable extensionless `/legals/{kind}` URLs to the bundled HTML resources through ordinary backend routing.

## Advertising integration

### Age and privacy before initialization

1. Respect F12 global gates and established Pro state. Known active Pro avoids unnecessary new age/advertising prompts. Unknown signed-in entitlements authorize neither an ad nor a purchase invitation.
2. Obtain an explicit whole-number age through the ordinary native slider with compact minus/plus controls, using the existing React Hook Form/Zod boundary. Initial entry is a standalone required access screen after guest/sign-in selection, separate from skippable discovery onboarding and before ordinary home content; confirmation requires valid input and no age is prefilled. Reuse the branded access frame and moving background, respecting reduced motion. No skip/close/in-screen back control and no completion flag separate from the usable declaration; ordinary access remains guarded after back navigation or restart. Keep only category/date locally. Reuse the same short form for annual minor renewal and correction; correction opens in a standard sheet from privacy settings and cancellation preserves the prior declaration. Use one-year steps from 0 to 100 (100+), no declared default and a single readable value; no custom gesture component, extra field label or birth-date input. The brief copy is “Pour une expérience adaptée.”; full privacy information retains the advertising purpose. The two privacy rows reuse ordinary components/tokens. Do not age categories automatically or synchronize them with an account. Missing, invalid or expired age receives the same conservative child treatment as under 16 until a new declaration, without counting that fallback as a declared category or skipping the initial page.
3. Configure native request treatment before ad initialization: under 16 or unusable age `CHILD` and maximum content `G`; 16–17 `TEEN` and maximum `T`; adult `UNSPECIFIED` and maximum `T`. Configure UMP's under-age-of-consent setting separately; it is not automatically forwarded to Google Mobile Ads.
4. Use a European UMP message targeted `Everywhere`. Update consent information at applicable launches and show the required native form; use native `canRequestAds` and supported helpers rather than treating `OBTAINED` as blanket consent. UMP owns persistence and any still-valid cached decision. Its error is not consent.
5. On iOS, use `expo-tracking-transparency` for the native ATT request after UMP only when eligible processing actually needs tracking and system status permits prompting. No Blockout pre-explainer and no second UMP-managed ATT orchestration. Android has no ATT request. Personalization requires the necessary native consent and permissions; neither age nor ATT alone authorizes it.
6. Initialize Google Mobile Ads only after applicable configuration and eligibility, with delayed app measurement configured as documented. Meta uses the supported mediation adapter and UMP Additional Consent integration. On supported older iOS versions apply the adapter's documented advertiser-tracking setting; current iOS versions use native ATT status. Do not substitute US limited-data-use settings for European consent.

The advertising-choice row calls `AdsConsent.showPrivacyOptionsForm()` only when native `privacyOptionsRequirementStatus` is `REQUIRED`; otherwise hide the entry, following UMP guidance. Reevaluate the status after the native information update and after changes. The native wrapper supplies supported consent helpers; no home-grown TCF parser or backend decision mirror. A privacy/age change invalidates prepared ads before eligibility is reevaluated. An interrupted correction does not become a new declaration. No production consent-reset shortcut is selected.

### Mediation and presentation

Create one V2 interstitial ad unit per platform, shared by navigation and live actions, with corresponding Google/Meta mediation groups. Keep V1 units/configuration usable during transition. Equativ is not selected for V2. Provider console identifiers are deployment configuration, not new business identities.

Use classic Google Mobile Ads and the compatible scoped Meta plugin, without Next-Gen migration, custom bridge, ad pools or manual native-version overrides. Preserve the selected high-engagement setting. Native child-directed format and close-control rules still apply; qualify both networks and age treatments before activation. Do not implement a Blockout close timer.

One mobile owner keeps the session counter, at most one prepared interstitial and one active transition. An accepted voluntary club/team/pool/match opening or live action increments once, capped at ten. The first nine proceed; at the threshold an authorized ready ad may show. Actual display resets to zero. Missing, stale or failed-to-load ads never delay navigation and leave the threshold reached. Live opening creates no independent extra ad opportunity.

Exclude startup, foreground return, back, refresh, filters, authentication, account, payment, privacy, legal and support actions. Pro/unknown-entitlement actions accumulate no advertising debt. Backgrounding alone does not reset the counter; a fresh process starts at zero.

Load ahead using ordinary SDK calls; consume/destroy a presented or incompatible ad, reject one beyond native validity before showing, and prepare a subsequent ad only when eligible. No periodic refresh timer or repeated no-fill retry loop. Native dismissal or presentation failure releases the accepted destination at most once; late callbacks cannot show an ad on an already opened destination. Session changes discard old results. Do not add a watchdog: an exceptional SDK hang may require application restart and abandons the pending transition.

## Legal content and shared privacy

Publish static UTF-8 HTML for `imprint`, `privacy` and `terms`, containing a nonempty title, free-form version, complete body and truthful modification date. Review the actual text before publication. Reuse the public `/legals/privacy` URL and its external account-deletion directions; define the other public document paths consistently. Ordinary backend routes serve the same pages to the mobile browser and external/store readers, without authentication or advertising scripts/cookies.

Use Expo `WebBrowser.openBrowserAsync`: iOS integrated browser and Android Custom Tabs own reading, return and network controls. Provide an explicit missing-page response. No custom document reader, JSON read/write API, Markdown transformation, CMS, document SQL table, public history or acceptance registry. A backend outage affects reading; failed delivery preserves valid content without guaranteeing uninterrupted access.

For a club contact restriction, an authorized manual F02 transaction locks the club, marks the affected field, clears source/manual values and advances the editing revision. Collection keeps its ordinary acquisition shape; the backend ignores restricted contact values rather than persisting them. Ordinary overrides or return-to-source cannot lift the restriction. Existing response fields remain null. No special administration screen or privacy endpoint is added.

Do not build generalized referee/person suppression. Other individual requests remain manual under F11; F05 deletion and F10 private support retain their own handling. Before restored data is reopened, manually reconcile current restrictions, erasures, rights and expiry under F13. Backup retention does not become a universal business/log retention rule.

## Consumer and release reconciliation

- **F02**: contact metadata, collection/edit enforcement, current revision and null representations; reuse existing contracts and club locking.
- **F05**: advertising declaration does not create a profile field, account age gate or provider identity mapping. Existing synchronous local deletion/manual external cleanup is unchanged.
- **F09**: active Pro avoids unnecessary prompts; unknown state suppresses ads/purchase invitations. Qualify Pro offer availability alongside EU27 distribution without revoking existing rights.
- **F12**: preserve all three global access gates; no legal/privacy/support route bypass.
- **F13**: ordinary private diagnostics and manual restoration; existing stack, no new operational service or recovery programme.
- **F14**: EU27 new-download availability, existing users abroad, store update/redownload and entitlements; new age declaration does not replay completed onboarding.

Future provider/store activation must reconcile truthful audience, advertising and privacy declarations; EU27 app/offer availability; European UMP message/partner configuration; and the public `app-ads.txt`. Remove Equativ seller entries only when no still-supported V1 placement uses them. Preserve useful current provider identities. This dossier configures none of these services.

Use provider consoles for revenue, impressions and fill. No-fill is not an application incident. Existing Sentry/native diagnostics cover actual integration errors/crashes without age, consent strings, ad identifiers or personal payloads. No new advertising analytics pipeline.

## Verification and evidence

[Research](research.md) distinguishes documented capabilities, inspected configuration and unverified native integration. [Quickstart](quickstart.md) is the bounded validation guide; no fabricated runnable application commands are introduced.

Coverage: FR-001–006 shared counter/native lifecycle; FR-007–014 entitlement, age, consent and permissions; FR-015–020 public legal pages; FR-021–027 contact restriction/minimization/restoration; FR-028–037 existing support, rights and truthful publication responsibilities. Changes do not relax private support, original-target cleanup evidence limits or legal rights handling.

Completed checks cover the required scoped design approvals, source/consumer/contract consistency, Markdown/YAML formatting, local Markdown links and anchors, OpenAPI lint and whitespace. Documentary checks do not establish native builds, ad delivery, store approval, legal compliance or provider settings. No tasks, implementation or issue closure follows automatically.
