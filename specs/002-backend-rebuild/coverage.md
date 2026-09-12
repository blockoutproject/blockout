# Rebuild Requirement Coverage

This is a static traceability map, not an execution tracker. [Epic #230](https://github.com/blockoutproject/blockout/issues/230) owns assignments, dependencies, delivery status, and evidence. Requirement identifiers resolve in [spec.md](spec.md); decision identifiers resolve in [the architecture decision](../../docs/architecture/backend-rebuild-architecture.md). Baseline journeys and scenarios resolve in [the evidence inventory](../../docs/engineering/backend-preservation-baseline.md).

A mapping is not proof of completion. No row is checked by writing this document. Feature plans/tasks must refine the owning requirements before executable child issues are created.

## Epic Obligations

| Epic item                            | Requirement or architectural authority                                      | Acceptance boundary                                                          |
| ------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 01 — Functional/permission inventory | FR-017, FR-030, FR-038 through FR-047                                       | Baseline J01–J08; Story 1–8                                                  |
| 02 — End-to-end data mapping         | FR-017, FR-018, FR-024                                                      | Baseline data/contract inventories; S02–S05                                  |
| 03 — Reference evidence              | SC-001, SC-012                                                              | Baseline S01–S14; controlled fixture provenance                              |
| 04 — Reset contract                  | FR-001 through FR-006, FR-048, FR-052                                       | Story 1, Story 8; S01, S12–S14                                               |
| 05 — Functional specifications       | FR-001 through FR-053                                                       | All stories, success criteria and UI design gates                            |
| 06 — Domain/ownership                | FR-004, FR-017, FR-018, FR-022; D01, D02                                    | Identity/season invariants and coherent publication                          |
| 07 — APIs/compatibility              | FR-003, FR-011 through FR-016, FR-021, FR-030 through FR-035; D05, D06, D07 | Generated boundaries, errors, cursor/filter/zone isolation                   |
| 08 — Plans/tasks/analysis            | SC-012; D01 through D12                                                     | Official Spec Kit derivation and cross-artifact analysis after prerequisites |
| 09 — Modules/builds                  | D01, D10                                                                    | Reproducible toolchains, dependency boundaries, image revisions              |
| 10 — Liquibase                       | FR-018, FR-022, FR-049; D02, D05                                            | Empty/future schema, constraints, temporal parity                            |
| 11 — Reference bootstrap             | FR-049; D02                                                                 | Required mappings/legal/status/assets and repeatable initialization          |
| 12 — Environment isolation           | FR-053; D01, D10, D12                                                       | Distinct old/new state and bounded runtime configuration                     |
| 13 — Authentication/authorization    | FR-004 through FR-010, FR-040, FR-043, FR-046                               | S11–S13; direct negative authorization tests                                 |
| 14 — Reliable events                 | FR-021, FR-027, FR-029, FR-037, FR-039; D03                                 | Crash/retry/lease/replay and effect idempotency                              |
| 15 — Errors/diagnostics              | FR-035, FR-045, FR-050; D11                                                 | Safe recovery and absence of sensitive diagnostics                           |
| 16 — Import contract                 | FR-015, FR-018, FR-021 through FR-027; D04, D05                             | Scope, completeness, chronology, publication outcomes                        |
| 17 — FFVB                            | FR-012, FR-015, FR-024                                                      | Departmental/regional/national fixtures and midnight conventions             |
| 18 — LNV/DataProject                 | FR-015, FR-024, FR-025                                                      | Priority, matching, missing optional enrichment                              |
| 19 — Club enrichment                 | FR-017, FR-023 through FR-026                                               | Contacts/location; isolated failures never mass-deactivate                   |
| 20 — Reconciliation                  | FR-018, FR-019, FR-023, FR-025, FR-026                                      | Rename/repeat/reactivation/correction/source ordering                        |
| 21 — Scraper runtime                 | FR-016, FR-027, FR-028                                                      | Concurrency, shutdown, five/thirty-minute calendar, source failure           |
| 22 — Import replay                   | FR-021, FR-027, FR-029                                                      | Received versus published, retained failed work, silent bootstrap            |
| 23 — Catalog                         | FR-017, FR-018, FR-046                                                      | J03/J08; owned relations and authorized edits                                |
| 24 — Match lifecycle                 | FR-011 through FR-019, FR-041                                               | Schedule precision, timezone, removed/corrected result                       |
| 25 — Rankings                        | FR-019, FR-020                                                              | Official source, fallback, penalties, deterministic ties                     |
| 26 — Feeds                           | FR-011 through FR-014, FR-030 through FR-032                                | Device-local days, bounded continuation and refresh                          |
| 27 — Mobile composition              | FR-017, FR-030, FR-031; D06, D07                                            | Bounded owner queries, no per-row fan-out                                    |
| 28 — Search                          | FR-033 through FR-037; D09                                                  | Relevance corpus, compatibility, bulk failures, generation catch-up          |
| 29 — Lives                           | FR-042, FR-043                                                              | S09; own/other/moderator, quotas, active-link race                           |
| 30 — Profile recreation              | FR-002, FR-004, FR-005, FR-009, FR-010                                      | S01/S12; simultaneous login and linked identities                            |
| 31 — RevenueCat                      | FR-006 through FR-010, FR-047                                               | S12/S13; controlled purchases/restores, expiry/outage, switching             |
| 32 — Favorites/counters              | FR-009, FR-038                                                              | S07; idempotence, audience/count consistency                                 |
| 33 — Profile/deletion                | FR-001, FR-002, FR-044                                                      | S10; deliberate deletion distinct from reset                                 |
| 34 — Inbox                           | FR-039, FR-041, FR-048                                                      | S08; read/open/delete/deep link and corrected content                        |
| 35 — Push                            | FR-005, FR-029, FR-039 through FR-041, FR-047                               | Device ownership, duplicate events, failed/uncertain send                    |
| 36 — Administration                  | FR-016, FR-028, FR-046, FR-049                                              | Mapping, schedule, maintenance, minimum versions and bypass                  |
| 37 — Documents/reports               | FR-045, FR-047                                                              | J06; guest/user access, PDFs, reports and upstream failure                   |
| 38 — Media                           | FR-001, FR-017, FR-044, FR-045, FR-049                                      | New upload/seed, validation, replacement and cleanup                         |
| 39 — Generated mobile boundary       | FR-003, FR-011 through FR-015, FR-035, FR-045; D06, D10                     | Generation, auth, temporal mapping, errors, cancellation, uploads            |
| 40 — Mobile remote state             | FR-002, FR-005, FR-013, FR-030 through FR-032                               | Reset, account/zone keys, cross-page headers, FlashList release checks       |
| 41 — Figma                           | FR-011 through FR-014, FR-032, FR-035; specification authority              | Approved redesign evidence including material new states and Story 7         |
| 42 — Native/deep links               | FR-002, FR-005, FR-006, FR-011, FR-013, FR-047, FR-048                      | Real iOS/Android upgrade, purchases, push, dates, links, consent             |
| 43 — Preservation evidence           | SC-001 through SC-007, SC-011, SC-012                                       | S01–S14 plus temporal/search/linking additions                               |
| 44 — Performance                     | FR-051, SC-008, SC-009; D01, D07, D09                                       | Measured baseline, twice-peak mixed workload, no invented production proof   |
| 45 — Grafana                         | FR-028, FR-050; D11                                                         | UTC events, foreground latency and true publication/projection freshness     |
| 46 — CI/CD                           | D02, D10, D12                                                               | Clean generation/build, migration job, immutable images and health gates     |
| 47 — Rehearsal                       | FR-003, FR-006, FR-048, FR-049, FR-052; SC-010                              | Old/new binaries, fresh state, identity continuity, compatible recovery      |
| 48 — Cutover/retirement              | FR-052, FR-053; D12                                                         | Explicit opening decision, old writers isolated, replacement-only recovery   |

## Reference Scenarios

| Scenario                      | Replacement acceptance owner                            |
| ----------------------------- | ------------------------------------------------------- |
| S01 — Fresh startup           | Story 1/8; FR-001 through FR-005, FR-049, FR-052        |
| S02 — Provider coverage       | Story 3; FR-017, FR-024, FR-025                         |
| S03 — Repeat/rename           | Story 3; FR-018, FR-021, FR-027                         |
| S04 — Incomplete/empty        | Story 3; FR-015, FR-022 through FR-025                  |
| S05 — Conflicts/results       | Story 3/5; FR-019, FR-020, FR-026, FR-041               |
| S06 — Navigation/continuation | Story 2/4; FR-011 through FR-014, FR-030 through FR-037 |
| S07 — Follows                 | Story 5; FR-038                                         |
| S08 — Inbox/push              | Story 5; FR-005, FR-029, FR-039 through FR-041, FR-048  |
| S09 — Lives                   | Story 5; FR-016, FR-042, FR-043                         |
| S10 — Profile/documents       | Story 6; FR-044, FR-045, FR-047                         |
| S11 — Permissions             | Story 1/5/6/7; FR-004, FR-007, FR-009, FR-040, FR-046   |
| S12 — Paying-user continuity  | Story 1/7; FR-001 through FR-010                        |
| S13 — Restore/changes         | Story 1/7; FR-005 through FR-010, FR-047                |
| S14 — Bootstrap/operations    | Story 3/8; FR-027 through FR-029, FR-049 through FR-053 |

## Observed Defects and Deliberate Corrections

Baseline D1 (club failure/deactivation) maps to FR-023; D2 (discarded failed match writes) to FR-021/FR-027; D3 (favorite/counter/event inconsistency) to FR-038; D4 (notification reservation loss) to FR-039; D5 (stale composition caches) to FR-028/FR-032/FR-037; D6 (result transitions) to FR-019/FR-041; D7 (device ownership) to FR-040; D8 (penalty loss) to FR-020.

Additional source evidence in the architecture decision covers mixed-timezone labels, provider midnight/default dates, destructive index initialization, and search exception-to-empty responses. These are correction requirements, not reasons to preserve the old implementation.

## Delivery Derivation

Follow the proposed order: specification/architecture, technical foundation, identity/Pro, one complete sporting slice, source coverage, search, community/support, full mobile integration, qualification/cutover. Tests accompany each delivery.

Do not create forty-eight placeholder issues. After a bounded feature's specification, design gate where applicable, and technical plan are accepted, use the official task-generation and analysis workflows. Each resulting issue must resolve to its task and actual native blockers. No final technical plan, executable task list, or runtime completion is implied by this coverage map.
