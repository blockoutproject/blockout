# Implementation Plan: Following and personal feed

**Branch**: `tech/51-following-personal-feed` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md) and the accepted decisions recorded in [research.md](research.md).

## Summary

Provide account-owned team/pool follows, public counts and a personal sporting calendar through the existing backend. PostgreSQL relations are truth; ordinary reads compose the feed and count followers. Shared TanStack Query state makes the follow action agree across tabs, then reloads affected lists after confirmation. No materialized feed, counter synchronization, replay queue or new service.

## Technical Context

**Language/Version**: Java 25 / Spring Boot 4.1.1 and TypeScript / Expo 58 / React Native 0.88 / React 19.3.0, as selected by [F13](../003-shared-quality/plan.md).

**Primary Dependencies**: Existing Spring Data JPA/Hibernate, TanStack Query and generated HTTP boundary. Query 5.104.2 is the inspected native-mechanism evidence, not permission for an implicit dependency upgrade.

**Storage**: PostgreSQL 18.6; account–team and account–pool associations. Mobile memory only.

**Testing**: JUnit, Spring MVC, Testcontainers PostgreSQL, Jest Expo and React Native Testing Library; existing documentation and OpenAPI checks.

**Target Platform**: Existing Linux backend and native iOS/Android clients.

**Project Type**: Mobile application with a modular backend.

**Performance Goals**: No speculative throughput, load, capacity or monthly availability programme. Bounded ordinary reads and no N+1 traversal.

**Constraints**: Owner isolation, original account identities, current sporting visibility, no automatic replay, no club follow or seasonal transfer. Preserve F13 baseline/migration and privacy policies.

**Scale/Scope**: Team/pool follow state, alphabetical personal lists, shared seasonal selection, public counts and personal calendars. F07 notification delivery remains outside this plan.

## Constitution Check

Pre-research and post-design checks pass for the scoped documentary delivery:

