# Feature Specification: Search and discovery

**Feature Branch**: `develop`

**Created**: 2026-09-19

**Status**: Accepted functional baseline; the [technical dossier](plan.md) formalizes the planning decisions. Implementation qualification remains pending.

**Input**: F04 in the [specification navigation](../../README.md#specifications). Define public discovery and search for clubs, teams and pools, their filters, seasons, ordering, complete browsing and recovery states. Identities and visibility remain governed by [F02](../002-sporting-data/spec.md), destinations by [F03](../007-sporting-consultation/spec.md) and shared quality by [F13](../003-shared-quality/spec.md). No other searchable resource type or new mockup is added; the technical dossier owns engine and contract choices.

## User Scenarios & Testing

Design input: [Discovery journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=916-2826) and its October 10 approval, prototype `2177c354254031ea3d7e5e98e201ea66ec7e6f1e`. This approval covers the affected design, without establishing technical or runtime qualification.

The current [F13 screen-state grammar](../003-shared-quality/spec.md#functional-requirements) applies to every search state and its Figma/prototype representation. Every failed list read uses the shared illustrated error card and FR-022's explicit safe read retry, including pagination and authorized rereads. Refused reads use the same opaque error variant, never an empty result; a failed read replaces visible results with the card, without an additional toast. Error and empty share one card anatomy. Unchanged journey approvals and runtime qualification limits still apply.

Search MUST NOT expose pull-to-refresh or a refresh button. Text/filter context and existing authorized read owners drive reads; a safe initial/new-read retry remains on its error card. References to refreshing or rereading below mean those authorized data reads, not an additional user gesture or implicit reconnect/focus replay. A failed read replaces visible results with the F13 error card; a genuinely new search key cannot display another key’s results. No background reread trigger or toast is introduced. An established end removes the continuation action without a “Fin des résultats” message.

The actors are the visitor and the signed-in person, with or without Pro. All have public search access. F04 grants no editing permission. FR, A and SC identifiers are local to this specification. Scenarios describe expected V2 behavior without attesting to implementation or tests already performed.

### User Story 1 — Discover resources without entering text (Priority: P2)

As a visitor, I want to discover useful examples without an account or prior input.

**Why this priority**: Examples help exploration after reliable named search is available; they are not a complete catalogue or a prerequisite for finding a known resource.

**Independent Test**: Open each tab, return from a detail sheet, change a filter then reset search.

**Acceptance Scenarios**:

1. **A01** — **Given** a visitor or a free person, Pro person or person with unknown entitlements, **when** search opens, **then** the Teams, Pools and Clubs tabs are accessible without mandatory sign-in or purchase; unknown entitlements do not block public search. (FR-001, FR-028)
2. **A02** — **Given** an empty field, including whitespace-only input, including with chosen filters, **when** a tab is viewed, **then** a limited selection is explicitly presented as examples, without a total or claim of completeness; teams and pools respect the chosen season, with the newest available season preselected. (FR-002, FR-006, FR-012)
3. **A03** — **Given** already presented viewable examples, **when** a detail sheet is opened then left or another tab is visited, **then** the previous examples and their order are retained during the visit; they may vary on a new visit and do not rely on a profile or geolocation. A known restriction removes the affected resource. (FR-003, FR-020)
4. **A04** — **Given** empty-text examples, **when** filters change, **then** examples remain limited and respect those filters. Entering text opens exhaustive paginated search; clearing it returns to filtered examples. Explicitly reselecting the default season creates no different mode. (FR-002–FR-005)

### User Story 2 — Find a resource by its names and context (Priority: P1)

As a user, I want to find a resource despite input variations, without confusing similar identities.

**Why this priority**: Tolerant search must remain faithful to sporting context and identities.

**Independent Test**: Search names, cities, classifications, aliases and words distributed across fields on a set of known resources.

**Acceptance Scenarios**:

1. **A05** — **Given** a club named “Étoile Volley” in Lyon, **when** “etoile”, “ÉTOILE” or “etoile” is searched, **then** the club remains findable; “éto” allows word-prefix searching. Whitespace alone constitutes an empty field. (FR-006, FR-007)
2. **A06** — **Given** teams and pools with the known fields provided by F04, **when** each field is searched separately, **then** full or short name, club, club city, division, format and gender find the relevant teams; full or short name, division, league, format and gender find the relevant pools. Known division abbreviations find resources in their applicable division, without changing identity or ignoring any other term. Name and city find clubs. After city correction under F02, search and distinguishing information use the effective city; intentional absence removes this field without hiding the club or its teams. The replaced raw city no longer remains a locality-matching criterion. A return to the source follows the currently authorized value and F13 propagation. (FR-006, FR-021, FR-026) For a professional team without a club, its available name and division remain searchable, while no club or club-city match is invented. Attaching a verified club preserves the team identity and supplies its eligible fields.
3. **A07** — **Given** an “Eagles” team attached to a club in Lyon and another Eagles team in another city, **when** “Eagles Lyon” is searched, **then** terms may match different fields of the same resource; the word Eagles alone does not satisfy the whole search. (FR-008)
4. **A08** — **Given** a direct match for text and a resource with a similar name, **when** a small typo is entered, such as “Volly” for “Volley”, **then** the approximate match remains findable with relevance favoring direct matches. The wrong season, division, format or gender excludes the resource even if its name is similar. No unrelated result is added to fill the list. (FR-009, FR-011, FR-017)
5. **A09** — **Given** a customized public name, its current source name and a verified alias bounded by F02, **when** each name is searched in its valid context, **then** the same identity is found once under its public name. Two resources with identical names remain two results; neither similarity nor accent tolerance merges their identities. (FR-010, FR-019)
6. **A10** — **Given** a customization or alias changed under F02, **when** search is viewed or refreshed after propagation under F13, **then** current names and still-applicable aliases are used, without arbitrary name history or aliases inferred from similarity. (FR-010, FR-026)

### User Story 3 — Choose my filters and retain my context (Priority: P1)

As a user, I want to explore a season or classification without losing my choices when changing tabs.

**Why this priority**: Seasonal teams must remain distinguishable and valid filter choices must be retained.

**Independent Test**: Combine the four filters, view old and future seasons, change tabs and reload the available choices.

**Acceptance Scenarios**:

1. **A11** — **Given** several viewable seasons, including an already published future one, **when** Teams or Pools opens without a retained selection, **then** the newest available season is preselected for that resource type, including a published future season. Old seasons and “All seasons” remain selectable; no fixed-year calendar limits them. (FR-012)
2. **A12** — **Given** viewable resources from several classifications and seasons, **when** season, division, format and gender are combined, with or without text, **then** each result satisfies all chosen filters. Unselected values do not restrict results; a combination without matches produces a true empty state without automatically removing a filter. (FR-011, FR-013, FR-023)
3. **A13** — **Given** shared text, teams filtered to women and pools to men, **when** the Teams → Pools → Clubs → Teams journey is followed, **then** text remains shared and each sporting tab recovers its own filters; Clubs ignores these filters without erasing them. Active filters are visible and resettable. (FR-014, FR-005)
4. **A14** — **Given** a result opened from a list browsed further down, **when** the person returns to search, **then** tab, text, filters and position are retained while the context remains valid. A restriction arising during viewing takes precedence over restoration. (FR-015, FR-020)
5. **A15** — **Given** a retained season or division no longer present in a successfully reloaded catalogue, **when** choices are reconciled, **then** the season returns to the newest available season, or All seasons when none is offered, and an unavailable division is cleared. The filter controls show the resulting values without a dedicated warning screen. A failed choices read preserves the earlier selection. (FR-016, FR-024)
6. **A16** — **Given** an old season still viewable or a club without a visible team, **when** an appropriate search is performed, **then** the completed season remains accessible and the club remains findable; a team without visible participation is absent in accordance with F02. (FR-012, FR-020)

### User Story 4 — Browse all results and open the correct detail sheet (Priority: P1)

As a user, I want to reach all matches and identify the correct resource before opening it.

**Why this priority**: A silent cap prevents existing resources from being found.

**Independent Test**: Browse more than twenty matches, distinguish identical names and open a target that has become unavailable.

**Acceptance Scenarios**:

1. **A17** — **Given** a search containing 47 viewable matches on unchanged data, **when** results are browsed to the end, **then** all 47 identities are accessible once, without a cap of twenty. Additional loading and the actual end are distinguished by loading/continuation availability, without a “Fin des résultats” message; the loaded count is never presented as the total. (FR-018, FR-019, FR-022)
2. **A18** — **Given** textual results with filters, **when** browsed, **then** search relevance favors direct matches without an absolute ordering guarantee against all fuzzy matches. With empty text, only filtered examples appear. (FR-002, FR-017)
3. **A19** — **Given** identical names and partially populated resources, **when** their results are presented, **then** public name and available context distinguish them: club city, team or pool season and classification, club or league where useful. Absence of a logo or secondary detail neither fabricates a value nor alone hides the resource. (FR-021)
4. **A20** — **Given** a selected identity that becomes hidden before opening, **when** the destination opens, **then** F03 removes the refused content without redirecting to another similar resource. Established hiding remains distinct from a network failure in the owner’s content-retention and navigation decisions; both use the shared opaque F13 error presentation when no usable content remains. (FR-020, FR-027)
5. **A21** — **Given** a source-hidden pool, inactive division or hidden team, then an authorized reappearance, **when** search is viewed or refreshed, **then** no text, alias, old season or retained result bypasses known hiding. Reappearance reuses the F02 identity and does not lift other restrictions. (FR-020, FR-026)
6. **A22** — **Given** a name or visibility change during the journey, **when** the list is refreshed, **then** applicable context is retained and results recomposed without duplicates or lasting omissions; exact position is not guaranteed if ordering has changed. No batch from old state is added to the new list. (FR-019, FR-025, FR-026)

### User Story 5 — Understand errors and retry search (Priority: P1)

As a user, I want to distinguish an empty search from a failure and retry through a clear error card that replaces failed list results.

**Why this priority**: An error turned into an empty list gives false information about the catalog.

**Independent Test**: Cause initial, partial and retry failures, receive late responses and verify shared rules.

**Acceptance Scenarios**:

1. **A23** — **Given** a complete successful search without matches and then a failed search without usable data, **when** their states are presented, **then** the former announces no results for the current criteria; the latter announces unavailability with retry. No loading waits indefinitely and no internal diagnostic is exposed. (FR-023, FR-024)
2. **A24** — **Given** retrieved results that remain authorized, **when** refresh or next loading fails, **then** the shared illustrated error card replaces the result rows and offers a safe read retry; uncertain freshness is not announced as current. Failure of the next load does not become an end of list. (FR-024, FR-022)
3. **A25** — **Given** an interrupted search or incomplete result, even without returned items, **when** its state is presented, **then** its partial or unavailable nature is explicit; neither an exhaustive total, an actual end nor certain absence of matches is asserted. (FR-022, FR-023)
4. **A26** — **Given** several successive texts, filters or tabs, **when** responses arrive out of order, **then** only the response corresponding to the current context controls the list; data from another search is not presented as its results. (FR-025)
5. **A27** — **Given** newly accepted sporting data or a public-name correction, **when** a new viewing or refresh occurs, **then** accepted changes become visible through the normal refresh/indexing flow, accepting indexing delay without a user-facing lag diagnostic or a global propagation deadline; no continuous screen refresh is imposed. F13 accessibility, error and authorization rules also apply to search. (FR-026, FR-030)
6. **A28** — **Given** a guest or person whose entitlements change, **when** filters are used then a detail sheet opened, **then** filtering, scrolling, refreshing and returning do not trigger an interstitial; sporting opening follows the shared F11 counter and does not remain blocked by an advertising failure. An account change reuses no private information from the old account. (FR-028)
7. **A29** — **Given** an error, active filter or result with an identical name, **when** the journey is used with applicable accessibility aids, **then** F13 requirements apply to labels, selections, states and retry actions without relying solely on color; the existing reporting entry retains its search context under F10/F11 without implicit new collection. (FR-029, FR-030)

### Edge Cases

- An automatic and explicit selection of the same season have identical behavior; only nonempty text switches to exhaustive search.
- Empty text retains examples under every chosen filter; no empty combination justifies silent broadening.
- Offer only available seasons. If no season is available, use All seasons; never invent a year. Failed retrieval preserves previously known choices rather than treating them as an empty catalogue.
- A known restriction takes precedence over example stability, position restoration and retention after error.
- Tolerant search may find several identities; it does not reconcile sporting data or make identical names disappear.

## Requirements

### Functional Requirements

#### Access and discovery

- **FR-001**: Search MUST offer Teams, Pools and Clubs to visitors and signed-in people, without requiring an account or Pro. No other searchable resource type or editing right is introduced.
- **FR-002**: Empty or whitespace-only text MUST show a limited selection explicitly identified as examples, including after filter changes. Examples respect the active filters, with the newest available season preselected for teams/pools under FR-012. No completeness or exhaustive-total promise applies to examples.
- **FR-003**: Examples MUST be non-personalized, without added geolocation, and retain their selection and order during a visit, including after returning from a detail sheet or tab. They MAY vary between visits or when filters change; new examples must respect the new context. A known restriction requires their removal; refreshing does not arbitrarily reshuffle them.
- **FR-004**: Nonempty text MUST open exhaustive paginated results matching the active filters. Filter changes alone with empty text keep examples. Selecting the same season explicitly has the same meaning as its preselection; no implicit/explicit filter-state distinction is retained.
- **FR-005**: Text and active filters MUST be visible and resettable. The text field MUST enforce one limit of 200 Unicode characters, with no separate analyzed-token limit. The search bar MUST NOT display a character counter or limit hint. Clearing text returns to examples under the retained filters; resetting filters restores the default season. Each sporting tab retains its own filters without a separate explicit-selection flag.

#### Matching and identities

- **FR-006**: Search MUST cover club name and city; team full and short names, club, club city, division, format and gender; pool full and short names, division, league, format and gender. Known division abbreviations (such as N2, N3, prenat, prereg, reg and dep) MUST apply only to the relevant divisions; they are neither identity aliases nor global replacements. Absent fields are not invented. The city used to search for and distinguish a club or its teams MUST be the effective authorized value under F02 FR-049, after correction, intentional absence or return to the source. A replaced, intentionally absent or restricted source city MUST NOT serve as fallback; name and alias rules remain distinct. Professional teams without a club MUST remain searchable by available F02 fields. Club and club-city terms remain absent, without guessed values. A verified technical club association supplies those fields under ordinary projection freshness without replacing team identity.
- **FR-007**: Case, accents and excess whitespace MUST NOT prevent a textual match. Word prefixes MUST be searchable. Whitespace-only text is equivalent to absent text.
- **FR-008**: Input with multiple terms MUST account for all terms, which may match several fields of the same resource. A match on only one term does not suffice to ignore the others.
- **FR-009**: Search MUST tolerate small typos in recognizable names without inserting unrelated matches or relaxing filters. Search relevance favors direct matches without requiring every direct match to precede every approximate one. This tolerance creates neither aliases nor identities. Prefix matching and whole-word typo tolerance are supported without guaranteeing every combination of misspelled fragments and abbreviations. For example, “eag ly” can find Eagles/Lyon and “Volly Lyon” can tolerate the name typo; “Volly ly” is not guaranteed. Exact filters remain mandatory in every case.
- **FR-010**: Public names, current source names and verified aliases applicable under F02 MUST allow the same resource to be found under its current public name. Aliases remain bounded by their F02 context. No arbitrary name history, assumed alias or similarity-based merging is added.

#### Filters, seasons and context

- **FR-011**: Teams and Pools MUST offer season, division, format and gender, combined with one another and with text. Each filter is optional except for the initial season; an unselected value does not restrict results. Clubs MUST NOT apply these filters.
- **FR-012**: Seasons MUST come from viewable data for the relevant resource type, without a fixed-year list. Without a retained selection, select the newest available season by F02 sporting start year, including a published future season. If none is offered, select All seasons. Preserve a valid choice during the visit even when a newer season appears; a new visit or reset recalculates the default. Past seasons and All seasons remain accessible. No date-based current-season calculation, unavailable option or dedicated warning is required.
- **FR-013**: Division choices MUST respect F02 active divisions; formats and genders reuse F02 sporting classification without new vocabulary. A combination without matches MUST NOT automatically remove a filter or change its value.
- **FR-014**: Text MUST be shared across all three tabs; team and pool filters MUST be remembered separately during a visit. Passing through Clubs does not erase them. Changing text invalidates previous results in other tabs without erasing their filters.
- **FR-015**: Returning from a detail sheet MUST restore tab, text, filters, examples or results and position where they remain valid. Data changes may require recomposition; they do not guarantee the exact position in a changed order.
- **FR-016**: Only available seasons and active divisions MUST be selectable. On a successful catalogue reload, a retained season no longer available returns to the FR-012 default, and an unavailable division is cleared. The normal filter controls show the resulting values; no unavailable-choice screen or warning is required. Failure to retrieve choices MUST preserve previously known choices rather than prove their disappearance.

#### Ordering, completeness and presentation

- **FR-017**: Textual results MUST use search relevance favoring direct matches with stable tie-breaking on unchanged data. No absolute direct-before-approximate ordering is imposed. Empty text yields filtered examples, not an exhaustive alphabetical query.
- **FR-018**: For nonempty-text searches, all viewable matches MUST be progressively accessible through automatic infinite-list pagination under F13, without a functional cap of twenty or another silent total cap. Empty-text examples remain a limited selection respecting the filters; their count and the page size do not define a maximum number of search results.
- **FR-019**: A resource MUST appear once per search, even if several fields or aliases match. Distinct identities remain distinct. On unchanged data, complete browsing MUST NOT duplicate or omit results; after changes, refresh MUST allow consistent browsing without lasting omission.
- **FR-020**: Examples, filters and results MUST respect F02 viewability, including source hiding, inactive divisions, withdrawals and reappearances. A club without a visible team remains viewable, unlike a team without visible participation. A known restriction takes precedence over retained data; reappearance lifts no other reason and reuses the same identity.
- **FR-021**: Each result MUST present its public name and useful available distinguishing context: club city; team and pool season, division, format and gender, club or league where useful. Unknown logos and details remain absent or explicitly unavailable, without invented values or resource exclusion for that reason alone.
- **FR-022**: Initial loading, additional loading, failure and the actual end MUST remain understandable. No exact total is required; a loaded count MUST NOT be presented as a total. Internal candidate batches MUST NOT require repeated user continuation through empty pages. Return available results or an established end; if bounded processing cannot establish either, use the ordinary retryable error. The mobile error card replaces visible results; retry may lose scroll progression without a separate recovery mechanism. An interrupted or failed batch MUST NOT produce a false end of list. Established exhaustion removes continuation without an end-of-results message.

#### Recovery, navigation and shared rules

- **FR-023**: No results MUST denote a successful search with no eligible matches in the evaluated index for the current criteria. Ordinary indexing delay is accepted; no global completeness/freshness certification is implied. A failed or incomplete evaluation MUST NOT be presented as a successful empty search.
- **FR-024**: An initial error MUST offer ordinary retry without indefinite waiting. Failed refresh or an additional failed batch MUST display the shared F13 error card instead of rows and allow a safe read retry without losing criteria; scroll progression need not survive retry. An indexing delay alone MUST NOT create a warning or require refresh. No internal diagnostic is exposed.
- **FR-025**: Deferred responses MUST be tied to the relevant text, tab and filters. An obsolete response MUST NOT replace current context, mix two searches or add an old batch to a refreshed list.
- **FR-026**: Accepted sporting changes MUST become searchable through normal indexing. A small propagation delay is accepted without an index-lag status, warning or mandatory refresh. New reads MUST apply current F02 visibility and prevent obsolete restricted matching values from granting a result. Ordinary refresh starts a new search. No F04-specific propagation deadline or continuous screen refresh is added.
- **FR-027**: A result MUST open the F03 detail sheet for its identity. A target that has become unavailable MUST remove refused content without similarity-based redirection. The owner MUST distinguish established unavailability from a network failure when retaining content and resolving navigation, while using the shared opaque F13 error presentation when no usable content remains. No separate public permission message or error variant is required. Returning to search preserves applicable context.
- **FR-028**: F05/F09/F11 MUST govern accounts, entitlements and advertising: public search independent of Pro, isolation of any private information on account change, no interstitial triggered by filtering, scrolling, refreshing or returning. Opening a sporting detail sheet follows the shared F11 counter and does not remain blocked by an advertising failure.
- **FR-029**: The existing reporting entry MUST retain its search context and F10/F11 limits. F04 MUST NOT add personalization, geolocation, publication of input, analytics tracking or implicit collection; privacy and minimization remain governed by F11.
- **FR-030**: F13 accessibility, understandable errors, current authorised data and safe diagnostics MUST apply to search. Tabs, filters, distinguishing information, loading and retry states MUST be understandable with platform accessibility tools, without relying on colour alone. No performance or capacity qualification is added.

### Key Entities

- **Searchable resource**: An existing Club, Team or Pool under F02, with a stable identity, applicable names, context and viewability.
- **Search context**: Tab, shared text, tab-specific filters and empty versus nonempty text; it determines discovery or search.
- **Examples**: A limited selection of viewable resources, non-personalized and stable during a visit; it does not represent a total.
- **Results**: Ordered matches for a context, with ordinary loading, progress and failure states; their loaded quantity is not their total.
- **Visit**: The search journey retained across tab changes and navigation to and from detail sheets. Persistence between launches is not required.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All three tabs are usable in every A01 access state; no account or purchase is needed to search. (FR-001, FR-028)
- **SC-002**: A02–A04 distinguish empty-text filtered examples from nonempty-text exhaustive paginated search. Same-valued implicit and explicit filters behave identically. (FR-002–FR-005, FR-012)
- **SC-003**: A05–A10 preserve identities, strict filters and typo tolerance; search relevance favors direct matches without an absolute positional guarantee. (FR-006–FR-011, FR-017)
- **SC-004**: Cases A11–A16 retain valid tab-specific choices, offer available seasons, apply the documented default when a choice disappears and preserve choices on read failure. (FR-011–FR-016, FR-020)
- **SC-005**: On A17’s stable set of 47 matches, all 47 identities are accessible exactly once; A18–A22 cover ordering, identical names, restrictions and refresh without a false total. (FR-017–FR-022, FR-025–FR-027)
- **SC-006**: In every A23–A26 case, failure, partial lists and actual absence remain distinct; no old result replaces the current search and retries preserve still-valid context. (FR-022–FR-025)
- **SC-007**: Qualification of A27–A29 journeys satisfies shared F13 objectives, F11 advertising rules and F05/F09 isolation, without a new F04 threshold or collection. (FR-026, FR-028–FR-030)

## Assumptions

- Available data is data publishable under F02; F04 neither retrieves nor recreates a missing identity or season. V1 recovery belongs to F14.
- The four sporting filters each allow one choice; absence means all authorized values. Without a retained selection, the newest available season is preselected for the resource type, following FR-012.
- Selections remain unchanged during the visit while valid, even when a newer season appears; a reset returns to the newest available season, or All seasons when none is offered.
- Refresh preserves discovery or search mode and valid choices. Catalog changes may alter result order or count: no permanently frozen snapshot is promised.
- Search tolerance does not change F02 identity rules, where accents and digits may be significant. Technical relevance tuning will need to satisfy the scenarios, without selecting an engine, score or comparison distance in this specification.
- Batch size, visual example count and tie-breaking details do not constitute new business choices; the approved design defines their accessible presentation, and the technical plan selects the implementation. No mandatory total, new searchable resource or search history is added.
- The accepted functional and design baselines are routed by [design inputs](../../AGENTS.md#design-inputs). The [technical plan](plan.md) preserves that design scope; runtime qualification remains future work.

## Evidence and traceability

### V1 sources

The following observations describe the V1 repository, not V2 qualification or production measurements.

| Source                                                                                                                                                                                                                                                                                                                                                                      | Observation and handling in F04                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [historical source baseline](../014-v1-v2-transition/spec.md#v1-evidence)                                                                                                                                                                                                                                                                                                   | Three searchable types and four filters retained; errors, completeness and seasons explicitly defined.                                                                                                                                                      |
| [Search reader](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/search-service/src/main/java/com/blockout/search/search/infrastructure/elasticsearch/ElasticsearchSearchReader.java)                                                                                                                          | Five suggestions on empty text, twenty textual results, no pagination and exceptions reduced to an empty list. F04 requires distinct examples, all results accessible and explicit errors. Internal time or examination limits do not become product rules. |
| [V1 index definitions](https://github.com/blockoutproject/blockout-legacy/tree/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/search-worker/src/main/resources/elasticsearch)                                                                                                                                                                                        | Observable name/context fields, case and accents; their weights and structures prescribe neither a V2 engine nor technical ranking. Tolerated typos and aliases are F04 requirements, not evidence of V1 support.                                           |
| [Search screen](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/search/ui/search-screen.tsx), [filters](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/search/hooks/use-competition-search-filters.ts) | Shared text, filters local to remounted tabs and hard-coded seasons. F04 retains shared text, remembers filters separately during the visit and uses available seasons. The V1 input delay remains a technical detail.                                      |
| [Results](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/search/ui/search-results.tsx), [presentation](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/search/view-models/search-card-presentation.ts) | Examples determined by empty text, cards, mobile states and a finite list. F04 distinguishes examples from textual results, partial retry, context for identical names and the absence of a mandatory total.                                                |
| [Team search](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/search/ui/search-team-screen.tsx), [pools](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/search/ui/search-pool-screen.tsx)              | Sporting navigation and filters functionally retained; advertising mechanisms follow F11.                                                                                                                                                                   |
| [identity continuity requirements](../005-accounts-identity/spec.md#v1-evidence-and-limitations), [Pro continuity evidence](../006-pro-subscriptions/spec.md#v1-evidence-and-limitations) and [transition requirements](../014-v1-v2-transition/spec.md)                                                                                                                    | No new Pro benefit, account reconciliation or identity transfer is implied by search.                                                                                                                                                                       |

The numbers five and twenty, the three fixed years, random ordering on every request and hidden exceptions are not carried forward as obligations. Retained functional changes are expressed directly in FR-002–FR-026; engine details, internal delays, input debouncing and weights remain V1 evidence without imposing their retention. Existing fields, tabs, filters, navigation and reporting are retained within the intended scope.

### Inventory and decision coverage

| Coverage                                                    | F04 requirements             | Scenarios        |
| ----------------------------------------------------------- | ---------------------------- | ---------------- |
| access, examples and transition to search                   | FR-001–FR-005, FR-028        | A01–A04, A28     |
| fields, tolerance, names and identities                     | FR-006–FR-010, FR-019        | A05–A10          |
| filters, seasons and context                                | FR-011–FR-016                | A11–A16          |
| ordering, completeness, counting, errors and retry          | FR-017–FR-019, FR-022–FR-025 | A17–A18, A22–A26 |
| F02 / F03: visibility, history, presentation and navigation | FR-020–FR-021, FR-027        | A16, A19–A22     |
| F05 / F09 / F10 / F11 / F13: shared rules                   | FR-026, FR-028–FR-030        | A27–A29          |

<a id="cross-perimeter-dependencies"></a>

### Cross-feature dependencies

| Owning scope                                                                                               | Agreement with F04                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F01](../001-source-acquisition/spec.md) / [F02](../002-sporting-data/spec.md)                             | Acquisition and sporting truth, names, verified aliases, seasons, classification, identity and visibility. F04 consumes them without equating history with inactivity.                                                                                          |
| [F03](../007-sporting-consultation/spec.md)                                                                | Detail-sheet destinations and unavailability; F04 does not search matches or redefine their calendars or schedules.                                                                                                                                             |
| [F05](../005-accounts-identity/spec.md) / F06                                                              | Guest access, sessions and isolation; F06 owns follows, without discovery personalization added here.                                                                                                                                                           |
| [F09](../006-pro-subscriptions/spec.md) / [F11](../004-advertising-privacy-legal/spec.md)                  | Entitlements, advertising counter, privacy and minimization; no paid search or new collection.                                                                                                                                                                  |
| [F10](../012-reports-feature-suggestions/spec.md) / [F12](../013-administration-app-configuration/spec.md) | Contextual reporting and administration permissions, without a new editor or implicit authorization.                                                                                                                                                            |
| [F13](../003-shared-quality/spec.md)                                                                       | Freshness, accessibility, authorization and diagnostics, without performance, capacity or monthly availability targets.                                                                                                                                         |
| [F14](../014-v1-v2-transition/spec.md) / consistency / design                                              | Data recovery, global consistency and visual design. Design coverage includes examples/search, active filters and available choices, identical names, successive loads, partial lists and accessible retry. No Figma screen is declared validated by this spec. |
