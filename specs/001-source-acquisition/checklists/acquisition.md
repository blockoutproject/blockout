# Acquisition Checklist: Source Acquisition and Observation Reliability

**Purpose**: Review completeness, clarity and consistency of the source-acquisition requirements before accepting the functional specification.

**Created**: 2026-09-15

**Feature**: [Source acquisition specification](../spec.md)

**Note**: This custom checklist is generated through the official `speckit-checklist` skill from the approved source-acquisition scope.

**Review Ownership**: This is a reviewer-owned requirements-quality artifact. Mark an item `[x]` only when the reviewer determines the criterion is satisfied.

**Marker Semantics**: `[x]` means requirements quality was reviewed and satisfied; it does not mean implementation work is complete.

## Requirement Completeness

- [ ] CHK001 Are supported sources, retained CSV acquisition, the five exclusions and boundaries against unrelated competitions explicit? [Completeness, Spec §FR-001–FR-003]
- [ ] CHK002 Is all-phase coverage of the three professional championships explicitly distinguished from observed V1 behavior and sampled future availability? [Completeness, Spec §FR-002, §Evidence and Decision Traceability]
- [ ] CHK003 Are season detection, activation, concurrent active seasons, closure and historical recollection specified separately? [Completeness, Spec §FR-007, §FR-046–FR-049]
- [ ] CHK004 Are native pack classification, individual overrides, waiting for classification, explicit exclusion and pack-exclusion precedence all described? [Completeness, Spec §FR-008–FR-010]
- [ ] CHK005 Does the observation handoff define context, times, native references, values, scope, completeness and reasons without selecting a transport or storage design? [Completeness, Spec §FR-021–FR-023]

## Requirement Clarity

- [ ] CHK006 Is a usable catalog distinguishable from a successful HTTP response, an error page, a partial read and a genuinely empty catalog? [Clarity, Spec §FR-004]
- [ ] CHK007 Is immediate collection stopping on confirmed non-discoverability distinguished from suspension on discovery failure and from business deactivation? [Clarity, Spec §FR-005–FR-006, §FR-019]
- [ ] CHK008 Is reference reuse between discovery attempts clearly bounded, with no fallback after the next failed discovery? [Clarity, Spec §FR-006, §FR-031]
- [ ] CHK009 Is essential calendar invalidity distinguished from an isolated secondary-field anomaly and normally missing information? [Clarity, Spec §FR-011–FR-016]
- [ ] CHK010 Is contradictory same-source evidence distinguished from identical repetition, cross-season code reuse and provider precedence? [Clarity, Spec §FR-013, §A09]
- [ ] CHK011 Are cadence windows, unknown kickoff, corrected kickoff, overruns and scheduled due times specified without a false publication-freshness promise? [Clarity, Spec §FR-030–FR-031, §FR-035]

## Requirement Consistency

- [ ] CHK012 Are calendar/ranking/provider independence and previous-data preservation consistent with whole-calendar rejection? [Consistency, Spec §FR-012, §FR-017–FR-020]
- [ ] CHK013 Are valid empty calendars distinguished from initially empty phases, with a precise populated-to-empty threshold? [Consistency, Spec §FR-020, §FR-041]
- [ ] CHK014 Are acquisition success, integration failure and application-data update claims consistently separated? [Consistency, Spec §FR-022, §FR-039, §FR-043]
- [ ] CHK015 Are cycle-start settings, next-cycle configuration changes, discovery-failure suspension and fail-closed startup compatible? [Consistency, Spec §FR-006, §FR-033–FR-034]
- [ ] CHK016 Are family-only relaunch, no duplicate runs and no implicit unpause consistent across competition, club and geocoding controls? [Consistency, Spec §FR-028, §FR-032–FR-036]

## Scenario and Recovery Coverage

- [ ] CHK017 Are club-page failure and successful-but-empty/ambiguous geocoding distinguished from technical failure, with explicit retry consequences? [Coverage, Spec §FR-024–FR-029, §A19–A22]
- [ ] CHK018 Does the manual geocoding requirement include unchanged unresolved addresses while excluding unnecessary recalculation of valid results? [Coverage, Spec §FR-027–FR-028, §A21]
- [ ] CHK019 Are scheduled cycles, intra-cycle HTTP retries, manual relaunches, skipped work and interruption of consecutive observations clearly distinguished? [Coverage, Spec §FR-041, §A29]
- [ ] CHK020 Are the structural-immediate, three-cycle and 24-hour incident thresholds distinguishable and consistent with normal source cadence? [Coverage, Spec §FR-040–FR-042]
- [ ] CHK021 Is actual recovery defined by usable evidence from the affected scope, excluding pause, exclusion, season closure and unrelated success? [Coverage, Spec §FR-043, §A30]
- [ ] CHK022 Are incident persistence, opening/recovery-only notifications and grouped novelty/classification signals specified without prescribing a new incident platform? [Coverage, Spec §FR-044–FR-045]
- [ ] CHK023 Are historical season/reference eligibility and operation under a current-collection pause distinguished from normal collection, while classification, exclusions, permissions, validation and archive-gap reporting remain required? [Coverage, Spec §FR-008, §FR-046–FR-049, §A34–A36]

## Acceptance Criteria Quality

- [ ] CHK024 Does every functional requirement have a concrete scenario reference, including the three final clarifications about cycle counting, contradictions and actual recovery? [Traceability, Spec §Inventory coverage, §A09, §A29–A30]
- [ ] CHK025 Are success criteria measurable as user/operator outcomes with explicit provider, configuration and cadence assumptions? [Measurability, Spec §SC-001–SC-008, §Assumptions]
- [ ] CHK026 Are primary, exception, denied, empty/partial and recovery scenarios represented without claiming that V2 acceptance tests already ran? [Coverage, Spec §User Scenarios & Testing, §Edge Cases]

## Dependencies, Privacy and Scope

- [ ] CHK027 Are permissions explicit and separate from live-moderator authority, while permission assignment stays with F12? [Completeness, Spec §FR-038, §Cross-Perimeter Dependencies]
- [ ] CHK028 Are useful observations and diagnostic metadata distinguished from raw archives and prohibited personal diagnostic payloads, with retention assigned to F11/F13? [Consistency, Spec §FR-021–FR-023, §FR-025]
- [ ] CHK029 Does each unresolved cross-domain decision have an identified owner and a defined F01 input/constraint rather than being left to an implementer? [Dependencies, Spec §Cross-Perimeter Dependencies]
- [ ] CHK030 Are source inspection limits, explicit V2 changes, shared-model considerations, Figma follow-through and the whole-corpus gate stated without imposing technical architecture? [Scope, Spec §Assumptions, §Evidence and Decision Traceability, §Cross-Perimeter Dependencies]

## Notes

- This checklist reviews the writing, not runtime correctness. All newly generated markers are intentionally unchecked.
- Add reviewer findings inline and link the relevant requirement or scenario.
- `speckit-implement` reads checklist state as a gate and must not change markers.
- [requirements.md](requirements.md) has the separate built-in lifecycle maintained by Specify and Clarify.
