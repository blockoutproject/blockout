---
name: expo-testing
description: "Test Expo and React Native behavior with jest-expo and React Native Testing Library, semantic queries, controlled native/network doubles and scoped native evidence."
---

# Mobile Testing Policy

Read this before adding or changing Expo mobile tests, test selectors, mocks, or component behavior protected by Jest.

Tests belong to the feature delivery. Test-first development is optional; a regression fix starts with a failing
reproduction whenever practical. Use visible `// Given`, `// When` and `// Then` comments and blank lines between phases.

## Test Stack And Responsibilities

- Use the existing `jest-expo` preset with React Native Testing Library. Do not add `react-test-renderer`, a second test
  runner, a browser test layer, or a generic test-framework wrapper.
- Co-locate focused `*.test.ts` and `*.test.tsx` files under the owning feature or shared boundary's `__tests__`
  directory.
- Test observable rendering, interaction, navigation intent, request construction, cache behavior, and error recovery.
  Do not assert component internals, private hooks, implementation call order, style objects, or large snapshots.
- Jest proves behavior, not visual fidelity or native provider behavior. Figma comparison and explicit captures on the
  platforms declared by the repository design authority prove appearance; runtime and provider smokes remain separate
  evidence.
- Add a test when behavior can regress and the assertion protects a user or boundary. Do not manufacture tests for
  passive markup or implementation details to increase a coverage number.

## Query Priority And Accessibility

Use queries in the same order a user or assistive technology discovers the interface:

1. role with accessible name and state;
2. label, placeholder, display value, text, or hint;
3. `testID` when the element has no stable user-facing selector or has a concrete native automation consumer.

Interactive components expose a correct role, accessible name, state, and hint where useful. A `testID` never replaces
accessibility semantics. Prefer `userEvent` for supported press and typing interactions; use `fireEvent` only for an
event that `userEvent` cannot express.

## Stable Test IDs

Add stable IDs only where an actual test or native automation consumer cannot use a reliable semantic selector. Optional naming examples for those required boundaries:

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
- Test shared cross-platform behavior once. Add a focused platform adapter test only when behavior truly differs; do
  not duplicate the same component suite per platform.

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
- Test pure schemas, mappers, formatters and view-model derivation directly. Test a custom hook separately only when
  its reusable behavior is clearer without mounting a component.
- Test owned redirects or deep-link normalization as plain functions when possible; mount navigation only when the
  route interaction is the behavior. Do not assert generated-client or native-SDK internals.

## Visual And Completion Gate

- Do not add pixel snapshots, screenshot assertions inside Jest, duplicated Figma fixtures, or a second UI test
  framework. A snapshot may cover a small stable serialized value only when that value is the behavior under test.
- Compare visual changes with the exact canonical Figma node at the platform, viewport, theme, authentication mode, and
  state selected by the repository design authority. Record unavailable evidence instead of fabricating it.
- Run the narrow test while developing. Before publishing a mobile slice, run the formatting, lint, typecheck, complete
  test, and diff commands declared by the repository build configuration.
- Run Expo Doctor when dependencies or Expo configuration change. Run the relevant unsigned platform build/launch when
  native modules, provider adapters, routing, safe areas, or platform-specific behavior change. Run every platform
  required by the repository instructions for a shared visual-system slice before certification.

This policy follows the current official [Expo Jest guide](https://docs.expo.dev/develop/unit-testing/) and the React
Native Testing Library guidance for
[user-focused queries](https://callstack.github.io/react-native-testing-library/docs/guides/how-to-query) and
[realistic interactions](https://callstack.github.io/react-native-testing-library/docs/api/events/user-event).

For affected data/form behavior, prove dirty values survive background refetch, failed validation never enters the successful query cache, and submission failures preserve editable values. Do not add a test-only state mirror.

## Readable scenarios and reusable data

The test name, scenario-determining inputs, action and expected result must be visible together. One behavior may need several assertions; do not split one outcome mechanically. Integration tests stay near their boundary owner; reserve transversal locations for truly cross-boundary behavior. Identify which collaborators are real and which are controlled doubles. Helpers must not hide the action, database writes, installed mocks or unrelated setup.

Keep simple values inline. Use targeted typed factories for rich valid objects that are actually reused, with explicit overrides for the scenario's decisive fields. Search existing factories before adding one, and share only identical meaning at the narrowest owner. A private helper may name one coherent step, and a public boundary may have one consumer; neither permits speculative test DSLs, generic object mothers or automatic reflection-based object graphs.

Use `@faker-js/faker` when generated secondary values are useful, as a test dependency with a project-owned compatible version. Use a native fixed seed per test and explicit construction; never mutable random state shared across parallel tests. Control the clock for time-sensitive data. Assert scenario values, not a hard-coded string tied to a Faker version or call order. Keep boundary cases explicit and parameterized. Small tests do not require a data library, and installing this skill does not add dependencies.

Read [canonical examples](references/examples.md) when adding or substantially restructuring tests or factories. They show a unit test, an integration boundary and a rich typed factory, not a new test framework. For a substantive behavior change run the owning suite, necessary integration proofs and affected consumers; mandatory repository checks still apply. No new E2E infrastructure is introduced by this policy.

Focused architecture tests may protect important dependency boundaries. Avoid tests that assert source spelling or incidental file layout rather than the boundary itself.
