# REF-065G iOS Empty Search Fidelity

## Scope

REF-065G reconciles only `Search / Empty clubs / iOS 393 / Ready` in the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. It does not change Expo
source, application behavior, credentials, provider configuration, Android, Web, or production state.

## Runtime And Source Authority

The source inventory covered:

- `SearchScreen.tsx`, `SearchHeader.tsx`, `SearchClubScreen.tsx`, and `SearchResults.tsx`;
- the shared `Filters`, `InfoPillGradient`, `SearchBar`, `TabBar`, and `TabBarItem` components;
- the shared mobile theme tokens and the pinned MaterialCommunityIcons implementation.

The native reference is the iPhone 17 Pro simulator on iOS 26.2. Its captured viewport is `402 × 874` logical points
(`1206 × 2622` pixels). A transient proportional `393 × 852` reference was used only for visual measurement against
the canonical Figma viewport and remains outside Git.

The exact empty-club state was captured from the same source on 23 July 2026. After the complete local stack was
restored, the development client reconnected successfully and the authenticated Search flow returned current team
data through the local gateway. The screen source was unchanged between the empty-state capture and reconciliation.
The search worker still logs the separately tracked `ConcurrentModificationException` during its scheduled full
reindex; that known backend defect does not change the source-backed empty-state composition certified here.

## Canonical Figma Result

The canonical screen remains node `84:1001`. REF-065G made these ownership-first corrections:

- local approximations of the status time, Dynamic Island, and status indicators were replaced by linked instance
  `310:2116` of `System Chrome / iOS Status Bar` (`267:5`);
- the three filter instances remain linked to the `Pill` family and now follow the source-derived header geometry at
  `y=67`;
- the exact `MCI / flag-outline` vector remains at its source-derived `28 × 28` box at `(353, 69)`;
- `Search / Clubs` remains linked to `Search`, `State=Empty` (`82:19`) and now starts at `(8, 115)` with the
  source-defined `377 × 36` geometry;
- the empty result uses portable `Inter Regular 14`, has no missing font, and occupies the source-derived line box at
  `(20, 175)`;
- `Bottom Navigation / Search active` remains linked to `Tone=Premium, Active=Search` (`140:84`) and now occupies
  `(16, 754, 361, 64)`, leaving the native 34-point bottom safe area;
- the invented screen-local Home Indicator was removed. The transient Expo development-menu control and the dynamic
  account avatar are not copied as canonical screen decoration.

The final frame is `393 × 852`, clipped, contains no overflowing child or missing font, and preserves linked lineage
for system chrome, all three pills, Search, and Bottom Navigation. The final full-frame render and focused structural
audit passed against the native reference.

## Retained Native Session

For the following screen-by-screen tasks, the complete local native stack remains active. All application ports answer;
the required gateway, config, search, and Metro paths pass their focused probes:

- the Docker-owned PostgreSQL, RabbitMQ, Elasticsearch, and pgAdmin infrastructure;
- all Java services, `search-worker`, `mobile-gateway`, and `search-service` through their Nx targets;
- Metro through `@blockout/mobile:serve`;
- the booted iPhone 17 Pro development client.

`pools-service` owns application port `8081`, so the retained Metro session uses Expo's official `--port 8100` option.
The development client was reconnected to that port and rebundled successfully. These healthy processes must be reused,
not restarted or stopped after each Figma task.

If the Google Mobile Ads consent prompt reappears in a future simulator task, the agent may select its normal
**Accept** action and continue. This is provider UI interaction, not an authentication or consent bypass; no provider
state is encoded in source or committed evidence.
