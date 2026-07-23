# REF-065R iOS Guest Profile Header Consistency

## Scope

REF-065R corrects only the guest `Profile Header` component and its linked instance in
`Profile / Guest / iOS 393 / Ready` inside the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. It does not change Expo
source, application behavior, authentication state, user data, credentials, provider configuration, Android, Web, or
production state.

## Runtime And Source Authority

The source inventory covered:

- `ProfileScreen.tsx` and `ProfileHeader.tsx`;
- the shared mobile theme and layout tokens;
- the pinned Expo MaterialCommunityIcons implementation of `flag-outline`;
- the prior guest and administrator iPhone 17 Pro captures and their canonical Figma screens.

`ProfileHeader.tsx` uses a fixed `48 pt` row, `12 pt` horizontal padding, a flexible title, and a right-aligned action
group. Its report action renders a `28 pt` `flag-outline` icon, while native `hitSlop` expands the interactive target
without changing visual geometry. The guest iOS capture confirms that the flag sits at the right edge. The previous
guest Figma variant instead placed it immediately after the title.

The retained iPhone 17 Pro simulator runs iOS 26.2 with a `402 × 874` logical viewport. The existing sanitized guest
capture was proportionally normalized to the canonical `393 × 852` viewport for measurement. The current authenticated
session was not logged out or otherwise mutated to recreate that already-recorded state. The Google Mobile Ads
development control remains excluded because it is provider development UI.

## Canonical Figma Result

The shared `Profile Header` component set remains node `344:26`, with Guest master `337:9` and Administrator master
`344:9`. REF-065R made these ownership-first corrections:

- the obsolete hidden leading slot `337:10` was removed from the Guest master;
- `spacing/3` (`VariableID:4:45`, `12 pt`) now owns both horizontal paddings and `spacing/2`
  (`VariableID:4:44`, `8 pt`) owns the bounded title-to-action gap;
- title `337:11` fills the available row from `(12, 12)` with a `333 × 24` box;
- trailing action `337:12` occupies `(353, 10)` at `28 × 28`, placing existing MaterialCommunityIcons vector
  `337:14` on the same right edge as the Administrator variant;
- the former guest screen instance `337:17`, which retained a deleted-child override, was replaced at the same layer
  index and `(0, 60)` position by clean linked instance `468:2824`;
- Administrator instance `344:27` remains unchanged and override-free.

The component description now records the shared right-action responsibility, variant roles, pinned icon lineage, and
native ownership of the expanded touch target. No component family, variant axis, variable, detached overlay, or
screen-local repair was added.

## Validation

The final component and screen passes verified:

- both Profile variants remain exactly `393 × 48`;
- the guest and administrator canonical screens remain clipped `393 × 852` frames;
- both Profile Header consumers are linked to their owning variant and have zero overrides;
- the guest flag is horizontally right-aligned and vertically centered at the exact source-backed geometry;
- existing color, spacing, radius, and typography bindings resolve with no missing font;
- neither canonical Profile screen contains an active placeholder or out-of-bounds descendant;
- the administrator full-screen render is visually unchanged;
- the guest full-screen render matches the recorded native header structure and preserves all previously certified
  content and navigation.

The canonical guest screen remains node `85:1039` with evidence label `85:1038`. The administrator regression screen
remains node `92:1037`. Transient simulator and Figma screenshots remain outside Git.

## Retained Native Session

The complete Java application stack, search service and worker, mobile gateway, Docker infrastructure, Metro on port
`8100`, and the booted iPhone 17 Pro simulator remain active for the following authorized native task. REF-066 is not
started by this correction.
