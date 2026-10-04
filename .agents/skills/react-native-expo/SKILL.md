---
name: react-native-expo
description: "Implement or review Expo Router and React Native features, native lifecycle, semantic StyleSheet styling and mobile accessibility. Use for native application work, not web framework decisions."
---

# React Native and Expo

Read the accepted specification, local platform/design authority, actual Expo/React Native versions, route tree and providers. Specifications own future intent; current source/tests describe delivered behavior. Installing this skill does not authorize framework upgrades, extra platform targets or a migration of existing form libraries.

## Routing and feature ownership

Keep Expo Router files thin: routes, layouts, navigation, redirects and top-level composition. Business feature screens live outside the route tree. Use the existing feature owners; do not require a container or screen hook for simple behavior.

Keep native/provider constants and payloads in their adapters. Follow shared React conventions for feature state, forms, effects and generated contracts; this skill concentrates on native responsibilities. Session, token storage and authorization decisions come from the project's accepted identity architecture, not a portable provider profile.

## Native UI and tokens

Use certified semantic Figma tokens and published components as the visual authority. Keep one narrow theme/token public API; primitive palette values and implementation details remain private. Safe-area insets, keyboard dimensions and measured device sizes are runtime values, not design tokens.

Use `StyleSheet.create` for stable named styles. Small dynamic values may stay inline where clearer. Do not introduce NativeWind, Tailwind, CSS, a styling runtime, style factories or generated style code. Use flex, gap and container padding; use `useWindowDimensions` only for actual viewport-dependent layouts, not fixed module-load device dimensions.

Preserve safe-area ownership through the navigation container and configured safe-area provider. Use a virtualized list for unbounded data and a ScrollView for bounded static/form content. Keep row work cheap, keys stable and subscriptions narrow. Use the existing supported list component rather than installing another by default.

Prefer explicit controlled primitives, `Pressable` for custom controls and `expo-image` where the app uses it. Keep provider-owned native controls when they own interaction. Do not wrap every primitive, create generic configuration-driven screens or proliferate unrelated boolean modes. Shared screen shells need real identical responsibility across active screens.

## Lifecycle and accessibility

Verify keyboard avoidance, focus restoration, back gestures/hardware back, supported deep links, navigation readiness, permission denial/retry and background/resume behavior when affected. Request native permissions at the meaningful user action, using actual platform configuration and accepted product behavior.

Subscriptions, native resources and providers need one owner and cleanup; no provider without an active consumer. Preserve cancellation and timeout behavior across unmount and identity changes. Keep tokens/secrets out of logs and ordinary storage; use the established secure-store boundary when required.

Expose role, accessible name, state and useful hints. Support screen-reader navigation, text scaling, contrast, reduced motion and touch targets. Do not substitute test IDs for accessibility. Do not add a web target, compatibility adapter or new provider without the task requiring it.

## Evidence

Run configured formatting, lint, typecheck and mobile tests. Run Expo Doctor for changed dependencies/configuration, and the relevant native build/launch for modules, provider adapters, routing or platform-specific behavior. Compare visual changes to exact accepted Figma nodes at required platform/theme/state and viewport; JavaScript tests prove neither visual fidelity nor native behavior. Report unavailable native/design evidence explicitly.

Mechanics: [Expo Router](https://docs.expo.dev/router/introduction/) and [React Native accessibility](https://reactnative.dev/docs/accessibility). Feature structure, StyleSheet and form choices are personal conventions.
