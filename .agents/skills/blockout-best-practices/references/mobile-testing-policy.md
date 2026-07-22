# Blockout Mobile Testing Policy

Read this before adding or changing Expo mobile tests, test selectors, mocks, or component behavior protected by Jest.

## Test Stack And Responsibilities

- Use the existing `jest-expo` preset with React Native Testing Library. Do not add `react-test-renderer`, a second test
  runner, a browser test layer, or a generic test-framework wrapper.
- Co-locate focused `*.test.ts` and `*.test.tsx` files under the owning feature or shared boundary's `__tests__`
  directory.
- Test observable rendering, interaction, navigation intent, request construction, cache behavior, and error recovery.
  Do not assert component internals, private hooks, implementation call order, style objects, or large snapshots.
- Jest proves behavior, not visual fidelity or native provider behavior. Figma comparison and explicit iOS and Android
  captures prove appearance; simulator, physical-device, and provider smokes remain separate evidence.
- Add a test when behavior can regress and the assertion protects a user or boundary. Do not manufacture tests for
  passive markup or implementation details to increase a coverage number.

## Query Priority And Accessibility

Use queries in the same order a user or assistive technology discovers the interface:

1. role with accessible name and state;
2. label, placeholder, display value, text, or hint;
3. `testID` when the element has no stable user-facing selector or must also be addressed by a future native smoke.

Interactive components expose a correct role, accessible name, state, and hint where useful. A `testID` never replaces
accessibility semantics. Prefer `userEvent` for supported press and typing interactions; use `fireEvent` only for an
event that `userEvent` cannot express.

## Stable Test IDs

Every touched feature slice provides stable IDs only for the structural boundaries that require them:

- screen or modal root: `<feature>-screen` or `<feature>-modal`;
- collection: `<feature>-list`;
- domain item: `<feature>-item-<stable-domain-id>`;
- ambiguous non-text action: `<feature>-<action>-action`;
- loading, empty, or error boundary when it cannot be selected semantically: `<feature>-loading`, `<feature>-empty`, or
  `<feature>-error`.

Use a real stable domain identifier for repeated items. Never derive IDs from an array index, translated copy, visual
position, random value, timestamp, secret, token, email address, or personal data. Do not build a test-ID registry,
factory, enum, generic type, or selector helper: literal feature-owned IDs are simpler and searchable.

A reusable component accepts and forwards `testID` only when a concrete consumer needs its native host element. Do not
add IDs to every nested view or expose implementation structure through selectors.

## Design For Testability

- Keep route files thin and render focused feature components with concrete props. A component should be testable
  without mounting an unrelated navigation tree or the complete application.
- Keep HTTP and native I/O behind the existing feature clients, hooks, providers, and platform adapters. Components
  render state and invoke explicit commands; they do not construct global clients or reach into native modules directly.
- Extract normalization, formatting, validation, or update logic into a pure function only when it is meaningful on its
  own or actively reused. Keep a simple expression in the component instead of creating a test-only helper.
- Let TanStack Query own remote state and the established providers own application state. Do not mirror state or add
  effects merely to make assertions easier.
- Prefer small named components for distinct user-visible states over one component with many unrelated modes. Keep
  ordinary `disabled`, `loading`, and selection state explicit and simple.
- Do not add production branches for Jest, test-only props, service locators, dependency-injection containers, mock
  registries, generic factories, or exports of private implementation details.
- Test shared cross-platform behavior once. Add a focused iOS or Android adapter test only when platform behavior truly
  differs; do not duplicate the same component suite per platform.

## Rendering And Doubles

- Render components with the real application providers they require. A provider test owns provider mocks; feature
  tests should not bypass theme, query, session, or API context rules.
- Mock network and native boundaries, not the component or hook behavior being tested. Keep doubles local unless the
  same setup is genuinely reused.
- Use deterministic transport examples. Freeze or stub time only when time affects visible behavior, and restore timers
  and spies after each test.
- Await asynchronous rendering and supported user interactions. Use `findBy*` or `waitFor` for state that appears later;
  do not add sleeps or leave unresolved `act` scopes.
- Assert loading, success, empty, error, retry, disabled, and optimistic rollback states when the touched flow owns them.
- Keep tests independent of real credentials, production data, network availability, and external provider sessions.

## Visual And Completion Gate

- Do not add pixel snapshots, screenshot assertions inside Jest, duplicated Figma fixtures, or a second UI test
  framework. A snapshot may cover a small stable serialized value only when that value is the behavior under test.
- Compare visual changes with the exact canonical Figma node at the same supported native platform, viewport, theme,
  authentication mode, and state. Record unavailable evidence instead of fabricating it.
- Run the narrow test while developing. Before publishing a mobile slice, run formatting, mobile lint, typecheck, the
  complete Jest suite, and `git diff --check`.
- Run Expo Doctor when dependencies or Expo configuration change. Run the relevant unsigned iOS or Android build/launch
  when native modules, provider adapters, routing, safe areas, or platform-specific behavior change. Run both native
  platforms for a shared visual-system slice before certification.

This policy follows the current official [Expo Jest guide](https://docs.expo.dev/develop/unit-testing/) and the React
Native Testing Library guidance for
[user-focused queries](https://callstack.github.io/react-native-testing-library/docs/guides/how-to-query) and
[realistic interactions](https://callstack.github.io/react-native-testing-library/docs/api/events/user-event).
