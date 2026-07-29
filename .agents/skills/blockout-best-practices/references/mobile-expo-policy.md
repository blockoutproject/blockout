# Expo Mobile Policy

Read this before changing the Expo application, React Native screens, mobile API clients, Formik forms, Yup schemas, or
mobile transport models.

## Product And Design Authority

- The repository mobile profile owns supported platforms and whether Web is an active target. Do not add another target,
  compatibility adapter, OAuth client, or verification path without an explicit task.
- The running application and current source own behavior, navigation, authorization, data, accessibility, and native
  provider integration. The canonical file selected by the repository design profile owns visual composition within
  those boundaries.
- Preserve the product identity and current behavior declared by the repository profiles unless the active roadmap task
  explicitly changes them. Do not add another layout family, theme, brand layer, or generic UI framework.
- Use the certified Figma foundations and components. Do not infer a new token, component family, or interaction from a
  one-off screen value.

## Structure And Boundaries

- Keep Expo Router files in the route location declared by the repository profile and limit them to route registration,
  navigation, layouts, redirects, and top-level composition. Product screens live in configured feature-owned UI
  locations.
- Keep feature-owned UI, hooks, validation, and view models inside their feature. Move UI to the configured shared UI
  location only when at least two active features use the same responsibility and behavior, or when it enforces an
  application-wide technical invariant.
- Similar appearance alone does not create shared ownership. Keep one-off screen layout and business composition local.
- Use the API, configuration, provider, theme, and shared UI locations declared by the repository profile for those
  technical responsibilities.
- Keep generated Orval clients and transport models at the API boundary. Do not hand-edit, rename, re-export, or wrap
  generated files merely to hide their generated names.
- Repository-owned request, response, and query fields use the naming convention declared by the repository profile.
  Do not add recursive case converters or transport aliases.
- Complete resource mirrors must match the owning backend service. UI-specific view state may be smaller and must not
  masquerade as the complete transport resource.
- Keep provider and native-framework values at their adapters. Never place provider payloads or platform constants in
  shared business models.

### Feature Roles

Use only the role folders an active feature needs:

```text
<feature-root>
├── api
├── forms
├── hooks
├── schemas
├── ui
├── utils
└── view-models
```

- `api` owns feature queries, mutations, and transport-to-feature mapping.
- `schemas` owns Yup validation reusable across a feature boundary.
- `forms` owns Formik composition and submitted values.
- `hooks` owns stateful feature behavior and orchestration.
- `view-models` adapts remote or application data to deliberate UI-ready values.
- `ui` owns screens, sections, and feature components.
- `utils` contains only small pure feature-local functions with explicit names; it is not a generic utility bag.

Do not create empty role folders or a feature framework. A small feature may keep a few files directly under its module.

## TypeScript Simplicity

- Let inference carry local implementation types. Add explicit types at public props, hooks, API mappings, form values,
  stable shared contracts, and boundaries where inference becomes unclear.
- Prefer discriminated unions and focused object types over boolean mode combinations, inheritance, or generic
  configuration schemas.
- Do not wrap a generated type merely to rename it. Create a view model only when UI semantics actually differ.
- Avoid `any`, unsafe casts, non-null assertions, and duplicated transport interfaces. Narrow unknown input at its
  boundary.
- Prefer direct expressions and small named functions. Do not create generic serializers, registries, factories,
  dependency-injection containers, base hooks, or type-level frameworks for hypothetical reuse.
- Keep constants near their owner. Promote one to shared configuration only when several active features require the
  same invariant.

## Remote Data And Generated Clients

- The configured generator creates the public application client and transport models from its owning OpenAPI source.
  Mobile does not generate or call every internal service client.
- Never hand-edit generated output. Add behavior in a handwritten feature adapter, query, mutation, or mapper.
- Use TanStack Query for remote state, cache ownership, retries, invalidation, and request lifecycle.
- Keep query keys deterministic and feature-owned. Invalidate the narrowest owner-controlled data after mutations.
- Do not copy remote data into local or provider state merely to mirror it. Derive UI values during mapping or
  rendering.
