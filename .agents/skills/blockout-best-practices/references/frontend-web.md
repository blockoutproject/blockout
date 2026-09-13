# Frontend Web Policy

Read this reference before changing a Next.js route, React component, frontend data boundary, form, view model, UI
helper, hook, localization boundary, browser/server log, or handwritten TypeScript contract.

This reference applies only to an existing or explicitly selected Next.js application. It does not prescribe a web
application for a mobile-only repository.

## Repository Inputs

The repository instructions and build configuration supply every concrete value used with this policy:

- product and behavior source authority;
- application, route, feature, shared, message, token, and generated-output locations;
- supported locales, public application boundary, and transport topology;
- installed form, schema, localization, generated-client, component, icon, styling, and data libraries; and
- generation, typecheck, build, formatting, and test commands.

Do not infer one of those values from examples, historical code, generated clients, another application, or this
portable policy.

## Product Gate

Frontend code is a product surface only when the source authority selected by the skill entry point and repository build configuration or an owning
accepted task authorizes it. Generated clients, historical prototypes, dormant routes, and existing service endpoints
do not authorize product behavior by themselves.

Before implementation:

1. identify the owning product source and accepted task;
2. verify that the route, user action, transport, permissions, copy, and visual authority are open for change;
3. retain current behavior when the task does not explicitly change it; and
4. stop when the required product or architecture decision is absent.

## Companion Guidance

Use the repository-selected framework, React, composition, component-system, accessibility, and visual-design skills
for the changed boundary. This policy owns frontend layering, data ownership, product gating, and boundary decisions;
companion skills do not override the repository's product or transport authority.

## App Router Boundaries

- Use App Router special files only for their framework role: route UI, shared segment UI, suspense fallback, segment
  error boundary, missing-resource handling, or HTTP endpoint.
- Keep route entries as coordinators. They may resolve request inputs, perform authentication and navigation decisions,
  load translations and route-level data, select a view, and compose the result.
- Put workflow reads, mutations, validation, request construction, projections, interaction state, and substantial
  rendering in named feature boundaries.
- Prefer a direct exhaustive branch for a closed route-state union. Do not introduce a registry, plugin system, or
  command bus for a fixed set of views.
- Keep product code in feature modules rather than framework-private folders when the code has a product owner.
- Use role-bearing filenames for loaders, actions, schemas, requests, and view models. Avoid generic helper or common
  modules that hide ownership.

## Module Layers

Use local module folders as role boundaries:

| Layer       | Responsibility                                           | May depend on                                 |
| ----------- | -------------------------------------------------------- | --------------------------------------------- |
| schemas     | parsed inputs and reusable validation primitives         | no local layer                                |
| config      | static UI configuration and option definitions           | schemas                                       |
| forms       | form-state contracts, field definitions, and composition | schemas and config                            |
| utilities   | named pure transforms and formatters                     | schemas and config                            |
| view models | transport-to-screen projection                           | generated boundary types, schemas, and config |
| UI          | rendering and interaction                                | preceding layers                              |

A utilities folder is a role boundary, not a dumping ground. Name transforms for the boundary they cross.

Move behavior to a shared boundary only when it is domain-neutral and has at least two active consumers. A documented
cross-cutting invariant may justify one earlier shared owner. Keep direct local code when extraction only moves or
renames an expression.

Treat file and function size as review signals, not automatic split limits. Split when one owner mixes route
coordination, reads, mutations, transformation, interaction state, and rendering or when independent reasons to change
are already visible.

## TypeScript Simplicity

- Use strict types at route inputs, form parsing, transport requests and responses, server actions, view-model mappers,
  and public module contracts.
- Prefer local inference for values that remain inside one function or component.
- Write the direct expression before introducing a type alias, generic helper, adapter, wrapper, or memoization hook.
- Add an abstraction only for multiple real consumers or an explicit product or technical invariant.
- Do not create handwritten mirrors of generated transport types.
- Do not wrap a generated schema merely to rename its parse operation.
- Keep a single-use helper only when it hides non-obvious parsing, security, error mapping, or source-gated behavior.
- Use memoization only for measured expensive work, a real memoized-child boundary, or a hook contract that requires a
  stable reference.
- Remove unused schema, type, helper, and component exports as soon as their last consumer disappears.
- Apply `code-documentation.md` to handwritten exports and extracted functions; explain boundaries and invariants,
  not obvious syntax or property copies.

## Server And Client Components

- Default route pages, layouts, and data-loading shells to Server Components.
- Add a Client Component boundary only for client state, browser APIs, event handling, client-only hooks, or framework
  error handling.
- Client Components must not be asynchronous.
- Values crossing from server to client must be serializable plain data.
- Use values supported by the framework serialization contract. Map application/provider instances to focused
  transport or view data; do not introduce a generic serializer or assume JSON is the React serialization protocol.
- Server Actions are the deliberate exception for function props and require an owning task for the user action.
- Prefer a small interactive island within server-rendered content over moving a whole workflow to the client.
- Follow the active Next.js request API contract for route inputs, cookies, and headers.
- Use framework navigation primitives for internal navigation and keep navigation control-flow errors outside broad
  catch blocks.

## Generated Clients And Data Ownership

- Treat generated clients, models, and runtime schemas as boundary artifacts, never as product decisions.
- Never hand-edit generated output.
- Use the repository-selected public application boundary; frontend code must not call an internal service merely
  because a generated client exists.
- Keep server-oriented generated calls out of Client Components.
- Prefer server-owned reads when the route can render from a request-time result.
- Add a client-owned query only for a real interactive lifecycle such as polling, background refresh, focus refetch,
  retry, optimistic update, invalidation, or a long-lived cache-owning island.
