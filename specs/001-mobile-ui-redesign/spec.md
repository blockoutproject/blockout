# Feature Specification: Blockout Mobile UI Redesign

**Feature Branch**: `tech/198-specify-mobile-ui-redesign`

**Created**: 2026-08-30

**Status**: Accepted — explicitly approved for merge on 2026-08-30

**Input**: User description: "Specify the complete Blockout mobile UI redesign and its owned design system without changing delivered business behavior."

## Current-State Evidence and Audit

### Authority Boundaries

- This specification, once explicitly accepted, is the authority for the future mobile visual language and observable design intent.
- The production mobile source and tests are evidence of delivered functional behavior, routes, roles, permissions, and states. They do not constrain the target visual language.
- The archived Blockout Product Design section `730:4469` is visual evidence of the delivered interface. It does not define the target design language.
- The current Blockout Product Design cover is an empty starting point for future approved design work.
- Future Figma designs, technical plans, tasks, and migration issues derive from this specification and must not add product behavior.

### Production Route Inventory

The audit found 18 route files. Shared route groups expose the same entity destinations from multiple tabs without duplicating the user capability.

| Route boundary          | Delivered surface or responsibility                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Root layout             | Startup gates, session state, maintenance, mandatory update, onboarding, tab application, and document modal |
| Native intent           | External and deep-link intent normalization                                                                  |
| Maintenance             | Service-unavailable gate with authorized bypass behavior                                                     |
| Update required         | Mandatory application-version gate with authorized bypass behavior                                           |
| Sign in                 | Authentication and guest entry                                                                               |
| Onboarding              | First-run introduction and notification permission path                                                      |
| PDF viewer              | Modal legal or document viewing                                                                              |
| Tab layout              | Home, search, followed activity, and profile navigation                                                      |
| Feed index              | Upcoming, completed, and followed match feed                                                                 |
| Search                  | Team, pool, and club discovery with query and filters                                                        |
| Followed activity       | Notifications and followed-content entry points                                                              |
| Profile                 | Guest and authenticated profile, account, legal, subscription, and administration entry points               |
| Shared tab-stack layout | Shared entity navigation from home, search, and followed activity                                            |
| Club detail             | Club information, teams, upcoming matches, and completed matches                                             |
| Match detail            | Score, sets, live link, match information, pool context, reporting, and moderation states                    |
| Pool detail             | Ranking, upcoming matches, completed matches, and map                                                        |
| Team list               | Teams belonging to a club                                                                                    |
| Team detail             | Team identity, upcoming matches, completed matches, and ranking context                                      |

### Delivered Journey Coverage

| Journey family                 | Required delivered behavior to preserve                                                                    | Relevant roles and gates                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Startup and access             | Splash, maintenance, mandatory update, sign-in, guest entry, onboarding, and tab entry                     | Guest, authenticated user, authorized bypass |
| Home feed                      | Upcoming, completed, and followed match feeds; refresh and continuation                                    | Guest redirect behavior, authenticated user  |
| Discovery                      | Search teams, pools, and clubs; query, filter, result, empty, and failure states                           | Guest and authenticated user                 |
| Followed activity              | Notifications, followed teams and pools, seasons, deep links, swipe deletion, refresh, and pagination      | Authenticated user                           |
| Club                           | Information, location, teams, upcoming matches, and completed matches                                      | Guest, authenticated user, Pro gate, editor  |
| Team                           | Identity, upcoming matches, completed matches, and ranking context                                         | Guest, authenticated user, editor            |
| Pool                           | Identity, ranking, upcoming matches, completed matches, and map                                            | Guest, authenticated user, Pro gate, editor  |
| Match                          | Score, status, sets, live link, information, ranking context, report, deletion, and history                | Guest, authenticated user, owner, moderator  |
| Profile and account            | Guest prompt, identity, edit profile, legal documents, privacy, version, report, and account actions       | Guest and authenticated user                 |
| Subscription and advertising   | Pro upsell, purchase state, advertising consent, tracking permission, and entitlement-dependent surfaces   | Guest, authenticated user, Pro subscriber    |
| Administration                 | Divisions, raw-division mapping, live-link moderation/history, maintenance, versions, and scraper controls | Scope-authorized moderator or administrator  |
| Documents and external content | Legal sheets, PDF viewing, and controlled web content                                                      | All eligible users                           |

### Delivered State Coverage

Every future design and migrated journey must account for the applicable states found in production:

