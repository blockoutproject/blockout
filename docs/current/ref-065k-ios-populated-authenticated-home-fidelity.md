# REF-065K iOS Populated Authenticated Home Fidelity

## Scope

REF-065K reconciles only `Home / Authenticated populated / iOS 393 / Ready` in the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. It does not change Expo
source, application behavior, favorites, credentials, provider configuration, Android, Web, or production state.

## Runtime And Source Authority

The running iPhone 17 Pro simulator with iOS 26.2 supplied the authenticated administrator state and visible match data.
The source inventory covered:

- `FeedScreen.tsx`, `FeedHeader.tsx`, `MatchList.tsx`, `MatchDateHeader.tsx`, and `MatchPoolSection.tsx`;
- `RankingHeader.tsx` and the shared `InfoPillGradient`, `MatchRow`, theme, and spacing foundations;
- the pinned MaterialCommunityIcons `calendar-blank-outline` glyph and Ionicons
  `chevron-forward-outline` glyph;
- the current local gateway response and image URLs used by the native screen.

Only the content visible in the native viewport was represented: the complete 26 September group, the five visible
27 September matches, and the next clipped section beneath the floating navigation. Temporary downloaded images and
Figma upload frames were not added to Git and were removed from the Figma canvas after their image hashes had been
assigned.

## Canonical Figma Result

The canonical screen remains node `144:992`. REF-065K made these ownership-first corrections:

- linked `System Chrome / iOS Status Bar` (`267:5`), `Feed Header / Upcoming` (`351:2`), and premium Home-active Bottom
  Navigation (`140:71`) instances own the application shell;
- reusable `Match Date Header / Feed` (`368:3352`) owns the exact 216 × 30 surface, border, spacing, 14-point
  extra-bold label, and linked `calendar-blank-outline` component (`364:3266`);
- reusable `Pool Header / Match Feed` (`364:4068`) owns the blurred division artwork, overlay, exact division logo,
  pinned Ionicons chevron, and a title-subtitle block centered vertically against both the 51-point header and the
  division logo;
- all seven visible match rows remain linked to the shared Upcoming `Match Row` master (`138:19`); every home and away
  team-name block is centered horizontally and vertically across all four shared Match Row states;
- row instances use the real visible team names and logos, with the same per-row text shrinking produced by the native
  `adjustsFontSizeToFit` behavior while preserving centered two-line bounds;
- the two complete pool cards and the intentionally clipped next card retain the current gradient border, 16-point
  radius, row spacing, and overlay relationship with the floating navigation;
- no invented home indicator or provider development control appears in the product frame.

The final frame is clipped at `393 × 852`. Structural validation found three linked date headers, three linked pool
headers, seven linked Upcoming match rows, no missing fonts, no detached app-shell components, and no unexpected
out-of-bounds layer. The only overflow is the source-backed next pool section intentionally clipped below the viewport.

## Retained Native Session

The administrator session remains authenticated. The complete local native stack, Metro process, and iPhone simulator
remain active for the Club information reconciliation in REF-065L.
