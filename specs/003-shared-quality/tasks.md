# Tasks: F13 shared foundation, operations and quality

**Input**: [plan](plan.md), [spec](spec.md), [research](research.md), [models](data-model.md), [contracts](contracts/api.md), [quickstart](quickstart.md).
**Execution boundary**: these are future implementation tasks, not authorization to execute them under documentary issue #18. Global planning acceptance and an explicitly authorized implementation issue are required first. Actual production/provider work needs its owning authorized scope.

**IDs**: local IDs are T001–T050. Every external reference MUST use `003-shared-quality/Tnnn`; `[USn]` preserves the specification's story number. All entries remain unchecked. Tests are included because the specification explicitly requires boundary and acceptance evidence. Write the relevant failing behavioral fixture before its implementation when applicable; do not manufacture tests for static prose.

## Phase 1 — Setup

- [ ] T001 Verify removal of the planning force-push bypass and restored administrator enforcement before executable edits; follow `AGENTS.md`, record settings in the owning GitHub issue and stop if unavailable. [Constitution V; delivery contract]
- [ ] T002 Initialize locked Node/npm/Nx orchestration in `package.json`, `package-lock.json` and `nx.json`, with explicit native projects/inputs/outputs and no remote service. [Constitution IV; plan workspace]
- [ ] T003 Initialize the single Java/Maven project and wrapper at `apps/backend/pom.xml` and `apps/backend/mvnw`, qualifying selected stable patches and Modulith verification without empty business modules. [Constitution II/IV; approved stack]
- [ ] T004 [P] Initialize the Python/uv project at `apps/ingestion/pyproject.toml` and `apps/ingestion/uv.lock`, with package `blockout_ingestion`, frozen tooling and generated-client import boundary. [Constitution IV; approved stack]
- [ ] T005 [P] Initialize Expo/native configuration at `apps/mobile/package.json` and `apps/mobile/app.config.ts`, locking selected compatible versions without new product screens or production identifiers. [FR-029; Constitution III/IV]
- [ ] T006 Add the simple persistent PostgreSQL/OpenSearch Compose and native-app commands at `infra/local/compose.yaml` and `package.json`, with shared setup/verification instructions in `docs/development.md`; qualify startup/stop without volume deletion. [FR-017; plan local development]

## Phase 2 — Foundation

- [ ] T007 Define source-first public/internal/shared technical contract structure and pinned generation configs in `contracts/tooling/`, following `specs/003-shared-quality/contracts/api.md`; fail Redocly bundling on semantic component-name collisions (`--component-renaming-conflicts-severity=error`), preserve inherited authentication when assembling roots, and keep qualification operations in test fixtures, not fabricated production APIs. [FR-013, FR-017; Constitution IV]
- [ ] T008 Qualify strict requests, additive validated responses, enums/dates/errors/204 and clean reproducibility in `contracts/tooling/tests/`, including a conflicting-component fixture that must fail rather than silently rename, compiling/importing all three consumers and blocking unsupported generator combinations. [FR-008, FR-013, FR-018; Constitution IV]
- [ ] T009 Wire generator dependencies and ignored outputs in `apps/backend/project.json`, `apps/ingestion/project.json`, `apps/mobile/project.json`, `contracts/project.json` and `.gitignore`; verify clean consumer builds. [Constitution IV]
- [ ] T010 Implement safe ProblemDetail/Security failure mapping and strict request validation in `apps/backend/src/main/java/com/blockout/platform/http/`, with boundary tests under `apps/backend/src/test/java/com/blockout/platform/http/`. [FR-008, FR-013, FR-015]
- [ ] T011 Define fail-closed startup/security/private internal transport and separate migration/runtime credential configuration in `apps/backend/src/main/resources/application.yaml` and `infra/dokploy/`; keep product roles with F05/F12. Implement the exact public `/health/readiness` health-group mapping (application/PostgreSQL only), keeping detailed management/metrics private. [FR-009, FR-015, FR-017, FR-018]
- [ ] T012 Expand `.github/workflows/ci.yml` and `package.json` to full verification for all code changes, safe documentation-only classification and one required verify result; qualify shared-contract and unknown-path changes. [Constitution IV/V; delivery contract]

