# REF-065M iOS Populated Team Matches Fidelity

## Scope

REF-065M reconciles only `Team / Upcoming matches / iOS 393 / Ready` in the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. The former empty-state
expectation is obsolete because the local data now provides matches for the selected team. This task does not change
Expo source, application behavior, team or match data, credentials, provider configuration, Android, Web, or production
state.

## Runtime And Source Authority

The authenticated administrator session opened the native `blockout://team/8445` route on the running iPhone 17 Pro
simulator with iOS 26.2. The source inventory covered:

- the Team screen, header, tabs, follow action, match feed, date header, pool header, and match row implementations;
- the shared Pill, Navigation Item, Bottom Navigation, and icon foundations;
- the pinned MaterialCommunityIcons and Ionicons glyphs used by the native profile and match feed;
- the current VOLLEY-BALL PEXINOIS NIORT record and the first three upcoming matches returned by the local gateway.

The visible source-backed state contains matches on 3, 10, and 24 October 2026 in
`PMA PRE-NATIONAL MASCULIN zone NORD`. The provider development control visible over the simulator is not application UI
and remains excluded.

## Canonical Figma Result

The canonical screen remains node `147:1066`. REF-065M made these ownership-first corrections:

- linked `System Chrome / iOS Status Bar` (`267:5`) and entity `Screen Header` (`165:5`) instances own the safe area,
  exact team name, back action, edit action, and report action;
- the real team logo, division, gender, format, season, club link, follow action, and follower count reproduce the
  populated native profile with linked shared components;
- three linked Navigation Item instances preserve the source tab widths, active indicator, labels, and clipped
  horizontal overflow;
- the shared `Match Date Header / Feed` master (`368:3352`) exposes its date as a text property and owns the exact
  calendar icon, typography, spacing, border, and surface;
- the shared `Pool Header / Match Feed` set (`389:56`) owns explicit `Single` and `Double` variants. The screen uses the
  linked `Double` variant (`389:47`) with the real division artwork and a two-line title-metadata block centered
  vertically against the logo and chevron;
- all three linked Upcoming Match Row instances (`138:19`) use the real visible teams, logos, and `20:00` time. Home
  and away names remain centered horizontally and vertically within equal team zones;
- the shared Match Row logo slots are named for their actual team-logo responsibility rather than obsolete placeholder
  content;
- linked premium Home-active Bottom Navigation (`140:71`) owns the floating navigation, and the invented home indicator
  remains absent.

The final frame is clipped at `393 × 852`. Structural validation found three linked date headers, three linked
double-line pool headers, three linked Upcoming match rows, no missing fonts, no detached shell component, no feedback
or empty-state layer, and no active Figma placeholder. The bottom navigation remains the last screen child so its native
overlay relationship is preserved. Full-frame review confirms the real logos, centered match labels, borders, radii,
typography, and clipped continuation beneath the navigation.

## Retained Native Session

The administrator session remains authenticated on the populated Team route. The complete local native stack, Metro
process, and iPhone simulator remain active for the Pool ranking reconciliation in REF-065N.
