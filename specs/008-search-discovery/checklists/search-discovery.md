# Functional review checklist: search and discovery

**Purpose**: In-depth review of F04 requirement quality, for the PR reviewer and the global review.

**Created**: 2026-09-19

**Feature**: [Specification F04](../spec.md)

**Note**: Checklist produced with the official `speckit-checklist` skill from the approved scope.

**Ownership**: The reviewer alone owns the checkboxes. `[x]` indicates a reviewed requirement whose quality was judged sufficient, not an implemented feature.

## Scope completeness

- [ ] CHK001 Are the three resource types, public actors and scope exclusions explicit? [Requirements quality, Spec §FR-001, A01]
- [ ] CHK002 Are searchable fields defined for each type without depending on the V1 engine? [Requirements quality, Spec §FR-006, A05–A06]
- [ ] CHK003 Is the scope of public names, source names and verified aliases bounded by F02? [Requirements quality, Spec §FR-010, A09–A10]
- [ ] CHK004 Are the four filters and their combination with all terms explicit? [Requirements quality, Spec §FR-008, FR-011–FR-013, A07, A12]
- [ ] CHK005 Are reporting rules and F10/F11 interfaces preserved without added collection? [Requirements quality, Spec §FR-029, A29]

## Clarity of choices and transitions

- [ ] CHK006 Do identical filter values have identical behavior, with empty text always retaining filtered examples? [Clarity, FR-002, FR-004]
- [ ] CHK007 Is the effect of clearing text, resetting filters and combining both actions defined? [Requirements quality, Spec §FR-005, A04]
- [ ] CHK008 Is example stability during a visit bounded by visibility and distinguished from variation between visits? [Requirements quality, Spec §FR-003, A03]
- [ ] CHK009 Are the current-season default, unavailable current season, future seasons and All seasons defined without a fixed year? [Requirements quality, Spec §FR-012, A11]
- [ ] CHK010 Is the scope of shared text and tab-specific filters unambiguous? [Requirements quality, Spec §FR-014, A13]
- [ ] CHK011 Are context restoration and its limits when data changes explicit? [Requirements quality, Spec §FR-015, A14, A22]
- [ ] CHK012 Is a vanished selection distinguished from a failure to retrieve choices? [Requirements quality, Spec §FR-016, A15]

## Consistency and identity

- [ ] CHK013 Is accent and typo tolerance distinct from F02 identity rules? [Requirements quality, Spec §FR-007, FR-009–FR-010, A08–A09]
- [ ] CHK014 Do approximate matches remain subject to all filters and terms? [Requirements quality, Spec §FR-008–FR-011, A07–A08]
- [ ] CHK015 Is the distinction between multiple aliases for one identity and multiple identities with the same name explicit? [Requirements quality, Spec §FR-019, A09, A19]
- [ ] CHK016 Do cases involving a club without a visible team, a team without participation and a completed season respect F02? [Requirements quality, Spec §FR-012, FR-020, A16]
- [ ] CHK017 Do qualified source absence, calendar emptiness, inactive divisions, withdrawal and reappearance remain subject to independent F02 restrictions? [Requirements quality, Spec §FR-020, A20–A21]
- [ ] CHK018 Does navigation target an identity without implicit matching, using F03 unavailability behavior? [Requirements quality, Spec §FR-027, A20]

## Ordering, measurement and completeness

- [ ] CHK019 Is alphabetical ordering without text distinguished from relevance with text and from examples? [Requirements quality, Spec §FR-003, FR-017, A18]
- [ ] CHK020 Is stable tie-breaking defined without hiding resources with the same name or imposing an architecture? [Requirements quality, Spec §FR-017–FR-019, A17–A19]
- [ ] CHK021 Is exhaustive pagination required for nonempty text while empty-text filters retain limited examples? [Coverage, FR-004, FR-018]
- [ ] CHK022 Do the loaded quantity, optional total and end of list have distinct meanings? [Requirements quality, Spec §FR-022, A17, A25]
- [ ] CHK023 Are success criteria measurable and linked to requirements and scenarios? [Requirements quality, Spec §SC-001–SC-007]
- [ ] CHK024 Are journey stability on unchanged data and recovery after changes distinguished? [Requirements quality, Spec §FR-019, FR-025–FR-026, A22]

## Errors and edge cases

- [ ] CHK025 Are actual absence, initial failure and an empty partial response distinguished? [Requirements quality, Spec §FR-022–FR-024, A23–A25]
- [ ] CHK026 Are retries after initial failure, refresh failure and next-batch failure specified without a false end of list? [Requirements quality, Spec §FR-022, FR-024, A23–A24]
- [ ] CHK027 Is retaining authorized results subject to known restrictions and honest freshness? [Requirements quality, Spec §FR-020, FR-024, FR-026, A21, A24, A27]
- [ ] CHK028 Are late responses and old batches prevented from changing a newer context? [Requirements quality, Spec §FR-025, A22, A26]

## Shared requirements and dependencies

- [ ] CHK029 Are F13 objectives and accessibility referenced without a new local threshold? [Requirements quality, Spec §FR-026, FR-030, A27, A29]
- [ ] CHK030 Do public access, unknown entitlements, account isolation and advertising remain consistent with F05/F09/F11? [Requirements quality, Spec §FR-028, A01, A28]
- [ ] CHK031 Are V1 evidence and V2 choices distinguished without presenting scenarios as completed work? [Requirements quality, Spec §Evidence and traceability]
- [ ] CHK032 Do R01/R02/F14 assumptions and dependencies bound delivery without anticipating technical design? [Requirements quality, Spec §Assumptions, Cross-feature dependencies]

## Notes

- Leave checkboxes unchecked until the reviewer assesses them; add observations beside the relevant criterion.
- `speckit-implement` reads the checkboxes but does not change them. The `requirements.md` checklist follows the separate Specify/Clarify cycle.
- This review concerns documents; it does not replace future tests, R01/R02 or global acceptance.