**Foundation checkpoint**: clean locked builds, generated validation and security defaults qualified; no provider/production claims. Later stories may start independently subject to their explicit domain dependencies.

## Phase 3 — US1: Correct current authorized consultation (P1)

**Goal**: accepted state/freshness and contract correctness reach consultation without global polling.
**Independent validation**: Q01; A02–A03. Real business acceptance requires F02/F03/F04.

- [ ] T013 [US1] Add response-validation and retained-data failure fixtures in `apps/mobile/src/shared/api/__tests__/`, covering additive fields, invalid consumed fields and non-JSON failure before cache installation. [FR-004, FR-005, FR-008; SC-002]
- [ ] T014 [US1] Implement the thin validated mobile API mutator at `apps/mobile/src/shared/api/` and connect generated consumers; do not duplicate remote state or introduce global freshness timers. [FR-004, FR-008; Constitution IV]
- [ ] T015 [US1] After F02/F03/F04 implementations exist, integrate correction/supplier-failure/current-visibility acceptance tests in `apps/backend/src/test/java/com/blockout/consultation/` and the owning mobile feature tests, preserving domain authority and honest freshness. [FR-004, FR-005, FR-008; SC-002]

## Phase 4 — US2: Understand incidents and intervene (P1)

**Goal**: useful signals and outside-VPS detection with one logical opening/actual recovery.
**Independent validation**: Q02; A05–A07; no monthly availability reporting.

- [ ] T016 [P] [US2] Implement sanitized structured server logging and safe diagnostic references in `apps/backend/src/main/resources/logback-spring.xml`, with secret/personal fixture exclusion tests in `apps/backend/src/test/java/com/blockout/platform/logging/`. [FR-010, FR-013]
- [ ] T017 [P] [US2] Implement equivalent allowlisted collector diagnostics in `apps/ingestion/src/blockout_ingestion/diagnostics/` and `apps/ingestion/tests/diagnostics/`, distinguishing acquisition/integration outcomes. [FR-005, FR-010, FR-013]
- [ ] T018 [US2] Configure Alloy and private metrics/log collection in `infra/observability/alloy/`, native container log rotation and Grafana dashboards/rules in `infra/observability/grafana/`; retain useful domain states/counts without personal labels. [FR-009, FR-010, FR-013]
- [ ] T019 [US2] Configure external 60-second HTTPS checks with five-minute failure condition, IRM grouping/positive recovery and two Discord channels through `infra/observability/README.md`; qualify free quotas, no reminders, missing-series and exceptional transport duplicates. [FR-009–FR-012; SC-004]
- [ ] T020 [US2] Integrate F01-owned thresholds and confirmed integration/reconstruction incident/recovery signals into `infra/observability/grafana/` once their domain states exist; verify pause/other-scope/download success cannot close the wrong incident. [FR-005, FR-009–FR-012; SC-004]
- [ ] T021 [US2] Document and exercise authorized diagnostic/recovery and preproduction silence-stop-start procedures in `docs/operations/operate-environments.md`, including operator access prerequisites, actual recovery checks and notification reactivation. [FR-011, FR-014; SC-004]

## Phase 5 — US3: Preserve rights and action effects (P1)

**Goal**: no cross-account data or unauthorized effect; no automatic replay of uncertain mutations.
**Independent validation**: Q03; A08–A10. F05/F09/F11 own provider/lifecycle semantics.

