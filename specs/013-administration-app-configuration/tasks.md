# Tasks: F12 administration and access configuration

**Input**: [plan](plan.md), [spec](spec.md), [research](research.md), [model](data-model.md), [contracts](contracts/consumers.md), [validation](quickstart.md).

These are future implementation tasks, not work executed by the documentary dossier. All remain unchecked. Runtime work requires explicit plan/global acceptance and the initialized F13 projects. Tests are included because the requested plan requires database, contract, mobile, integration and native evidence. No deployment, provider changes or implementation issues are created here.

## Phase 1 — Setup and contract adoption

- [ ] T001 Resolve actual F13 initialized projects/toolchains and F05 account foundations against `apps/backend/pom.xml`, `apps/mobile/package.json` and `contracts/`; reuse approved versions/targets and remove the planning bypass only under the first implementation delivery lifecycle. Do not scaffold a second runtime or empty layer. [FR-034/035; Constitution I/IV]
- [ ] T002 Adopt `contracts/configuration.openapi.yaml` from this dossier into `contracts/public/configuration/`, replacing the documentary Problem reference with F13's single shared source; wire the real Java/TypeScript generation roots, ignored outputs and typed maintenance extension for concerned ordinary APIs. [FR-005/016/034; Constitution IV]
- [ ] T003 Add contract fixtures in `contracts/tooling/tests/configuration/` for seven operations, 21 required known booleans, additive fields, required/null semantics, safe integer revisions, UTF-16 limits, empty/nested patches and unknown safe error codes; generate and compile actual backend/mobile consumers through F13 targets. [FR-005/007/008/011/025/034]

## Phase 2 — Foundations

**Goal:** establish persistent owners and current authorization prerequisites without adding business routes ahead of their tests.

- [ ] T004 [P] Add the grant catalogue and `account_permission` composite key/FK/code constraint in `apps/backend/src/main/resources/db/changelog/accounts/`, extending F05's current account schema; define the accounts-owned grant/authorization types in `apps/backend/src/main/java/com/blockout/accounts/domain/`. [FR-001–005]
- [ ] T005 [P] Add independent configuration singleton models and Liquibase rows in `apps/backend/src/main/java/com/blockout/configuration/domain/` and `apps/backend/src/main/resources/db/changelog/configuration/`, with safe revisions, inactive usable maintenance seed and absent minima; no runtime default recreation. [FR-006–011/018/024/030]

## Phase 3 — US1: access only authorized commands (P1)

**Independent validation:** V01 compares guest, ordinary, single-permission operators, owner, revoked and unusable accounts; direct calls cannot gain implicit rights.

- [ ] T006 [US1] Add PostgreSQL/Spring fixtures in `apps/backend/src/test/java/com/blockout/accounts/` for new-account grant atomicity/concurrent bootstrap, retained revocation on login, invalid/duplicate/orphan grants, deletion acceptance and fresh UUID recreation. Extend F05 tests rather than introducing an alternative bootstrap. [FR-001/002/005; A01/A02/A05/A16]
- [ ] T007 [US1] Implement current grant resolution and serialized mutation authorization in `apps/backend/src/main/java/com/blockout/accounts/application/` and expose the account/action/resource API in `accounts/api/`; use the account-row locking order documented in the model and map refusals safely. [FR-003–005]
- [ ] T008 [US1] Extend actual F05 new-account creation and local erasure in `apps/backend/src/main/java/com/blockout/accounts/application/` with exactly three ordinary grants/removal of all grants in their existing transactions; integrate with `apps/backend/src/main/java/com/blockout/coordination/AccountErasureCoordinator.java` without a new F12 cleanup owner. [FR-001/005; F05 T007–T008/T027–T029]
- [ ] T009 [US1] Implement `GET /api/v1/me/capabilities` in `apps/backend/src/main/java/com/blockout/accounts/api/` with all known booleans, no-store and usable-account checks; bind its validated client projection in `apps/mobile/src/features/configuration/api/`. [FR-003–005]
- [ ] T010 [US1] Integrate capability-driven command visibility and F05/F13 session clearing in `apps/mobile/src/features/configuration/model/` and existing `apps/mobile/src/shared/session/`; reject old-session responses and expose no implicit owner/Pro/legal grants. Cover these boundaries in `apps/mobile/src/features/configuration/__tests__/capabilities.test.ts`. [FR-003–005/014; A03–A05/A16]
- [ ] T011 [US1] Write and qualify the controlled owner-only grant/revocation runbook in `docs/operations/manage-account-permissions.md` against a disposable database: environment, exact current UUID, shared account lock, before/after delta, rollback and reread on lost acknowledgement; no email approximation or live permission assignment. [FR-002/004/005]

