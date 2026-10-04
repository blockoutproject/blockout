# Review checklist: V1-to-V2 transition

**Purpose**: In-depth quality review of transition, continuity and welcome requirements before global acceptance.

**Created**: 2026-09-23

**Feature**: [Specification F14](../spec.md)

**Ownership**: This checklist belongs to the reviewer. A checked box means that requirement quality has been examined and found satisfactory, not that a migration or qualification has been executed.

## Scope, identity and permissions

- [ ] CHK001 Is the exceptional reset distinguished from voluntary deletion and normal V2 retention? [Requirements quality, Specification §FR-001–FR-005, A15–A18]
- [ ] CHK002 Does protected information include identities, associations, address attribution and account age without requiring a complete profile copy? [Requirements quality, Specification §FR-002, FR-013–FR-015, A07–A08, A12–A13]
- [ ] CHK003 Do current permissions and isolation prevent an old session or local data from granting implicit privileges? [Requirements quality, Specification §FR-003, FR-006, A04, A17]
- [ ] CHK004 Do deletion and privacy obligations explicitly survive the reset, including external cases? [Requirements quality, Specification §FR-004, FR-018, A15, A18]
- [ ] CHK005 Are personal states that are not carried over described without promising recovery or transfer based on similarity? [Requirements quality, Specification §FR-001, FR-005, A16, A24]

## Welcome and Pro recovery

- [ ] CHK006 Is mandatory transition sign-in bounded without a new identity or repetition at every launch after success? [Requirements quality, Specification §FR-006, A04–A05]
- [ ] CHK007 Are the audience for the welcome, its position before sign-in, its dismissal and its non-repetition on the installation explicit? [Requirements quality, Specification §FR-007, A01–A02]
- [ ] CHK008 Does the content distinguish data not carried over, retained identity and Pro entitlements without announcing a lost subscription? [Requirements quality, Specification §FR-008, FR-012, A01, A09–A10]
- [ ] CHK009 Do transition welcome and ordinary onboarding have distinct completion states without mandatory follow selection? [Requirements quality, Specification §FR-008–FR-009, A01–A02]
- [ ] CHK010 Does a new installation without V1 evidence have a defined journey and accessible Pro help? [Requirements quality, Specification §FR-010, A03]
- [ ] CHK011 Does access to restoration require a usable account and an explicit action without an implicit mutation on return from sign-in? [Requirements quality, Specification §FR-011, A05–A06]
- [ ] CHK012 Do Pro, outage, no-purchase and uncertain states reuse F09 without advertising or repurchase prompted by an outage? [Requirements quality, Specification §FR-012, A09–A11]
- [ ] CHK013 Is the boundary between restoration through the paying store and assisted recovery from the other store understandable? [Requirements quality, Specification §FR-012, FR-016, A11]

## Continuity and prior evidence

- [ ] CHK014 Does reconciliation cover the entire affected population and relevant primary, linked, historical and anonymous categories? [Requirements quality, Specification §FR-014, A12]
- [ ] CHK015 Are unknown associations and indispensable information blockers before their destruction, without substituting Pro help? [Requirements quality, Specification §FR-015–FR-016, FR-034, A13]
- [ ] CHK016 Do outcomes to qualify cover both stores and cases not demonstrated by a simple purchase or ordinary restoration? [Requirements quality, Specification §FR-016, A11–A13]
- [ ] CHK017 Do changes up to cutover and delayed events preserve the latest decisions? [Requirements quality, Specification §FR-017, A14, A29]
- [ ] CHK018 Do an accepted deletion in progress and protection of a future new account remain consistent with F05/F09? [Requirements quality, Specification §FR-018, A15]
- [ ] CHK019 Are gifts, purchases and independent entitlements preserved according to their validity without equating migration with provider deletion? [Requirements quality, Specification §FR-019, A09, A14]

## Logos and sporting reconstruction

- [ ] CHK020 Does prior evidence require associations and files for all affected club logos, independently of the destroyed state? [Requirements quality, Specification §FR-020–FR-021, A19–A20]
- [ ] CHK021 Are a missing file and a still-ambiguous association distinguished without false success or matching solely by name? [Requirements quality, Specification §FR-021–FR-022, A20–A21]
- [ ] CHK022 Do F02 inheritance and the limit to club logos alone exclude an undecided migration extension? [Requirements quality, Specification §FR-023, A21]
- [ ] CHK023 Do the season target and automatic F01/F02 decisions exclude human approval of pools and invented coverage thresholds? [Requirements quality, Specification §FR-024–FR-025, A22–A23]
- [ ] CHK024 Do source gaps, partial observations and V2 defects remain distinct without weakening normal historical retention? [Requirements quality, Specification §FR-025–FR-026, A23]
- [ ] CHK025 Are imports, retries and new events distinguished without bursts or invented old recipients? [Requirements quality, Specification §FR-027, A24]

## V1 withdrawal and recovery

- [ ] CHK026 Is actual availability in both stores a condition distinct from approval or a valid URL? [Requirements quality, Specification §FR-028, A25]
- [ ] CHK027 Do F12 restrictions and legal/support access take precedence over the welcome and old access? [Requirements quality, Specification §FR-029, A26]
- [ ] CHK028 Does effective V1 withdrawal cover already connected clients, direct calls and shared interference without reducing evidence to a mobile screen? [Requirements quality, Specification §FR-030, A27]
- [ ] CHK029 Does the role dependency at sign-in include people with no prior role without an implicit new privilege? [Requirements quality, Specification §FR-031, A28]
- [ ] CHK030 Is the end of V1 collection and jobs distinct from maintenance, and does it respect accepted operations? [Requirements quality, Specification §FR-017, FR-032, A29]
- [ ] CHK031 Do destinations, badges and already delivered messages have explicit isolation rules and recall limits? [Requirements quality, Specification §FR-033, A30]
- [ ] CHK032 Do conditions before destruction and opening distinguish missing evidence, source gaps and qualification defects? [Requirements quality, Specification §FR-034–FR-035, A13, A20, A31–A32]
- [ ] CHK033 Does recovery after opening target V2 without requiring a return to V1 or assuming reversal of data changes? [Requirements quality, Specification §FR-036–FR-037, A33–A34]
- [ ] CHK034 Do operational and qualification outcomes avoid personal-data diagnostics, arbitrary durations and false recovery? [Requirements quality, Specification §FR-038–FR-039, A35]
- [ ] CHK035 Do success criteria, V1 evidence and R02 needs distinguish writing quality, future qualification and implementation? [Requirements quality, Specification §FR-040, SC-001–SC-006, A36, Coverage and dependencies]

## Notes

- Generated according to `speckit-checklist`; checkboxes remain reserved for the reviewer and are not changed by `speckit-implement`.
- The `requirements.md` checklist follows the separate Specify/Clarify writing cycle.
- This review authorizes neither provider operations nor resets, and does not replace R01/R02 or future qualifications.
