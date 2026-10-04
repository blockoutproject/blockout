# Tasks: F05 accounts, identity and sessions

**Inputs:** [plan](plan.md), [spec](spec.md), [research](research.md), [model](data-model.md), [contracts](contracts/account-behavior.md), [validation](quickstart.md).

These are future implementation tasks, **not executed by the documentary issue #20**. All boxes remain unchecked. Requirements and Q IDs are local to F05. Cross-feature references always include the owning feature directory; `T001` below is `005-accounts-identity/T001`, never a global ID. No implementation issues are created before global planning acceptance.

Tests are explicitly required by the accepted plan/spec and precede their behavior where practical. Use real consumers and PostgreSQL where relevant; mocks do not establish provider/native facts. Do not invent runtime commands before F13 creates the authoritative manifests.

## Phase 1 — Setup and authoritative inputs

- [ ] T001 Consume the approved F13 runtime/security/generation foundation; verify initialization bypass removal before executable work and record actual target commands in `specs/005-accounts-identity/quickstart.md`. [FR-039; Q12]
- [ ] T002 Adopt the authored F05 operations into `contracts/public/accounts/account.openapi.yaml`, referencing the F13 shared problem schema; configure only real Java/mobile consumers. [FR-004, FR-014–FR-019, FR-026–FR-027, FR-038–FR-039; Q12]
- [ ] T003 Qualify retained Auth0 audience/callback/logout/refresh configuration and restricted provider credentials in `apps/backend/src/main/resources/application.yml` and `apps/mobile/app.config.ts`; preserve existing settings and identify F14 V1 action retirement dependencies. [FR-003, FR-005, FR-010, FR-019–FR-020; Q06/Q08]

## Phase 2 — Foundational account boundaries

- [ ] T004 Implement account, canonical-principal, non-unique provider email and minimal deletion-state constraints in `apps/backend/src/main/resources/db/changelog/accounts/`; follow the F13 retained-data migration freeze rule. [FR-004–FR-011, FR-013, FR-024, FR-027–FR-028, FR-031, FR-035; Q01/Q07]
- [ ] T005 Implement explicit domain/persistence/provider/transport mappings in `apps/backend/src/main/java/com/blockout/accounts/infrastructure/`; keep raw providers and generated DTOs outside pure domain code. [FR-011, FR-024, FR-038; Q02/Q12]
- [ ] T006 Integrate Spring JWT validation, current business-account refusal and per-action F12 authorization in `apps/backend/src/main/java/com/blockout/accounts/api/`; no session registry, custom token claim or token-expiry waiting period. [FR-001, FR-004, FR-016–FR-021, FR-027, FR-035; Q05/Q08]

## Phase 3 — US1: access and recover the account

**Independent acceptance:** the US1 scenarios meet Q01/Q02/Q05 with explicit evidence scope; dependent real owner/provider qualifications remain separate gates.

- [ ] T007 [US1] Write concurrent identity/shared-email and explicit-read-no-create cases against real PostgreSQL in `apps/backend/src/test/java/com/blockout/accounts/AccountBootstrapTest.java`. [FR-004–FR-010; Q01]
- [ ] T008 [US1] Implement explicit bootstrap and side-effect-free current-profile read in `apps/backend/src/main/java/com/blockout/accounts/application/`; serialize current principal lifecycle and settle races through database constraints. [FR-003–FR-010, FR-012, FR-018; Q01/Q02]
- [ ] T009 [US1] Implement principal-based provider lookup and explicit-sign-in synchronization with retained values on known-account outages in `apps/backend/src/main/java/com/blockout/accounts/infrastructure/auth0/`. [FR-005–FR-011, FR-018; Q02]
- [ ] T010 [US1] Provide the verified identity/customer correspondence import boundary in `apps/backend/src/main/java/com/blockout/accounts/application/`; F14 supplies actual evidence and performs the authorized import, without email/name heuristics. [FR-005–FR-010, FR-024; Q01/Q02]
- [ ] T011 [US1] Implement approved guest/onboarding/sign-in/bootstrap and recoverable profile-unavailable journeys in `apps/mobile/src/features/accounts/`, with thin routes in `apps/mobile/src/app/`; no automatic protected mutation after sign-in. [FR-001–FR-003, FR-007–FR-008, FR-017–FR-018, FR-039; Q05]
- [ ] T012 [US1] Add actual Java/mobile generated-consumer fixtures for bootstrap and profile errors/additive responses in `apps/backend/src/test/java/com/blockout/accounts/AccountContractTest.java` and `apps/mobile/src/features/accounts/__tests__/contracts.test.ts`. [FR-004, FR-017–FR-018, FR-038–FR-039; Q05/Q12]

