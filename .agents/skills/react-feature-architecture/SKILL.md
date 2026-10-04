---
name: react-feature-architecture
description: "Structure React features and their state, forms, effects, queries and TypeScript boundaries across web and native applications. Use when implementing or reviewing feature behavior."
---

# React feature architecture

Use feature-first ownership for both React web and React Native. Read the accepted behavior, repository paths, pinned libraries and existing generators before editing. The stack below is the target convention for new work; installing this skill does not authorize migrating existing forms, clients or state libraries. Keep such migrations explicit and scoped.

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
| Server data and request lifecycle                  | TanStack Query                                  |
| Navigation and navigable URL state                 | Framework router                                |
| Form values, errors, touched and submission state  | React Hook Form with Zod                        |
| Local interaction                                  | Closest component or coherent hook              |
| Identified transversal client state                | Zustand, only when that need exists             |
| Scoped dependencies or coordinated component parts | Context                                         |
| Derived data                                       | Calculation during rendering or a pure function |

Do not mirror server cache in a store or copy props into state merely to synchronize them. Keep a form's editable snapshot when editing semantics require one; a background refetch must not overwrite dirty values. Reset intentionally on an accepted resource/identity change or successful submit policy.

## Queries and mutations

Reuse generated client functions and query-key factories when the configured generator provides them. Otherwise use one feature-owned key definition containing every input that affects the response, including applicable actor/tenant scope. Preserve cancellation, timeouts and safe error translation at the transport boundary. Do not introduce a second generic client wrapper.

Choose freshness and retention per resource, not universal cache durations. Invalidate the narrowest owner-controlled data. Clear or separate private cache across identity changes.

Server-confirmed mutations are the default. Optimistic updates require a defined snapshot, cancellation, rollback and reconciliation strategy. Do not retry mutations without a proven idempotency contract. Keep user input and useful field errors after a failed submission; branch on stable machine codes, not message strings.

Offline behavior defaults to reading existing in-memory cache with honest stale/error state. Persistent storage, queued writes and background sync need an explicit design; they are not incidental Query configuration.

## Forms, contracts and mapping

Use React Hook Form and Zod for new interactive forms. Form schemas express editing and immediate usability; generated transport schemas express the API. Reuse only if semantics match. Map parsing, defaults and composition once at submission and keep server authorization/persistence rules authoritative.

Generated clients/types and response schemas come from the contract pipeline. Validate consumed JSON responses once before admitting them as successful data to Query; do not cast invalid data into the cache or validate again in every component. An error response remains an error.

Generated enums may be used in frontend code when the contract owns the exact concept. Reuse an identical generated type rather than creating a renamed mirror. For different presentation/editing semantics, map at the feature API boundary into a feature model; do not spread provider objects or generated client machinery across feature logic.

## Effects and components

Use effects for synchronization with external systems, with correct dependencies and cleanup. Derive render state directly and handle user actions in events. Do not ban `useEffect` universally or introduce a mandatory `useMountEffect` escape hatch. Handle subscriptions through supported external-store APIs where suitable.

Memoize only for a meaningful computation cost, required referential stability or a measured issue. Prefer explicit props, children and small named compositions. Normal `disabled`/`loading`/`selected` booleans are fine; unrelated mode combinations deserve separate compositions or a finite variant. Compound components/context need actual coordinated public parts.

Prefer explicit named contracts for public props, stable interfaces, mappings and boundaries; infer obvious local variables. Reuse an exact generated object type instead of a renamed handwritten mirror. Define a local form/view model when its meaning differs. `Pick`, `Partial`, `ReturnType`, indexed access and schema-derived types are acceptable when they remove real duplicated knowledge and remain immediately readable, not as a default construction language for every interface. Avoid nested calculated types such as `NonNullable<ReturnType<typeof useBookings>["data"]>["items"][number]` as component APIs. Never make a required field optional just to silence the checker. Narrow unknown input, avoid `any`, unsafe casts and non-null assertions. Handwritten files use kebab-case except framework-mandated names and existing generated output.

## Evidence

Test meaningful interaction, dirty-form preservation, rejected responses, scoped invalidation and failure recovery when changed. Run the owning typecheck and tests; include generation when contracts or adaptation change, and the platform build/smoke for framework boundaries. Inspect accessibility and supported states for UI changes. Report omitted checks rather than equating a unit test with native or visual proof.

Mechanics: [React effects](https://react.dev/learn/you-might-not-need-an-effect). The folder roles and selected state/form stack are personal conventions, not React requirements.
