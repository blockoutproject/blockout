# REF-062 Figma Foundations

## Canonical file

[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) is the only canonical Blockout
design file. It lives in the Blockout Figma team and uses the lifecycle pages defined by the repository policy:

- `00 - Cover`;
- `10 - Foundations`;
- `20 - Components`;
- `30 - Ready for Development`;
- `40 - Shipped`.

REF-062 created only the cover and foundation content. Component masters and screen compositions remain owned by
REF-063 and REF-064 respectively.

## Foundation model

The file preserves the shipped dark mobile identity without copying accidental per-screen values into a speculative
system:

- `Color Primitives` contains 40 exact values from the current theme, action and premium gradients, and pool palettes;
- `Color` contains 41 dark-only semantic variables, each aliased to a primitive;
- `Dimensions` contains 36 variables: a normalized 4-point spacing scale, seven radii, three border widths, six icon
  sizes, the 44-point minimum touch target, and nine exact application layout dimensions;
- `Typography` contains 27 family, size, line-height, and weight variables;
- 12 text styles cover the bounded system and brand hierarchy;
- five effect styles preserve the current card, hero, image, action, and navigation elevations;
- eight paint styles preserve the current action, premium, pool-border, and pool-fill treatments.

Inter is the neutral Figma representation of native system typography. The running application continues to use the
platform font on iOS and Android; Outfit remains the explicit Blockout display face already bundled in the application.
Safe-area values remain runtime platform inputs and are documented as such instead of becoming fixed tokens. No light
theme, desktop product, provider UI, or new brand layer was introduced.

## Ownership and handoff

Components must consume semantic variables rather than primitives. Primitive colors are hidden from ordinary pickers,
except the black effect color required by the existing shadows. Every variable has a targeted scope and native code
syntax. The syntax establishes the intended future handoff names; it does not modify the current Expo
runtime or introduce automatic Figma-to-code synchronization.

The durable foundation nodes are:

- cover root `9:2`;
- foundations root `10:2`;
- colors `10:5`;
- typography `10:6`;
- spacing and sizing `10:7`;
- radius and borders `10:8`;
- elevation and gradients `10:9`.

## Validation

The final structural pass reports four collections and 144 variables, with all 41 semantic colors resolving through
aliases. It reports zero broken alias, zero missing scope outside the intentionally hidden primitives, zero missing code
syntax, and zero placeholder. All 81 color swatches have variable-bound fills and readable labels. The eight paint
samples wrap inside the 1,280-pixel documentation width, and the complete foundation root renders at 1,440 by 5,897
pixels without cropped content.

Temporary visual-review captures remain outside Git. REF-062 changes no Expo source, runtime behavior, contract,
generated file, provider configuration, deployment, or production state.
