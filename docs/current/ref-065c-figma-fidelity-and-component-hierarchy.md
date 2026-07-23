# REF-065C Figma Fidelity And Component Hierarchy

## Authority and scope

[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) remains the only canonical
Blockout design file. REF-065C refines the system produced by REF-065B without changing the Expo application, runtime
behavior, API contracts, generated sources, provider configuration, credentials, deployment, or production state.

The iPhone 17 Pro simulator at `393 x 852`, authenticated iOS captures from REF-064A, and the current React Native
source were the only visual authorities. Android remains a supported technical target but was not launched, captured,
or used for Figma synchronization. React Native Web is not a product surface.

## Component page hierarchy

The former single component canvas was replaced with a compact hierarchy that follows Maaatch's category principle
without copying its larger Web component inventory:

| Order | Page                         | Node     | Ownership                                                |
| ----: | ---------------------------- | -------- | -------------------------------------------------------- |
|     1 | `00 - Cover`                 | `0:1`    | File identity                                            |
|     2 | `10 - Foundations`           | `1:2`    | Variables, typography, effects, and paint styles         |
|     3 | `---`                        | `156:28` | Foundation/component separator                           |
|     4 | `20 - Actions & Inputs`      | `1:3`    | Action, Follow Action, Chip, Field, Search               |
|     5 | `21 - Content & Data`        | `156:16` | Card, Entity Row, Hero, Match Row, Ranking Row           |
|     6 | `22 - Feedback & Overlays`   | `156:20` | Feedback, Sheet                                          |
|     7 | `23 - Navigation`            | `156:24` | Navigation Item, Screen Header, Bottom Navigation        |
|     8 | `---`                        | `156:29` | Component/lifecycle separator                            |
|     9 | `30 - Ready for Development` | `1:4`    | Approved implementation inputs                           |
|    10 | `40 - Shipped`               | `1:5`    | Canonical native compositions backed by runtime evidence |

Each master remains beside its guidance. No generic mobile framework, artificial page per small primitive, detached
copy, or parallel design file was introduced.

## Source-backed master corrections

Shared defects were corrected on their masters before any screen adjustment:

| Family              | Node      | Corrected native geometry or responsibility                                                     |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `Action`            | `24:2`    | `54` height, `20` horizontal padding, `10` content gap                                          |
| `Follow Action`     | `165:20`  | Two compact `30`-point follow states using the consuming division gradient responsibility       |
| `Chip`              | `27:2`    | Visual heights `22`, `28`, and `34` from runtime font and padding values; no false `44` minimum |
| `Search`            | `82:29`   | `36` height, radius `20`, gap `6`, leading `12`, trailing `6`                                   |
| `Hero`              | `134:37`  | Radius `18`, no invented stroke, `12 / 18` padding, Club title variant with a `90` avatar       |
| `Match Row`         | `138:65`  | Radius `14`, hairline border, `8 / 10` padding, source-sized logos, labels, time, and score     |
| `Ranking Row`       | `139:55`  | `58` height, explicit medal/rank treatment, three mini-stat pills, and one-line team truncation |
| `Navigation Item`   | `35:23`   | Native `48`-point segmented tabs with a `3`-point active indicator                              |
| `Screen Header`     | `36:20`   | Transparent `48`-point row, `12` horizontal inset, vector actions, and shared Entity variant    |
| `Bottom Navigation` | `140:123` | Existing `361 x 64` native bar retained; screen placement now honors the iOS bottom inset       |

The library now contains 15 component sets and 74 bounded variants. Reusable component text uses editable Inter, the
neutral Figma representation already established by the foundations task; native screen evidence and runtime source
remain authoritative for iOS system typography. The component audit reports no missing component font.

The existing foundation remains unchanged at 146 variables, 12 text styles, five effect styles, and eight paint styles.
New Follow Action, header-vector, and ranking-stat colors bind to existing semantic variables. The final component
audit reports no unbound solid color or gradient stop.

## Canonical iOS compositions

The five canonical screens remain exactly `393 x 852`. Safe-area alignment now places application headers below the
native top inset and the `361 x 64` bottom navigation at `y = 754`, preserving the native bottom inset.

| Composition                                | Node       | Linked shared responsibilities                                                      | Instances |
| ------------------------------------------ | ---------- | ----------------------------------------------------------------------------------- | --------: |
| `Home / Authenticated populated / iOS 393` | `144:992`  | Match Row, Bottom Navigation                                                        |         6 |
| `Club / Information / iOS 393`             | `145:1075` | Screen Header, Hero, Navigation Item, Bottom Navigation                             |         7 |
| `Team / Empty upcoming / iOS 393`          | `147:1066` | Screen Header, Chip, Follow Action, Navigation Item, Feedback, Bottom Navigation    |        12 |
| `Pool / Ranking / iOS 393`                 | `148:1083` | Screen Header, Chip, Follow Action, Navigation Item, Ranking Row, Bottom Navigation |        17 |
| `Match / Finished / iOS 393`               | `148:1228` | Chip, Bottom Navigation                                                             |         3 |

The 45 linked instances replace repeated headers, pills, profile actions, tabs, feedback, match rows, ranking rows, and
bottom navigation. Component properties carry the canonical labels and states; vector actions avoid font-dependent
icon glyphs.

The Home feed header and compact feed tabs remain local because their animated logo, social action, entitlement state,
report action, and compact tab spacing form a distinct runtime responsibility. Club contact and map content, Team and
Pool identity composition, and the Match score, replay, information, and custom header compositions also remain local
business structures. They are not detached substitutes for a matching shared family.

The Club map extends below the immediate viewport because its native tab scrolls. The Team ranking tab extends beyond
the right edge because the native tab bar scrolls horizontally. These are intentional content bounds, not layout
defects.

## Validation

The final Figma audit reports:

- the expected ten-page order with all 15 component sets on their four owning category pages;
- 74 component variants and zero missing font across 181 component text nodes;
- zero unbound solid color or gradient stop in the reusable component masters;
- 146 variables, 12 text styles, five effect styles, and eight paint styles;
- five canonical `393 x 852` iOS compositions with 45 linked instances;
- source-backed chip heights `22 / 28 / 34`, search height `36`, header height `48`, match-row height `54`, ranking-row
  height `58`, and bottom navigation at `y = 754`;
- no unexplained immediate overflow, detached replacement for a matching family, Android capture, Web artifact, or
  parallel canonical file;
- representative screenshot review of the four component category pages and Home, Club, Team, Pool, and Match at the
  exact native viewport.

Some static iOS evidence labels retain SF Pro or Outfit metadata that the remote Figma execution environment cannot
load. They are visual evidence rather than reusable masters: all component text remains editable Inter, and the native
simulator plus runtime source remain the authority for system typography.

Transient screenshots and simulator state remain outside Git.