- loading and skeleton;
- populated and completed content;
- first-use and empty content;
- search prompt and no results;
- recoverable error with retry;
- not found or no longer available;
- offline or transport failure;
- pull-to-refresh and paginated continuation;
- default, focused, selected, pressed, disabled, and submitting controls;
- destructive confirmation and completed destructive action;
- authentication, permission, entitlement, ownership, moderation, and administration gates;
- keyboard-visible, safe-area, modal, sheet, system-back, and deep-link states;
- reduced-motion and screen-reader use.

### Existing Visual-System Evidence

- The delivered theme boundary exposes one dark semantic theme even though the application declares automatic system appearance.
- Existing values cover color roles, gradients, pool treatments, spacing, radius, borders, icon sizes, minimum touch size, opacity, layout metrics, font weight, letter spacing, typography, and elevation.
- The shared UI already includes actions, icon actions, pills, search and filters, skeletons, gradients, hero imagery, tab navigation, feedback states and toast, bottom sheets, entity cards and headers, remote lists, form controls, follow controls, and reusable image treatment.
- Feature UI includes score and match presentation, rankings, team/pool/club cards, administration controls, legal surfaces, onboarding, guest prompts, subscription prompts, notifications, and moderation forms.
- The audit found 115 production files defining local style sheets. Direct sizes, spacing, inline styles, and a small number of raw colors remain outside the current semantic theme boundary, demonstrating inconsistent adoption rather than a target token contract.
- The archived design evidence contains documented foundations, icons, actions, statuses, inputs, navigation, feedback, data display, overlays, and 89 delivered screen or wrapper frames. Empty exploration and in-design pages are not evidence of accepted target work.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Follow Live and Completed Competition (Priority: P1)

As a volleyball follower, I can move from discovery or my feed to a match, understand its status and score immediately, and inspect relevant team, pool, ranking, and live information without losing the behavior I use today.

**Why this priority**: Scores, live state, and competition context are the core product value and the strongest expression of the broadcast direction.

**Independent Test**: Validate the feed-to-match and search-to-match journeys with representative upcoming, live, completed, unavailable, and error data in both themes and on both platforms.

**Acceptance Scenarios**:

1. **Given** a populated feed, **When** a user opens a match, **Then** status, teams, score, primary action, and competition context are identifiable without assistance.
2. **Given** an upcoming, live, or completed match, **When** its detail is displayed, **Then** the visual hierarchy changes appropriately while all delivered actions and information remain available.
3. **Given** a loading, empty, offline, or recoverable error state, **When** the user reaches the surface, **Then** the state is explicit and the next available action is clear.

---

### User Story 2 - Explore and Follow Competition Entities (Priority: P1)

As a guest or authenticated user, I can search for and browse clubs, teams, and pools, then navigate their information, match lists, rankings, maps, and follow actions according to my existing access rights.

**Why this priority**: Entity discovery and exploration connect the complete product and exercise navigation, lists, filters, cards, headers, tabs, maps, and entitlement gates.

**Independent Test**: Complete search-to-club, search-to-team, and search-to-pool journeys across populated, empty, filtered, restricted, and failure states without changing any route or capability.

**Acceptance Scenarios**:

1. **Given** search results for each entity type, **When** a user opens an entity, **Then** its identity, available sections, current selection, and primary actions are clear.
2. **Given** a guest or non-Pro user encounters a restricted capability, **When** the gate appears, **Then** the limitation and available next action match delivered behavior.
3. **Given** French labels at their longest audited or pseudolocalized length, **When** cards, tabs, filters, and headers render, **Then** essential content and actions remain available without clipping.

---

### User Story 3 - Manage Personal and Privileged Actions (Priority: P2)

As an authenticated user, editor, moderator, or administrator, I can use profile, legal, editing, reporting, moderation, and administration surfaces with unmistakable permissions, consequences, progress, success, and failure feedback.

**Why this priority**: These less frequent journeys contain the highest-risk forms, destructive actions, permission boundaries, sheets, and operational states.

**Independent Test**: Exercise one representative form, destructive action, permission denial, moderation flow, and administration control for each eligible role.

**Acceptance Scenarios**:

1. **Given** a form with valid, invalid, submitting, successful, and failed states, **When** the user interacts with it, **Then** focus, validation, progress, and recovery are understandable visually and through assistive technology.
2. **Given** a destructive action, **When** the user initiates it, **Then** consequences are stated before confirmation and completion or failure is explicitly acknowledged.
3. **Given** an ineligible role, **When** a privileged surface or action is requested, **Then** delivered authorization behavior is preserved and no unauthorized control is exposed.