- F06 owns follows and personal selection; F02 owns sporting identities/visibility, F03 calendar semantics and F05 accounts/erasure. Consumer reconciliation is included below.
- Existing [October 10 design acceptance](../003-shared-quality/spec.md#evidence-scope) covers season reconciliation and discreet follow reconciliation. Live inspection confirmed the ordinary follow button's loading variant and Home's existing list, empty, loading and error states. No new visual journey is introduced.
- Relevant design references: [Home](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=888-8), [followed team](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1023-5097), [no available follows](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4480-3901), [no matches](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4480-4201). These establish accepted presentation, not native qualification.
- One canonical mobile OpenAPI source and the existing generation chain; no feature-local editable copy or new deployment.
- Ordinary relations, counts, projections and Query mechanisms satisfy the need without recovery infrastructure. Runtime qualifications remain future evidence.

## Project Structure

### Documentation (this feature)

```text
specs/009-following-personal-feed/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/README.md
```

### Source Code (repository root)

Planned integration locations:

```text
apps/backend/       # follow use cases, persistence projections and HTTP adapters
apps/mobile/        # shared follow controls, personal selection and Query consumers
contracts/http/     # canonical mobile routes and existing shared definitions
```

**Structure Decision**: Add cohesive F06 responsibilities inside F13's existing applications. Application ports return mapped values; persistence adapters may compose sporting and follow data without exposing managed entities. No feature-per-service split or generic feed engine.

## Persistence and concurrency

`FollowState` groups member reads and desired-state replacements because they share original-account serialization, current target admission and the same persistence port. Its two public operations own their transactions, including the write-capable locked read; the private admission step adds no transaction proxy. Relation UUID/no-op semantics and the separate `ReadFollowEligibility` audience API remain unchanged.

Use two association tables with UUID identity, account/target foreign keys and uniqueness on each account–target pair. Deletion removes the relation; recreating it assigns a new identity. Hidden targets retain relationships. Account erasure removes all relations atomically, including hidden ones. See [data model](data-model.md).

Every write targets the authenticated owner's original usable account. Use F05's short account-row lock for follow writes and erasure; check sporting eligibility through F02-owned rules. Preserve the common lock order if an operation also requires sporting locks. No provider call or notification delivery occurs inside the transaction. A target that subsequently becomes hidden is filtered from reads without deleting the relation.

The operation replaces desired follow state: repeating true keeps the same relation; repeating false leaves it absent. Between devices, last server-recorded state wins, including delayed requests. No gesture timestamp, optimistic version conflict, tombstone or request ledger.

## Reads and boundaries

Season choices compose F02's `SportingSeasonSelection` scalar Criteria API with F06's own follow predicates in one native query. F02 alone supplies seasonal fields and current visible target selections; no sporting entity, repository or private HQL fragment crosses into F06. This preserves season order, closed-season consultation and the current-follow default without materializing target IDs. See the [common composition qualification](../003-shared-quality/quickstart.md#common-backend-composition).

The [canonical contracts](contracts/README.md) separate public counts from private state. Counts use the relationships directly, including retained hidden-target relations whenever the target itself is viewable. Failed reads never become zero. Public sporting pages remain usable without private account reads.

Personal lists use Spring Data `Slice`, twenty entries per page, effective public name in native French alphabetical order then UUID. Use PostgreSQL's deterministic `fr-x-icu` collation for the ordering expression through Hibernate's supported `collate`, not a stored normalized-name copy. Lists return current F03 summaries, omit hidden resources and have no business quota or total. The contract bounds page/nextPage to the native JPA offset range for twenty-item pages; reject unsupported traversal with BadRequest rather than overflowing or reporting a false end. Concurrent renames/hiding can shift offset pages until refresh; deduplicate displayed identities.

Season options combine viewable catalog seasons and seasons of viewable follows, without hidden-only choices. Return the newest followed season as default, otherwise newest catalog season, otherwise omit the default. Keep a still-valid mobile selection; only a successful options read proves it unavailable. All seasons is represented by absent seasonId, not a fabricated sporting identity. If a seasonal list/calendar read returns NotFound, reread follow options once with bounded waiting. Only a successful options response omitting the selected season switches to its default, or All seasons, and loads the new context. If the season is still offered or the options read fails, retain the selection and ordinary error/retry. Do not recursively repeat this check; an explicit retry may attempt it again.

Compose the personal calendar using database existence predicates over eligible team/pool follows and F02 sporting data. Reuse F03's categories, ordering, seven complete nonempty days and exclusive nextDay. Evaluate hasAvailableFollows and the calendar in the same short repeatable-read transaction, so an empty calendar has an honest explanation. Do not fetch all matches/follows into mobile memory or manufacture a per-account feed table.

F07 consumes confirmed account/target/relation identities through an in-process read boundary. The relation identity distinguishes a retained follow from one removed and recreated; F07 owns recipient selection, cancellation and delivery. No follow event broker, outbox or notification implementation is introduced. F05 owns erasure and session isolation; F12 owns admission; F11's existing advertising triggers remain unchanged.

## Mobile state and failure handling

Use one QueryClient with private keys including original account and session generation. Follow keys and mutation keys also identify target type/UUID, never the originating screen. The provisional requested value is observed through native useMutationState across tabs; the ordinary loading/busy button indicates that it is not yet confirmed. Guard one pending action per target through the shared mutation cache; do not queue subsequent taps. Other targets remain usable.

Cancel obsolete reads before changing state. Successful mutation responses update the shared confirmed relation cache. Keep the mutation outcome separate from later invalidation failures. Shared mutation lifecycle callbacks, rather than screen-local callbacks that disappear on unmount, own reconciliation; reject callbacks from old sessions.

After a confirmed change, reset affected personal list/calendar queries with native resetQueries, without old initialData/placeholderData. This cancels old traversal and reloads the first page of visible/enabled queries; inactive views load on next display. Query enablement follows the visible personal tab, rather than merely a mounted navigation screen. Set staleTime: Infinity for retained personal lists/calendars so re-enabling a populated query alone does not refetch it; keep F03's disabled mount/focus/reconnect refetches. Resets still remove obsolete results and explicit refreshes fetch with staleTime: 0. Preserve selected season/category, invalidate season options and the affected public count. No full-list optimistic rewrite or per-match origin metadata.

Ordinary same-context refresh retains F03's native infiniteQuery first-page recipe: explicit stale fetch with pages: 1, replace only on success and retain authorized content on failure. After changed follows, ordinary loading/error/retry replaces the former selection. Additional-page failure retains loaded pages and its retry boundary. Paginated personal lists use [F13's application-wide automatic continuation and compact footer convention](../003-shared-quality/plan.md#repeated-interaction-conventions). Return without a change preserves the existing context; no precise scroll guarantee after recomposition.

Definite refusal preserves confirmed state. A lost write response causes one bounded read of current state, never a write retry loop. This is an observation, not proof that a delayed request can no longer complete. If reconciliation fails, ordinary action feedback/retry applies without claiming success or cancellation. Use F13's networkMode: 'always', disabled ordinary retries, no paused offline work, and F05 cancellation/removal on session changes. Known visibility restrictions override retained content.

## Qualification

The [quickstart](quickstart.md) defines future database, mobile and generated-boundary qualifications. F03 owns ordinary retained-calendar refresh, F05 account erasure and F07 notification eligibility; the preceding sections define their F06 integration boundaries.
