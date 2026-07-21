# Blockout Expo Mobile Policy

Read this before changing the Expo application, React Native screens, mobile API clients, Formik forms, Yup schemas, or
mobile transport models.

## Structure And Boundaries

- Keep routes and navigation in the Expo application structure already established by the imported app.
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

Run the mobile typecheck and the focused tests or build justified by the change. Exercise changed API serialization and
screen behavior, then run `git diff --check`.
