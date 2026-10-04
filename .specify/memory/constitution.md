<!--
Sync Impact Report
- Version change: 3.0.0 -> 4.0.0
- Modified principles: I. Specification-Led Product Intent; II. Domain Integrity
- Modified constraints: V2 rebuild authority and architecture-neutral boundary ownership
- Removed assumptions: V1 domain authority for V2, required mobile gateway and Expo Router
- Added rule: full backend/mobile rebuild derives technical choices from accepted V2 needs;
  historical implementation and architecture have no default authority over the target
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

Blockout V2 is a complete rebuild of the backend, ingestion, and mobile application,
including mobile internals, not only its visual presentation or backend integration.
V1 code, tests, contracts, technical models, architecture documents, and historical PRs
MUST be treated as discovery and transition evidence, not the target architecture or a
default to preserve. Retaining a V1 technical choice MUST be justified against accepted
V2 requirements and approved technical plans, rather than its historical presence.
Accepted functional semantics, approved design evidence, and explicit continuity and
technology constraints remain binding; a rebuild MUST NOT silently discard them.

### II. Domain Integrity

The approved V2 domain model MUST express the accepted specifications' shared vocabulary,
identities, relationships, ownership, lifecycle semantics, and cross-feature invariants.
Once approved, it MUST constrain technical plans and implementation across features.
Changes to these shared semantics MUST be resolved in the owning specifications and
reflected consistently in the shared model before implementation.
Historical V1 definitions MUST NOT constrain V2 unless explicitly accepted for V2;
accepted V2 semantics recorded in a historical document retain their specification authority.
Specifications own user-visible behavior, while plans derive technical projections without inventing product
capability or reverse-engineering intent from historical code. A concept present in the
domain model MUST NOT be treated as exposed or selected unless an accepted specification
says so.

Complete resources MUST have one authoritative runtime owner. Domain, transport,
application, persistence, provider, and presentation models remain explicit boundaries.
Generated object DTOs MUST remain at transport boundaries. Generated OpenAPI enums MAY
be reused by Java and Python application code and frontend code only when the contract
owns the exact concept. Pure domain code MUST remain independent of generated contracts,
including enums. Provider evidence remains inside adapters. If a mobile gateway is selected,
it coordinates mobile views without becoming a business resource owner. Resource ownership
does not require a separate service or deployment for each resource.

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
- OpenAPI sources, generated-client boundaries, mobile navigation ownership, native provider
  adapters, and authoritative resource ownership remain explicit in every technical plan
  they affect. V1 frameworks, service topology, messaging, storage, and mobile organization
  MUST NOT be selected implicitly from the existing tree or its implementation guidance.
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

**Version**: 4.0.0 | **Ratified**: 2026-08-29 | **Last Amended**: 2026-09-22
