---
description: "Implementation tasks for F11 advertising, privacy and legal"
---

# Tasks: F11 advertising, privacy and legal

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md) and [quickstart.md](quickstart.md).

**Prerequisites**: Accepted owning artifacts, [constitution](../../.specify/memory/constitution.md) and [agent guidance](../../AGENTS.md). The approved stack, native mechanisms and scoped design remain the baseline. This task list authorizes no implementation, provider/store change, public legal publication or deployment by itself.

**Tests**: The specification explicitly requests A01–A27 and SC-001–008 qualification. Write the automated tests below first and observe meaningful failure before their associated implementation. Prepare manual cases before the affected setup; actual provider/device/privacy/release evidence requires its named prerequisites and separate operational authorization. Reuse owning-feature evidence rather than repeating identical suites or claiming doubles qualify real providers.

**Organization**: Setup and foundation precede one phase per specification story, US1–US6, all P1. Each story has an independently testable boundary; dependent native/cross-owner acceptance remains open until real inputs exist.

## Format: `[ID] [P?] [Story] Description`

- **[P]** marks distinct-file work that can proceed together after its prerequisites.
- **[USn]** retains the specification story identifier; setup/foundation/polish have no story label.
- Paths identify implementation or its qualification source. Checked tasks record completed scope; remaining work stays unchecked.

## Path Conventions

- Mobile owners: `apps/mobile/src/features/advertising/` for local declaration, eligibility and one interstitial lifecycle; `apps/mobile/src/features/privacy/` for choices and public-document handoff. Routes under `apps/mobile/src/app/` remain thin.
- Backend: bundled legal files under `apps/backend/src/main/resources/static/legals/`, ordinary HTML routing under `apps/backend/src/main/java/com/blockout/backend/legal/`, corresponding `src/test/java/` tests. No legal JSON API, generated document client, database table or CMS.
- Existing sporting privacy enforcement remains in F02's `sporting/` implementation and suites; F10 owns support implementation and provider qualification. F05/F09/F12 supply identity, entitlements and admission rather than new F11 stores.
- Concise actual manual operations belong in `infra/operations/README.md`; local/native scenarios use the owning quickstarts. No private request or diagnostic samples go into this public repository.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Consume the bounded [F13 executable foundation](../003-shared-quality/tasks.md), without duplicating its workspace, diagnostics or native build tooling.

- [x] T001 Add the approved native dependencies to `apps/mobile/package.json` and the existing lockfile after F13 T001–T017: `react-native-google-mobile-ads` 17.4.0, its compatible scoped Facebook mediation package, SDK-compatible Expo tracking transparency/web browser and slider 5.2.1. Resolve the compatible mediation package with the selected wrapper's native pins; retain the existing React Hook Form/Zod and Jest Expo tools, with no manual native-pin upgrade, second Meta orchestration or new test framework.
- [x] T002 Configure native plugins and public ad inputs in `apps/mobile/app.config.ts` and `apps/mobile/.env.example`, including delayed measurement and French iOS ATT usage text. Validate production app and unit IDs for both platforms and reject missing, malformed or sample IDs. Use test IDs/devices for authorized qualification. Actual provider ownership and mapping remain T020/T040.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the narrow current-context eligibility boundary used by the counter and native choice lifecycle.

- [x] T003 Cover current guest/inactive/active/unavailable F09 rights, F12 admission, age eligibility and native request authorization in the F11 advertising suites. Reuse F05/F09 session and SDK tests for state derivation and account attribution.
- [x] T004 Consume current F09 `ProState`, F12 admission and age in `apps/mobile/src/features/advertising/advertising-eligibility.ts`. The native privacy owner also requires UMP request authorization before serving. Keep account and entitlement evidence with their owners. Active Pro, unresolved signed-in rights and under-16 or unknown age suppress ad requests and presentation.

**Checkpoint**: Controlled eligibility inputs support isolated story tests. Actual F05/F09/F12 bindings and US2 native choices are required before live ad integration, not before implementing the counter.

---

## Phase 3: User Story 1 — View content with predictable advertising frequency (Priority: P1) 🎯 MVP

**Goal**: Count accepted sporting detail openings once. Present at most one ready ad every ten eligible openings and continue the requested detail immediately when the opportunity is missed.

**Scope**: A01–A04; FR-001–006; SC-001–002.

