# REF-061 Mobile Visual Baseline

## Purpose

This record is the authority for the Blockout mobile design-system work that starts with REF-062. It captures the
current product without changing its behavior or appearance. Android and iOS remain the product surfaces. React Native
Web is inspected only at phone dimensions and is not a desktop product.

The record combines sanitized runtime observation with a complete source inventory. Temporary screenshots stayed
outside Git. No credential, access token, personal profile, generated source, or Figma object is part of this task.
The July 2026 authenticated revalidation corrected two narrow Web adapter defects that otherwise hid authorized tools
or crashed a search field; neither correction changes native behavior, product scope, or visual design.

## Discovery result

The application has a recognizable dark visual identity and several useful shared foundations, but it does not yet have
a coherent design system. Its single dark theme contains 23 semantic colors and its token file contains 13 numeric
layout/type constants plus one gradient, while handwritten components still use many direct spacing, type, radius,
shadow, and color values. The future work should consolidate those proven values; it must not introduce a light theme,
desktop layout, generic screen framework, or speculative component catalog.

The current architecture is a sound basis for that work:

- Expo Router route files delegate to feature-owned screens;
- feature modules own product composition and commands;
- `shared/ui` owns repeated visual mechanics with active consumers;
- generated Orval models and clients stay ignored under `src/shared/generated`;
- native-only providers remain explicit and Web keeps phone-sized fallback behavior.

## Runtime evidence

| Surface          | Evidence                                                                                                                                   | Observed baseline                                                                                                                                                                                                                                   | Limit                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Native Web | Chrome at an explicit `390 x 844` viewport, then an authenticated structural pass in the available Chrome window                           | Search loading, entity filters, typed query, clear action, empty and transport-error states; guest and authenticated profiles; legal entries; version; Auth0 handoff; authorized internal-tool actions; raw-division mapping search and empty state | The extension-controlled Chrome window did not honor the requested phone viewport during the authenticated pass. That pass proves structure and authorization only; the earlier phone-sized Web capture and native surfaces remain the visual-size authority. |
| Android          | Fresh Expo 55 debug client built and installed with the official `expo run:android` command on a Pixel 7 (`411 x 814 dp` application area) | Native advertising-consent modal, dimmed application entry, Android system bars and native text/layout behavior                                                                                                                                     | Consent was not granted or changed. Product screens behind the provider modal are covered by the Web observation, source matrix, and prior native certification.                                                                                              |
| iOS              | Fresh Expo 55 debug client built and installed with the official `expo run:ios` command on an iPhone 17 Pro simulator                      | Native advertising-consent entry, iOS safe area and system presentation                                                                                                                                                                             | Consent was not granted or changed. External-provider acceptance and physical-device behavior remain outside this discovery task.                                                                                                                             |

Before the fresh Android build, the previously installed client exposed a Worklets native/JavaScript mismatch
(`0.5.1` versus `0.7.4`). Rebuilding through Expo resolved that local binary drift; it is not part of the visual
baseline. The current Android bundle then loaded without that error. Web emitted compatibility warnings for legacy
shadow props, `pointerEvents`, native-driver fallback, the old gesture-handler Web implementation, and incomplete Web
notification support. These are inputs to REF-066 through REF-070, not corrections authorized by REF-061.

The authenticated administrator was used only through the official visible Auth0 flow. All local Java services and
their backing infrastructure were available during the revalidation. The profile exposed the four expected authorized
entries for division mapping, division management, live-link moderation, and technical administration. Opening and
closing the mapping search initially exposed two Web-only adapter defects:

- the permission hook imported the native Auth0 package instead of the platform adapter, so Web could not expose access
  token permissions;
- sheet searches used `BottomSheetTextInput` on Web, which still calls a removed React Native Web text-input API under
  Expo 55.

The permission hook now uses the existing platform adapter and the shared search field uses the regular React Native
`TextInput` on Web while preserving `BottomSheetTextInput` on iOS and Android. Focused tests cover permission decoding,
and the authenticated browser pass confirmed that the authorized controls render and the mapping search opens and
closes without an error overlay. No credential, token, account identifier, or private payload was recorded.

## Authoritative screen and state matrix

The matrix uses three evidence labels:

- **Observed**: rendered during REF-061;
- **Certified**: already covered by the clean native build/launch evidence in REF-037 and REF-059;
- **Source**: reachable composition and state verified from the current implementation when local data or provider
  state could not safely reproduce it.

Every row is in scope for reconstruction in REF-064. A row may produce several Figma frames when the listed states have
meaningfully different composition.

