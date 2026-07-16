# Blockout Frontend Mobile Policy

Read this reference before adding or changing Expo Router routes, React Native components, mobile data access, forms,
view models, hooks, app-wide providers, native integrations, EAS configuration, or TypeScript documentation in
`apps/frontend/mobile`.

## Core Rule

The deployed Expo application is a Blockout product surface. Change its behavior only when current production source,
an authoritative product or architecture document, or an explicit user decision authorizes the change. The migration
roadmap authorizes structural convergence; it does not authorize new screens, flows, permissions, monetization,
tracking, notification behavior, or backend capabilities.

Generated clients, historical source, Maaatch screens, installed native packages, and existing backend endpoints are
not product sources by themselves. Follow [`baseline-v1-policy.md`](baseline-v1-policy.md) whenever a structural change
could alter a mobile flow or visible behavior.

Do not bulk-reorganize the imported application under this policy. MRG-501 owns the full mobile architecture audit,
MRG-504 owns the durable mobile architecture and design-system documents, and MRG-505 owns later skill alignment. Apply
the boundaries below incrementally to new or task-owned code while preserving production behavior.

## Related Policies And Skills

This policy owns mobile placement, layering, state, native-boundary, and verification rules. Also load the repository
references required by the work:

- [`contract-first.md`](contract-first.md) before changing an API shape, DTO, error, endpoint, or future generated
  client. Mobile generation is not active until the roadmap configures it.
- [`environment-configuration-policy.md`](environment-configuration-policy.md) before changing Expo configuration,
  EAS variables, public runtime values, or the Google Services file path.
- [`logging-policy.md`](logging-policy.md) before adding, changing, or retaining diagnostic output.
- [`code-documentation-policy.md`](code-documentation-policy.md) for touched exported hooks, providers, mappers, stores,
  and other handwritten TypeScript boundaries.
- [`nx-workspace-policy.md`](nx-workspace-policy.md) when changing the Expo project, Nx targets, dependencies, or shared
  library ownership.

MRG-106 owns the authoritative mapping of Maaatch's generic React and TypeScript skills to Blockout. Until that task is
complete, do not import Next.js, browser-only, Tailwind, shadcn, or Server Component guidance into the Expo application
by analogy.

## Current Project Placement

The mobile application lives at `apps/frontend/mobile` and is inferred by the Nx Expo plugin as `@blockout/mobile`.
Root npm workspaces and the root lockfile own its JavaScript dependencies.

Use the existing folders according to their current roles:

| Path | Role |
| --- | --- |
| `src/app/**` | Expo Router route files, layouts, protected-route gates, and route coordination |
| `src/components/<domain>/**` | Domain screen content and interaction components |
| `src/components/common/**` | Proven cross-domain mobile UI primitives and feedback states |
| `src/hooks/<domain>/**` | Domain queries, mutations, subscriptions, and derived interaction behavior |
| `src/api/**` | Current handwritten HTTP and mobile-gateway boundary |
| `src/context/**` | App-wide providers for APIs, authentication/session, purchases, and theme |
| `src/types/**` | Current handwritten boundary and screen types pending contract migration |
| `src/utils/**` | Named pure operations, platform bridges, and deliberately persisted local stores |
| `src/theme/**` | Mobile theme values and reusable visual constants |
| `src/config/**` | Public runtime configuration and platform-specific integration configuration |
| `assets/**` | Bundled fonts, images, and current legal content |
| `plugins/**` | Expo config plugins that change native projects during prebuild |

Do not introduce a parallel `modules`, `features`, `services`, `lib`, design-system, state, or API hierarchy without the
roadmap task that defines its ownership and migration path. When touching current code, improve role-bearing names and
local boundaries without moving unrelated files.