## Phase 4 — US2: minimal profile and safe customization

**Independent acceptance:** the US2 scenarios meet Q03/Q04 with explicit evidence scope; dependent real owner/provider qualifications remain separate gates.

- [ ] T013 [US2] Write neutral-name/case-collision/stale-edit/photo-failure cases in `apps/backend/src/test/java/com/blockout/accounts/ProfileMutationTest.java`, including actual PostgreSQL uniqueness and successor refusal by expected account UUID. [FR-011–FR-016; Q03/Q04]
- [ ] T014 [US2] Implement neutral username generation, validation, explicit profile revision and username-only edits with expected-account UUID checks in `apps/backend/src/main/java/com/blockout/accounts/application/`; never overwrite customization from provider data. [FR-011–FR-014; Q03]
- [ ] T015 [US2] Implement private photo byte validation, metadata removal, new-object upload, owner-authenticated read and account-UUID/revision-checked association in `apps/backend/src/main/java/com/blockout/accounts/infrastructure/images/` and the owning application/API paths. [FR-014–FR-016, FR-038; Q04]
- [ ] T016 [US2] Implement default-avatar, chosen-image preparation/upload/removal and uncertain-outcome reread in `apps/mobile/src/features/accounts/`; respect F13 upload limits and account-scoped nonpersistent image caching. [FR-011–FR-015, FR-021, FR-039; Q03/Q04]
- [ ] T017 [US2] Document guarded orphan/obsolete-object inspection and manual cleanup with existing S3 tools in `specs/005-accounts-identity/quickstart.md`; qualify backup/versioned-object obligations with F11/F13, without a cleanup service. [FR-015, FR-029, FR-034, FR-038; Q04/Q11]

## Phase 5 — US3: SDK session behavior and account isolation

**Independent acceptance:** the US3 scenarios meet Q05/Q06 with explicit evidence scope; dependent real owner/provider qualifications remain separate gates.

- [ ] T018 [US3] Write controlled SDK/network/browser-logout and late-response cases in `apps/mobile/src/features/accounts/__tests__/session.test.tsx`, covering guest exit and unknown-right behavior. [FR-017–FR-023, FR-039; Q05/Q06]
- [ ] T019 [US3] Implement standard Auth0 SDK credentials and browser-login/logout adapter in `apps/mobile/src/features/accounts/infrastructure/auth0/`; use SDK renewal, no custom refresh timer or automatic mutation replay. [FR-003, FR-017–FR-020; Q06]
- [ ] T020 [US3] Integrate F13 in-memory request-generation cancellation, cache/image/profile reset and session-safe errors in `apps/mobile/src/features/accounts/`; preserve public navigation and distinguish business refusal from invalid credentials. [FR-001, FR-017–FR-021, FR-038–FR-039; Q05/Q06]
- [ ] T021 [US3] Connect F07-owned destination disassociation/current-account installation lifecycle through `apps/mobile/src/features/accounts/`; depend on the F07 interface/implementation rather than creating an F05 device/session store. [FR-021–FR-022; Q06]
- [ ] T022 [US3] Connect F09-owned current-account entitlement initialization/reset through `apps/mobile/src/features/accounts/`; keep unknown rights separate from profile readiness and preserve no-ad/no-repurchase behavior. [FR-021, FR-023; Q05/Q06]
- [ ] T023 [US3] Qualify standard login/refresh/logout/failure/account-switch journeys on actual iOS and Android builds and record scoped private evidence linked from `specs/005-accounts-identity/quickstart.md`. [FR-003, FR-017–FR-023, FR-039; Q06/Q12]

