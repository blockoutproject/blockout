# REF-065D iOS Pending Screen Certification

## Authority and scope

[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) remains the only canonical
Blockout design file. REF-065D certifies the five native compositions that still carried a `Validation pending`
label after REF-065C:

- sign-in;
- empty club search;
- guest profile;
- legal-document sheet;
- authenticated administrator profile.

The running iPhone 17 Pro simulator, the current Expo source, and the canonical `393 x 852` Figma viewport were the
only visual authorities. Android and React Native Web were not launched or used. No Expo runtime source, API
contract, generated artifact, authentication bypass, provider configuration, credential, deployment, or production
state changed.

## Master-first corrections

Shared differences were corrected before screen composition:

| Family                    | Node      | Correction                                                                               |
| ------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `Action`                  | `24:2`    | Added the bounded destructive-outline states and corrected destructive foreground colors |
| `Guest Upsell Card`       | `198:7`   | Added the exact guest value proposition with a linked primary `Action` instance          |
| `Menu Row`                | `192:20`  | Added default and pressed legal/settings rows with editable labels and icon swaps        |
| `Screen Header`           | `36:20`   | Corrected native title, back, close, report, and edit geometry with exact source icons   |
| `Bottom Navigation`       | `140:123` | Removed the non-native blue active outline and retained the exact native selected pill   |
| `Guest Bottom Navigation` | `213:17`  | Added the two-item Search/Profile family produced by Expo guest route guards             |
| `Hero`                    | `134:37`  | Bound the source-backed `18`-point container radius                                      |
| `Match Row`               | `138:65`  | Centered time, score, live, and replay values in every shared row variant                |
| `Ranking Row`             | `139:55`  | Centered ranking positions and points in every shared row variant                        |

Three semantic variables preserve source-backed geometry and rendering without per-screen constants:

| Variable           | Node               |  Value | Purpose                                                        |
| ------------------ | ------------------ | -----: | -------------------------------------------------------------- |
| `radius/card`      | `VariableID:200:3` |     14 | Repeated cards and bordered menu rows                          |
| `surface/selected` | `VariableID:214:2` | 0.3355 | Stable opaque equivalent of the native selected-pill composite |
| `radius/hero`      | `VariableID:223:2` |     18 | Shared native Hero containers                                  |

The categorized library now contains 17 component sets and 81 bounded variants across Actions & Inputs, Content &
Data, Feedback & Overlays, and Navigation. `Guest Upsell Card` remains a single component because it has no finite
visual state axis; its nested call to action is still a linked `Action` instance. The three private Menu Row icons
exist only as instance-swap assets.

The selected Bottom Navigation item has two distinct layers, matching the native implementation:

- the `74 x 44` active item container has no stroke;
- the `50 x 44` selection pill keeps a one-point stroke bound to `border/strong`, which resolves to the native
  `borderSecondary` value `#5f5f5f`.

The previous `status/primary` stroke on the active item container was the blue outline visible in Figma but absent from
the application. It was removed from all eight Default/Premium active variants at the component master, so no
screen-specific compensation remains.

## Icon and alignment fidelity

All reusable and canonical-screen icons were reconciled with the repository-pinned `@expo/vector-icons` `15.0.3`
dependency. MaterialCommunityIcons and Ionicons paths were imported from the package's own glyph maps and font files
as editable vectors; no hand-drawn approximation or unrelated community asset was introduced.

The pass covers navigation, headers, search, fields, guest benefits, legal rows, administrator actions, club contact
actions, team/pool metadata, ranking medals, and match reporting. Imported SVG wrapper frames are transparent, their
vectors use the existing semantic foreground colors, and their source-backed icon boxes remain centered in the
component layout. Text shorthands previously standing in for home, followers, chevrons, reports, edits, or controls
were removed.

## Certified compositions

| Composition                         | Screen node | Evidence label | Linked top-level responsibilities                                   |
| ----------------------------------- | ----------- | -------------- | ------------------------------------------------------------------- |
| `Access / Sign in / iOS 393`        | `79:964`    | `79:963`       | Chip, Action                                                        |
| `Search / Empty clubs / iOS 393`    | `84:1001`   | `84:1000`      | Chip, Search, Bottom Navigation                                     |
| `Profile / Guest / iOS 393`         | `85:1039`   | `85:1038`      | Screen Header, Guest Upsell Card, Menu Row, Guest Bottom Navigation |
| `Legal / Imprint sheet / iOS 393`   | `87:1040`   | `87:1039`      | Screen Header                                                       |
| `Profile / Administrator / iOS 393` | `92:1037`   | `90:1044`      | Screen Header, Hero, Menu Row, Action, Bottom Navigation            |

All five labels now read `iOS 393 · Validated · 23 Jul 2026`. The sign-in composition preserves the repository logo
asset. The authenticated profile uses a sanitized `admin@blockout.local` address, and the legal composition uses
`contact@blockout.local`; runtime account data is not copied into the public design record.

The legal document is the only composition with immediate content below the viewport. Its final paragraph is
intentionally clipped by the `393 x 852` frame because the native responsibility is a vertical scroll view. No other
certified screen has a top-level overflow.

## Validation

The final Figma audit reports:

- five exact `393 x 852` screens and five dated validation labels;
- zero remaining `Validation pending` label on `30 - Ready for Development`;
- zero missing font across the five compositions;
- all required instance lineages present, including nested Action and Menu Row icon-swap instances;
- correct category ownership for Action, Chip, Search, Hero, Menu Row, Guest Upsell Card, Screen Header, authenticated
  Bottom Navigation, and Guest Bottom Navigation;
- centered rank and points values in all four `Ranking Row` masters and all six linked rows in the canonical pool
  ranking composition;
- centered time, score, live, and replay values in the shared `Match Row` family;
- eight active Bottom Navigation variants with no outer stroke and eight native selection pills bound to
  `border/strong`;
- 194 visible MaterialCommunityIcons or Ionicons vector roots with no rendered bound outside their icon box;
- zero remaining text glyph used as an icon approximation;
- 24 linked top-level instances across the five screens, or 31 when nested instances and icon swaps are included;
- no unexplained overflow, detached replacement for an existing master, Android capture, Web artifact, or second
  canonical Figma file.

The six previously certified canonical iOS compositions were also regression-reviewed after the master corrections:
authenticated empty and populated Home, Club information, Team empty, Pool ranking, and Match finished. All eleven
canonical frames remain exactly `393 x 852`; Search, Administrator, Team, Pool ranking, and Match finished received
fresh full-frame renders after the navigation and icon corrections.

The Figma Plugin API continues to report `hasMissingFont` on free-standing text in five older compositions even though
the exact bound `SF Pro` styles are available, load successfully, and render correctly. Inspection showed that Figma
reports an internal variable-font weight such as `510` while the Blockout semantic token remains the correct `500`.
Reassigning the same font did not change the flag or the render, so the tokens were not distorted and the remaining
provider-owned diagnostic was recorded instead of replacing the native system font with Inter. The five compositions
certified by REF-065D do not expose this diagnostic.

The connected Figma provider could not return Code Connect structural context because that operation requires a
provider-owned Dev/Full seat. Component properties, token bindings, instance lineage, bounds, fonts, and screenshots
were therefore verified through the Figma Plugin API and direct node renders. This limitation does not affect the
editable design or its validation.

Simulator captures remain transient and outside Git.