Use descriptive filenames for extracted roles, such as `match-list-query.ts`, `profile-form-request.ts`,
`notification-link.ts`, or `team-view-model.ts`. Avoid new generic `utils.ts`, `helpers.ts`, `common.ts`, `service.ts`,
and `types.ts` dumping grounds. Existing generic files are migration evidence, not a pattern to expand.

## Route And Screen Boundaries

Expo Router files under `src/app/**` are route coordinators. A route may read typed path parameters, apply navigation
or session gates, configure the route shell, select screen state, and compose domain components. Keep API request
construction, query-key policy, DTO projection, form validation, and substantial rendering in named boundaries outside
the route when those responsibilities are independently meaningful.

Use Expo Router files for their actual roles:

- `_layout.tsx` owns the navigator or provider boundary for its route segment;
- route groups such as `(tabs)` organize navigation without changing the URL;
- dynamic files such as `[id].tsx` own typed route parameter entry points;
- `+native-intent.tsx` owns native-intent rewriting only;
- modal presentation remains explicit in navigator options;
- protected routes use the established `Stack.Protected` and `Tabs.Protected` gates rather than redirect effects when
  the navigator can express the rule.

Use typed Expo Router destinations and `router`, `Link`, or navigator actions for in-app navigation. Keep external URL
opening, notification deep links, store links, and PDF links behind named platform utilities that validate the target
and handle failure safely. Do not construct navigation paths from untrusted payloads without validation.

Root layouts may compose app-wide providers and native event bridges. Do not add a provider at the root merely because
a package exposes one. Root ownership is justified only when multiple active route families need the same lifecycle,
cache, or native integration. Keep provider order explicit when authentication, API clients, purchases, bottom sheets,
gesture handling, and navigation depend on one another.

## Mobile Layers And Ownership

Preserve these role boundaries even while the current directory structure remains incremental:

| Boundary | Owns | Must not own |
| --- | --- | --- |
| Route | navigation entry, route params, screen composition | HTTP details, broad DTO mapping, reusable UI |
| Domain hook | query/mutation policy, subscriptions, derived workflow state | rendered layout, unrelated domains |
| API client | transport, auth attachment, case conversion, endpoint call | screen state, product copy, navigation |
| View model or named transform | deterministic API-to-screen or form-to-request mapping | network calls, hooks, native effects |
| Domain component | domain rendering and user interaction | global session bootstrapping, raw transport setup |
| Common component | proven cross-domain native UI behavior | domain rules or one-screen convenience wrappers |
| Provider or store | deliberate shared lifecycle or state ownership | arbitrary values that can stay local or derived |

Move a primitive into `components/common/**` only when it is domain-neutral and has at least two active consumers, or
when it encodes one documented cross-cutting mobile invariant. Keep one-screen components with their owning domain.

Extract an abstraction only when it has at least two real callers or protects an explicit product, API, security,
platform, or native-lifecycle invariant. A named one-call transform is still appropriate when it isolates non-obvious
parsing or boundary mapping. Keep direct code when extraction only moves or renames an expression.

## Architecture Review Signals

Review ownership when a file grows beyond roughly 300 lines, a function or component grows beyond roughly 80 lines,
or one file mixes several of route coordination, transport, projection, interaction state, native effects, and
rendering. These are review signals, not automatic split limits. Keep a larger file when its responsibility remains
coherent, and split a smaller file when its parts have independent reasons to change.

Also review the boundary when:

- a component imports an API client and also builds a complex request or response projection;
- a hook combines unrelated query keys, native subscriptions, and navigation;
- a provider exposes values used by only one leaf screen;
- the same server data is copied into TanStack Query, context, Zustand, and component state;
- Android and iOS behavior diverges through scattered inline `Platform` branches;
- a shared component accumulates domain-specific boolean props.

Do not turn these signals into adjacent cleanup during a focused migration task. Record necessary follow-up in the
roadmap phase that owns it.

## TypeScript Simplicity

- Use TypeScript to protect boundaries: route parameters, environment projections, API inputs and outputs, query
  results, form submission values, persisted stores, native event payloads, view models, and exported component props.
