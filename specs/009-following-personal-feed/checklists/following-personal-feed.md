# Functional review checklist: follows and personal calendar

**Purpose**: In-depth review of F06 requirement quality by the PR reviewer and during the global review.

**Created**: 2026-09-20

**Feature**: [Specification F06](../spec.md)

**Note**: Checklist produced with the official `speckit-checklist` skill from approved decisions.

**Ownership**: The reviewer owns the checkboxes. `[x]` indicates a reviewed and satisfied requirement-quality criterion, not an implemented feature.

## Scope and identity

- [ ] CHK001 Are actors, account prerequisites and the absence of a Pro condition explicit? [Requirements quality, Spec §FR-001–FR-002, A01]

- [ ] CHK002 Does the team/pool scope exclude club follows and implicit relationships? [Requirements quality, Spec §FR-001, FR-005, A02]

- [ ] CHK003 Are uniqueness and already-satisfied requests defined for adding and removing follows? [Requirements quality, Spec §FR-003–FR-004, A03–A04]

- [ ] CHK004 Do corrections, old seasons and manual renewal respect F02? [Requirements quality, Spec §FR-006–FR-007, A05]

- [ ] CHK005 Is guest sign-in distinct from executing the follow according to F05? [Requirements quality, Spec §FR-002, A01]

## Season and navigation

- [ ] CHK006 Is the shared scope across the three screens and two lists explicit? [Requirements quality, Spec §FR-008, A08]

- [ ] CHK007 Is independence from F03/F04 filters specified? [Requirements quality, Spec §FR-008, A08]

- [ ] CHK008 Are offered seasons, their deduplication and All seasons defined? [Requirements quality, Spec §FR-008–FR-009, A07–A09]

- [ ] CHK009 Does the default among viewable follows, then the catalog, also cover the absence of a season? [Requirements quality, Spec §FR-009–FR-010, A07]

- [ ] CHK010 Does adding a follow in another season explicitly preserve the selection? [Requirements quality, Spec §FR-011, A10]

- [ ] CHK011 Do resetting, returning from a detail sheet and a newly published season have distinct outcomes? [Requirements quality, Spec §FR-010, FR-015, A11]

- [ ] CHK012 Is a vanished selection distinguished from a retrieval outage? [Requirements quality, Spec §FR-012, A12]

## Lists and visibility

- [ ] CHK013 Are alphabetical order, identical names and their context defined? [Requirements quality, Spec §FR-013, A13]

- [ ] CHK014 Is full access to follows required without an implicit cap? [Requirements quality, Spec §FR-014, A13]

- [ ] CHK015 Does hiding exclude any visible section, old card or removal command? [Requirements quality, Spec §FR-016, A14]

- [ ] CHK016 Are relationship retention and reappearance without duplicates explicit? [Requirements quality, Spec §FR-006, FR-016, A15]

- [ ] CHK017 Are seasons linked only to hidden follows and empty states handled without leakage? [Requirements quality, Spec §FR-009, FR-016–FR-017, A16]

- [ ] CHK018 Are removing the last follow and deleting an account distinguished from sporting visibility hiding? [Requirements quality, Spec §FR-004, FR-012, Assumptions]

## Feed and counters

- [ ] CHK019 Does the feed honor a single qualified current empty observation, false-empty protection, pool-local participation hiding and independent reappearance without losing follows? [Consistency, FR-018–FR-019, A18]

- [ ] CHK020 Do deduplication and removing the last follow selecting a match have explicit criteria? [Requirements quality, Spec §FR-019, A18–A19]

- [ ] CHK021 Are F03 rules for local time, unknown dates and absent results reused without contradiction? [Requirements quality, Spec §FR-021, A20]

- [ ] CHK022 Do follower count, displayed quantity, unknown values and hiding have distinct meanings? [Requirements quality, Spec §FR-020, A22]

- [ ] CHK023 Is the absence of a substitute personal calendar explicit? [Requirements quality, Spec §FR-017–FR-018, A17]

## Errors and shared quality

- [ ] CHK024 Are confirmed success, certain refusal and a lost response distinguished? [Requirements quality, Spec §FR-024, A23–A24]

- [ ] CHK025 Is a retrieval failure after success distinguished from cancellation? [Requirements quality, Spec §FR-025, A25]

- [ ] CHK026 Are the relationship/resource/match stages and their retries distinguished? [Requirements quality, Spec §FR-022, A26]

- [ ] CHK027 Do obsolete responses, retries and account changes have consistency rules? [Requirements quality, Spec §FR-023, A03, A06, A21]

- [ ] CHK028 Does the F07 boundary prevent turning the filter into a notification preference? [Requirements quality, Spec §FR-027, A27]

- [ ] CHK029 Do privacy, advertising, accessibility and F13 objectives remain assigned to their owners? [Requirements quality, Spec §FR-026, FR-028, A28]

## Traceability and acceptance

- [ ] CHK030 Do measurable criteria cover all journey and requirement families? [Requirements quality, Spec §SC-001–SC-006]

- [ ] CHK031 Is V1 evidence distinguished from V2 intent without claiming to fix code? [Requirements quality, Spec §Evidence and traceability]

- [ ] CHK032 Are F14/R01/R02 dependencies and delivery limits explicit? [Requirements quality, Spec §Assumptions, Cross-feature dependencies]

## Notes

- Checkboxes remain unchecked until review; add observations beside the relevant criterion.
- `speckit-implement` reads these checkboxes without changing them. `requirements.md` follows the separate Specify/Clarify cycle.
- This review does not replace future tests, R01/R02 or global acceptance under #247.