---

### User Story 4 - Govern and Evolve the Owned Design System (Priority: P2)

As a product designer or mobile engineer, I can identify the authoritative token, component, pattern, and version for a design decision and can evolve it without creating conflicting visual sources or hidden breaking changes.

**Why this priority**: Clear ownership and lifecycle rules are necessary for a complete redesign to remain coherent through design and migration.

**Independent Test**: Trace a sample color role, action component, match pattern, deprecation, and released projection from approved design authority to product design and implementation evidence.

**Acceptance Scenarios**:

1. **Given** an approved reusable visual decision, **When** a designer or engineer traces it, **Then** one canonical library definition and one identified released projection are found.
2. **Given** a proposed token or component change, **When** its compatibility is assessed, **Then** version impact, consumers, deprecation path, and required evidence are explicit.
3. **Given** a third-party behavioral dependency proposal, **When** it is evaluated, **Then** the proposal passes every ownership, accessibility, parity, maintenance, performance, licensing, testing, and replacement criterion before acceptance.

---

### User Story 5 - Migrate Without Functional Regression (Priority: P3)

As a product owner, I can approve incremental redesigned journeys while the remaining application continues to work, with clear evidence and a safe reversal path for every migrated slice.

**Why this priority**: Migration follows approved designs and planning, but its product boundaries must be fixed before technical choices are made.

**Independent Test**: Evaluate a proposed pilot against the selection criteria and demonstrate that it can coexist with legacy presentation without duplicating business rules.

**Acceptance Scenarios**:

1. **Given** a candidate pilot journey, **When** it is evaluated, **Then** it has representative complexity, strong existing behavioral evidence, bounded risk, and reversible delivery.
2. **Given** a partially migrated application, **When** a user crosses between migrated and legacy journeys, **Then** routes, capabilities, data, and business outcomes remain consistent.
3. **Given** a failed rollout gate, **When** the slice is withheld or reversed, **Then** the previous presentation remains usable without data or behavior migration.

### Edge Cases

- A route is reachable through a deep link before session, maintenance, update, onboarding, or permission state has resolved.
- A screen changes from populated to empty, unavailable, or unauthorized while visible.
- A live score or status changes while the user is reading or using assistive technology.
- Very long team, club, pool, competition, person, legal, and administrative labels compete with scores or actions.
- Text is scaled to 200% on the narrowest supported width while the keyboard or a sheet is visible.
- Light or dark appearance changes while a modal, map, document, form, or destructive confirmation is active.
- A gesture-only action such as swipe deletion must remain available through an explicit accessible action.
- Reduced motion is enabled during an expressive score, navigation, loading, or feedback transition.
- A decorative gradient, image, gender treatment, ranking medal, or status color becomes indistinguishable or unavailable.
- A published library version and its repository projection disagree, are unavailable, or are only partially adopted.
- A component is deprecated while product patterns or legacy screens still consume it.
- A third-party behavioral dependency fails, is removed, or cannot meet one platform's accessibility behavior.

## Requirements _(mandatory)_

### Functional Requirements

#### Product Intent and Behavior Preservation

- **FR-001**: The redesign MUST preserve all 18 delivered route boundaries, navigation destinations, deep-link outcomes, business rules, contracts, user capabilities, and authorization outcomes.
- **FR-002**: The redesign MUST preserve the distinct behavior of guests, authenticated users, Pro subscribers, editors, moderators, administrators, and authorized bypass roles.
- **FR-003**: The target visual language MUST be expressive broadcast: energetic sports presentation, strong information hierarchy, immediate score and live-state recognition, controlled gradients and motion, and data-first readability.
- **FR-004**: Visual emphasis MUST reflect information priority and urgency without hiding secondary data, changing meaning, or making decorative treatment necessary for comprehension.
- **FR-005**: The redesign MUST define dark and light experiences with equivalent meaning, hierarchy, interaction availability, and accessibility.
- **FR-006**: The redesign MUST cover iOS and Android phones in portrait from 320 through 430 logical points, including safe areas, system bars, keyboard, modal, sheet, and system-back behavior. Tablet and landscape layouts are excluded.
- **FR-007**: French MUST remain the only shipped language in this scope. Layouts MUST tolerate the longest audited French content and pseudolocalized expansion of at least 30% without losing essential content or actions.

