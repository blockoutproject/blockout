# REF-064 Figma Screen Certification

## Visual authority

> **Reconciliation note:** REF-064 established complete specification coverage, not pixel-complete screen certification.
> Its 39 compact frames document composition intent and required states, but they are not full-height runtime screen
> reproductions. REF-064A added five complete authenticated iOS compositions backed by current runtime evidence. Their
> exact nodes, validation, corrections, and limits are recorded in
> [the canonical runtime reconciliation](./ref-064a-canonical-runtime-reconciliation.md).

The [`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file is now the visual
authority for the Blockout mobile refactor. The running application and runtime source remain authoritative for
behavior, navigation, authorization, data flow, copy, accessibility, and native provider integration.

The specification set lives on `30 - Ready for Development`. Nothing moved to `40 - Shipped`: that lifecycle step
belongs to the later Expo implementation and native verification tasks.

## Certified scope

REF-064 reconstructs all 39 rows of the REF-061 matrix as compact mobile specification frames. Each frame records the
intended composition, reusable component instances, sanitized representative content, evidence origin, and named state
coverage. These chips are an inventory, not rendered instances of every state. The set contains 210 named state labels
across five groups:

| Group                                    | Screen frames |
| ---------------------------------------- | ------------: |
| Bootstrap, access, and application shell |             7 |
| Feed, search, and notifications          |             7 |
| Profile and internal tools               |             8 |
| Clubs and teams                          |             7 |
| Pools, matches, and cross-feature flows  |            10 |

Frame names follow `Domain / Screen / Viewport / State`. Twenty-one frames use the representative `iOS 393` viewport
and eighteen use `Android 411`. The compositions preserve the current dark native identity and use the REF-062
foundations and REF-063 component masters. They do not define a 1,920-by-1,080 product or a separate Web design.

## Evidence and provider boundaries

Every frame identifies whether its source was observed, previously certified, reconstructed from current source, or a
combination of those forms of evidence. Authenticated administrator compositions use only sanitized labels; no account
identifier, credential, token, or private payload is present.

Three provider-owned surfaces are explicit reference boundaries rather than imitations of Blockout UI:

- advertising consent;
- the native pool map and its Web-unavailable state;
- native and Web PDF rendering.

Auth0 remains an external handoff state on the sign-in composition. Store opening, confirmations, safe areas, gestures,
keyboard behavior, maps, documents, and provider screens remain runtime responsibilities that static Figma frames
cannot prove.

## Normalization

The screen set resolves accidental spacing, alignment, radius, control, list, feedback, and sheet differences through
the approved variables and component instances. It does not alter information hierarchy, permissions, feature
ownership, routes, or product behavior. Screen-specific composition stays local; shared masters remain limited to the
nine families certified by REF-063.

## Validation

The final REF-064 structural audit reports:

- 39 uniquely keyed specification frames and 210 named state labels;
- 21 `iOS 393` and 18 `Android 411` frames;
- section counts of 7, 7, 8, 7, and 10, matching the authoritative matrix;
- zero unfinished placeholder;
- zero duplicate screen key;
- zero immediate child overflow;
- exactly three documented provider boundaries.

REF-064 originally produced a `Ready for Development` root of 1,440 by 9,006 pixels. REF-064A extended that root with
runtime-backed canonical compositions; its current dimensions and node-level audit live in the reconciliation record.
Temporary captures remain outside Git.

REF-064 changes no Expo source, API contract, generated artifact, provider configuration, deployment, or production
state. The next task may use these designs to establish the Expo UI policy; implementation remains separately scoped.
