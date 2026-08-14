# Expo Mobile Testing

Apply this policy when adding or changing behavior or tests in the Expo mobile application.

## Goal And Timing

Tests protect supported user behavior and important mobile boundaries without freezing component structure or visual implementation. Every feature ships with the proportionate tests needed to prove its accepted behavior and risks; tests are part of the same delivery rather than later stabilization. Test-first development is optional, but a regression fix starts with a failing reproduction whenever practical.

Prefer the cheapest test that can fail for the meaningful regression. More tests and higher coverage are not goals by themselves. Do not test React Native, Expo Router, generated-client, provider-SDK, or component-library behavior that Blockout does not own.

## Consistent Shape

- Use the existing `jest-expo` preset and React Native Testing Library. Do not add a second runner, browser layer, or generic test wrapper.
- Co-locate focused tests with the feature code they protect. Reserve project-level `tests` for cross-cutting contract or build proofs.
- Name tests after observable behavior in user or domain language, not component methods or implementation state.
- Structure each test as arrange, act, assert, separated clearly by blank lines. Use comments only when the phases or reason are not obvious.
- Keep one behavior per test. Use explicit meaningful fixtures and deterministic values.
- Extract shared setup, builders, or renderers only after several tests share the same stable requirement.

## Choosing What To Test

### Pure Behavior

Test schemas, mappers, formatters, view-model derivation, reducers, policies, and other deterministic functions through direct inputs and outputs. Cover meaningful accepted and rejected cases, boundary values, and non-obvious branches. Do not enumerate equivalent permutations merely to increase coverage.

### Components And Hooks

Test a component when Blockout owns observable interaction, conditional content, validation feedback, focus behavior, navigation intent, or an accessibility contract that could regress. Interact through semantic roles, names, labels, and visible outcomes. Use `testID` only when no stable user-facing selector exists or a native smoke needs the same host element.

Do not assert internal state, hook calls, component trees, style objects, or incidental structure. Test a custom hook directly only when it owns reusable behavior that is clearer without a component.

### API, Navigation, And Providers

Test handwritten request adaptation, cache behavior, error mapping, and feature outcomes at the generated-client boundary. Use controlled responses or small local fakes; do not retest Orval.

Test route-owned redirects or deep-link normalization as ordinary functions when possible. Mount navigation only when router behavior is the contract.

Mock network and native provider boundaries, not the feature behavior under test. Verify owned lifecycle and recovery decisions without asserting the internals of Auth0, RevenueCat, ads, maps, notifications, or the operating system.

## Maintainability Rules

- Prefer real values, pure functions, and small explicit fakes over broad module mocks.
- Mock time, randomness, native APIs, or transport only when the scenario owns that boundary; restore global state after every test.
- Avoid broad snapshots, source scans, private-function access, arbitrary delays, retry-based stabilization, and tests that only prove rendering did not throw.
- Do not add production branches, test-only props, service locators, registries, or exports of private implementation details.
- Await supported user interactions and asynchronous rendering. Use `findBy*` or `waitFor`; never add sleeps.
- Keep tests independent from execution order, real credentials, production data, network availability, simulators, and provider sessions.
- Small duplication is preferable to a helper that hides the scenario.

## Native And Visual Boundaries

Jest proves owned behavior, not visual fidelity or provider SDK correctness. Do not add pixel snapshots or screenshot assertions to Jest. Use exact Figma nodes and runtime captures for visual changes. Use Expo Doctor and a relevant local build, simulator, device, or controlled smoke when native configuration or provider integration changes.

## Verification

- Run the narrowest relevant test while developing.
- Run the mobile test target before completion.
- Run generation and type checking when contracts, schemas, API adaptation, or types change.
- Run lint and export when routing, configuration, native boundaries, or rendering changes.
- Run formatting and repository diff-hygiene checks, and report intentionally skipped checks with the reason.
