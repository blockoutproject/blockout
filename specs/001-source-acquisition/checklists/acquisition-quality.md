# Acquisition requirements-quality checklist: F01

**Purpose**: Deep pre-acceptance review of source semantics, identities, lifecycle, reliability and boundaries.
**Created**: 2026-10-06
**Feature**: [F01 specification](../spec.md)

**Note**: Generated through the official `speckit-checklist` procedure for the approved revised F01 scope.
**Review ownership**: Reviewer-owned. `[x]` means the reviewer has accepted requirements quality, never completed implementation. The documentary review accepts the criteria below; final design approval remains a separate gate.

## Coverage and identity

- [x] CHK001 Are national selectors, organizer menus, supported championships and explicit exclusions stated without assuming a directory is exhaustive? [Traceability: FR-001–006; A38]
- [x] CHK002 Are youth qualifying pools described as ordinary pools without a required progression model? [Traceability: FR-001; A38/A41]
- [x] CHK003 Is manual division/format/gender classification distinguished from organizer and grouping codes? [Traceability: FR-008–010/FR-050; F02 FR-011]
- [x] CHK004 Are persistent clubs, seasonal teams/pools and the absence of automatic follow transfer explicit? [Traceability: FR-054; F02 FR-002–004/FR-010]
- [x] CHK005 Are true distinct-group tours distinguished from ordinary matchdays and unproven CSV partition? [Traceability: FR-053; A41]
- [x] CHK006 Are shared club numbers, leading zeros and local seasonal supplier IDs unambiguously distinguished? [Traceability: FR-054; A42]

## Season and source lifecycle

- [x] CHK007 Are assisted discovery, manual supported URL completion and missing-season confirmation responsibilities explicit? [Traceability: FR-003/FR-050/FR-052]
- [x] CHK008 Does confirmation explicitly fail to override known wrong context or unsupported structure? [Traceability: A39; FR-052]
- [x] CHK009 Are locking, additional child discovery and exceptional technical repair consistent? [Traceability: FR-051; A40]
- [x] CHK010 Are current-page rollover and actual catalog absence defined for the correct season/scope? [Traceability: FR-005–007/FR-052]
- [x] CHK011 Are activation of ready scopes and incomplete supplier publication distinguished? [Traceability: FR-050; A40]
- [x] CHK012 Are pre-closure initial reconstruction, exact typed closure, refused new cycles, existing-cycle drain and uncertain response handling fully specified? [Traceability: FR-046–049, FR-055; A35/A44]

## Reliability and timing

- [x] CHK013 Are complete, empty, partial, invalid, unavailable and uncertain integration outcomes distinguishable? [Traceability: FR-011–023]
- [x] CHK014 Is the no-withdrawal consequence of partial acquisition/integration explicit? [Traceability: FR-011–012/FR-019; A08/A15]
- [x] CHK015 Does terminal closure preserve history without permitting new historical corrections by collection, while retaining valid pre-closure initial reconstruction? [Traceability: FR-020, FR-047, FR-055]
- [x] CHK016 Are score letters, unknown times, placeholders and independent ranking failure described without invented values? [Traceability: FR-014–017; A11/A12/A42]
- [x] CHK017 Are phase cadence and each LNV detail window independently stated, including final results? [Traceability: FR-030; A43]
- [x] CHK018 Are missed ticks, configuration changes, lost responses and crash effects defined without a recovery engine? [Traceability: FR-034–037; A24/A45]
- [x] CHK019 Are geocoding ambiguity, changed locality and obsolete replies assigned to F01/F02 consistently? [Traceability: FR-026–029; F02 FR-049–052]

## Operations and acceptance

- [x] CHK020 Are permission refusal, stale decisions and safe uncertain outcomes covered for each command family? [Traceability: FR-038–039; A28/A37]
- [x] CHK021 Are competition first-failure and club/geocode 24-hour incident rules distinguished? [Traceability: FR-040–044]
- [x] CHK022 Is recovery defined from evidence for the affected problem rather than pause or another successful scope? [Traceability: FR-043–044]
- [x] CHK023 Are diagnostics limited to necessary safe evidence without personal/raw response archives? [Traceability: FR-021–023; A33]
- [x] CHK024 Are already accepted visual evidence and the new unapproved supplement clearly separated? [Traceability: FR-039/FR-050–053; visual-supplement.md]
- [x] CHK025 Are provider observations separated from synthetic cases and unexecuted full qualifications? [Traceability: FR-049; provider-evidence.md; quickstart.md]
- [x] CHK026 Are consumer-generation, database and native acceptance criteria specified without claiming execution? [Traceability: quickstart.md V08/V12/V14; plan.md Constitution check]
- [x] CHK027 Are F01, F02, F03/F06, F07, F11/F12, F13 and F14 ownership boundaries consistent across handoffs? [Traceability: spec.md dependency handoffs; plan.md]
- [x] CHK028 Is excluded complexity absent from both requirements and future tasks? [Traceability: research.md D01–D13; plan.md constraints]

## Notes

Keep unresolved items unchecked; record review findings next to the criterion. `speckit-implement` reads these markers but does not modify them. Existing built-in `requirements.md` has its separate official lifecycle.

## Current evidence review — 2026-10-10

CHK024 retains its October 6 review wording and marker as historical review evidence. Its “new unapproved supplement” premise was superseded by the [October 9 owner acceptance](https://github.com/blockoutproject/blockout/issues/21#issuecomment-6076074926); CHK029 is the current criterion for that distinction. It creates no new design gate for unchanged approved journeys.

- [x] CHK029 Are the accepted global design and October 9 F01 supplement identified by their exact scope, while provider, generated-consumer and native qualification remain distinct and unexecuted where required? [Evidence, visual-supplement.md; plan.md Constitution check; quickstart.md; replaces CHK024 for current review]

The owner accepted this requirements-quality conclusion on October 10 in [consolidation #38](https://github.com/blockoutproject/blockout/issues/38#issuecomment-6096091323). This marker does not certify execution of the remaining qualifications.