- [ ] T022 [P] [US3] Add real permission/no-effect integration scenarios under `apps/backend/src/test/java/com/blockout/security/` for visitor, missing permission, other owner and revoked session as owning domain operations become available. [FR-015, FR-017, FR-018; SC-005] Apply F05 standard-token limits; no extra business session registry or retroactive JWT invalidation is implied.
- [ ] T023 [P] [US3] Add delayed old-session response and mutation-response-loss fixtures under `apps/mobile/src/shared/api/__tests__/`, including failed abort and account switch during queued retry. [FR-016, FR-018, FR-019; SC-005]
- [ ] T024 [US3] Integrate session-generation invalidation, private-cache clearing and cancellation into `apps/mobile/src/shared/session/` with F05's session provider; retain no parallel identity/token owner. [FR-015, FR-016, FR-018]
- [ ] T025 [US3] Wire domain-specific safe rereads/version-conflict handling and pending submission protection into owning `apps/mobile/src/features/` actions; qualify actual F06/F08/F10 operations without a universal receipt or retry ledger. [FR-008, FR-019; SC-005]
- [ ] T026 [US3] Qualify request/upload bounds, private route rejection, runtime-vs-migration credentials and safe secret handling using `infra/dokploy/` and backend security tests; feature contracts supply actual business bounds. Prove minimal readiness 200, PostgreSQL-failure 503, no details and blocked public `/actuator/**`/metrics. [FR-009, FR-017, FR-018]

## Phase 6 — US4: Recover useful state after interruption (P1)

**Goal**: accepted partial results survive; incomplete projections never replace usable data.
**Independent validation**: Q04; A11–A13. Requires F01/F02/F04 implementations for final domain evidence.

- [ ] T027 [US4] Add interrupted integration, old-observation replay and current restriction cases under `apps/backend/src/test/java/com/blockout/acquisition/` using F01/F02-owned identities and observation ordering. [FR-019, FR-021; SC-005]
- [ ] T028 [US4] Add interrupted replacement-index and visibility-filter tests under `apps/backend/src/test/java/com/blockout/search/` with real OpenSearch/PostgreSQL boundaries; integrate the F04-owned complete publication behavior. [FR-004, FR-020; SC-005]
- [ ] T029 [US4] Integrate useful pending/failed/partial counts and safe rerun/rebuild instructions into `docs/operations/operate-environments.md` from owning domain state; prove no notification replay or fabricated completion. [FR-010, FR-014, FR-019–FR-021]

## Phase 7 — US5: Restore retained data and files (P1)

**Goal**: independently recoverable data/files and current obligations before reopening.
**Independent validation**: Q05; A14–A18. Use isolated non-personal data and authorized provider configuration.

- [ ] T030 [US5] Configure native Dokploy PostgreSQL schedules, private S3 identity/prefixes and age-based 30-day retention in `infra/dokploy/`, with operator instructions in `docs/operations/configure-database-backups.md`; verify failed jobs never delete a prior copy early and normal expiry still applies. [FR-022, FR-023; SC-006]
- [ ] T031 [US5] Qualify native Dokploy completed dump/upload and failure notifications/history in `infra/observability/grafana/`; document that silently stopped schedules may not alert, with no last-success threshold or custom supervisor. Block reliance if actual completed protection cannot be established. [FR-009, FR-025; SC-006]
- [ ] T032 [US5] Configure hourly periodic AWS Backup with 30-day image retention, source version lifecycle and restricted vault/IAM in `infra/dokploy/`, with operator instructions in `docs/operations/configure-image-backups.md`, after verifying regional costs and bucket scope. Qualify native job notifications/history, byte expiry and isolated restoration; no continuous-protection configuration monitor or absence counter. [FR-017, FR-023–FR-025, FR-027]
- [ ] T033 [US5] Exercise origin-unavailable restore of PostgreSQL and actual image bytes using `docs/operations/restore-service.md`, identifying recovered scope, missing data, usable associations and elapsed duration; preserve evidence privately. [FR-022, FR-024, FR-026; SC-006]
- [ ] T034 [US5] Integrate F05/F09/F11 current identity/rights/erasure checks and F07 purge/consumed-fact checks into `docs/operations/restore-service.md`; prove missing evidence prevents affected access/sends, with F10 attachment obligations separately qualified. [FR-027; SC-006]
- [ ] T035 [US5] Implement immutable image publication and qualified digest promotion in `.github/workflows/deploy.yml` with source/lineage metadata, preproduction auto-start and serialized environment replacement; test mismatches/obsolete deliveries fail before mutation. [FR-014, FR-017, FR-028; delivery contract]
- [ ] T036 [US5] Implement distinct Liquibase execution and manual compatible rollback in `infra/dokploy/`, qualifying migration failure, old-runner stop, schema compatibility and refusal of unsafe automatic reversal. [FR-028; SC-006]

