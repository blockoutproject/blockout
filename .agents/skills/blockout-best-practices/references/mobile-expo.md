# Expo Mobile Architecture

Apply this policy to the Expo application, React Native, Expo Router, TypeScript, Formik, Yup, and mobile API adaptation. Treat `docs/architecture/blockout-mobile-model-v1.md` and `docs/architecture/blockout-mobile-design-system-v1.md` as the canonical architectural boundaries. Use the focused technical skills routed by the task in addition to this repository policy.

## Ownership And Structure

- `src/app` owns routing, layouts, redirects, deep-link entry, and route-level composition.
- A product module owns its use-case UI, schemas, forms, hooks, view models, and API adaptation.
- `src/shared` contains stable domain-neutral UI and technical boundaries used by several active modules.
- Generated Orval clients remain at the transport boundary.

Organize by feature before technical category. Keep a small screen local until another active consumer or a meaningful invariant justifies extraction. Do not create generic `utils`, `helpers`, `services`, manager hooks, component registries, or broad barrels that hide ownership.

## Routing, Native Boundaries, And Data

- Use Expo Router as the single navigation authority. Keep route files thin and render feature-owned screens.
- Use platform APIs or native modules only behind an owned adapter. Platform-specific files require a real iOS or Android behavior difference.
- Consume the generated Orval client instead of handwritten endpoint types or request wrappers.
- Use TanStack Query for remote state, request lifecycle, retries, cache ownership, and invalidation. Keep deterministic query keys with the owning feature.
- Do not copy remote data into provider or component state merely to mirror it.
- Keep generated models, provider payloads, and platform constants out of shared business or view models.
- Preserve timeout, cancellation, retry, offline, and error behavior unless the issue explicitly changes it.

## Components And State

- Keep state with the narrowest owner. Derive values instead of synchronizing duplicate state.
- An effect synchronizes with an external system; do not use effects to derive render state, copy props, or sequence ordinary application logic.
- Extract a hook only when it owns coherent reusable stateful behavior. Keep a pure transformation as a function.
- Prefer composition over boolean-prop variants that encode unrelated modes.
- Use memoization only for measured cost, required referential stability, or a library contract that needs it.
- Avoid speculative providers, context layers, wrappers around every React Native primitive, generic render engines, and configuration-driven screens.
- Use virtualized lists for unbounded collections and keep expensive work outside rows. Use stable domain keys.

## Forms And Validation

Use Formik for established form state and Yup for immediate user-facing validation. Keep submitted form values distinct from generated requests when input, parsing, defaults, or composition differ. Map once at the feature API boundary.

Server-side validation remains authoritative. Preserve stable field and form errors when the contract exposes them. Do not duplicate authorization or persistence constraints in the client. Do not add a second form or schema stack without an explicit migration issue.

## Models, Errors, And Feedback

- Add a feature view or form model only when display, editing, normalization, or composition differs semantically from the generated transport model.
- Keep mapping as focused pure functions and follow `mapping.md`.
- Branch on stable `ProblemDetail` codes and HTTP categories, not backend detail text.
- Keep field, screen, retryable, offline, authentication, authorization, conflict, and unexpected failures distinct where recovery differs.
- Never display stack traces, SQL, provider payloads, raw tokens, internal hosts, or unstable exception messages.

## UI, Styling, And Accessibility

- Use the established theme tokens and shared components before creating a replacement.
- Use `StyleSheet.create` for stable named styles and keep small genuinely dynamic values inline. Do not add another styling runtime without an explicit migration issue.
- Prefer flex layout, `gap`, container padding, safe-area ownership, and `useWindowDimensions` when layout truly depends on the viewport.
- Prefer `Pressable` for custom controls and `expo-image` for application images when they fit the boundary.
- Preserve native stack, modal, sheet, menu, keyboard, back-navigation, focus, and cancellation behavior.
- Every interactive element exposes an accurate role, accessible name, state, and useful hint when needed. Keep at least a 44-point touch target, support text scaling, and avoid fixed heights that clip content.
- Cover relevant loading, empty, error, disabled, selected, destructive, and offline states defined by product behavior and the design source.

## Authentication, Providers, And Configuration

- Follow `authentication.md` for Auth0 and tokens.
- Keep RevenueCat, ads, maps, notifications, and other native providers behind their owned adapters and lifecycle boundaries.
- Use typed configuration and fail clearly when required public values are absent. Never put secrets in `EXPO_PUBLIC_*` variables.
- Do not add provider mocks, bypasses, or production branches solely for tests.

## Nx And Generated Code

- Run generation, lint, type checking, tests, and export through Nx targets.
- Keep project boundaries explicit and dependencies directed from the application toward owned libraries.
- Do not hand-edit or commit generated Orval output, Expo caches, native build output, exports, or local configuration.
- Add a library only when it has a stable owner and multiple real consumers or an independently enforced boundary.

## Logging, Documentation, Testing, And Verification

- User-visible failures belong in UI state. Follow `logging.md` for operational diagnostics.
- Follow `code-documentation.md` for exported contracts and non-obvious native or provider decisions.
- Follow `mobile-testing.md` when mobile behavior or tests change.
- Run generation, formatting, lint, type checking, tests, and export.
- Run Expo Doctor or the relevant unsigned native build and launch when dependencies, configuration, native modules, routing, or platform-specific behavior change.
- Review generated-type containment, accessibility, supported platform states, safe areas, provider lifecycles, and ignored outputs.
