# REF-065Q iOS Live Empty Authenticated Home Fidelity

## Scope

REF-065Q revalidates only `Home / Authenticated empty / iOS 393 / Ready` in the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. It replaces the temporary
state-evidence limitation recorded by REF-065J now that the authenticated account reaches a real empty match result.
It does not change Expo source, application behavior, user favorites, credentials, provider configuration, Android,
Web, or production state.

## Runtime And Source Authority

The current authenticated state was captured on the running iPhone 17 Pro simulator with iOS 26.2 after the user
changed their followed content. A complete application relaunch reloaded the session and reproduced the same empty
result. The native capture is `1206 × 2622` pixels for a `402 × 874` logical viewport and was proportionally normalized
to the canonical `393 × 852` Figma viewport for measurement.

The source inventory covered:

- `FeedScreen`, `FeedHeader`, and the Upcoming `MatchList`;
- `EmptyState` and its shared `StateCard`;
- the current dark theme, layout tokens, empty GIF, and pinned Expo MaterialCommunityIcons font;
- the shared iOS status bar and premium Home-active bottom navigation.

The persistent runtime state displays the empty GIF, `Aucun match trouvé`, the selected-team-or-pool explanation, and
the `Réessayer` action with its refresh icon. The simulator provider development control is not application UI and
remains excluded.

## Canonical Figma Result

The canonical screen remains node `95:1088`, with evidence label `93:1071`. REF-065Q made these ownership-first
corrections:

- the shared `Feedback / Type=Empty` master (`32:8`) now follows the current `StateCard` action geometry rather than a
  screen-local approximation;
- its retry action (`32:12`) is `137 × 44`, uses the source horizontal and vertical padding, eight-point content gap,
  full pill radius, semantic primary fill, and primary text color;
- exact `refresh` glyph `984144` was extracted from the repository-pinned MaterialCommunityIcons TTF and added as the
  categorized reusable `Icon / MCI / Refresh` master (`462:4`);
- the action remains controlled by the existing `Show Action` property and its label by the existing text property;
  no additional variant axis or detached overlay was introduced;
- linked instance `102:1108` now exposes the real message, visible retry action, and source-backed content height at
  the measured native vertical position;
- linked Feed Header (`351:2`), iOS Status Bar (`267:5`), and premium Home-active Bottom Navigation (`140:71`) remain
  unchanged.

The final screen is clipped at `393 × 852`. The normalized iOS and Figma renders share the exact empty-image top,
button width, and button top; the title differs by two pixels because Figma uses the approved portable Inter equivalent
instead of the native system font. The 44-point Figma button preserves the exact source touch target even though
viewport normalization renders it as approximately 40 pixels in the scaled simulator capture.

Structural validation found only linked application-shell, Empty, and refresh-icon instances; exact screen geometry;
the real copy and action properties; no missing font; no active placeholder; and no descendant overflow. The Empty
master has no other consumer on `30 - Ready for Development`, so the shared correction introduces no unexplained
screen regression.

## Retained Native Session

The authenticated Home state, complete local native stack, Metro process, and iPhone simulator remain active. REF-066
is not started by this corrective task.
