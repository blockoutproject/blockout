---
description: "Implementation tasks for F12 administration and application access"
---

# Tasks: F12 administration and application access

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md) and [quickstart.md](quickstart.md), for [#87](https://github.com/blockoutproject/blockout/issues/87) under [#82](https://github.com/blockoutproject/blockout/issues/82).

**Prerequisites**: Accepted owning artifacts, [constitution](../../.specify/memory/constitution.md) and [agent guidance](../../AGENTS.md). The selected stack and scoped design approvals remain applicable. This file schedules future implementation; its creation performs no runtime setup, account assignment, provider change or production operation.

**Tests**: The specification explicitly requests A01–A33, A35 and SC-001–007 qualification. Write automated tests before their corresponding implementation and observe meaningful failures. Prepare manual cases before executing them with actual builds, implemented owners, safe fixtures and authorization. FR-032/FR-033 and A34 are withdrawn, not implementation obligations. Documentation checks and doubles do not establish native, store or production evidence.

**Organization**: Setup/foundation precede US1–US5, all P1, in specification order. Controlled dependencies permit local development; full acceptance requires the integrations identified below. Future owner task files are not prerequisites for authoring this file.

## Format: `[ID] [P?] [Story] Description`

- **[P]** marks distinct-file work that can run together after its prerequisites.
- **[USn]** identifies the specification's story; setup/foundation/polish have no story label.
- All boxes remain unchecked until the future implementation or qualification is complete.

## Path Conventions

- Backend feature: `apps/backend/src/main/java/com/blockout/backend/access/`, corresponding `src/test/java/` and `src/main/resources/db/changelog/`. Keep application/domain/API/persistence responsibilities local; use in-process owner ports, never cross-feature JPA entities.
- Mobile feature: `apps/mobile/src/features/access/`; thin ordinary/operational layouts in `apps/mobile/src/app/`. Reuse F05's session owner and F13's transport, Query configuration, theme and feedback controls.
- Canonical HTTP sources: `contracts/http/mobile/openapi.yaml`, `access/` and the existing F05 `accounts/schemas.yaml`. F13 generates ignored Java interfaces/DTOs and mobile Query functions/Zod schemas; add no editable projection or alternate access API.
- Existing operational instructions: `infra/operations/README.md`. Safe qualification results belong in the owning quickstart; private account identifiers, credentials and diagnostics remain outside this public repository.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Consume the bounded F13 foundation and the early F05 account/session capabilities without waiting for complete business journeys.

- [x] T001 Integrate F12 dependencies in `apps/backend/pom.xml` and `apps/mobile/package.json` after [F13 T001–T017 and T038](../003-shared-quality/tasks.md); reuse Spring Security/JPA, native Auth0, Expo Router, Linking, TanStack Query and React Hook Form/Zod under the approved stack. Reuse the installed compatible dependencies; add expo-application with its first native consumer in T038, not during contract qualification. Introduce no new service, permission engine or state library. Use [F05 T009–T010](../005-accounts-identity/tasks.md) for the minimal account model/persistence/lock before permission persistence tests; full F05 account reads may then consume F12's projection.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the generated contract boundary shared by every story.

- [x] T002 Write failing consumer compatibility tests in `apps/backend/src/test/java/com/blockout/backend/access/api/AccessContractWebMvcTest.java` and `apps/mobile/src/features/access/__tests__/access-contract.test.ts`, exercising actual F13-generated Java/TypeScript models. Cover required complete groups, nullable optional fields, additive responses, optional capability booleans with only literal true granting access, unknown request fields, safe-integer revisions through 9007199254740991, canonical errors and no-store. Distinguish invalid known data from absent capabilities and a generic dependency 503 from typed maintenance.
- [x] T003 Regenerate and integrate the canonical access/account projections through `apps/backend/pom.xml` and `apps/mobile/orval.config.ts`, making T002 pass with F13's supported generator/validation path. Preserve the authored `contracts/http/mobile/access/` semantics, F05 AccountResponse’s “required `permissions` object of named boolean capabilities” and ignored generated outputs; do not fork generated encoders, handwrite DTO mirrors or treat schema lint as consumer execution.

**Checkpoint**: Generated representations are executable. Backend permissions can build on the bounded F05 account persistence; native composition later requires F05 T004, actual F14 initialization and F13 T040, not finished account journeys or final cutover.

---

## Phase 3: User Story 1 — Access only authorized commands (Priority: P1) 🎯 MVP

**Goal**: Give ordinary accounts their conditional capabilities while every privileged action uses a separate, current grant assigned manually by the owner.

**Scope**: A01–A05; FR-001–005; SC-001.

**Independent Test**: Separate maintenance, versions, bypass and domain grants permit only their own commands; guests, revoked grants and old sessions produce no side effects, including direct calls. Ordinary account creation grants no privilege.

### Tests for User Story 1

- [ ] T004 [P] [US1] Write failing current-permission tests in `apps/backend/src/test/java/com/blockout/backend/access/application/CurrentPermissionsTest.java` for the three independent F12 grants, separate F01/F02/F08 action mappings, absent/deleted accounts and no inferred role, Pro power or automatic grant. Ordinary capabilities retain domain ownership, visibility, age and quota conditions, including F08's seven days and its owner-defined moderation exception.
- [ ] T005 [P] [US1] Write failing PostgreSQL tests in `apps/backend/src/test/java/com/blockout/backend/access/infrastructure/PermissionPersistenceIntegrationTest.java` for unique account/action associations, cascade deletion, recreation without old grants and concurrent protected mutation versus manual withdrawal in both orders. Use F05's actual account persistence/lock: domain roots first in owner order, then accounts in UUID order, current grants after the lock, no sporting root acquired afterward.
- [ ] T006 [P] [US1] Write failing semantic presentation tests in `apps/mobile/src/features/access/__tests__/administration-entry.test.tsx` for absent/false/true/additive capabilities, independent command visibility, revoked rights and late F05 generations. A visible administration entry must not confer a domain permission or bypass; F09 owner-only operations and F11 legal publication remain outside mobile delegation.

### Implementation and qualification for User Story 1

- [ ] T007 [US1] Implement permission persistence in `apps/backend/src/main/java/com/blockout/backend/access/infrastructure/` (including `PermissionEntity.java`) and `apps/backend/src/main/resources/db/changelog/access.xml`, registered in `db.changelog-master.xml` under F13's baseline policy. Preserve “Store a unique association `(accountId, permission)` referencing the active F05 business UUID. Deletion cascades with that account.” Use known backend action definitions, no role/owner table, grant history, startup grant or assignment endpoint; make T005's association cases pass.
- [ ] T008 [US1] Implement current action definitions and projection in `apps/backend/src/main/java/com/blockout/backend/access/domain/Permission.java` and `apps/backend/src/main/java/com/blockout/backend/access/application/CurrentPermissions.java`. Map `maintenance.manage`, `application-versions.manage`, `maintenance.bypass` and the owned F01 `collection.manage` / F02 / F08 actions to the eight canonical booleans, with `stream-links.moderate` covering publication/withdrawal and no extra grant. Preserve “Properties are optional and absence means no capability.” Emit all known values, tolerate additive response fields and add no `isAdmin`, owner flag or dynamic permission interpreter.
- [ ] T009 [US1] Wire current permission checks into `apps/backend/src/main/java/com/blockout/backend/access/application/ActionAuthorization.java` and F05's `apps/backend/src/main/java/com/blockout/backend/accounts/api/AccountApiMapper.java`; every AccountResponse producer uses the same in-process projection. Expose the narrow action check to owner use cases, checking current account/grant/resource before effects under the agreed lock order. Make T004/T005 pass without relying on JWT roles or client visibility; account erasure removes grants but not global settings.
- [ ] T010 [US1] Implement permission-aware entry/command presentation in `apps/mobile/src/features/access/components/administration-entry.tsx` and `apps/mobile/src/features/access/screens/administration-screen.tsx`, consuming generated current-account capabilities and F05's generation boundary. Make T006 pass using literal true only, explicit owned actions and F13 UI controls; defer gated route admission to T028 rather than inferring it from a menu.
- [ ] T011 [US1] Document owner-only manual grant/revoke transactions in `infra/operations/README.md`, then qualify direct authorization with the actual F05 lifecycle and F01/F02/F08 commands in `specs/013-administration-app-configuration/quickstart.md`. Verify account locking, no delegated SQL access, revoked/old-session refusals, erase/recreate behavior and retained F09/F11 ownership; use synthetic/private account references and no public grant ledger. Local permission tests can finish before those domain commands, but this integration proof cannot.

**Checkpoint**: The permission MVP is independently testable. It is not proof that maintenance gates, native sessions or every domain command have been integrated.

---

## Phase 4: User Story 2 — Prepare and publish settings without unintended effects (Priority: P1)

**Goal**: Read and save two independently versioned groups, keeping preparation separate from activation and preserving drafts after refusal, conflict or an uncertain outcome.

**Scope**: A06–A12; FR-006–011 and shared FR-024/030 field rules; SC-002.

**Independent Test**: Saving maintenance content never changes activation; changes affect only their group, optional null differs from omission, stale writes cannot overwrite and matching no-ops preserve revision. A failed load or late refresh never supplies savable defaults or silently replaces dirty input.

### Tests for User Story 2

- [ ] T012 [P] [US2] Write failing generated-interface MVC tests in `apps/backend/src/test/java/com/blockout/backend/access/api/AdministrationSettingsWebMvcTest.java` for maintenance GET/PATCH, desired-state activation PUT and versions GET/PATCH. Cover independent grants, application/json PATCH with Accept-Patch, required revision, forbidden unknown fields, omission/null semantics, whole-result validation, 400/401/403/409/415/422 and 200 complete-group responses; stale no-op is 409, not 412.
- [ ] T013 [P] [US2] Write failing PostgreSQL/value tests in `apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsIntegrationTest.java` for the two fixed rows, content versus activation, simultaneous same-group writes including separate iOS/Android edits, independent-group writes, matching/stale no-ops and revision overflow. Cover all data-model message/image/version/store constraints and one-SQL-statement complete reads; missing or invalid settings must fail closed, never become fresh defaults.
- [ ] T014 [P] [US2] Write failing semantic form tests in `apps/mobile/src/features/access/__tests__/maintenance-settings.test.tsx` for loading, known state, dirty input, failed load, validation refusal, confirmed failure, lost response, conflict and explicit reread/resubmission. Cover optional image clearing, invalid URL, image display failure and activation separate from content saving; no automatic mutation replay or refresh overwriting a draft.

### Implementation and qualification for User Story 2

- [ ] T015 [US2] Implement the two settings aggregates/JPA mappings in `apps/backend/src/main/java/com/blockout/backend/access/domain/MaintenanceSettings.java`, `ApplicationVersionSettings.java` and `apps/backend/src/main/java/com/blockout/backend/access/infrastructure/AccessSettingsEntity.java`, extending `apps/backend/src/main/resources/db/changelog/access.xml`. Preserve maintenance field constraints verbatim: `active` — “Desired global maintenance state. Content edits never change it.”; `message` — “Required plain text, trimmed and nonempty, usable without media.”; `imageUrl` — “Optional controlled HTTPS asset URL; null removes it. No credentials, personal data or personalized tracking URL.”; `revision` — “JPA-managed monotonic version; advances for an accepted state change.” Preserve “One fixed-identity row contains independent iOS and Android minimum versions/store URLs, one optional shared update message and its own revision. Each platform starts with no minimum and no link; the shared message starts absent.” Initialize maintenance inactive with the approved usable message and no image, only for a fresh database; later deployments preserve settings under F13's baseline-freeze policy.
- [ ] T016 [US2] Implement feature-local settings validation in `apps/backend/src/main/java/com/blockout/backend/access/domain/AccessSettingsValidation.java`. Preserve “Versions use three decimal integer components without leading zeros except zero itself.”; “Compare components numerically, not lexically; keep components within the safe integer range supported by the actual JSON/JavaScript consumer.”; “No prerelease/build suffixes, ranges or coercion of malformed input.”; “A null minimum removes that platform's requirement.” Preserve “A retained minimum requires a valid HTTPS link to the platform's store: App Store under `apps.apple.com`, Google Play under `play.google.com/store/apps/details` with the intended application ID.” Preserve “Optional message null removes the customization and uses the existing understandable update text.” and “Revisions are nonnegative integers representable exactly by JavaScript, backed by database/JPA versions.” Enforce wire/component safe integers through 9007199254740991 and refuse overflow; add no backend image fetch or store-availability assertion.
- [ ] T017 [US2] Implement settings read/write use cases and persistence in `apps/backend/src/main/java/com/blockout/backend/access/application/ReadAccessConfiguration.java`, `UpdateAccessSettings.java` and `apps/backend/src/main/java/com/blockout/backend/access/infrastructure/`. Read both rows in one SQL statement projection; expose stored authorized content but null prepared message/image in inactive public responses. Validate complete resulting groups atomically, preserve omitted fields, allow null only for optional values, require current grants under the account lock, compare submitted revision and retain JPA commit-time optimistic checks. Make T013 pass: explicit desired activation, matching no-op unchanged, stale/competing write 409 with no effects and no global revision row/cache.
- [ ] T018 [US2] Implement generated-interface controllers and API mapping in `apps/backend/src/main/java/com/blockout/backend/access/api/ApplicationAccessController.java`, `AdministrationSettingsController.java` and `AccessApiMapper.java`, making T012 pass. Keep public complete GET independent of identity, settings management separately authorized, full-group write responses and canonical no-store/errors; use F13's shared handler, not an alternate error catalogue or endpoint.
- [ ] T019 [US2] Implement maintenance content and activation forms in `apps/mobile/src/features/access/screens/maintenance-settings-screen.tsx` and `apps/mobile/src/app/(operations)/administration/maintenance.tsx`, making T014 pass with generated queries/mutations and React Hook Form/Zod. Keep last accepted state separate from the draft, preserve dirty input, distinguish null removal from omission, and require reread then explicit resubmission after an uncertain outcome or conflict. Use the existing image component for URL preview, no upload flow; do not publish unloaded defaults or open ordinary access from this partial response.
- [ ] T020 [US2] Qualify settings concurrency and uncertain saves through actual generated provider/mobile consumers in `specs/013-administration-app-configuration/quickstart.md`, using T012–T019 with isolated PostgreSQL. Exercise two editors, independent groups, same-group platform edits, content while active, lost responses, rejected invalid image/store/version data and unchanged drafts. Record actual evidence separately from controlled form tests; complete native gate integration waits for US3/US5.

**Checkpoint**: Settings are independently manageable with correct concurrency and drafts. The public complete representation is available to US3; partial management responses never establish ordinary admission.

---

## Phase 5: User Story 3 — Understand the block and regain access (Priority: P1)

**Goal**: Admit ordinary work only from current complete configuration and enforce maintenance on the server, while preserving explicit operational exceptions and the limits of accepted work.

**Scope**: A13–A22; FR-012–020, FR-031 and gate aspects of FR-025–027/034–036; SC-003/004.

**Independent Test**: A failed cold start stays closed; explicit retry can recover without restart, bootstrap or interactive sign-in. Partial or old results cannot lift a known restriction. Current maintenance blocks direct ordinary calls, preserves accepted outcomes and collection state, and allows only the defined exceptions and personal current-authorized bypass.

### Tests for User Story 3

- [ ] T021 [P] [US3] Write failing server admission tests in `apps/backend/src/test/java/com/blockout/backend/access/api/MaintenanceAdmissionWebMvcTest.java` for current PostgreSQL state, activation ordering, narrow method/resource exceptions and direct ordinary calls. Cover public access including F14's legacy read, current-account GET only, separately authorized operational commands, public legal and health; block account establishment/edit/erasure/photos without valid bypass. Validate the exact header, guest/revoked bypass, domain rights, typed maintenance versus generic 503, invalid refusal payload and no invented Retry-After promise.
- [ ] T022 [P] [US3] Write failing observation tests in `apps/mobile/src/features/access/__tests__/access-observations.test.ts` for cold-start isolation, full results older than either observed group, late maintenance refusals, partial administrative reads/saves and failed retries. Only a successful complete response at least as current as both observations may establish admission; partial inactive maintenance or lowered minimum never opens ordinary access, and old generations cannot publish.
- [ ] T023 [P] [US3] Write failing root/retry/gate tests in `apps/mobile/src/features/access/__tests__/access-gates.test.tsx` for public checking independent of Auth0 restoration, F14 initialization ordering, silent renewal and current-account retry without bootstrap or interactive sign-in. Cover only cold-start/explicit full checks, no foreground/auth-return/timer/reconnect refetch, no help/legal/support/sign-in navigation or deep-link/back bypass across all three gates, and maintenance-first display without admitting an outdated operator. Use controlled store callbacks here; actual native store behavior is qualified in US5.
- [ ] T024 [P] [US3] Write failing bypass integration tests in `apps/mobile/src/features/access/__tests__/maintenance-bypass.test.ts` for explicit current-account intent, cold start/sign-out/account change/grant loss clearing, successful full inactive maintenance clearing, silent renewal and old-generation responses. Exercise F13's generated-call transport and F05 private photo reads: send the dedicated header only to the Blockout backend, never to Auth0, store or image URLs.

### Implementation and qualification for User Story 3

- [ ] T025 [US3] Implement current PostgreSQL maintenance admission in `apps/backend/src/main/java/com/blockout/backend/access/application/MaintenanceAdmission.java` and wire the method/resource policy in `apps/backend/src/main/java/com/blockout/backend/config/SecurityConfiguration.java`. Make T021's authorization cases pass with current usable account/grant checks for `Blockout-Maintenance-Bypass: true`, including otherwise public business reads. Reject invalid header syntax; inactive maintenance ignores intent without granting any other action. Operational commands need their own grants, not personal bypass; no blanket `/administration/**` exemption. Keep ingestion/internal authorization independent and expose a narrow in-process current-maintenance read for F07.
- [ ] T026 [US3] Map maintenance refusals through `apps/backend/src/main/java/com/blockout/backend/shared/http/ApiExceptionHandler.java` and `apps/mobile/src/features/access/api/maintenance-problem.ts`, making the remaining T021 cases pass with `urn:blockout:problem:maintenance`, status 503 and current active maintenance data. Validate known fields and semantic consistency after generated validation; an inconsistent/generic failure uses unavailability and never fabricates maintenance, a version requirement or admission. Preserve safe French errors and F13 diagnostics without payloads, identifiers, an activity ledger or reopening promises.
- [ ] T027 [US3] Implement complete-check ownership and observations in `apps/mobile/src/features/access/queries/use-application-access.ts` and `apps/mobile/src/features/access/state/access-observations.ts`, making T022 and T023's retry cases pass. Use generated TanStack calls and current-process highest revision/restriction per group, not a persistent cache or second configuration service. Cold start and explicit retry alone fetch the full configuration; the existing retry separately obtains native credentials and refetches F05's existing account when usable. Identity failure cannot delay the public result, erase credentials or grant operator entry; sign-in return refreshes only the account. Partial administration results advance observations but require a new complete retry for ordinary admission.
- [ ] T028 [US3] Compose admission and separate ordinary/operational Expo Router protected groups in `apps/mobile/src/app/_layout.tsx`, `apps/mobile/src/app/(ordinary)/_layout.tsx`, `apps/mobile/src/app/(operations)/_layout.tsx` and `apps/mobile/src/features/access/screens/access-gate-screen.tsx`. Integrate actual F14 initialization, F05 T004 and F13 T040; the public check stays independent of credential initialization/restoration. Place ordinary routes behind complete check, platform minimum and maintenance policy; operational routes require usable current action grants and the platform minimum without requiring personal bypass. Make T023 pass with maintenance's plain “Accès administrateur” only for eligible existing sessions, explicit “Réessayer”, provisional media before copy, one Lucide circular arrow and approved diagonal bands static under reduced motion. No blocked-screen interactive sign-in, help, legal or support route; standalone F11 URLs remain outside mobile gating.
- [ ] T029 [US3] Implement transient bypass intent in `apps/mobile/src/features/access/state/maintenance-bypass.ts` and integrate it through `apps/mobile/src/shared/api/api-fetch.ts` with F05's private photo consumer, making T024 pass. Require an explicit choice, current capability and the satisfied platform minimum; use F05's session generation, clear at every defined boundary and never persist a token/episode registry. Extend the shared backend transport once, with no generated-code patch or forwarding credentials/headers to remote media or stores.
- [ ] T030 [US3] Qualify maintenance admission against actual F01/F05/F09/F10 operations in `specs/013-administration-app-configuration/quickstart.md`: activate before versus after short-operation admission, preserve confirmed purchases, accepted erasure and fully received support outcomes, and defer uncertain outcomes to each owner. Demonstrate unchanged collection pause/cycle/resumption/missed-run state and independently authorized internal work; no general cancellation, suspension or catch-up mechanism.
- [ ] T031 [US3] Run the native gate cases in `specs/013-administration-app-configuration/quickstart.md` on actual iOS/Android builds after T028/T029 and US5's store action. Exercise independent public/account failures, retry after transient identity failure, old/full/partial responses, revoked bypass, direct routes/back navigation, media failure, screen reader/text scaling and reduced motion. Use actual F05/F14 lifecycle and F13 controls; report unavailable device/provider evidence explicitly, never substitute screenshots or mocks for these results.

**Checkpoint**: Ordinary and operational admission are distinct and coherent across server and native consumers. Maintenance has no instant-screen-update or cross-system cancellation guarantee; US4 separately proves the push handoff boundary.

---

## Phase 6: User Story 4 — Retain notifications without sending during maintenance (Priority: P1)

**Goal**: Preserve F07 inbox and retention while skipping new sporting push admissions during maintenance, including operator recipients.

**Scope**: A23–A26; FR-021–023; SC-005.

**Independent Test**: Maintenance leaves eligible inbox creation and daily purge running but permits no new push admission; reopening does not replay skips or restore expired entries. Already admitted handoffs retain their provider limitations.

### Tests for User Story 4

- [ ] T032 [US4] Prepare failing maintenance-consumer cases in `apps/backend/src/test/java/com/blockout/backend/notifications/application/MaintenancePushAdmissionTest.java` against F07's owning handoff boundary. Cover current maintenance immediately before each provider-handoff admission, ordinary and bypass recipients, continued inbox/purge, activation after an earlier admission, no recall claim and no replay on reopening; controlled provider results prepare the policy proof without claiming an actual send.

### Implementation and qualification for User Story 4

- [ ] T033 [US4] Integrate T025's in-process current-maintenance read into the F07-owned handoff policy at `apps/backend/src/main/java/com/blockout/backend/notifications/application/SportingPushAdmission.java`, making T032 pass. F07 retains recipient/permission/retention/association logic and the actual provider sender. Skip only new sporting push admissions while active; add no persistent retry window, duplicate sender, collection switch or mobile polling.
- [ ] T034 [US4] Qualify A23–A26 with actual F07 inbox, daily purge and provider-handoff implementation in `specs/013-administration-app-configuration/quickstart.md`, reusing the [F07 owning quickstart](../011-notifications-delivery/quickstart.md). Demonstrate all-recipient skipping, expired-entry non-resurrection, no backlog replay, ordinary handling for new post-maintenance events and current gates on opening an earlier push. Distinguish a handoff admitted before activation from a new admission; never claim an atomic remote stop/recall.

**Checkpoint**: Local consumer policy can be implemented before F07's provider qualification; story acceptance requires the actual F07 paths, not a second notification implementation.

---

## Phase 7: User Story 5 — Update and correct blocking configuration (Priority: P1)

**Goal**: Enforce independent platform minimums, make store failures understandable and support authorized correction and initial owner preparation through accepted operations.

**Scope**: A27–A33, A35; FR-024–031/034–036; SC-006/007. A34 and FR-032/033 remain withdrawn.

**Independent Test**: Lower/equal/higher native versions compare numerically for the correct platform; absent thresholds impose no minimum, malformed required metadata remains unavailable, and no operator bypasses a minimum. Store failure preserves the gate; valid correction/removal affects only versions and respects both-group observations.

### Tests for User Story 5

- [ ] T035 [P] [US5] Write failing native-version/store tests in `apps/mobile/src/features/access/__tests__/installed-version.test.ts` and `store-action.test.tsx` for numeric 2.9.0/2.10.0, equality, absent thresholds, three valid safe-integer components, rejected suffix/build/range/malformed input, unavailable required metadata and correct-platform link. Verify open failure/retry without inferring installation, no minimum bypass, maintenance-first display and an outdated operator's refused operational route.
- [ ] T036 [P] [US5] Write failing versions-form tests in `apps/mobile/src/features/access/__tests__/application-versions-settings.test.tsx` for separate iOS/Android fields sharing one revision, minimum/link consistency, optional-message fallback, omission/null, dirty input, failed load, 409, uncertain save and explicit reread/resubmission. Reuse US2's resulting-state rules; no automatic merge/replay, default publication or maintenance change.

### Implementation and qualification for User Story 5

- [ ] T037 [US5] Implement the generated-consumer versions form in `apps/mobile/src/features/access/screens/application-versions-settings-screen.tsx` and `apps/mobile/src/app/(operations)/administration/application-versions.tsx`, making T036 pass with T017/T018's existing atomic group operations and shared feedback/form conventions. Preserve per-platform links/minimums and shared optional message; removing a link with a retained minimum is refused, null minimum removes that requirement and absent text uses the approved understandable fallback. Successful partial saves advance T027 observations without opening ordinary access.
- [ ] T038 [US5] Implement native installed-version parsing/comparison and store action in `apps/mobile/src/features/access/native/installed-version.ts` and `apps/mobile/src/features/access/components/store-action.tsx`; bind them into `apps/mobile/src/features/access/screens/access-gate-screen.tsx`, making T035 pass. Install the SDK-compatible expo-application version using Expo CLI in `apps/mobile/package.json`, then read its published native version, compare validated numeric components under T016's exact rules and use native Linking for the intended platform store. Missing threshold needs no comparison; unreadable required metadata uses the existing unavailable gate. Retry is explicit, opening is not installation, no foreground full-check loop or new support/recovery screen is added.
- [ ] T039 [US5] Qualify native installed-version metadata and store opening on both actual platform builds in `specs/013-administration-app-configuration/quickstart.md`, including combined maintenance/update, lower/equal/higher versions, lost store availability and corrected/removed thresholds. Verify the target Blockout binary is actually downloadable before any authorized threshold increase; coordinate F14's actual store/legacy compatibility proof, with no automatic store monitor or implication that maintenance retires V1.
- [ ] T040 [US5] Extend `infra/operations/README.md` with the accepted first-environment preparation and ordinary settings-correction steps, linked from F13/F14 operations: before public V2 exposure, normal sign-in using a production test-channel binary, owner SQL grant to that new business UUID, verify management, then activate maintenance if opening is deferred. Test distribution alone does not protect backend exposure. For a wrong setting preventing mobile correction, ordinary authorized SQL preserves validation invariants and increments only the affected revision, then rereads committed state and verifies with an admitted current binary; no seeded administrator, hidden sign-in, emergency endpoint/console, reset or weakened minimum.
- [ ] T041 [US5] Qualify T040 in an authorized isolated environment through `specs/013-administration-app-configuration/quickstart.md`, using actual F05 authentication, T025/T028 admission and F13/F14's deployment preparation. Verify unprivileged second account refusal, outdated-operator refusal, persisted settings across redeployment, ordinary SQL correction with monotonic revisions and subsequent complete-read admission. Reuse F13 restoration obligations for current grants/erasures without adding A34's withdrawn emergency programme; this proof does not authorize production preparation, store publication, migration or provider changes.

**Checkpoint**: Version and preparation evidence covers the accepted scope. F14 continues to own actual V1/V2 compatibility and public launch, including both stores offering V2 before ordinary V1 retirement.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T042 Review touched handwritten F12 code and owning integrations under `apps/backend/src/main/java/com/blockout/backend/access/` and `apps/mobile/src/features/access/` for relevant language/documentation guidance, safe diagnostics, current owner boundaries and approved French/accessibility states. Keep ordinary incidents observable under F13 during maintenance; add no identifier/payload logging, personal activity system, SLA accounting or extra monitoring programme.
- [ ] T043 Run the selected generated Java/mobile, PostgreSQL, semantic and native suites through the committed F13 targets in `apps/backend/pom.xml` and `apps/mobile/package.json`, including every implemented AccountResponse producer and affected admission consumer. Confirm no generated artifacts are tracked and no new API/DTO/permission authority duplicates an owner. Repeat only affected checks after demonstrated corrections; distinguish unavailable integrated/native/store evidence from passing local tests.
- [ ] T044 Complete A01–A33/A35 and SC-001–007 evidence in `specs/013-administration-app-configuration/quickstart.md`, updating actual runnable commands/results and concise operational links. Check all 34 active functional requirements; explicitly retain withdrawn FR-032/033 and A34 as exclusions. Run repository documentation/contract verification from `README.md`, report passed/failed/unavailable evidence and retain every unresolved acceptance obligation without claiming design, runtime, provider or production approval from document checks.

---

## Dependencies & Execution Order

### Phase and owner dependencies

| Increment  | Local prerequisites and work                                                                                       | Integration needed for full acceptance                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation | T001 → T002 → T003; F13 generation/transport/JWT and bounded F05 account persistence.                              | Actual generated consumers, not schema lint alone.                                                                                                         |
| US1        | T004–T006 cases → T007–T010 implementation; no complete F05 journey dependency for initial persistence/projection. | T011 needs actual F05 erasure/recreation and F01/F02/F08 protected commands. F05 account response adapters consume T008/T009.                              |
| US2        | Foundation and US1's T007–T009 checks; T012–T014 → T015–T019 → T020.                                               | Actual PostgreSQL/generated consumers; native guards are separately qualified in T031.                                                                     |
| US3        | US1 current grants and US2 complete reads; T021–T024 → T025–T029.                                                  | T028/T029 need F05 T004 plus actual F14 initialization and F13 T040; T030 needs actual F01/F05/F09/F10 outcomes; T031 needs T038 and actual native builds. |
| US4        | T025's current read; T032 → T033.                                                                                  | T034 waits for F07 inbox, purge and provider handoff. A policy double is not the integration result.                                                       |
| US5        | US2 versions persistence/API and US3 admission/observations; T035/T036 → T037/T038.                                | T039 needs actual builds/store access and F14 compatibility; T041 needs T040, actual F05 and F13/F14 isolated preparation.                                 |
| Polish     | T042–T044 after the affected implementation and qualifications.                                                    | Unavailable evidence keeps its owning acceptance open.                                                                                                     |

```text
F13 foundation/JWT + F05 minimal account persistence → T001–T003
Foundation → US1 current permissions T004–T010 → F05 current-account projection
US1 → US2 settings T012–T020 → US3 server/client admission T021–T029
F14 early initialization → F05 native session T004 → F13 shared binding T040 → F12 T028/T029
US3 current-maintenance read → US4 policy T032/T033 → actual F07 → T034
US2/US3 → US5 forms/native action T035–T038 → T039 and US3 native T031
Actual F01/F05/F09/F10 operations → T030
F13/F14 deployment preparation + F05 sign-in + T040 → isolated T041
All applicable story evidence → T042–T044
```

The referenced F05 T009/T010 account persistence can precede its full US1, which consumes the F12 permission projection. F05 T004's native owner and F14's early initialization precede F13 T040; none requires final account journey or V1-retirement completion. F12's root composition then consumes that binding while keeping public access checking independent. This sequence does not duplicate account lifecycle, native initialization or shared transport.

### Within each story

Write and observe failing tests before their associated implementation; keep models/validation before use cases, use cases before controllers, and controlled checks before actual integration. Qualification references do not authorize provider/production actions. A story can be exercised with controlled dependencies, but its checkpoint is fully accepted only when its stated integration evidence exists.

Serialize edits to `access.xml` (T007/T015), the F05 response mapper and shared security/HTTP wiring, `apps/mobile/src/app/_layout.tsx` (F05/F13/F14/T028), `api-fetch.ts` (F13/T029), `access-gate-screen.tsx` (T028/T038), `infra/operations/README.md` (T011/T040 and other owners) and the shared quickstart. Different stories do not make shared-file edits parallel.

### Parallel execution examples

- **US1**: T004 + T005 + T006 cover separate server/database/mobile files after foundation and the bounded account model/lock exist. T007–T010 then follow their inputs; T011 remains an actual-owner qualification.
- **US2**: T012 + T013 + T014 prepare distinct MVC, PostgreSQL and form cases. Implement in dependency order; T019 may use controlled generated responses while T017/T018 finish, but T020 requires the real provider.
- **US3**: T021 + T022 + T023 + T024 prepare separate boundary cases. Backend T025/T026 and client T027 may progress with controlled contracts; root/transport composition and native proof wait for their named owners.
- **US4**: No independent intra-story batch is claimed: T032 → T033 → T034. This policy work can proceed beside US5 once T025 exists, without duplicating F07 work.
- **US5**: T035 + T036 prepare separate native-action and form cases. T037 and T038 can then progress on different feature files after their shared API/admission prerequisites; serialize the gate-screen integration before native proofs.

## Implementation Strategy

1. **MVP first**: Complete setup/foundation and US1. Validate current action grants, direct refusals, manual owner assignment and capability presentation before treating administration as usable. This is a permission MVP, not public launch readiness.
2. **Incremental settings and admission**: Deliver US2's atomic settings, then US3's server/native gates. Develop with bounded F05/F13/F14 inputs; retain actual owner/native proofs as explicit obligations rather than waiting for all feature programmes before coding.
3. **Complete maintenance and versions**: Integrate US4 with F07 and finish US5 native stores/settings/preparation. Validate combined restrictions and monotonic observations through actual consumers; no privileged bootstrap or withdrawn recovery circuit.
4. **Close only supported evidence**: Complete polish and each story's acceptance evidence. Documentation, generated schema validation, mocked providers and native screenshots each retain their limits; production and F14 launch operations require their own authorization.
