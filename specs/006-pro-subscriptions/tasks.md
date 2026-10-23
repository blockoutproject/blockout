---
description: "Implementation tasks for F09 Pro entitlements and subscription continuity"
---

# Tasks: F09 Pro entitlements and subscription continuity

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md) and [quickstart.md](quickstart.md).

**Prerequisites**: Accepted owning artifacts, [constitution](../../.specify/memory/constitution.md) and [agent guidance](../../AGENTS.md). Shared implementation comes from the bounded F13/F05 prerequisites below. Native/provider and continuity evidence remains unexecuted.

**Tests**: The specification explicitly requests A01–A30 and SC-001–009 qualifications. Automated behavior tests precede their implementation and must fail meaningfully first. Prepare manual/native cases before their associated setup; execute them only on authorized accounts/environments with actual prerequisites. Mocks, Test Store and document checks are distinct evidence.

**Organization**: Setup and foundation precede one phase per specification story, in priority order. F09 consumes native entitlement state and supplies narrow current-account presentation to F11/app chrome. It implements no backend rights service, HTTP operation, database model, generic billing abstraction or recovery queue. Writing these tasks performs no provider configuration or application implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]** marks distinct-file work that can run together after its prerequisites.
- **[USn]** retains the owning specification story identifier.
- Paths identify future implementation or existing qualification sources. Every task starts unchecked.

## Path Conventions

- Pro behavior and focused `__tests__/` live in `apps/mobile/src/features/pro/`; use upstream SDK types at that native boundary and small feature presentation types only where their meaning differs.
- Account/session and the shared invitation remain in F05's `apps/mobile/src/features/accounts/`, as resolved by its [native tasks](../005-accounts-identity/tasks.md). Reuse that owner rather than creating the second `account/` directory used illustratively in the F09 plan.
- Composition stays in `apps/mobile/src/app/_layout.tsx` and the existing profile. The thin `apps/mobile/src/app/pro.tsx` full-screen route hosts provider content only; there is no app-owned Pro page. Shared tokens/theme/controls stay F13-owned in `apps/mobile/src/shared/`.
- Actual provider/intervention instructions belong in `infra/operations/README.md`, with private evidence in the F10/F11 process. No public receipts, customer references, provider payloads or intervention records belong here.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Consume the existing mobile workspace and selected native SDK pair.

- [x] T001 Add paired `react-native-purchases` and `react-native-purchases-ui` 10.13.0 to `apps/mobile/package.json` and the existing lockfile after F13 T001–T017. Preserve their bundled native versions and the selected Expo SDK 58 / React Native 0.88 / React 19.3.0 stack; reuse Jest Expo/React Native Testing Library without a generic provider adapter, new state framework or direct native dependency override.
- [x] T002 Declare environment-selected native platform/Test Store key inputs, the explicit V2 offering identifier and the identified Customer Center F10 Custom Action in `apps/mobile/.env.example` and `apps/mobile/app.config.ts`. Keep provider identifiers as deployment configuration, use dedicated test accounts in the existing project and retain native sandbox access `Anybody`; never ship a Test Store key in a production candidate. Actual provider changes and production-identity checks belong to T026/T027 and F14, not this setup.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the one current-account state agreement before story implementation, without waiting for complete cross-feature journeys.

- [x] T003 Write failing state-consumption tests in `apps/mobile/src/features/pro/__tests__/pro-state.test.ts`: guest, association pending/failed, no usable state, SDK-active paid/gifted, SDK-inactive, unknown native values and pending/uncertain operations remain distinct. A failed read never fabricates inactivity; a cancelled/pending operation removes no independent valid entitlement. Verify meaningful current-session attribution using controlled F05 generation inputs, not a new session registry.
- [x] T004 Define the narrow state boundary in `apps/mobile/src/features/pro/pro-state.ts` and `apps/mobile/src/features/pro/index.ts`, making T003 pass with native `CustomerInfo.entitlements.active["Blockout Pro"]` as authority. Preserve the model literally: usable account context — “Available only after usable-account establishment. No email-derived ID. Changing session clears previous rights/UI and rejects its callbacks.”; entitlement — “SDK owns active/inactive status, cache and expiry. Show only known information; do not calculate an independent grant union or expiration deadline.” Reuse upstream SDK types rather than copying editable DTOs, expose only the current state needed by consumers and persist no derived entitlement.

**Checkpoint**: The state boundary can be tested with controlled collaborators. All stories require this foundation; actual session association is implemented in US1.

---

## Phase 3: User Story 1 — Understand my access and recover my benefits (Priority: P1) 🎯 MVP