| Area             | Screen or composition          | Required states                                                                                                    | Evidence                | Figma ownership                                                          |
| ---------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------ |
| Bootstrap        | Splash and session bootstrap   | loading, completed redirect, server/config error                                                                   | Certified, Source       | Application composition                                                  |
| Bootstrap        | Advertising consent            | first presentation, expanded information, provider options                                                         | Observed Android/iOS    | Native provider reference only; do not recreate as a Blockout component  |
| Access           | Sign in                        | loading, ready, provider handoff, server error, continue as guest                                                  | Observed Web, Source    | Feature-owned screen using shared actions and feedback                   |
| Access           | Onboarding                     | each step, current/previous/next indicator, gesture transition, final continue                                     | Certified, Source       | Feature-owned screen; shared control primitives only                     |
| Application gate | Maintenance                    | message/image, retry, authorized bypass, busy/disabled actions                                                     | Source                  | Explicit application-state composition                                   |
| Application gate | Required update                | platform message, store action, missing URL/disabled, authorized bypass                                            | Source                  | Explicit application-state composition                                   |
| Main navigation  | Bottom tabs                    | guest tabs, authenticated tabs, active/inactive state, avatar fallback, safe areas                                 | Observed Web, Certified | Shared navigation family with platform behavior                          |
| Feed             | Upcoming matches               | initial loading, grouped list, empty, error/retry, refresh, pagination                                             | Source                  | Feature composition using list and feedback primitives                   |
| Feed             | Finished matches               | initial loading, grouped list, empty, error/retry, refresh, pagination                                             | Source                  | Same feature family as upcoming, explicit status variant                 |
| Feed             | Followed teams and pools       | entity switch, season selection, loading, list, empty, error/retry                                                 | Source                  | Feature composition; shared filter/select/card primitives                |
| Search           | Teams                          | initial prompt, typing/debounce, loading, results, empty, error/retry, clear                                       | Observed Web, Source    | Feature composition                                                      |
| Search           | Pools                          | initial prompt, filters, loading, results, empty, error/retry, clear                                               | Observed Web, Source    | Feature composition                                                      |
| Search           | Clubs                          | initial prompt, loading, results, empty, error/retry, clear                                                        | Observed Web, Source    | Feature composition                                                      |
| Notifications    | Notification list              | loading skeleton, list, empty, error/retry, pull refresh, pagination loader, swipe/delete                          | Source                  | Feature list; shared feedback primitives                                 |
| Profile          | Guest profile                  | guest upsell, legal entries, report action, version                                                                | Observed Web            | Feature composition                                                      |
| Profile          | Authenticated profile          | user loading, hero, edit permission, sign-out busy, delete confirmation/busy, report                               | Source                  | Feature composition; shared actions, hero, sheet and feedback primitives |
| Profile          | Legal document sheet           | imprint, terms, privacy; loading, content, error/retry, editable form when authorized                              | Source                  | Shared sheet frame with feature-owned legal content                      |
| Profile          | Profile edit sheet             | initial values, image selection/error, validation, disabled, submitting, API toast                                 | Source                  | Shared form mechanics, feature-owned form                                |
| Internal tools   | Division management            | loading, list, create/edit sheet, validation, image state, deactivate confirmation                                 | Source                  | Internal feature composition                                             |
| Internal tools   | Raw division mapping           | loading, list, empty, edit sheet, validation, submitting/error                                                     | Source                  | Internal feature composition                                             |
| Internal tools   | Live-link moderation           | loading, list, empty/error, refresh, moderation actions, history sheet and pagination                              | Source                  | Internal feature composition                                             |
| Internal tools   | Technical administration       | loading, maintenance controls, minimum-version controls, scraper states, confirmations, disabled/saving, API toast | Source                  | Internal feature composition; cards remain feature-owned                 |
| Club             | Club detail                    | loading skeleton, error/retry, not found, content, edit/report/guest actions                                       | Source                  | Entity screen composition                                                |
| Club             | Information                    | contact facts, external links, location available/unavailable                                                      | Source                  | Club-owned composition                                                   |
| Club             | Teams                          | loading, list, empty, error/retry, team navigation                                                                 | Source                  | Club-owned list composition using entity cards                           |
| Club             | Upcoming/finished              | Pro upsell or match list; loading, list, empty, error/retry                                                        | Source                  | Club-owned tabs using subscription and match compositions                |
| Team list        | Teams for club                 | loading skeleton, list, empty/error, search/filter, back/report                                                    | Source                  | Feature-owned list composition                                           |
| Team             | Team detail                    | loading skeleton, error/retry, not found, profile, follow/edit/report/guest actions                                | Source                  | Entity screen composition                                                |
| Team             | Upcoming/finished/ranking tabs | match list states and one ranking tab per pool                                                                     | Source                  | Feature-owned tabs using match/ranking compositions                      |
| Pool             | Pool detail                    | loading skeleton, error/retry, not found, profile, follow/edit/report/guest actions                                | Source                  | Entity screen composition                                                |
| Pool             | Ranking                        | header, rows, medals, highlighted team, missing statistics                                                         | Source                  | Ranking feature composition                                              |
| Pool             | Upcoming/finished              | loading, list, empty, error/retry                                                                                  | Source                  | Match-list composition                                                   |
| Pool             | Map                            | Pro upsell, native map, unavailable-on-Web placeholder                                                             | Source                  | Provider-specific feature composition                                    |
| Match            | Match detail                   | loading skeleton, error/retry, not found, upcoming/live/finished score forms, refresh                              | Source                  | Match feature composition                                                |
| Match            | Live links                     | absent/present link, open, create/edit, report, delete confirmation, moderation/history                            | Source                  | Match-owned cards and forms using shared sheet/form primitives           |
| Documents        | PDF viewer                     | loading overlay, rendered document, close, report, provider failure                                                | Source                  | Feature screen; native/Web provider boundary                             |
| Cross-feature    | Report sheet                   | type/context, title/description validation, image absent/selected/error, disabled, submitting, API toast           | Source                  | Feature-owned form on shared form/sheet primitives                       |
| Cross-feature    | Guest prompt                   | closed/open, sign-in and dismiss actions                                                                           | Source                  | Session-owned sheet composition                                          |
| Cross-feature    | Feedback                       | loading skeleton/spinner, empty, search prompt, error/retry, API toast, native confirmation                        | Observed Web, Source    | Shared feedback families with feature-owned copy/recovery                |

