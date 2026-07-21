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
- `modules/<feature>`: product screens and, in later focused tasks, their feature-owned UI, hooks, validation, and view
  models;
- `shared`: infrastructure and UI used by multiple active features.

`shared` currently owns:

- `api`: HTTP transport mechanics and error handling, not product-specific requests or models;
- `config`: environment-backed application and provider configuration;
- `hooks`: domain-neutral hooks used by multiple features;
- `providers`: application-wide React providers, including platform-specific adapters;
- `theme`: theme tokens and theme integration;
- `ui`: reusable visual and navigation primitives.

Existing feature components, hooks, API clients, transport models, and local stores remain in place until their focused
feature task moves them. REF-029 does not create placeholder layers or generic abstractions merely to complete a folder
shape.

## Boundary rules

- Route files do not own substantial rendering, data access, request construction, or feature interaction state.
- Feature code stays inside its feature until at least two active features need the same behavior.
- Shared code must have multiple active feature consumers or enforce an application-wide technical invariant. A
  feature workflow stays in its module even when another feature links to it.
- API clients own HTTP calls. Handwritten transport types mirror the mobile gateway and stay distinct from
  screen-specific state.
- Platform differences use Expo and React Native file resolution such as `.web.tsx`; runtime platform conditionals are
  kept only when file-level adapters cannot express the boundary clearly.
- Native and local Web authentication use separate public Auth0 clients against the same issuer and API audience. The
  Web adapter delegates to the official SPA SDK, keeps tokens in memory, and never introduces an application bypass.
- UI, route names, gateway calls, persistence keys, authentication, notifications, purchases, ads, maps, and media
  behavior remain unchanged during structural moves.

## Verification

Every structural slice must keep the REF-028 baseline green:

- the Nx mobile TypeScript target;
- the focused Jest characterization tests;
- the Expo Web export;
- phone-sized Web inspection when rendered output or navigation composition changes;
- iOS and Android builds or launches when a native or platform-specific boundary changes.

Moving a file without changing its behavior does not by itself require a new abstraction or a new test. Existing tests
must follow the source they protect so test ownership stays visible.
