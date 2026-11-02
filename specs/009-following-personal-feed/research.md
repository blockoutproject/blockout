# Research: following and personal feed

The decisions below implement the accepted [F06 specification](spec.md) and the owner decisions recorded below. Documentation and inspected library code establish feasibility; they are not integrated application qualification.

## Follow mutation and personal traversal

**Decision**: Follow actions use the current [F13 mutation owner](../003-shared-quality/plan.md#frontend-mutation-conventions) within [F05's native principal/private-client lifetime](../005-accounts-identity/plan.md#mobile-session-and-shared-consumers). Confirmed desired-state writes reset affected personal lists/calendars through native `resetQueries`; failed/uncertain writes retain ordinary invalidation and explicit retry. No session generation, shared command guard or confirmation-read protocol is added.

Each mounted control owns its native mutation's provisional/pending state; independent visits may send the same target concurrent desired-state requests. Their shared confirmed Query data refreshes normally after settlement. This accepts temporary disagreement rather than a target-wide guard, while preserving F03's single team-follow action, database uniqueness/idempotence and last server-recorded state.

Selected-season NotFound uses ordinary error/retry without automatically rereading options. Opening the existing selector performs its ordinary options read; successful omission establishes absence and invokes the current scoped withdrawal helpers before the choice owner falls back. Keep withdrawal from retained All-seasons data even when the omitted season is no longer selected. Failed options never establish absence. Native resets remain specific to confirmed writes: reciprocal resets after opaque refusals can re-enable sibling error observers and repeat requests, so no broad-reset replacement or refusal registry is introduced.

**Rationale and evidence**: [QueryClient.resetQueries](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient#resetqueries) resets cached traversal, cancels its pending reads and refetches active queries. Installed query-core 5.104.3 supplies this native implementation. Personal views derive `enabled` from actual visibility and retain `staleTime: Infinity`, so reset hidden views load their first page when displayed. No old `initialData` or `placeholderData` is supplied. The generated query prefixes cover both list kinds and all season/category/zone selections on the captured private client.

Ordinary calendar refresh keeps [F03's current native Query/grouping policy](../007-sporting-consultation/plan.md#mobile-state-and-navigation), including retained traversal refetch and separate loading-zone contexts. The confirmed-follow reset is a separate accepted interaction. The [qualification](quickstart.md#integrated-personal-season-and-calendar-t022t037) distinguishes these paths using actual personal views and generated consumers.

**Alternatives**: Retaining old personal rows after a confirmed follow change can present the former selection after a failed reload. Copying per-match origins or building a synchronization/recovery store is unnecessary; the native reset preserves the component-owned season/category and leaves ordinary loading/error/retry to the existing views. Optimistic full-list/count rewrites and automatic mutation replay remain excluded.

## Relations, ordering and erasure

**Decision**: Persist ordinary unique account–target associations, lock the account during writes and erasure, and accept last server-recorded state between devices. A recreated follow has a new identity.

**Rationale and evidence**: [Spring Data JPA locking](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html) and [PostgreSQL row locks](https://www.postgresql.org/docs/18/explicit-locking.html) support the existing F05 serialization mechanism. This protects transaction ordering and erasure, not global gesture chronology. Relation identity also supports F07's existing prohibition on reviving cancelled sends after re-follow.

**Alternatives**: Client gesture ordering, stale-write conflicts, durable request ledgers and tombstones were rejected in favour of the owner-selected last-recorded rule. A single lost-response reread observes current state without a retry loop or a guarantee about delayed completion.

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

Existing accepted Home/Sport journeys cover season changes, empty states, bounded reconciliation and ordinary errors. Live Figma inspection found the shared follow button's loading variant. No new visual decision, dependency, provider setting or native experiment is required for this documentary plan. Qualification remains described in [quickstart](quickstart.md), not claimed from the design or library documentation.

## Intrinsic personal-season presentation

**Decision**: Present the selector through the existing Expo Router native stack, using the shared `formSheet` / `sheetAllowedDetents: "fitToContents"` configuration. Home and its `/season` sheet share the sole existing season owner through a provider limited to their common layout. `EntryGroup` and `SelectionRow` supply the same list anatomy as the other bounded choices; the existing Query selection, F05 private-client lifetime and F12 admission remain authoritative.

**Rationale and installed evidence**: Reuse F13's [intrinsic sheet composition and installed-platform rationale](../003-shared-quality/research.md#account-readiness-basic-lists-and-intrinsic-sheets), including its shared Android viewport bound. Native presentation owns content fitting and maximum height; the shared ScrollView handles overflow. The Home-specific provider retains one season owner across both routes. Library/source inspection establishes feasibility, not application geometry or accessibility qualification.

**Alternatives**: React Native's `Modal` page sheet supplies no equivalent detent option through its existing API. Keeping a second selector state owner, passing callbacks in route parameters, adopting the experimental screens presenter, measuring content in JavaScript or maintaining device-specific heights would add machinery without changing the intended choice. The local native route preserves the established Home selection and allows the same close/back behavior. The `(sheets)` group identifies contextual leaves for shared tab clearance; it introduces no extra navigator inside the form sheet. Native short-content, overflow, enlarged-text and return behavior remain the explicit [qualification criteria](quickstart.md#shared-personal-season-boundary-t017t021).
