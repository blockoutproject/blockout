# REF-067 Application Shell Alignment

## Scope

REF-067 applies the certified REF-065S/REF-066 design system to the native application shell and entry flows. It aligns
the tab bar, session entry, sign-in, onboarding, maintenance, required-update, guest prompt, and loading boundaries
without changing their business behavior.

The task changes no API contract, generated client, Auth0 configuration, notification provider, purchase provider,
credential, user data, Android visual target, Web target, or production state. Existing route guards, redirects,
deep links, safe areas, keyboard handling, haptics, notification setup, and native navigation semantics remain owned by
their existing boundaries.

## Canonical Figma Authority

The canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file remained the sole visual
authority. The implementation was compared directly with these certified nodes:

| Responsibility                    | Figma node |
| --------------------------------- | ---------- |
| Sign-in                           | `79:964`   |
| Bottom navigation variants        | `140:123`  |
| Feedback and loading states       | `32:26`    |
| Maintenance and required-update   | `40:61`    |
| Guest prompt and restricted state | `49:911`   |

No Figma token or component geometry was recalibrated from the pre-adoption runtime, and Figma was not mutated.

## Native Shell

The custom tab bar now consumes the certified navigation tokens and preserves the existing default, premium, and
maintenance appearances. Its four items keep the same routes and animated selection behavior while exposing native tab
semantics, selected state, accessible labels, and stable test identifiers.

The root layout still owns the same provider order and lifecycle responsibilities. Its navigation content background
now resolves through the shared theme instead of a local visual value. No provider, redirect, notification, deep-link,
purchase, or authentication sequence moved into a visual component.

## Entry And Gate Flows

- Sign-in uses the canonical action, pill, typography, spacing, and surface tokens while retaining Auth0 and guest
  navigation behavior. Concurrent submissions are rejected and haptic ownership is no longer duplicated.
- Onboarding keeps native horizontal paging, skip, back, completion, push-registration, and haptic behavior. Its visual
  structure now uses the certified theme and shared action rather than a feature-specific presentation component.
- Maintenance and required-update screens share only their proven card anatomy and content styles. Their distinct
  commands, bypass rules, stores, and status copy remain local.
- Guest upsell and prompt surfaces use the certified card, pill, action, spacing, and typography vocabulary without
  introducing a generic prop-heavy modal abstraction.
- Superseded loaders and unused presentation dependencies were removed only after the application had no remaining
  consumer.

Touched source files use the repository kebab-case convention. The implementation adds no component registry, wrapper
hierarchy, style generator, speculative variant, Web fallback, or generated source.

## Visual And Behavioral Evidence

The exact sign-in and bottom-navigation Figma frames were inspected at their native `393 × 852` canvas size. The live
iPhone 17 Pro Simulator was kept on the authenticated finished-match state so the migrated tab bar could be compared
without signing the user out or changing provider state. Its premium border, selected home item, icon alignment, safe
area, and absence of the obsolete blue selection outline match the certified navigation variants.

Sign-in, onboarding, maintenance, required-update, and guest states were checked against their exact Figma structures
and covered by focused component tests. States that would require signing out the active Auth0 user, changing the
server-owned application status, or mutating production-like data were not forced for a screenshot. Android was used
only for technical build validation, as required by the roadmap.

## Validation

- `NX_DAEMON=false npm exec nx run @blockout/mobile:lint`: passes.
- `NX_DAEMON=false npm exec nx run @blockout/mobile:typecheck`: passes.
- `NX_DAEMON=false npm exec nx run @blockout/mobile:test`: 31 suites and 59 tests pass with no snapshot.
- `npx expo-doctor@latest apps/frontend/mobile`: all 19 checks pass.
- `./gradlew app:assembleDebug` from `apps/frontend/mobile/android`: succeeds.
- An unsigned Debug build of `Blockout.xcworkspace` for the booted iPhone 17 Pro Simulator succeeds from fresh derived
  data.
- The generated-client ownership, documentation formatting, dependency lockfile, and Git diff checks pass.

The Docker infrastructure, backend services, Metro process, and iOS Simulator remain running for the next native
slice. REF-068 was not started.
