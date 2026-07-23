# REF-065N iOS Pool Ranking Fidelity

## Scope

REF-065N reconciles only `Pool / Ranking / iOS 393 / Ready` in the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. It does not change Expo
source, application behavior, pool or ranking data, credentials, provider configuration, Android, Web, or production
state.

## Runtime And Source Authority

The authenticated administrator session opened the native `blockout://pool/1755` route on the running iPhone 17 Pro
simulator with iOS 26.2. The source inventory covered:

- `PoolScreen`, `PoolProfile`, `PoolTabs`, `RankingTab`, `RankingCard`, `RankingHeader`, and `RankingRow`;
- the shared entity header, Pill, Follow Action, Navigation Item, Bottom Navigation, image, and icon foundations;
- the current public pool response from the local mobile gateway;
- the pinned MaterialCommunityIcons and Ionicons glyphs used by the native profile, ranking medals, and chevrons.

The source-backed state is `PMA PRE-NATIONAL MASCULIN zone NORD`, with Nouvelle Aquitaine, Pré Nationale, Masculin,
season 2026/2027, zero followers, and the first six real ranking teams. The current ranking values are all zero. The
provider development control visible over the simulator is not application UI and remains excluded.

## Canonical Figma Result

The canonical screen remains node `148:1083`. REF-065N made these ownership-first corrections:

- linked `System Chrome / iOS Status Bar` (`267:5`) and entity `Screen Header` (`165:5`) instances replace the previous
  hand-drawn system chrome and own the safe area, exact two-line pool name, back action, edit action, and report action;
- the real division artwork, four linked Pills, Follow Action, follower icon, and follower count reproduce the populated
  native profile;
- four linked Navigation Item instances preserve the exact active ranking state, source labels, widths, and baseline;
- the ranking card is a simple vertical auto-layout matching `RankingCard`: 385 points wide, 18-point radius, 10-point
  list gap, eight-point bottom padding, source border, and clipped content;
- the card header remains linked to the shared double-line `Pool Header / Match Feed` variant (`389:47`) with the real
  division image and metadata;
- the shared `Ranking Row` set (`139:55`) owns Gold, Silver, Bronze, and Standard variants at the source width. Its team
  block now grows like the React Native `flex: 1` layout, while points remain at the trailing edge;
- all six visible rows are linked instances populated with the current rank, full team name, real logo, matches played,
  wins, losses, and points. Only long names receive instance-level fitted font sizes, mirroring
  `adjustsFontSizeToFit`;
- medal ranks, standard rank circles, and point badges center their contents horizontally and vertically. Standard ranks
  remain transparent with a border, while every points badge uses the pool division treatment rather than a rank color;
- linked premium Home-active Bottom Navigation (`140:71`) remains the last screen child, and the invented home indicator
  remains absent.

The final frame is clipped at `393 × 852`. Structural validation found one linked ranking header, six linked Ranking
Rows, six real team-logo image fills, no missing fonts, no feedback or empty-state layer, no active Figma placeholder,
and no detached application-shell component. Full-frame review confirms the source card geometry, variable row heights,
typographic fitting, centered rank and point content, borders, radii, and navigation overlay.

## Retained Native Session

The administrator session remains authenticated on the populated Pool ranking route. The complete local native stack,
Metro process, and iPhone simulator remain active for the finished Match reconciliation in REF-065O.
