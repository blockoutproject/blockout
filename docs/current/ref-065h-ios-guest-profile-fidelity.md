# REF-065H iOS Guest Profile Fidelity

## Scope

REF-065H reconciles only `Profile / Guest / iOS 393 / Ready` in the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. It does not change Expo
source, application behavior, credentials, provider configuration, Android, Web, or production state.

## Runtime And Source Authority

The source inventory covered:

- `ProfileScreen.tsx`, `ProfileHeader.tsx`, and `GuestUpsellCard.tsx`;
- the shared `GradientButton`, legal menu rows, `TabBar`, and tab layout;
- the shared mobile theme tokens, pinned MaterialCommunityIcons implementation, and
  `assets/users/default_user_avatar.png`.

The native reference is the running iPhone 17 Pro simulator on iOS 26.2. Its captured viewport is `402 × 874` logical
points (`1206 × 2622` pixels). A transient proportional `393 × 852` image was used only for visual measurement against
the canonical Figma viewport and remains outside Git.

The exact guest profile state was captured on 23 July 2026. The Google Mobile Ads development control was excluded
because it is provider development UI, not application UI.

## Canonical Figma Result

The canonical screen remains node `85:1039`. REF-065H made these ownership-first corrections:

- local status-bar approximations were replaced by linked instance `333:2173` of
  `System Chrome / iOS Status Bar` (`267:5`);
- shared `Profile Header` (`337:9`) now represents the source-backed profile title and immediately adjacent report
  action; linked instance `337:17` is used by the screen;
- `Guest Upsell Card / Profile` remains linked to its shared master and uses the source-backed copy, benefit icons,
  spacing, border, radius, and gradient sign-in action;
- the legal title, three linked legal menu rows, and application version match the native vertical rhythm;
- `Guest Bottom Navigation / Profile active` remains linked to `Active=Profile` (`213:8`) at `(16, 756, 361, 64)`;
- the active profile icon now uses the exact committed `default_user_avatar.png` application asset in the shared
  navigation master rather than an invented placeholder;
- the invented home indicator and provider development control remain absent.

The final frame is `393 × 852`, clipped, has no out-of-bounds descendants, and retains linked instance lineage for
system chrome, profile header, guest upsell, legal rows, and guest navigation. The validation label records
`iOS 393 · Validated · 23 Jul 2026`. Full-frame visual comparison and a structural bounds/lineage audit both passed.

## Retained Native Session

The complete local native stack remains active for REF-065I and the following screen-by-screen tasks. Existing Java,
worker, Docker infrastructure, Metro, and iPhone simulator processes must be reused rather than stopped or restarted
between tasks.
