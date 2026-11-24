---
name: react-feature-architecture
description: "Structure React features and their state, forms, effects, queries and TypeScript boundaries across web and native applications. Use when implementing or reviewing feature behavior."
---

# React feature architecture

Use feature-first ownership for both React web and React Native. Read the requested behavior and nearby features to find who owns rendering, editing and data access. Start new features with React state where it meets the need.

## Feature responsibilities

A feature is a business capability and may have several screens. Use only populated folders:

```text
feature/
  screens/       # user-facing use-case composition
  api/           # queries, mutations, transport validation/adaptation
  components/    # feature-owned reusable UI
  hooks/         # coherent stateful behavior
  forms/         # editing and submission composition
  schemas/       # feature validation rules
  model/         # meaningful feature types and pure transformations
```

A small feature may start with a few files. Route files belong to the framework and remain thin. Screens can call a query and own simple local state: do not require a `useXScreen` hook or a container/component pair. Pure transformations are functions, not hooks. Extract by responsibility and real reuse, not line count.

Expose narrow public feature APIs when other features need them. Do not import another feature's internals or create cycles. Shared modules never depend on features. Promote shared code for identical active semantics, not similar appearance. No global barrel, registry, screen engine, base hook or speculative abstraction.

## Helpers and public boundaries

Keep simple expressions local. A private function used once is useful when it names a coherent step or makes an invariant easier to understand; it does not justify a reusable framework. Before extracting shared behavior, search existing owners. When a second consumer needs the same rule, reuse or move the existing function to the narrowest meaningful common owner and remove copies. Share identical knowledge, not merely similar syntax.

An exported contract or public boundary can be justified with one consumer. Do not prohibit exports mechanically or create global utils, generic facades, registries or layers in anticipation of reuse. Investigate the underlying ownership or data-flow problem before adding another adapter around its symptom.

## State ownership

| Kind                                               | Owner                                           |
| -------------------------------------------------- | ----------------------------------------------- |
| Client-managed remote data and request lifecycle   | Feature data access or the existing data cache  |
| Server-rendered data reads                         | Owning framework server mechanisms              |
| Navigation and navigable URL state                 | Framework router                                |
| Form values, errors, touched and submission state  | Component or hook owning the editable draft     |
| Local interaction                                  | Closest component or coherent hook              |
| State coordinated across components                | Closest shared owner                            |
| Scoped dependencies or coordinated component parts | Context                                         |
| Derived data                                       | Calculation during rendering or a pure function |

Do not mirror server cache in a store or copy props into state merely to synchronize them. Keep a form's editable snapshot when editing semantics require one; a background refetch must not overwrite dirty values. Reset intentionally on an accepted resource/identity change or successful submit policy.

## Queries and mutations

Let the server-rendering framework own server-only reads. When the client refreshes a value after the initial render, give that value one owner for subsequent reads and updates.

Reuse the project's data-access functions. If a feature caches requests, reuse its key definitions and include every input that affects the response, including the relevant actor or tenant. Preserve cancellation, timeouts and safe error translation at the transport boundary.

Choose freshness and retention per resource, not universal cache durations. Invalidate the narrowest owner-controlled data. Clear or separate private cache across identity changes.

Server-confirmed mutations are the default. Optimistic updates require a defined snapshot, cancellation, rollback and reconciliation strategy. Do not retry mutations without a proven idempotency contract. Keep user input and useful field errors after a failed submission; branch on stable machine codes, not message strings.

If the feature displays cached data offline, communicate when it is stale. Persistent storage, queued writes and background sync require an accepted offline need.

## Forms, contracts and mapping

Use the form controls already selected for the project. A simple form can own its draft and validation in component state. Editing may need intermediate strings or defaults that the API would reject. Convert the draft once at submission and keep authorization and persistence rules on the server.

Apply the API's response contract at the data-access boundary before exposing a successful result. Preserve its rules for required fields, unknown properties, nulls and enums. Reuse any checks the client already performs.

Reuse an existing API type, including a generated enum, when it expresses the same concept. Give distinct presentation or editing values their own feature type and map at the boundary.

## Effects and components

Use effects for synchronization with external systems, with correct dependencies and cleanup. Derive render state directly and handle user actions in events. Do not ban `useEffect` universally or introduce a mandatory `useMountEffect` escape hatch. Handle subscriptions through supported external-store APIs where suitable.

Memoize only for a meaningful computation cost, required referential stability or a measured issue. Prefer explicit props, children and small named compositions. Normal `disabled`/`loading`/`selected` booleans are fine; unrelated mode combinations deserve separate compositions or a finite variant. Compound components/context need actual coordinated public parts.

Prefer explicit named contracts for public props, stable interfaces, mappings and boundaries; infer obvious local variables. Reuse an exact generated object type instead of a renamed handwritten mirror. Define a local form/view model when its meaning differs. `Pick`, `Partial`, `ReturnType`, indexed access and schema-derived types are acceptable when they remove real duplicated knowledge and remain immediately readable, not as a default construction language for every interface. Avoid nested calculated types such as `NonNullable<ReturnType<typeof useBookings>["data"]>["items"][number]` as component APIs. Never make a required field optional just to silence the checker. Narrow unknown input, avoid `any`, unsafe casts and non-null assertions. Handwritten files use kebab-case except framework-mandated names and existing generated output.

## Evidence

Test meaningful interaction, dirty-form preservation, rejected responses, scoped invalidation and failure recovery when changed. Run the owning checks. If a contract change affects a generated client, regenerate it and check its consumers. Exercise the platform for framework behavior and inspect accessibility and supported states for UI changes.

The folder roles are a personal convention. For effect dependencies and synchronization, see [React effects](https://react.dev/learn/you-might-not-need-an-effect).
