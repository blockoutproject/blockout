# Blockout Expo Mobile Policy

Read this before changing the Expo application, React Native screens, mobile API clients, Formik forms, Yup schemas, or
mobile transport models.

## Structure And Boundaries

- Keep Expo Router files under `src/app` and limit them to route registration, navigation, layouts, redirects, and
  top-level composition. Product screens live under `src/modules/<feature>/ui`.
- Keep feature-owned UI, hooks, validation, and view models inside their feature. Move code to `src/shared` only when
  multiple active features consume it or it enforces an application-wide technical invariant.
- Use `src/shared/api` for HTTP mechanics, `src/shared/config` for application configuration, `src/shared/providers` for
  application-wide providers, `src/shared/theme` for theme ownership, and `src/shared/ui` for reusable primitives.
- Keep API clients responsible for HTTP mechanics, typed transport models responsible for the gateway contract, and UI
  components responsible for presentation and interaction.
- Blockout-owned request, response, and query fields use native camelCase. Do not add recursive case converters or
  transport aliases.
- Complete resource mirrors must match the owning backend service. UI-specific view state may be smaller and should not
  masquerade as the complete transport resource.
- Keep provider and native-framework values at their own boundary.

## React Native Rules

- Prefer focused components and hooks with explicit inputs over global mutable state or generic helper layers.
- Do not add `useEffect` to derive renderable state; compute it during render or in the event that changes it. Use
  effects
  only to synchronize with an external system and keep dependencies honest.
- Keep Formik/Yup validation aligned with the submitted request without duplicating unrelated backend rules.
- Preserve platform behavior, navigation, accessibility labels, loading states, and error handling when refactoring.
- Never commit Expo caches, native build output, `.env.local`, tokens, or device-specific files.
- Keep native and browser OAuth clients separate. Use the official provider SDK, Authorization Code with PKCE, exact
  callback/origin allowlists, issuer and audience validation, and no authentication bypass.
- Treat the repository as public: OAuth client IDs and audiences may be documented, but secrets, tokens, passwords,
  exported sessions, and personal test data must never be committed or logged.

Run the mobile typecheck and the focused tests or build justified by the change. Exercise changed API serialization and
screen behavior, then run `git diff --check`.