## Phase 8 — US7: Preserve logo associations for transition (P1)

**Goal**: provide protection/handoff evidence without performing F14's migration.
**Independent validation**: Q06; A22, certain/unresolved/missing-file cases.

- [ ] T037 [US7] Create non-personal association/file recovery fixtures under `apps/backend/src/test/resources/continuity/`, covering source-identified, ambiguous, unmapped and missing-file clubs. [FR-024, FR-032; SC-008]
- [ ] T038 [US7] Exercise protection/restore against those fixtures and document the required F14 handoff in `docs/operations/restore-service.md`: retain unresolved links, reject name-only matching, and block preservation claims for missing bytes. [FR-024, FR-026, FR-032; SC-008]
- [ ] T039 [US7] Reconcile the future actual inventory prerequisites with F14's approved `specs/014-v1-v2-transition/plan.md` when available; keep real inventory private and execute no export/reset/reassociation under this F13 task. [FR-032; SC-008]

## Phase 9 — US6: Native, accessible and understandable mobile (P2)

**Goal**: bounded usable states and platform-native evidence.
**Independent validation**: Q07; A19–A21.

- [ ] T040 [US6] Add controlled-clock timeout/retry/state fixtures under `apps/mobile/src/shared/api/__tests__/` for all operation classes, no-retry conditions, body-read deadline and navigation/cancellation behavior. [FR-008, FR-019, FR-031; SC-007]
- [ ] T041 [US6] Implement one-layer 10-second read/one-second retry/30-second mutation/60-second upload handling in `apps/mobile/src/shared/api/` and query configuration; preserve truthful errors and uncertain action outcomes. [FR-008, FR-013, FR-019, FR-031]
- [ ] T042 [US6] Implement concrete consumed shared controls/states under `apps/mobile/src/shared/ui/` from exact approved Figma evidence, with French text, 44-point targets, roles/states, text scaling, coherent focus and reduced motion. [FR-029, FR-030, FR-031; Constitution III]
- [ ] T043 [US6] Configure Sentry error/native crash reporting and source maps at `apps/mobile/app.config.ts` and `apps/mobile/src/shared/diagnostics/`; qualify payload exclusion and native retention without analytics/replay/profiling. [FR-013, FR-029]
- [ ] T044 [US6] Configure separate preview/production profiles at `apps/mobile/eas.json` and `apps/mobile/app.config.ts`, plus manual validated-main EAS build/submit in `.github/workflows/mobile-candidate.yml`; preserve F14 store identities and exclude OTA. [FR-017, FR-029; delivery contract]
- [ ] T045 [US6] Qualify actual iPhone/Android accessibility, visuals and affected auth/purchase/push/consent journeys following this dossier’s `quickstart.md` Q07 and the shared setup/build instructions in `docs/development.md`; record device/OS/build and unavailable evidence honestly. [FR-018, FR-029–FR-031; SC-007]
- [ ] T046 [US6] Integrate F12's per-platform minimum-version/store-availability behavior and supported-client API compatibility evidence into `apps/mobile/src/features/configuration/` and `contracts/tooling/tests/`, without automatically raising minimum versions. [FR-029; F12-owned policy]

## Phase 10 — Cross-cutting qualification

