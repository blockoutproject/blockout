# Review checklist: shared administration and access configuration

**Purpose**: In-depth review of F12 requirements before global functional acceptance.

**Created**: 2026-09-23

**Feature**: [Specification F12](../spec.md)

**Ownership**: Checkboxes belong to the reviewer. A checked box means that the requirement-quality criterion has been examined and satisfied, not that the behavior is implemented.

## Permissions and responsibilities

- [ ] CHK001 Does automatic assignment of ordinary capabilities alone preserve each domain’s conditions? [Requirements quality, Specification §FR-001, A01]
- [ ] CHK002 Is the product owner distinguished from an account owner and solely authorized to assign privileges? [Requirements quality, Specification §FR-002, A02, Actors]
- [ ] CHK003 Are the three permissions for maintenance, versions and bypass independent? [Requirements quality, Specification §FR-003, A03]
- [ ] CHK004 Does each administrative command retain a single functional owner, including F09 reserved powers? [Requirements quality, Specification §FR-004, A04, Coverage and dependencies]
- [ ] CHK005 Do absent, revoked or unusable rights and old sessions have explicit consequences without implicit rights? [Requirements quality, Specification §FR-005, A05, A16]

## Configuration and save outcomes

- [ ] CHK006 Is content preparation separated from activation, for both active and inactive maintenance? [Requirements quality, Specification §FR-006, A06]
- [ ] CHK007 Do the mandatory message, optional image and image unavailability have distinct rules? [Requirements quality, Specification §FR-007, FR-031, A07–A08]
- [ ] CHK008 Are unchanged fields, removed fields and independent setting groups differentiated? [Requirements quality, Specification §FR-008, A09]
- [ ] CHK009 Do loading and error states exclude defaults presented as published values? [Requirements quality, Specification §FR-009, A10]
- [ ] CHK010 Do refusals, failures and refreshes preserve accepted state and input without silent overwriting? [Requirements quality, Specification §FR-010, A10–A11]
- [ ] CHK011 Do uncertainty and concurrency require rereading and resolution without blind repetition? [Requirements quality, Specification §FR-011, A12]

## Maintenance and startup

- [ ] CHK012 Is mobile and server blocking defined without equating maintenance with sporting erasure? [Requirements quality, Specification §FR-012, A13, A18]
- [ ] CHK013 Are legal, support and operator-authentication exceptions explicit without implicitly opening ordinary access? [Requirements quality, Specification §FR-013, A14]
- [ ] CHK014 Is bypass personal, explicit, limited to current rights and free of a version exception? [Requirements quality, Specification §FR-014, A15–A16, A29]
- [ ] CHK015 Are cold start and explicit retry distinguished from foreground return and all periodic polling? [Requirements quality, Specification §FR-015, A17]
- [ ] CHK016 Is a server refusal received during a session distinguished from instant screen replacement without a server exchange? [Requirements quality, Specification §FR-016, A18]
- [ ] CHK017 Does every failed cold-start check keep ordinary access closed until a successful complete retry, without persisted configuration or a session timer? [Requirements quality, Specification §FR-017, A19]
- [ ] CHK018 Are the absence of reliable state and retention of a known restriction distinguished without a false maintenance state? [Requirements quality, Specification §FR-018, A20]
- [ ] CHK019 Are already accepted short operations preserved without a general suspension or cancellation system? [Requirements quality, Specification §FR-019, A21]
- [ ] CHK020 Does maintenance preserve the independence of collection and its F01 pause rules? [Requirements quality, Specification §FR-020, A22]

## Notifications and versions

- [ ] CHK021 Is entry creation retained during maintenance without resetting announcement limits? [Requirements quality, Specification §FR-021, A23]
- [ ] CHK022 Are operators included in push suppression, with no replay or persistent retry window on reopening under F07? [Requirements quality, Specification §FR-022, A23–A25]
- [ ] CHK023 Do already delivered messages retain explicit recall limits and their delivery state? [Requirements quality, Specification §FR-023, A26]
- [ ] CHK024 Are platform-specific thresholds and lower, equal, higher and absent cases defined? [Requirements quality, Specification §FR-024, A27]
- [ ] CHK025 Do numeric ordering, invalid thresholds and unknown installed versions exclude fictitious values? [Requirements quality, Specification §FR-025, A28]
- [ ] CHK026 Are the absence of an operator version exception and maintenance priority consistent? [Requirements quality, Specification §FR-026–FR-027, A29–A30]
- [ ] CHK027 Is operator verification of publication distinguished from a valid URL and an automatic store check? [Requirements quality, Specification §FR-028, A31]
- [ ] CHK028 Are failed and successful store opening distinguished from actual installation? [Requirements quality, Specification §FR-029, A32]
- [ ] CHK029 Do threshold corrections/withdrawals and mandatory links preserve other settings? [Requirements quality, Specification §FR-030, A33]

## Scope, quality and coverage

- [ ] CHK030 Are FR-032, FR-033 and A34 explicitly withdrawn, with no dedicated outside-mobile emergency circuit while ordinary permissions and access rules remain? [Scope, FR-032–FR-033, A34]
- [ ] CHK031 Do diagnostics and safe operations remain applicable during maintenance without monthly availability accounting or an extra audit system? [Requirement quality, FR-034, A35]
- [ ] CHK032 Are F14 constraints and R02 states explicitly handed over without deeming an implementation, migration or screen approved? [Requirements quality, Specification §FR-035–FR-036, A35]
- [ ] CHK033 Do criteria and tables cover all requirements, boundaries and recovery without confusing V1 evidence with expected behavior? [Requirements quality, Specification §SC-001–SC-007, Coverage and dependencies, V1 evidence]

## Notes

- Generated according to `speckit-checklist`. Markers remain reserved for the reviewer; `speckit-implement` may read them without changing them.
- The `requirements.md` checklist follows the separate Specify/Clarify writing cycle.
