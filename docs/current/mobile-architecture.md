# Mobile Architecture

## Objective

Blockout keeps the current Expo application behavior while moving toward the same simple ownership model used by
Maaatch: routes coordinate, feature modules own product screens, and shared code contains only proven cross-feature
foundations. Android and iOS remain the supported product surfaces. React Native Web remains a phone-sized local
verification surface, not a deployed product.

This is a handwritten architecture. OpenAPI, generated clients, generated models, and contract-first ownership remain
deferred until the mobile and gateway boundaries are stable.

## Source layout

The mobile source tree uses three top-level roles:

- `app`: Expo Router files, route groups, layouts, redirects, and native-intent registration;
- `modules/<feature>`: product screens and their feature-owned UI, hooks, validation, models, APIs, stores, and native
  adapters;
- `shared`: infrastructure and UI used by multiple active features.

`shared` currently owns:

- `api`: HTTP transport mechanics and error handling, not product-specific requests or models;
- `config`: environment-backed application and provider configuration;
- `hooks`: domain-neutral hooks used by multiple features;
- `lib`: small cross-feature functions with concrete active consumers;
- `model`: shared handwritten value types and transport enums used by more than one feature;
- `providers`: application-wide React providers, including platform-specific adapters;
- `storage`: the common secure-storage adapter and its Web implementation;
- `theme`: theme tokens and theme integration;
- `ui`: reusable visual and navigation primitives.

Advertising, application status, PDF viewing, and subscriptions own their native or provider adapters in their feature
modules. Application-wide provider composition stays at the route layout; provider-specific state does not become a
generic shared service. Empty placeholder folders and generic abstractions used only to complete a folder shape are not
permitted.

## Boundary rules

- Route files do not own substantial rendering, data access, request construction, or feature interaction state.
- Feature code stays inside its feature until at least two active features need the same behavior.
- Shared code must have multiple active feature consumers or enforce an application-wide technical invariant. A
  feature workflow stays in its module even when another feature links to it.
- API clients own HTTP calls. Handwritten transport types mirror the mobile gateway and stay distinct from
  screen-specific state.
- Session commands and changing session facts use separate contexts. Consumers subscribe only to the side they use,
  and session commands keep stable identities.
- TanStack Query owns remote facts. Feature hooks may coordinate optimistic cache updates, but they do not mirror
  query results into local component state. The shared Query provider maps native application focus and Expo network
  connectivity to Query lifecycle state.
- Required common and platform-specific public configuration is validated when the application starts. Optional
  provider configuration remains owned by the feature that uses it.
- Platform differences use Expo and React Native file resolution such as `.web.tsx`; runtime platform conditionals are
  kept only when file-level adapters cannot express the boundary clearly.
- Native and local Web authentication use separate public Auth0 clients against the same issuer and API audience. The
  Web adapter delegates to the official SPA SDK, keeps tokens in memory, and never introduces an application bypass.
- UI, route names, gateway calls, persistence keys, authentication, notifications, purchases, ads, maps, and media
  behavior remain unchanged during structural moves.

## Consolidation and design readiness

REF-036 treats repeated UI as an ownership problem, not as a reason to build a generic screen framework. A component,
hook, or style moves to `shared` only when at least two active consumers have the same semantic role and behavior, or
when it enforces an application-wide invariant. Similar-looking feature workflows keep their own composition, copy,
commands, and data ownership.

Keep it simple is a hard constraint. A small explicit component or direct feature implementation is preferred over a
generic helper, type utility, configuration object, wrapper layer, or abstraction that is harder to understand than the
code it replaces. Shared APIs use straightforward React Native props and concrete TypeScript types. They do not add
advanced generic typing, helper factories, registries, or indirection without a current, demonstrated need.

The following rules guide each feature slice:

- equivalent actions, feedback states, form scaffolds, bottom-sheet structure, entity presentation, search controls, and
  list behavior converge on one shared primitive;
- insignificant visual drift such as adjacent spacing, radius, or typography values converges on the closest established
  semantic token instead of preserving accidental one-off values;
- a real behavioral or semantic difference is represented by a named variant, a dedicated child component, or
  feature-owned composition; shared components do not accumulate unrelated boolean options;
- complete screens are not shared merely because their layouts look alike. The stable frame may be shared while each
  feature retains its content and interactions;
- an extraction must reduce both duplication and cognitive load. If it only shortens code or requires complex helpers
  and types, the explicit feature code remains in place;
- provisional tokens describe purpose rather than a specific numeric value. A later Figma token system may replace
  their values without requiring feature components to be rewritten;
- a module creates only the `api`, `hooks`, `model`, and `ui` folders it needs. Empty architectural placeholders are not
  permitted.

Shared form primitives own only repeatable presentation and interaction mechanics: field layout, cards, sheet-aware
inputs, modal/page frames, and submit footers. Each feature module continues to own its form values, validation schema,
request construction, native capabilities, and submit command. Similar form sheets do not justify a generic form hook
or schema-driven renderer.

The live decisions and consumers are recorded in the
[mobile consolidation register](mobile-consolidation.md). Every REF-036 slice updates that register so final cleanup can
prove what was shared, intentionally kept local, or removed.

## Verification

Every structural slice must keep the REF-028 baseline green:

- the Nx mobile TypeScript target;
- the focused Jest characterization tests;
- the Expo Web export;
- phone-sized Web inspection when rendered output or navigation composition changes;
- iOS and Android builds or launches when a native or platform-specific boundary changes.

Touched slices follow the repository mobile testing policy: production code stays testable through focused components,
explicit commands, pure logic where justified, and existing I/O boundaries. Tests exercise visible behavior through
React Native Testing Library and `userEvent`; they do not require a dependency container, test-only prop, mock registry,
or production branch. Tests prefer accessible roles and names, with literal stable feature-owned IDs reserved for
structural boundaries and future end-to-end selectors.

Moving a file without changing its behavior does not by itself require a new abstraction or a new test. Existing tests
must follow the source they protect so test ownership stays visible.