## Current visual inventory

### Theme and values

The mounted theme is dark only. Its semantic roles are:

- surfaces: `background`, `backgroundSecondary`, `surface`, `surfaceSecondary`, `surfaceTertiary`;
- borders: `border`, `borderSecondary`;
- text: `text`, `textSecondary`, `textInactive`, `muted`, `onPrimary`;
- interaction: `hover`, `pressed`, `primary`;
- status: `success`, `error`, `warning`;
- competition: `gold`, `silver`, `bronze`, `male`, `female`;
- domain gradients: three pool border palettes, three pool fill palettes, and one CTA gradient.

The current token file defines header/tab/logo/search dimensions, a default type size, a default radius, full-pill
corners, section spacing, and navigation icon sizes. It does not define a spacing, typography, radius, border, effect,
safe-area, or touch-target scale.

Static inspection of handwritten production source found:

- type sizes from `10` through `40`, with `12` and `14` dominant;
- radii from `3` through `100` plus `999`, with `18` dominant;
- repeated spacing values from `2` through `24`, especially `4`, `6`, `8`, `10`, `12`, and `16`;
- eight production files with legacy shadow/elevation values and no `borderCurve` or modern `boxShadow` token;
- direct colors outside the theme for gradients, overlay/transparency, ranking medals, provider states, and several
  feature visuals.

Test fixtures and ignored generated source were excluded from those counts. REF-062 must preserve the current dark
identity while reducing accidental near-duplicates to a small scale. It must not force genuinely semantic domain colors
into generic neutral tokens.

### Shared component families

The existing active shared families are a useful starting point, not an automatic Figma catalog:

| Family              | Current implementation evidence                                                                             | REF-063 decision                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions             | `GradientButton`, `BottomSheetFormFooter`, raw feature controls                                             | Create explicit primary, secondary, destructive, icon, and loading/disabled action variants proven by the matrix. Keep labels and commands local. |
| Pills and filters   | `InfoPillGradient`, `Filters`, select triggers                                                              | Create bounded chip/filter/status variants. Red-dot, pressability, wrapping, and size must not become an arbitrary boolean matrix.                |
| Fields              | `Field`, labels/errors, sheet input, select, season/format/gender/division selectors, color picker          | Create field anatomy and concrete input/select states. Keep Formik schema, request construction, image work, and submit commands in features.     |
| Cards               | `EntityGradientCard`, `FormCard`, state cards, hero/information/ranking/match/admin cards                   | Share only card shells and exact entity/state patterns. Match, ranking, profile, and administration content remain feature-owned.                 |
| Feedback            | `StateCard`, `EmptyState`, `ErrorState`, `SearchState`, `ApiErrorToast`, `Skeleton`, `Spinner`, `AppLoader` | Build loading, empty, error, search-prompt, toast, and retry states with explicit variants.                                                       |
| Entity presentation | entity header/skeleton, hero, masked image, follow action/count                                             | Keep exact repeated entity mechanics shared; Club's distinct composition stays local.                                                             |
| Navigation          | tab bar/items, generic tab view, screen headers/back/report actions                                         | Model bottom navigation, segmented tabs, and compact screen-header actions while retaining native safe-area behavior.                             |
| Sheets              | modal/page frames and form footer                                                                           | Model sheet surface, handle, header/content/footer, keyboard and destructive-confirmation states. Feature sheets compose these parts.             |
| Lists               | entity cards/skeletons and feature-owned FlashList/FlatList rows                                            | Figma owns row/card visuals, not a generic list framework. List virtualization, pagination, and queries stay in code.                             |