- Prefer local inference for values that stay inside one function or component. Do not add aliases, wrappers, generics,
  adapters, or explicit type parameters when inference expresses the same contract clearly.
- Do not create handwritten mirrors of current or future generated DTOs. A handwritten type is justified when it is a
  screen-specific view model, local form model, persisted-state contract, or platform boundary.
- Keep discriminated unions direct for finite screen states such as loading, empty, error, and ready. Do not replace a
  closed state set with a registry or plugin mechanism.
- Avoid one-call parser wrappers, request builders that only copy local values, and helper functions whose names repeat
  their single expression.
- Avoid `useMemo` and `useCallback` for cheap values or simple render expressions. Use them when they stabilize a real
  hook or memoized-child contract, protect a query key from mutable input, or avoid measurably expensive work.
- Keep comments and TSDoc for actual boundaries, invariants, platform differences, and non-obvious transforms. Do not
  narrate JSX or TypeScript syntax.

When simplifying a boundary, search for removed symbols and imports before validation. Do not combine simplification
with a behavioral rewrite unless the task owns both.

## Remote Data And API Access

The current application has active TanStack Query consumers and one root `QueryClientProvider`. TanStack and future
Orval integration remain owned by `apps/frontend/mobile` because Blockout has one React application. Preserve the
current provider lifetime and defaults until MRG-203 introduces the mobile-local boundary.

- Access current API clients through `ApiProvider` and `useApis`; do not instantiate competing clients in screens or
  hooks.
- Keep authentication attachment and unauthorized handling in the established API/session boundary. Never pass access
  tokens through route params, component props, query keys, logs, or persisted client state.
- Use the current `MobileGatewayApi` facade for mobile product calls. Do not revive direct service clients or add a new
  endpoint merely because a backend route exists.
- Route generated Orval clients and hooks through the single mobile-owned query client, auth/error transport, and
  module boundaries. Do not create a shared TanStack package without a second real application consumer.
- Keep query keys stable, serializable, domain-named, and complete for every value that changes the result. Normalize
  unordered identifier inputs before including them in a key.
- Put query functions and mutation/invalidation policy in domain hooks. Components should consume screen-ready query
  state rather than reconstruct transport rules.
- Define `enabled`, retry, stale time, pagination, refresh, and invalidation from current product behavior. Do not adopt
  Maaatch web cache defaults or library defaults when they would change the deployed mobile experience.
- Use infinite queries only for genuinely paginated or incrementally loaded collections. Keep page flattening and
  `getNextPageParam` deterministic.
- After mutations, update or invalidate every affected query deliberately. Do not mirror remote entities into Zustand
  or context as a second server-state cache.
- Clear user-scoped cached data on authentication transitions through the owning session boundary.

The current clients and handwritten DTOs remain authoritative until the contract roadmap migrates the relevant
service. Once mobile generation is active, generated files are boundary artifacts: never hand-edit them, never treat
them as product decisions, and map them to screen-specific view models only when the UI needs a different shape.

## Local, Shared, And Persisted State

Choose the smallest owner that matches the state:

1. derive render-only values during render;
2. use component state for local interaction and submission lifecycle;
3. use TanStack Query for remote server state;
4. use context for an app-wide capability or lifecycle with active consumers;
5. use Zustand only for deliberate cross-screen client state or persistence.

Persist only values that must survive process restarts. Define hydration explicitly and keep pre-hydration behavior
safe. `expo-secure-store` is appropriate for small device-held values that need platform-protected storage; it is not a
general database, a remote-state cache, or proof that a value is safe to expose. Never persist raw access tokens,
sensitive API payloads, notification bodies, or user data outside the established authentication integration without a
separate security decision.

Do not duplicate the same value across context, Zustand, TanStack Query, and local state. When a value has multiple
representations, name the authoritative owner and derive the others.

