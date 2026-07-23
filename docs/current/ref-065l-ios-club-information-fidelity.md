# REF-065L iOS Club Information Fidelity

## Scope

REF-065L reconciles only `Club / Information / iOS 393 / Ready` in the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. It does not change Expo
source, application behavior, club data, credentials, provider configuration, Android, Web, or production state.

## Runtime And Source Authority

The authenticated administrator session opened the native `blockout://club/0798259` route on the running iPhone 17 Pro
simulator with iOS 26.2. This retained the live application session while macOS accessibility control was unavailable
after the workstation restart. The source inventory covered:

- `ClubScreen.tsx`, `ClubHeader.tsx`, `ClubHero.tsx`, `ClubTabs.tsx`, and `ClubInformationTab.tsx`;
- the shared `Hero`, `GenericTabView`, `InfoCard`, and `InfoRow` implementations;
- the pinned Ionicons and MaterialCommunityIcons used by the native header, edit action, contact rows, and chevrons;
- the current VOLLEY-BALL PEXINOIS NIORT record and its live logo, contact details, address, and map state.

The provider development control visible over the simulator is not application UI and remains excluded.

## Canonical Figma Result

The canonical screen remains node `145:1075`. REF-065L made these ownership-first corrections:

- linked `System Chrome / iOS Status Bar` (`267:5`) and `Screen Header / Back` (`36:2`) instances own the safe area,
  back action, exact club name, and report action;
- the shared Title Hero variants (`145:16` and `145:24`) now match the full-width Expo Hero structure. The screen uses
  the linked Editable variant with the real logo as both blurred background and 90-point avatar, the current club name,
  and the pinned pencil action;
- the four linked segment Navigation Item instances preserve the native scroll-enabled tab sizing, active indicator,
  labels, and clipping behavior;
- categorized `Club Info Row` set `383:3426` owns the exact icon container, label, value, optional chevron, and pinned
  icon swap. Its only layout variants are `Single` (`378:8265`) and `Double` (`383:3415`);
- five linked rows reproduce the live email, website, city, two-line address, and map action. Link styling and optional
  chevrons follow the Expo props rather than screen-local copies;
- the local contact card composes those linked rows with the source spacing, border, radius, and typography;
- the native map-provider surface remains an explicit clipped boundary with the observed primary border and partially
  visible club marker beneath the floating navigation. No invented provider label or map content remains;
- linked premium Home-active Bottom Navigation (`140:71`) owns the overlay, and the invented home indicator remains
  absent.

The final frame is clipped at `393 × 852`. Structural validation found no missing fonts or unexpected content overflow.
The map continues below the viewport by design, and the last scroll-enabled tab root extends into the clipped tab
viewport while its complete label remains visible, matching the native layout. All five information rows remain linked
to the shared set.

## Retained Native Session

The administrator session remains authenticated on the Club information route. The complete local native stack, Metro
process, and iPhone simulator remain active for the empty Team reconciliation in REF-065M.