**Independent Test**: With a controlled native SDK, mix Club/Team/Pool/Match openings with excluded entries. Cover a ready ad, no ready ad, an unsuitable transition, dismissal and presentation failure. The tenth consumes the opportunity in every case, with one continuation and ordinary Back history.

### Tests for User Story 1

- [x] T005 [US1] Cover cadence in the controlled interstitial suite. Verify openings one through nine, the tenth with and without a ready ad, an unsuitable break, and the start of the next cycle. Only eligible openings count. Verify active Pro, unresolved signed-in rights and protected ages cannot advance the cadence.
- [x] T006 [US1] Cover native outcomes in `apps/mobile/src/features/advertising/__tests__/interstitial-lifecycle.test.ts`. Verify dismissal, native error and rejected show, freshness at one hour, obsolete events after retirement, and exactly one continuation for a valid destination. A load never blocks the destination or presents an ad after it opens.
- [x] T007 [P] [US1] Cover actual detail and excluded entry points in `apps/mobile/src/features/advertising/__tests__/sporting-ad-entry.test.tsx`. Verify in-app Inbox entries, system notification taps, external streams and tab changes. Reuse `apps/mobile/src/features/discovery/__tests__/search-navigation.test.tsx` for ordinary Back history. Search retains the approved design without a counter.

### Implementation and qualification for User Story 1

