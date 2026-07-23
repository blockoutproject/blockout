# REF-065B Faithful Native Figma System

## Authority and scope

[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) remains the only canonical
Blockout design file. REF-065B reconciles its foundations, component library, and five complete authenticated
compositions with the current Expo source and the authenticated iOS evidence established by REF-064A.

The iPhone 17 Pro simulator at `393 x 852` is the only visual authority used by this task. Android remains a supported
runtime, but it was not launched, captured, compared, or certified visually. React Native Web is not a product surface
and has no Figma lane, variable syntax, or current design artifact.

No Expo source, runtime behavior, API contract, generated artifact, provider configuration, credential, deployment, or
production state changed.

## Foundations

The existing foundation model was retained instead of being recreated. Its four local variable collections contain
146 variables:

| Collection         | Variables | Purpose                                                                |
| ------------------ | --------: | ---------------------------------------------------------------------- |
| `Color Primitives` |        40 | Exact palette, action, premium, pool, and effect values                |
| `Color`            |        41 | Dark semantic aliases used by components and compositions              |
| `Dimensions`       |        38 | Spacing, radii, borders, icons, touch targets, and application metrics |
| `Typography`       |        27 | Native system and Blockout brand typography values                     |

The system also retains 12 local text styles, five effect styles, and eight paint styles. Free-standing iOS text and
component text now use the local `SF Pro` system styles, while the Blockout wordmark uses the local `Outfit` brand
style. Variables have targeted scopes and native code syntax only. The malformed native syntax on
`text/on-primary` (`VariableID:4:13`) was corrected without changing its value.

The durable foundation root remains `10:2`.

## Component library

The component page now contains 14 bounded component sets and 71 variants. Existing families were retained and linked
to local text styles; four additional families were added only where repeated runtime responsibility was proven.

| Component set       | Node      | Variants | Responsibility                                              |
| ------------------- | --------- | -------: | ----------------------------------------------------------- |
| `Action`            | `24:2`    |        9 | Primary, secondary, destructive, disabled, and loading      |
| `Chip`              | `27:2`    |        9 | Filters, metadata, and finite status pills                  |
| `Field`             | `29:2`    |        8 | Input and select anatomy                                    |
| `Card`              | `31:18`   |        4 | Shared entity and grouped-content surfaces                  |
| `Feedback`          | `32:26`   |        4 | Loading, empty, search, and recoverable error states        |
| `Entity Row`        | `33:20`   |        3 | Repeated entities and skeleton state                        |
| `Navigation Item`   | `35:23`   |        4 | Segmented and bottom-navigation items                       |
| `Screen Header`     | `36:20`   |        3 | Back, close, and plain native headers                       |
| `Sheet`             | `37:44`   |        4 | Form and confirmation sheets                                |
| `Search`            | `82:29`   |        3 | Empty, filled, and focused search input                     |
| `Hero`              | `134:37`  |        4 | Club and user-profile hero, with optional metadata and edit |
| `Match Row`         | `138:65`  |        4 | Upcoming, finished, live, and replay match summaries        |
| `Ranking Row`       | `139:55`  |        4 | Gold, silver, bronze, and standard ranking rows             |
| `Bottom Navigation` | `140:123` |        8 | Default/premium navigation with one active native tab       |

The component root remains `21:2`. All component content uses semantic variables and local text styles. The library has
no standalone component, duplicate component-set name, unbound solid paint, unstyled text, Web syntax, or speculative
generic framework.

## Canonical iOS compositions

The five authenticated compositions were rebuilt from reusable instances where ownership is real. Verified
replacements were promoted under the original names before the detached predecessors were removed.

| Composition                                | Node       | Linked families                    | Instances |
| ------------------------------------------ | ---------- | ---------------------------------- | --------: |
| `Home / Authenticated populated / iOS 393` | `144:992`  | `Match Row`, `Bottom Navigation`   |         6 |
| `Club / Information / iOS 393`             | `145:1075` | `Hero`, `Bottom Navigation`        |         2 |
| `Team / Upcoming matches / iOS 393`        | `147:1066` | Match feed, `Bottom Navigation`    |         2 |
| `Pool / Ranking / iOS 393`                 | `148:1083` | `Ranking Row`, `Bottom Navigation` |         7 |
| `Match / Finished / iOS 393`               | `148:1228` | `Bottom Navigation`                |         1 |

Each screen is exactly `393 x 852`, contains no immediate overflow, uses only `SF Pro` and the intentional `Outfit`
wordmark, and is the sole visible screen beneath its evidence label. Detail routes keep the feed-stack Home tab active,
matching the current Expo Router structure.

The match summary remains a local business composition because its score, replay, information, and pool-link anatomy
does not share the responsibility of a compact `Match Row`. Team and pool profile headers likewise remain local; only
their repeated feedback, ranking, hero, and navigation responsibilities became component instances. This keeps the
library reusable without a prop-heavy generic screen abstraction.

The obsolete detached nodes `114:1115`, `114:1172`, `116:1115`, `116:1157`, and `116:1227` were removed after their
replacements passed structural and visual review. The canonical native-screen root remains `78:957`.

## Intentional normalization and limits

Small incidental typography differences were normalized to the local semantic type ramp. Existing semantic color,
spacing, radius, border, and elevation choices were preserved when changing them would materially alter the shipped
identity. Sanitized names and addresses remain in the compositions. The existing safe empty-state asset is retained;
provider-controlled maps remain explicit boundaries rather than reconstructed Blockout components.

The final simulator relaunch was covered by the native push-notification physical-device alert and advertising-consent
provider overlay. No bypass or test-only branch was introduced. REF-065B therefore relies on the authenticated iOS
runtime captures recorded by REF-064A plus current runtime source for the five screen states; the provider overlays and
physical-device-only notification path remain outside static Figma certification.

## Validation

The final Figma audit reports:

- 146 variables, zero `ALL_SCOPES`, and zero Web syntax;
- 14 component sets and 71 variants;
- zero standalone component, duplicate set name, unstyled component text, or unbound solid component paint;
- five canonical `393 x 852` iOS screens with 18 linked instances in total;
- zero unstyled canonical text, unsupported font family, immediate child overflow, Web-named node, or obsolete screen;
- representative visual review of Home, Club, Team, Pool, Match, Search, Hero, Match Row, Ranking Row, and Bottom
  Navigation.

Temporary screenshots and the local progress ledger remain outside Git.