## Phase 6 — US4: preserved account-age evidence

**Independent acceptance:** the US4 scenarios meet Q02/Q08 with explicit evidence scope; dependent real owner/provider qualifications remain separate gates.

- [ ] T024 [US4] Write linked-principal/migration/unknown-age/provider-outage and return-after-erasure cases in `apps/backend/src/test/java/com/blockout/accounts/AccountAgeTest.java`. [FR-024–FR-025, FR-035; Q02/Q08]
- [ ] T025 [US4] Implement targeted missing-age retrieval with original-account recheck in `apps/backend/src/main/java/com/blockout/accounts/application/`; retain reliable evidence and never use business creation time as a fallback. [FR-024–FR-025; Q02]
- [ ] T026 [US4] Expose reliable-or-unknown age to the F08-owned eligibility boundary in `apps/backend/src/main/java/com/blockout/accounts/application/`; keep the seven-day rule and moderator exception with F08/F12. [FR-024–FR-025; Q02]

## Phase 7 — US5: minimal erasure and safe return

**Independent acceptance:** the US5 scenarios meet Q07–Q11 with explicit evidence scope; dependent real owner/provider qualifications remain separate gates.

- [ ] T027 [US5] Write acceptance/rollback/lost-response/duplicate-request/successor-UUID/process-interruption cases in `apps/backend/src/test/java/com/blockout/coordination/AccountErasureTest.java` against real PostgreSQL and controlled provider boundaries. [FR-026–FR-032; Q07]
- [ ] T028 [US5] Implement the single deletion state, original-intent UUID verification, target capture and atomic owned local cleanup through `apps/backend/src/main/java/com/blockout/coordination/AccountErasureCoordinator.java`; depend on F06/F07/F08/F09/F11 owner APIs before claiming full deletion. [FR-027–FR-031, FR-038; Q07/Q09]
- [ ] T029 [US5] Implement one post-commit backend execution and guarded original-target finalization in `apps/backend/src/main/java/com/blockout/accounts/application/`; executor rejection/crash leaves manual work, with no periodic retry/step ledger/resume API. [FR-027–FR-033; Q07]
- [ ] T030 [US5] Implement standard Auth0 deletion through `apps/backend/src/main/java/com/blockout/accounts/infrastructure/auth0/`; qualify applicable Apple behavior without adding a custom Apple integration preemptively. [FR-029, FR-032, FR-035; Q08/Q09]
- [ ] T031 [US5] Connect original F09 customer targets and asynchronous cleanup outcomes in `apps/backend/src/main/java/com/blockout/coordination/AccountErasureCoordinator.java`; F09 owns provider mappings, purchase restoration and its actual adapter. [FR-029, FR-032–FR-033, FR-036; Q09]
- [ ] T032 [US5] Implement mobile confirmation/202 acceptance/local exit and uncertain-result/support behavior in `apps/mobile/src/features/accounts/`, including store-billing explanation and no extra authentication-age threshold. [FR-026–FR-027, FR-032, FR-039; Q07]
- [ ] T033 [US5] Replace the design runbook with schema-specific reviewed SQL/provider/storage inspection and manual resolution instructions in `specs/005-accounts-identity/quickstart.md`; protect original UUID/targets, without a dedicated executable resume tool. [FR-028–FR-034, FR-038; Q07/Q11]
- [ ] T034 [US5] Coordinate the F11-owned privacy-page deletion section/contact and external ownership procedure through `specs/005-accounts-identity/contracts/erasure-and-operations.md`; F14 qualifies the actual public store link, with no new portal/form. [FR-037–FR-038; Q11]
- [ ] T035 [US5] Qualify Auth0 standard-token/same-subject return and document the accepted limit with isolated accounts in `specs/005-accounts-identity/quickstart.md`; verify no old business data or manual rights reappear. [FR-019–FR-021, FR-027, FR-031, FR-035; Q08]
- [ ] T036 [US5] Participate in F09-owned Apple/Google deletion-then-return/restore qualification and record the F05-specific identity/cleanup results in `specs/005-accounts-identity/quickstart.md`; unsupported provider guarantees block this boundary. [FR-029–FR-036; Q09]

