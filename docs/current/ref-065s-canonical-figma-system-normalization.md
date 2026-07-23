# REF-065S Canonical Figma System Normalization

## Scope

REF-065S canonicalizes the existing
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file before Expo adopts its visual
system in REF-066. Figma was the sole visual authority for this task. The iOS simulator was not inspected, launched, or
used to arbitrate a value.

The task changes no Expo source, application behavior, authentication, provider configuration, credentials, user data,
Android, Web, or production state. The complete local native stack was left untouched.

## Canonical Foundations

The final file contains four local variable collections and one mode per collection:

| Collection         | Mode    | Variables |
| ------------------ | ------- | --------: |
| `Color Primitives` | `Value` |        40 |
| `Color`            | `Dark`  |        45 |
| `Dimensions`       | `Value` |        40 |
| `Typography`       | `Value` |        26 |
| **Total**          |         |   **151** |

The former identical iOS and Android typography modes were collapsed into one `Value` mode. Inter is the portable
system face in Figma and Outfit remains limited to Blockout brand expression. The file owns:

- 16 local text styles, all documented and used;
- eight local paint styles;
- five local effect styles;
- a four-point spacing scale plus one two-point optical-alignment token;
- nine bounded radius roles, three border widths, exact mobile dimensions, and semantic color aliases.

The Foundations page contains no missing font, unstyled text, CSS-like `var(...)` label, platform-mode claim, active
placeholder, or stale repair. Its 45 unique icon masters use deterministic `Icon / Library / glyph-name` ownership.
There is no raw MaterialCommunityIcons or Ionicons frame and no duplicate icon-master name.

## Component Ownership

The compact component hierarchy remains split by responsibility:

| Page                       | Component sets | Component masters |
| -------------------------- | -------------: | ----------------: |
| `20 - Actions & Inputs`    |              7 |                56 |
| `21 - Content & Data`      |              8 |                36 |
| `22 - Feedback & Overlays` |              2 |                 9 |
| `23 - Navigation`          |              5 |                23 |
| **Reusable UI total**      |         **22** |           **124** |

Together with the 45 icon masters, the canonical system contains 169 component masters. Every editable master uses
semantic fill and stroke ownership, bound non-zero spacing, bound radii and border widths, a local text style, a
resolvable font, and linked nested instances. No component page contains an active placeholder, placeholder-named
layer, missing main component, or unexplained solid paint.

The normalization also:

- moved all icon masters into categorized MaterialCommunityIcons and Ionicons foundations;
- moved the Pool Header owner into `21 - Content & Data`;
- created one `Profile Legal Menu` composition for the three legal routes;
- created one transparent `Profile Version Label` with a single `Version` text property;
- created one transparent `Follower Count` with a fixed shared icon and a single `Count` text property;
- renamed image placeholders as explicit image, backdrop, and crest slots;
- retained bounded Action, Pill, Gradient Pill, Field, Search, Filter, Feedback, Sheet, Header, Tab, and Bottom
  Navigation APIs instead of adding generic configuration surfaces.

## Canonical Screens

`30 - Ready for Development` contains only its heading, certification note, and `Canonical Mobile Screens`. The eleven
approved screens remain `393 × 852`:

1. `Access / Sign in`;
2. `Search / Populated teams`;
3. `Profile / Guest`;
4. `Legal / Imprint sheet`;
5. `Profile / Administrator`;
6. `Home / Authenticated empty`;
7. `Home / Authenticated populated`;
8. `Club / Information`;
9. `Team / Upcoming matches`;
10. `Pool / Ranking`;
11. `Match / Finished`.

All eleven sections use the same `Figma canonical · 393 × 852` authority badge. Their combined trees contain 239 linked
instances. The final cross-screen audit reports:

- zero missing main components;
- zero missing fonts or unstyled local text;
- zero unbound local fills, strokes, non-zero spacing, or reusable radii;
- zero raw icon frames, placeholders, or active shimmer states;
- zero repeated screen-local responsibility.

The legal copy is a local token-bound vertical composition because its document content is unique. Its four sections
now reflow deterministically without absolute-position overlap. Variable-length match and ranking compositions also
remain local where their business structure is unique, while their rows, headers, controls, actions, icons, and
navigation use shared instances.

## Intentional Exceptions

- The `28 pt` canonical device-frame radius is preview geometry, not a product token.
- Uploaded logos, crests, and photographic media remain content assets or explicitly named media slots.
- Vector-path geometry remains owned by the exact pinned icon glyph rather than by layout variables.
- Provider behavior, safe areas, scrolling physics, touch targets, and interaction state remain runtime concerns.
- Android remains a supported technical target, but REF-065S creates no second visual mode and reports no Android
  visual execution.

## Lifecycle And Visual Validation

Legacy functional-coverage material was moved out of Ready into the auto-sized, unclipped
`40 - Shipped / Shipped functional coverage` hierarchy. It retains five historical feature groups with no missing font,
missing component, or active placeholder.

Fresh complete renders were inspected for Foundations, all four component pages, the complete Ready hierarchy, and the
eleven canonical screens. Focused renders verified the newly shared version and follower components, Team and Pool
headers, both Profile states, and the legal document after reflow. Transient renders remain outside Git.

Repository closure passed:

- Prettier verification for the policy, roadmap, and evidence files;
- `git diff --check`;
- `npm exec nx show projects`, which still resolves the complete workspace graph;
- focused worktree review proving that REF-065S changes only the Figma policy, roadmap, and this evidence.

REF-066 must consume this certified Figma system as its visual target. It may validate behavior and accessibility in
the application, but it must not recalibrate the certified tokens or component geometry from the pre-adoption runtime.
