# Research: following and personal feed

The decisions below implement the accepted [F06 specification](spec.md) and the owner decisions recorded below. Documentation and inspected library code establish feasibility; they are not integrated application qualification.

## Follow mutation and personal traversal

**Decision**: Follow actions use the current [F13 mutation owner](../003-shared-quality/plan.md#frontend-mutation-conventions) within [F05's native principal/private-client lifetime](../005-accounts-identity/plan.md#mobile-session-and-shared-consumers). Confirmed desired-state writes reset affected personal lists/calendars through native `resetQueries`; failed/uncertain writes retain ordinary invalidation and explicit retry. No session generation, shared command guard or confirmation-read protocol is added.

Each mounted control owns its native mutation's pending state while retaining its confirmed label and selection; independent visits may send the same target concurrent desired-state requests. The confirmed response updates already admitted member data through native `onSuccess`/`setQueryData`, without restoring a known refusal; ordinary reads still refresh after settlement. This preserves F03's single team-follow action, database uniqueness/idempotence and last server-recorded state without a target-wide guard.

Selected-season NotFound uses ordinary error/retry without automatically rereading options. Opening the existing selector performs its ordinary options read; successful omission establishes absence and invokes the scoped withdrawal before the choice owner falls back. Keep withdrawal from retained All-seasons data even when the omitted season is no longer selected. Failed options never establish absence. Native resets remain specific to confirmed writes: reciprocal resets after opaque refusals can re-enable sibling error observers and repeat requests.

**Rationale and evidence**: [QueryClient.resetQueries](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient#resetqueries) resets cached traversal, cancels its pending reads and refetches active queries. Installed query-core 5.104.3 supplies this native implementation. Personal views derive `enabled` from actual visibility and retain `staleTime: Infinity`, so reset hidden views load their first page when displayed. No old `initialData` or `placeholderData` is supplied. The generated query prefixes cover both list kinds and all season/category/zone selections on the captured private client.

Ordinary calendar refresh keeps [F03's current native Query/grouping policy](../007-sporting-consultation/plan.md#mobile-state-and-navigation), including retained traversal refetch and separate loading-zone contexts. The confirmed-follow reset is a separate accepted interaction. The [validation scenarios](quickstart.md#integrated-personal-season-and-calendar) distinguish these paths using actual personal views and generated consumers.

**Alternatives**: Retaining old personal rows after a confirmed follow change can present the former selection after a failed reload. Copying per-match origins or building a synchronization/recovery store is unnecessary; the native reset preserves the component-owned season/category and leaves ordinary loading/error/retry to the existing views. Optimistic full-list/count rewrites and automatic mutation replay remain excluded.

## Shared sporting Follow read and scoped recovery

**Decision**: Share one route-owned relationship read between F03’s common-context boundary and F06’s control, using F05’s matching account availability. Key only the private action/recovery subtrees by account and target. Required-read presentation consumes [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements) at the scope defined by [F13 FR-041](../003-shared-quality/spec.md#first-useful-composition); preserve confirmation in Query independently of its current visible recovery state.

**Rationale**: Sharing the actual result avoids a second observer's unconditional opening refetch. [React identity](https://react.dev/learn/preserving-and-resetting-state) resets private command state when the account changes while preserving the public audience and pager.

**Alternatives**: Requiring the latest account read to succeed would hide an authorized confirmed result after a technical failure. Remounting the whole page discards independent scene state; a separate recovery store duplicates Query ownership.

## Relations, ordering and erasure

**Decision**: Persist ordinary unique account–target associations, lock the account during writes and erasure, and accept last server-recorded state between devices. A recreated follow has a new identity.

**Rationale and evidence**: [Spring Data JPA locking](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html) and [PostgreSQL row locks](https://www.postgresql.org/docs/18/explicit-locking.html) support the existing F05 serialization mechanism. This protects transaction ordering and erasure, not global gesture chronology. Relation identity also supports F07's existing prohibition on reviving cancelled sends after re-follow.

**Alternatives**: Client gesture ordering, stale-write conflicts, durable request ledgers and tombstones were rejected in favour of the owner-selected last-recorded rule. A single lost-response reread observes current state without a retry loop or a guarantee about delayed completion.

## Retained personal collections

**Decision**: Keep targeted withdrawal in the existing Query owner. Do not replace it with collection-wide resets or invalidation alone.

| Current observation                                                 | Owner and retained action                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private list/calendar 401/403; opaque 404                           | `following/api/personal-queries.ts` cancels older reads and withdraws lists/calendars in the captured account/admission context. Seasonal 404 stays scoped to that season; an unscoped refusal withdraws all selections. Options refusals withdraw options without inventing an empty season catalog. |
| Public follower-count 404                                           | `following/api/use-follower-count-query.ts` uses `following/lists.ts` to remove only that identity from retained lists, suspending its follow state and leaving its count unknown. Private member 404 cannot establish public absence.                                                                |
| Successful options omission or calendar `hasAvailableFollows:false` | `following/api/personal-queries.ts` and `following/lists.ts` cancel overlapping reads, empty the affected season and remove its rows from All seasons. Independent seasons remain; an All-seasons absence covers every selection. Retained rows identify omitted seasons even after options eviction. |
| Successful F03 link absence                                         | No F06 collection action; [F07 owns notification wording](../011-notifications-delivery/research.md#ordinary-mobile-read-state).                                                                                                                                                                      |
| Ordinary network/503 failure                                        | Keep still-authorized unchanged-context pages in Query for recovery. Their display and Retry follow [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements); failure proves neither disappearance nor zero follows/counts.                                                  |

**Rationale**: FR-012 preserves unrelated seasons, FR-015 preserves valid journey context and FR-016/023 prohibit known-refused content or obsolete responses from restoring it. The public-count path has one narrow caller and removes one identity. Successful category-independent absence needs reconciliation across existing selections, without deleting relationships or storing a restriction registry. F03 owns its addressed sporting resource; Home's own successful reads establish personal collection availability, without an additional cross-feature calendar propagation module.

**Alternatives considered**: Coarse cache removal would also discard still-authorized pages, selections or traversal context. Scoped presentation can mask failed content under [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements) while retaining that state in Query. Native `resetQueries` may reactivate sibling error observers; avoiding that feedback would require new coordination. Neither cost is justified by the retained behavior. Invalidation alone is insufficient because a failed reread can leave known-forbidden data visible. Targeted cancellation/removal remains necessary; fresh authorized reads alone can restore withdrawn data.

**Verification**: Existing `personal-calendar`, `followed-lists`, `personal-season`, `follower-count` and `follow-recovery` suites cover refusal followed by outage, cancelled continuations, options eviction, independent admission/account contexts and fresh reappearance. [Native journeys](quickstart.md#mobile-journeys) exercise the actual composition proportionately; passing deterministic tests does not complete their native/provider owners.

## Lists, count and feed projections

**Decision**: Use Spring Data Slice for twenty-item alphabetical follow pages, direct relational counts and a sporting-calendar read selected by follow existence. Reuse F03's complete-day traversal rather than its public resource selector endpoint.

**Rationale and evidence**: [Spring Data query methods](https://docs.spring.io/spring-data/jpa/reference/repositories/query-methods-details.html) describe Slice's extra-row continuation without a total count. [Hibernate HQL](https://docs.hibernate.org/orm/7.4/querylanguage/html_single/) supports projections, existence predicates and collate. [PostgreSQL 18 collations](https://www.postgresql.org/docs/18/collation.html) document native fr-x-icu; the actual image must include ICU. Use the quoted native collation name through the supported HQL expression and test accented/homonymous names against that image.

**Alternatives**: Search-style opaque cursors, total counts, normalized-name copies, denormalized follower counters and materialized per-user feeds add machinery without an accepted need. Offset movement on concurrent changes is repaired by ordinary refresh; no snapshot guarantee or silent total cap is introduced. [JPA setFirstResult](<https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/Query.html#setFirstResult(int)>) accepts an int offset, as reflected by [Spring Data PageableUtils](https://docs.spring.io/spring-data/jpa/reference/api/java/org/springframework/data/jpa/support/PageableUtils.html). Bound page and nextPage to floor(Integer.MAX_VALUE / 20), or 107374182; unsupported traversal fails explicitly instead of overflowing or concealing further results. Public count stays independently readable without loading private state or the full sporting detail again.

F06 composes its own follows with F02's application-owned
[`SportingSeasonSelection`](../../apps/backend/src/main/java/com/blockout/backend/sporting/application/SportingSeasonSelection.java).
Only native scalar Criteria expressions and target subqueries cross that boundary; F02 keeps its
HQL and Criteria visibility definitions private. The result stays one database query without loading
all follow targets or exposing managed entities/repositories, and adds no query engine or cache.

## Contract and design scope

**Decision**: Extend the existing mobile root with relationship-state resources, private lists/options/calendar and public counts. Reuse F03 projections/parameters and F13 errors/generation. Keep F07 access in process.

**Rationale**: [HTTP PUT semantics](https://www.rfc-editor.org/rfc/rfc9110.html#name-put) permit replacement of the identified state; false is a valid representation without a persisted negative relation. This makes read/replace/idempotence explicit without a toggle command or additional removal protocol. The existing API is resource-oriented for generated clients, not a newly claimed hypermedia system.

Existing accepted Home/Sport journeys cover season changes, empty states, bounded reconciliation and ordinary errors. The shared compact button uses a loading capsule. The follow-specific native spinner and retained confirmed label/selection are a scoped control adaptation, leaving other buttons and the surrounding journey unchanged. Qualification remains described in [quickstart](quickstart.md), not claimed from the design or library documentation.

## Home pager during common-read failure

**Accepted behavior and feasibility**: [A30/FR-008/FR-029](spec.md#errors-concurrency-and-shared-responsibilities) retain Home's three paged scenes during common-prerequisite loading or failure. Reuse the existing `PagedTabs` container and compose the shared read feedback inside each dependent scene. The affected [prototype scope](spec.md#design-evidence) is approved; its Figma reproduction awaits separate approval before native adoption through [T056](tasks.md#shared-account-and-sporting-composition).

**Inspected boundary**: `following/screens/personal-screen.tsx` currently selects `PagedTabs` only when the matching account and options are usable. Otherwise its `PageViewport`, standalone `Tabs` and single scrolling feedback body contain no native pager. `discovery/screens/search-screen.tsx` keeps `PagedTabs` around its scenes. The existing `shared/components/page.tsx` uses `TabScrollView` inside the pager, and `ReadFeedback` already keeps its card through explicit active or suspended Retry. These existing owners provide the required composition without a new gesture handler, dependency or recovery state.

**Ownership and limits**: Keep the sole personal-season owner and common Query results. Switching tabs starts no common GET, and calendar/list reads wait for their indispensable prerequisites. Explicit Retry intent belongs to its initiating scene; other scenes do not show another button's progress, while the request and outcome remain shared. Current refusals and F05 identity changes retain their existing withdrawal boundaries. This changes neither Follow commands/public counts nor the internal Teams/Pools failure composition of Following. A single card outside the pager loses the requested swipe behavior; three independent common queries would duplicate the read. Prototype approval establishes this interaction direction, not native delivery; [the targeted native checks](quickstart.md#home-pager-with-an-unavailable-common-read) remain pending.

## Intrinsic personal-season presentation

**Decision**: Present the selector through the existing Expo Router native stack, using the shared `formSheet` / `sheetAllowedDetents: "fitToContents"` configuration. Home and its `/season` sheet share the sole existing season owner through a provider limited to their common layout. `EntryGroup` and `SelectionRow` supply the same list anatomy as the other bounded choices; the existing Query selection, F05 private-client lifetime and F12 admission remain authoritative.

**Rationale and installed evidence**: Reuse F13's [intrinsic sheet composition and installed-platform rationale](../003-shared-quality/research.md#account-readiness-basic-lists-and-intrinsic-sheets), including its shared Android viewport bound. Native presentation owns content fitting and maximum height; the shared ScrollView handles overflow. The Home-specific provider retains one season owner across both routes. Library/source inspection establishes feasibility, not application geometry or accessibility qualification.

**Alternatives**: React Native's `Modal` page sheet supplies no equivalent detent option through its existing API. Keeping a second selector state owner, passing callbacks in route parameters, adopting the experimental screens presenter, measuring content in JavaScript or maintaining device-specific heights would add machinery without changing the intended choice. The local native route preserves the established Home selection and allows the same close/back behavior. The `(sheets)` group identifies contextual leaves for shared tab clearance; it introduces no extra navigator inside the form sheet. Native short-content, overflow, enlarged-text and return behavior remain the explicit [qualification criteria](quickstart.md#shared-personal-season-boundary).
