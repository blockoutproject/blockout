<!--
Sync Impact Report
- Version change: none -> 1.0.0
- Added principles: Specification-Led Product Intent; Domain And Runtime Integrity;
  Design-Ready User Interfaces; Source-First Contracts And Reproducible Generation;
  Traceable, Verifiable Simplicity
- Added sections: Project Constraints; Delivery Workflow; Governance
- Removed sections: none
- Follow-up TODOs: none
-->

# Blockout Constitution

## Core Principles

### I. Specification-Led Product Intent

An accepted `specs/<feature>/spec.md` MUST own every material addition or intentional
change to observable product behavior. Specifications define user needs, journeys,
outcomes, rules, and acceptance criteria without prescribing implementation. A concept
present in product vision or architecture MUST NOT be treated as exposed or selected
unless an accepted specification says so.

Contracts, application source, and tests own executable behavior. A specification that
changes that behavior MUST identify the affected behavior explicitly; silence never
authorizes drift.

### II. Domain And Runtime Integrity

The approved domain model MUST constrain shared vocabulary, identities, relationships,
ownership, lifecycle semantics, and cross-feature invariants. Product specifications own
observable intent, while technical plans derive runtime projections without collapsing
domain, transport, application, persistence, provider, or presentation models.

Runtime owners remain explicit. Complete resources have one authoritative owner,
generated contracts remain at transport boundaries, provider evidence remains inside
adapters, and the mobile gateway coordinates mobile views without becoming a business
resource owner.

### III. Design-Ready User Interfaces

A feature that creates or materially changes a user interface MUST have approved Figma
evidence before its technical plan is finalized. Design begins after the specification is
clarified and MUST cover the required journeys, platforms, states, accessibility,
readability, and recovery paths. A change with no material interface impact MAY skip this
gate.

Blockout UI Library owns reusable visual foundations and components. Blockout Product
Design owns approved product patterns and representative screen states. The repository
Figma policy governs their use and evidence.

### IV. Source-First Contracts And Reproducible Generation

OpenAPI source fragments MUST be edited before any generated projection. Generated
bundles, Java sources, TypeScript clients, Python clients, build outputs, and caches MUST
remain outside Git and MUST be reproducible from committed sources.

Shared schemas and domain concepts MUST have one authoritative source. Contract changes
MUST validate generation and every affected server, mobile, scraper, and shared-client
consumer before delivery.

### V. Traceable, Verifiable Simplicity

Every material plan decision MUST state its need, selected solution, simpler alternative,
consequences, and verification. Tasks MUST trace to an accepted specification, approved
plan, this constitution, or a directly sourced maintenance issue and MUST name concrete,
verifiable outcomes.

Implementation MUST use the simplest solution that satisfies accepted intent. New
abstractions, shared libraries, services, providers, or compatibility layers require a
demonstrated owner and present need.

## Project Constraints

- Official Spec Kit skills, scripts, templates, workflows, and manifests MUST change only
  through an explicit official installation or upgrade. Blockout-specific rules remain in
  this constitution, `AGENTS.md`, and routed Blockout references.
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

## Delivery Workflow

For specification-led work, the sequence is:

```text
specification
-> clarification
-> approved Figma evidence when applicable
-> technical plan
-> tasks
-> consistency analysis
-> GitHub issues
-> implementation
-> verification
```

Plans and tasks MUST be derived from the accepted specification and constitution. Task
identifiers MUST be globally unique and use `T<feature><sequence>`, with both numeric parts
padded to at least three digits; feature `001` therefore begins with `T001001`.

Operational ownership lives in GitHub issues, native blockers, pull requests, and Git
history. Repository Markdown MUST NOT duplicate task status, assignments, delivery logs,
or completion evidence.

## Governance

This constitution governs Blockout specifications, plans, tasks, and implementation
reviews. `AGENTS.md` and routed Blockout references govern operational and technical
execution and MUST NOT contradict it.

Amendments require explicit human approval, an updated Sync Impact Report, and semantic
versioning: MAJOR for incompatible governance changes, MINOR for added or materially
expanded rules, and PATCH for non-semantic clarification. Every plan, analysis, and final
review MUST verify the applicable principles and record any justified exception.

**Version**: 1.0.0 | **Ratified**: 2026-08-29 | **Last Amended**: 2026-08-29
