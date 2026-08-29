<!--
Sync Impact Report
- Version change: 1.0.0 -> 2.0.0
- Modified sections: Project Constraints; Spec Kit Integration
- Removed rules: local Spec Kit task identifier format; local convergence numbering
- Added principles: none
- Added sections: none
- Removed sections: none
- Follow-up TODOs: none
-->

# Blockout Constitution

## Core Principles

### I. Specification-Led Product Intent

An accepted `specs/<feature>/spec.md` MUST be the source of future observable product
intent for that feature. The constitution governs it; the approved `plan.md` and
`tasks.md` are derived artifacts. Current contracts, source code, and tests remain
evidence of delivered behavior, not authority for changing future intent.

### II. Domain Integrity

The approved domain model MUST constrain shared vocabulary, identities, relationships,
ownership, lifecycle semantics, and cross-feature invariants. Specifications own
user-visible behavior, while plans derive technical projections without inventing product
capability or reverse-engineering intent from historical code. A concept present in the
domain model MUST NOT be treated as exposed or selected unless an accepted specification
says so.

Complete resources MUST have one authoritative runtime owner. Domain, transport,
application, persistence, provider, and presentation models remain explicit boundaries.
Generated contracts remain at transport boundaries, provider evidence remains inside
adapters, and the mobile gateway coordinates mobile views without becoming a business
resource owner.

### III. Design-Ready User Interfaces

A feature that creates or materially changes a user interface MUST have approved Figma
evidence before its technical plan is finalized. Design begins after the specification is
clarified and MUST cover the required journeys and states. A feature with no material
interface impact MAY skip this gate. If accepted product intent changes after approval,
the affected design MUST be revalidated before planning continues.

Blockout UI Library owns reusable visual foundations and components. Blockout Product
Design owns approved product patterns and representative screen states. The repository
Figma policy governs their use and evidence.

### IV. Source-First Contracts And Reproducible Generation

OpenAPI source fragments MUST be edited before any generated projection. Generated
bundles, Java sources, TypeScript clients, Python clients, build outputs, and caches MUST
remain outside Git and MUST be reproducible from committed sources.

Shared schemas and domain concepts MUST have one authoritative source; transport,
application, persistence, and UI projections MUST remain explicit derived boundaries.
Contract changes MUST validate generation and every affected server, mobile, scraper,
and shared-client consumer before delivery.

### V. Traceable, Verifiable Simplicity

Every material plan decision MUST state its need, selected solution, simpler alternative,
consequences, and verification. Tasks MUST trace to the accepted specification, approved
plan, this constitution, or a directly sourced maintenance issue and MUST name concrete
outcomes and paths where applicable. Implementation MUST use the simplest solution that
satisfies current accepted intent, with proportionate automated and manual evidence for
every changed boundary.

## Project Constraints

- Official Spec Kit skills, scripts, templates, workflows, and manifests MUST change only
  through an explicit official installation or upgrade. Their procedures MUST NOT be
  restated or replaced by Blockout-specific guidance.
- A bug that restores established executable behavior, a behavior-preserving refactor,
  infrastructure maintenance, dependency maintenance, and documentation-only work MAY be
  owned directly by a sourced GitHub issue without a product specification.
- A bug or maintenance request that intentionally changes observable product behavior MUST
  first resolve to an accepted specification.
- OpenAPI sources, generated-client boundaries, Expo Router ownership, native provider
  adapters, and service resource ownership remain explicit in every technical plan they
  affect.
- Secrets, credentials, personal data, provider payloads, and internal diagnostics MUST
  remain outside public artifacts and user-visible failures.

## Spec Kit Integration

The applicable official `speckit-*` skill is the sole procedural authority for each Spec
Kit step and MUST be used without local replacement or duplicated instructions. Blockout
adds only the constraints stated by this constitution.

Operational ownership lives in GitHub issues, native blockers, pull requests, and Git
history. Repository Markdown MUST NOT duplicate task status, assignments, delivery logs,
or completion evidence.

## Governance

This constitution governs Blockout specifications, plans, tasks, and implementation
reviews. `AGENTS.md` and routed Blockout references govern operational and technical
execution but MUST NOT contradict this constitution. Amendments require explicit human
approval, an updated Sync Impact Report, and a semantic version change: MAJOR for
incompatible governance changes, MINOR for added or materially expanded principles, and
PATCH for non-semantic clarifications. Every plan, analysis, and final review MUST verify
the applicable principles and record any justified exception before work proceeds.

**Version**: 2.0.0 | **Ratified**: 2026-08-29 | **Last Amended**: 2026-08-29
