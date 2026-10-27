# Research: following and personal feed

The decisions below implement the accepted [F06 specification](spec.md) and the owner decisions recorded below. Documentation and inspected library code establish feasibility; they are not integrated application qualification.

## Shared immediate follow state

**Decision**: Use the existing QueryClient, account/session/target keys and native useMutationState to display a single provisional action across components. Permit one pending action per target; apply the server response to confirmed state, then refresh dependent reads.

**Rationale**: The required outcome is an immediate consistent button across tabs, not a bespoke synchronization mechanism. TanStack exposes the shared mutation cache and its variables through [useMutationState](https://tanstack.com/query/latest/docs/framework/react/reference/functions/useMutationState); the [optimistic UI guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) supports provisional presentation without rewriting all cached lists.

**Alternatives**: Server-confirmed-only presentation does not provide the selected immediate feedback. Optimistically rewriting lists/counts adds rollback paths for no required benefit. No assumptions about another social application's private implementation are used.

## Changed-follow reload versus ordinary refresh

**Decision**: Native resetQueries restarts affected personal lists/calendars after a confirmed follow change; visible/enabled views reload, others wait for display. Ordinary same-context refresh uses infiniteQuery with pages: 1 and an explicit stale fetch, preserving old data if it fails.

**Rationale and evidence**: [QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient) documents resets, observer-based activity and bounded infinite fetching. Inspection of the official [query-core 5.104.2 package](https://registry.npmjs.org/@tanstack/query-core/-/query-core-5.104.2.tgz) confirms these mechanisms and the native infiniteQuery name. A mounted hidden tab is not automatically inactive: enabled must follow visibility. The inspected query observer also fetches stale data when re-enabled; use staleTime: Infinity for retained lists/calendars, with explicit stale fetching for manual refresh. This uses the [documented freshness setting](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), not a separate navigation cache. Do not supply former personal results as initialData/placeholderData, which could resurrect them on reset. The ordinary refresh recipe is already accepted in [F03](../007-sporting-consultation/plan.md#mobile-state-and-navigation).

**Alternatives**: Default invalidation of a retained infinite query can reload all pages. Tracking every old match's selecting follows or preserving a precise scroll anchor adds unnecessary state. The owner accepted first-page reload with ordinary list error/retry.

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
