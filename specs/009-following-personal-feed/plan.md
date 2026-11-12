# Implementation Plan: Following and personal feed

**Branch**: `tech/51-following-personal-feed` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md) and the accepted decisions recorded in [research.md](research.md).

## Summary

Provide account-owned team/pool follows, public counts and a personal sporting calendar through the existing backend. PostgreSQL relations are truth; ordinary reads compose the feed and count followers. TanStack Query shares confirmed member data; each mounted follow control shows progress without changing its confirmed label or selection, then updates from the confirmed response and reloads affected reads after settlement. No target-wide command coordinator, materialized feed, counter synchronization, replay queue or new service.

## Technical Context

**Language/Version**: Java 25 / Spring Boot 4.1.1 and TypeScript / Expo 58 / React Native 0.88 / React 19.3.0, as selected by [F13](../003-shared-quality/plan.md).

**Primary Dependencies**: Existing Spring Data JPA/Hibernate, TanStack Query and generated HTTP boundary. Query 5.104.3 is the inspected native-mechanism evidence, not permission for an implicit dependency upgrade.

**Storage**: PostgreSQL 18.6; account–team and account–pool associations. Mobile memory only.

**Testing**: JUnit, Spring MVC, Testcontainers PostgreSQL, Jest Expo and React Native Testing Library; existing documentation and OpenAPI checks.

**Target Platform**: Existing Linux backend and native iOS/Android clients.

**Project Type**: Mobile application with a modular backend.

**Performance Goals**: No speculative throughput, load, capacity or monthly availability programme. Bounded ordinary reads and no N+1 traversal.

**Constraints**: Owner isolation, original account identities, current sporting visibility, no automatic replay, no club follow or seasonal transfer. Preserve F13 baseline/migration and privacy policies.

**Scale/Scope**: Team/pool follow state, alphabetical personal lists, shared seasonal selection, public counts and personal calendars. F07 notification delivery remains outside this plan.

## Constitution Check