## Phase 4 — US2: prepare and publish settings safely (P1)

**Independent validation:** V02 saves content without activation, preserves other groups/drafts and refuses stale writes; lost acknowledgements lead to truthful rereads.

- [ ] T012 [US2] Add real concurrent PostgreSQL fixtures in `apps/backend/src/test/java/com/blockout/configuration/` for content/state revision races, independent groups, no-op, missing rows, safe revision overflow, null/absence and refusal rollback; assert current permission at the serialized mutation point. [FR-006–011]
- [ ] T013 [US2] Implement maintenance content/state and version candidate validators plus short optimistic transactions in `apps/backend/src/main/java/com/blockout/configuration/{domain,application,infrastructure}/`; enforce normalized versions, message/URL limits and conditional store acknowledgement from the model, with no external I/O inside SQL. [FR-006–011/024/025/028/030/031]
- [ ] T014 [US2] Implement five administrative operations and coherent public snapshot read in `apps/backend/src/main/java/com/blockout/configuration/api/`, mapping known errors and no-store responses; reliable administrative reads establish only their own group, missing rows fail explicitly. [FR-006–011/018/030]
- [ ] T015 [US2] Build maintenance form, local preview, explicit activation/deactivation and save outcome state in `apps/mobile/src/features/configuration/ui/` and `model/`; cover dirty refresh, initial failure, conflict, image removal/failure, discarded draft and uncertain reread in `__tests__/maintenance-form.test.tsx` using the approved nodes. [FR-006–011/031; A06–A12]

## Phase 5 — US3: understand blocking and regain access (P1)

**Independent validation:** V03 proves direct server enforcement, complete cold-start verification without fallback, explicit bypass lifetime and targeted recovery while preserving accepted domain operations.

- [ ] T016 [US3] Add admission/exception and post-admission mutation fixtures in `apps/backend/src/test/java/com/blockout/security/`, covering forged/revoked bypass, configuration failure, maintenance-only administration, retained support/auth/callback obligations and activation after admission. [FR-012–016/018–020]
- [ ] T017 [US3] Implement root maintenance admission and explicit operation exemptions in `apps/backend/src/main/java/com/blockout/security/`, using module APIs; bind F01/F02 current permissions to actual mutation boundaries in `acquisition/application/` and `sport/application/`, including rechecks after logo upload. Never stop acquisition or recheck maintenance to cancel admitted work. [FR-004/005/012–014/019/020]
- [ ] T018 [US3] Add cold-start/session/race fixtures in `apps/mobile/src/features/configuration/__tests__/access.test.ts` for all matrix rows: failure immediately after a successful prior process, explicit retry success/failure, ignored legacy stored snapshots, partial observations, reverse responses, Auth0/foreground return, account switch and open-session continuity without a timer. [FR-014–018/024–027/031]
- [ ] T019 [US3] Implement the pure process-local access decision in `apps/mobile/src/features/configuration/model/`, retaining complete-check outcome separately from observed resource revisions; start unavailable with no storage hydration, require eligible complete success for ordinary access, and wire cold start/explicit Retry only with in-memory bypass through F05/F13. Create no access-storage adapter or verification timestamp. [FR-014–018/024–027/031]
- [ ] T020 [US3] Integrate typed no-retry maintenance refusals into `apps/mobile/src/shared/api/` and approved blocking/recovery routes in `apps/mobile/src/app/` with feature views in `features/configuration/ui/`; qualify public-read failure/admin-read success, known minimum, inaccessible admin read and Retry after save without ordinary access leakage. [FR-012/013/016/018/026/027/031]

