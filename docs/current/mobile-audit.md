# Mobile Expo and React Native audit

## Purpose

This audit establishes the next mobile work from the live application rather than proposing a rewrite. It applies the
Blockout mobile policy, Expo guidance, Vercel React Native best practices, and Vercel composition patterns to the code
left by REF-029 and REF-030.

Android and iOS remain the product platforms. React Native Web remains a phone-sized local verification surface. The
audit does not activate contract generation, change a route or product behavior, replace Auth0, or select a new UI
framework.

## Verdict

The application has a sound base and does not need to be restarted. Expo Router routes are thin, native and web
adapters are explicit, images mostly use `expo-image`, high-volume match rendering already uses FlashList, fonts are
configured through Expo, and authentication has a secure platform boundary.

The application is not yet ready for a broad visual or architectural refactor. Correctness checks are incomplete,
Expo and native dependencies are not resolved from one coherent tree, and session/network ownership is too broad. The
next work should fix those foundations first, then finish feature ownership and UI cleanup in measured slices.

## Verified strengths

- Route files delegate screen composition to the fourteen feature modules introduced by REF-029.
- Expo Router and native stacks own navigation; platform files isolate Auth0, maps, advertisements, secure storage,
  and notification-response behavior.
- The Auth0 flow uses the official native and web SDKs without a local authentication bypass.
- `expo-image` is used for most application images and the Expo font plugin owns font loading.
- The main match list uses a typed heterogeneous FlashList with stable row kinds.
- TypeScript checking, all 14 current Jest tests, and the Web export pass.
- The existing characterization documents already identify the provider and physical-device checks that cannot be
  proven by a browser export.

## Findings

### 1. Restore an enforceable correctness gate first — high

**Resolved by REF-032.** The Expo flat ESLint configuration and Nx lint target now enforce the Hooks and leaked-render
rules. The remaining inherited warnings are visible and capped so new warnings fail the target.

The mobile project exposes `expo lint`, but it has no ESLint configuration and therefore cannot currently run as a
repository gate. Static inspection found a concrete Rules of Hooks violation in `Onboarding.tsx`: `useAnimatedStyle`
is called from inside `steps.map`. The same component uses `useDerivedValue` for a JavaScript side effect, captures the
window width once at module load, and contains a drag value that is never updated during the gesture.

Several string-backed conditional renders also use `value && <View />`. React Native can render an empty string or
number unexpectedly in this pattern. `Field` and `NotificationItem` are confirmed examples, and the current project
has no `react/jsx-no-leaked-render` rule to protect future code.

**Decision:** add the standard Expo ESLint configuration and an Nx lint target, then fix only violations proven by the
new gate. Cover the onboarding indicator and conditional-render corrections with focused tests. Do not perform a
format-only mass rewrite.

### 2. Align Expo, Metro, and native dependency resolution — high

`expo-doctor` passes 15 of 18 checks. It reports:

- the Nx-wrapped Metro configuration omits an Expo default `nodeModulesPaths` entry;
- duplicate installations of `@expo/vector-icons` and `@react-navigation/native`;
- patch drift for Expo, Expo Updates, and three React Navigation packages.

Inspection confirms that Expo's default Metro configuration includes both application and workspace `node_modules`,
while the current Nx wrapper resolves only from the workspace root. A Web export can still pass even when native
resolution is ambiguous, so this must be proven on Android and iOS.

The dependency manifest also contains candidates with no source or configuration reference, and `jwt-decode` is used
without being declared directly. `jest-expo` and `@types/qs` are declared as runtime dependencies. These are audit
signals, not authority for blind removal: each candidate must be confirmed through a focused dependency cleanup and
native build.

The production dependency audit currently reports 50 moderate and 4 high findings, with no critical finding. The high
paths include the directly declared Axios version and the Markdown dependency chain.

**Decision:** reconcile the application with the latest compatible Expo 54 patch set, make Metro resolve one intended
native dependency tree, declare imports at the correct level, move test/type packages to development dependencies,
and remove only dependencies whose absence is proven. Require a clean doctor result, dependency-tree inspection, and
fresh Android/iOS builds before completion. Do not turn this task into an Expo SDK upgrade.

### 3. Separate session actions, server state, and mobile network lifecycle — high

`SessionProvider` combines authentication, guest mode, application status, update and maintenance gates, push-token
registration, navigation, and ten actions in one context consumed throughout the application. Any value change can
invalidate every consumer. Some asynchronous failures are silently ignored, and the memoized provider value depends
on closures that are not all represented in its dependency list.

The root creates a bare `QueryClient`. It does not yet connect TanStack Query to React Native application focus or
network reachability, and shared retry, stale-time, and error behavior are implicit. Follow state is also copied from
query data into local state in places, which creates two potential authorities for the same fact.

Configuration currently turns missing required environment values into empty strings. That delays a configuration
error until an HTTP or authentication operation fails.