Current consumer counts confirm that the most established primitives are the API toast (15 importing modules), masked
image (13), error state (12), information pill (12), modal sheet (12), form card (11), field (11), and form footer (11).
This is sufficient evidence for their families, but not for preserving every current prop.

### Duplication and API pressure

The source contains 45 `TouchableOpacity` instances across 25 production files and 41 `Pressable` instances. Repeated
icon actions, image pickers, destructive actions, compact pills, headers, and administration controls use local shells
with near-identical spacing and state treatment. These are the main consolidation candidates for REF-065 through
REF-069.

The shared APIs also expose pressure points:

- `GradientButton` combines disabled, loading, loading-label, loading-icon, full-width, gradient, and layout choices;
- `InfoPillGradient` combines three sizes, optional icon, red dot, disabled/pressable behavior, styles, and layout
  choices;
- `Filters` combines single/multiple selection, mandatory selection, and scrolling;
- the custom tab bar combines platform appearance and pill-border options;
- forms repeat the same sheet/footer state exchange, but their values, validation, and commands are correctly local.

Legitimate state booleans such as `disabled`, `loading`, or `isFocused` are not defects by themselves. REF-065 should
replace only combinations that represent distinct component variants or hidden composition. It should use explicit
variants and children where that makes consumers clearer, without compound-component machinery for simple controls.

### File names and exports

The handwritten production tree contains 259 TypeScript files outside ignored generated source and tests: 178
PascalCase component files, 68 camelCase hooks/models/adapters, four kebab-case route names, and nine router/platform
special cases. UI files consistently use PascalCase while hooks and non-component
modules use camelCase; Orval output uses its generator-owned naming and must not be hand-renamed.

Exports are mixed: the production tree has 167 default exports, shared UI has 38 default exports and 44 named exported
types/functions, and there is no broad handwritten UI barrel. REF-065 must choose and document one simple convention
before mechanical renames. It must not add a deep barrel hierarchy or rename ignored generated files.

## Approved Figma scope

REF-062 may create one Blockout mobile design-system file with these foundations only:

- primitive and semantic dark colors, including status and domain roles;
- a compact type scale with family, size, weight, and line-height styles;
- spacing, component sizing, touch targets, radii, borders, and effects;
- icon sizes, safe-area references, and phone layout constraints;
- the existing pool and CTA gradients where current screens prove them.

REF-063 may create only the component families listed in the shared-component table. REF-064 then reconstructs every
row in the screen/state matrix at representative iOS and Android phone widths. Native provider UI is kept as a visual
reference and is not recreated. Web frames document phone-size compatibility gaps only.

No Blockout Figma file was selected or created in REF-061. The connected Figma account has full access to the Blockout
team, but file creation, library inspection, variable creation, and component writes belong to REF-062 after this scope
is committed. This keeps discovery read-only and prevents speculative foundations.

## Locked implementation rules

- Preserve product behavior, copy, navigation, data ownership, dark identity, and platform boundaries.
- A shared primitive needs at least two active consumers with the same semantic role and behavior.
- Similar screens remain feature-owned compositions; visual resemblance alone does not justify a generic component.
- Normalize insignificant spacing, radius, and type drift to the nearest approved token.
- Prefer explicit variants over unrelated boolean combinations, but keep ordinary state booleans simple.
- Prefer `Pressable` for future touched controls; do not mass-rewrite untouched behavior without a focused slice.
- Keep native safe areas, virtualized lists, generated API boundaries, and provider adapters intact.
- Do not introduce helper factories, generic type systems, registries, selector catalogs, or configuration-driven UI.
- Do not create a light theme, desktop product, new brand, or speculative token/component taxonomy.
- Every future slice compares its affected states to the approved Figma frame and retains focused behavior tests.

## Evidence gaps carried forward

The following are not reasons to weaken the implementation or invent local bypasses:

- consent acceptance, ads, purchases, notifications, maps, image workflows, deep links, and PDF handoff still require
  provider state or physical-device validation where simulators are insufficient;
- the authenticated Chrome pass proved authorization and the mapping workflow, but the current local data does not
  populate every administration list and the Chrome viewport controller did not provide a phone-sized authenticated
  capture;
- full native screen-by-screen comparison follows after REF-064 produces the approved visual authority.

These gaps are explicit inputs to REF-064 and REF-070. They do not authorize provider, production, database, or
authentication changes.
