# REF-065J iOS Empty Authenticated Home Fidelity

## Scope

REF-065J reconciles only `Home / Authenticated empty / iOS 393 / Ready` in the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. It does not change Expo
source, application behavior, user favorites, credentials, provider configuration, Android, Web, or production state.

## Runtime And Source Authority

The source inventory covered:

- `FeedScreen.tsx`, `FeedHeader.tsx`, and `MatchList.tsx`;
- the shared `EmptyState`, `StateCard`, `TabBar`, and tab layout;
- the shared theme tokens, empty-state GIF, profile image behavior, and pinned MaterialCommunityIcons implementation.

The authenticated shell and current populated administrator account were revalidated on the running iPhone 17 Pro
simulator with iOS 26.2. The account now has followed entities, so REF-065J did not mutate user data merely to force an
empty result. The state-specific content remains backed by the previously observed authenticated native empty state and
the current Expo implementation: the exact empty GIF, `Aucun match trouvé` title, and current no-favorites guidance.
The provider development control was excluded because it is not application UI.

## Canonical Figma Result

The canonical screen remains node `95:1088`. REF-065J made these ownership-first corrections:

- linked instance `351:2335` of `System Chrome / iOS Status Bar` (`267:5`) owns system chrome;
- shared `Feed Header / Upcoming` (`351:2`) owns the brand, Pro entitlement, Instagram action, three feed tabs, active
  indicator, and report action below the current iPhone safe area; linked instance `351:16` replaces nine local layers;
- linked `No matches` instance `102:1108` remains backed by the shared empty-state component (`32:8`) and current Expo
  copy and illustration;
- linked instance `351:2351` of premium Home-active Bottom Navigation (`140:71`) replaces the detached navigation;
- the complete Bottom Navigation family now follows the Expo avatar behavior for both active and inactive profile
  states, using the current profile visual with the source opacity and scale;
- the invented home indicator remains absent.

The final frame is `393 × 852`, clipped, contains only four top-level linked instances, and has no out-of-bounds
descendants. The validation label records `iOS 393 · Validated · 23 Jul 2026`. Full-frame visual review and a structural
bounds/lineage audit passed.

## Retained Native Session

The administrator session remains on the authenticated Home flow. The complete local native stack, Metro process, and
iPhone simulator remain active for the populated Home reconciliation in REF-065K.