## Forms And Validation

The current application uses Formik and Yup with shared React Native form primitives. Preserve that choice during
structural tasks; do not introduce a parallel form or schema library without an authorized migration.

- Keep form initial values, validation schemas, and reusable field configuration outside large render blocks when they
  are stable or shared.
- Separate user-edited form values from API request DTOs. Put non-trivial form-to-request mapping in a named pure
  transform close to the domain.
- Keep API-to-form defaults distinct from submission transforms when create and update semantics differ.
- Reuse current `components/common/form/**` primitives for labels, inputs, validation feedback, selectors, sheets, and
  submission layout when their contract fits.
- Keep only user-edited and submission-lifecycle state. Derive labels, enabled state, projections, and defaults during
  render where possible.
- Use effects for a real bridge to an external owner, such as registering a sheet submit callback. Do not synchronize
  values that Formik or render logic can derive directly.
- Preserve keyboard, focus, bottom-sheet, safe-area, disabled, loading, and error behavior across both platforms.
- Keep validation messages user-facing and actionable. Do not display raw backend detail, validation payloads, stack
  traces, or internal field names.
- Trigger haptics only for an established user interaction outcome. Haptics must not become the only success or error
  feedback and must degrade safely when unavailable.

Future generated contract schemas validate wire shapes; they do not replace mobile form semantics, coercion, defaults,
cross-field rules, or user-facing messages.

## View Models And DTO Mapping

- API DTOs may be used at the transport boundary and inside query hooks or mappers.
- Do not pass a broad transport response through the component tree when a screen needs a smaller stable projection.
- Introduce a screen-specific view model only when it clarifies rendering, combines multiple API values, formats a
  platform-independent value, or prevents transport concerns from leaking into UI.
- Name transforms for their direction, for example `toMatchDetailViewModel` or `toProfileUpdateRequest`.
- Keep transforms deterministic and side-effect free. Locale, timezone, or platform-sensitive formatting must receive
  the relevant input explicitly when it changes the result.
- Do not reuse a form request type as a read model or a persisted store type.

Backend mapping policy does not govern these mobile projections. This policy owns API-to-screen and form-to-API
mapping in the Expo application.

## API Errors And User Feedback

Use the established `ApiError` boundary for current HTTP failures. Preserve status, stable code, and request identifier
when available, but expose only safe, actionable information to the user.

- Map expected errors to the owning screen, form, toast, or retry state.
- Keep loading, empty, offline/unreachable, authorization, and unknown failure states distinct when the current product
  flow handles them differently.
- Reuse the current feedback components under `components/common/feedback/**` when their behavior fits.
- Do not display raw response bodies, backend exception messages, tokens, stack traces, service names, request IDs, or
  infrastructure details in normal product UI.
- Do not swallow a failure silently unless the current flow explicitly treats it as optional. Provide safe fallback or
  operational logging at the boundary that handles the degradation.
- Keep unauthorized recovery in the session/API layer so leaf components do not race to clear credentials or caches.

When `ProblemDetail` contracts become active for the mobile client, use the stable machine-readable code as the mapping
source and keep an explicit fallback for unknown or missing codes.

## Hooks And Effects

- Put domain hooks under `src/hooks/<domain>/**`; keep cross-domain hooks in `src/hooks/utils/**` only when their
  behavior is genuinely domain-neutral and currently reused.
- Do not use hooks to hide product decisions, arbitrary API orchestration, or navigation that belongs to the route.
- Use `useEffect` only to synchronize with an external system or lifecycle: native listeners, timers, authentication,
  notifications, purchases, persisted-store hydration, navigation events, animations, or imperative third-party APIs.
- Prefer event handlers, query callbacks, computed render state, Formik state, and navigator guards when no external
  synchronization exists.
- Every subscription effect returns cleanup. Async effects protect against stale completion or unmounted ownership when
  the result can race.