#### Journey and State Evidence

- **FR-008**: Future Product Design evidence MUST cover every audited journey family and identify the specification requirement and route boundary represented by each approved frame or prototype.
- **FR-009**: Each representative journey MUST include every applicable loading, populated, completed, empty, search, no-result, offline, recoverable error, not-found, refresh, pagination, disabled, submitting, success, permission, entitlement, destructive, and reduced-motion state.
- **FR-010**: Representative evidence MUST cover both themes, both platforms, compact, standard, and large supported widths, default text and 200% text, and the longest relevant French or pseudolocalized content.
- **FR-011**: Navigation evidence MUST make current destination, back behavior, modal or sheet context, deep-link recovery, and guest redirection understandable without changing delivered routing.
- **FR-012**: Feedback MUST state what happened, whether the user can continue, and the next available action. Error presentation MUST not expose internal diagnostics or sensitive data.
- **FR-013**: Destructive, privileged, paid, and permission-gated actions MUST communicate eligibility, consequence, progress, completion, and recovery before or when the state changes.

#### Accessibility and Platform Quality

- **FR-014**: Approved designs MUST satisfy WCAG 2.2 Level AA and the applicable native accessibility conventions for iOS and Android.
- **FR-015**: Normal text MUST meet a contrast ratio of at least 4.5:1; large text and meaningful non-text boundaries MUST meet at least 3:1.
- **FR-016**: Every interactive target MUST provide at least 44 by 44 points on iOS and 48 by 48 density-independent units on Android, including controls with smaller visible artwork.
- **FR-017**: All informative and interactive elements MUST expose a meaningful accessible name, role, value, state, order, and action; decorative content MUST be excluded from assistive navigation.
- **FR-018**: Every gesture-dependent action MUST have an explicit alternative, and focus MUST move predictably across route changes, sheets, forms, errors, and confirmations.
- **FR-019**: Content and controls MUST remain operable at 200% text scaling without clipping essential information, overlapping actions, or forcing two-dimensional scrolling for primary tasks.
- **FR-020**: Color, gradient, animation, haptic, sound, or image alone MUST NOT carry required meaning.
- **FR-021**: Expressive motion MUST communicate hierarchy, continuity, status, or feedback; it MUST avoid flashing and provide an equivalent reduced-motion presentation when the platform preference is enabled.

#### Token Contract

- **FR-022**: The owned system MUST separate reference primitives, theme-aware semantic roles, and narrowly scoped component aliases. Product designs and implementation projections MUST consume semantic roles rather than raw visual values.
- **FR-023**: The token taxonomy MUST cover color, typography, spacing, sizing, shape, border, elevation, opacity, motion, and supported-width behavior.
- **FR-024**: Token names MUST follow the deterministic semantic form `<category>.<role>[.<variant>][.<state>]`, describe purpose rather than a visual value, and retain the same meaning across themes and platforms.
- **FR-025**: Every semantic color role MUST define approved dark and light values, contrast evidence for its permitted uses, and an explicit pairing contract for foregrounds and backgrounds.
- **FR-026**: Typography roles MUST define purpose, hierarchy, weight, scalable size, line height, letter spacing, truncation or wrapping behavior, and permitted emphasis without encoding product data into the role.
- **FR-027**: Motion roles MUST define purpose, duration category, easing category, interruption behavior, and reduced-motion equivalent without requiring a particular implementation mechanism.
- **FR-028**: Missing tokens, missing theme values, stale projections, and unresolved synchronization differences MUST fail validation; silent fallback to raw or unrelated values is prohibited.

#### Component and Pattern Contract

- **FR-029**: Blockout UI Library MUST initially own foundations and icons; actions and status; inputs and selection; navigation; feedback; data-display structures; overlays; and form structures derived from the audited application.
- **FR-030**: Blockout Product Design MUST own approved patterns for access and gates, onboarding, feed and following, search and filters, entity detail, match and live content, rankings, account and legal, subscription, and administration.
- **FR-031**: Reusable components MUST expose semantic variants and states as orthogonal choices, support composition through documented content areas, and avoid embedding business rules, network state, role checks, or product-specific data ownership.
- **FR-032**: Every component contract MUST document content requirements, variants, interactive states, theme behavior, platform adaptations, accessibility behavior, text expansion, minimum and maximum useful dimensions, and permitted composition.
- **FR-033**: Escape hatches MUST be explicit, narrowly bounded, documented, and unable to bypass semantic tokens or required accessibility behavior.
- **FR-034**: Product patterns MUST compose published component instances and MUST NOT detach, redraw, or privately redefine a reusable foundation or component.
- **FR-035**: A third-party dependency MAY provide only bounded complex behavior and MUST remain behind a Blockout-owned component or adapter after passing maintenance, accessibility, platform parity, performance, license, testing, replacement, and rollback review.

