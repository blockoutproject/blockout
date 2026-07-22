# Blockout Expo Mobile Policy

Read this before changing the Expo application, React Native screens, mobile API clients, Formik forms, Yup schemas, or
mobile transport models.

## Product And Design Authority

- Blockout mobile supports iOS and Android only. Do not add a Web target, Web compatibility adapter, browser OAuth
  client, or browser-only verification path.
- The running application and current source own behavior, navigation, authorization, data, accessibility, and native
  provider integration. The canonical `Blockout - Product Design` Figma file owns visual composition within those
  boundaries.
- Preserve the dark Blockout identity and current product behavior unless the active roadmap task explicitly changes
  them. Do not add a desktop layout, light theme, new brand layer, or generic UI framework.
- Use the certified Figma foundations and components. Do not infer a new token, component family, or interaction from a
  one-off screen value.

## Structure And Boundaries

- Keep Expo Router files under `src/app` and limit them to route registration, navigation, layouts, redirects, and
  top-level composition. Product screens live under `src/modules/<feature>/ui`.
- Keep feature-owned UI, hooks, validation, and view models inside their feature. Move UI to `src/shared/ui` only when
  at least two active features use the same responsibility and behavior, or when it enforces an application-wide
  technical invariant.
- Similar appearance alone does not create shared ownership. Keep one-off screen layout and business composition local.
- Use `src/shared/api` for HTTP mechanics, `src/shared/config` for application configuration,
  `src/shared/providers` for application-wide providers, `src/shared/theme` for tokens and theme ownership, and
  `src/shared/ui` for proven reusable primitives.
- Keep generated Orval clients and transport models at the API boundary. Do not hand-edit, rename, re-export, or wrap
  generated files merely to hide their generated names.
- Blockout-owned request, response, and query fields use native camelCase. Do not add recursive case converters or
  transport aliases.
- Complete resource mirrors must match the owning backend service. UI-specific view state may be smaller and must not
  masquerade as the complete transport resource.
- Keep provider and native-framework values at their adapters. Never place provider payloads or platform constants in
  shared business models.

## Tokens And Styling

- Keep one exported code-owned token vocabulary in `src/shared/theme`, aligned with the semantic variables certified by
  Figma. Features import this shared authority instead of defining token copies. They consume semantic roles such as
  surface, content, border, action, status, spacing, radius, and typography rather than primitive palette values.
- Expose the supported theme and token surface through one narrow `src/shared/theme` public entry point. Keep primitives
  and implementation details private when consumers do not need them; do not spread theme exports across feature
  barrels.
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

## Public Repository And Completion

- Keep native and provider credentials outside Git. Never commit Expo caches, native build output, `.env.local`, tokens,
  exported sessions, personal test data, or device-specific files.
- Use the official provider SDK, Authorization Code with PKCE, exact callback allowlists, and issuer and audience
  validation. Never add an authentication bypass for local or automated tests.
- Use the iOS simulator as the visual source and comparison surface for Figma synchronization. Android remains a
  supported runtime and must keep its technical validation, but it is not a second visual capture or Figma authority.
  Unit tests prove behavior; iOS captures and Figma comparison prove appearance.
- Run formatting, lint, typecheck, the focused tests, the complete mobile Jest suite, and `git diff --check` before
  publishing a mobile slice. Add Expo Doctor or an unsigned native build/launch when dependencies, configuration, or a
  native boundary changes.

These rules follow the current React Native guidance for
[`StyleSheet`](https://reactnative.dev/docs/stylesheet),
[`useWindowDimensions`](https://reactnative.dev/docs/usewindowdimensions), and
[accessibility](https://reactnative.dev/docs/accessibility), together with Expo's
[`react-native-safe-area-context`](https://docs.expo.dev/versions/v55.0.0/sdk/safe-area-context/) guidance.
