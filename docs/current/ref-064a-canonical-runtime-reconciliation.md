# REF-064A Canonical Runtime Reconciliation

## Outcome

REF-064A replaces representative specification-only claims with complete canonical compositions backed by the running
authenticated iOS application. The canonical file remains
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb), on
`30 - Ready for Development` under frame `78:957` (`Canonical Web + iOS Screens`). Runtime source remains authoritative
for behavior, navigation, authorization, data, copy, accessibility, and provider behavior.

The workstation was restarted during the task. Docker infrastructure, all twelve Java applications, the Expo development
client, and the iPhone 17 Pro simulator were restored before collecting evidence. Temporary captures were kept outside
Git. No token, credential, private account identifier, or production payload was written to Figma or documentation.

## Runtime evidence

The authenticated iOS session was exercised on an iPhone 17 Pro simulator with a `393 x 852` application viewport.
The following complete states were observed and reconstructed with sanitized representative content:

| State                        | Figma row  | Canonical screen |
| ---------------------------- | ---------- | ---------------- |
| Authenticated populated home | `114:1218` | `114:1115`       |
| Club information             | `114:1228` | `114:1172`       |
| Team upcoming empty state    | `116:1275` | `116:1115`       |
| Pool ranking                 | `116:1285` | `116:1157`       |
| Finished match               | `116:1295` | `116:1227`       |

The screens preserve the current dark identity, information hierarchy, native safe areas, bottom navigation, provider
boundaries, and feature ownership. They normalize only incidental spacing and proportions. The long team ranking label
that currently overflows on iOS is represented as a bounded `Classement · M15` tab; the runtime defect is deferred to
REF-068 rather than reproduced as a design rule.

The existing Web canonical rows remained available from earlier runtime observation. After the workstation restart,
the Chrome extension was not exposed to this session, so the five new rows mark their Web lane as unavailable instead
of manufacturing evidence. The product direction then changed to native-only. REF-065A is the isolated removal task for
React Native Web code, configuration, environment values, tests, documentation, and Figma lanes. Android was not
launched in REF-064A and is not reported as observed.

## Blocking corrections

Two narrow runtime corrections were required to reach representative authenticated states:

- `@gorhom/bottom-sheet` was updated from `5.2.6` to `5.2.14`, eliminating its call to the removed React Native
  measurement method that crashed native sheet initialization under the current Expo 55 stack.
- Mobile match-list enrichment now preserves `season`, `pool`, live-link ownership fields, and a non-null empty ranking
  before mapping to the generated public contract. A focused test first reproduced the missing required fields, then
  passed after the minimal correction. The real filtered endpoint changed from HTTP `500` to HTTP `200`, returning four
  day groups and a complete first match (`season` and `pool.id` included).

No public contract, generated source, database, provider, authentication flow, deployment, or production state changed.
The unrelated `search-worker` cache `ConcurrentModificationException` remains isolated in REF-071.

## Figma validation

The five new rows each measure `1200 x 973`; every canonical iOS composition measures `393 x 852`. The final canonical
frame measures `1280 x 11158`, and the `Ready for Development` root measures `1440 x 20220`.

The structural audit reports:

- zero duplicate canonical screen name;
- zero descendant overflow in the five iOS compositions;
- semantic color-variable bindings throughout every screen (37 to 65 bound nodes per composition);
- sanitized content only;
- explicit unavailable evidence instead of a fabricated Web rendering;
- no Android certification claim.

Rendered screenshots of all five rows were inspected after mutation. The canonical screens remain on
`30 - Ready for Development`; nothing moves to `40 - Shipped` before the native implementation and final certification.

The focused mobile-gateway reactor completed 41 tests with no failure under the repository's Java 21 runtime. Mobile
lint, typecheck, and all 58 Jest tests also passed through Nx. The dependency audit reports no high or critical issue,
but retains 12 moderate transitive advisories in the Expo native toolchain; npm's proposed forced fix would downgrade
Expo and was not applied. Expo's local dependency check also records the pre-existing React Native `0.83.6` versus
`0.83.10` patch mismatch. Both dependency findings remain separate from this blocking runtime correction.

## Deferred findings

- REF-065A removes React Native Web before the design-system implementation starts.
- REF-068 owns the observed team-tab overflow and the corresponding native discovery-screen alignment.
- REF-071 owns the search projection cache concurrency defect discovered while restoring representative data.
- Physical-device notifications, purchases, advertising consent, maps, PDFs, and other provider-owned behavior remain
  outside static Figma proof.
