# REF-065P iOS Legal Imprint Fidelity

## Scope

REF-065P reconciles only `Legal / Imprint sheet / iOS 393 / Ready` in the canonical
[`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file. It does not change Expo
source, application behavior, legal data, credentials, provider configuration, Android, Web, or production state.

## Runtime And Source Authority

The authenticated administrator flow exposes the native imprint sheet from the Profile screen through
`profile-imprint-action`. The retained iPhone 17 Pro capture was produced by the same local native stack and current
source used by this reconciliation. The Profile entry point, local gateway response, and implementation were
revalidated before the Figma pass. The source inventory covered:

- `ProfileScreen`, `LegalDocumentScreen`, and `LegalDocumentHeader`;
- the shared `BottomSheetCustomPage` and native `@gorhom/bottom-sheet` full-page presentation;
- the pinned Expo Ionicons and MaterialCommunityIcons used by the header;
- the complete local imprint response, including its four Markdown sections and public Blockout contact details.

The simulator provider development control is not application UI and remains excluded. No authentication token,
private endpoint, signed URL, or local environment value is copied into Figma or this record.

## Canonical Figma Result

The canonical screen remains node `87:1040`, inside wrapper `87:1017`, with evidence label `87:1039`. REF-065P made
these ownership-first corrections:

- linked `System Chrome / iOS Status Bar` (`267:5`) and the `Close` variant of the shared Screen Header (`36:8`) own
  the safe area, close action, exact title, and trailing edit action;
- the exact pinned MaterialCommunityIcons pencil glyph is a reusable icon component (`441:2`) linked through the
  Screen Header instance instead of a text or hand-drawn approximation;
- the shared Sheet set (`37:44`) now includes the bounded `Type=Full Page, State=Default` variant (`444:2`), whose
  linked screen instance owns the native 30-by-4 handle and its exact top position;
- the obsolete sanitized imprint copy was replaced with the current local API content, including
  `blockoutproject@gmail.com`, Hostinger, and the four complete legal sections;
- the two source Markdown paragraphs in `Informations` remain separate text blocks so their native vertical spacing is
  represented without a screen-specific conversion helper;
- the `FFVB` link retains the native underline, while source bold spans remain limited to their Markdown emphasis;
- headings, paragraphs, separators, horizontal padding, line heights, and scroll clipping follow the current Expo
  source and the authentic iOS capture.

Figma uses the available Inter design-system equivalents for the native iOS system typography. The final frame is
clipped at `393 × 852`; the legal document intentionally continues below it because the native sheet is vertically
scrollable. The final pixel-run comparison places the status-independent sheet handle, header, section headings,
paragraph lines, and separators at the same vertical positions as iOS, with only the normal one-to-four-pixel glyph
shape difference between Inter and the native system font.

Structural validation found linked status, full-page Sheet, Screen Header, and pencil masters; exact `393 × 852`
geometry; no horizontal or top overflow; no missing font; no active Figma placeholder; and no detached application
shell or icon approximation. The final screen retains the real four-section content and the exact FFVB underline.

## Retained Native Session

The administrator session, complete local native stack, Metro process, and iPhone simulator remain active. REF-065P
completes the authorized screen-by-screen Figma reconciliation goal; REF-066 is not started by this task.