- Keep dependencies complete. Stabilize a callback only when the receiving hook or native subscription requires stable
  identity.
- Platform listeners and permission prompts must not register repeatedly because of ordinary renders.

## Components And Native UI

- Domain components live under their current domain folder; reusable primitives live under `components/common/**`.
- Keep components focused on rendering and interaction. Move transport, substantial projection, persistence, and
  request construction to earlier boundaries.
- Prefer React Native and established Expo primitives. Do not copy DOM elements, CSS assumptions, Next.js components,
  or browser event patterns into native screens.
- Use `lucide-react-native` or the established Expo vector icon set when a suitable icon exists; do not add another icon
  library for isolated usage.
- Preserve accessibility labels, roles, state, touch target size, focus behavior, reduced-motion expectations, font
  scaling, and screen-reader order when changing interactive UI.
- Respect safe areas, keyboard avoidance, Android back behavior, iOS modal behavior, and edge-to-edge system bars.
- Use virtualized list components for large or unbounded collections. Keep keys stable and avoid nesting competing
  vertical scroll containers.
- Use `expo-image` and the current asset pipeline for application images when its behavior fits. Keep remote image
  loading, placeholders, caching, and failure states explicit.
- Animation must preserve interaction and accessibility. Do not move ordinary derived UI state into effects only to
  drive an animation.

## Styling And Design Values

The current mobile styling system is React Native `StyleSheet` plus values from `useAppTheme`, `src/theme/**`, and
shared geometry constants. Preserve it until MRG-504 defines the durable design system.

Use this ownership order:

1. reuse an existing semantic mobile theme value or shared geometry constant;
2. reuse an existing common component with the required behavior;
3. add a component-owned `StyleSheet` rule for local structure;
4. extract a component when repeated structure and behavior form a real concept with multiple callers;
5. use a small inline dynamic style only when it depends on runtime values.

Rules:

- Prefer semantic theme values such as background, surface, text, border, primary, success, warning, and error over raw
  colors when the semantic choice already exists.
- A light/dark or platform color decision should have one owner. Do not scatter duplicate color branches across
  consumers.
- Do not add Tailwind, shadcn, CSS modules, DOM class names, or a second styling runtime by analogy with Maaatch.
- Do not create generic `Box`, `Stack`, `Panel`, wrapper, or token values solely to shorten one component.
- Keep one-off layout local. Promote a token only for a repeatable design decision with multiple owners.
- Use `StyleSheet.create` for stable styles and small inline arrays for conditional or dynamic composition. Remove
  contradictory entries instead of relying on array order accidentally.
- Preserve approved visual behavior. Policy alignment does not authorize redesign.

## Native Capabilities And Platform Differences

Changes involving Auth0, notifications, Google Services, ads and consent, RevenueCat, maps, deep links, secure storage,
updates, fonts, splash screens, status/navigation bars, gestures, bottom sheets, or native build properties cross a
native boundary.

- Keep bundle identifiers, Android package, Expo project ID, URL schemes, runtime version policy, update channels, and
  store identity stable unless an explicit release decision changes them.
- Prefer Expo-supported packages and config plugins compatible with the repository's current Expo SDK and React Native
  versions.
- Put reusable native configuration in `app.json`, `app.config.js`, or a named config plugin according to Expo's
  ownership model. Do not patch generated `ios/` or `android/` output when configuration can own the change.
- Add permissions only when an authorized product flow needs them. Keep permission copy accurate and handle denied,
  restricted, unavailable, and later-revoked states.
- Keep platform differences explicit through supported configuration, platform files, or small `Platform` branches.
  Do not let one platform silently fall through untested behavior.
- Validate whether a change is compatible with Expo Go, requires a development build, or requires a fresh native
  build. Report that boundary rather than assuming JavaScript export proves native correctness.
- EAS build, submit, update, credentials, and store publication are separate operations. Local source changes never
  authorize an online build, OTA update, submission, credential mutation, or production release.

