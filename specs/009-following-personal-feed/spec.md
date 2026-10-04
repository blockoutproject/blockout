# Functional specification: follows and personal calendar

**Feature branch**: `feature/265-following-personal-feed`

**Created**: 2026-09-20

**Status**: Accepted functional baseline under [planning authority #9](https://github.com/blockoutproject/blockout/issues/9); technical-dossier acceptance and implementation evidence remain separate.

**Requested scope**: [#265](https://github.com/blockoutproject/blockout-legacy/issues/265), F06 in the [specification navigation](../../README.md#specifications). Define following teams and pools, associated lists and counters, and match selection for the personal calendar. [F02](../002-sporting-data/spec.md) owns identities and visibility, [F03](../007-sporting-consultation/spec.md) calendars and [F05](../005-accounts-identity/spec.md) accounts. No club follows, automatic seasonal transfer, technical contract or mockup is introduced.

## User scenarios and validation _(mandatory)_

The actors are the visitor and the signed-in person with a usable profile, free or Pro. Follows are personal; the public follower count does not provide access to follower identities. Scenarios express expected V2 outcomes, not V1 qualification. FR, A and SC identifiers are local to F06.

### User story 1 — Manage my follows with a reliable outcome (Priority: P1)

As a user, I want to manage my follows with a reliable outcome.

**Priority rationale**: Following a resource must produce a single relationship and an understandable state, even after a failure.

**Independent validation**: Add and remove follows, repeat requests and interrupt their responses.

**Acceptance scenarios**:

1. **A01** — **Given** a guest or a person whose profile is temporarily unavailable, **when** a follow action is requested, **then** the guest receives a sign-in invitation without implicitly executing the follow after sign-in; an unavailable profile suspends the personal action without closing public viewing. No Pro subscription is required. (FR-001, FR-002)
2. **A02** — **Given** an unfollowed viewable team or pool, **when** a follow is confirmed, **then** a single relationship is created for the current account; follow state, the applicable list and match selection reflect the outcome. Following a pool does not individually follow its teams, or vice versa. (FR-003, FR-005)
3. **A03** — **Given** an already followed resource or an already absent follow, **when** the same request is repeated, including after a double tap, **then** the outcome remains followed or absent respectively, without an additional relationship or counter change. A retry does not replay an old change over newer state. (FR-003, FR-004, FR-023)
4. **A04** — **Given** an existing accessible follow, **when** removal is confirmed, **then** the relationship is removed without deleting the sporting resource; the list and calendar are reassessed without removing matches still selected by another follow. (FR-004, FR-019)
5. **A05** — **Given** a team whose name or classification is corrected without changing its identity, **when** data is refreshed, **then** the follow is retained. A team in the new season, even with the same name and club, is not automatically followed. (FR-006, FR-007)
6. **A06** — **Given** a mutation in progress for an account, **when** the person switches accounts or signs out before the response, **then** no private data or late response from the first account affects the new context; no guest follow is created. (FR-002, FR-023)

### User story 2 — Choose a shared season for my personal space (Priority: P1)

As a user, I want to choose a shared season for my personal space.

**Priority rationale**: A single selection prevents calendars and their follows from referring to different seasons.

**Independent validation**: Change the season across the three screens, select All seasons and add a follow from another season.

**Acceptance scenarios**:

1. **A07** — **Given** viewable follows from 2025/2026 and 2026/2027, and a catalog season of 2027/2028, **when** the personal space opens without a retained choice, **then** 2026/2027 is selected. Without a viewable follow, 2027/2028 is offered; without an available season, no year is invented. A retrieval error does not prove the absence of seasons. (FR-009, FR-010, FR-022)
2. **A08** — **Given** several seasons followed or viewable in the catalog, **when** a season is chosen in Upcoming, Completed or Following, **then** the same selection applies to all three screens and the Teams/Pools lists; F04 search filters and F03 club sheets do not change. Choices are combined without duplicates or fixed years. (FR-008, FR-009)
3. **A09** — **Given** viewable follows from several seasons, **when** All seasons is selected, **then** their lists and eligible matches become accessible together under their ordering rules, without follows transferred between seasons. (FR-008, FR-014, FR-018)
4. **A10** — **Given** a filter on 2025/2026, **when** a team from 2026/2027 is followed from its detail sheet, **then** the follow is confirmed with its season but the filter remains on 2025/2026; the resource can be found in 2026/2027 or All seasons. A new opening without a retained choice recalculates the default. (FR-010, FR-011)
5. **A11** — **Given** a valid selected season, **when** a detail sheet is opened then left, or a newer season appears, **then** the current choice and still-valid context are retained. A reset returns to the default among viewable follows, then the catalog if none exist. (FR-010, FR-015)
6. **A12** — **Given** a selection that has become unavailable, **when** this unavailability is established, **then** it is indicated with an alternative choice or reset, without silent replacement. Failure to retrieve choices preserves uncertainty instead of declaring the selection gone. (FR-012, FR-022)

### User story 3 — Find my follows without exposing a hidden resource (Priority: P1)

As a user, I want to find my follows without exposing a hidden resource.

**Priority rationale**: Personal history remains useful while respecting sporting restrictions.

**Independent validation**: Browse identical names and old seasons, hide then restore a followed resource.

**Acceptance scenarios**:

1. **A13** — **Given** viewable followed teams and pools, including identical names, **when** the lists are browsed, **then** each tab applies the shared filter and alphabetical public-name ordering, with stable tie-breaking and known season/classification context. All matching follows remain accessible, without a silent total cap. (FR-013, FR-014)
2. **A14** — **Given** a followed resource that becomes hidden under F02, **when** lists, calendars and old access paths are viewed, **then** no card, unavailable section, old name or generic entry exposes this hidden follow; the detail sheet follows F03 unavailability and no removal control is offered in the interface while hidden. The relationship remains retained. (FR-016)
3. **A15** — **Given** a retained relationship to a hidden resource, **when** the same identity becomes viewable again, **then** its follow and eligible effects reappear without a new addition or double increment; a remaining independent restriction prevents this reappearance. (FR-006, FR-016, FR-020)
4. **A16** — **Given** only hidden follows for a season, with no other viewable data from that season, **when** choices and lists are presented, **then** those follows alone do not add this season to the selector. If the catalog independently justifies it, it may remain offered. Empty states refer to follows available for the selection without claiming that retained relationships have been erased. (FR-009, FR-016, FR-017)
5. **A17** — **Given** a catalog season without personal follows or follows without eligible matches, **when** the calendar is viewed, **then** the first case explains the absence of available follows for the selection and offers search; the second explains the absence of applicable matches. No general calendar is presented as personal. (FR-017, FR-018, FR-022)

### User story 4 — See each relevant match once (Priority: P1)

As a user, I want to see each relevant match once.

**Priority rationale**: Several follows may refer to the same match without multiplying matches in the feed.

**Independent validation**: Combine participant and pool follows, then remove them successively and walk through F03 time cases.

**Acceptance scenarios**:

1. **A18** — **Given** several follow relationships and known matches, **when** the feed is viewed, **then** the following cases apply. (FR-016, FR-018, FR-019, FR-021)

- **Union and deduplication**: Following both teams and their pool presents each currently viewable match in the selected season once.
- **Withdrawn match with a result**: Even if the team remains viewable in another pool, a match withdrawn from its former calendar under F02 is absent from the feed and its public detail sheet; its internally retained result does not make it displayable. Following the former pool does not bypass withdrawal.
- **Confirmed empty calendar**: One qualified wholly empty current observation hides the pool, its matches and participations under F01/F02 without deleting follows. A team hides only if no visible participation remains elsewhere. False empty and partial observations preserve accepted presence.
- **Failure and reappearance**: A download failure alone removes no match. An authorized reappearance restores retained identities and follows without duplicates and without waiting for two new collections, subject to the selected season and other restrictions.

2. **A19** — **Given** several follows selecting a match, **when** one and then the last of these follows are removed, **then** the match remains present as long as an applicable follow selects it; it disappears from the personal feed after the last is removed, without sporting deletion of the match. (FR-004, FR-019)
3. **A20** — **Given** a dated match without a result, a postponement, a match without a time and a match without a date, **when** the personal calendar is browsed in Paris and New York, **then** days/times, Upcoming/Completed categories, the unavailable-result indication, shared boundaries and hiding without a date follow F03. The filter concerns the F02 sporting season, not the local calendar year. (FR-018, FR-021)
4. **A21** — **Given** a multipage calendar and a change in follows or season, **when** responses arrive out of order or an additional page fails, **then** old batches are not added to the new context; already retrieved matches that remain authorized stay accessible with retry, without duplicates or a false end of list. (FR-019, FR-022, FR-023)

### User story 5 — Understand counters and recover after an error (Priority: P1)

As a user, I want to understand counters and recover after an error.

**Priority rationale**: A responsive interface must not announce a definitive state without evidence of the outcome.

**Independent validation**: Simulate confirmed failures, lost responses and failure after success, then check counters and shared rules.

**Acceptance scenarios**:

1. **A22** — **Given** a known or unavailable public count, **when** a follow is confirmed, repeated, hidden then restored, **then** a relationship counts once; repetition or hiding neither creates nor removes a relationship. An unknown count is not zero and the number of filtered results does not become the follower count. (FR-020)
2. **A23** — **Given** a certainly refused request, **when** its outcome is shown, **then** the previous confirmed state remains applicable, with an error and an appropriate retry option, without invented success or count. A target that has become hidden cannot be followed through old access. (FR-001, FR-024)
3. **A24** — **Given** a potentially saved addition or removal whose response is lost, **when** the interface receives a transport error, **then** it indicates verification or uncertainty and recovers state through checking or safe retry, without assuming certain failure or producing a duplicate. (FR-024, FR-025)
4. **A25** — **Given** an accepted mutation followed by failed profile retrieval, **when** presentation is reconciled, **then** the read failure does not prove cancellation of the mutation. A provisional state does not become false confirmation; the outcome is verified without arbitrarily erasing established success. (FR-025)
5. **A26** — **Given** retrieved follows but failures for some resources or matches, **when** journeys are viewed or refreshed, **then** available and authorized data remains usable, with identifiable freshness and limits; each failure remains distinct from zero follows, zero resources or zero matches. Waits are bounded and retry is possible. (FR-022, FR-026)
6. **A27** — **Given** a confirmed then removed follow, **when** the relationship is consumed by notification features, **then** F07 receives the meaning of the change without a duplicate relationship or reimposed old state. The feed season filter does not become a notification preference; following alone promises neither system permission nor delivery. (FR-023, FR-027)
7. **A28** — **Given** a free user, Pro user or user with unknown entitlements, **when** follows and personal calendars are used with applicable accessibility aids, **then** F05/F09/F11/F13 rules apply: no payment required to follow, no interstitial on filtering/refresh/return, sporting navigation according to F11, states readable without color alone, relationship privacy and contextual reporting. (FR-026, FR-028)

### Edge cases

- A completed season remains viewable under F02; a new season does not replace followed identities.
- All follows may be retained but hidden: no unavailable list is exposed and the interface does not claim relationships have been deleted.
- Removing the last follow from the selected season does not silently change seasons: it remains selectable if the catalog justifies it; otherwise FR-012 applies.
- A follow from another season is saved without changing the current filter; the filter is neither a follow mutation nor a notification preference.
- An absent response, an established refusal and a read failure after success are three distinct situations.

## Requirements _(mandatory)_

### Functional requirements

#### Access, relationships and renewal

- **FR-001**: Following MUST concern only viewable teams and pools, for a signed-in person with a usable profile, with no Pro requirement. A nonexistent or hidden target MUST NOT receive a new follow through old access. No editing right or club follow is added.
- **FR-002**: A guest MUST receive the F05 sign-in invitation without implicitly executing a follow afterwards. An unavailable profile suspends personal actions without blocking public content. Follows and responses MUST remain isolated by account; sign-out, account change and deletion follow F05.
- **FR-003**: A confirmed addition MUST create a single account/type/identity relationship. Repeating an already satisfied addition MUST NOT create a duplicate or repeat its counter effects. Concurrent requests or retries MUST respect this uniqueness.
- **FR-004**: Confirmed removal of an accessible follow MUST delete that personal relationship without deleting the sporting resource. Removing an already absent relationship MUST NOT repeat counter effects. State, list and match selection MUST be reassessed after confirmation.
- **FR-005**: Following a pool MUST NOT create individual follows for its teams; following a team MUST NOT create follows for its pools. Each relationship retains its meaning and may select relevant matches independently of the others.
- **FR-006**: A follow MUST remain attached to the F02 identity, including during a name/classification correction that preserves it and an authorized reappearance. No similarity of name, club or classification transfers the relationship to another identity.
- **FR-007**: Seasonal follow renewal MUST remain manual. A new seasonal team or pool does not inherit old follows; still-viewable historical resources remain accessible. The exceptional V1 reset follows [F14](../014-v1-v2-transition/spec.md): no recovery of old follows is promised or inferred from resource similarity; new follows remain voluntarily chosen.

#### Shared season and navigation

- **FR-008**: Upcoming, Completed and Following MUST share a single season selection, also shared by the Teams and Pools lists. “All seasons” MUST be offered. This filter is independent of F04 search and F03 club sheets.
- **FR-009**: Offered seasons MUST combine those from viewable follows and the viewable catalog, without duplicates or fixed years. A season justified only by hidden follows MUST NOT be exposed through those relationships; it remains possible if the catalog independently justifies it. No year is invented without available data.
- **FR-010**: Without a retained choice, the latest season among viewable follows MUST be selected; failing that, the latest in the catalog. A valid selection MUST persist during the journey, even if a newer season appears. Resetting reapplies this rule; a new opening without a retained choice recalculates the default.
- **FR-011**: Adding a follow from another season MUST NOT change the current shared filter. Confirmation MUST identify the follow’s season, where it can be found, or in All seasons. This rule does not transfer the follow or erase navigation choices.
- **FR-012**: A selection that has become unavailable MUST be indicated with a correction or reset option, without silent replacement. An error loading choices MUST NOT be treated as their disappearance.

#### Personal lists and hiding

- **FR-013**: The Teams and Pools lists MUST apply the shared filter and sort viewable follows alphabetically by public name, with stable tie-breaking for identical names on unchanged data. Season, classification and other available contextual information MUST allow resources to be distinguished without invented details.
- **FR-014**: All viewable follows matching the selection MUST be accessible, without a silent total cap. An identity appears once in its list. All seasons combines eligible historical follows without changing their identities.
- **FR-015**: Opening a resource MUST use its F03 detail sheet. Returning MUST retain selection, tab and position when the context remains valid; an ordering or visibility change may require recomposition without guaranteeing the exact position.
- **FR-016**: A resource hidden under F02 MUST disappear from lists and from its unauthorized feed effects, even if followed. An unavailable section, old name, generic card or removal control for this follow MUST NOT be exposed while hidden. The relationship remains retained for reappearance of the same identity without a new addition; no other restriction reason is lifted. An old link follows F03 unavailability.
- **FR-017**: Empty states MUST distinguish no follows available for the selection from no applicable matches despite available follows. They MUST NOT assert deletion of hidden relationships. A season without available follows MUST offer access to search to choose follows manually.

#### Personal calendar and counters

- **FR-018**: The feed MUST select only matches currently viewable under F02/F03 in the chosen sporting season, linked to at least one applicable followed team or pool. A team selects its matches within its viewable participations; a pool selects its viewable matches. A followed team or pool never makes a withdrawn match viewable, even with an internally retained result. Full withdrawal after one qualified, complete, current and successfully integrated empty-calendar observation follows F01/F02; a read failure does not trigger it. All seasons removes only the seasonal restriction. Without an applicable follow, no substitute general calendar is presented as personal.
- **FR-019**: A match selected by several follows MUST appear once. Removing a follow MUST NOT remove it if another still selects it; removing the last removes it from the feed without a sporting mutation. Pagination and refresh MUST avoid duplicates and lasting omissions in accordance with F03.
- **FR-020**: The public follower count MUST represent existing follow relationships for this identity, each once, without exposing followers. Season filtering, hiding and reappearance neither create nor delete a relationship. An unknown count MUST NOT be presented as zero; a quantity of displayed follows does not become the follower count or an implicit exhaustive total.
- **FR-021**: Personal calendars MUST reuse F03 for local times and days, ordering, shared boundaries, absent results, postponements, unknown dates and navigation. A past match without a result falls under F03 handling, not a feed-specific exclusion. The season comes from F02, never from the display calendar year.

#### Errors, concurrency and shared responsibilities

- **FR-022**: Loading relationships, retrieving resources and loading matches MUST remain distinguished. A failure at one stage MUST NOT produce zero follows or zero matches. Still-authorized data remains usable with its limits and freshness; waits are bounded and initial, refresh or additional-page errors offer retry without a false end of list.
- **FR-023**: Requests and responses MUST be tied to the applicable account, target and context. An obsolete response MUST NOT replace a current selection or add an old batch to the new feed. Repeated mutations or events MUST NOT reimpose a prior state after a newer confirmed change.
- **FR-024**: Confirmed success MUST be distinguished from confirmed failure and an uncertain outcome. A certain refusal retains the applicable confirmed state and explains the failure. A lost response MUST lead to verification or safe retry without assuming that no change was saved.
- **FR-025**: Failed profile retrieval after a mutation MUST NOT suffice to announce its cancellation. Optimistic presentation MUST remain identifiable as provisional until confirmation; reconciliation recovers the outcome without inventing a relationship, count or success.
- **FR-026**: Apply F13 honest freshness, accessibility, failure isolation and diagnostics without a performance or monthly availability target. Follow state, selections and retries MUST be understandable without colour alone. Current restrictions override retained data.
- **FR-027**: Confirmed relationships and their changes MUST constitute the follow reference consumable by F07 without duplicates or a return to old state. F07 owns notification eligibility and delivery; following alone proves neither system permission nor delivery. The display season MUST NOT implicitly become a notification preference.
- **FR-028**: F05/F09/F11 MUST govern accounts, entitlements, advertising and privacy. Follows and the personal calendar do not become paid features. Filtering, refreshing and returning do not trigger an interstitial; sporting navigation follows F11. Personal relationships are not exposed to other users. Reporting retains its context and F10/F11 limits without implicit new collection.

### Key entities

- **Follow relationship**: A personal link between an account and a team or pool identity, retained independently of visibility and without implicit seasonal transfer.
- **Personal selection**: A single season or All seasons, shared by calendars and both follow lists, distinct from F03/F04 filters.
- **Viewable follow**: A relationship whose target is currently viewable under F02; visibility does not define the existence of the relationship.
- **Feed match**: A viewable F02 match selected by at least one applicable relationship, presented under F03 and deduplicated by identity.
- **Follower count**: The number of existing relationships on a resource; it denotes neither loaded list items nor a public user list.
- **Mutation outcome**: Confirmed success, confirmed failure or uncertainty requiring verification; optimistic presentation does not constitute evidence of saving.

## Success criteria _(mandatory)_

### Measurable outcomes

- **SC-001**: A01–A06 produce at most one relationship per account/type/identity, no guest or implicit follow and no cross-account leakage. Repeats produce zero additional effects. (FR-001–FR-007, FR-023)
- **SC-002**: A07–A12 apply the same selection across the three screens and both lists, without changing external filters or silently replacing a valid choice. (FR-008–FR-012, FR-015)
- **SC-003**: A13–A17 make all matching viewable follows accessible, with zero entries revealing a hidden follow and zero relationship transfers on reappearance. (FR-013–FR-017)
- **SC-004**: A18–A21 show each eligible followed match once. No follow or retained result bypasses hiding after a qualified single current empty observation. False empty, wrong context and incomplete integration authorize no absence-based hiding. Reappearance preserves independent restrictions and identities. All time cases use F03. (FR-016, FR-018–FR-019, FR-021–FR-023)
- **SC-005**: A22–A26 produce zero repeated counter changes, zero uncertainties presented as certain failures and zero failures presented as established empty lists. (FR-020, FR-022–FR-026)
- **SC-006**: A27–A28 respect F05/F07/F09/F10/F11/F13 boundaries, without a notification preference inferred from the filter, paid follows or new collection. Journeys satisfy shared F13 objectives during qualification. (FR-027–FR-028)

## Assumptions

- The shared selection applies only to the personal space. Persistence between launches is not required; while a valid choice is retained, it takes precedence over default calculation.
- The absence of hidden-follow removal in the interface is intentional. It does not block erasure of personal data during F05 account deletion; a deleted relationship does not return on sporting reappearance.
- F04 search remains the entry point for manually choosing resources from another season. No transfer assistant or automatic renewal button is added.
- Optimistic presentation is possible but not required; provisional state and reconciliation are mandatory. No concurrency, transport, storage or counter-rebuilding mechanism is chosen here.
- Follow relationships remain the reference for the count. Display states are not deletion operations; account-deletion effects follow F05.
- Collection or season deadlines alone do not determine viewability. F02 owns viewability; F03 owns categories and calendar rules, including handling past matches without results.
- This delivery is functional. R01/R02 and global acceptance under #247 precede any technical plan, task or implementation.

## Evidence and traceability

### V1 sources

These observations describe the local repository and constitute neither production measurements nor evidence of V2 compliance.

| Source                                                                                                                                                                                                                                                                                                                                                                                                                             | Observation and limit                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [historical source baseline](../014-v1-v2-transition/spec.md#v1-evidence)                                                                                                                                                                                                                                                                                                                                                          | Team/pool follows, manual renewal and personal selection retained. Handling past matches without results now follows F03 intent.                                                                                                      |
| [Favorites service](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/users-service/src/main/java/com/blockout/users/user/application/UserFavoriteApplicationService.java)                                                                                                                                                                                             | Existence check before addition, no-effect removal if absent, counter updates and publication of changes. These paths alone do not prove consistency under retries or distributed failures.                                           |
| [Mobile mutation](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/user/hooks/use-follow-state.ts)                                                                                                                                                                                                                                                | Optimistic update then profile retrieval in the same operation, with restoration on error. A read failure may therefore be treated as an overall failure; FR-024/FR-025 requires distinguishing the saved outcome from its retrieval. |
| [Follow list](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/followed/ui/followed-screen.tsx)                                                                                                                                                                                                                                                   | Separate seasonal selections for teams/pools and a default derived from retrieved resources. F06 defines a single shared selection including the calendar, without imposing this V1 structure.                                        |
| [Followed teams](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/team/hooks/use-followed-team-list.ts), [list](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/followed/ui/followed-teams-list.tsx)                                                            | Retrieval by identities, derived seasons and mobile states; absent or failed data does not prove deletion of relationships.                                                                                                           |
| [Personal feed](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/feed/ui/feed-screen.tsx), [match selection](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/matches-service/src/main/java/com/blockout/matches/match/infrastructure/persistence/repositories/MatchRepository.java) | Selection by followed teams or pools and Upcoming/Completed calendars. V2 categories, time boundaries and display rules remain those of F03, not V1 queries.                                                                          |
| [Count](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/shared/ui/follow/followers-count.tsx), [remote update](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/users-service/src/main/java/com/blockout/users/user/infrastructure/http/HttpFollowerCounter.java)                           | Existing public count and follow effects; F06 defines their meaning without prescribing V1 calls or technical guarantees.                                                                                                             |
| [identity continuity requirements](../005-accounts-identity/spec.md#v1-evidence-and-limitations), [Pro continuity evidence](../006-pro-subscriptions/spec.md#v1-evidence-and-limitations) and [transition requirements](../014-v1-v2-transition/spec.md)                                                                                                                                                                           | Voluntary deletion and V1 recovery are not seasonal renewal; no restoration of erased personal data or new paid capability is implied.                                                                                                |

Tabs, follows by identity, counters, search for new targets and reporting are retained within their scope. The shared filter, explicit uncertainty transitions and consistency requirements are V2 outcomes, not code fixes delivered here. V1 cache durations, list structures and interservice calls remain technical details not carried forward as obligations.

### Inventory and decision coverage

| Coverage                                                   | F06 requirements      | Scenarios         |
| ---------------------------------------------------------- | --------------------- | ----------------- |
| access, addition/removal, identity and renewal             | FR-001–FR-007         | A01–A06           |
| shared season selection                                    | FR-008–FR-012         | A07–A12           |
| lists, history and hiding                                  | FR-013–FR-017         | A13–A17           |
| union, deduplication and match presentation                | FR-018–FR-019, FR-021 | A18–A21           |
| counters, errors, concurrency and retry                    | FR-020, FR-022–FR-025 | A03, A06, A21–A26 |
| F05 / F07 / F09 / F10 / F11 / F13: shared responsibilities | FR-026–FR-028         | A26–A28           |

<a id="cross-perimeter-dependencies"></a>

### Cross-feature dependencies

| Owner                                                                                     | Agreement with F06                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F02](../002-sporting-data/spec.md)                                                       | Identity, sporting season, corrections, withdrawals and reappearances. F06 retains relationships without exposing hidden targets or transferring follows.                                                                                                                                       |
| [F03](../007-sporting-consultation/spec.md)                                               | Detail sheets, ordering, pagination and local time; its presentation boundaries do not become sporting or notification events.                                                                                                                                                                  |
| [F04](../008-search-discovery/spec.md)                                                    | Search to manually choose new follows; its text and filters are not controlled by the personal season.                                                                                                                                                                                          |
| [F05](../005-accounts-identity/spec.md)                                                   | Sign-in, ready profile, isolation and deletion of personal relationships; no automatic follow after sign-in.                                                                                                                                                                                    |
| [F07](../011-notifications-delivery/spec.md)                                              | Consumes confirmed follows; owns notification eligibility and delivery. Unfollowing does not itself delete existing entries, and re-following or season changes do not reset F07 retention or announcement allowances. The feed season remains a display filter, not a notification preference. |
| [F09](../006-pro-subscriptions/spec.md) / [F11](../004-advertising-privacy-legal/spec.md) | Entitlements and advertising without added Pro restrictions on follows or the feed; privacy of personal lists.                                                                                                                                                                                  |
| [F10](../012-reports-feature-suggestions/spec.md) / [F13](../003-shared-quality/spec.md)  | Contextual assistance, minimisation, accessibility, honest freshness, errors and diagnostics. No performance qualification or new timing target.                                                                                                                                                |
| F14 / R01 / R02                                                                           | Migration distinct from seasonal renewal, global consistency and mockups. R02 covers the shared filter, identical names, empty states, provisional/uncertain mutations and retry; no screen is declared validated here.                                                                         |

## Approved F01 source-lifecycle clarification — 2026-10-06

A follow targets the immutable seasonal team or contextual pool. Following CFA tour 01 does not follow CFA tour 02. Following the same seasonal team includes compatible participation across those pools; different divisions or seasons define distinct teams under F02. No automatic interseason follow transfer or promotion tracking is added. See [F01 A38–A45](../001-source-acquisition/spec.md).