- [x] T008 [US1] Implement the in-memory cycle and one prepared ad in `apps/mobile/src/features/advertising/interstitial-lifecycle.ts` using the native interstitial API. Use the ready ad at the tenth suitable transition, release on dismissal or presentation failure, and start a new cycle even when the ad cannot show. Observe SDK freshness and retirement without a wait for load or a second recovery flow.
- [x] T009 [US1] Wire the installation ad owner through `apps/mobile/src/app/_layout.tsx` and the real `apps/mobile/src/features/sporting/navigation.ts` entry points. Count accepted in-app Club/Team/Pool/Match detail openings and preserve the ordinary destination and history. System notification taps and direct links retain their ordinary owners. External streams use the existing link action without advertising.
- [x] T045 [US1] Keep cadence eligibility separate from native request authorization/ad readiness. Reuse the sporting navigator for route validity and single continuation. Remove redundant advertising transition coordination and keep the SDK as owner of presentation outcomes.
- [ ] T010 [US1] Use the [validation scenarios](quickstart.md#interstitial-lifecycle) on compatible iOS/Android simulator or emulator builds for representative detail navigation, Back, direct-link and other excluded entries, and Pro suppression. Reuse controlled tests for precise cadence, load/presentation failure and callback ordering. Physical-device observations use authorized test ads and the owner’s device checks. Record the exact build, observations and missing evidence. A missing SDK callback may require restart.

**Checkpoint**: US1 is the controlled-behavior MVP. Production ad activation still requires US2 choices, native qualification and the release reconciliation in US6.

---

## Phase 4: User Story 2 — Receive advertising consistent with entitlements and choices (Priority: P1)

**Goal**: Keep age declaration local, apply native treatment/consent/ATT in order and invalidate incompatible ads without changing opportunity frequency or public sporting rights.

**Scope**: A05–A11; FR-007–014; SC-003–004.

**Independent Test**: Cross guest/free/active-Pro/unknown states with missing age, 15/16/17/18, annual minor renewal, correction and native refusal/failure. No unauthorized processing or old-session exemption is admitted; correction preserves the prior declaration until submission and native failures allow ordinary content without ads.

### Tests for User Story 2

- [x] T011 [P] [US2] Write failing local-declaration tests in `apps/mobile/src/features/advertising/__tests__/age-declaration.test.ts` for explicit integer input 0–100, 100+, category boundaries, missing/corrupt state, one-calendar-year minor renewal at a subsequent launch and no annual adult reprompt/automatic aging. Assert only category/date are persisted, cancellation does not replace them and F05 sign-out/recreation neither synchronizes nor clears this independent installation declaration.
- [x] T012 [P] [US2] Write failing semantic form/access tests in `apps/mobile/src/features/advertising/__tests__/age-form.test.tsx` for no preselection despite thumb position, precise minus/plus, explicit confirmation, initial full-screen entry and correction/renewal reuse. Cover skipped F14 discovery, back/restart without confirmation, known-Pro prompt avoidance, failure and reduced motion; initial ordinary-home entry remains guarded without creating a skip/close/in-screen-back action or blocking independent public legal reading.
- [x] T013 [P] [US2] Cover the native UMP launch update and applicable form in `apps/mobile/src/features/advertising/__tests__/advertising-privacy.test.ts`. Verify separate native age settings, `canRequestAds`, required privacy options, refusal/failure and obsolete age results. Verify stable installation preparation across account UUID and Pro changes, including deferred forms for known Pro. Verify the single adult iOS ATT flow respects applicable consent and native status. Android does not request ATT.
- [x] T014 [P] [US2] Write failing privacy-sheet tests in `apps/mobile/src/features/privacy/__tests__/privacy-sheet.test.tsx` for the two approved rows, guest/Pro access outside F12 gates, native privacy options only when REQUIRED, sequential privacy-close/age-correction navigation without stacked sheets, cancel/return behavior and understandable retry. Verify successful choice changes invalidate incompatible prepared ads while preserving the opportunity count and no invented legal links or explanatory subpages appear in the sheet.

### Implementation and qualification for User Story 2

- [x] T015 [US2] Implement local storage/validation in `apps/mobile/src/features/advertising/age-declaration.ts` using ordinary installation storage; make T011 pass with the exact constraints: `category` — “Under 16, 16–17 or adult. Derived at submission from an explicitly selected age in completed years; the raw input is not retained.”; `declaredAt` — “Local declaration date used to request a fresh minor declaration after one calendar year at a subsequent launch. Not the person's birth date.” Missing, invalid or expired data suppresses ads without synthesizing a declaration; keep no account, country, location, raw age, consent-string mirror or separate completion flag.
- [x] T016 [US2] Implement the shared neutral form in `apps/mobile/src/features/advertising/forms/age-form.tsx` with native slider 5.2.1, React Hook Form/Zod, compact precise minus/plus controls and one displayed value. Require explicit 0–100 selection, use the approved “Pour une expérience adaptée.” copy and retain only submitted category/date. Reuse F13 theme/accessibility and F14's approved branded/motion composition rather than duplicate it; make form cases from T012 pass with native StyleSheet and reduced-motion behavior. Use the existing installation-storage read owner and [F13 form-read presentation](../003-shared-quality/plan.md#frontend-form-conventions): initial active skeleton, final whole-form card, same-card Retry with actual storage wait and no automatic retry or fabricated declaration. Loaded correction starts no new read. Keep selection on write failure; complete confirmation at the category/date storage acknowledgement. Native consent preparation has independent readiness/error/retry and never undoes that acknowledgement or grants advertising on failure.
- [x] T017 [US2] Implement the standalone initial age screen in `apps/mobile/src/features/advertising/screens/age-declaration-screen.tsx` and thin route `apps/mobile/src/app/age-declaration.tsx`, composing the ordinary-entry guard in `apps/mobile/src/app/_layout.tsx`. Make T012 pass after guest/sign-in selection independently of F14's skippable discovery, with no bypass via back/restart and no account-age gate. Known active Pro avoids unnecessary prompts; existing legal/privacy access remains independent outside F12 gates. Reuse the same form for a due minor declaration at a subsequent launch, never automatically promote a category or replay completed discovery.
- [x] T018 [US2] Reuse the root native SDK integration in `apps/mobile/src/features/advertising/advertising-privacy.ts`. Apply the current native age context, use UMP’s information/form APIs and `canRequestAds`, and keep native serving modes with the SDK. Use applicable native purpose choices only for the existing adult iOS ATT prompt. Retire the prepared ad on age, privacy or current-account eligibility changes without repeating unchanged installation preparation. Keep A09/A11 persistence and explicit privacy recovery with their existing owners.
- [x] T046 [US2] Remove obsolete consent-acknowledgement and tautological identity checks from `apps/mobile/src/features/privacy/components/age-correction-sheet.tsx`; retain mounted navigation ownership, actual installation persistence and independent native privacy readiness/failure. Run affected age/privacy/transition suites and keep the native validation scenarios in `specs/004-advertising-privacy-legal/quickstart.md` current. Installation preparation stays under T018, independent of account/entitlement arrival.
- [x] T019 [US2] Implement `apps/mobile/src/features/privacy/components/privacy-sheet.tsx` and connect it to `apps/mobile/src/features/accounts/screens/profile-screen.tsx`; make T014 pass with “Choix publicitaires” calling `AdsConsent.showPrivacyOptionsForm()` only for native `privacyOptionsRequirementStatus = REQUIRED`, and “Corriger mon âge” closing the menu before opening T016 in a dismissible short sheet. Cancel returns to privacy; no stacked sheet or text-entry form is introduced. Refresh native applicability after changes, retain the prior declaration on cancellation and keep private form lifetime tied to the actual native identity while the single SDK owner survives private subtree replacement. Bind T018 readiness/invalidation into the existing `apps/mobile/src/features/advertising/age-declaration-provider.tsx` without a second eligibility or ad owner.
- [ ] T020 [US2] Qualify actual age treatment, UMP choices, ATT refusal and privacy-options presentation on the [tested build](quickstart.md#scenarios-and-expected-outcomes). Under separate authorization configure European UMP targeted `Everywhere`, the required Meta partner consent settings and the single iOS ATT path. Verify Google and Meta independently using Ad Inspector on authorized test devices. Observe native close controls and inappropriate-ad reporting on iOS. Reuse applicable F13 composition and F09 account evidence. Keep real provider, unsupported cases and owner physical-device observations open until qualified.

**Checkpoint**: Local declaration and ordered native integration pass controlled tests. Complete US2 only with actual device/provider evidence; choices never change the ten-opening opportunity rule or certify worldwide compliance.

---

## Phase 5: User Story 3 — Read and maintain reliable legal documents (Priority: P1)

**Goal**: Publish three reviewed static HTML documents with the backend and open them in ordinary native integrated browsers without authentication or advertising.

**Scope**: A12–A15; FR-015–020; SC-005.

**Independent Test**: Read each complete document publicly, reject invalid content before release, preserve the last valid deployed content after failed delivery and distinguish missing/unavailable reading from acceptance.

### Tests for User Story 3

- [x] T021 [P] [US3] Write failing HTML routing/security tests in `apps/backend/src/test/java/com/blockout/backend/legal/LegalDocumentsWebMvcTest.java`: GET `/legals/imprint`, `/legals/privacy`, `/legals/terms` returns 200 UTF-8 text/html with consistent title/version/body/date, absent content returns a truthful 404 page, and standalone access remains unauthenticated through maintenance. Add no document JSON schema, write permission or broad security bypass.
- [x] T022 [P] [US3] Validate the three actual bundled resources in `apps/backend/src/test/java/com/blockout/backend/legal/LegalDocumentContentTest.java`: require complete content, consistent nonempty title, visible free-form version and a syntactically valid modification date, plus the external account-deletion direction. Their factual accuracy needs T024/T039 review. A version label imposes no increment rule or acceptance history.
- [x] T023 [P] [US3] Protect locked native presentation and unusable backend configuration in `apps/mobile/src/features/privacy/__tests__/open-legal-document.test.ts`. The actual profile actions in `legal-entry.test.tsx` own the three named public URLs, safe opening failure feedback and another explicit link press. `accounts/__tests__/public-account-links.test.tsx` owns the sign-in footer handoff; `advertising/__tests__/sporting-ad-entry.test.tsx` proves legal actions do not consume an advertising opportunity. Reuse F12's root admission tests for blocked in-app entry instead of repeating its gate matrix through legal links. Standalone URLs remain public, reading creates no acceptance, and the sporting PDF reader is not reused for HTML legal content.

### Implementation and qualification for User Story 3

- [x] T024 [US3] Write and review actual legal files in `apps/backend/src/main/resources/static/legals/imprint.html`, `privacy.html` and `terms.html`; make T022 pass and preserve the model constraints literally: “Three stable types: `imprint`, `privacy`, `terms`.”; “Each complete static HTML document contains its title, free-form version, current body and truthful modification date.”; “The privacy page contains the externally accessible account-deletion direction and operational rights contact.” Use verified controller/contact/processing facts, never fictional prototype text; include no advertising scripts/cookies, document-history UI or blanket-consent wording. Final mobile/store reconciliation is T039/T040, not proof supplied by these tests.
- [x] T025 [US3] Implement ordinary extensionless resource routing in `apps/backend/src/main/java/com/blockout/backend/legal/LegalDocumentsController.java` and the narrow public exceptions in F13's `apps/backend/src/main/java/com/blockout/backend/config/SecurityConfiguration.java`; make T021 pass with the bundled HTML, ordinary explicit missing-page handling and existing backend availability. Preserve the public privacy/deletion URL; add no legal service, CMS, mobile editing API or separate hosting promise.
- [x] T026 [US3] Implement `apps/mobile/src/features/privacy/open-legal-document.ts` with `WebBrowser.openBrowserAsync` and connect existing legal entry points through `use-legal-documents.ts`; make T023 pass using the iOS integrated browser and Android Custom Tabs for reading/loading/network/return controls. Keep native opening failure feedback at the original action with another explicit link press; no custom reader/read query/offline copy or interpretation of reading or continued sign-in as consent or new mandatory acceptance.
- [x] T027 [US3] Qualify A12–A15 locally through `specs/004-advertising-privacy-legal/quickstart.md#scenarios-and-expected-outcomes`: native opening failure and another explicit link press, reading/return, public deletion anchor, browser-owned missing/network failure and invalid-file rejection. Review truthful legal content under T039 before publication; local resource and browser checks establish no deployed publication outcome.

- [x] T044 [US3] Verify the designated Product Design Account sources follow FR-016 and the approved native-browser handoff, with current screens and the independent sporting reader intact. This establishes no native browser, UMP or legal-content qualification.

**Checkpoint**: Legal reading and resource validation work independently of ads. Public legal content needs verified real information; mobile/store declarations retain T039/T040 qualification and their explicit authorization.

---

## Phase 6: User Story 4 — Use sporting information without re-exposing restricted data (Priority: P1)

**Goal**: Apply targeted contact restrictions and current privacy obligations through existing domain and operational owners.

**Scope**: A16–A19; FR-021–027; SC-006.

**Independent Test**: Restrict one club contact while collection/editing races, then recollect/reactivate/restore. Source/manual/effective values remain absent without deleting sporting identities; current retention/rights apply before restored access and private diagnostics stay within their scoped purpose.

### Tests and case preparation for User Story 4

- [x] T028 [P] [US4] Reuse F02 T043/T048 coverage in `apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingPresentationIntegrationTest.java`, adding only missing F11 A16/A17 boundary cases before completing the manual procedure: restriction under the club lock clears source/manual/effective values, retains its current restriction, defeats collection/edit/return-to-source/reactivation and leaves unrelated sporting identity/history intact. Exercise existing generated contact consumers/null/conflict semantics, without a new F11 table, endpoint, collector instruction or generic referee/person suppression.
- [x] T029 [P] [US4] Reuse F13 safety tests in `apps/backend/src/test/java/com/blockout/backend/config/LoggingIntegrationTest.java` and `apps/mobile/src/shared/observability/__tests__/sentry.test.ts`, adding only missing F11 boundaries with synthetic data: no age, consent strings, ad identifiers, location, personal support content or raw provider objects in diagnostics. Preserve only F05's private original-target exception and safe ordinary integration-error context; no-fill/revenue/fill stay with provider reporting, with no custom advertising analytics.

### Integration and qualification for User Story 4

- [x] T030 [US4] Add the actual authorized club-contact restriction steps to `infra/operations/README.md` using F02's existing field-restriction transaction and current restriction/lock rules. Verify private request scope, clear rather than archive forbidden values and inspect current public/admin projections; source outage does not restore permission to expose a field. F02 owns enforcement under T048, while F11 owns purpose and manual rights handling; add no dedicated administration journey or second suppression mechanism.
- [ ] T031 [US4] Execute A16/A17/A19 through `specs/004-advertising-privacy-legal/quickstart.md#scenarios-and-expected-outcomes` after F01/F02/F03/F04 contact paths and F13 diagnostics exist, reusing T028/T029 and owner evidence. Verify restricted data stays absent through actual consumer reads, no advertising reuse of other category data, safe errors/secondary signals and authorized recipients only. Keep F05 original-target references private and only while their cleanup purpose or another obligation requires them, never in Discord or this repository.
- [ ] T032 [US4] Exercise A18 with isolated older PostgreSQL fixtures and F05/F07/F10 owners through `specs/004-advertising-privacy-legal/quickstart.md#scenarios-and-expected-outcomes`: reconcile current restrictions, erasures, rights and notification expiry before affected access/sends. Verify expired/known-purged inbox entries remain unavailable, preserve available non-personal announcement facts and retain F07’s exceptional-repeat limit if those facts were lost. Keep uncertain resources unavailable. These application checks select no infrastructure restoration, backup duration or log-storage duration.

**Checkpoint**: F11 verifies shared privacy boundaries without reimplementing F02/F05/F07/F13. Real restoration and consumer evidence remain required for full acceptance.

---

## Phase 7: User Story 5 — Be contacted after a report without sign-in (Priority: P1)

**Goal**: Qualify F10's existing private support journey against F11 contact, context, complete-receipt and retention requirements.

**Scope**: A20–A24; FR-028–034; SC-007.

**Independent Test**: Send synthetic guest/failed-login/unloaded-target cases with and without images. Only a complete private record succeeds; uncertain outcomes retain input for explicit retry, and declared identifiers/email provide no ownership authority.

### Case preparation for User Story 5

- [x] T033 [US5] Prepare the F11 A20–A24 fixture/expected-outcome mapping in `specs/004-advertising-privacy-legal/quickstart.md#scenarios-and-expected-outcomes`, referencing F10's owning tests and `specs/012-reports-feature-suggestions/quickstart.md` as they become executable. Cover required editable/prefilled email syntax without ownership proof, attempted target identity despite load failure, safe failed-login context, optional inspectable screenshots, partial/lost submission and secondary-alert failure. No second support form, transport, receipt lookup, test framework or duplicate implementation is introduced.

### Integration and qualification for User Story 5

- [x] T034 [US5] Extend existing private-support handling instructions in `infra/operations/README.md` with purpose-limited authorized GitHub/attachment access, replies to the supplied address and manual handling of incomplete/exceptional duplicate cases. Keep closure distinct from erasure, no periodic purge/post-closure deadline or independent Blockout support backup; explain that an applicable rights request covers the ticket and files even across provider locations and that account deletion/unlinking alone does not prove attachment erasure.
- [ ] T035 [US5] Execute T033 through the implemented F10 journey using `specs/012-reports-feature-suggestions/quickstart.md` with the F11 cases in `specs/004-advertising-privacy-legal/quickstart.md#scenarios-and-expected-outcomes`. Reuse F10 automated/native/private-provider runs to verify guest/failed-sign-in access outside all three F12 gates, complete content plus every selected image in one authorized record, retained input/explicit retry after lost response, accepted rare duplicates/manual closure and independent generic Discord signaling. Actual private attachment authorization/erasure must be qualified with approved synthetic cases before real use; no public attachment, auto-resend, dialogue UI or fictitious complete receipt.

**Checkpoint**: F10 owns the form/provider implementation and acceptance result. US5 completes when its real privacy/support evidence satisfies F11, not when a second support path is written.

---

## Phase 8: User Story 6 — Exercise rights without depending on an account (Priority: P1)

**Goal**: Provide truthful public information and proportionate manual handling of account, sporting-contact and support requests, with release settings matching actual processing.

**Scope**: A25–A27; FR-011, FR-021, FR-035–037; SC-008.

**Independent Test**: Walk synthetic account/contact/support requests through the operational contact, scope/identity check and affected recipients/copies, then reconcile actual release settings and published information without treating unfinished provider work as complete.

### Case preparation for User Story 6

- [x] T036 [US6] Prepare A25–A27 manual scenarios in `specs/004-advertising-privacy-legal/quickstart.md#scenarios-and-expected-outcomes`: operational no-account contact, proportionate ownership checks, account/contact/ticket/attachment copies, pending recipient action and communicated limits/extensions under applicable deadlines. Include every category in `specs/004-advertising-privacy-legal/spec.md#categories-purposes-and-responsibilities`; these cases are not a compliance certification or new request-management product.

### Implementation and qualification for User Story 6

- [x] T037 [US6] Document the actual manual rights procedure in `infra/operations/README.md`: identify purpose, necessary data, authorized recipients, active/provider copies and applicable retention; verify ownership proportionately without systematic identity documents or reliance on a reply address. Apply F02 restrictions, F05 original-target erasure and F10 ticket/file handling through their owners; keep F09 purchase evidence/decisions distinct from data requests/refunds. Communicate confirmed and pending outcomes or justified limits within applicable legal deadlines, explaining any authorized extension rather than creating a general on-call or ticket-response guarantee.
- [ ] T038 [US6] Qualify the prepared account/contact/support cases through `specs/004-advertising-privacy-legal/quickstart.md#scenarios-and-expected-outcomes` with the actual operational contact and authorized private tools. Verify failed recipient actions remain pending, inaccessible/erased-account requesters can still contact the operator and only necessary evidence is retained privately. Reuse F05/F10 original-target/attachment evidence and verify the standalone public deletion direction/contact here. The actual store-to-public-page association is qualified later by [F14 T048](../014-v1-v2-transition/tasks.md) and [F05 T038](../005-accounts-identity/tasks.md), after publication; it is not a prerequisite for this contact check. Add no portal, email-matching recovery or automatic repair workflow.
- [ ] T039 [US6] Reconcile and review `apps/backend/src/main/resources/static/legals/imprint.html`, `privacy.html` and `terms.html` against actual controller/contact, processing purposes/bases, recipients/transfers, retention criteria and rights/optional authorizations before publication. Check all specification matrix categories and the prominent direct-link deletion directions; use authoritative current facts and applicable rules at implementation time, with no fictional address, blanket consent or certification claim. Scope publication approval to the actual reviewed text and release, preserving the existing repository delivery workflow.
- [ ] T040 [US6] Under separate authorization verify actual audience, store declarations, EU27 new-download and Pro availability, and access/update continuity for supported existing users. Use one standard V2 AdMob interstitial and its Meta bidding placement per OS with real IDs, starting at **Google optimized / All prices**. Verify `app-ads.txt` on the store-listed domain and retain V1 seller entries while used. Use existing reporting to compare revenue, match rate and show rate by platform and source. Assess **High engagement** against available revenue-per-active-user and retention data before changing the setting. Reuse T020 and [F14 T048/T049](../014-v1-v2-transition/tasks.md#phase-6-user-story-4--cut-over-without-letting-v1-alter-the-new-state-priority-p1) for serving qualification, published continuity and authorized seller retirement.

**Checkpoint**: Rights handling and release information have actual evidence and authorized owners. Legal deadlines, provider acknowledgments and operational failure limits retain their distinct meanings.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T041 Update `README.md`, `AGENTS.md` and `specs/004-advertising-privacy-legal/quickstart.md` with actual implementation/test/configuration entry points as they are introduced, documenting touched handwritten APIs and meaningful private steps. Keep official imports intact, safe French accessible feedback and current owner references; operational/private evidence does not become another feature catalogue.
- [ ] T042 Run the F11 mobile/backend suites through `apps/mobile/project.json` and `apps/backend/project.json`, existing contact-consumer generation checks through `contracts/http/project.json`, and required repository verification. Confirm native declaration/SDK-event behavior, actual HTML routing/resources and current contact JSON semantics at their respective boundaries; static legal HTML adds no artificial generated client or JSON root.
- [ ] T043 Complete A01–A27/SC-001–008 acceptance using `specs/004-advertising-privacy-legal/quickstart.md`, the owning suites and actual device/provider/private-request/release evidence. Recheck representative approved age/privacy/search/browser fidelity, ordinary native session/ad invalidation and focused provider boundaries under [F13’s proportionate qualification](../003-shared-quality/plan.md#proportionate-qualification), reusing applicable deterministic/session/shared-UI evidence. Preserve privacy purpose limits and every story checkpoint; record passed, failed and unavailable outcomes. Leave unavailable qualification tasks open, and preserve no-callback restart, no-fill, backend availability and manual repair limits rather than inventing new guarantees. Reuse F14 T048/T049 published-availability and retired-seller evidence; T040 prepublication settings alone do not complete these outcomes.

---

## Dependencies & Execution Order

### Phase and owner dependencies

- Setup consumes F13's bounded executable foundation, selected native dependencies and test tools. T003–T004 establish the concrete eligibility boundary with controlled owner inputs; this does not wait for complete F05/F09/F12/F14 features.
- US1 T005–T008 can implement the counter/native-callback boundary with controlled eligibility and SDK events. T009/T010 require actual F03/F04/F06 and F07 sporting entries, F05 native identity/F09 entitlement/F12 admission, and US2's real native choices. No ad is activated solely because counter tests pass.
- US2 uses US1's invalidation boundary and F05's native identity/private-cache lifetime. T016/T017/T019 compose [F13 US6](../003-shared-quality/tasks.md#phase-9-user-story-6--use-the-application-with-the-phones-capabilities-priority-p2) T067–T069/T071 tokens/theme, controls and feedback before the age/privacy screens; F11 keeps the age-selector behavior and business patterns. T015 precedes form/access integration; T018 supplies native consent readiness and T019 connects it. F14 owns common discovery and branded composition, while T017 owns the separate mandatory age step; known Pro avoids unnecessary prompts and no advertising-age flag alters account eligibility. T020 needs actual F05/F09/F12/F14 integration, compatible native builds and authorized provider inputs. Physical observations follow their own prerequisites.
- US3 HTML/resource and browser work is independently developable after setup/foundation; F12 controls in-app entry, while the host-run backend serves the resources locally. T027 uses a host-run local backend; truthful legal text still requires T039 review. Static legal reading never waits for advertising consent.
- US4 T028 consumes F02 T043/T048 and existing generated contact boundaries. F11 supplies the manual purpose/request procedure, not a second field restriction. T031 requires relevant actual collection/projection/diagnostic consumers; T032 exercises older local fixtures against current F05/F07/F10 obligations.
- US5 prepares F11 cases independently; T035 depends on actual F10 form/complete-private-receipt/native attachment behavior and F12 gates. It reuses F10's qualification evidence, without transferring its provider implementation to F11.
- US6 prepares the manual request/release checks before running them; T038 needs actual F02/F05/F10/F14 procedures, T039 real processing/contact facts. F11 owns settings/content reconciliation; F14 owns activation/retirement sequencing and continuity.
- T041 progresses with executable changes. T042 runs the relevant existing targets after implementation/fixes; T043 requires real evidence for every applicable checkpoint. The absence of provider/device inputs leaves those tasks pending without blocking unrelated implementation.

```text
F13 foundation → Setup → current-context eligibility
                         ├→ US1 core T005–T008 → US2 choices/invalidation
F03/F04/F06/F07 + F05/F09/F12/F14 + US2 → US1 integration/native proof
                         ├→ US3 legal resources/browser → reviewed publication
F02 + F05/F07/F10/F13 ────┼→ US4 restriction/restore evidence
F10 + F12 ────────────────┼→ US5 private support evidence
actual rights/provider/store inputs → US6 reconciliation
all story evidence → final acceptance
```

### Parallel opportunities and examples per story

Parallel markers require completed prerequisites and distinct files. Serialize shared root composition, `age-declaration-provider.tsx`, operations instructions and quickstart edits. Cross-owner proof waits for the actual owner rather than creating replacement production code.

- **US1**: T005 and T006 cover related lifecycle suites. T007 covers independent entry points. T008 supplies the core; T009 integration and T010 native proof follow their explicit prerequisites.
- **US2**: T011–T014 test distinct storage/form/native-choice/privacy boundaries. After tests, local declaration/form work and native consent work can advance in different files, then T019 joins them before T020.
- **US3**: T021 routing, T022 content validation and T023 native-browser tests are independent. Once they fail meaningfully, backend files/routing and mobile handoff can be implemented independently; publication follows content/release review.
- **US4**: T028 contact-boundary coverage and T029 diagnostic safety concern different owner suites. T030 precedes actual manual qualification; T031 and T032 may use independently ready local consumer/older-data fixtures while sharing evidence with their owners.
- **US5**: T033 can prepare guest, failed-login and unloaded-target fixtures independently. T034 instructions precede T035 private-provider qualification; no parallel second support implementation is needed.
- **US6**: After T036/T037 preparation, authorized account/contact/support evidence for T038 can be collected independently through its owners. T039 legal-content review uses actual processing/contact facts and serializes shared-file edits.

## Implementation Strategy

1. Establish the bounded foundation, then US1's controlled frequency/callback MVP. Keep live advertising disabled until current choices and real provider prerequisites are qualified.
2. Add US2 local age and ordinary native consent/permission integration, then connect actual sporting transitions and qualify the shared lifecycle. Use one counter, one prepared ad and existing SDK/platform mechanisms throughout.
3. Deliver US3 static legal reading independently, and integrate US4/US5 privacy proof through their real owners rather than copying contact/support implementations. Complete release truthfulness before publishing the files.
4. Validate manual rights, provider/store declarations and V1/existing-user continuity through US6 and F14. Reuse local/native and authorized provider evidence across owners; complete acceptance only when each required outcome is demonstrated, with accepted limits intact.
