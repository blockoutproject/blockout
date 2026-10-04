# Review checklist: sporting consultation and calendars

**Purpose**: Assess the completeness, precision and consistency of F03 requirements, particularly time, absent results, visibility and partial data.

**Created**: 2026-09-19

**Feature**: [Specification F03](../spec.md)

**Ownership**: This checklist belongs to the reviewer. A checked box means that requirement quality has been examined and found satisfactory; it certifies no implementation, mockup or provider qualification.

## Detail sheets, access and seasons

- [ ] CHK001 Are the information and relationships of the four detail sheets defined without losing an authorized V1 capability? [Completeness, FR-002–FR-005, A01–A03]
- [ ] CHK002 Are unknown, withdrawn and unavailable values distinguished without assumed replacement zeros, logos, contact details or identities? [Clarity, FR-006, A03, A10]
- [ ] CHK003 Are the initial season, its scope over teams/calendars and its retention or replacement explicit, including for an already published future season? [Precision, FR-007, A04]
- [ ] CHK004 Do unavailable relationships, old links and return navigation respect identity and current restrictions? [Consistency, FR-008, FR-018, A05, A29]
- [ ] CHK005 Do follow actions, counters, contributions, reports and editing remain assigned to their own scope without implicit permission? [Scope, FR-001, FR-035, A06]

## Time and visibility

- [ ] CHK006 Are Paris-based source time, established instant and display time zone distinguished with verifiable Paris/New York examples? [Clarity, FR-009, A07]
- [ ] CHK007 Do times, day groups and relative labels use the same reference, including during a daylight-saving or time-zone change? [Consistency, FR-009, FR-018, A08]
- [ ] CHK008 Does a date alone retain its precision without conversion or a false instant, with explicit handling of FFVB 00:00? [Coverage, FR-010, A09]
- [ ] CHK009 Does hiding an undated match cover all public surfaces and old links without deleting data? [Completeness, FR-011, A10]
- [ ] CHK010 Do acquiring, explicitly withdrawing and merely being unable to retrieve a date have distinct consequences consistent with F02? [Consistency, FR-006, FR-011, A10]
- [ ] CHK011 Is the six-hour boundary an exact elapsed duration, shared across time zones and independent of daylight-saving changes? [Measurability, FR-012, A11]
- [ ] CHK012 Is the boundary for a match without a time midnight the following day in Paris, without assigning it a fictitious sporting time? [Measurability, FR-010, FR-012, A12]
- [ ] CHK013 Does entering “Completed” clearly distinguish a calendar category from a confirmed sporting result, without requiring a new tab? [Clarity, FR-012–FR-013, decision table]
- [ ] CHK014 Do early final, provisional and absent results have distinct presentations before and after the boundary? [Coverage, FR-012–FR-013, FR-019, A13]
- [ ] CHK015 Do postponement, late results, corrections and withdrawals reassess the presentation of the same identity without inventing cancellation or completion? [Transitions, FR-014, A14]
- [ ] CHK016 Does hiding withdrawn matches cover public results, old links and follows, without republication through a time threshold and with reappearance subject to F02 restrictions? [Consistency, FR-015, A15, dependencies F07/F08]

## Lists, results and maps

- [ ] CHK017 Is the ordering of days, groups, known times, ties and unknown times defined without adding sporting sorting rules? [Precision, FR-016, A16]
- [ ] CHK018 Does pagination by day cover resumption, empty groups and reconciliation after a date/time-zone change without lasting duplicates or omissions? [Coverage, FR-017–FR-018, A17]
- [ ] CHK019 Does the overall result remain distinct from invalid details, special notations and an artificial zero? [Consistency, FR-019, A03, A13–A14, F02]
- [ ] CHK020 Are official positions, unknown statistics and rows without a viewable team defined without deriving a rank from the index? [Accuracy, FR-020, A18]
- [ ] CHK021 Are partial freshness and absent standings independent of calendar success or a cache read? [Clarity, FR-021, A19]
- [ ] CHK022 Does the map rely on viewable participations rather than the presence of standings or an assumed correspondence? [Consistency, FR-022, A20]
- [ ] CHK023 Are municipal location, absent/invalidated coordinates, a partial map and a mapping outage distinguished without inventing a sports hall or point? [Coverage, FR-023, A21]
- [ ] CHK024 Are teams at the same location and missing logos still covered without artificial geographic displacement or an advance mockup choice? [Completeness, FR-024, A22]

## Links, documents and recovery

- [ ] CHK025 Does the “Stream link” label exclude any live/replay promise based solely on the time, score or existence of the link? [Clarity, FR-025, A23]
- [ ] CHK026 Are access conditions for the information sheet and match sheet distinct, especially after six hours without a score and after a result is withdrawn? [Consistency, FR-026–FR-027, A24–A25]
- [ ] CHK027 Do iOS/Android document journeys cover absence, known expiry, undiagnosed errors, return and retry without prescribing a viewer provider? [Coverage, FR-028, A26]
- [ ] CHK028 Do loading, actual absence, errors and partial data have defined outcomes without losing information that remains authorized? [Completeness, FR-029, FR-031, A27]
- [ ] CHK029 Are refresh triggers and F13 propagation explicit without promising provider publication or continuous scores? [Measurability, FR-030, A28, A33]
- [ ] CHK030 Do context changes and current restrictions take precedence over delayed responses and old data? [Consistency, FR-018, FR-031, A29, A31]
- [ ] CHK031 Are all public sporting views, including pool maps and full club calendars, free for guests and all entitlement states, without a Pro gate, verification wait or purchase invitation, while preserving F02 visibility, F05 permissions and F11 advertising rules? [Consistency, FR-001, FR-031–FR-033, A30–A31]
- [ ] CHK032 Are accessibility, V1/V2 traceability and the states required for R02 defined without presenting local evidence as complete qualification? [Verifiability, FR-034–FR-036, A32–A34]

## Notes

- Markers remain unchecked until review. They do not measure implementation progress; `$speckit-implement` does not change them.
- The [Specify/Clarify checklist](requirements.md) follows its own document validation cycle.
- Contracts, pagination and conversion mechanisms, visual components and technical tests will be derived after acceptance of the corpus and the applicable global review.

## Interpretation after the authorized 2026-10-09 amendments

CHK007 and CHK018 must be reviewed against the accepted retained-group exception in FR-009/017/018: after travel, formatted times may change while loaded groups and continuation keep their original zone until refresh. Successive pages are not an immutable snapshot; concurrent movement may need refresh to rediscover a match. Neither criterion requires automatic regrouping or exact list reconciliation. CHK029 distinguishes stable calendars from automatically reread match details. This note preserves the original review history and unchecked markers.