## Phase 8 — Cross-cutting proof and delivery

- [ ] T037 Integrate confirmed cleanup failure and verified recovery into F13 logs/Grafana/IRM routing through `apps/backend/src/main/java/com/blockout/accounts/infrastructure/`; no account IDs in grouping keys or Discord and no additional supervisor. [FR-028, FR-032, FR-038–FR-039; Q10]
- [ ] T038 Verify retained-data restoration restrictions with the F11/F13/F14 owners and record scoped account proof in `specs/005-accounts-identity/quickstart.md`, leaving affected access closed when obligations cannot be established. [FR-029–FR-035, FR-038; Q11]
- [ ] T039 Run actual image-selection/private-display, approved Access/Account/System, accessibility and native error journeys on both platforms; record only sanitized evidence in `specs/005-accounts-identity/quickstart.md`. [FR-001–FR-003, FR-011–FR-023, FR-026–FR-027, FR-039; Q04/Q06/Q12]
- [ ] T040 Run F13 full code CI and clean reproducible generation/actual consumer checks, including the F05 suites under `apps/backend/src/test/java/com/blockout/accounts/` and `apps/mobile/src/features/accounts/__tests__/`; no fictitious F05 Python consumer. [FR-001–FR-039; Q12]
- [ ] T041 Reconcile contract/model/spec/task evidence, provider limitations and actual runnable commands in `specs/005-accounts-identity/quickstart.md`; apply official analysis and obtain bounded implementation acceptance without declaring unrelated feature/release gates complete. [FR-001–FR-039; Q01–Q12]

## Dependencies and execution strategy

- Phase 1 consumes `003-shared-quality` setup/contracts/security; phase 2 blocks the account stories.
- US1 establishes identity/profile. US2 and US4 can proceed independently after US1; their different owning files permit separate work once shared model/API changes are settled. US3 consumes the usable-profile boundary and the F13 mobile transport.
- US5 depends on account/status, image targets and explicit F06 (`009-following-personal-feed`), F07 (`011-notifications-delivery`), F08 (`010-live-contributions-moderation`), F09 (`006-pro-subscriptions`) and F11 (`004-advertising-privacy-legal`) cleanup contracts. Controlled-adapter tests can proceed earlier; real end-to-end erasure cannot.
- F12 (`013-administration-app-configuration`) owns permission assignment and restrictions; F14 (`014-v1-v2-transition`) owns live continuity imports/retirement. Do not expand F05 into their implementation or execute production actions from this task list.
- Parallel examples: contract fixture review and controlled test preparation after schema ownership settles; US2 profile mutation work and US4 age work in separate application/test files; iOS and Android qualification with isolated accounts after the same validated build is available. Do not mark shared coordinator/model edits parallel merely because the stories differ.
- Deliver US1 as the first independently testable slice, then customization/session/age and finally complete erasure integrations. This sequencing is not permission to release without remaining accepted capabilities or the global gates.
- Final verification covers the entire code tree under F13 for code changes, while this documentary issue uses only structure, formatting, links, OpenAPI source checks and consistency review. No load, benchmark, capacity or monthly availability work.