- Preserve current timeout, cancellation, retry, offline, and error behavior unless a task explicitly changes it.
- Do not add a global provider until an active consumer needs the lifecycle; remove providers whose final consumer is
  removed.

## Forms And Validation

- Formik owns form state, touched state, submission lifecycle, and field presentation.
- Yup owns client-side shape and immediate usability validation.
- Keep submitted form values distinct from generated request models when UI inputs need parsing, defaults, or
  composition.
- Map form values to generated requests at the feature API boundary.
- Reuse a schema only when several active forms enforce the same user-facing rule.
- Do not duplicate server-only authorization or persistence constraints in the client.
- Preserve server errors after submission and map stable field errors only when the contract provides them.
- Do not introduce React Hook Form, Zod, or a second form and validation stack without an explicit migration task.

## Hooks And View Models

- A hook owns stateful React behavior; a pure transformation remains a function.
- Keep hooks close to their feature. Promote one to shared only after real multi-feature use proves identical semantics.
- Effects synchronize with an external system. Do not use effects to derive render state, copy props, or sequence
  ordinary application logic.
- Keep view models immutable and UI-oriented. They may format, group, or label owner data but must not masquerade as a
  complete backend resource.
- Do not hide navigation, mutation, analytics, and formatting behind one manager hook.

## Tokens And Styling

- Keep one exported code-owned token vocabulary in the configured theme location, aligned with the semantic variables
  certified by Figma. Features import this shared authority instead of defining token copies. They consume semantic
  roles such as surface, content, border, action, status, spacing, radius, and typography rather than primitive palette
  values.
- Expose the supported theme and token surface through one narrow public entry point selected by the repository
  profile. Keep primitives and implementation details private when consumers do not need them; do not spread theme
  exports across feature barrels.
- Safe-area insets, keyboard dimensions, and device measurements are runtime inputs, not design tokens.
- Normalize incidental spacing, radius, type, and effect drift to the nearest approved token. Add a token only when a
  certified composition or repeated active use proves a distinct semantic role.
- Use `StyleSheet.create` for stable named styles and token-backed component styles. Keep a small dynamic value inline
  when extracting it would obscure the component. Do not introduce Tailwind, NativeWind, CSS, a styling runtime, style
  factories, or generated style code.
- Prefer flex layout, `gap`, and container padding. Use `useWindowDimensions` only when layout truly depends on the
  available native viewport; do not read fixed device dimensions at module load time.
- Preserve native safe areas through navigation containers and `react-native-safe-area-context`. Use a virtualized list
  such as the existing FlashList for unbounded collections; use a ScrollView for bounded static or form content.
- Prefer modern supported React Native styles when touching an affected component, including continuous rounded
  corners and `boxShadow`, but do not mass-rewrite unrelated screens.

## Components And Composition

- Give every component one clear responsibility and explicit inputs. Prefer children and small named subcomponents over
  render-prop APIs or generic configuration objects.
- Share a screen shell only when multiple active screens use the same layout responsibility and behavior, such as native
  safe-area ownership, an entity header, or the same loading/empty/error composition. Keep business data, commands,
  navigation decisions, and feature sections in the owning screen.
- Use a finite `variant` value when one component has a small, coherent family of appearances. Create separate
  feature-owned compositions when variants change responsibility, state ownership, or interaction.
- Ordinary state booleans such as `disabled`, `loading`, `selected`, or `expanded` are valid. Do not accumulate unrelated
  booleans whose combinations create hidden component modes.
- Use compound components or context only when several public parts genuinely coordinate shared state. A button, chip,
  field, row, or card does not need that machinery.
- Do not create wrappers for every React Native primitive, prop-forwarding abstractions without behavior, registries,
  factories, generic type systems, configuration-driven generic screens, or speculative component skeletons.
- Prefer `Pressable` for touched custom controls and `expo-image` for application images. Preserve existing native
  provider components when they own the interaction.
- Keep expensive work outside virtualized rows, use stable domain keys, and avoid subscribing a whole screen to state
  needed by one small component.

