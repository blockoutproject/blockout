# REF-066 Expo UI Foundation Adoption

## Scope

REF-066 adopts the certified Figma foundations and the first proven shared primitives in Expo. It changes no route,
business workflow, API contract, generated client, provider configuration, credential, user data, Web target, or
production state. The task does not redesign application screens; REF-067 through REF-070 retain ownership of the
screen-level migration and visual certification.

The canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file was the sole visual authority.
The implementation was read directly from these certified nodes:

| Responsibility | Figma node |
| -------------- | ---------- |
| Foundations    | `10:2`     |
| Action         | `24:2`     |
| Pill           | `27:2`     |
| Gradient Pill  | `295:197`  |
| Field          | `29:2`     |
| Search         | `82:29`    |

No iOS runtime value was used to recalibrate the certified system and Figma was not mutated.

## Theme Boundary

`src/shared/theme` is now the single public theme entry. It exposes:

- semantic colors and gradients;
- the certified spacing, radius, border-width, icon-size, touch-target, and layout scales;
- the 16 certified typography roles;
- the certified action, card, hero, image, and navigation elevation roles;
- the existing application and React Navigation theme providers, both derived from the same semantic colors.

The flat `AppTheme` surface remains as a compatibility boundary for existing feature consumers, but it contains no
independent color values. All former individual layout constants and pool palettes now resolve through the canonical
token objects. Application imports use the public entry; only the theme implementation imports its private files.

## Proven Shared Primitives

Only responsibilities with real existing consumers were introduced:

| Primitive      | Ownership                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------- |
| `Action`       | Canonical primary gradient action, loading state, haptics, press feedback, and semantics. |
| `Pill`         | Canonical solid compact metadata and filter control.                                      |
| `GradientPill` | Canonical filled or bordered gradient compact control.                                    |
| `SearchField`  | Canonical controlled search input and accessible clear action.                            |
| `FormField`    | Canonical label and validation/helper anatomy around a feature-owned input.               |

Their real consumers were migrated in the same change. The superseded `GradientButton`, `InfoPillGradient`,
`SearchBar`, `Field`, `FieldLabel`, and `FieldError` implementations were removed only after no import remained. No
registry, component factory, style generator, Tailwind layer, generic React Native wrapper, or unused component variant
was added.

Interactive pills retain their certified visual heights while exposing a minimum 44-point native hit area. Actions,
pills, and search controls expose native roles, labels, disabled or busy state, and stable test identifiers only where
an existing flow needs them. Feature-owned filtering, debounce, validation, mutation, and navigation behavior remains
outside the primitives.

## Test And Artifact Boundaries

Focused React Native Testing Library coverage proves:

- the accessible primary action invokes its command;
- interactive and disabled pill states preserve their semantics;
- the search clear action updates its controlled value;
- form errors appear only after the field is touched;
- the application and React Navigation providers resolve the same canonical background.

The complete mobile suite passes 30 suites and 57 tests with no snapshot. The generated Orval output remains ignored:
88 generated files may exist locally after Nx validation and zero are tracked by Git. Native projects, build products,
Expo caches, `.env.local`, credentials, and temporary comparison artifacts remain outside Git.

## Validation

- `npx expo-doctor@latest apps/frontend/mobile`: all 19 checks pass.
- `NX_DAEMON=false npm exec nx run @blockout/mobile:lint`: passes.
- `NX_DAEMON=false npm exec nx run @blockout/mobile:typecheck`: passes.
- `NX_DAEMON=false npm exec nx run @blockout/mobile:test`: 30 suites and 57 tests pass.
- The unsigned Android debug assembly and targeted arm64 iPhone 17 Pro Simulator build validate the shared native
  boundary without an Android visual synchronization pass.
- The Nx project graph, documentation formatting, generated-file ownership, and Git diff checks pass.

REF-067 remains unchecked and was not started.