## Environment And Secret Safety

- Every `EXPO_PUBLIC_*` value is embedded in the application bundle and readable by users. It may contain public
  identifiers and public SDK configuration, never a private secret.
- Keep the complete safe mobile environment contract in `apps/frontend/mobile/.env.example`.
- Keep real `.env` files, Firebase JSON, signing keys, provisioning profiles, service accounts, and EAS credentials out
  of Git.
- `GOOGLE_SERVICES_JSON` is a local or CI path to an ignored file. Do not store its JSON content in an environment value
  or commit the referenced file.
- Do not expose a server secret through `app.json`, `app.config.js`, EAS `env`, `extra`, route params, AsyncStorage,
  SecureStore, or generated bundles.
- Treat public RevenueCat and advertising SDK keys according to their vendor boundary, but never infer that an
  arbitrary credential is public merely because another SDK key is bundled.

Any environment change updates source configuration, `.env.example`, and applicable EAS or CI wiring together, without
copying production secrets into documentation.

## User Text And Product Boundaries

The current application contains production French copy and has no established localization layer. Preserve the
language and current wording during structural work. Do not introduce an i18n framework, add a second locale, or
rewrite product copy without an owning task.

- Keep visible copy focused on user outcomes, available actions, and recovery.
- Do not expose migration state, roadmap IDs, source gates, backend or service names, raw identifiers, contract names,
  authentication plumbing, cache mechanics, or deployment internals in normal product UI.
- Keep permission, privacy, advertising consent, purchase, update, maintenance, and legal copy aligned with the actual
  native behavior. These surfaces require product or legal authority for semantic changes.
- Do not turn internal exceptions or backend detail into user copy.

## Logging And Observability

- Do not add permanent `console.log` debugging to React Native code.
- Route handled failures through the current screen feedback and the logging boundary defined by
  [`logging-policy.md`](logging-policy.md).
- Never log access tokens, Auth0 credentials, user profiles, notification payloads, purchase receipts, ad identifiers,
  location data, raw API bodies, or values from secure storage.
- Log a native or network failure only where it becomes actionable or is deliberately degraded. Avoid logging the same
  error in the HTTP client, hook, provider, and component.
- Client telemetry, analytics, crash reporting, or remote log capture requires a separate source-gated task and privacy
  review.

Existing imported console statements are audit evidence; this policy does not authorize a bulk logging cleanup outside
the task that owns it.

## TypeScript Documentation

Follow [`code-documentation-policy.md`](code-documentation-policy.md) for touched handwritten mobile boundaries.
Document exported providers, stores, domain hooks, API clients, view-model mappers, platform bridges, and component APIs
when their contract or invariant is not obvious from the signature.

Do not document generated files manually. Do not add comments that restate JSX, style properties, hook names, or direct
field copies. Prefer simpler code and role-bearing names over explanatory prose.

## Verification

Choose checks from the changed boundary and run them through Nx when a target exists.

For documentation or policy-only mobile work, inspect the reference graph and run:

```bash
npm run validate:docs
git diff --check
```

For handwritten TypeScript changes, run at minimum:

```bash
npm exec nx run @blockout/mobile:typecheck
```

Run an Expo export for route structure, Metro, Babel, assets, public configuration, or dependency changes:

```bash
npm exec nx run @blockout/mobile:export --platform=android
npm exec nx run @blockout/mobile:export --platform=ios
```

For native plugin, permission, bundle configuration, native dependency, or build-property changes, an export is not
enough. Run the applicable prebuild/config inspection and development or EAS build evidence authorized by the task for
both affected platforms. Do not trigger online EAS builds, updates, submissions, or production releases without their
explicit phase-specific authorization.

Run contract generation only when active contract source or configured generated clients are intentionally impacted.
Report every check run, every platform intentionally skipped, and why the remaining evidence is sufficient.
