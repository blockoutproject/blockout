---
description: "Implementation tasks for F04 search and discovery"
---

# Tasks: F04 search and discovery

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md) and [quickstart.md](quickstart.md), for [#91](https://github.com/blockoutproject/blockout/issues/91) under [#82](https://github.com/blockoutproject/blockout/issues/82).

**Prerequisites**: Accepted owning artifacts, [constitution](../../.specify/memory/constitution.md) and [agent guidance](../../AGENTS.md). T001–T007's dependency and request/context qualification is recorded in the [quickstart](quickstart.md#contracts-and-access); later business, native-device, deployment and restoration evidence remains future work.

**Tests**: A01–A29 and SC-001–007 explicitly require qualification. Write automated tests first and observe a meaningful failure before their associated implementation. Prepare manual/native cases before configuration; execute them only with actual prerequisites and authorization. Real analyzer and large-set traversal checks establish functional correctness, not a benchmark or capacity commitment.

**Organization**: Setup and the bounded foundation precede US2, US3, US4 and US5 at P1, then US1 at P2. F02 owns sporting truth, effective values and visibility; F03 owns summaries and destinations; F04 owns only derived matching, discovery and browsing. Shared transport, UI, identity, access, advertising and operations stay with their existing owners.

## Format: `[ID] [P?] [Story] Description`

- **[P]** identifies distinct-file work that may run together after its prerequisites.
- **[USn]** retains the specification's story number.
- Paths identify implementation or its qualification source. Checked tasks record the completed scope; remaining boxes stay unchecked.

## Path Conventions

- Backend search lives in `apps/backend/src/main/java/com/blockout/backend/search/`, with mirrored `src/test/java/` paths. Its focused engine port represents the real external dependency; current sporting reads use F02's application API, never its repositories or mutable JPA entities.
- Mobile discovery lives in `apps/mobile/src/features/discovery/`, with focused co-located `__tests__/` and a thin route in `apps/mobile/src/app/(tabs)/search.tsx`. Shared UI and Query/transport remain in F13's `apps/mobile/src/shared/` owners.
- Canonical sources remain `contracts/http/mobile/discovery/` and the shared mobile root. F13 generates Java interfaces/DTOs and mobile functions/types/validators into ignored build output. Reuse F03 summaries and F02 enums; introduce no contract copy, DTO mirror or collector-facing search API.
- Local infrastructure extends `compose.yaml`; environment configuration belongs in `infra/dokploy/`, native diagnostics in `infra/observability/`, and actual concise operations in `infra/operations/README.md`. Credentials, query text, city/contact values and raw engine/provider payloads stay out of public artifacts and telemetry.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Consume the existing foundation and qualify the selected search dependency before adoption.

- [x] T001 Verify F13 T001–T017 through `apps/backend/pom.xml`, `apps/mobile/orval.config.ts` and `README.md`: Java 25 Temurin/Spring Boot 4.1.1, PostgreSQL 18.6, Expo SDK 57/React Native 0.86/React 19.2.3, canonical generation and existing JUnit/Testcontainers/Jest tooling. Reuse the three applications and owner conventions; no new search service, database or framework initialization.
- [x] T002 Write failing Java/client integration cases in `apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchClientIntegrationTest.java` against OpenSearch 3.9.0: verified TLS/trust refusal, official client serialization, native query, bulk item outcomes, refresh and atomic aliases under Java 25. Use isolated synthetic indexes and credentials; the published client matrix is not proof of Java 25 compatibility.
- [x] T003 Configure official `opensearch-java` 3.10.0 with Apache HttpClient 5 in `apps/backend/pom.xml` and `apps/backend/src/main/java/com/blockout/backend/search/infrastructure/OpenSearchConfiguration.java`; add bounded connection/request configuration in `apps/backend/src/main/resources/application.yaml`, safe inputs in `apps/backend/.env.example` and local OpenSearch infrastructure in `compose.yaml`. Use trusted TLS, explicit environment loading and backend-only credentials; keep local application processes host-run, without Spring Data OpenSearch, demo credentials or a trust-all client.
- [x] T004 Run T002 using the actual selected Java/client/engine combination and validate the affected Compose configuration without exposing secrets; record executable commands in `README.md` and safe results against `specs/008-search-discovery/quickstart.md#contracts-and-access`. Failed compatibility blocks adopting this integration, not permission to change the accepted Java baseline or invent a compatibility layer.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared request/context boundaries for the three resource collections and options.

- [x] T005 [P] Write failing generated-boundary cases in `apps/backend/src/test/java/com/blockout/backend/search/api/DiscoveryContractTest.java` and `apps/mobile/src/features/discovery/__tests__/discovery-contract.test.ts` from the canonical discovery schemas. Cover additive responses versus invalid known fields/enums, absent values, 200 Unicode characters versus over-limit rejection without truncation, repeated distinct UUID `exampleIds` encoding, invalid parameter combinations, unknown query parameters, and malformed cursor/context. Generated JSON is validated once before Query admission; no separate token limit or hand-written transport types.
- [x] T006 [P] Write failing public-access/context tests in `apps/backend/src/test/java/com/blockout/backend/search/api/DiscoveryAccessTest.java` and `apps/mobile/src/features/discovery/__tests__/discovery-access.test.ts`: guest/free/Pro/unknown rights all access public search without waiting for identity; explicit bypass needs valid authorized current-environment credentials and never silently downgrades. Cover no-store/shared Problem Details and rejection of late old-session/bypass completions through F13/F05/F12 boundaries.
- [x] T007 Define immutable request/context values in `apps/backend/src/main/java/com/blockout/backend/search/application/SearchContext.java` and mobile context construction in `apps/mobile/src/features/discovery/api/discovery-context.ts`, making the shared boundary cases pass without implementing a second access owner. Preserve the model literally: “Resource type, normalized text, optional sporting filters and applicable access/session context. Empty text selects examples; nonempty text selects exhaustive textual traversal.” Keep normalization distinct from F02 identity rules and enforce canonical request constraints at the handwritten binding boundary; story adapters supply endpoints and responses.

**Checkpoint**: Shared contracts/context are testable. Feature implementation can use controlled owner inputs; complete integration requires the specific current-data, UI or native owners listed below, not all of F13's operations or F14's cutover.

---

## Phase 3: User Story 2 — Find a resource by its names and context (Priority: P1) 🎯 MVP

**Goal**: Find current clubs, teams and pools using accepted native matching and continuously reconstructible projections.

**Scope**: A05–A10, backend traversal of A17–A18 and current-data obligations of A21/A27; FR-006–010, FR-017–022, FR-026; SC-003 and the backend portion of SC-005/007.

**Independent Test**: With synthetic F02 identities, match names/context, aliases, accents, prefixes and small typos through the real engine. Change or restrict source values and rebuild without merging identities, inventing club context or leaking stale city matches. Test this slice with explicit query contexts; filter controls, complete mobile browsing and examples follow their own phases.

### Tests for User Story 2

- [ ] T008 [P] [US2] Write failing native analyzer/query tests in `apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchMatchingIntegrationTest.java`: `eag ly`, `Eagles Lyon`, `Volly Lyon`, all terms across fields, accent/case/whitespace handling, direct-match preference without absolute rank guarantees, scoped aliases/division abbreviations and strict combined filters. Exercise full/intermediate prefixes near 200 characters including `ﬃ` folding expansion; query analysis must retain whole terms so E/L initials cannot satisfy Eagles/Lyon. Nonempty punctuation-only text yields textual no-match, and mixed `Volly ly` is not an added promise.
- [ ] T009 [P] [US2] Write failing PostgreSQL/current-hydration cases in `apps/backend/src/test/java/com/blockout/backend/search/application/SearchCurrentDataIntegrationTest.java` through F02 application reads: one identity for several names, distinct namesakes, current logos/public summaries, club without teams, clubless professional team, attached club without identity change, all accepted seasons and participation/division restrictions. Change a city to corrected, absent or restricted while its old value remains indexed; omit stale candidates even for name matches until reindexing, with no old contact fallback.
- [ ] T010 [P] [US2] Write failing end-to-end PostgreSQL/OpenSearch traversal tests in `apps/backend/src/test/java/com/blockout/backend/search/application/SearchTraversalIntegrationTest.java` before T015/T018 implement their read/controller boundary. Seed 47 and more than 10,000 eligible matches, equal scores and interleaved ineligible/stale-city candidates; assert exact identity-set completeness on unchanged data, correct consumed boundaries, successful partial pages with continuation, established exhaustion and retryable bound/timeout/shard failures without empty continuation pages or a hidden total cap. Change generations/data, then restart traversal and verify current completeness without a snapshot promise.
- [ ] T011 [P] [US2] Write failing real-engine projection lifecycle cases in `apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchProjectionIntegrationTest.java`: commit versus rollback, dependent club/division/participation scopes, score-only exclusion, current reread after queued changes, startup/hourly fixed delay, disabled non-web scheduler, failed submission/item/refresh and interrupted or uncertain alias replacement. Verify serialization, old usable generation preservation, scoped cleanup and restart catch-up without persisted retry state.
- [ ] T012 [P] [US2] Write failing semantic matching-screen cases in `apps/mobile/src/features/discovery/__tests__/search-screen.test.tsx` for public three-tab access, shared text, 200 Unicode characters, no counter/hint, public names and available distinguishing context, same-named distinct identities and absent logo/club fields. Use controlled generated results and F13 UI, retaining honest initial loading/error/no-match states.

### Implementation and qualification for User Story 2

- [ ] T013 [US2] Define immutable documents, candidate/page values and the focused engine port in `apps/backend/src/main/java/com/blockout/backend/search/application/SearchDocuments.java`, `SearchPage.java` and `SearchEngine.java`. Preserve model constraints: clubs — “Club viewability does not require a visible team. No raw contact/address/email/phone.”; teams — “Seasonal identity; no invented club/context for unattached professional teams. Viewability depends on current participation and division rules.”; pools — “Current F02 viewability; published past/future seasons remain eligible.”; page — “Up to twenty current resource summaries and an optional next cursor; no total. Failure does not erase previous authorized pages or establish exhaustion.” Index one document per existing keyword UUID, F02-scoped aliases/division terms and only available permitted context; use French labels féminin/masculin/mixte and 6x6/4x4/2x2 with the existing exact enum filters.
- [ ] T014 [US2] Implement the focused native adapter in `apps/backend/src/main/java/com/blockout/backend/search/infrastructure/OpenSearchEngine.java` and mappings in `apps/backend/src/main/resources/search/indices.json`, making T008 pass. Use `copy_to` whole-word/prefix aggregates, standard tokenizer/lowercase/asciifolding, explicit whole-word search analyzer on the prefix field, index-only edge grams 1–800 with corresponding `max_ngram_diff`, tokenizer maximum 1024 and preserved original words. Submit whole text to two alternative AND `match` branches (prefix or whole-word `fuzziness: AUTO`), requiring one complete branch; exact filters stay outside. Use ordinary direct/name boosts, one primary shard and zero replicas, without token decomposition, stop words, stemming, synonym rewrites or scoring scripts.
- [ ] T015 [US2] Implement current hydrated reads in `apps/backend/src/main/java/com/blockout/backend/search/application/ReadSearch.java` and ordinary continuation serialization in `SearchContinuation.java`, using F02 T040's public projection boundary and F03 summaries. Preserve “Native score/UUID sort values plus context binding, opaque to the mobile. No server snapshot, expiry job or retained result set. Invalid structure/context is a bad request; a changed index is ordinarily traversed live until refresh.” Use `_score` descending/keyword UUID ascending native `search_after`, bounded candidate batches and current visibility/exact-filter rechecks outside engine calls. Preserve “On reads, the indexed value must still equal the current authorized value, including absence; otherwise omit the candidate until automatic reindexing catches up.” Advance only past consumed candidates, never an unreturned eligible one; return nonempty eligible results or established exhaustion, otherwise ordinary retryable failure. Omit the cursor only at exhaustion; engine timeout/failed shard/incomplete evaluation never produces success. Make T009 and the application-level T010 traversal cases pass with short SQL reads and no engine call inside a transaction.
- [ ] T016 [US2] Implement after-commit indexing and serving-process scheduling in `apps/backend/src/main/java/com/blockout/backend/search/application/SearchProjection.java` and `apps/backend/src/main/java/com/blockout/backend/search/infrastructure/SearchProjectionScheduler.java`. Consume F02 T040's identity/changed-scope submissions and batched dependent-resource expansion, reread current state when each task executes and write outside SQL. Use one dedicated one-thread Spring `ThreadPoolTaskScheduler` for targeted work and immediate startup then configurable one-hour fixed delay after each completed full run; no nested executor. Disable it in non-web operator/migration invocations; their changes wait for the serving backend's next full run. Preserve single serving writer/stop-before-start assumptions, safe failed-submission/item diagnostics and ordinary full-run catch-up without outbox, queue manager, checkpoint or per-item retry state.
- [ ] T017 [US2] Implement complete generation replacement and scoped cleanup in `apps/backend/src/main/java/com/blockout/backend/search/infrastructure/OpenSearchProjectionWriter.java`, called by T016 on the same scheduler. Build three fresh generations from bounded current PostgreSQL batches, check every native bulk item, explicitly refresh all completed indexes, then atomically replace all three aliases in one operation. Never clear active indexes first; failures preserve prior usable aliases and leave catch-up to the next regular run. Resolve uncertain alias outcomes with a native alias read before cleanup; remove only inactive/temporary generations in the owned environment namespace, logging cleanup failure without claiming deletion. Queued targeted tasks reread current values after the rebuild; no long cross-resource snapshot, rebuild table or second restoration engine. Make T011 pass.
- [ ] T018 [US2] Implement generated collection operations in `apps/backend/src/main/java/com/blockout/backend/search/api/DiscoveryController.java` and mapping in `DiscoveryApiMapper.java` for `/clubs`, `/teams` and `/pools`, calling T015 with canonical validation, current F12 admission, no-store and shared errors. Reuse F03 team/pool summaries and current permitted club city; no entity/index payload exposure. Make T010 pass through the actual generated HTTP boundary. US1 completes the empty-text branch and US3 the options endpoint in this same adapter; test the named-search increment before claiming the full collection surface complete.
- [ ] T019 [US2] Bind generated text-search functions in `apps/mobile/src/features/discovery/api/discovery-queries.ts` through F13's single validating mutator. Use one native `useInfiniteQuery` entry per type/text/filters/access-session context, cursor only in `pageParam` and `nextCursor` in `getNextPageParam`; adopt `networkMode: 'always'`, bounded transport and disabled ordinary retry/reconnect/focus replay. Preserve current-context cancellation without a mirrored result store; US4 supplies complete browsing interactions and US5 qualifies refresh/failure races.
- [ ] T020 [US2] Implement the approved three-tab text-search composition in `apps/mobile/src/features/discovery/screens/search-screen.tsx`, `components/search-results.tsx` and thin `apps/mobile/src/app/(tabs)/search.tsx`, consuming F13 T067–T069/T071 and T019. Make T012 pass with shared text, Unicode limit without a visible counter, public identity/context cards and ordinary loading/error/no-match presentation; reuse F03 sporting identity presentation where identical. Keep absent context absent and search independent of account/Pro resolution. Later phases add filters, continuation interactions and the approved examples branch without a separate screen architecture.
- [ ] T021 [US2] Execute matching and projection cases in `specs/008-search-discovery/quickstart.md#matching-choices-and-complete-browsing` and `#projection-and-privacy` using actual F02 current projections/F03 summaries and T008–T017. Verify analyzer bounds, all fields and scoped abbreviations, current-city omission, after-commit propagation and native replacement under the selected Java/engine combination; record actual scope and failures without claiming production freshness or a propagation deadline.

---

## Phase 4: User Story 3 — Choose my filters and retain my context (Priority: P1)

**Goal**: Offer current sporting choices with independent tab filters and predictable restoration.

**Scope**: A11–A16; FR-005, FR-011–016, FR-020, FR-023–025; SC-004.

**Independent Test**: Combine all four filters on old/current/future seasons, pass through Clubs, return from a sheet and reload choices successfully or unsuccessfully. An empty combination never broadens itself; only established disappearance reconciles a choice.

### Tests for User Story 3

- [ ] T022 [P] [US3] Write failing PostgreSQL/MVC options tests in `apps/backend/src/test/java/com/blockout/backend/search/application/SearchOptionsIntegrationTest.java` and `apps/backend/src/test/java/com/blockout/backend/search/api/SearchOptionsWebMvcTest.java`. Cover required `team`/`pool` type, separate current viewable-season sets, newest start-year/UUID order including future seasons, active divisions in effective-name/UUID order, canonical format/gender values, empty versus failed retrieval and ordinary public/bypass/no-store contracts.
- [ ] T023 [P] [US3] Write failing semantic filter/context tests in `apps/mobile/src/features/discovery/__tests__/search-filters.test.tsx`: shared text, separate team/pool filters, Clubs ignoring without erasing, valid selection retained when a newer season appears, reset/new visit recalculating the default, no seasons meaning All seasons, and successful unavailable-choice reconciliation versus failed-read preservation. Include same-valued implicit/explicit season, strict combinations, text invalidating other-tab results and retained valid scroll/context after detail return.

### Implementation and qualification for User Story 3

- [ ] T024 [US3] Define current option values in `apps/backend/src/main/java/com/blockout/backend/search/application/SearchOptions.java`, preserving “Current viewable seasons for the requested team/pool type and active divisions, plus the existing format/gender values. Successful empty and failed retrieval are different states.” Reuse F02 classification and F03 season/division values; no persistent option catalogue or new enum vocabulary.
- [ ] T025 [US3] Implement current options reads in `apps/backend/src/main/java/com/blockout/backend/search/application/ReadSearchOptions.java` through F02's application boundary and add `/sporting-search-options` to `apps/backend/src/main/java/com/blockout/backend/search/api/DiscoveryController.java`. Make T022 pass using current PostgreSQL viewability independently of text/filter combinations, not index contents; absent season in search means all viewable seasons, unknown/ineligible filter UUIDs match nothing and no dependency failure becomes an empty catalogue.
- [ ] T026 [US3] Implement visit filter state and generated options consumption in `apps/mobile/src/features/discovery/components/search-filters.tsx`, `api/discovery-queries.ts` and `screens/search-screen.tsx`. Make T023 pass using ordinary component/navigation state and Query: single-valued optional filters, newest available initial season per sporting type, current labels and reset controls, no explicit-selection flag, date-derived season or filter-removal fallback for no matches. Cancel superseded context work; preserve valid text/tab/scroll and prior choices after read failure.
- [ ] T027 [US3] Run A11–A16 with actual F02 classifications/visibility and the generated options/search consumers using `specs/008-search-discovery/quickstart.md#matching-choices-and-complete-browsing`. Verify valid historical/future choices, club independence, hidden team exclusion and failure preservation; repeat empty-text cases with US1 when available rather than marking them qualified by text-only tests.

---

## Phase 5: User Story 4 — Browse all results and open the correct detail sheet (Priority: P1)

**Goal**: Traverse every eligible textual match and open its exact current destination.

**Scope**: A17–A22; FR-017–022, FR-025–028; SC-005.

**Independent Test**: Browse stable sets of 47 and more than 10,000 matches exactly once, including equal scores and ineligible candidates. Open namesakes by UUID, handle a newly hidden destination and refresh after changed data/generation without mixing old pages.

### Tests for User Story 4

- [ ] T028 [US4] Write failing semantic paging/navigation tests in `apps/mobile/src/features/discovery/__tests__/search-navigation.test.tsx`: additional loading versus real end, no loaded-count-as-total, one Query context with `pageParam`, deduplication only by identity, same-named cards, correct F03 destinations, explicit unavailable versus network error, retained valid scroll on return and cancellation of old batches after refresh. Mock only the external transport/owner boundaries needed for these component tests.

### Implementation and qualification for User Story 4

- [ ] T029 [US4] Complete accessible result cards in `apps/mobile/src/features/discovery/components/search-result-card.tsx` using F03 sporting identity presentation and the generated current summaries. Make T028's identity cases pass with public name, permitted club city, team/pool season/division/format/gender and useful club/league context; no fabricated logo/detail, similar-identity redirection or list-level private editing/follow state.
- [ ] T030 [US4] Complete native infinite-query continuation and list presentation in `apps/mobile/src/features/discovery/api/discovery-queries.ts` and `components/search-results.tsx`. Use T019's single context entry, `fetchNextPage` and returned cursor; render distinct initial/append/loading/error/end states, retain usable pages on append failure, and deduplicate changing-index results by UUID without a second result cache. Preserve scroll through ordinary navigation, never expose internal candidate batches or claim a total from loaded length; make T028 pass and retain T010 as the already-established backend regression proof; correct only demonstrated integration defects in the existing read owner.
- [ ] T031 [US4] Connect result activation in `apps/mobile/src/features/discovery/components/search-result-card.tsx` and `screens/search-screen.tsx` to F03 UUID routes and F11's single `apps/mobile/src/features/advertising/sporting-ad-transition.ts` entry. Only accepted voluntary sporting openings affect the counter; filters, scrolling, refresh and return do not. Reuse current F05/F09/F12 owner context and let advertising failure release the destination normally; a hidden target stays with F03's unavailable state.
- [ ] T032 [US4] Execute complete browsing and exact-destination cases in `specs/008-search-discovery/quickstart.md#matching-choices-and-complete-browsing` and `#mobile-journey` with actual generated transport, T010 fixtures, F03 destinations and F11 counter integration. Verify all 47/>10,000 stable identities once and live-generation refresh limits; controlled navigation/SDK doubles alone do not complete native destination/advertising qualification.

---

## Phase 6: User Story 5 — Understand errors and retry search (Priority: P1)

**Goal**: Keep failures, uncertainty and actual absence distinct while respecting current access and operational recovery limits.

**Scope**: A23–A29; FR-022–030; SC-001, SC-006–007.

**Independent Test**: Fail initial, append, refresh and options reads; deliver late responses across text/tab/filter/account changes; interrupt indexing and recover through ordinary full runs. Verify still-authorized content, explicit retry, shared privacy/advertising/reporting and accessible native states.

### Tests for User Story 5

- [ ] T033 [P] [US5] Write failing safe failure/diagnostic tests in `apps/backend/src/test/java/com/blockout/backend/search/api/DiscoveryFailureWebMvcTest.java` and `apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchDiagnosticsTest.java`: unavailable engine, incomplete/failed shard response, unsuccessful hydration, bounded traversal without outcome, rollback/submission/bulk/cleanup failure and safe last-success updates. Assert shared retryable errors, no false empty/end/success and no query text, city/contact, credential or raw payload logging.
- [ ] T034 [P] [US5] Write failing Query/recovery tests in `apps/mobile/src/features/discovery/__tests__/search-recovery.test.tsx` with real Query behavior and controlled transport: late old text/tab/filter/session/bypass responses, pending append during refresh, explicit stale first-page fetch using `pages: 1`, success-only replacement, failed refresh preserving authorized pages and criteria, known restrictions overriding retention, account isolation and no retry/reconnect/focus replay. Distinguish uncertain freshness from current success and next-page failure from actual end.
- [ ] T035 [US5] Prepare native accessibility/privacy and isolated infrastructure/recovery cases in `specs/008-search-discovery/quickstart.md#contracts-and-access`, `#projection-and-privacy` and `#mobile-journey` before their configuration. Include TLS/namespace isolation, single serving writer, non-web changes caught up by full rebuild, unknown alias outcome, failed cleanup, restored PostgreSQL rebuild, both themes, VoiceOver/TalkBack, enlarged text, F11 opening rules and existing F10 context without implicit collection; identify actual owner/build/environment prerequisites.

### Implementation and qualification for User Story 5

- [ ] T036 [US5] Complete shared failure translation at `apps/backend/src/main/java/com/blockout/backend/search/api/DiscoveryController.java` and the native adapter boundary in `infrastructure/OpenSearchEngine.java`, making T033 pass through F13 Problem Details/F12 access handling. Propagate timeout/partial-shard/incomplete/current-read failure as ordinary retryable unavailability, never a successful empty response or manufactured end; do not expose engine diagnostics or add a search-specific error taxonomy.
- [ ] T037 [US5] Implement explicit refresh/recovery in `apps/mobile/src/features/discovery/api/discovery-queries.ts` and `components/search-results.tsx`, making T034 pass through the F03 native first-page pattern: cancel pagination, explicitly fetch stale data with `pages: 1`, replace only after success, retain still-authorized prior pages on failure and reject old-context completions. Use ordinary Query/current owner context, safe explicit retry and F13 feedback; no replay loop, second cache, persistent search history or index-lag screen.
- [ ] T038 [US5] Integrate current restrictions and F05/F13 session invalidation into `apps/mobile/src/features/discovery/screens/search-screen.tsx`, and connect the existing contextual F10/F11 reporting entry through that composition when its owner exists. Keep search public regardless of Pro, remove known-ineligible retained results/examples, isolate old private session work and preserve applicable search context without collecting query analytics, geolocation, personalization or input publication. Extend `__tests__/search-recovery.test.tsx` with actual owner boundaries; no separate restriction registry, support submission or advertising counter.
- [ ] T039 [US5] Add the accepted private OpenSearch infrastructure to `infra/dokploy/opensearch.compose.yaml`, native security configuration in `infra/dokploy/opensearch/` and safe input names/actual loading instructions in `infra/dokploy/README.md`. Use separate production/preproduction instances, volumes, configuration and credentials on the existing VPS, verified TLS and backend namespace-scoped necessary index/alias rights; no public port or collector/mobile engine access. Preserve F13 stop-before-start single backend writes and shared host failure, with no HA, Dashboards or independent index backup chain. Validate configuration safely and qualify actual isolation only in an authorized environment.
- [ ] T040 [US5] Connect bounded update/rebuild failure and latest-success diagnostics to F13 in `apps/backend/src/main/java/com/blockout/backend/search/infrastructure/SearchProjectionScheduler.java` and `infra/observability/grafana/search-alerts.yaml`. Make T033's diagnostic cases pass without payload/query/city collection, per-operation ledger or public status screen. Extend the existing Grafana owner with native rules; alert closure is not proof of rebuilt searchable data. Document the actual ordinary rerun/rebuild and alias-uncertainty checks in `infra/operations/README.md`.
- [ ] T041 [US5] Execute T035's isolated interruption/reconstruction cases through `specs/008-search-discovery/quickstart.md#projection-and-privacy` after T016/T017/T039 and F13's applicable environment/restore inputs exist. Prove lost in-memory work catches up at startup/next full run, queued updates reread current values, incomplete generations preserve prior aliases, current restrictions hold throughout and restored authoritative PostgreSQL rebuilds search before use. Reuse this F04 path for F13 restoration and F14 sporting reconstruction; their full backup activation/cutover proofs stay with those owners and require their own authorization.
- [ ] T042 [US5] Run A23–A29 and T035 native cases in `specs/008-search-discovery/quickstart.md#mobile-journey` on actual iOS/Android builds with F13 UI/transport, F05 session, F09 entitlement, F11 advertising/privacy, F12 admission and the existing F10 entry. Check both system themes/live appearance changes, exact approved Figma comparison, VoiceOver/TalkBack, enlarged text, focus/selection, identifiable retry and no color-only states or search counter. Keep missing owner/device evidence pending; mocks and documentary checks do not establish native accessibility, privacy or provider behavior.

---

## Phase 7: User Story 1 — Discover resources without entering text (Priority: P2)

**Goal**: Provide limited, stable, non-personalized examples under the current tab/filter context.

**Scope**: A01–A04; FR-001–005, FR-012, FR-020, FR-028; SC-001–002.

**Independent Test**: Open all tabs with empty/whitespace text, retain examples through sheets/tab switches/refresh, change filters and clear entered text. Remove a restricted retained example without replacement or false completeness; same-valued default selection has no special mode.

### Tests for User Story 1

- [ ] T043 [P] [US1] Write failing generated-interface/current-data tests in `apps/backend/src/test/java/com/blockout/backend/search/api/DiscoveryExamplesIntegrationTest.java`: at most five eligible examples in stable UUID order, exact filters and current visibility/city guards, retained `exampleIds` reread in supplied order with no replacements, invalid duplicates/size/type/combinations, no cursor or exhaustive total, and ordinary failure instead of false absence. Cover club independence, unattached teams and removed retained identities through actual PostgreSQL/OpenSearch inputs.
- [ ] T044 [P] [US1] Write failing semantic visit tests in `apps/mobile/src/features/discovery/__tests__/search-examples.test.tsx`: accessible examples label, shared empty/whitespace mode, per-tab/filter retained IDs/order, detail/tab return, clear text reusing a valid retained selection, new filters selecting again and restricted identities disappearing without replacement. Exercise guest/free/Pro/unknown rights, default/reset season and failure retention without claiming all resources were evaluated.

### Implementation and qualification for User Story 1

- [ ] T045 [US1] Define retained example values in `apps/backend/src/main/java/com/blockout/backend/search/application/SearchExamples.java` and the existing mobile visit state in `apps/mobile/src/features/discovery/screens/search-screen.tsx`, preserving “At most five resource UUIDs in selected order, retained in the visit for each applicable tab/filter context. Reread removes no-longer-eligible identities without replacement; a changed filter selects again.” Keep values in ordinary navigation/component memory or Query according to role; no personalization, geolocation, persistent history or backend search session.
- [ ] T046 [US1] Complete empty/whitespace collection reads in `apps/backend/src/main/java/com/blockout/backend/search/application/ReadSearch.java` and `api/DiscoveryController.java` using T014's engine port and current hydration guards. Initial selection uses stable UUID order with at most five eligible results; retained IDs read only those identities in supplied order, removing ineligible values without replacement. Reject canonical forbidden parameter combinations and omit pagination; make T043 pass without treating nonempty unanalyzable text as examples or no cursor as a catalogue-completeness claim.
- [ ] T047 [US1] Bind generated example reads in `apps/mobile/src/features/discovery/api/discovery-queries.ts` with a separate key including context and retained selection, and complete `screens/search-screen.tsx`/`components/search-results.tsx`. Make T044 pass with explicit examples presentation, stable retained order through navigation/refresh/clear, new selection only for new visit/changed filters and current restrictions first. Handle a retained selection reduced to zero locally as empty retained examples; do not omit `exampleIds` and accidentally request replacements. Reuse US3's valid choices and US5's safe recovery rather than adding another query/state owner.
- [ ] T048 [US1] Run A01–A04 and the deferred empty-text filter cases using `specs/008-search-discovery/quickstart.md#matching-choices-and-complete-browsing` and `#mobile-journey`, with the actual generated backend/mobile consumers. Verify five-or-fewer examples, no completeness claim, current hidden-example removal, exact filters/defaults and stable return/refresh behavior across both native platforms; no randomized reshuffle or replacement after restriction.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify the complete owner integration and retain honest qualification evidence.

- [ ] T049 Run the actual F13 lint/bundle/generate/compile/typecheck/test chain for `contracts/http/mobile/openapi.yaml`, `apps/backend/pom.xml` and `apps/mobile/orval.config.ts`, including T005's real array/Unicode/known-field validation, canonical options and collection serialization. Regenerate twice at the same revision and verify deterministic ignored output with no handwritten contract or enum drift; all collection branches must now be implemented.
- [ ] T050 Review touched handwritten search/consumer code under `apps/backend/src/main/java/com/blockout/backend/search/` and `apps/mobile/src/features/discovery/` with applicable Java/React/native, documentation, logging and simplicity skills; inspect dependencies and remove only demonstrated duplication or unsafe ownership. Keep JPA behind F02, external calls outside SQL, thin generated adapters and native Query/scheduler/engine mechanisms. Update only actual executable commands and operation references in `README.md` and `infra/operations/README.md`.
- [ ] T051 Run the complete applicable `specs/008-search-discovery/quickstart.md` at the delivered revision and reconcile A01–A29/SC-001–007 with actual automated, native and authorized infrastructure evidence. Reuse owner results rather than rerun unrelated providers; report passed, failed and unavailable boundaries in normal delivery evidence, leaving unexecuted qualifications unchecked. No documentation result certifies Java 25/client adoption, production deployment, restoration, native approval or F14 cutover.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup T001–T004 consumes only F13's bounded foundation; its selected Java/client proof gates the engine integration.
- Foundation T005–T007 precedes each story. Automated cases fail meaningfully before their associated code; model values precede services, services precede adapters, and real integration follows its actual owners.
- US2 owns the common matching/current-read/projection core and first named-search increment. US3's option reads can develop after foundation using F02, then integrate with the US2 screen. US4 uses the core traversal for complete native browsing. US5 extends existing recovery/operational boundaries. US1 uses those current reads and visit filters for examples.
- Shared-file edits are serialized. US2's backend first-page/continuation primitive is implemented once in T015; US4 qualifies complete traversal and supplies mobile browsing, not a second paging engine. US5 tests interruption/recovery of US2's single projection writer, not a second scheduler.
- Final polish needs all desired stories; priority determines delivery order without waiving any lower-priority launch obligation.

### Actual Owner and Qualification Dependencies

| Work                               | Immediate inputs                                                                                                                                                              | Later integration or qualification                                                                                                                                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Matching, projection and hydration | F02 identity/alias/division-term ownership and T040 current projection/scope boundary; T037 visibility and US6 effective values where exercised. F03 current summary mapping. | T021 uses real committed changes; acquisition/provider runs are unnecessary for synthetic qualification. F14 later reuses this same reconstruction path.                                                                                          |
| Mobile search and filters          | F13 generated transport/Query defaults, T067–T069/T071 tokens/theme/controls/feedback. F03 identity presentation and accepted design sources.                                 | T031/T032 need F03 routes and F11 T008/T009's real opening entry; local tests may use controlled owners without claiming integration.                                                                                                             |
| Access/session recovery            | F12 maintenance/bypass and F05's single session generation through F13 T040.                                                                                                  | F14 early installation initialization precedes the real identity provider; no dependency on final cutover. T038/T042 need actual F10/F11 reporting boundaries, F09 rights and native builds.                                                      |
| Operations and restore             | T016/T017 native single-writer rebuild, T035 cases, F13 diagnostic/delivery ownership.                                                                                        | T039–T041 need authorized isolated environment/security inputs. F13's actual backup/initial restore and F14's production reconstruction/retirement remain separate, later owner actions; no S3 activation is required to test synthetic rebuilds. |

```text
F13 bounded foundation → T001–T004 → T005–T007
                                      ├→ US2 tests → documents/engine/current reads
                                      │            → scheduler/writer → API/mobile → T021
                                      └→ US3 options/tests → filters → T027
US2 core + US3 context → US4 browsing/destinations → T032
US2/US3/US4 boundaries → US5 failure/session/native qualification
US2 current reads + US3 filters + US5 recovery → US1 examples → T048
T016/T017 + T035 + authorized environment → T039–T041 operational proof
All implemented stories and available owner proofs → T049–T051
```

The graph describes integrated increments, not a requirement to wait for every device or external operation before writing independent code. US1 local example cases/reads can progress after their core current-read inputs; T048 alone needs the complete native journey. Missing native/environment evidence blocks its qualification, not unrelated task authoring or local tests.

### Parallel Opportunities and Examples

- **Foundation**: T005 contract cases and T006 access cases touch distinct files after setup.
- **US2**: T008 matching, T009 current-data, T010 traversal, T011 lifecycle and T012 screen cases can be prepared together. Implement engine/current reads before their consuming controller; serialize shared search values/configuration and final quickstart evidence.
- **US3**: T022 backend options and T023 mobile filter cases can run together. T024/T025 backend options and prepared native filter composition may then advance independently, joining at T026/T027 with generated consumers.
- **US4**: Backend traversal cases T010 are written in US2 before their implementation. T028 prepares mobile paging/navigation cases; no separate intra-story parallel batch is claimed. T029/T031 share the card and T030 shares the query/list owners, so integrate in order.
- **US5**: T033 backend/diagnostic and T034 mobile recovery cases are independent after their owner boundaries exist. T035 modifies the shared quickstart and must be serialized with other qualification edits. Environment configuration and mobile recovery may progress separately; T041/T042 wait only for their explicit prerequisites.
- **US1**: T043 backend examples and T044 mobile visit tests are independent. T045–T047 then coordinate the shared read/query/screen owners before T048's actual journey proof.

## Implementation Strategy

### MVP First (User Story 2)

Complete setup/foundation, then deliver US2's named-search slice with real analyzer/current-data/projection evidence. Exercise explicit query contexts through actual generated consumers; do not claim complete discovery while empty-text/options/native traversal remain unfinished. Shared current-data guards and ordinary projection catch-up are part of this increment, not optional polish.

### Incremental Delivery

Add current choices and retained filters, full native browsing/exact destinations, failure/session/operational qualification, then stable examples. Validate each story's independent criteria and integrate real owners as they become available. Keep future Java/native/environment failures visible at their specific gate; stop for an owner decision if satisfying them would require changing an accepted mechanism or guarantee. Task completion never authorizes deployment, provider changes, production cutover or promotion to main.