#### Ownership, Synchronization, and Lifecycle

- **FR-036**: Blockout UI Library in Figma MUST be the canonical authority for approved visual variables, styles, foundations, icons, and reusable component contracts.
- **FR-037**: Blockout Product Design MUST consume published library instances and MUST be the authority for approved product patterns and representative screen states.
- **FR-038**: The repository MUST receive an identifiable, versioned projection of an approved library release. Manual visual edits to that projection MUST NOT create a second source of truth.
- **FR-039**: Every approved release MUST identify its library version, compatible Product Design evidence, repository projection version when one exists, change classification, and validation status.
- **FR-040**: Additive compatible capabilities MUST increment the minor version, compatible corrections MUST increment the patch version, and removals or incompatible semantic or contract changes MUST increment the major version.
- **FR-041**: A deprecated token, component, variant, or pattern MUST identify its replacement and migration guidance, remain available for at least one migration cycle, and MUST NOT be removed until verified to have zero consumers.
- **FR-042**: Synchronization validation MUST reject unknown references, unpublished component versions, detached reusable instances, missing theme values, incompatible versions, and visual values that cannot be traced to an approved library release.

#### Migration Framing

- **FR-043**: Migration MUST proceed through coherent vertical journeys whose presentation can coexist with legacy journeys at a navigation or screen boundary without duplicating business logic.
- **FR-044**: A migrated screen or vertical slice MUST use one coherent foundation and component generation; legacy and replacement primitives MUST NOT be mixed within the migrated boundary.
- **FR-045**: Pilot selection MUST require representative navigation, list or data-display, form or interaction, feedback and failure states, reliable current behavioral tests, bounded authorization and data risk, measurable accessibility evidence, and a reversible presentation boundary.
- **FR-046**: Every migration slice MUST pass approved-design traceability, functional parity, accessibility, theme and width coverage, platform behavior, visual review, performance comparison, and rollback-readiness gates before release.
- **FR-047**: Legacy visual assets and components MUST remain available while they have active consumers and MAY be removed only after every consumer has migrated and the replacement journey has passed its release evidence.
- **FR-048**: No Figma library, target screen design, technical plan, task set, implementation roadmap, production UI change, dependency change, route change, contract change, or business behavior change is authorized by this specification issue.

### Initial Component Taxonomy

| Family                | Required owned coverage derived from the audit                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundations and icons | Theme variables, typography roles, layout metrics, surfaces, borders, elevation, media treatment, iconography, and accessible status symbols                            |
| Actions and status    | Primary, secondary, quiet, icon, follow, destructive, loading, disabled, pill, badge, live, completion, entitlement, and role status                                    |
| Inputs and selection  | Text field, search, filter, select, image choice, validation, helper and error content, season and division selection                                                   |
| Navigation            | Bottom navigation, navigation item, screen and entity headers, tabs, back/close actions, modal headers, and deep-link context                                           |
| Feedback              | Loading, skeleton, empty, search prompt, no results, offline, recoverable error, not found, toast, inline validation, confirmation, and progress                        |
| Data display          | Entity card and row, hero, match row, score, set details, ranking row and card, metadata, information row, administration control, scraper status, and document content |
| Overlays and forms    | Sheet, modal, form sheet, selection sheet, guest prompt, upsell, report, destructive confirmation, and keyboard-aware form footer                                       |

### Initial Product-Pattern Taxonomy

| Pattern family               | Representative coverage                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| Access and application gates | Splash, maintenance, mandatory update, sign-in, guest entry, onboarding, and permission prompts           |
| Feed and following           | Upcoming, completed, followed, notification, season, refresh, deletion, and pagination states             |
| Search and discovery         | Search prompt, query, filters, results, no results, and club, team, or pool selection                     |
| Entity detail                | Club, team, pool, team list, identity hero, tabs, information, map, match lists, and gated sections       |
| Match and ranking            | Upcoming, live, completed, score, sets, live links, pool context, ranking, report, delete, and moderation |
| Profile and account          | Guest, authenticated identity, profile edit, privacy, legal, version, report, and account actions         |
| Subscription and consent     | Pro gate, purchase state, advertising consent, tracking permission, and entitlement feedback              |
| Administration               | Division management, raw mapping, moderation history, maintenance, version, and scraper control           |

