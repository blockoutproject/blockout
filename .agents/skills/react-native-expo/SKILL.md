---
name: react-native-expo
description: "Implement or review Expo Router and React Native features, native lifecycle, semantic StyleSheet styling and mobile accessibility. Use for native application work, not web framework decisions."
---

# React Native and Expo

Read the requested behavior and the project's Expo and React Native versions, route tree and relevant providers.

## Routing and feature ownership

Keep Expo Router files thin: routes, layouts, navigation, redirects and top-level composition. Business feature screens live outside the route tree. Use the existing feature owners; do not require a container or screen hook for simple behavior.

Keep native/provider constants and payloads in their adapters. Follow comparable features for state, forms, effects and API calls. Use the project's session and token-storage mechanisms when the feature requires them.

## Native UI and tokens

Reuse the project's components and any approved theme tokens. Read safe-area insets, keyboard dimensions and device sizes at runtime.

Use `StyleSheet.create` for stable named styles. Small dynamic values may stay inline where clearer. Use flex, gap and container padding. Read `useWindowDimensions` for layouts that depend on the current viewport.

Preserve safe-area ownership through the navigation container and configured safe-area provider. Use a virtualized list for unbounded data and a ScrollView for bounded static/form content. Keep row work cheap, keys stable and subscriptions narrow. Use the existing supported list component rather than installing another by default.

Prefer explicit controlled primitives, `Pressable` for custom controls and `expo-image` where the app uses it. Keep provider-owned native controls when they own interaction. Do not wrap every primitive, create generic configuration-driven screens or proliferate unrelated boolean modes. Shared screen shells need real identical responsibility across active screens.

## Lifecycle and accessibility

Verify keyboard avoidance, focus restoration, back gestures/hardware back, supported deep links, navigation readiness, permission denial/retry and background/resume behavior when affected. Request native permissions at the meaningful user action, using actual platform configuration and accepted product behavior.

Subscriptions, native resources and providers need one owner and cleanup; no provider without an active consumer. Preserve cancellation and timeout behavior across unmount and identity changes. Keep tokens/secrets out of logs and ordinary storage; use the established secure-store boundary when required.

Expose role, accessible name, state and useful hints. Support screen-reader navigation, text scaling, contrast, reduced motion and touch targets. Do not substitute test IDs for accessibility. Do not add a web target, compatibility adapter or new provider without the task requiring it.

## Evidence

Run configured formatting, lint, typecheck and mobile tests. Run Expo Doctor for changed dependencies/configuration, and the relevant native build/launch for modules, provider adapters, routing or platform-specific behavior. Compare visual changes to the project's accepted design references at the required platform/theme/state and viewport; JavaScript tests prove neither visual fidelity nor native behavior. Report unavailable native/design evidence explicitly.

Mechanics: [Expo Router](https://docs.expo.dev/router/introduction/) and [React Native accessibility](https://reactnative.dev/docs/accessibility). Feature structure and StyleSheet usage are personal conventions.