Existing Follow and Home design approvals remain applicable to unchanged interactions under [F03’s Constitution Check](../007-sporting-consultation/plan.md#constitution-check) and [F13 evidence scope](../003-shared-quality/spec.md#evidence-scope). The revised required-read scope, initial composition and same-card recovery require their affected prototype approval followed by separate Figma approval before finalizing dependent native planning/adoption. [T053/T054](tasks.md#shared-account-and-sporting-composition) remain pending for F06 implementation and representative qualification; the F13 reference delivery does not complete these consumers.

The bounded Home pager requirement in [A30/FR-008/FR-029](spec.md#errors-concurrency-and-shared-responsibilities) is accepted; its affected prototype is in preparation and has no prototype or separate Figma approval yet. [T056](tasks.md#shared-account-and-sporting-composition) records the dependent Home-only work without completing T053/T054, Follow/count adoption or broader native qualification. The Account/Profile approvals under [F05 design evidence](../005-accounts-identity/spec.md#design-evidence) do not cover Home.

- F06 owns follows and personal selection; F02 owns sporting identities/visibility, F03 calendar semantics and F05 accounts/erasure. Consumer reconciliation is included below.
- The [scoped design acceptance](../003-shared-quality/spec.md#evidence-scope) covers season reconciliation, Home states and ordinary follow interaction. The revised shared read presentation retains the pending approval boundary above. Static fidelity establishes no native or provider pass.
- Relevant design references: [Home](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=888-8), [followed team](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1023-5097), [no available follows](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4480-3901), [no matches](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4480-4201). These establish accepted presentation, not native qualification.
- One canonical mobile OpenAPI source and the existing generation chain; no feature-local editable copy or new deployment.
- Ordinary relations, counts, projections and Query mechanisms satisfy the need without recovery infrastructure. The quickstart defines runtime validation scenarios.

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

`FollowState` groups the coherent member read/replacement family behind the same persistence port. A member GET uses a short read-only repeatable-read transaction, checking original account existence and current F02 visibility without the account write lock. It may report the snapshot preceding a concurrent write or erasure. Replacements still take F05’s account lock before relation effects; erasure/write ordering, relation UUID/no-op semantics and `ReadFollowEligibility` remain unchanged. Each public operation owns its transaction; the private visibility step adds no transaction proxy.

Use two association tables with UUID identity, account/target foreign keys and uniqueness on each account–target pair. Deletion removes the relation; recreating it assigns a new identity. Hidden targets retain relationships. Account erasure removes all relations atomically, including hidden ones. See [data model](data-model.md).

The shared HTTP current-account resolver returns ordinary absence explicitly; following maps absent or different original identity to its opaque 404. Required-account consumers keep their own 403 behavior, and storage failure remains unavailable rather than absent.

Every write targets the authenticated owner's original usable account. Use F05's short account-row lock for follow writes and erasure; check sporting eligibility through F02-owned rules. Preserve the common lock order if an operation also requires sporting locks. No provider call or notification delivery occurs inside the transaction. A target that subsequently becomes hidden is filtered from reads without deleting the relation.

The operation replaces desired follow state: repeating true keeps the same relation; repeating false leaves it absent. Between devices, last server-recorded state wins, including delayed requests. No gesture timestamp, optimistic version conflict, tombstone or request ledger.

## Reads and boundaries

Season choices compose F02's `SportingSeasonSelection` scalar Criteria API with F06's own follow predicates in one native query. F02 alone supplies seasonal fields and current visible target selections; no sporting entity, repository or private HQL fragment crosses into F06. This preserves season order, closed-season consultation and the current-follow default without materializing target IDs. See the [common composition qualification](../003-shared-quality/quickstart.md#shared-backend-reads-images-and-authority).

The [canonical contracts](contracts/README.md) separate public counts from private state. Counts use the relationships directly, including retained hidden-target relations whenever the target itself is viewable. Failed reads never become zero. Public requests and deliberate guest viewing require no private account read. F03's first signed-in Team/Pool composition additionally resolves the holder's Follow state under FR-029, without changing public endpoint admission or making count indispensable.
A public count NotFound establishes target absence and uses F03's existing captured-context
withdrawal boundary, cancelling older representations and suspending shared follow controls. This
reuses native Query cancellation and current availability; no refusal registry or complete-detail
reread is added. The opaque private member NotFound cannot establish public sporting absence.

Personal lists compose one bounded target page directly from the selected rows and lookahead, twenty entries per page, effective public name in native French alphabetical order then UUID. Use PostgreSQL's deterministic `fr-x-icu` collation for the ordering expression through Hibernate's supported `collate`, not a stored normalized-name copy. Lists return current F03 summaries, omit hidden resources and have no business quota or total. The contract bounds page/nextPage to the native JPA offset range for twenty-item pages; reject unsupported traversal with BadRequest rather than overflowing or reporting a false end. Concurrent renames/hiding can shift offset pages until refresh; deduplicate displayed identities.

F02's `SportingTargetSelection` exposes only scalar identity, effective name, season and current
visibility expressions. F06 composes its own relations with those expressions and maps the bounded
selection through F03's existing batch summary API. A short read-only repeatable-read transaction
keeps selection and summaries consistent within one response; it creates no snapshot across pages.

Season options combine viewable catalog seasons and seasons of viewable follows, without hidden-only choices. Return the newest followed season as default, otherwise newest catalog season, otherwise omit the default. Keep a still-valid mobile selection; only a successful options read proves it unavailable. All seasons is represented by absent seasonId, not a fabricated sporting identity. A seasonal list/calendar NotFound retains ordinary error/retry and never triggers an options read. Opening the existing selector rereads options once. A successful options response omitting a previously offered season first uses the existing narrow cancellation/withdrawal helpers for its retained exact-season and All-seasons lists/calendars, then admits the options; the existing choice owner applies its default or All seasons when necessary. Failed/cancelled options prove no absence. No read callback/context, invalid-season registry, reciprocal query reset or automatic repair loop is added.

`ReadPersonalCalendar` couples the category-independent availability explanation with F03's `ReadMatchCalendar` in one short read-only repeatable-read transaction. F06's `JpaFollowReadStore` supplies existence predicates over its own team/pool relations and the optional sporting season. F03 exposes only `CalendarWindow` and `ConsultationMatchSelection.Filter` over scalar identities; its current visibility, category thresholds, complete-day SQL, ordering and detached summaries keep their existing owner. The same query selects seven complete nonempty days and an exclusive nextDay. F03 fetches the selected to-one presentation graph together and reuses it within that transaction, without per-match database queries, a materialized feed or a private sporting-port dependency.

F07 consumes confirmed account/target/relation identities through an in-process read boundary. Its [producer owner](../011-notifications-delivery/plan.md#announcement-processing) holds the necessary sporting roots, locks candidate accounts in sorted order and rereads the current union before allocating one entry per account. Its [sender](../011-notifications-delivery/plan.md#expo-handoff-and-association-lifecycle) checks current account, entry, sporting target, association and at least one original relation in a short read-only repeatable-read snapshot before handoff; it holds no transaction across provider I/O. A retained original origin remains eligible when another is removed/recreated; replacing every origin refuses continuity. The personal calendar's season selection supplies no delivery preference. [T044](tasks.md) validates these consumers through the [relationship scenarios](quickstart.md#relationships-and-calendar); F07 retains consumed facts, inbox/push lifecycle and cancellation. No follow event broker, outbox or notification implementation is introduced. F05 owns erasure and session isolation; F12 owns admission; F11's existing advertising triggers remain unchanged.

## Mobile state and failure handling

Use the [retained-collection decisions](research.md#retained-personal-collections) for current refusals and successful absence. These narrow removals preserve independent seasons and still-authorized content; ordinary invalidation alone cannot withdraw known-forbidden data. Read presentation consumes [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements) and [F13 FR-041](../003-shared-quality/spec.md#first-useful-composition). The affected recovery interaction requires the corresponding prototype and separate Figma approvals before dependent native adoption; unchanged domain restrictions retain their approvals. Qualification follows [F13's proportionate model](../003-shared-quality/plan.md#proportionate-qualification) and the [mobile journeys](quickstart.md#mobile-journeys); deterministic consumer proofs and representative native integration have distinct completion conditions.

Use [F05's Auth0-subject private React/Query lifetime](../005-accounts-identity/plan.md#mobile-session-and-shared-consumers) and the generated original-account/target keys. Derive matching account usability through F05's shared availability boundary: a technical reread failure alone does not erase an established UUID or confirmed Follow state. Refused private data remains withdrawn until a successful applicable read; the latest read error supplies current recovery feedback without a frozen refusal history. Detached mutation callbacks retain their captured client; no session epoch, registry or second private cache is introduced. F05's accepted same-subject quality-of-service limits remain applicable.

[F03 T084–T086](../007-sporting-consultation/tasks.md#initial-sporting-composition) and [T053/T054](tasks.md#shared-account-and-sporting-composition) own the F03 reference composition and F06-specific adoption of shared scoped read recovery under FR-029 respectively. Their completion boundaries remain separate. Team/Pool routes share one `useFollowStateQuery`, using F05's `useAccountAvailability`, with the page boundary and query-free `FollowControl`; `FollowButton` remains the connected wrapper. Only private action/recovery subtrees use the account/target React key; the public audience and pager remain mounted. See the [ownership rationale](research.md#shared-sporting-follow-read-and-scoped-recovery).

`SportingActions` supplies the audience to the wrapping action/count row. Shared Error placement, safe-read Retry and operation progress consume [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements) at the scope required by [F13 FR-041](../003-shared-quality/spec.md#first-useful-composition). Matching relationship confirmation remains in Query; command pending state stays with its native mutation. F05 owns account recovery and F03 owns indispensable sporting context. [T053/T054](tasks.md#shared-account-and-sporting-composition) own the remaining F06 adoption and representative qualification, including Home’s followed-list scope; no compact recovery exception overrides F13.

Follow actions use [F13's ordinary native mutation conventions](../003-shared-quality/plan.md#frontend-mutation-conventions). Query owns shared confirmed member state; each mounted native mutation owns pending/error presentation while the control retains its current confirmed label and selection. The confirmed response updates already admitted member data through `onSuccess` and `setQueryData`; it neither recreates unavailable entries nor clears a known access/visibility refusal, which requires a successful current member read. Ordinary failure retains the previous state and shared action feedback. Follow alone selects the shared Button's native `ActivityIndicator` option in its existing leading-icon slot; other buttons retain their existing loading presentation. This scoped native adaptation changes no layout or journey. A mutation key does not merge independent controls' pending state. Two visits/controls may send the same target desired-state requests; last server-recorded state wins. Keep F03's one shared team-follow action. Dependent read failures remain separate from the confirmed write. No mutation-cache guard, custom confirmation read or automatic replay is added.

After a confirmed change, reset affected personal list/calendar queries with native resetQueries, without old initialData/placeholderData. This cancels old traversal and reloads the first page of visible/enabled queries; inactive views load on next display. Query enablement follows the visible personal tab, rather than merely a mounted navigation screen. Set staleTime: Infinity for retained personal lists/calendars so re-enabling a populated query alone does not refetch it; keep F03's disabled mount/focus/reconnect refetches. Resets still remove obsolete results and explicit refreshes fetch with staleTime: 0. Preserve selected season/category, invalidate season options and the affected public count. No full-list optimistic rewrite or per-match origin metadata.

Home's `(tabs)/(home)` layout retains the existing entry/age/session guards and lifts the sole `usePersonalSeason` owner to `PersonalSeasonProvider`, inside the native principal’s private lifetime and keyed by that principal plus business account UUID. Replacement of the UUID resets the former personal choice through ordinary React identity; it does not remount unrelated public navigation. Home and `/season` consume that same in-memory choice and Query context; no second selection, cache, global provider or callback route parameter is introduced. The `(sheets)/season` leaf uses [F13's intrinsic native sheet and basic-list composition](../003-shared-quality/plan.md#native-ui-and-approved-design); `PersonalNavigation` withdraws it when current admission or retained-refusal rules stop allowing the choice. Each explicit opening rereads options once, preserving established choices after a transient failure and ignoring obsolete completions. `EntryGroup` and `SelectionRow` share spacing, separators and native radio/check semantics with the other bounded choices.

Home composes F13's shared `PagedTabs`, compact controls and retained native pages. Its Blockout brand is the shared container’s collapsible header; scrolling hides it while the tab/season rail stays pinned below the status area. The same native material blurs content passing behind that rail. Calendar dates remain opaque and the next date pushes the previous one out before pinning, under F03/F13’s shared contract. `PersonalCalendar` owns the generated personal envelope and its selection, consuming [F03's grouping/refresh owner](../../apps/mobile/src/features/sporting/api/use-calendar-grouping.ts); `SportingCalendarView` reuses F03's actual date/pool/match rows, sticky geometry, continuation feedback and exact sporting navigation. Only a successful empty envelope selects either the approved no-available-follows/search card or no-applicable-matches card. Full-content Error/Empty placement and gestures follow [F13’s shared State Card convention](../003-shared-quality/plan.md#native-ui-and-approved-design): a useful existing card action, without pull-to-refresh and under the shared top placement with common insets and retained native scrolling/header collapse/overflow. Populated calendars, follows lists, local sections and ordinary retained-content refresh keep their own owners.

For [A30](spec.md#user-story-5--understand-counters-and-recover-after-an-error-priority-p1), the existing `PersonalSpace` keeps that same `PagedTabs` and three scene identities during common-prerequisite loading or final failure. Each dependent scene composes `PageScrollView` with `ReadFeedback` and the applicable loading shape, rather than replacing the pager with `PageViewport`, standalone `Tabs` and one body. `PageScrollView` already selects the native tab scroll adapter inside this pager. `ReadFeedback` owns same-card explicit Retry presentation, including a pending-with-prior-error Query and suspension; do not branch to a first-load skeleton ahead of it. Pending background reads retain usable content under F13. The existing profile/season Query result is passed to the scenes, without another observer, read-on-tab-change effect or copied result. Calendars/lists remain inactive until the matching account and indispensable season context are usable. The season selector keeps its existing readiness/refusal guards; tab changes and technical failure do not change the retained season or original owner. Existing F05 guest/admission boundaries and account/UUID resets remain intact. [T056](tasks.md#shared-account-and-sporting-composition) adopts and qualifies only this composition after its own prototype and Figma approvals; [research](research.md#home-pager-during-common-read-failure) records the bounded feasibility evidence.

Following follows the approved [expanded Home sections](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4473-2438):
Teams and Pools are independently collapsible sections in one virtualized native list. Both use
the existing Entity Card presentation exposed by F03; F04 retains its unchanged adapter. Exact
card openings use F03/F11 navigation, and the destination's existing T015 follow control remains
the action owner. The approved list cards add no inline follow control or loaded-count total.
A public follower-count NotFound removes the exact identity from retained personal lists and cancels
older continuations, without deleting the relationship or exposing an unavailable placeholder.

Ordinary refresh uses [F03’s grouping owner](../007-sporting-consultation/plan.md#mobile-state-and-navigation): native infinite refetch may reread the retained traversal. A changed loading zone selects its own Query context. The first-page reset applies specifically to a confirmed follow change. After changed follows, loading/error/retry replaces the former selection. Ordinary pending refresh/continuation and final failed-read scope follow [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements), retaining authorized pages/cursor in Query for explicit recovery. Paginated personal lists use [F13’s automatic continuation and scoped card recovery](../003-shared-quality/plan.md#repeated-interaction-conventions). Return without a change preserves the existing context; no precise scroll guarantee after recomposition.

Follow errors and uncertain acknowledgments keep F13's ordinary action feedback, invalidation and explicit retry. A later read observes current state and proves neither rollback nor cancellation of a delayed write. Mutations retain networkMode: 'always' and retry: false; F05 owns private-client cleanup and credential capture. Known visibility restrictions retain their existing resource owners.

## Qualification

The [quickstart](quickstart.md) owns database, mobile and generated-boundary validation scenarios and expected outcomes. F03 owns ordinary retained-calendar refresh, F05 account erasure and F07 notification eligibility; the preceding sections define their F06 integration boundaries.
