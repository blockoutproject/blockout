# Blockout

Blockout is a French mobile application for following volleyball teams, calendars and results, with community live links and an optional ad-free Pro offer.

Blockout is a complete V2 rebuild of backend, ingestion and the iOS/Android application, including mobile internals. This repository contains accepted functional specifications, design references and governance. The [F13 technical plan](specs/003-shared-quality/plan.md) records the shared stack, boundaries, contract generation, delivery and operations decisions. Domain contracts and dependent technical plans remain with their owners; no production runtime or application dependencies are initialized.

Start with the [constitution](.specify/memory/constitution.md), [agent guidance](AGENTS.md) and [design inputs](AGENTS.md#design-inputs). [GitHub issues](https://github.com/blockoutproject/blockout/issues) own planning requests, dependencies and acceptance. The official Spec Kit planning step decides the stack, architecture and shared contract/codegen approach within the relevant feature scope; dependent plans reference the agreed decisions.

## Specifications

Specifications own functional vocabulary, requirements and invariants. Directory numbers are stable references, not F-number mappings or implementation order. The standard requirements checklists assess specification quality, not delivered software. Future plans derive from these owners through official Spec Kit procedures; API ownership is independent of feature-plan numbering. User-story priorities distinguish relative product value within the accepted V2 scope; a lower priority does not remove launch obligations or relax security and continuity requirements.

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

This dedicated repository has independent history and contains no V1 runtime implementation. The legacy monorepo is not deployed; running V1 instances originate from independent repositories. Factual historical references inside the specifications support discovery and continuity only. They do not select the V2 stack or grant permission to inspect other repositories, export data or change production.

Accepted product/design decisions and V1/V2 continuity remain applicable. Withdrawn technical dossiers, former stack decisions, backups and historical technical discussions are not planning inputs unless the owner explicitly requests their consultation. Technical decisions belong in the official Spec Kit artifacts that own them. The existing agent guidance links the design inputs; no parallel architecture or design dossier is required.

## Verification

Documentation checks use the pinned formatter without installing application dependencies:

```sh
npx --yes prettier@3.9.6 --check README.md AGENTS.md "specs/**/*.md" ".github/**/*.{md,yml}" .prettierrc.json
npx --yes prettier@3.9.6 --check "contracts/**/*.yaml"
npx --yes @redocly/cli@2.62.1 lint contracts/http/ingestion/openapi.yaml contracts/http/mobile/openapi.yaml --extends minimal
git diff --check
```

Validate local links, anchors and source ownership against the final tree. [Documentation CI](.github/workflows/ci.yml) establishes no runtime, provider or visual qualification. Personal skills are copied from their authoritative bank; official Spec Kit imports remain unchanged except for authorized constitution amendments through the official procedure. Publication follows [the Git delivery policy](AGENTS.md#git-delivery).

The [F02 plan](specs/002-sporting-data/plan.md) introduces the [HTTP contract roots](specs/002-sporting-data/contracts/README.md) under the shared F13 conventions. The [F05 plan](specs/005-accounts-identity/plan.md) extends the mobile root with account lifecycle operations. The [F12 plan](specs/013-administration-app-configuration/plan.md) adds application-access settings and current account permissions. The [F01 plan](specs/001-source-acquisition/plan.md) extends both roots with source qualification, collection controls and current collector admission. The [F03 plan](specs/007-sporting-consultation/plan.md) adds public sporting reads, complete-day calendars and qualified document/image delivery. Redocly's minimal ruleset checks source structure and references without inferring a product license. Runtime generation, compilation and consumer behavior remain future qualifications.
