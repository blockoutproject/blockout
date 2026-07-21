# Blockout Mobile Testing Policy

Read this before adding or changing Expo mobile tests, test selectors, mocks, or component behavior protected by Jest.

## Test Stack And Scope

- Use the existing `jest-expo` preset with React Native Testing Library. Do not add `react-test-renderer`, a second test
  runner, or a generic test framework wrapper.
- Co-locate focused `*.test.ts` and `*.test.tsx` files under the owning feature or shared boundary's `__tests__`
  directory.
- Test observable rendering, interaction, navigation intent, request construction, cache behavior, and error recovery.
  Do not assert component internals, private hooks, implementation call order, or large snapshots.
- Jest does not prove native provider behavior. Mock the narrow Expo/native adapter for unit tests and keep simulator,
  physical-device, and provider smokes as separate completion evidence.

## Query Priority And Accessibility

Use queries in the same order a user or assistive technology discovers the interface:

1. role with accessible name and state;
2. label, placeholder, display value, text, or hint;
3. `testID` when the element has no stable user-facing selector or must also be addressed by an end-to-end smoke.

Interactive components expose a correct role, accessible name, state, and hint where useful. A `testID` never replaces
accessibility semantics. Prefer `userEvent` for supported press and typing interactions; use `fireEvent` only for events
that `userEvent` cannot express, such as a custom accessibility action.

## Stable Test IDs

Every touched feature slice provides stable IDs for the few structural boundaries needed by component and future
end-to-end tests:

- screen or modal root: `<feature>-screen` or `<feature>-modal`;
- collection: `<feature>-list`;
- domain item: `<feature>-item-<stable-domain-id>`;
- ambiguous non-text action: `<feature>-<action>-action`;
- loading, empty, or error boundary when it cannot be selected semantically: `<feature>-loading`,
  `<feature>-empty`, or `<feature>-error`.

Use a real stable domain identifier for repeated items. Never derive IDs from an array index, translated copy, visual
position, random value, timestamp, secret, token, email address, or other personal data. Do not build a test-ID registry,
factory, enum, generic type, or selector helper: literal feature-owned IDs are simpler and searchable.

A reusable component accepts and forwards `testID` only when a concrete consumer needs to address its native host
element. Do not add IDs to every nested `View` or expose implementation structure through selectors.

## Design For Testability

- Keep route files thin and render focused feature components with concrete props. A component should be testable
  without mounting an unrelated navigation tree or the complete application.
- Keep HTTP and native I/O behind the existing feature API clients, hooks, providers, and platform adapters. Components
  render state and invoke explicit commands; they do not construct global clients or reach into native modules directly.
- Extract normalization, formatting, validation, and update decisions into a pure function only when that logic is
  meaningful on its own or reused. Keep a one-line expression in the component instead of creating a test-only helper.
- Let TanStack Query own remote state and the established contexts own application state. Do not mirror state or add
  effects merely to make assertions easier.
- Prefer small named components for distinct user-visible states over one component with many testing-unfriendly
  boolean modes. Keep variants explicit and concrete.
- Do not add production branches for Jest, test-only props, service locators, dependency-injection containers, mock
  registries, generic factories, or exports of private implementation details. Test through observable behavior; when
  no meaningful behavior is observable, do not manufacture a test for coverage.
- Inject time, randomness, or a native capability only when it genuinely controls behavior and cannot be tested through
  the existing boundary. Use the narrowest concrete function or prop, not a general environment abstraction.

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

## Completion Gate

Run the narrow test while developing. Before publishing a mobile slice, run the complete mobile Jest suite, typecheck,
lint, and `git diff --check`. Run the Web export when rendered composition changes, and the relevant native build or
launch when a native boundary changes.

This policy follows the current official [Expo Jest guide](https://docs.expo.dev/develop/unit-testing/) and the React
Native Testing Library guidance for [user-focused queries](https://callstack.github.io/react-native-testing-library/docs/guides/how-to-query)
and [realistic interactions](https://callstack.github.io/react-native-testing-library/docs/api/events/user-event).
