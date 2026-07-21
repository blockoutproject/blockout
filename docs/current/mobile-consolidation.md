# Mobile Consolidation Register

## Purpose

This register keeps REF-036 consolidation explicit and reviewable. It records repeated mobile patterns, their intended
owner, and the reason they are shared or remain feature-owned. It is updated after every coherent feature slice and
becomes the final recap of the mobile refactor.

The reference structure is Maaatch's simple `app` / `modules` / `shared` ownership model. Blockout keeps its Expo and
React Native requirements and does not copy Maaatch web implementation code.

## Decision policy

A pattern becomes shared when at least two active consumers use the same semantic role and behavior. Small accidental
differences in spacing, radius, color, or typography converge on semantic tokens. Meaningful product behavior, copy,
data access, and commands remain in the owning feature and use explicit composition or a named variant.

Shared components must expose a small semantic interface. They must not hide whole feature workflows, accept unrelated
boolean flags, or preserve duplication through differently named wrappers. A feature-local implementation stays local
until a second proven consumer exists.

Keep it simple is non-negotiable: no speculative helper, factory, generic type system, configuration-driven component,
or wrapper layer is introduced merely to reduce line count. An extraction is valid only when its concrete consumers are
easier to read and its public interface is simpler than the duplicated implementations it replaces.

## Live register

| Pattern                                 | Current evidence                                                             | Target owner                                        | Decision                                                                                                                          | Status      |
| --------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Theme and visual values                 | Separate application and navigation providers with overlapping color sources | `shared/providers/ThemeProvider` and `shared/theme` | One provider owns both contexts; one dark theme and concrete semantic tokens replace the unused light and duplicate color systems | Complete    |
| Primary and secondary actions           | Repeated button shells and close/submit actions                              | `shared/ui`                                         | Share action primitives; keep feature labels and commands local                                                                   | Planned     |
| Loading, empty, error, and API feedback | Repeated cards, alerts, toasts, and error extraction                         | `shared/ui` and `shared/api`                        | Share presentation and transport-neutral error handling; keep feature recovery decisions local                                    | Planned     |
| Form and bottom-sheet structure         | Repeated sheet headers, fields, validation layout, and footers               | `shared/ui`                                         | Shared cards, inputs, modal/page frames, and accessible footers own layout; schemas, values, and submit commands stay in modules  | Complete    |
| Team and pool presentation              | Near-identical headers, skeletons, profile layout, and form sheets           | `shared/ui` plus feature modules                    | Shared header and skeleton own only exact presentation; profiles, tabs, forms, models, APIs, and commands remain explicit          | Complete    |
| Followed entity lists                   | Near-identical pool and team lists                                           | Entity modules plus `modules/followed`              | Share entity cards and list skeletons; keep typed queries, copy, filtering, and navigation explicit                                | Complete    |
| Entity search                           | Near-identical team and pool filters with a simpler club variant             | `modules/search`                                    | One small results frame accepts composed filters; entity filters, requests, cards, and navigation remain explicit                 | Complete    |
| High-volume lists and images            | Match, ranking, feed, and notification lists repeat item patterns            | Feature modules plus `shared/ui` primitives         | Keep feature-specific list composition; use stable callbacks, domain keys, accessible actions, FlashList, and Expo Image where proven | Complete    |
| Application-state cards                 | Maintenance and required-update screens share layout but not actions         | `shared/ui` plus app-status module                  | Share the state frame; express maintenance and update as explicit feature compositions                                            | Planned     |
| Test selectors and component behavior   | Existing tests mix semantic queries with incidental or incorrectly named IDs | Owning feature tests and native host components     | Completed slices use semantic queries, observable commands, stable boundaries, and domain-item IDs                                | In progress |

## Completed slices

### Theme foundation

- `ThemeProvider` is the single mounted owner for both the Blockout theme and React Navigation theme.
- The unused light theme, duplicate color catalog, duplicate provider, and unused legacy theme types were removed.
- Existing layout dimensions now come from `shared/theme/tokens`; no configuration layer or token factory was added.
- `Skeleton` and `Spinner` consume the same application theme as every other shared component.
- Typecheck, 25 tests, lint with 55 inherited warnings, and the 3,151-module Web export pass.

### Notifications

- API, handwritten transport models, Query hooks, push integration, and UI now live under `modules/notifications`.
- The one-consumer swipe action moved out of `shared`; the unused debug push sender and legacy root copies were removed.
- Notification items use Expo Image recycling, memoized list boundaries, accessible open/delete actions, and stable
  feature-owned screen, list, state, action, and item IDs.
- The repository skill now routes mobile tests to a concise Jest/RNTL policy based on Expo and React Native Testing
  Library guidance; it explicitly forbids test-only production branches and speculative testing infrastructure.
- Query loading and optimistic rollback, visible relative time, opening, and accessible deletion have focused tests.
  Typecheck, all 30 tests, lint with 55 inherited warnings, and the 3,152-module Web export pass.

### Reporting and form foundations

- Reporting now owns its API, handwritten request/response model, form, sheet composition, and focused tests under
  `modules/report`; all current report entry points consume that boundary.
- The report form uses the existing shared field, card, sheet input, modal frame, and footer primitives. Its schema,
  device context, image handling, payload construction, and submit command remain feature-owned.
- Shared modal and page sheets use React 19 ref props and stable backdrop renderers. The shared form footer uses an
  accessible `Pressable`, exposes loading/disabled state, and accepts a concrete feature-owned action ID.
