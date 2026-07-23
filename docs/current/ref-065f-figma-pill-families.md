# REF-065F Figma Pill Families

## Authority and scope

[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) remains the only canonical
Blockout design file. REF-065F reconciles the reusable Figma representation of
`apps/frontend/mobile/src/shared/ui/chips/InfoPillGradient.tsx` without changing the Expo application.

The source component owns two structural branches:

- a solid surface without a gradient;
- a gradient treatment rendered as either a border or a fill.

Figma therefore represents the runtime API with two bounded families rather than one large or speculative matrix:
`Pill` for the solid branch and `Gradient Pill` for the gradient branch. Android and Web were not launched, and no
runtime, credential, provider, deployment, or production state changed.

## Component ownership

Both families live with their guidance on `20 - Actions & Inputs`.

| Responsibility       | Figma node | Variants                                                                 |
| -------------------- | ---------- | ------------------------------------------------------------------------ |
| `Pill`               | `27:2`     | 3 sizes × `Default`, `Pressed`, and `Disabled` = 9                       |
| `Gradient Pill`      | `295:197`  | 3 sizes × `Border`/`Filled` × `Default`/`Pressed`/`Disabled` = 18        |
| Ionicons chevron     | `291:46`   | Exact editable vector from the pinned Ionicons dependency                |
| Family documentation | `21:6`     | Source mapping, bounded API, variant matrices, and representative usage  |
| Consumer examples    | `297:89`   | Solid, border, filled, pressed, icon, and red-indicator linked instances |

The `Pill` set updates the existing component in place, so its canonical consumers keep their instance lineage.
`Gradient Pill` is a separate family because the gradient fill and gradient border are structurally distinct from the
solid branch.

## Source-backed API

Both component sets expose:

- `Small`, `Medium`, and `Large`;
- `Default`, `Pressed`, and `Disabled`;
- editable label text;
- optional left and right icon slots through instance swaps;
- an optional red-dot indicator;
- centered horizontal auto-layout.

Only `Gradient Pill` exposes the `Border` and `Filled` treatment axis. The former invented `Selected` state was removed.
Pressed opacity is `0.9`; disabled keeps the source visual appearance and only represents disabled interaction.

The exact source metrics remain:

| Size     | Horizontal / vertical padding | Label          | Icon | Indicator | Height |
| -------- | ----------------------------- | -------------- | ---- | --------- | ------ |
| `Small`  | `6 / 3`                       | `10`, semibold | `12` | `6`       | `22`   |
| `Medium` | `10 / 6`                      | `12`, bold     | `14` | `7`       | `28`   |
| `Large`  | `12 / 8`                      | `13`, bold     | `16` | `9`       | `34`   |

The families reuse the existing semantic color, border, radius, typography, opacity, and gradient assets. No new
variable was necessary. MaterialCommunityIcons reuse the exact existing component masters; the right-chevron slot uses
the exact Ionicons vector rather than a text approximation or local overlay.

## Consumer migration

Seventeen canonical solid-pill consumers remain linked to `Pill` after the in-place master update:

- three on Sign in;
- three on empty Search;
- five on the empty Team screen;
- four on Pool ranking;
- two on the finished Match screen.

The canonical screen tree contains no detached node named `Pill`, `Pill / …`, `Chip`, or `Chip / …`. Existing
navigation selection backgrounds and one-off profile metadata are not `InfoPillGradient` consumers and retain their
own component ownership.

## Validation

The final structural and visual audits confirm:

- 9 `Pill` variants and 18 `Gradient Pill` variants with the bounded property API above;
- exact heights of `22`, `28`, and `34` points;
- zero missing font in either component set;
- exact icon-component lineage for every optional icon slot;
- semantic variable and gradient-style reuse, with no new token;
- no detached solid-pill consumer in the canonical screen tree;
- representative linked instances for solid, gradient-border, gradient-filled, pressed, icon, and indicator states;
- a complete Sign in regression render with all three pills still linked and visually unchanged;
- no Expo source, Android, Web, runtime behavior, credential, provider, or production-state change.

Component and screen screenshots are transient validation evidence and remain outside Git.
