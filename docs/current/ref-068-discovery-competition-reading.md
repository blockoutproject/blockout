# REF-068 Discovery And Competition Reading Alignment

## Scope

REF-068 applies the certified REF-065S/REF-066 design system to the native discovery and competition reading flows. It
aligns feed, search, followed content, clubs, teams, pools, matches, rankings, and their loading, empty, error, list,
card, profile, map, and tab states without changing their business behavior.

The task changes no API contract, generated client, query key, mutation, authentication boundary, advertising boundary,
native map provider, credential, user data, Android visual target, Web target, or production state. Existing TanStack
Query ownership, navigation, follow state, list pagination, map interaction, advertisements, and generated DTOs remain
owned by their existing boundaries.

## Canonical Figma Authority

The canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file remained the sole visual
authority. The implementation was compared directly with these certified nodes:

| Responsibility             | Figma node |
| -------------------------- | ---------- |
| Search                     | `84:1001`  |
| Authenticated populated home | `144:992` |
| Club information           | `145:1075` |
| Team upcoming matches      | `147:1066` |
| Pool ranking               | `148:1083` |

No Figma token or component geometry was recalibrated from the pre-adoption runtime, and Figma was not mutated.

## Reading Flow Alignment

- Search, followed teams, followed pools, club teams, and ranking rows use FlashList for their unbounded native lists.
  Their existing query, refresh, pagination, navigation, and empty/error behavior remains unchanged.
- Club, team, and pool cards share only their proven gradient-card anatomy. Entity-specific copy, chips, navigation,
  and data composition remain local to each feature.
- Competition headers, match rows, ranking rows, medals, points, logos, and time pills consume the certified semantic
  tokens. Team names, ranking positions, points, and competition titles keep their required horizontal and vertical
  centering.
- Club information rows preserve their native actions and map boundary while using the certified information-card
  spacing, icon alignment, border, and typography.
- Team and pool profiles keep their feature-owned data composition. Their pill layout now relies on native flex wrapping
  instead of runtime measurement state.
- The team ranking tab derives the concise competition label from the existing generated response and renders the
  certified `Classement · M15` form when that division code is available.
- Match score, score-detail, information, pool, date, and ranking cards use the shared theme vocabulary without merging
  distinct domain responsibilities into a generic prop-heavy component.

Touched presentation files use the repository kebab-case convention. The implementation adds no component registry,
style generator, wrapper hierarchy, speculative variant, Web fallback, handwritten transport model, or generated
source.

## Visual And Behavioral Evidence

The exact Figma frames were inspected at their native `393 × 852` canvas size and compared with the authenticated live
iPhone 17 Pro Simulator. The reviewed runtime states included populated home, team upcoming matches, pool ranking,
empty search, club information and map, and a finished match.

The review verified competition-header breathing room, complete match-row borders, centered team names, centered
ranking positions and points, logo and icon alignment, pill geometry, native safe areas, and the absence of the obsolete
blue selection outline. The provider debug control visible in development builds was excluded because it is not an
application component. The populated-search layout was verified from its certified Figma frame and existing component
tests; production-like data was not mutated merely to force that runtime state.

Android remained a technical validation target only, as required by the roadmap.

## Validation

- `npm exec nx run-many -- --targets=lint,typecheck,test --projects=@blockout/mobile --parallel=3`: passes; 31 suites and
  59 tests pass with no snapshot.
- `npx --yes expo-doctor`: all 19 checks pass from `apps/frontend/mobile`.
- `./gradlew app:assembleDebug` from `apps/frontend/mobile/android`: succeeds.
- The authenticated iPhone 17 Pro Simulator visual review passes for the certified discovery and competition reading
  states listed above.
- Generated-client ownership, documentation formatting, dependency lockfile, and Git diff checks pass.

The Docker infrastructure, backend services, Metro process, and iOS Simulator remain running for the next native slice.
REF-069 was not started.