**Goal**: Associate the usable account safely, keep public sport independent of Pro and provide the approved guest entry.

**Scope**: A01–A05; FR-001–006, FR-010, FR-016–017, FR-033; SC-001.

**Independent Test**: Cross current entitlement states with public sporting access and F11 eligibility, then delay identity/read completions across A → guest → B and A → guest → A. Guest sign-in neither reopens Pro nor retains purchase intent. Actual transaction and cross-platform proof completes with US3/US4.

### Tests for User Story 1

- [x] T005 [P] [US1] Write failing identity/lifecycle tests in `apps/mobile/src/features/pro/__tests__/pro-session.test.tsx` with controlled native promises and the real F05 generation boundary when available: configure only after a usable UUID, at most one in-flight native identity call, latest-target association after the prior call settles, skipped superseded targets, immediate local rights/UI clearing and current-target failure requiring explicit retry. Cover A → B, A → guest → B, A → guest → A, logout during configuration, accepted erasure, late reads and component cleanup; filtering a promise alone must not leave overlapping native identity mutations.
- [ ] T006 [P] [US1] Write failing consumer tests in `apps/mobile/src/features/pro/__tests__/pro-access.test.tsx` against the implemented F03/F11 consumers, controlling only their native/network boundaries: every entitlement state leaves pool maps and complete club calendars accessible, with no verification wait or purchase interruption. Active paid/gifted suppress ads, unknown signed-in state suppresses ads and repurchase, inactive state delegates remaining eligibility to F11, and guests inherit no old exemption; personal/admin admission remains owner-controlled.
- [x] T007 [P] [US1] Write failing semantic entry tests in `apps/mobile/src/features/pro/__tests__/pro-entry.test.tsx` for the profile's distinct Pro icon/row before Privacy, guest invitation copy without prices or provider lookup, dismissal preserving context and ordinary sign-in without a saved purchase/restore/reopen intention. Use controlled native presentation until US3, and test session change closing that presentation without claiming a store cancellation.

### Implementation and qualification for User Story 1