- [ ] T047 Reconcile every active F13 requirement and cross-feature dependency against `specs/003-shared-quality/cross-feature-inputs.md` and the delivered tree; close no story whose domain/provider evidence is unavailable. [FR-004–FR-032; Constitution I/V]
- [ ] T048 Run full `npm run verify`, clean generation and relevant native/operational scenarios from `specs/003-shared-quality/quickstart.md`; report failures/skips/limits against exact artifacts in owning GitHub work. [SC-002, SC-004–SC-008]
- [ ] T049 Finalize concrete shared developer instructions in `docs/development.md` and the operator procedures selected by this plan in `docs/operations/`, retaining manual safe operations and actual configured versions/commands. Follow the conditional project-documentation structures; keep executable truth in configuration, feature qualification in this dossier and local READMEs as orientation only. Create no empty document or duplicate procedure. [FR-014, FR-025, FR-028, FR-029]
- [ ] T050 Verify `git diff --check`, relevant formatting, no tracked generated outputs/secrets and unchanged `.agents/skills`/`.specify` imports before delivery; keep release/acceptance evidence in the authorized issue/PR. [Constitution IV/V]

## Dependencies and execution order

- T001 precedes every executable change. T002 precedes T003–T005; T003, T004 and T005 may proceed independently in their own trees. T006 follows their selected configuration.
- T007 → T008 → T009; T010–T011 use T007's contract. T012 follows generation/build integration. The foundation checkpoint requires T001–T012.
- US1 transport work can begin after foundation. T015 needs F02/F03/F04. US2 diagnostics can begin independently; T018 follows T016/T017, T019 follows T018, T020 needs F01/F02/F04, T021 follows alert setup.
- US3 T022 needs actual owned operations; T023 precedes T024/T025 and T024 depends on F05. T026 uses T011 and feature input bounds.
- US4 T027/T028 require the corresponding F01/F02/F04 implementation; T029 follows their evidence and US2 diagnostics.
- US5 T030 → T031; T032 is a separate protection boundary; T033 needs T030/T032. T034 needs F05/F07/F09/F10/F11 provider obligations. T035 requires T012/T018/T019, not the domain-dependent T020; T036 uses T030/T035 and the migration wiring.
- US7 T037 → T038 requires US5; T039 requires F14's approved plan, without claiming its execution.
- US6 T040 → T041 uses US1/US3 transport. T042 requires a real approved UI consumer. T043 depends on mobile configuration, T044 on CI, T045 on their relevant implementations and domain SDKs, T046 on F12.
- T047–T050 follow applicable completed stories; evidence requiring missing domains remains blocked, not waived. F13 foundation tasks unblock domain work; their later integration acceptance does not create a requirement to implement all business domains inside F13.

## Parallel examples

| Story | Safe example after stated prerequisites                                                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1   | Qualify mobile invalid-response fixtures while F02/F04 owners prepare their independently owned integration fixtures; serialize writes to shared transport |
| US2   | T016 backend diagnostics and T017 Python diagnostics use different trees; converge before T018                                                             |
| US3   | T022 server authorization tests and T023 mobile delayed-response fixtures                                                                                  |
| US4   | T027 acquisition and T028 search fixtures use separate module test trees once domain prerequisites exist                                                   |
| US5   | T030 PostgreSQL setup and T032 image protection with separate authorized provider scopes; converge before restore                                          |
| US7   | Prepare T037 synthetic fixtures while F14 prepares its own authorized inventory; T038/T039 remain ordered                                                  |
| US6   | T042 approved shared controls and T043 diagnostics can proceed in different source files; serialize app.config.ts edits with T044                          |

## Implementation strategy

Deliver setup/foundation and US1 transport as the first usable technical increment, not a production-release claim. Add diagnostics, authorization integration and delivery/protection capabilities in coherent increments. Domain-dependent acceptance follows the owning feature's implementation. All required stories, restore/security evidence and native qualification must pass before dependent production activation. No task adds performance targets, load tests, benchmarks, capacity planning or monthly availability accounting.
