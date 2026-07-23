# REF-065I iOS Administrator Profile Fidelity

## Scope

REF-065I reconciles only `Profile / Administrator / iOS 393 / Ready` in the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. It does not change Expo
source, application behavior, credentials, provider configuration, Android, Web, or production state.

## Runtime And Source Authority

The source inventory covered:

- `ProfileScreen.tsx`, `ProfileHeader.tsx`, `ProfileHero.tsx`, and the shared `Hero`;
- the shared Pill families, legal menu rows, account actions, `TabBar`, and tab layout;
- the shared theme tokens and pinned MaterialCommunityIcons implementation.

The native reference is the authenticated BlockOutProject administrator profile running on the iPhone 17 Pro simulator
with iOS 26.2. The captured viewport is `402 × 874` logical points (`1206 × 2622` pixels). A transient proportional
`393 × 852` image was used only for visual measurement against the canonical Figma viewport and remains outside Git.
The profile image was read from the local user record and used transiently to reproduce the exact non-secret visual.
The Google Mobile Ads development control was excluded because it is provider development UI.

## Canonical Figma Result

The canonical screen remains node `92:1037`. REF-065I made these ownership-first corrections:

- linked instance `345:2340` of `System Chrome / iOS Status Bar` (`267:5`) owns system chrome;
- `Profile Header` (`344:26`) now exposes bounded Guest and Administrator variants. Linked instance `344:27` replaces
  the previous header instance plus five screen-local action overlays;
- `Profile Hero` (`345:9`) composes the shared Hero foundation with the source-specific `120 pt` avatar, Pro badge,
  edit action, title, and email pill. Linked instance `345:34` replaces the previous screen-local hero overlays;
- the exact current profile image and account display content replace the former placeholder image and fake email;
- the premium Profile-active navigation master (`140:110`) owns the current authenticated avatar, so the screen-local
  navigation overlay was removed;
- legal rows, account actions, version, and bottom navigation follow the normalized native vertical rhythm;
- the invented home indicator and provider development control remain absent.

The final frame is `393 × 852`, clipped, has no out-of-bounds descendants, and retains linked instance lineage for
system chrome, profile header, profile hero, legal rows, account actions, and premium navigation. The validation label
records `iOS 393 · Validated · 23 Jul 2026`. Full-frame visual comparison and a structural bounds/lineage audit passed.

## Retained Native Session

The administrator session, complete local native stack, Metro process, and iPhone simulator remain active for REF-065J
and the following screen-by-screen tasks. They must be reused rather than stopped or restarted between tasks.
