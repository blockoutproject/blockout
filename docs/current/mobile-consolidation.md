# Mobile Consolidation Register

## Purpose

This register keeps REF-036 consolidation explicit and reviewable. It records repeated mobile patterns, their intended
owner, and the reason they are shared or remain feature-owned. It is updated after every coherent feature slice and
becomes the final recap of the mobile refactor.

The reference structure is Maaatch's simple `app` / `modules` / `shared` ownership model. Blockout keeps its Expo and
React Native requirements and does not copy Maaatch web implementation code.

## Decision policy

A pattern becomes shared when at least two active consumers use the same semantic role and behavior. Small accidental
differences in spacing, radius, color, or typography converge on semantic tokens. Meaningful product behavior, copy,
data access, and commands remain in the owning feature and use explicit composition or a named variant.

Shared components must expose a small semantic interface. They must not hide whole feature workflows, accept unrelated
boolean flags, or preserve duplication through differently named wrappers. A feature-local implementation stays local
until a second proven consumer exists.

Keep it simple is non-negotiable: no speculative helper, factory, generic type system, configuration-driven component,
or wrapper layer is introduced merely to reduce line count. An extraction is valid only when its concrete consumers are
easier to read and its public interface is simpler than the duplicated implementations it replaces.

## Live register

| Pattern                                 | Current evidence                                                     | Target owner                                | Decision                                                                                           | Status  |
| --------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------- |
| Theme and visual values                 | Separate application and navigation providers with overlapping color sources | `shared/providers/ThemeProvider` and `shared/theme` | One provider owns both contexts; one dark theme and concrete semantic tokens replace the unused light and duplicate color systems | Complete |
| Primary and secondary actions           | Repeated button shells and close/submit actions                      | `shared/ui`                                 | Share action primitives; keep feature labels and commands local                                    | Planned |
| Loading, empty, error, and API feedback | Repeated cards, alerts, toasts, and error extraction                 | `shared/ui` and `shared/api`                | Share presentation and transport-neutral error handling; keep feature recovery decisions local     | Planned |
| Form and bottom-sheet structure         | Repeated sheet headers, fields, validation layout, and footers       | `shared/ui`                                 | Share scaffold and field/action layout; keep schemas, values, and submit commands in modules       | Planned |
| Team and pool presentation              | Near-identical headers, skeletons, profile layout, and form sheets   | `shared/ui` plus feature modules            | Share stable entity frames; retain team/pool content, types, and behavior in their modules         | Planned |
| Followed entity lists                   | Near-identical pool and team lists                                   | `shared/ui` plus discovery modules          | Share list presentation and stable interaction contract; retain queries and navigation per feature | Planned |
| Entity search                           | Near-identical team and pool filters with a simpler club variant     | `shared/ui` plus search module              | Share proven controls and result framing; retain feature filters and requests                      | Planned |
| High-volume lists and images            | Match, ranking, feed, and notification lists repeat item patterns    | Feature modules plus `shared/ui` primitives | Stabilize callbacks and item boundaries; virtualize or change image behavior only with evidence    | Planned |
| Application-state cards                 | Maintenance and required-update screens share layout but not actions | `shared/ui` plus app-status module          | Share the state frame; express maintenance and update as explicit feature compositions             | Planned |

## Completed slices

### Theme foundation

- `ThemeProvider` is the single mounted owner for both the Blockout theme and React Navigation theme.
- The unused light theme, duplicate color catalog, duplicate provider, and unused legacy theme types were removed.
- Existing layout dimensions now come from `shared/theme/tokens`; no configuration layer or token factory was added.
- `Skeleton` and `Spinner` consume the same application theme as every other shared component.
- Typecheck, 25 tests, lint with 55 inherited warnings, and the 3,151-module Web export pass.

## Final audit

REF-036 is complete only when this table reflects the implemented owners, all active consumers use the chosen shared
foundations, legacy root folders have no remaining legitimate owner, and intentionally local similarities are
documented rather than silently duplicated.
