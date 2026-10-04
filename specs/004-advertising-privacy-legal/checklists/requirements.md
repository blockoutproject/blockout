# Specification quality checklist: advertising, privacy and legal documents

**Purpose**: Validate requirement completeness and quality before the overall functional review

**Created**: 2026-09-18

**Feature**: [Specification F11](../spec.md)

## Content quality

- [x] No imposed implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for nontechnical stakeholders
- [x] All mandatory sections are complete

## Requirement completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are verifiable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-independent
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] The scope is clearly bounded
- [x] Dependencies and assumptions are identified

## Specification readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover the main journeys
- [x] Expected outcomes are verifiable through the success criteria
- [x] No implementation details leak into the functional rules

## Notes

- FR-023 applies privacy restrictions to the three club contact-field modes defined by F02; A16–A19 and F02 A36 cover correction, collection and restoration without prohibited republication.

- This Specify/Clarify validation concerns writing, not delivered behavior, a production measurement or legal certification. FR-001–FR-037 are covered by A01–A27 and SC-001–SC-008.
- The clarification review covers scope, roles, entities, transitions, errors, dependencies, privacy, terminology and outcome criteria. Previously approved answers are incorporated into requirements without a new clarification log.
- The shared counter, failure without reset, excluded journeys, unknown rights, absence of age and personalization, versioned legal publication without mobile editing and handling of restrictions have distinct outcomes. Technical recovery timings are not copied from V1; a recovery path without indefinite waiting is required.
- The GitHub workflow and manual email handling are explicit operator choices; they do not select contract structure, attachment storage or delivery of secondary notifications. Code and provider references are bounded evidence, not a V2 architecture.
- Issue retention adds no automatic deadline or periodic purge. Applicable individual requests and protection of copies remain required; no logging or active-retention duration is inferred from backups.
- F05/F09/F10 retain ownership of their detailed journeys. Shared rules, recipients and retention criteria are explicit without inventing domain-specific durations; effective settings and legal information must be qualified before publication.
- The [advertising and privacy review checklist](advertising-privacy-legal.md) is reviewer-owned; its boxes remain unchecked when generated.
- The functional/design prerequisite is accepted under [current planning authority #9](https://github.com/blockoutproject/blockout/issues/9); [design references](../../../docs/design.md) identify its scope and later approvals. Material changes still require affected-design revalidation. This writing-quality checklist neither approves a technical dossier nor proves implementation. No F11 technical dossier is created by this checklist.

- FR-033, A23 and SC-007 define complete F10 submission, reconciliation of intermediate effects and independence of the secondary alert; no incomplete submission counts as acceptance. The reviewer checklist keeps its boxes unchecked.
