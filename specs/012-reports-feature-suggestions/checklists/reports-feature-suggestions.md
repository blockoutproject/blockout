# Review checklist: reports and improvement suggestions

**Purpose**: In-depth review of F10 requirements before global functional acceptance.

**Created**: 2026-09-22

**Feature**: [Specification F10](../spec.md)

**Ownership**: Checkboxes belong to the reviewer. A checked box means that requirement quality has been examined and satisfied, not that the behavior is implemented.

## Form completeness

- [ ] CHK001 Are guest access and entry points after failure defined independently of resource loading? [Requirements quality, Specification §FR-001, A01]
- [ ] CHK002 Are both submission types and their shared mandatory fields explicit? [Requirements quality, Specification §FR-002–FR-004, A02–A03]
- [ ] CHK003 Are the optional subject, its reliable suggestion and its correction defined without mandatory classification? [Requirements quality, Specification §FR-003, A02]
- [ ] CHK004 Are the purpose, format and modification of the email address distinguished from possession of it? [Requirements quality, Specification §FR-005, A04]
- [ ] CHK005 Do an inaccessible target and the authentication context exclude invented information and secrets? [Requirements quality, Specification §FR-006–FR-008, A05–A07]

## Images and input continuity

- [ ] CHK006 Are count, format and post-preparation size limits measurable, including at the boundaries? [Requirements quality, Specification §FR-009–FR-010, A08–A10]
- [ ] CHK007 Are the optional nature, review and removal of images explicit? [Requirements quality, Specification §FR-009–FR-011, A08]
- [ ] CHK008 Do preparation errors and permission errors specify text retention and handling of the selection? [Requirements quality, Specification §FR-012, A11]
- [ ] CHK009 Are the temporary journey, abandonment and absence of a draft after restart distinguished? [Requirements quality, Specification §FR-013–FR-014, A12, A19]
- [ ] CHK010 Does isolation during an account change cover input and retries? [Requirements quality, Specification §FR-015, A13]

## Complete sending and uncertain states

- [ ] CHK011 Does the acceptance boundary require the content and all images in the same authorized case? [Requirements quality, Specification §FR-016–FR-018, A14–A16]
- [ ] CHK012 Is correction after confirmed failure distinguished from partial delivery or editing after acceptance? [Requirements quality, Specification §FR-017–FR-019, A15, A21]
- [ ] CHK013 Do intermediate issue/attachment failures remain private and incomplete until resolved, with manual cleanup permitted? [Coverage, FR-018, FR-021, A16]
- [ ] CHK014 Does a lost response stay honestly uncertain, with ordinary duplicate prevention and exceptional private duplicates accepted for manual closure? [Clarity, FR-020–FR-021, A17]
- [ ] CHK015 Do double taps, concurrent retries and input changes have explicit consequences? [Requirements quality, Specification §FR-021–FR-022, A18]
- [ ] CHK016 Are closing and restarting distinguished from cancelling a transmitted operation? [Requirements quality, Specification §FR-023, A19]
- [ ] CHK017 Does confirmation exclude subsequent additions and modifications in the application? [Requirements quality, Specification §FR-024, A21]
- [ ] CHK018 Does the secondary alert remain independent of complete receipt and avoid requiring a new submission? [Requirements quality, Specification §FR-025, A20]
- [ ] CHK019 Is lack of network distinguished from an uncertain outcome and guaranteed deferred sending? [Requirements quality, Specification §FR-030, A22]

## Consistency and confidentiality

- [ ] CHK020 Do authorized recipients cover the ticket, separate files and diagnostics on failure? [Requirements quality, Specification §FR-025–FR-026, A23]
- [ ] CHK021 Are GitHub, email replies and the absence of in-app tracking bounded without an SLA or promise of implementation? [Requirements quality, Specification §FR-027, A24]
- [ ] CHK022 Are F08 reports distinct from support requests about streaming? [Requirements quality, Specification §FR-028, A25]
- [ ] CHK023 Are sporting, identity and Pro powers distinct from case access? [Requirements quality, Specification §FR-008, FR-028, A07, A26]
- [ ] CHK024 Do retention and applicable requests remain consistent with F11 without a new purge? [Requirements quality, Specification §FR-029, A27]
- [ ] CHK025 Is complete sending consistent with F11 FR-033/A23 without equating an incomplete case with a finalized request? [Requirements quality, Specification §FR-018–FR-025, Dependencies]

## Criteria, evidence and design

- [ ] CHK026 Do criteria forbid incomplete success and privacy leaks while distinguishing ordinary duplicate prevention from accepted exceptional duplicates? [Measurability, SC-001–SC-006]
- [ ] CHK027 Does coverage link every requirement to positive, negative or recovery scenarios? [Requirements quality, Specification §Coverage and dependencies]
- [ ] CHK028 Are V1 observations distinct from decisions and V2 mechanisms still to be designed? [Requirements quality, Specification §V1 evidence, Assumptions and limits]
- [ ] CHK029 Are accessibility needs, states and the transition to R02 defined without deeming a mockup approved? [Requirements quality, Specification §FR-030–FR-031, A28]

## Notes

- Generated according to `speckit-checklist`; all checkboxes remain reserved for the reviewer. `speckit-implement` may read them without changing them.
- The writing-quality checklist `requirements.md` has its separate Specify/Clarify cycle.