- [x] T008 [US1] Implement the focused native identity owner in `apps/mobile/src/features/pro/pro-session.ts`, using configure once, later native `logIn` and `logOut` successively. Preserve “Native identity calls complete successively; only successful current-session association permits rights/operations. Native logout may create an anonymous ID, which gives no Blockout guest rights or purchase permission.” Keep only the current desired session and one in-flight identity call in memory, apply the latest target after settlement, and leave failed current association unavailable until explicit retry. Never block F05 local logout/navigation, automatically recreate an erased business account or add an identity queue/journal/retry service; make T005 pass.
- [x] T009 [US1] Compose the owner in `apps/mobile/src/features/pro/pro-provider.tsx` and `apps/mobile/src/app/_layout.tsx`, consuming F05's usable UUID/current generation through its public session boundary. Read current native information after successful association and publish only while that same session is current; clear prior rights and unmount provider UI immediately on session change, including re-entry to the same UUID. Expose T004's narrow state/commands to actual consumers without a second backend or Query entitlement cache; F05 T019 retains lifecycle publication ownership.
- [x] T010 [US1] Implement Pro entry composition in `apps/mobile/src/features/pro/components/pro-entry.tsx` and connect `apps/mobile/src/features/accounts/screens/profile-screen.tsx`. Reuse/complete the single F05-owned invitation in `apps/mobile/src/features/accounts/components/sign-in-invitation.tsx` with its approved artwork and Pro-specific copy, using F13 T067–T069/T071 controls and tokens. Make T007 pass; signed-in entry delegates to the official provider UI route host implemented in T025, without creating a Pro page or duplicating account authentication/privacy/support behavior.
      **Completion boundary**: Guest and connected entry wiring now use the shared invitation and the native full-screen host. `pro-entry.test.tsx` and `pro-presentation.test.tsx` cover the navigation/session boundary with native I/O doubles. T006/T011 require their actual [F03](../007-sporting-consultation/tasks.md) and [F11](../004-advertising-privacy-legal/tasks.md) consumers; [T029/T032](#phase-6-user-story-4--restore-a-purchase-and-obtain-verified-assistance-priority-p1) own the real F10 handoff after [F10 T013/T014](../012-reports-feature-suggestions/tasks.md). These local checks establish no native/store qualification.

- [ ] T011 [US1] Integrate the implemented F05/F11/F03 owners for the applicable T006 scenarios and make `apps/mobile/src/features/pro/__tests__/pro-access.test.tsx` pass; reuse F05 T017/T019 session-consumer and F11 T003/T004 eligibility evidence. Verify actual public consultation remains independent, known Pro avoids unnecessary advertising prompts under F11 and paid/gifted rights never acquire extra sporting benefits. These integrations wait only for the relevant owners, not their complete feature delivery.
- [ ] T012 [US1] Execute identity/account-switch cases from `specs/006-pro-subscriptions/quickstart.md#scenarios-and-expected-outcomes` on physical iOS/Android with the actual F05/F14 initialization and US3/US4 operations. Verify same-account recovery across devices/platforms, delayed login/logout/read/purchase/restore, immediate guest navigation and no old-session rights/dialogs; record actual native pending-transaction behavior rather than inferring store cancellation or reassignment from callback filtering. Reuse F05 T020 evidence.

**Checkpoint**: US1 supplies the controlled-behavior MVP. Full native purchase/restore and sporting-consumer evidence remains explicitly dependent on its named owners.

---

## Phase 4: User Story 2 — Continue during an outage without retaining an entitlement indefinitely (Priority: P1)

**Goal**: Use ordinary SDK refresh/cache behavior with honest unavailable state and explicit recovery.

**Scope**: A06–A11; FR-003–011, FR-027, FR-031, FR-033; SC-002–003, SC-008.

**Independent Test**: Supply cached active/inactive and unavailable state, disable renewal while rights remain active, expire/revoke a grant, then delay update events across account changes. Only current native evidence governs rights; no elapsed-time rule makes unknown state free.

### Tests for User Story 2

- [x] T013 [P] [US2] Write failing refresh tests in `apps/mobile/src/features/pro/__tests__/pro-refresh.test.tsx` for ordinary entry/foreground/explicit retry/completed-operation reads and listener registration/removal. A delayed A event after B association signals a current native read rather than publishing its payload; events during association need no replay because association reads current state. Reject late read results, preserve SDK-supplied cached state and leave SDK expiry/active grace authoritative without timers, forced invalidation or independent end-date arithmetic.
- [x] T014 [P] [US2] Write failing degraded-presentation tests in `apps/mobile/src/features/pro/__tests__/pro-verification.test.tsx` for association failure/no usable state, retry success/failure, renewal disabled with active rights, active billing grace and inactive/expired/revoked outcomes. No unknown state shows ads, repurchase or previous-account chrome; sport and existing support remain reachable, and a technical failure never becomes a false cancellation or inactivity result.

### Implementation and qualification for User Story 2

- [x] T015 [US2] Extend `apps/mobile/src/features/pro/pro-provider.tsx` with the SDK's standard update listener and ordinary current-information reads at entry, foreground, explicit retry and operation completion; clean subscriptions up with their owner. Scope every accepted read to the successfully associated F05 generation, treat listener payloads only as read signals, and make T013 pass without polling, forced network refresh, a server-push promise, a refresh clock or a persisted evidence timestamp.
- [x] T016 [US2] Implement the existing verification/retry presentation in `apps/mobile/src/features/pro/components/pro-verification.tsx`, consuming F13 feedback and the current owner state. Make T014 pass with explicit retry/support and no encouragement to purchase while rights are unavailable; preserve independent active rights and separate operation uncertainty. T025 composes this app-owned state with native UI; closing a failed Customer Center uses the existing profile support entry, not a rebuilt provider error screen.
- [x] T017 [US2] Add safe operational context at the existing native boundary in `apps/mobile/src/features/pro/pro-session.ts` and `apps/mobile/src/features/pro/pro-provider.tsx`, using F13's selected diagnostic path for real association/read failures and pending/uncertain outcomes. Distinguish verification recovery from eventual provider propagation, exclude customer IDs, receipts, complete SDK objects, secrets and raw error payloads, and avoid duplicate logs, new telemetry or a human-response/propagation deadline. Ordinary cancellation remains an ordinary outcome.
- [ ] T018 [US2] Execute outage/cache/listener/foreground cases in `specs/006-pro-subscriptions/quickstart.md#scenarios-and-expected-outcomes` using actual native builds and controlled connectivity on both platforms. Observe cached active/inactive, no-state startup, current-account event attribution and refresh after effective changes; verify unrelated public navigation and F11 eligibility. Record unavailable provider/device cases as pending, not as behavior established by T013/T014 doubles.

**Checkpoint**: SDK state remains authoritative through degraded operation; native lifecycle evidence is distinct from local state tests.

---

## Phase 5: User Story 3 — Purchase and manage my subscription without ambiguity (Priority: P1)

**Goal**: Present the explicit native V2 offer and supported management, while distinguishing payment from activation.

**Scope**: A12–A16; FR-001, FR-005–008, FR-012–018, FR-031–034; SC-004, SC-008–009.

**Independent Test**: Open available/missing/failed offers for eligible and ineligible contexts, then cancel, defer, confirm or interrupt a purchase. Only current active rights announce activation; management and dismissal preserve the profile and support route.

### Tests and qualification cases for User Story 3

- [x] T019 [P] [US3] Write failing offer tests in `apps/mobile/src/features/pro/__tests__/pro-offering.test.ts` for explicit configured V2 selection, localized native terms, absent offering versus failed lookup, guest/active/unknown ineligibility and current-session rejection. No hard-coded 1.99 EUR display, implicit `current` fallback, retained purchase intent or automatic payment is allowed; native products/entitlement remain the existing ones.
- [x] T020 [P] [US3] Write failing purchase-outcome tests in `apps/mobile/src/features/pro/__tests__/pro-purchase.test.tsx` using the installed SDK callback types: cancellation, pending, definite failure, uncertainty, confirmed payment with verification unavailable and current active entitlement remain distinct. Cover lost responses, repeated actions/already-owned purchase, independent gifts/paid rights, account change and restart; announce only established ad-free activation without requiring restart or inviting blind repurchase.
- [x] T021 [P] [US3] Write failing provider-host tests in `apps/mobile/src/features/pro/__tests__/pro-presentation.test.tsx` for official Paywall/CustomerCenterView mounting, explicit offering, dismissal navigation, account-change unmounting and current callback guards. Assert Blockout-owned navigation/lifecycle with controlled SDK components; native focus, provider content and store behavior belong to T022 qualification. Management remains accessible independently of purchase; paid/gifted/unknown information uses only supported fields, original-store management can be unavailable, and the existing profile support entry survives provider loading failure. Use controlled F10 navigation until US4.
- [x] T022 [P] [US3] Prepare the native purchase/management and production-candidate cases in `specs/006-pro-subscriptions/quickstart.md#scenarios-and-expected-outcomes`, including actual localized products/terms, pending/confirmed payments, V1 coexistence, no-purchase Customer Center, unknown review-account UUIDs and both platform sandbox keys. Separate Test Store evidence, native billing evidence and F14's full population/pricing activation obligations before authorized configuration.

### Implementation and qualification for User Story 3

- [x] T023 [US3] Implement explicit offering retrieval in `apps/mobile/src/features/pro/pro-offering.ts` using current native SDK information and T002 inputs; make T019 pass. Preserve “Only a usable account with inactive rights can be encouraged to purchase. Missing/failed lookup has no fallback price. No new product/price source.” Use existing products and `Blockout Pro` for the V2 offering, leaving F14's native launch-price/cohort changes and V1 presentation intact.
- [x] T024 [US3] Implement current-session purchase callbacks/outcome handling in `apps/mobile/src/features/pro/pro-operations.ts`, making T020 pass through the official SDK/UI results and current entitlement reads. Preserve “Separate from entitlement. A successful restore without active Pro is not activation. No persistent journal or recovery queue; restart re-establishes native state.” Keep cancelled, pending, definite failure, uncertainty and confirmed-but-unverified payment understandable; disable duplicate explicit starts while in flight and direct already-owned/uncertain outcomes to recognition, restoration or support without replaying payment.
- [x] T025 [US3] Implement `apps/mobile/src/features/pro/screens/pro-presentation-screen.tsx` and its thin `fullScreenModal` route with `headerShown: false`, hosting only official `RevenueCatUI.Paywall` or `RevenueCatUI.CustomerCenterView` with ordinary `flex: 1`. Connect T010 entry, T016 verification state, T023 explicit `offering` and T024 callbacks. Make T021 pass with native `onDismiss`, current-session unmounting and the identified Custom Action callback boundary using T021's controlled F10 navigation. Keep provider content, origin/validity/renewal details and original-store management native; no Blockout Pro page/chrome, Sheet, keyboard wrapper, retention questionnaire, refund editor or second support channel. A session change removes the view without asserting transaction cancellation. T032 owns binding the production F10 route.
      **Delivery boundary**: T025 delivers the official host and controlled `onSupport` boundary. The production route leaves it unbound until [F10 T013/T014](../012-reports-feature-suggestions/tasks.md) supply the destination; [T029/T032](#phase-6-user-story-4--restore-a-purchase-and-obtain-verified-assistance-priority-p1) own that real handoff and the independent profile fallback. Their requirements remain pending, with no form, dead route or production no-op added here. This separates host construction from its later F10 integration without claiming native/store qualification.

- [ ] T026 [US3] With separate provider authorization, configure/verify the existing project's V2 offering/paywall and Customer Center and document only operational steps/configuration names in `infra/operations/README.md`. Retain existing products/entitlement and `Transfer to new App User ID`; use ad-free-only copy excluding external video ads, leave Customer Center's purchase offering unset, disable Contact Support/in-app tickets and retention flows, and provide supported restore/F10 Custom Action paths including no active purchase. Check shared Customer Center configuration against V1 before publishing it; preserve `Sandbox testing access: Anybody`, with no new project, tier or provider subscription. Actual customer/configuration evidence stays private.
- [ ] T027 [US3] Execute T022 through `specs/006-pro-subscriptions/quickstart.md#evidence-and-release-boundary` on physical iOS/Android with both native sandboxes and the F14 production-identity candidates. Verify actual purchases, pending interruption/current-session behavior, original-store management, gift/unknown rendering, reviewer access and platform keys with no Test Store key in production. Verify store notifications, mappings, localized availability and the F11 distribution boundary with F14; the 1.99 EUR new/existing-subscriber activation and full historical reconciliation remain F14-owned. A provider preview, mock or single purchase does not establish continuity/store approval.

**Checkpoint**: The native purchase/management journey has local behavior evidence; release still requires its actual two-store qualification and F14 continuity conditions.

---

## Phase 6: User Story 4 — Restore a purchase and obtain verified assistance (Priority: P1)

**Goal**: Restore explicitly through the native provider and use the existing private assistance process for unsupported or uncertain cases.

**Scope**: A17–A24; FR-005–008, FR-010, FR-016–026, FR-028, FR-031–034; SC-005–006, SC-008.

**Independent Test**: Distinguish no applicable purchase, current active restoration and uncertainty; then qualify receipt-wide transfer, original-store limitations and delete/recreate with actual owners. Insufficient evidence authorizes neither a transfer nor a compensatory gift.

### Tests and qualification cases for User Story 4

- [ ] T028 [P] [US4] Write failing restore tests in `apps/mobile/src/features/pro/__tests__/pro-restore.test.tsx` for explicit usable-account action independent of purchase, unavailable association/retry, no applicable purchase, active restored rights and successful operation without active rights. Explain possible purchase association without repeated systematic confirmation; reject late responses across A → B/A → guest → A and never replay an interrupted restore automatically or claim it recovers profile data/gifts.
- [ ] T029 [P] [US4] Write failing assistance navigation tests in `apps/mobile/src/features/pro/__tests__/pro-assistance.test.tsx`: only the identified native Custom Action closes Pro before opening the existing F10 form, stale callbacks cannot open it for another session, and receipts/customer payloads are not attached. Cover original-store unavailability and a failed Customer Center followed by closure and the independent profile support entry; respect current F12 gates without requiring successful RevenueCat or authentication for ordinary support.
- [ ] T030 [US4] Prepare assisted-recovery and two-store lifecycle cases in `specs/006-pro-subscriptions/quickstart.md#scenarios-and-expected-outcomes`: corroborated purchase/recipient/validity, contradictory or insufficient evidence, unsafe independent-entitlement effects, unknown provider outcome and unsupported cross-store operations. Identify the actual F05 erasure, F10 private process, F11 rights safeguards and F14 historical-reference prerequisites; synthetic cases can prepare the process but prove no real transfer.

### Implementation and qualification for User Story 4

- [ ] T031 [US4] Extend `apps/mobile/src/features/pro/pro-operations.ts` and `apps/mobile/src/features/pro/screens/pro-presentation-screen.tsx` with supported native restoration and immediate consumption of its current-account entitlement result. Make T028 pass without requiring an offer/purchase first; allow signed-in active, inactive and unknown-rights accounts to find restore/support while unavailable association prevents execution with explicit retry. Accept receipt-wide provider scope, keep operation success distinct from activation and introduce no profile merge, independent verification endpoint or new confirmation workflow.
- [ ] T032 [US4] Bind T025's `onSupport` boundary in the production Pro route and complete the F10 navigation handoff in `apps/mobile/src/features/pro/screens/pro-presentation-screen.tsx` and `apps/mobile/src/features/accounts/screens/profile-screen.tsx`, after [F10 T013/T014](../012-reports-feature-suggestions/tasks.md) supply the real support destination. Only the identified native Custom Action for the current F05 session replaces Pro with that existing F10 route; close Pro before opening the form, reject stale callbacks and implement no second form. Make T029 pass with no automatically attached SDK/receipt evidence and an independent profile fallback after native UI failure. This task owns the production assistance handoff; T025's host construction does not wait for it. Actual sending, privacy storage and manual replies remain F10/F11-owned.
- [ ] T033 [US4] Add the bounded recovery procedure to `infra/operations/README.md`, referencing the private F10/F11 process: owner-only verification of request, authenticated usable recipient, actual purchase/current validity and corroborating ownership; inspect both beneficiaries/independent entitlements before and after a supported intervention. Keep request/operator/reason/necessary evidence/date/scope/outcome privately, explain missing evidence or refusal without disclosing another customer, reread uncertain results before repetition and use provider support for unsupported scope. No email-based merge, automatic gift, indefinite evidence retention or promised transfer of individual receipt purchases; later restoration by the paying store account can transfer again.
- [ ] T034 [US4] Execute T030 with actual F05 erasure/recreation, F10 assistance and F14 retained historical references through `specs/006-pro-subscriptions/quickstart.md#scenarios-and-expected-outcomes`, separately for Apple and Google. Observe both accounts after native refresh, same-account cross-platform recovery, unsupported cross-store assistance, receipt-wide effects and paid-only recovery after deletion, including failed/concurrent cleanup with ordinary manual resolution. Verify no old profile/follows/attribution/personal grants/gifts return, no billing cancellation or cleanup-pending gate is inferred, and actual Auth0-principal age stays F05-owned. Complete independent-gift cases with US5 and reuse evidence instead of duplicating runs.

**Checkpoint**: Local restoration and navigation tests pass independently; real transfer/erasure/assistance qualification requires the named owners and authorized environments.

---

## Phase 7: User Story 5 — Grant and withdraw a gifted benefit without changing billing (Priority: P2)

**Goal**: Use owner-only native console operations and SDK state without a Blockout gift ledger.

**Scope**: A25–A29; FR-002, FR-004, FR-007, FR-009, FR-022, FR-027–031, FR-034; SC-007–008.

**Independent Test**: Grant/change/expire/revoke temporary and open-ended gifts alongside valid paid rights, then transfer and erase/recreate. Billing and independent rights remain intact; only observed current provider results are reported.

### Tests and qualification cases for User Story 5

- [ ] T035 [P] [US5] Write failing gift-consumption tests in `apps/mobile/src/features/pro/__tests__/pro-gifts.test.tsx` with controlled supported SDK results: paid plus gifted, gift-only temporary/open-ended, expired/revoked and unknown information. Use the actual T004/T015/T025 consumers; never derive a grant union, billed renewal, duration extension or immediate propagation promise, and preserve independently active rights when a gift ends.
- [ ] T036 [P] [US5] Prepare the owner-console grant/change/revoke cases in `specs/006-pro-subscriptions/quickstart.md#scenarios-and-expected-outcomes`, including ambiguous beneficiary, failure/uncertainty, subscription coexistence, original-recipient retention on transfer and failed cleanup followed by a new UUID. Use only authorized dedicated accounts, and reuse US4's transfer/erasure evidence when it exercises the same boundary.

### Implementation and qualification for User Story 5

- [ ] T037 [US5] Extend `infra/operations/README.md` with supported owner-console gift operations, making the model explicit: “Owner-only, verified recipient/scope, reread uncertain outcomes before repeating. No Blockout gift ledger; no sensitive evidence in public artifacts.” Record explicit expiry/no expiry and final validity in the existing private process without implicitly adding durations; verify paid rights/billing before and after, distinguish request/confirmed/failure/uncertain, and preserve T033's evidence restrictions. RevenueCat Support has broader powers than gifts; no Blockout moderator/support-record permission delegates these operations. No application gift API, administration screen or automatic compensatory grant is added.
- [ ] T038 [US5] Execute T036 with both native platform consumers through `specs/006-pro-subscriptions/quickstart.md#scenarios-and-expected-outcomes`, making T035 pass against supported native output and recording actual promotional rendering, expiry, change/revoke and refresh behavior. Confirm gifts neither suspend billing nor transfer as purchases nor reappear on a new business UUID, and failed cleanup remains a private manual original-target obligation. F14 rechecks the owner's no-V1-gifts premise at cutover; no migration engine or assumed population proof follows from these samples.

**Checkpoint**: Gift operations remain native/manual, with evidence of their actual effect on current mobile state and independent billing.

---

## Phase 8: User Story 6 — Recognize my Pro experience without losing sports context (Priority: P2)

**Goal**: Supply current Pro presentation to the shared theme without changing sporting colors or adding capabilities.

**Scope**: A16, A30; FR-005, FR-017, FR-033, FR-035; SC-009.

**Independent Test**: Cross paid/gifted/cached-active, inactive/expired, guest and unknown state with live system light/dark changes, then change the account or native entitlement. Gold stays subtle in neutral chrome and never replaces division/match treatments.

### Tests and qualification cases for User Story 6

- [x] T039 [P] [US6] Write failing current-session appearance tests in `apps/mobile/src/features/pro/__tests__/pro-appearance.test.tsx`, using the actual Pro state and F13 theme boundary. Verify accent removal on sign-out, accepted deletion, failed reassociation, A → guest → A and reliable entitlement loss; unknown/inactive/guest never inherit gold, cached SDK-active remains active, and system appearance changes preserve navigation/forms without changing sporting context or capabilities. Extend existing session assertions rather than create a second entitlement cache/test framework.
- [x] T040 [P] [US6] Prepare exact approved guest/Pro entry and neutral/sporting comparison cases in `specs/006-pro-subscriptions/quickstart.md#scenarios-and-expected-outcomes`, using the specification's Figma references and F13 T066/T073. Cover both platforms/themes, live system changes, compact width, enlarged French text, VoiceOver/TalkBack, reduced motion, safe areas/back/focus and native provider layouts; provider rendering is qualification evidence, not a reason to rebuild it.

### Implementation and qualification for User Story 6

- [x] T041 [US6] Connect current SDK-active presentation from `apps/mobile/src/features/pro/index.ts` at `apps/mobile/src/app/_layout.tsx` to F13's existing theme/consumer props, making T039 pass. Reuse F13 T067/T068 semantic tokens and system appearance plus F02 sporting context; shared modules never import Pro internals. Supply no accent for guest/inactive/unknown/old-session state, persist no membership decision and create no feature theme provider, palette or selector.
- [ ] T042 [US6] Execute T040 on physical iOS/Android through `specs/006-pro-subscriptions/quickstart.md#evidence-and-release-boundary`, reusing F13 T073 and the actual owner screens. Compare app-owned invitation/entry/chrome to exact approved Figma nodes, qualify native Paywall/Customer Center readability/dismissal/accessibility separately, and verify immediate previous-account accent removal plus unchanged match/division colors in both appearances. Document justified native adaptations and unavailable evidence; material visual changes retain the existing approval gate.

**Checkpoint**: Premium recognition is current-account presentation only; local tests do not certify visual fidelity or native provider accessibility.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Reconcile delivered behavior and its actual qualification without converting future evidence into completion.

- [ ] T043 Review touched code in `apps/mobile/src/features/pro/`, account/root integrations and `infra/operations/README.md` against the applicable React/native/testing, code-documentation and logging guidance. Keep native type signatures current to the selected SDK, meaningful safe failure ownership, French accessible feedback, feature-local responsibilities and no speculative wrapper, persisted rights, transaction journal or automatic recovery.
- [ ] T044 Run the actual mobile formatting/lint/typecheck/Jest targets declared in `README.md`, affected F05/F11/F13 integration tests, Expo Doctor and relevant native build/launch checks for the SDK/configuration changes in `apps/mobile/package.json` and `apps/mobile/app.config.ts`. Verify paired versions, ignored native/generated outputs and both supported platform floors; record unavailable devices/store checks separately rather than invent commands or certify Expo Go/browser mocks.
- [ ] T045 Reconcile A01–A30 and SC-001–009 evidence in the normal delivery records against `specs/006-pro-subscriptions/quickstart.md` and `specs/014-v1-v2-transition/quickstart.md`, retaining incomplete qualifications unchecked. Supply F14 the bounded native results for actual identities, offer/mapping/notification settings, receipts and independent gifts; F14 owns full population reconciliation, historical-reference preservation and price/cohort/publication changes. F11 privacy/restoration restrictions remain effective before restored data is exposed; an older state never regrants revoked rights. Keep sensitive evidence private and run the repository documentation checks and diff hygiene without claiming launch/provider approval.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup**: T001 precedes T002. Consume F13 T001–T017, not completion of all shared operations.
- **Foundation**: T003 precedes T004; both precede story implementation. F05 T003/T004 supplies the sole session-generation boundary. Controlled inputs permit isolated development before actual usable-account establishment.
- **US1**: T008 precedes T009. T010 uses the actual F05 account/invitation owner and F13 T067–T069/T071 UI. The delivered guest entry precedes US3; the remaining connected portions of T007/T010 complete with T025, rather than blocking construction of their own host. T006/T011 complete together after the relevant actual F03/F11 consumers exist. T005 and the ready portions of T007 can use controlled native boundaries; T006 tests the real consumers. T012 requires real F05/F14 initialization and US3/US4 native operations, not a fabricated earlier qualification.
- **US2**: T013/T014 can be written together after foundation; T015 extends the US1 owner, then T016/T017 complete the boundary. T018 uses actual native state and its relevant consumers; it need not wait for every later release operation.
- **US3**: T019–T022 can run together after foundation. T023 and T024 follow their tests; T025 consumes the delivered guest/profile entry, US2 verification and shared UI, completing the connected T007/T010 wiring and tests in the same implementation. Its controlled assistance boundary does not wait for the production F10 binding owned by T029/T032. T026 requires prepared cases and separate provider authorization; T027 requires actual native/store candidates and applicable F14/F11 inputs.
- **US4**: T028–T030 prepare distinct files after foundation. T031 extends T024/T025; T032 completes the actual F10 handoff. T033 defines only the Pro-specific use of F10/F11's private process. T034 waits for the actual relevant F05/F10/F14 owners, with independent-gift execution completed alongside US5.
- **US5**: T035/T036 can run together. T037 extends the existing T033 operating instructions; T038 needs actual SDK/UI and authorized console access, reusing T034 where scenarios coincide. These console capabilities introduce no new mobile/backend subsystem.
- **US6**: T039/T040 can run together after foundation and shared theme readiness. T041 uses US1/US2's actual state and F13's existing public theme contract; T042 needs the actual UI/owners, and supplies rather than duplicates F13 native evidence.
- **Polish**: T043–T045 reconcile implemented scope after its checks. An unavailable qualification remains unchecked; ready independent work may continue.

### Cross-Feature Ownership

- [F05](../005-accounts-identity/tasks.md) owns usable UUIDs, session generation, authentication/invitation, local-first erasure and original-target cleanup. F09's native identity calls consume session changes and never hold up F05 logout. Full F05 consumer qualification and F09 transaction qualification follow their implementations; neither requires the other feature wholly complete to start.
- [F13](../003-shared-quality/tasks.md) owns workspace/native tooling, shared tokens/system theme/controls and diagnostics. F09 supplies current Pro presentation; F02 owns sporting colors. F13's backup/operations and all-consumer validation are not prerequisites for the first Pro slice.
- [F11](../004-advertising-privacy-legal/tasks.md) consumes current rights and owns all remaining ad/privacy eligibility, distribution and private evidence restrictions. F09 does not duplicate its ad counter, consent or age logic.
- [F10](../012-reports-feature-suggestions/plan.md) owns the one support form and private complete-receipt process. Controlled navigation supports early Pro tests; real assistance qualification waits for that implemented destination and its private-provider evidence.
- [F14](../014-v1-v2-transition/plan.md) owns early installation initialization, production identities, historical-population reconciliation, indispensable references, store price/cohort changes and activation. Early initialization is an actual runtime prerequisite; the full cutover is not an authoring or isolated implementation prerequisite. Native/provider mutations need their applicable authorization.

### Parallel Examples by Story

- **US1**: T005 identity tests, T006 access tests and T007 entry tests are distinct files. Implement T008 before T009; do not parallelize edits to their shared owner.
- **US2**: T013 listener/cache tests and T014 degraded-presentation tests can proceed together. T015/T017 both touch the provider and are serialized.
- **US3**: T019 offering, T020 payment and T021 provider-host tests can proceed together while T022 prepares native cases. T025 consumes their implemented boundaries.
- **US4**: T028 restoration tests and T029 assistance tests can proceed together; T030 prepares manual cases. T031/T032 edit the same provider host sequentially.
- **US5**: T035 gift-consumption tests and T036 console qualification cases are independent. T037 follows the existing private recovery procedure; T038 is an authorized actual qualification.
- **US6**: T039 appearance behavior and T040 native comparison preparation are independent. T041 precedes actual T042 evidence.

Shared-file edits, especially `pro-provider.tsx`, `pro-presentation-screen.tsx`, root composition, the profile, quickstart and operations instructions, are serialized across stories even when their tests are parallelizable.

## Implementation Strategy

1. Deliver setup/foundation and US1's controlled MVP: current-account association, state isolation, free public sport and guest invitation. Do not advertise native transaction/continuity proof before the corresponding qualifications.
2. Add US2 SDK lifecycle/degraded behavior, then US3 explicit native offer/management and US4 restoration/assistance. Verify each local increment before qualifying its real dependencies.
3. Add US5 owner-console evidence and US6 shared-theme consumption; reuse the same native runs when they establish identical boundaries for F05/F11/F13/F14.
4. Complete the applicable two-store/device/private-support evidence and cross-feature checks before release. Leave unavailable evidence explicit; no task list, mock or passing documentation CI authorizes provider changes, production activation or an unreviewed recovery mechanism.