## Accessibility And Native Behavior

- Every interactive element exposes an accurate role, accessible name, state, and useful hint when the action is not
  obvious. Keep a minimum 44-point touch target.
- Support system text scaling and avoid fixed heights that clip translated or enlarged text. Mark important copyable
  data as selectable where appropriate.
- Preserve loading, empty, error, disabled, destructive, keyboard, focus, back-navigation, and cancellation behavior.
- Prefer native stack, modal, sheet, menu, and control behavior when it matches the existing product. Platform-specific
  code is justified only by a real iOS or Android capability or presentation difference.
- Keep Formik and Yup validation aligned with the submitted request without duplicating unrelated backend rules.
- Keep remote state in TanStack Query and application-wide state in the established providers. Do not mirror derived
  state or add effects only to coordinate rendering.

## API Errors And User Feedback

- Branch on stable `ProblemDetail` machine codes and HTTP categories, not backend detail text.
- Translate technical failures into concise, actionable mobile copy. Never display stack traces, SQL, provider
  payloads, raw tokens, internal hosts, or unstable exception messages.
- Preserve field, screen, retryable, offline, authentication, authorization, conflict, and unexpected error
  distinctions where recovery differs.
- Keep error translation in the feature API or view-model boundary, or in one established shared technical adapter. Do
  not scatter code-to-copy switches across components.
- A retry control repeats a safe owned operation and preserves loading, disabled, and cancellation behavior.

## Logging And Documentation

- Follow `logging-policy.md`. Log lifecycle and recovery evidence at technical boundaries, never secrets, tokens,
  personal data, full provider bodies, or duplicate UI notifications.
- Do not commit `console.log` debugging.
- Follow `code-documentation-policy.md`. Document shared handwritten contracts and non-obvious native or provider
  invariants; do not narrate JSX, styles, or obvious state updates.

## Naming And Exports

- Name handwritten files in kebab-case. Export React components and types in PascalCase; export hooks, functions, props,
  and variables in camelCase.
- Preserve framework-owned Expo Router names such as `_layout.tsx`, dynamic route segments, route groups, and required
  default route exports. Preserve platform suffixes such as `.ios.tsx` and `.android.tsx` when a real native difference
  exists.
- Generated names and files remain generator-owned and are exempt from handwritten naming rules.
- Prefer direct named exports and explicit imports from the owning file. A narrow entry point may expose the supported
  theme surface or one cohesive shared UI family; do not add a global component registry, broad application barrel, or
  deep barrel hierarchy.
- Apply naming changes as files are migrated by the owning roadmap slice. Do not create a standalone mass rename that
  mixes unrelated behavior.

## Publication And Completion

- Keep native and provider credentials outside Git. Never commit Expo caches, native build output, `.env.local`, tokens,
  exported sessions, personal test data, or device-specific files.
- Use the official provider SDK, Authorization Code with PKCE, exact callback allowlists, and issuer and audience
  validation. Never add an authentication bypass for local or automated tests.
- Use the visual source and comparison surface declared by the repository design profile for Figma synchronization.
  Other supported runtimes retain their technical validation but are not visual authorities unless the profile says
  otherwise. Unit tests prove behavior; configured runtime captures and Figma comparison prove appearance.
- Run the formatting, lint, typecheck, focused test, complete mobile test, and diff commands declared by the repository
  router before publishing a mobile slice. Add Expo Doctor or an unsigned native build/launch when dependencies,
  configuration, or a native boundary changes.
- Run generated-client parity or regeneration evidence when an OpenAPI/mobile API boundary changes.
- Verify Formik/Yup behavior, stable API error handling, and TanStack Query ownership when those boundaries change.

These rules follow the current React Native guidance for
[`StyleSheet`](https://reactnative.dev/docs/stylesheet),
[`useWindowDimensions`](https://reactnative.dev/docs/usewindowdimensions), and
[accessibility](https://reactnative.dev/docs/accessibility), together with Expo's
[`react-native-safe-area-context`](https://docs.expo.dev/versions/latest/sdk/safe-area-context/) guidance.