**Decision:** retain the existing stores and libraries, but split stable session actions from frequently changing
session state, keep server facts in TanStack Query, add the documented React Native focus/network integration, and
validate required configuration at startup. Preserve REF-030 authentication and logout semantics exactly.

### 4. Finish feature ownership before redesigning shared UI — medium

The fourteen route modules still import the legacy root `components`, `hooks`, `api`, `types`, or `utils` folders. This
is expected from the foundation-only scope of REF-029, but it means the feature migration is not complete. The source
contains 48 explicit `any` occurrences across 31 files.

Theme ownership is duplicated: the root mounts the provider under `shared/theme`, while many components read the
separate context under `shared/providers`. The latter has a default dark value, so a missing provider can remain
invisible. Naming debt such as `GuestPromptSheet.tsx.tsx`, `DisivisionFormSheet.tsx`, and inconsistent file casing
should be corrected when the owning feature moves, not by a standalone mass rename.

Large configurable primitives such as `Spinner`, `InfoPillGradient`, and the custom tab bar have accumulated variants
and tuning props. Composition patterns can simplify them, but only after their real consumers are grouped by feature.
Boolean state props such as `disabled` or `loading` remain legitimate; the goal is not to replace every boolean with a
compound component.

**Decision:** migrate ownership feature by feature, starting with one representative read flow and one form flow.
Unify theme ownership during that work and simplify a shared component only when its consumer set proves the useful
variants. Keep handwritten transport models until contract-first is separately authorized.

### 5. Measure list, image, and accessibility work — medium

The primary match list is already a strong implementation and should be used as the local reference. Smaller followed
lists still create derived state with effects, contain `any`, and allocate render callbacks and style objects inline.
Some pool rows render nested match collections inside a virtualized parent. This may be appropriate for small groups,
but must be profiled with realistic large data before changing list structure.

`NotificationItem` is the remaining confirmed use of React Native `Image` in a virtualized row. Across the source,
interactive controls have many test identifiers but very few explicit accessibility labels or roles. The Web export
also reveals large onboarding GIF assets; native startup and memory measurements should decide whether compression is
worthwhile.

**Decision:** add accessibility semantics and image/list corrections with feature tests, then profile realistic
low-end Android data before and after any virtualization or asset change. Do not replace the custom tab bar or mature
bottom sheets solely because a generic recommendation prefers native controls; first prove equivalent navigation,
keyboard, safe-area, and form behavior in a focused prototype.

### 6. Expand behavioral evidence with each correction — medium

The current 14 tests cover the Auth0 web adapter, `StateCard`, and application-version logic. They do not protect the
onboarding animation, session transitions, query lifecycle, lists, forms, accessibility actions, deep links, or native
provider boundaries.

**Decision:** every remediation task adds focused behavior tests for its changed boundary. A final certification task
then repeats Web phone-size checks and fresh native builds, and records physical-device provider checks separately.
Unavailable credentials or hardware remain explicit evidence gaps; tests must not introduce bypasses.

## Ordered remediation

1. **REF-032 — Restore mobile correctness and static quality gates (complete).** Add the standard lint integration,
   fix the proven Hooks and leaked-render issues, and add focused regression tests.
2. **REF-033 — Reconcile Expo and native dependencies.** Correct Metro and package ownership, align compatible Expo 54
   patches, resolve actionable audit paths, and prove clean native resolution.
3. **REF-034 — Stabilize session and network state.** Separate stable actions from changing state, establish Query
   lifecycle defaults, remove duplicate server-state ownership, and fail fast on required configuration.
4. **REF-035 — Complete feature-owned mobile slices.** Move one coherent feature at a time, unify theme ownership,
   improve accessibility and measured list/image behavior, and simplify component APIs only where consumers justify it.
5. **REF-036 — Certify the cleaned mobile application.** Run the complete static, test, Web phone-size, simulator, and
   available physical-device/provider matrix, then record remaining external evidence gaps without weakening gates.

These tasks are deliberately sequential. REF-035 may be split into multiple feature-sized commits while it is
executed, but no separate speculative architecture layer is required.

## Audit evidence

The audit used the current checked-out application and recorded the following results on 2026-07-21:

- `NX_DAEMON=false npm exec nx run @blockout/mobile:typecheck`: pass.
- `NX_DAEMON=false npm exec nx run @blockout/mobile:test`: pass, 3 suites and 14 tests.
- `NX_DAEMON=false npm exec nx run @blockout/mobile:web-export`: pass, 3,335 modules exported.
- `npx expo install --check`: compatible-package drift reported; the command used cached metadata because network
  access was unavailable.
- `npx expo-doctor@latest`: 15 of 18 checks pass; the three failures are described above.
- `npm run lint --workspace=blockout`: no ESLint configuration existed at audit time; REF-032 made it operational.
- `npm audit --omit=dev`: 50 moderate, 4 high, and 0 critical production findings.

No application source, native project, route, configuration value, or runtime behavior was changed by this audit.
