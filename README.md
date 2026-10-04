# Blockout

Blockout is a French mobile application for following volleyball teams, calendars and results, with community live links and an optional ad-free Pro offer.

This dedicated repository contains the governance and specifications for a complete V2 backend, ingestion and iOS/Android rebuild. Start with the [technical architecture](docs/architecture.md), [design authorities](docs/design.md), [constitution](.specify/memory/constitution.md) and [agent guidance](AGENTS.md). Applications and their runtime dependencies are not initialized.

## Specifications

Directory numbers are historical identifiers, not F-number mappings. Accepted specifications own requirements; existing plans and derived artifacts in the same directories own technical detail. [Planning epic #9](https://github.com/blockoutproject/blockout/issues/9) owns dependencies and acceptance under [roadmap #8](https://github.com/blockoutproject/blockout/issues/8).

| Scope | Owning specification                                                                                 |
| ----- | ---------------------------------------------------------------------------------------------------- |
| F01   | [Source acquisition and observation reliability](specs/001-source-acquisition/spec.md)               |
| F02   | [Sporting data, identity and lifecycle](specs/002-sporting-data/spec.md)                             |
| F03   | [Sporting consultation](specs/007-sporting-consultation/spec.md)                                     |
| F04   | [Search and discovery](specs/008-search-discovery/spec.md)                                           |
| F05   | [Accounts and identity](specs/005-accounts-identity/spec.md)                                         |
| F06   | [Following and personal feed](specs/009-following-personal-feed/spec.md)                             |
| F07   | [Notifications and delivery](specs/011-notifications-delivery/spec.md)                               |
| F08   | [Live contributions and moderation](specs/010-live-contributions-moderation/spec.md)                 |
| F09   | [Pro subscriptions](specs/006-pro-subscriptions/spec.md)                                             |
| F10   | [Reports and feature suggestions](specs/012-reports-feature-suggestions/spec.md)                     |
| F11   | [Advertising, privacy and legal](specs/004-advertising-privacy-legal/spec.md)                        |
| F12   | [Shared administration and access configuration](specs/013-administration-app-configuration/spec.md) |
| F13   | [Shared quality and operations](specs/003-shared-quality/spec.md)                                    |
| F14   | [V1-to-V2 transition](specs/014-v1-v2-transition/spec.md)                                            |

## Provenance

`blockoutproject/blockout` starts with independent Git history from the accepted governance, skills, official Spec Kit integration, specifications and design foundation of [blockout-legacy at e31d310](https://github.com/blockoutproject/blockout-legacy/tree/e31d3105421ae1130d574af191ecdd94cb7308ea). No V1 runtime code, build manifests, generated output, deployment credentials or local runtime state was imported. Historical observations retain their original baselines and limitations in their owning specifications; later pinned source links do not requalify them. Historical issue/PR URLs explicitly use `blockout-legacy`; equal issue numbers across repositories do not identify the same work.

The owner confirmed on 2026-10-04 that the legacy monorepo is not deployed. Running V1 instances originate from independent repositories. This repository split is not a production cutover and establishes neither their deployed revisions nor provider configuration. [F14](specs/014-v1-v2-transition/spec.md) owns continuity requirements. Access restrictions and the current single-root publication procedure are maintained in [AGENTS.md](AGENTS.md#planning-only-initialization-history).
