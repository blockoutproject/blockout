---
description: "Implementation tasks for F05 accounts, sessions and erasure"
---

# Tasks: F05 accounts, sessions and erasure

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md) and [quickstart.md](quickstart.md), for [#85](https://github.com/blockoutproject/blockout/issues/85) under [#82](https://github.com/blockoutproject/blockout/issues/82).

**Prerequisites**: Accepted owning artifacts, [constitution](../../.specify/memory/constitution.md) and [agent guidance](../../AGENTS.md). The selected stack and approved design remain applicable. This file schedules future implementation; its creation performs no runtime setup, provider configuration or destructive qualification.

**Tests**: The specification explicitly requests A01–A32 and SC-001–008 qualification. Write the automated tests below before their corresponding implementation and observe meaningful failures. Prepare manual cases before the affected configuration; execute them only with actual builds, owner implementations, safe fixtures and authorization. Documentary checks and doubles do not establish native/provider evidence.

**Organization**: Setup and foundation precede US1, US3, US4 and US5 (P1), then US2 (P2), preserving specification identifiers. A story can be developed with controlled dependencies; its full acceptance remains pending until the listed integrations have evidence. Future owner task files are not prerequisites for authoring this file.

## Format: `[ID] [P?] [Story] Description`

- **[P]** marks distinct-file work that can run together after its prerequisites.
- **[USn]** is the specification's user story; setup/foundation/polish have no story label.
- All boxes remain unchecked until the future implementation or qualification is complete.

## Path Conventions

- Backend account owner: `apps/backend/src/main/java/com/blockout/backend/accounts/`, corresponding `src/test/java/` and `src/main/resources/db/changelog/`. Keep API, application/domain and infrastructure responsibilities feature-local; JPA entities never cross feature boundaries.
- Mobile: thin routes in `apps/mobile/src/app/`; account behavior, forms and session ownership in `apps/mobile/src/features/accounts/`. Reuse F13 shared transport, Query configuration and UI controls.
- Canonical HTTP source: `contracts/http/mobile/openapi.yaml` and its `accounts/` files. F13 generates Java interfaces/DTOs into ignored Maven output and mobile Query functions/Zod schemas into `apps/mobile/.generated/`; add no handwritten transport mirror or account consumer in the collector.
- Actual operational instructions belong in `infra/operations/README.md` and native alert configuration in `infra/observability/README.md`, not a second feature plan or task catalogue. Private evidence never belongs in this public repository.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Consume the bounded [F13 foundation](../003-shared-quality/tasks.md), without duplicating it or waiting for every F13 business qualification.

- [x] T001 Integrate F05 dependencies in `apps/backend/pom.xml` and `apps/mobile/package.json` after F13 T001–T017 and shared JWT enforcement T038; reuse native Auth0, Expo ImagePicker/ImageManipulator, React Hook Form/Zod and existing test/generation tooling under the approved versions. Resolve compatible native package versions during implementation; add no new service, state library or shared package.
- [x] T002 Configure feature inputs in `apps/mobile/app.config.ts`, `apps/mobile/.env.example` and `apps/backend/src/main/resources/application.yaml`: separate native clients/audiences and callback/logout configuration for the existing Auth0 tenant, public mobile settings only, and server-side bounded Management API/RevenueCat access. Document secret names without values in `apps/backend/.env.example`; actual provider activation belongs to T015/T036.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the single transient session owner that F13 and business consumers can bind without a circular dependency on completed account journeys.

- [x] T003 Write failing lifecycle tests in `apps/mobile/src/features/accounts/__tests__/session-generation.test.ts` for every sign-out/account-change boundary and A → guest → A; prove that old captured generations cannot publish query, form, image or entitlement results even when cancellation fails, and that authentication, profile availability and entitlement availability remain distinct. Add native-provider tests in `apps/mobile/src/features/accounts/__tests__/account-session-provider.test.tsx` with controlled F14 initialization results: Auth0Provider never mounts/restores credentials before successful initialization, and failure preserves guest/error access. Exercise SDK actions from ordinary application descendants, synchronous invalidation before native logout settles, and explicit restoration retry after a transient failure. Initialization/restoration recovery may replace navigation; ordinary account changes preserve it.
- [x] T004 Implement the in-memory generation owner in `apps/mobile/src/features/accounts/session/session-generation.ts` and its native Auth0/React integration in `apps/mobile/src/features/accounts/session/account-session-provider.tsx`; make T003 pass with one session UUID and current account context. Compose Auth0Provider in `apps/mobile/src/app/_layout.tsx` only after the F14-owned initialization succeeds, using ordinary native credential restoration; F14 retains credential clearing and installation-marker ownership. Expose the SDK context for credentials and the business generation/lifecycle boundary to F13 and existing consumers, with no persistent business cache, per-device server session, write queue or entitlement mirror. Controlled initialization inputs allow isolated development; actual F14 initialization is required before F13 T040 binds its shared Query provider and transport.

**Checkpoint**: The session boundary is independently testable. Once T004 is composed with actual F14 initialization, F13 T040 can bind shared transport/Query without waiting for US1 screens or US3 logout/consumer integration. Full native journey qualification remains below.

---

## Phase 3: User Story 1 — Access or recover the right account (Priority: P1) 🎯 MVP

**Goal**: Keep public access available and explicitly establish one minimal business account for the validated principal, with ordinary read-only account retrieval.

**Scope**: A01–A08; FR-001–010, FR-012; SC-001.

**Independent Test**: Guest access remains usable; explicit sign-in creates or finds the correct account, including existing linked methods and distinct principals sharing an email. GET never creates or calls Auth0; missing first email creates nothing, while known values survive a provider outage.

### Tests for User Story 1

- [x] T005 [P] [US1] Write failing generated-boundary tests in `apps/backend/src/test/java/com/blockout/backend/accounts/api/AccountAccessWebMvcTest.java` for bodyless POST establishment (201/Location or 200), GET current/original account, unknown/missing account, safe canonical errors, no-store and ownership. Cover visitor, invalid/wrong-client/environment/scope and collector credentials; only current-account identification retains the F12 maintenance exception, not establishment, photos or navigation. Use a controlled admission boundary for this early account suite; actual PostgreSQL maintenance-policy integration is owned by [F12 T021/T025/T030](../013-administration-app-configuration/tasks.md), after these account operations exist.
- [x] T006 [P] [US1] Write failing PostgreSQL tests in `apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/AccountEstablishmentIntegrationTest.java` for simultaneous principal establishment, case-insensitive neutral-name collision, shared email across different principals, missing initial email, retained known email/age and synchronization captured for an existing UUID racing its deletion/replacement. Assert no partial account and no update or creation of the replacement by that old synchronization.
- [x] T007 [P] [US1] Write failing controlled-provider tests in `apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0PrincipalClientTest.java` for exact principal-ID lookup, bounded failure, linked identity evidence, usable/missing email and trustworthy/missing creation time; verify lookup outside a SQL transaction and no email search, provider photo/name copying or raw payload logging.
- [x] T008 [P] [US1] Write failing semantic mobile tests in `apps/mobile/src/features/accounts/__tests__/sign-in.test.tsx` for guest continuation, login success/cancel/refusal/unavailability, missing usable profile and explicit retry. Verify no automatic replay of the protected action that opened sign-in, no bootstrap on ordinary GET 404, and F14 initialization before Auth0Provider restoration with an independently controlled F12 admission boundary. Real native composition is owned by [F12 T028](../013-administration-app-configuration/tasks.md), with actual gate/authentication qualification in F12 T031 and T015.

### Implementation and qualification for User Story 1

- [x] T009 [US1] Implement the minimal account aggregate and JPA mapping in `apps/backend/src/main/java/com/blockout/backend/accounts/domain/Account.java`, `apps/backend/src/main/java/com/blockout/backend/accounts/infrastructure/AccountEntity.java` and `apps/backend/src/main/resources/db/changelog/accounts.xml`, registering it in `db.changelog-master.xml` under F13's baseline policy. Preserve the data-model constraints literally: `accountId` — “Generated business UUID; stable for this account lifecycle, never reused after voluntary erasure. RevenueCat's V2 App User ID is its string representation.”; `issuer`, `subject` — “Exact validated Auth0 principal. Unique pair for concurrent bootstrap; no mapping by email or secondary purchase reference.”; `username` — “Outer whitespace trimmed; 3–32 ASCII letters, digits, dot, hyphen or underscore. Case-insensitive unique constraint; generated neutral candidate uses the same rules.”; `email` — “Usable provider value required at creation; not unique and not editable through profile PATCH. Missing later data does not clear it.”; `principalCreatedAt` — “Nullable trustworthy Auth0 creation instant, preserved across business recreation for migration. Never inferred from local creation time.” Include nullable photo storage needed by later erasure/profile tasks: “PNG/JPEG bytes with media type, byte length and square dimensions at most 1024 pixels; at most 5 MiB. No original metadata. Bytes and association share the profile transaction and PostgreSQL backup.”
- [x] T010 [US1] Implement the persistence port and adapter in `apps/backend/src/main/java/com/blockout/backend/accounts/application/AccountStore.java`, `apps/backend/src/main/java/com/blockout/backend/accounts/infrastructure/JpaAccountStore.java` and `apps/backend/src/main/java/com/blockout/backend/accounts/infrastructure/AccountPersistenceMapper.java`; provide original-UUID reads/locking and database uniqueness, using MapStruct only for mechanical mapping. Preserve “F06 follows, F07 destinations/inbox, F08 attribution and F12 rights reference the business UUID. Each owner defines its own model and accepted cleanup. F05 does not add those features' tables.” Expose only the narrow current-account/locking capability needed by those owners.
- [x] T011 [US1] Implement the exact-ID Auth0 reader in `apps/backend/src/main/java/com/blockout/backend/accounts/infrastructure/Auth0PrincipalClient.java`; make T007 pass using native bounded HTTP and server credentials, returning only needed email, principal creation and justified identity-scope evidence. Never call the provider from the account transaction or infer identity from email.
- [x] T012 [US1] Implement explicit establishment/synchronization in `apps/backend/src/main/java/com/blockout/backend/accounts/application/EstablishAccount.java`: capture whether the principal already names an original UUID, read necessary provider evidence outside SQL, then recheck that state at commit. Generate a neutral available username; settle concurrent creation through PostgreSQL uniqueness, retain known email/age on temporary failure and reject unusable initial email without partial state. Make T006 pass without a provider mirror, pending account or synchronization retry worker.
- [x] T013 [US1] Implement local account reads in `apps/backend/src/main/java/com/blockout/backend/accounts/application/ReadAccount.java` and generated-interface adapters/mapping in `apps/backend/src/main/java/com/blockout/backend/accounts/api/AccountsController.java` and `apps/backend/src/main/java/com/blockout/backend/accounts/api/AccountApiMapper.java`; make T005 pass with owner-only current/original reads, F12's current permission projection and the endpoint classification for its narrow maintenance identification exception. The real admission policy and cross-owner qualification remain with F12 T021/T025/T030; do not make account construction depend on that later qualification. GET never contacts Auth0 or establishes an account; preserve canonical response/error/header semantics.
- [x] T014 [US1] Implement sign-in and the minimal usable profile in `apps/mobile/src/features/accounts/screens/sign-in-screen.tsx`, `apps/mobile/src/features/accounts/screens/profile-screen.tsx`, their thin routes `apps/mobile/src/app/sign-in.tsx` and `apps/mobile/src/app/profile.tsx`, and root composition in `apps/mobile/src/app/_layout.tsx`. Use generated calls, a neutral username/default avatar and explicit POST only after successful login or targeted retry; ordinary restoration uses GET. Consume the native provider established by T004, F13 T040 transport/session binding, F13 T067–T069/T071 shared UI and the controlled F12 admission interface, and preserve F14's separately owned skippable common onboarding/installation completion without demanding notification permission or replaying an interrupted action. Make T008 pass; F12 T028 subsequently composes the real native gates and T015/F12 T031 qualify them. Customization arrives in US2.
- [ ] T015 [US1] Prepare and execute `specs/005-accounts-identity/quickstart.md#authentication-and-isolation` sign-in/establishment cases on authorized physical iOS/Android builds: configure/verify production Google/Apple and preproduction's exclusive dedicated database connection with native signup, disabled in production, using separate allowed clients/audiences. Prove linked methods, same-email principals, missing first email and provider outage handling; inspect actual tenant settings instead of assuming historical samples. Record safe outcomes and reuse this evidence for F13 T042; provider setup and unavailable device cases remain pending until authorized.

**Checkpoint**: US1 offers the minimal account access increment. F12/F14 integration and physical-provider results are required for full acceptance, not for writing isolated account tests.

---

## Phase 4: User Story 3 — Keep one coherent session (Priority: P1)

**Goal**: Restore/renew ordinary native credentials and prevent old private state from crossing any session boundary, including failed browser logout.

**Scope**: A13–A19; FR-003, FR-017–023, FR-038–039; SC-003.

**Independent Test**: Delay A's work across A → B and A → guest → A; fail browser logout and destination removal. Local logout still completes, no stale private result is admitted, and unknown profile/entitlement state neither becomes revocation nor a free-account decision.

### Tests for User Story 3

- [x] T016 [P] [US3] Write failing native-session tests in `apps/mobile/src/features/accounts/__tests__/native-session.test.tsx` for secure restoration/renewal, confirmed non-renewable expiry versus network failure, browser logout cancellation/failure and independent credential clearing. Verify sign-out rotates the sole generation and a renewed credential never replays an uncertain mutation.
- [ ] T017 [P] [US3] Write lifecycle integration tests in `apps/mobile/src/features/accounts/__tests__/session-consumers.test.tsx` using controlled F07/F09 boundaries initially, then their implemented consumers: delayed queries, photo preparation, form completions, subscription association/entitlement callbacks and old system-push opening. Cover one bounded exact-destination removal before credential discard, its failure, badge reset and rejection of old captured generations, with no stale permissions, advertisements or repurchase invitation for undetermined entitlement state.

### Implementation and qualification for User Story 3

- [x] T018 [US3] Implement native session actions in `apps/mobile/src/features/accounts/session/native-session.ts` and extend `apps/mobile/src/features/accounts/session/account-session-provider.tsx`; use Auth0 secure storage/renewal and normal browser closure without global federated logout. Independently clear local credentials/private state even on failure, consume F13's Query cancellation/clear binding and reject stale generations. Keep transient network/profile errors recoverable without unnecessary reauthentication; make T016 pass.
- [ ] T019 [US3] Connect F07 destination/badge and F09 account lifecycle consumers at `apps/mobile/src/features/accounts/session/account-session-provider.tsx`: capture the original exact destination and attempt removal once with bounded waiting before discarding credentials, without persisting cleanup secrets. Supply only usable current UUID/generation changes to F09, which owns native RevenueCat configuration, serialized identity changes, entitlement reads and callback handling; F05 local sign-out never waits for that provider. Make T017 pass without a second subscription owner or new ordering mechanism.
- [ ] T020 [US3] Execute session isolation cases in `specs/005-accounts-identity/quickstart.md#authentication-and-isolation` with F07/F09 and US2 photo preparation available, on both physical platforms. Cover failed logout, A → B/A → guest → A, old push opening and delayed removal/registration; preserve the accepted possibility of old system pushes until ordinary reassociation and of a late old registration replacing a newer association. Verify no presented-notification recall or cleanup retry is promised, public sporting access remains usable and undetermined entitlements produce no free-account inference. Reuse the F13 session/native evidence rather than repeating the same run.

**Checkpoint**: Local session behavior is independently testable; full cross-owner/native acceptance waits for actual F07/F09 and photo consumers.

---

## Phase 5: User Story 4 — Preserve trustworthy account-age evidence (Priority: P1)

**Goal**: Use the actual Auth0 principal date and restrict only age-dependent operations when evidence is unavailable.

**Scope**: A20–A22; FR-024–025; SC-004.

**Independent Test**: Existing and linked principals retain their age, a missing value stays unknown with explicit retry, and re-registration uses the actual surviving or recreated principal date rather than the new business UUID's creation time.

### Tests for User Story 4

- [ ] T021 [US4] Write failing age tests in `apps/backend/src/test/java/com/blockout/backend/accounts/application/AccountAgeTest.java` and `apps/mobile/src/features/accounts/__tests__/account-age-retry.test.tsx`; cover known-date preservation on provider outage, null evidence, targeted establishment retry with still-valid authentication and actual principal dates after successful/failed provider cleanup using controlled lifecycle fixtures.

### Implementation and qualification for User Story 4

- [ ] T022 [US4] Complete age retrieval/preservation in `apps/backend/src/main/java/com/blockout/backend/accounts/application/EstablishAccount.java` and explicit retry UI in `apps/mobile/src/features/accounts/screens/profile-screen.tsx`; make T021 pass through the existing POST/response. Supply immutable evidence to F08's current eligibility checks; do not add a new endpoint, local age clock or automatic login/bootstrap, and leave F08's seven-day threshold/moderator permissions with its owner.
- [ ] T023 [US4] Execute A20–A22 through `specs/005-accounts-identity/quickstart.md#authentication-and-isolation` and `specs/005-accounts-identity/quickstart.md#erasure-and-return` when F08/F14 and US5 exist; verify historical/linked principal age, restriction of only dependent operations, and actual surviving-principal age after failed cleanup versus a newly created principal. Record real provider evidence separately from T021 doubles.

**Checkpoint**: Age behavior passes independently; recreation and cross-owner evidence complete with US5/F08/F14.

---

## Phase 6: User Story 5 — Erase the account and return safely (Priority: P1)

**Goal**: Atomically remove local personal data, attempt original external targets once after commit and return directly to guest access, retaining only justified private manual-cleanup evidence.

**Scope**: A23–A32; FR-026–038; SC-005–008.

**Independent Test**: A definite local failure preserves the account/session and invokes no provider; committed deletion removes all owner associations, preserves unowned moderated content and attempts known providers independently. Original-UUID requests cannot affect a replacement; uncertain responses use an original-account reread, and external requests/restoration follow their owning obligations.

### Tests for User Story 5

- [ ] T024 [P] [US5] Write failing generated DELETE tests in `apps/backend/src/test/java/com/blockout/backend/accounts/api/AccountErasureWebMvcTest.java` for current ownership/admission, bodyless 204 after local commit and bounded attempts, safe local failure, absent original 404 and no provider effects on repeat. Test old UUID versus replacement and preserve shared no-store/errors without a confirmation payload or fixed authentication-age threshold.
- [ ] T025 [P] [US5] Write failing PostgreSQL transaction tests in `apps/backend/src/test/java/com/blockout/backend/accounts/application/EraseAccountIntegrationTest.java` for rollback, original-account locks, concurrent profile/follow/destination/attribution/grant writes and old provider synchronization. Exercise the real F06/F07/F08/F12 persistence participants when available; controlled participants support initial F05 development but cannot establish their cleanup proof. Preserve hidden content/report counts and prevent association resurrection after commit.
- [ ] T026 [P] [US5] Write failing cleanup tests in `apps/backend/src/test/java/com/blockout/backend/accounts/application/OriginalTargetCleanupTest.java` with controlled providers: captured original UUID and known current/historical targets, missing scope/target evidence, exclusive preproduction connection checks, no calls before commit, bounded once-per-target attempts continuing after another fails, Auth0 204 versus RevenueCat v2 200 asynchronous acknowledgment and applicable identity revocations. Verify no polling, guessed email/current-mapping target, rollback or repeated cleanup after an absent-original DELETE.
- [ ] T027 [P] [US5] Write failing ordinary-screen/response-loss tests in `apps/mobile/src/features/accounts/__tests__/erase-account.test.tsx`: checkbox and plain store-billing notice, cancel, definite local failure, 204 despite provider failure, independent logout failure, and original-UUID reread after lost response before explicit retry. An unavailable reread shows an ordinary error with optional local sign-out and no confirmed-deletion claim; confirmed deletion goes straight to guest home without receipt, progress page, success toast or subscription-management button.
- [ ] T028 [P] [US5] Write synthetic diagnostic-safety tests in `apps/backend/src/test/java/com/blockout/backend/accounts/application/ErasureDiagnosticsTest.java`; allow only original account/provider references and minimal verification evidence plus operation/environment/provider/time/safe reason in private failure logs, rejecting email, profile, photo, credentials and raw provider payloads. Ensure these references never enter metric labels or Discord and successful queued deletion is not logged as a failure merely because it is asynchronous.

### Implementation and qualification for User Story 5

- [ ] T029 [US5] Implement synchronous local erasure in `apps/backend/src/main/java/com/blockout/backend/accounts/application/EraseAccount.java` using the original account row lock and F06/F07/F08/F12's narrow transactional participants. Remove account/photo, all follows including hidden ones, inbox/destinations and grants; detach F08 contribution/decision attribution and remove reporter associations/free-text reasons while preserving counted facts, content restrictions and moderation. Capture known targets without requiring a live provider lookup; no provider calls in SQL, sporting-root acquisition during erasure, pending row or ledger. Other writers acquire owner-ordered domain roots before sorted account locks and none afterward; make the initial T025 cases pass, with full owner proof in T035.
- [ ] T030 [US5] Implement post-commit cleanup in `apps/backend/src/main/java/com/blockout/backend/accounts/application/OriginalTargetCleanup.java`, `apps/backend/src/main/java/com/blockout/backend/accounts/infrastructure/Auth0AccountCleanup.java` and `apps/backend/src/main/java/com/blockout/backend/accounts/infrastructure/RevenueCatAccountCleanup.java`; make T026 pass with original targets captured for the deleted lifecycle, bounded independent attempts, applicable Apple revocations and documented acknowledgments. Preserve “Only established references needed for continuity or scoped erasure, discovered through F14's private evidence. No blanket copied customer profile or email-derived mapping.” Missing evidence or unsafe environment/identity scope permits local deletion but no destructive provider call; use private manual diagnostics. Do not cancel store billing, delete global Google/Apple accounts, poll or retry queued deletion, or resolve an old target via a replacement account.
- [ ] T031 [US5] Add DELETE to `apps/backend/src/main/java/com/blockout/backend/accounts/api/AccountsController.java`; make T024 pass by returning 204 only after local commit and bounded attempts, including logged external failure, and 404 without external effects for an absent original UUID. Keep owner validation/current rights and definite local failure distinct from uncertain transport outcomes; no session registry, global revocation promise or re-registration gate.
- [ ] T032 [US5] Implement the ordinary erasure screen in `apps/mobile/src/features/accounts/screens/erase-account-screen.tsx` and its thin native stack route, composing F13 T069 controls with the unchanged checkbox, consequences, cancellation and plain billing notice and connect it to `apps/mobile/src/features/accounts/screens/profile-screen.tsx` and the existing session actions; make T027 pass with explicit confirmation and plain billing guidance. On confirmed deletion clear credentials/private state independently and return to guest home; after uncertain delivery reread the captured original UUID before any explicit retry, never silently act on a replacement or clear F14's installation/onboarding markers.
- [ ] T033 [US5] Emit one owned private failure/uncertainty diagnostic from `apps/backend/src/main/java/com/blockout/backend/accounts/application/OriginalTargetCleanup.java` and add the native Grafana log-alert condition to `infra/observability/README.md` using F13 T027–T031. Make T028 pass with safe reasons and the narrow F05/F11 original-target exception, 14-day logs and generic Discord notification; add no logging facade, public identifiers, customer metric labels or success ledger.
- [ ] T034 [US5] Document actual manual cleanup steps in `infra/operations/README.md`: use existing database/provider/private support tools, verify original targets and their current use before destructive action, check dedicated preproduction identity scope and RevenueCat's shared customer namespace, and retain only still-needed evidence privately beyond log retention until its purpose ends. Cover applicable identity revocations, historical records after transfer, absence of target evidence, ordinary cleanup/return overlap and the accepted unlogged post-commit crash gap. Native alert closure is not repair; no guaranteed response time, new console or automated recovery is introduced.
- [ ] T035 [US5] Complete T025 with real F06/F07/F08/F12 participants in `apps/backend/src/test/java/com/blockout/backend/accounts/application/EraseAccountIntegrationTest.java`, then execute the local race/return cases in `specs/005-accounts-identity/quickstart.md#erasure-and-return`. Verify transaction-wide removal, retained hidden/visible contribution state, no old attribution/grants/gifts, fresh business UUID and old original requests/synchronization unable to affect it; include actual US2 photo writes once implemented.
- [ ] T036 [US5] Prepare and execute the provider/native/manual cases in `specs/005-accounts-identity/quickstart.md#erasure-and-return` on authorized isolated accounts and both physical platforms after T015/T033/T034 and F09/F14 prerequisites. Exercise independent failures, missing target evidence, actual Auth0/RevenueCat acknowledgments, applicable revocations, lost responses and a controlled stop between commit and logging. Qualify immediate return, still-valid same-subject tokens authorizing a newly established account's current rights, ordinary cleanup/sign-in overlap, and another device's existing SDK instance without inventing remote revocation. Inspect a synthetic private log/alert and longer-lived private support case; keep private evidence outside GitHub.
- [ ] T037 [US5] Execute F09/F14-owned purchase and historical-reference integration from `specs/005-accounts-identity/quickstart.md#integration-with-other-owners` after their native restoration/continuity implementations: restore on each original store, verify actual receipt-wide transfer scope, current-account assignment and assistance exceptions, no old business data/deleted gifts, preserved valid continuity gifts and discoverable original historical customer records after transfer. Reuse their qualification evidence; F05 adds no subscription screen, entitlement ledger or population mapping registry.
- [ ] T038 [US5] Qualify the existing public privacy-page deletion direction and contact through `specs/005-accounts-identity/quickstart.md#integration-with-other-owners` with F10/F11's private request handling and F14's store-link qualification. Verify requests without reinstall/sign-in, actual ownership verification rather than email matching, truthful outcome/deadline handling and every erasure-matrix category's owner/retention purpose. Use existing support/legal tools, with no new portal or public diagnostic attachments.
- [ ] T039 [US5] Execute the F05 fixtures in `specs/003-shared-quality/quickstart.md#initial-restore-and-activation-condition` and `specs/005-accounts-identity/quickstart.md#integration-with-other-owners` once F13's isolated restore procedure and affected owners exist; manually reconcile current erasures, rights and expiry before affected access or sends resume, including known unresolved external cleanup. Record safe restoration evidence without marking provider repair complete solely because database recovery succeeds.

**Checkpoint**: Local erasure and bounded cleanup pass controlled tests. Native deletion, receipts, private requests and restoration remain explicitly incomplete until their real prerequisites and evidence exist; accepted crash/token/other-device limits remain unchanged.

---

## Phase 7: User Story 2 — Personalize a minimal profile (Priority: P2)

**Goal**: Save username and optional photo atomically, preserving omitted fields and the previous profile on refusal.

**Scope**: A09–A12; FR-011–016; SC-002.

**Independent Test**: Race disjoint and same-field edits, reject invalid names/photos without partial changes, and crop/prepare/save/remove a native photo without modifying its original asset. A relogin preserves the user's chosen profile and another owner cannot access it.

### Tests for User Story 2

- [x] T040 [P] [US2] Write failing generated multipart/binary tests in `apps/backend/src/test/java/com/blockout/backend/accounts/api/AccountProfileWebMvcTest.java` against `contracts/http/mobile/accounts/paths.yaml` and `contracts/http/mobile/accounts/schemas.yaml`; cover required JSON metadata, omitted/null/unknown fields, empty document, trim-before-validation, unchanged username, photoAction replace/remove, required replacement image and forbidden image for remove/omission. Verify 400/409/413/415/422, no-store, Accept-Patch on original-account GET and owner-only binary photo/404 without JSON response validation.
- [x] T041 [P] [US2] Write failing PostgreSQL profile tests in `apps/backend/src/test/java/com/blockout/backend/accounts/application/ChangeAccountProfileIntegrationTest.java` for case-insensitive name collisions, atomic username/photo replacement/removal, rejected-field rollback, omitted concurrent fields, last accepted supplied value and deletion races. Verify original UUID locking without revision tokens, provider re-login preserving chosen fields and no partial image association.
- [x] T042 [P] [US2] Write failing image validation tests in `apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/ProfilePhotoProcessorTest.java` using synthetic images: actual PNG/JPEG decode, malformed/spoofed/oversized input, square dimensions 1–1024, 5 MiB bound and metadata removal. Verify validation/re-encoding finishes before the short SQL transaction and failed replacement retains previous bytes.
- [x] T043 [P] [US2] Write failing semantic profile/preparation tests in `apps/mobile/src/features/accounts/__tests__/profile-form.test.tsx` and `apps/mobile/src/features/accounts/__tests__/prepare-profile-photo.test.ts`; cover native selection/crop cancellation, permission denial, preparation failure, preserved draft, replace/remove/omission, field errors, unavailable state, uncertain-save original reread and session changes during preparation. Model the native boundary without claiming actual crop fidelity from mocks.

### Implementation and qualification for User Story 2

- [x] T044 [US2] Implement standard ImageIO validation/re-encoding in `apps/backend/src/main/java/com/blockout/backend/accounts/infrastructure/ProfilePhotoProcessor.java`; make T042 pass by checking actual bytes/decoding, allowed media types, byte and square-dimension bounds and discarding unrelated source metadata before entering the account transaction. Store no original or staged upload and add no storage synchronization process.
- [x] T045 [US2] Implement `apps/backend/src/main/java/com/blockout/backend/accounts/application/ChangeAccountProfile.java` using the existing account model/port: trim and validate the quoted username constraint, lock the original current account, preserve omitted fields, apply supplied username/photo atomically and translate database uniqueness races. Make T041 pass without a revision-token conflict journey, automatic replay or unnecessary current-username rejection.
- [x] T046 [US2] Add generated PATCH/private-photo adapters and mechanical mapping in `apps/backend/src/main/java/com/blockout/backend/accounts/api/AccountsController.java` and `apps/backend/src/main/java/com/blockout/backend/accounts/api/AccountApiMapper.java`; make T040 pass through canonical metadata/image binding and safe errors/headers. PhotoAction omission preserves state, replace needs image and remove forbids it; keep email and provider personal names/phone outside editable profile input.
- [x] T047 [US2] Implement `apps/mobile/src/features/accounts/profile/prepare-profile-photo.ts` with native ImagePicker square editing (Android square aspect, native iOS editing), then one ImageManipulator resize without enlargement to at most 1024 pixels and PNG encoding. Check the prepared upload against 5 MiB, not the original asset size; keep the original untouched and preserve the draft on cancellation/failure. Guard results with the captured session generation and make preparation cases from T043 pass without custom crop UI or quality/retry loops.
- [x] T048 [US2] Implement the React Hook Form/Zod form in `apps/mobile/src/features/accounts/components/profile-form.tsx` and integrate it into `apps/mobile/src/features/accounts/screens/profile-screen.tsx`; reuse F13's shared image control and generated multipart consumer for one atomic save of username, photo intent or both. Preserve omitted fields, current valid usernames and explicit removal; after an uncertain response reread the original account before explicit retry. Make T043 pass with accessible French feedback, native StyleSheet layout and no mirrored Query state, persistent draft or provider profile import.
- [ ] T049 [US2] Execute `specs/005-accounts-identity/quickstart.md#native-photo-and-shared-control` and `specs/005-accounts-identity/quickstart.md#contracts-and-profile-data` on both physical platforms, using large/rotated/transparent and convertible source assets, cancellation/permission denial and the documented iOS large-image crop limitation. Verify unchanged originals, actual output bounds, square preview/save and F13 common-control behavior at 320 points in both themes. Reuse F13's approved-design/accessibility evidence, and complete the delayed-photo/erasure cases in T020/T035 without treating a prototype as native proof.

**Checkpoint**: US2 supplies customization without changing the P1 lifecycle or other image owners' constraints.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Complete actual integration checks and traceable acceptance without converting planned qualification into evidence.

- [ ] T050 Update `README.md`, `AGENTS.md` and `specs/005-accounts-identity/quickstart.md` with actual account build/test/configuration entry points as implementation introduces them; document touched handwritten APIs and meaningful private steps, keep diagnostics safe and preserve official Spec Kit imports. Operational instructions remain in their existing owners; include no credentials, real principal IDs or private cleanup evidence.
- [ ] T051 Run canonical lint/bundle/generate/compile and the implemented account suites through `contracts/http/project.json`, `apps/backend/project.json` and `apps/mobile/project.json`, alongside required repository checks. Prove actual generated Java/mobile consumers handle establishment, atomic multipart, original reads, binary photos and bodyless deletion; retain isolated PostgreSQL race tests and native session tests, with no unrelated runtime or invented benchmark.
- [ ] T052 Complete the A01–A32/SC-001–008 acceptance review using `specs/005-accounts-identity/quickstart.md`, the implemented suites and owning F06–F14 evidence. Verify every story checkpoint, approved in-app design/accessibility and erasure-matrix responsibility; distinguish passed, failed and unavailable evidence in the delivery report. Leave unavailable native/provider/private-support/restore tasks open and preserve accepted crash, token and push-delivery limits; documentary validation alone cannot complete implementation.

---

## Dependencies & Execution Order

### Phase and story dependencies

- Setup consumes F13's executable foundation/shared JWT controls, not all F13 stories. T003–T004 provide the native SDK/session owner and mount it after the F14 initialization owner succeeds, before F13 T040 binds shared transport/Query; T014 then consumes that binding. F05 does not reimplement F13's cache/transport or claim its downstream qualification is already complete.
- US1 establishes the account, persistence/locking and minimal profile used by US3, US4, US5 and US2. T005–T008 can be authored together; implementation follows the model → persistence/provider → use case → API/mobile order. T013/T014 supply account capabilities and consume a controlled admission boundary; actual F12 T025/T028 consumes these completed account operations, then T015/F12 T031 qualifies the composition; T004/F13 T040 require actual F14 initialization for root integration, while T015 requires physical native builds.
- US3 and US4 can advance after their US1 prerequisites. US5 uses US1's account lock and US3's session cleanup. US2 uses US1's model and US3's generation guards; its shared image control comes from [F13 US6](../003-shared-quality/tasks.md#phase-9-user-story-6--use-the-application-with-the-phones-capabilities-priority-p2) T070, after T067–T069 tokens/theme/controls. T014/T032 need T069/T071 controls/feedback; none waits for complete F13 native qualification. No requirement makes US2 customization a prerequisite to implementing local erasure.
- Cross-owner erasure proof T035 requires actual F06 follows, F07 inbox/destinations, F08 retained attribution/reporting and F12 grants. Each owner implements its own model/transaction participation; F05 orchestrates and verifies the one local transaction. Those features can develop against F05's bounded account-lock capability before full erasure qualification.
- T020/T023/T035 may prepare controlled evidence early; full execution waits for their named consumers and US2 photo mutation where applicable. These qualifications do not block authoring or implementing unrelated ready work.
- T015/T036 require actual environment configuration, safe authorized provider fixtures and physical iOS/Android builds. T033 requires F13's native logging/alert configuration; T037 requires F09 purchases and F14 continuity; T038 requires F10/F11 private requests/public privacy page and F14 store-link evidence; T039 requires F13 restore and current owner reconciliation. No provider operation is authorized by checking in this task list.
- Final acceptance T052 requires all story checkpoints and real qualification evidence. T050 progresses with each executable change; T051 runs once the relevant implementation exists and after fixes.

```text
F13 foundation + JWT → Setup → F05 native session owner (T004)
F14 initialization ──────────────┘
F05 native session owner → F13 shared binding → US1 (MVP) ← controlled F12 boundary
                                               ├→ US3 → US2
                                               ├→ US4
                                               └→ US5 (uses US3 cleanup)
F06/F07/F08/F09/F10/F11/F12/F13/F14 + native/provider inputs
    → dependent story qualifications → final acceptance
```

### Parallel opportunities and examples per story

Markers apply only after the preceding prerequisites, to disjoint files. Serialize tasks editing the same account controller, use case, provider or profile screen; do not run shared-file consumers concurrently.

- **US1**: T005 HTTP tests, T006 persistence tests, T007 exact-provider tests and T008 mobile tests are independent. After T009/T010, the provider adapter and API/mobile preparation can advance without waiting for external qualification, while preserving their explicit service dependencies.
- **US3**: T016 native-session tests and T017 consumer tests can run together. T018 precedes T019 integration; T020 waits for actual consumers.
- **US4**: T021's backend and mobile test files can be split between contributors; T022 follows their failure evidence, and T023 waits for US5/F08/F14.
- **US5**: T024–T028 are independent test files. T029 local transactions precede orchestration/controller integration; provider qualification and cross-owner local proof can proceed independently once their respective prerequisites exist.
- **US2**: T040 API, T041 database, T042 image and T043 mobile tests can run together. After these tests, T044 backend image processing and T047 native preparation touch different files; T045/T046 and T048 then integrate the respective sides before T049.

## Implementation Strategy

1. Deliver the bounded setup/session foundation, then US1 as the MVP: public guest access plus explicit minimal account establishment/read. Use controlled boundaries while F12/F14/native prerequisites are unavailable, and do not mark their acceptance passed.
2. Add coherent native session handling and trustworthy age behavior, then synchronous local erasure and bounded original-target cleanup. Integrate each owning feature's real transaction participation as it becomes available; no speculative cleanup framework or future-domain table is needed.
3. Add P2 profile customization using the existing model, shared image control and atomic generated contract. Complete the earlier delayed-photo/deletion qualifications against this implementation.
4. Execute owner/native/provider/restore qualification only with the actual prerequisites and authorization. Reuse shared evidence, apply minimal fixes and complete acceptance after every required outcome is demonstrated, preserving all accepted reliability limits.
