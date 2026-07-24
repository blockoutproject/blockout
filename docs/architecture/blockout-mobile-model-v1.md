# Blockout Mobile Model V1

This model defines the delivered Expo and React Native application boundary. It does not duplicate screen-level task
history or canonical Figma content.

## Application Boundary

- The deployable application lives under `apps/frontend/mobile`.
- Expo Router owns routes and native navigation composition.
- Feature modules own their API coordination, hooks, models, and UI. They create only the folders they use.
- Shared code requires multiple active semantic consumers or an application-wide invariant.
- Complete screens remain feature-owned even when they reuse a shared frame or primitive.

## State And Data

- The generated Orval client owns Blockout HTTP calls and transport types at the mobile boundary.
- TanStack Query owns remote facts and cache lifecycle.
- Feature hooks may coordinate mutations and optimistic cache updates without mirroring query data into component
  state.
- Session commands and session facts have separate responsibilities so consumers subscribe only to the state they use.
- Form values, validation, request construction, native capabilities, and submit commands remain feature-owned.

## Native And Provider Boundaries

- Auth0 native SDK integration owns authentication.
- Expo and React Native adapters own application focus, connectivity, notifications, maps, media, purchases,
  advertising, and platform-specific configuration.
- Platform differences prefer `.ios.*` and `.android.*` file resolution when a file-level adapter expresses the
  boundary clearly.
- Public configuration is validated at application startup when required across the app. Optional provider
  configuration stays with its owning feature.

## UI Composition

- Shared primitives represent stable semantic roles rather than coincidental visual similarity.
- Real behavior differences use named variants, dedicated children, or feature composition instead of unrelated
  boolean switches.
- An extraction must reduce duplication and cognitive load. Generic renderers, registries, helper factories, or
  advanced type machinery require a demonstrated current need.
- Accessible names and roles are the preferred test and interaction boundary.
- The canonical Figma file owns accepted visual truth; implementation must follow the repository Figma and mobile
  policies.

## Validation

The normal mobile boundary is validated through one Nx graph that generates the client once, then runs lint, typecheck,
Jest, and Expo export. Native iOS or Android validation is added when a native project, provider, or platform-specific
boundary changes.