- Scope a client data provider to the smallest feature or route segment that needs it. Do not mount a dormant global
  provider.
- A client query requires an authorized browser-safe bridge. Do not create a bridge only to use a client data library.
- Do not let server-rendered and client-cached ownership overlap without explicit hydration, staleness, invalidation,
  and revalidation rules.
- Server Actions remain the default mutation boundary. Use a client mutation only when the workflow is already
  client-owned and requires optimistic or cache behavior.

## Forms And Validation

- Use the central form and schema exports selected by the repository instructions.
- Default to native forms, Server Actions, module schemas, contract validation, and framework action state for
  submission feedback.
- Use a client form-state library only for interaction that needs dynamic fields, multi-step recovery, asynchronous
  validation, client-owned cross-field behavior, or comparable focus control.
- Keep schemas and field configuration outside component bodies.
- Generated schemas validate transport shape; a handwritten UI schema still owns coercion, defaults, localized
  messages, cross-field rules, and form-only fields.
- Search existing module and shared validation primitives before adding a parser or coercion helper.
- Centralize a reusable validation primitive only after at least two forms need it.
- Use generated enum values directly when the configured schema library supports them.
- Put form-to-transport transforms in a request-oriented utility and transport-to-UI transforms in view models.
- Preserve required command and concurrency fields when the owning task authorizes a mutation.
- Store only user-edited and submission-lifecycle state. Derive labels, selections, defaults, and projections during
  render when possible.
- Do not use an effect to synchronize derivable form state.
- Do not choose detailed validation behavior for a future screen before its owning task defines the product state.

## View Models And Errors

- Generated types may appear at transport boundaries and inside view-model mappers.
- Create a screen-specific view model only when rendering needs a different shape.
- Keep mappings deterministic and side-effect free.
- Use stable machine-readable error codes as the translation source.
- Keep success data and stable error descriptors explicit at public loader and action boundaries.
- Preserve errors normalized by the public application boundary and map unknown codes to an explicit fallback.
- Never expose tokens, raw payloads, stack traces, downstream bodies, or sensitive details in UI messages.
- Choose a segment error boundary, local error state, missing-resource result, redirect, or form action state according
  to the caller's documented recovery path.

## Localization And Product Copy

- Use the configured localization system and every supported locale declared by the repository instructions.
- Keep user-visible text in the configured message boundary rather than reusable UI logic.
- Treat all visible copy as production product copy.
- Explain what the user can see, choose, save, fix, or retry.
- Do not expose task state, issue identifiers, service mechanics, raw revisions, source gates, authentication plumbing,
  contract names, or readiness internals unless an accepted task opens a diagnostic or administrative surface.
- Translate stable application error codes rather than displaying backend detail as final copy.

## Hooks And Component Ownership

- Keep feature hooks close to the UI that owns them.
- Move a hook to a shared boundary only when its behavior is domain-neutral and has multiple active consumers.
- Do not use a hook to hide a product decision, generated-client call, or cross-service orchestration.
- Avoid effects for data synchronization when server rendering, actions, event handlers, form state, or derived render
  state expresses the behavior.
- Keep UI components focused on rendering and interaction; parsing, request construction, mapping, and option
  derivation belong to earlier layers.
- Use the configured component system from the repository root and preserve its accessibility and composition
  contracts.
- Prefer an installed icon before adding custom icon markup.
- Do not expose inactive, internal, experimental, or source-gated capabilities as available user actions.

## Styling, Tokens, And Accessibility

Use this ownership order:

1. reuse an existing semantic theme token;
2. reuse an existing shared primitive or built-in variant;
3. use a component-owned variant for meaningful component states;
4. extract a component when repeated structure and styling form a real concept with multiple consumers;
5. keep one-off composition local; and
6. use arbitrary values, inline styles, or custom CSS only for justified dynamic, third-party, complex-selector, or
   singular geometry.

Additional rules:

- Prefer semantic tokens over raw palette values when a token already owns the decision.
- Give a light/dark decision one semantic owner rather than repeated per-consumer overrides.
- Add a token only for a repeatable design decision.
- Do not extract a generic wrapper merely because a class list is long.
- Keep complete statically detectable utility names and map state to complete variants.
- Remove conflicting utilities instead of relying on ordering or overrides.
- Preserve keyboard access, focus visibility, semantic structure, labels, error association, reduced-motion behavior,
  and sufficient contrast.
- Styling cleanup must preserve the accepted visual authority and must not silently redesign the interface.

## Logging And Documentation

- Do not leave committed console logging.
- Never log authorization material, cookies, credentials, full payloads, personal data, or sensitive user data.
- Follow the selected [logging policy](logging.md) for server-side frontend logs.
- Log only at meaningful technical boundaries such as error translation, endpoint failure, action failure, or
  monitoring integration.
- Prefer framework error boundaries, action state, route responses, and monitoring hooks over ad hoc logging.
- Follow the selected [code-documentation policy](code-documentation.md) for real handwritten TypeScript
  boundaries.
- Never document generated files manually.

## Verification

Classify the changed boundary through the repository's
[risk-based validation policy](testing-and-validation.md).

For guidance-only work, validate changed links, routing ownership, terminology, formatting, and diff hygiene. For
source work, add the configured type, lint, test, build, browser-interaction, visual, contract, or generated-client
checks required by every affected boundary. Route structure, metadata, server/client ownership, and significant UI
behavior require the broader configured web build evidence.

Report every successful, failed, skipped, and unavailable check separately.
