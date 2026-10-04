# Blockout design references

## Authorities

Accepted [specifications](../README.md#specifications) own functional requirements. The separate [Blockout prototype](https://github.com/blockoutproject/product-prototype) makes approved navigation and interaction reviewable; its implementation choices are not production architecture.

- [Blockout UI Library](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/Blockout-UI-Library) owns foundations and reusable components.
- [Blockout Product Design](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design) owns patterns and canonical screens.
- [Design workflow](../.agents/skills/design-workflow/SKILL.md) and [Figma governance](../.agents/skills/figma-design-governance/SKILL.md) govern changes: approve the complete affected prototype scope, then its canonical Figma translation, before finalizing the affected technical plan.

Feature dossiers link exact approved journeys/states and their owning review evidence. Use existing components and screens; a changed requirement returns to its specification owner and requires targeted design review. These links alone grant no access to external or archived repositories.

## Coverage and status

The global accepted handoff covers the product journeys defined by the specifications. Later scoped approvals supersede it only for the changes they explicitly cover. The [F01 visual supplement](../specs/001-source-acquisition/visual-supplement.md) owns source/season preparation, locked bindings, definitive closure and a team represented across independent pools using existing participation tabs.

The F12 removal of persisted startup fallback is an approved functional amendment under [maintenance #37](https://github.com/blockoutproject/blockout/issues/37). The complete affected prototype and corresponding canonical Figma revalidation were explicitly approved on 2026-10-09, permitting finalization of the revised F12 technical dossier. Existing approvals remain valid for unchanged journeys. [F12](../specs/013-administration-app-configuration/spec.md) owns cold-start failure, explicit retry, in-process restrictions and operator recovery; its dossier retains the exact design references.

The [F14 welcome-help clarification](../specs/014-v1-v2-transition/spec.md#clarifications) under [consolidation #38](https://github.com/blockoutproject/blockout/issues/38) keeps the existing welcome order and identifies the ordinary Pro restoration action without a new button or navigation. The complete affected prototype was [approved on October 10](https://github.com/blockoutproject/blockout/issues/38#issuecomment-6096091323), followed by [approval of the corresponding Figma translation](https://github.com/blockoutproject/blockout/issues/38#issuecomment-6096348752) in the [existing welcome journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4921-3076). No F14 technical dossier is created by this consolidation.

The [map pattern annotations](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1035-9522) distinguish observed Pool/Club variants and linked remote control primitives from complete current prototype parity and native behavior, neither requalified by their structural review under #38. Earlier scoped approvals retain their recorded limits; these annotations create no new map design or implicit acceptance.

Prototype/browser evidence establishes the reviewed interaction and rendering only. Figma approval establishes composition, components and the represented states. Technical-dossier acceptance is separate, and neither certifies native builds, provider SDKs, purchases, purge, restoration or production configuration. Earlier broad browser failures are not converted into a completely rerun suite by later targeted checks. [F03 #23](https://github.com/blockoutproject/blockout/issues/23) owns its separate technical-dossier acceptance; the design consolidation does not establish dossier or global planning acceptance.

## Review references

- [Global handoff acceptance, legacy #298](https://github.com/blockoutproject/blockout-legacy/issues/298#issuecomment-5969051828), under [#272](https://github.com/blockoutproject/blockout-legacy/issues/272): prototype behavior `25875456e021424df3d682dbd414caf8ecdcdfdf`, specification snapshot `7880bfd7d7f6bf223805cef56428ab8a63768c2f`. The record owns the exact scope and limits.
- [Targeted KISS acceptance, #34, 2026-10-06](https://github.com/blockoutproject/blockout/issues/34#issuecomment-6021179909): prototype behavior `18a03849c03a7d46ab6b7f5d717523ab4ade19c5`, evidence `e85333b`. Covers its recorded search, account/Pro, notification, legal and administration revisions, including removed exclusions. It is not closure of #34 or acceptance of unrelated technical work.
- [F01 acceptance, #21, 2026-10-09](https://github.com/blockoutproject/blockout/issues/21#issuecomment-6076074926): prototype behavior `d876da909419ef807a72c39c9afa7a0667e81ad3`; [the supplement](../specs/001-source-acquisition/visual-supplement.md) identifies canonical Figma targets and actual verified limits.
- [F12 startup amendment, #37](https://github.com/blockoutproject/blockout/issues/37): prototype `4d65906dbca25a0a0330b1fa260eb42fd2fe105b` and corresponding Figma revalidation approved on 2026-10-09. The [F12 mobile/design contract](../specs/013-administration-app-configuration/contracts/mobile-and-design.md#design-authority) identifies the existing canonical screens and native evidence limits.
- [F12 prior dossier acceptance, #22](https://github.com/blockoutproject/blockout/issues/22#issuecomment-6078525824) applies to its recorded revision `b846ecb`; [#37](https://github.com/blockoutproject/blockout/issues/37) owns the subsequent startup revision and its new approval evidence. Do not rewrite those historical approvals.
- [F14 prototype acceptance, #38, 2026-10-10](https://github.com/blockoutproject/blockout/issues/38#issuecomment-6096091323): prototype `4f53558076c3518a5792f8ded711df9417df53e5`; the record owns the affected welcome/sign-in scope and actual prototype checks. The [subsequent Figma acceptance](https://github.com/blockoutproject/blockout/issues/38#issuecomment-6096348752) owns the exact five reviewed states and their visual evidence limits. Neither establishes native/provider qualification.
