# REF-065O iOS Finished Match Fidelity

## Scope

REF-065O reconciles only `Match / Finished / iOS 393 / Ready` in the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. It does not change Expo
source, application behavior, match data, credentials, provider configuration, Android, Web, or production state.

## Runtime And Source Authority

The authenticated administrator session opened the native `blockout://match/127797` route on the running iPhone 17 Pro
simulator with iOS 26.2. The source inventory covered:

- `MatchScreen`, `MatchHeader`, `MatchScoreCard`, `MatchLiveLinkCard`, `MatchScoreDetailsCard`, and `MatchInfoCard`;
- the ranking continuation and the shared status, Screen Header, Pill, Pool Header, Bottom Navigation, image, and icon
  foundations;
- the complete local mobile-gateway response for match 127797;
- the pinned Expo MaterialCommunityIcons and Ionicons glyphs used by the native cards.

The source-backed state is the finished Évreux versus ASPTT ROUEN MSA VB match in the Normandie M15 Régionale pool. It
uses the real 3–0 result, set scores, date, time, venue, teams, logos, division artwork, pool metadata, and document
availability. Signed document URLs remain local runtime data and are not recorded in Figma or documentation. The
provider development control visible over the simulator is not application UI and remains excluded.

## Canonical Figma Result

The canonical screen remains node `148:1228`. REF-065O made these ownership-first corrections:

- linked `System Chrome / iOS Status Bar` (`267:5`) and the new Match variant of the shared Screen Header (`413:2`)
  reproduce the native safe area, back action, federation artwork, and report action;
- categorized reusable Match detail masters now live under Content & Data:
  - `Match Score Card / Status=Finished` (`418:51`);
  - `Match Live Link Card / State=Empty Replay` (`418:52`);
  - `Match Score Details Card / Sets=3` (`418:54`);
  - `Match Information Card / State=Documents` (`418:55`);
- every visible card on the canonical screen is a linked instance of those masters, with native widths, heights,
  padding, gaps, borders, radii, labels, images, and centered score columns;
- transparent federation and team artwork retains the native white rounded image surfaces;
- the information card retains linked Pill instances for division, date, pool, venue, and match sheet actions;
- the pinned MaterialCommunityIcons plus-circle, map-marker, document, calendar, and trophy glyphs are reusable icon
  components. The shared Ionicons `chevron-forward-outline` master was corrected from the exact pinned font glyph and
  remains the linked right action icon;
- the visible ranking continuation remains linked to the double-line Pool Header (`389:47`) with the real division
  artwork and pool metadata;
- linked premium Home-active Bottom Navigation (`140:71`) remains the last screen child, above scrolling content. The
  provider control and an invented home indicator remain absent.

Figma uses the available Inter design-system equivalents for the source iOS system typography, avoiding missing or
non-rendering font layers while retaining the native sizes, weights, alignment, and hierarchy. The final frame is
clipped at `393 × 852`. Structural validation found all four linked Match card masters, one linked Match header, one
linked Pool Header, the exact icon lineage, real image fills, no missing fonts, no active placeholder, and no detached
application-shell component. Full-frame review confirms the iOS geometry, typography, centered score contents, images,
borders, radii, scroll clipping, and navigation overlay.

## Retained Native Session

The administrator session remains authenticated on the finished Match route. The complete local native stack, Metro
process, and iPhone simulator remain active for the Legal document sheet reconciliation in REF-065P.