### Key Entities

- **Design Token**: A named semantic design decision with a category, role, optional variant and state, theme values, permitted uses, accessibility evidence, lifecycle status, and version history.
- **Theme**: A complete dark or light mapping of semantic roles that preserves meaning and interaction hierarchy.
- **Component Contract**: A reusable visual and interaction primitive with documented content areas, variants, states, accessibility behavior, platform adaptation, and lifecycle.
- **Product Pattern**: An approved reusable composition of published components that solves a product journey need without owning business logic.
- **Representative Screen State**: Traceable evidence of one route, role, theme, platform, width, content condition, and interaction or failure state.
- **Design-System Release**: A compatible set of approved library definitions, Product Design evidence, version metadata, validation results, and any released repository projection.
- **Migration Slice**: A coherent vertical journey with defined boundaries, parity evidence, release gates, consumers, and rollback expectations.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The specification maps 100% of the 18 audited route files to a delivered surface and at least one journey family.
- **SC-002**: Every audited journey family, role, permission gate, and delivered state category is represented by at least one testable requirement or acceptance scenario.
- **SC-003**: Future approved design evidence covers 100% of applicable combinations in its declared journey matrix across dark and light themes, iOS and Android, compact, standard, and large supported widths, default and 200% text, and required content or failure states.
- **SC-004**: All approved foreground/background combinations meet the specified contrast threshold, and all interactive targets meet the applicable platform minimum.
- **SC-005**: In moderated validation with at least five representative volleyball followers, at least 90% identify match status, score, leading primary action, and current navigation context without assistance on first viewing.
- **SC-006**: In moderated validation with at least five representative users, at least 90% complete each selected core discovery, match, following, and account task without a design-caused dead end.
- **SC-007**: A release traceability review can resolve 100% of sampled semantic tokens, reusable components, and product patterns to one approved library definition and compatible evidence, with zero conflicting manually maintained visual values.
- **SC-008**: Every deprecated design-system item has a named replacement, migration guidance, known consumer count, and at least one retained migration cycle; no removal is approved with active consumers.
- **SC-009**: Every future migration slice demonstrates functional parity for all affected roles and states, passes all declared release gates, and has a tested reversal path before user release.
- **SC-010**: Acceptance review finds zero unresolved material questions, zero unauthorized behavior changes, and zero target design, planning, task, roadmap, dependency, or production-code artifacts in this issue.

## Assumptions

- Delivered product behavior, routes, permissions, subscriptions, integrations, data contracts, and French content remain unchanged unless another accepted specification authorizes a change.
- The supported product surface is iOS and Android phone portrait from 320 through 430 logical points; tablet, landscape, desktop, and web experiences are outside this feature.
- French is the only shipped locale. Pseudolocalized expansion is validation evidence for resilient layout, not authorization to ship another locale or right-to-left behavior.
- WCAG 2.2 Level AA is the shared accessibility baseline, supplemented by current iOS and Android conventions for touch, assistive technology, focus, text scaling, and reduced motion.
- Archived Figma evidence may be incomplete or visually stale. Production code and tests resolve delivered functional uncertainty; this specification resolves future visual intent.
- Product data volume, service availability, authentication, privacy, telemetry, and operational behavior are unchanged because this feature owns presentation intent only.
- Explicit human approval is required to change this specification from Draft to Accepted. Approved Figma evidence follows acceptance and precedes technical planning.
- Cross-artifact analysis is intentionally deferred until future `plan.md` and `tasks.md` files exist, because there are no cross-artifacts to analyze in this issue.

## References

- Blockout Constitution: `.specify/memory/constitution.md`
- Production mobile application: `apps/frontend/mobile`
- Current Product Design cover: https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=2-5
- Archived delivered mobile application evidence: https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb/Blockout-Product-Design?node-id=730-4469
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Apple accessibility guidance: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Android accessibility guidance: https://developer.android.com/guide/topics/ui/accessibility/apps
- GitHub issue: https://github.com/blockoutproject/blockout/issues/198
