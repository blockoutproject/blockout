# Foundation Design Checklist: F13 shared quality and operations

**Purpose**: Review completeness, clarity and consistency of shared boundaries, operational protection and cross-feature ownership.
**Created**: 2026-10-05.
**Feature**: [spec.md](../spec.md), [plan.md](../plan.md).
**Depth/audience**: Standard requirements-quality review by the owner before accepting F13 planning.

**Review ownership**: Generated through the official speckit-checklist procedure. These markers belong to the reviewer. An `[x]` means the requirement-quality criterion was reviewed and satisfied, not that runtime implementation passed. Newly generated items remain unchecked.

## Completeness

- [ ] CHK001 Are all active F13 requirements assigned either to foundation work or an explicit domain integration obligation? [Completeness, Spec FR-004–FR-032]
- [ ] CHK002 Are contract authority, generated-consumer responsibilities and compatibility requirements defined without treating generated code as source? [Completeness, Constitution IV]
- [ ] CHK003 Are supplier observation, accepted integration and completed projection distinguished in the written requirements? [Clarity, Spec FR-005]
- [ ] CHK004 Are retained data, empty results, unavailability and uncertain action outcomes specified separately? [Completeness, Spec FR-008, FR-019, FR-031]
- [ ] CHK005 Are private-state isolation and stale-response rejection requirements explicit across logout and account changes? [Completeness, Spec FR-016, FR-018]

## Clarity and consistency

- [ ] CHK006 Are bounded waits and retries specified without implying cancellation of an already accepted mutation? [Clarity, Spec FR-008, FR-019]
- [ ] CHK007 Are domain-owned freshness and retention rules preserved without introducing one global refresh policy? [Consistency, Spec FR-004–FR-005, FR-027]
- [ ] CHK008 Are authorization, verified identity and current paid-right responsibilities assigned to their accepted owners? [Consistency, Spec FR-015–FR-018, FR-027]
- [ ] CHK009 Is the distinction between a logical incident transition and possible transport duplication explicit? [Clarity, Spec FR-012, SC-004]
- [ ] CHK010 Are the conditions for actual recovery distinct from pause, absent telemetry and success in another scope? [Clarity, Spec FR-010, FR-012]
- [ ] CHK011 Is ordinary backup expiry distinguished from premature deletion caused by a failed replacement? [Clarity, Spec FR-023, approved 30-day expiry decision]
- [ ] CHK012 Are non-personal diagnostic needs and provider-native retention limits distinguished from business-data retention? [Consistency, Spec FR-013, FR-023, F11 FR-021/FR-026–FR-027]

## Acceptance quality

- [ ] CHK013 Does incident acceptance require detection independent of the affected host and evidence of actual notification behavior? [Measurability, Spec FR-009, SC-004]
- [ ] CHK014 Does backup acceptance distinguish completed protection and reported failure from silent schedule stops that may not alert, and require isolated restoration? [Measurability, FR-025–FR-026, SC-006]
- [ ] CHK015 Does restoration acceptance require actual file bytes and associations with origin storage unavailable? [Measurability, Spec FR-024, FR-026]
- [ ] CHK016 Are current erasure, rights and notification obligations required before restored access or sends resume? [Acceptance quality, Spec FR-027]
- [ ] CHK017 Are native/provider/visual evidence requirements distinguished from automated component behavior evidence? [Acceptance quality, Spec FR-018, FR-029–FR-031]

## Scenario and edge-case coverage

- [ ] CHK018 Are partial integration, incomplete reconstruction and stale replay outcomes specified without a generic recovery platform? [Coverage, Spec FR-019–FR-021]
- [ ] CHK019 Are planned preproduction stops distinguished from incidents and confirmed recovery? [Coverage, Spec FR-010–FR-012]
- [ ] CHK020 Are missing backup evidence and unavailable current restrictions explicitly blocking affected reopening? [Coverage, Spec FR-025–FR-027]
- [ ] CHK021 Are certain, ambiguous, unmapped and missing-file logo associations distinguished without authorizing destructive transition? [Coverage, Spec FR-032, SC-008]
- [ ] CHK022 Are schema compatibility and data-preservation requirements explicit for application rollback? [Coverage, Spec FR-028]

## Security, accessibility and dependencies

- [ ] CHK023 Are request/operation authorization and secret/protected-copy access requirements independent of interface visibility? [Security, Spec FR-015, FR-017–FR-018]
- [ ] CHK024 Are French content, supported platforms and domain-owned date/source semantics specified? [Clarity, Spec FR-029]
- [ ] CHK025 Are target size, text scaling, focus, accessible roles/states and reduced-motion requirements objectively described? [Measurability, Spec FR-030]
- [ ] CHK026 Are new design scope and existing approved evidence clearly separated? [Dependencies, Constitution III]
- [ ] CHK027 Are domain-dependent tasks identified without making foundation initialization wait for every business implementation? [Dependencies, Spec dependency table]
- [ ] CHK028 Are provider/tool qualifications and their failure consequences explicit without presenting selected versions as installed or proven? [Assumptions, Plan qualification gates]
- [ ] CHK029 Are performance/capacity and monthly availability requirements excluded from both delivery and deferred work? [Consistency, Spec FR-001–FR-003, FR-006–FR-007]
- [ ] CHK030 Are documentary completion, owner acceptance, global planning approval and runtime activation separate gates? [Clarity, Plan summary; repository boundaries]

## Notes

The implementation procedure reads checklist state and does not change these markers. The built-in requirements checklist has its separate official lifecycle. Findings and approval belong to the owning GitHub review; no runtime success follows from this checklist alone.