## Phase 6 — US4: retain notifications without sending (P1)

**Independent validation:** V04 retains eligible inbox history/purge and prevents every new push during maintenance or an unestablishable maintenance state, with no reopening backlog.

- [ ] T021 [US4] Expose and test the current maintenance read/unavailability interface in `apps/backend/src/main/java/com/blockout/configuration/api/` and `apps/backend/src/test/java/com/blockout/configuration/MaintenanceReadTest.java`; a controlled caller proves only the F12 interface. [FR-021–023]
- [ ] T022 [US4] After the real F07 sending owner exists, integrate that interface immediately before its provider attempt in `apps/backend/src/main/java/com/blockout/notifications/application/` and qualify real inbox/purge/send interactions in `apps/backend/src/test/java/com/blockout/notifications/`; include operators, failed configuration read, reopening, new event and already-handed-off message. Do not substitute a temporary sender or add delayed replay work. [FR-021–023; F07 FR-024–026/A26–A28]

## Phase 7 — US5: update and correct blocking configuration (P1)

**Independent validation:** V05 distinguishes platform/version boundaries, requires store confirmation and preserves all restrictions after unavailable media or store failures.

- [ ] T023 [US5] Add parity fixtures in `contracts/tooling/tests/configuration/versions.json`, consumed by `apps/backend/src/test/java/com/blockout/configuration/` and `apps/mobile/src/features/configuration/__tests__/versions.test.ts`, for numeric normalization/limits, malformed input, absent minimum, unknown installed version and independent platforms. [FR-024/025/030]
- [ ] T024 [US5] Implement the approved platform editing/preview/save/confirmation forms in `apps/mobile/src/features/configuration/ui/` and validation in `model/`, using existing version operations; reset acknowledgement when the confirmed proposal changes, preserve unrelated fields and handle conflict/uncertainty. Cover with `__tests__/versions-form.test.tsx`. [FR-008–011/024/028/030]
- [ ] T025 [US5] Integrate `expo-application` installed-version reads and store opening in `apps/mobile/src/features/configuration/model/native-version.ts` and `ui/UpdateRequiredScreen.tsx`; preserve maintenance-first presentation, non-bypassable minima and explicit Retry/support after unknown version or store failure. [FR-024–029/031]
- [ ] T026 [US5] Qualify actual iOS/Android binaries and the F14-provided store identities against `apps/mobile/app.config.ts` and `specs/013-administration-app-configuration/quickstart.md` V05, including provider availability acknowledgement and combined recovery/version restriction; record external evidence in the owning issue. No store mutation or automatic minimum increase. [FR-026–031/035]

## Phase 8 — Cross-cutting qualification

- [ ] T027 [P] Validate module graph, safe diagnostics and no-store/error semantics in `apps/backend/src/test/java/com/blockout/` with F13 tooling; ensure no accounts-to-configuration dependency, cross-module repositories, credentials, personal payloads or media URLs in diagnostics. [FR-034; Constitution II]
- [ ] T028 [P] Run real generated Java/TypeScript consumer checks and permission/admission/form integration scenarios through `contracts/tooling/tests/configuration/`, `apps/backend/src/test/` and `apps/mobile/src/features/configuration/__tests__/`; cover the typed 503 extension in actual ordinary API contracts. [FR-001–031/034; Constitution IV]
- [ ] T029 [P] Qualify approved light/dark, small-screen and enlarged-text journeys on native devices against `specs/013-administration-app-configuration/contracts/mobile-and-design.md`, including the accessible explicit refresh action and gate-heading focus, roles, targets, reduced motion, image/store failures and operator-only actions; record scoped evidence in the owning issue. [FR-034/036]
- [ ] T030 Reconcile F14 supported-client and store/transition evidence with `specs/014-v1-v2-transition/` and the complete F12 quickstart coverage; report passed/failed/skipped/unavailable boundaries and remaining risks without claiming F07/provider/native completion from documentary checks. [FR-034–036; SC-001–007]

