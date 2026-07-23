# REF-065E iOS Sign-In Fidelity

## Authority and scope

[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) remains the only canonical
Blockout design file. REF-065E reconciles only `Access / Sign in / iOS 393 / Ready` (`79:964`) against:

- the current Expo implementation in `SignInScreen.tsx`;
- a fresh iPhone 17 Pro simulator capture;
- the existing `393 x 852` canonical Figma viewport.

The simulator renders at `402 x 874` logical points. Its capture was proportionally normalized to the established
`393 x 852` Figma viewport for measurement; the native app, source layout, and canonical frame were not resized or
changed. Android and Web were not launched.

No Expo runtime source, API contract, generated artifact, provider configuration, credential, deployment, or
production state changed. Runtime account details and transient simulator captures remain outside Git.

## Master-first corrections

Reusable differences were corrected before the screen composition:

| Responsibility         | Master or section | Correction                                                                                 |
| ---------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| MaterialCommunityIcons | `265:2`           | Added exact Flash, Trophy, Bell outline, and Account vector components from the pinned app |
| `Chip`                 | `27:2`            | Added icon properties and source-backed centered icon-label layout                         |
| `Action`               | `24:2`            | Added Account swapping plus the native CTA typography, ink, and elevation                  |
| iOS system status bar  | `267:5`           | Added one reusable `393 x 59` status-bar component with native geometry                    |
| iOS status-bar time    | `276:16`          | Kept the canonical `9:41` label visible with the portable Figma font already used here     |

The four icon components are `265:5`, `265:9`, `265:13`, and `265:17`. Chip and Action consumers now use
`INSTANCE_SWAP`; the former screen-local overlay frames were removed. The status-bar instance `273:1853` is linked to
its Navigation master.

Figma's connected host lists SF Pro but still reports edited nodes as missing and retains stale text widths. The
status time therefore uses `Inter Semi Bold` at the same `16 / 19` geometry, while Chip and Action labels use
weight-equivalent `Inter Bold` and `Inter Extra Bold`. Their sizes, line heights, and letter spacing remain those of
the native implementation. This portable fallback is confined to the editable Figma representation and does not
change the native source or its system font.

## Screen reconciliation

The canonical composition now uses the following measured geometry:

| Element             | Position and size                           |
| ------------------- | ------------------------------------------- |
| Status bar          | `x=0`, `y=0`, `393 x 59`                    |
| Brand mark          | `x=81`, `y=271`, `36 x 36`                  |
| Brand title         | `x=127`, `y=265`, `185 x 48`                |
| Tagline             | `x=20`, `y=330`, `353 x 44`                 |
| Scores chip         | `x=30`, `y=390`, `82 x 28`                  |
| Rankings chip       | `x=120`, `y=390`, `117 x 28`                |
| Followed teams chip | `x=245`, `y=390`, `119 x 28`                |
| Sign-in action      | `x=55`, `y=435`, `283 x 54`                 |
| Guest action        | centered at `y=507`                         |
| Legal notice        | `x=20`, `y=557`, `353 x 28`, `14` line high |

The screen contains no detached MaterialCommunityIcons frame, no non-native blue stroke, and no invented home
indicator. The three chips remain linked to `26:11`, the sign-in action remains linked to `23:2`, and every visible
icon remains linked to its exact isolated component. Each Chip centers its complete icon-label group; the primary
Action uses the source `10` gap, dark Account icon, `0.3` label tracking, and `0 / 8 / 12 / 18%` shadow. The runtime-only
development gear overlay was excluded.

## Functional evidence

The authentication path was exercised after the local restart:

1. `users-service`, `config-service`, and `mobile-gateway` were started through their Nx Maven targets.
2. Auth0 authorization completed with the existing Blockout test administrator.
3. The authenticated shell and Profile screen loaded after the current user was ensured by the local backend.
4. SSO sign-out completed from Profile and returned to the sign-in screen.

The simulator's expected physical-device warning for push notifications was dismissed. No authentication bypass,
temporary source change, or persisted credential was introduced.

## Validation

The final Figma audit confirms:

- one exact `393 x 852` screen and one dated `REF-065E` validation label;
- one linked iOS status-bar instance;
- three linked Chip instances and one linked Action instance;
- four exact icon component lineages through instance-swap properties;
- centered, non-missing Chip text metrics and source-equivalent Action text metrics;
- the native primary-action icon color and elevation through shared component masters;
- zero detached icon overlay, home indicator, or blue stroke;
- exact source-backed copy, colors, radii, borders, alignment, and safe-area placement;
- a successful connect-then-disconnect iOS cycle with the local backend;
- no edit to any canonical screen after REF-065E and no work on REF-065F.

The screen is labeled `iOS 393 · REF-065E validated · 23 Jul 2026`. Screenshots and local service processes remain
transient evidence outside Git.