- No generic form hook, schema factory, test selector registry, or configuration-driven sheet abstraction was added.
- Focused tests cover the validated report request and the shared footer interaction/loading contract. Query-hook tests
  use non-expiring test caches, so all 33 tests now finish without an open timer. Typecheck and lint pass with 52
  inherited warnings; Web export evidence is recorded with the slice commit.

### Team and pool

- Team and Pool now own their handwritten gateway response/request models, API clients, Query hooks, forms, profiles,
  tabs, maps, and list presentation under `modules/team` and `modules/pool`. Active consumers use these owners; the
  duplicate legacy roots and stale `*DTO` names were removed.
- Only the identical entity header and loading skeleton became shared. Profiles, tabs, forms, follow behavior, map
  behavior, request construction, and product copy remain explicit feature compositions; no generic entity workflow or
  form abstraction was introduced.
- Shared headers expose accessible back, edit, and report actions with literal feature-owned IDs. Team and Pool forms
  expose labelled fields and submit validated, trimmed requests through their existing API provider boundary, without
  test-only branches or dependency-injection machinery.
- Focused Jest/RNTL tests protect header permissions and interactions plus Team and Pool request construction. All 37
  tests pass across 16 suites, typecheck passes, lint completes with 42 inherited warnings and no errors, and the
  3,150-module Web export passes.

### Club, search, and followed discovery

- Club now owns its handwritten response/update model, API, Query hook, form, header, hero, tabs, map, information,
  and team-list composition under `modules/club`. The one-line `ClubProfile` wrapper was removed, while the distinct
  club header and skeleton remain local instead of being forced into the Team/Pool frame.
- Search now owns the three gateway search response models exactly as the Java gateway exposes them, including the
  previously missing `shortName` fields and without nonexistent division color/id fields. Its former large generic
  screen was reduced to a small typed results frame; Team and Pool compose their concrete filters directly.
- Followed navigation and lists live under `modules/followed`. Team and Pool entity cards remain owned by their entity
  modules, and the proven list skeleton is shared. Season filtering and navigation stay explicit and typed; no generic
  followed-list factory or selector registry was introduced.
- Search inputs, clear/report/back actions, Club editing, state boundaries, collections, and repeated items expose
  accessible semantics and stable feature/domain IDs. Focused tests protect Club request construction, Search result
  and recovery behavior, and followed-Team season filtering/navigation.
- All 41 tests pass across 19 suites, typecheck passes, lint completes with 35 inherited warnings and no errors, and
  the 3,148-module Web export passes.

### Match, ranking, and feed

- Match now owns its exact handwritten mobile-gateway responses, API client, Query hooks, screen, list, live-link
  forms, and moderation UI under `modules/match`. The misleading `Enriched*DTO` names and unused internal match/list
  response copies were removed; active response fields now mirror the current Java gateway boundary.
- Ranking owns its compact presentation under `modules/ranking`, while Feed owns its screen and animated header under
  `modules/feed`. Team, Pool, Club, and Feed compose the same concrete Match list without a generic list framework.
- The existing FlashList boundary, stable callbacks, and domain keys remain. Disabled ad components and commented ad
  insertion branches were removed rather than preserved as dormant abstractions. Ranking values and highlights now
  use the real Team and theme types instead of `any`.
- Match, ranking, live-link, moderation, Feed, pill, and masked-image actions expose user-facing accessibility names and
  stable feature/domain IDs. Focused tests protect match selection and ranking facts/navigation through observable
  native interactions; no test-only branch, dependency container, selector registry, or snapshot was introduced.
- All 44 tests pass across 22 suites, typecheck passes, lint completes with 18 inherited warnings and no errors, and
  the 3,148-module Web export passes.

### User, session, onboarding, and legal documents

- User now owns its exact handwritten gateway response/update models, API client, Query hooks, profile form, profile
  presentation, and profile screen under `modules/user`. Session owns Auth0 adapters, the guest store, contexts,
  provider orchestration, sign-in UI, guest prompts, and splash coordination; onboarding and legal-document flows own
  their model, state, UI, and tests in dedicated modules.
- UI consumers import the light session action/state contexts, while the application layout alone mounts the complete
  provider orchestration. A focused screen test can therefore exercise authentication and guest commands without
  loading Auth0 native implementation code or introducing dependency injection, a test-only prop, or a provider
  bypass.
- Shared `GradientButton` forwards a concrete feature-owned ID and exposes its label and busy/disabled state through
  accessibility. It no longer assigns the same global selector to every action or hides callback failures from the
  owning feature. Sign-in, onboarding, guest, profile, legal, and administration entry actions use semantic names and
  literal stable IDs only where a real test or future end-to-end boundary needs them.
- Form commands remain explicit props on feature components, native and HTTP work stays behind the existing adapters,
  and tests assert visible behavior and invoked session commands through React Native Testing Library. No selector
  factory, mock registry, test-only production branch, generic form framework, or service container was added.
- All 48 tests pass across 23 suites, typecheck passes, lint completes with 13 inherited warnings and no errors, and the
  3,148-module Web export passes.

## Final audit

REF-036 is complete only when this table reflects the implemented owners, all active consumers use the chosen shared
foundations, legacy root folders have no remaining legitimate owner, and intentionally local similarities are
documented rather than silently duplicated.