## Dependencies and execution order

T001 precedes T002 → T003, then T004 and T005 may run in parallel. All story work follows this foundation. Existing F13 runtime, generation, error and session work plus F05 account schema/current-account API must exist; see [qualified prerequisite IDs](contracts/consumers.md#existing-implementation-plan-prerequisites).

US1: T006 → T007 → T008 → T009 → T010 → T011. T008 extends **005-accounts-identity/T007–T008 and T027–T029**, not an F12 replacement; T010 uses **003-shared-quality/T023–T024 and 005-accounts-identity/T020**. T011 depends on the account locking protocol, not on a privileged UI.

US2: after US1, T012 → T013 → T014 → T015. T013 implements backend version rules needed by the coherent snapshot; US5 owns the mobile version journey and native qualification. This avoids adding a placeholder permissive version service in US3.

US3: after US1/US2, T016 → T017 and T018 → T019 → T020; T020 joins both paths. T017 additionally needs **001-source-acquisition/T013–T014/T036/T052** and **002-sporting-data/T017–T018/T038–T039/T041–T042** at their actual mutation boundaries. The full access decision includes version rules from the outset; T025 later supplies the real native adapter, so combined native evidence remains blocked until US5.

US4: T021 after T014; T022 after T021 and the real F07 sending/retention owner. F07 currently has no technical task IDs; its FR-024–FR-026/A26–A28 are the explicit dependency. Interface-only evidence does not complete US4.

US5: T023 → T024 → T025 → T026 after US2; it can progress alongside US3/US4 on distinct files, coordinating the shared access model with T019. T026 needs real F14 store inputs and native builds. Final T027–T029 follow their implemented boundaries and can run independently; T030 follows all evidence, including T022 and T026.

## Parallel examples and independent checkpoints

- US1: a reviewer may prepare the owner runbook while capability UI work proceeds after the locking protocol is established; changes to shared accounts files remain sequential. V01 is the checkpoint.
- US2: after API/transaction work, independent form review and PostgreSQL evidence may proceed on different files. V02 qualifies saved-state semantics before access integration.
- US3: backend T016–T017 and mobile T018–T019 use different owners/files after their shared contracts are fixed; T020 joins them. V03 includes the recovery matrix.
- US4: T021's interface tests may run while F07 implementation progresses independently; the real join remains T022. No fake sender is an independent completion shortcut.
- US5: native store/installed-version qualification and contract parity review may proceed after their implementation prerequisites, with independent iOS/Android evidence. V05 retains platform-specific outcomes.

`[P]` marks independent tasks at the same available dependency stage, not permission to ignore prerequisites. Tasks without `[P]` may contain separate later verification activities but are not blanket parallel coding instructions.

## Implementation strategy

Deliver a first demonstrable increment with US1's explicit grants/capabilities and V01 evidence. Then add safe edits (US2), complete blocking/recovery (US3), the real F07 seam (US4) and native versions/stores (US5), retaining regression coverage at each checkpoint. Tests for a boundary must first demonstrate the missing/refused behavior before its implementation is accepted. Global launch requires all five journeys and final qualification; a partial increment is not authorization to deploy.

No task creates roles, delegation, emergency infrastructure, polling, push replay, performance/load/capacity work or monthly availability accounting. The 30 tasks trace through the [coverage map](quickstart.md#coverage); all task IDs in this file are local to F12 unless explicitly feature-qualified.
