# Review checklist: advertising, privacy and legal documents

**Purpose**: Review precision, coverage and consistency of F11 requirements and their agreements with other scopes

**Created**: 2026-09-18

**Feature**: [Specification F11](../spec.md)

**Note**: Custom checklist generated with the official `speckit-checklist` skill; in-depth requirements review before functional acceptance.

**Review ownership**: The reviewer determines whether each writing-quality criterion is satisfied and may then mark it `[x]`.

**Marker meaning**: `[x]` means requirement quality has been reviewed and found satisfactory, not that the behavior is implemented.

## Frequency, transitions and recovery

- [ ] CHK001 Are eligible actions, repetitions of a pending action and excluded journeys defined without turning every interaction into an opportunity? [Clarity, Specification §FR-001–FR-002, §A01, §A04]
- [ ] CHK002 Are the shared navigation/live-stream counter, its threshold of ten and its session-local scope explicit? [Completeness, Specification §FR-002–FR-003, §FR-006]
- [ ] CHK003 Is the distinction between loading, requested presentation and actual display sufficient to decide when to reset the counter? [Clarity, Specification §FR-003, §A02]
- [ ] CHK004 Are subsequent attempts after failure defined without accumulating an ad debt or resetting on availability changes? [Consistency, Specification §FR-003, §FR-006, §Edge cases]
- [ ] CHK005 Do absent, unready, prohibited or unconfirmed ads have a recovery outcome without indefinite blocking or an implicitly imposed V1 timeout? [Coverage, Specification §FR-004, §A02–A03]
- [ ] CHK006 Do requirements distinguish a single action, concurrent requests, dismissal, return to the application and late display? [Coverage, Specification §FR-005, §A03–A04]

## Pro, audience and choices

- [ ] CHK007 Are SDK-active, inactive and no-state advertising consequences consistent with F09 and consent, without blocking sporting access? [Completeness, FR-007, A05–A07]
- [ ] CHK008 Are the absence of a timeout that turns unknown status into free status and F09 ownership of evidence validity explicit? [Consistency, Specification §FR-007, §Cross-perimeter dependencies]
- [ ] CHK009 Are parallel preparation, reuse of choices and avoidance of unnecessary prompts for known Pro users compatible with the pre-presentation check? [Consistency, Specification §FR-008–FR-009, §A08]
- [ ] CHK010 Are the 13+ audience, absence of age collection and absence of personalization for everyone distinguished from account age and production settings still requiring qualification? [Clarity, Specification §FR-010–FR-011, §A09, §A27]
- [ ] CHK011 Are identical opportunities, permitted modes and actual availability distinguished without treating refusal as Pro or promising identical impression counts? [Clarity, Specification §FR-012–FR-013, §A10]
- [ ] CHK012 Are system permissions, consent, personalization and ATT conditions separated without assuming that all nonpersonalized advertising is exempt from permission? [Consistency, Specification §FR-011–FR-013, §External references and limitations]
- [ ] CHK013 Does viewing/changing choices include errors, recovery, applicable previous decisions and incompatible prepared ads? [Coverage, Specification §FR-014, §A11]

## Documents and permissions

- [ ] CHK014 Are the three documents, guest access before the relevant action, missing/error states and recovery defined? [Completeness, Specification §FR-015–FR-016, §A12]
- [ ] CHK015 Is public legal reading retained with versioned-file backend publication and explicit removal of mobile editing/write APIs? [Scope, FR-017–FR-019, A13–A14]
- [ ] CHK016 Does validation of the published result cover empty fields, whitespace, partial edits, refusals and uncertain outcomes without losing previous state? [Coverage, Specification §FR-018, §A14]
- [ ] CHK017 Are the returned title, free-form version, actual date and absence of a requirement to change the version consistent? [Clarity, Specification §FR-019, §A13]
- [ ] CHK018 Is the absence of history and an acceptance register distinguished from specific consents and privacy information? [Consistency, Specification §FR-020, §A15]

## Personal data, retention and rights

- [ ] CHK019 Does the matrix distinguish purposes, recipients and owners without requiring every V1 field or authorizing reuse for advertising? [Completeness, Specification §FR-021, §Categories, purposes and responsibilities]
- [ ] CHK020 Are useful contacts, match-associated referees and overriding restrictions described without a personal directory or old-contact archive, and without bypass through F02 administrative correction or return to source? [Scope, Specification §FR-022–FR-024, §A16–A17 ; F02 §A36]
- [ ] CHK021 Do corrections and restrictions override collection, reactivation and reconstruction without indiscriminately deleting sporting identity or history? [Consistency, Specification §FR-023–FR-024, §A17]
- [ ] CHK022 Does restoration require current restrictions to be applied or affected access suspended, with backups distinct from an alternative consultation source? [Coverage, Specification §FR-025, §A18]
- [ ] CHK023 Are 30-day backups, active data, tickets and logs distinguished without an invented retention period? [Clarity, Specification §FR-026–FR-027, §FR-034]
- [ ] CHK024 Does the absence of periodic issue purging remain compatible with individual requests and separate copies, without certifying unlimited retention? [Consistency, Specification §FR-034, §A24]
- [ ] CHK025 Are contact access without an account, manual handling, proportionate verification and partial request outcomes explicit? [Completeness, Specification §FR-035–FR-036, §A25–A26]
- [ ] CHK026 Are legal deadlines and information about actual processing distinguished from an on-call commitment, initial text and already certified compliance? [Clarity, Specification §FR-036–FR-037, §A26–A27]

## Assistance agreement and responsibilities

- [ ] CHK027 Are access before sign-in/after failure, required prefilled but editable email, and its reply purpose fully defined? [Completeness, Specification §FR-028, §A20]
- [ ] CHK028 Are format, deliverability, possession and identity evidence distinguished without creating a new verification journey or account recovery from a declared email? [Clarity, Specification §FR-029, §A20, §A22]
- [ ] CHK029 Does reliable context include the target despite a loading failure and the sign-in step, without invented names, tokens or raw provider content? [Coverage, Specification §FR-030, §A21]
- [ ] CHK030 Are recipients of tickets, screenshots, files and secondary notifications bounded, including on partial failure? [Completeness, Specification §FR-027, §FR-031, §A19, §A22–A23]
- [ ] CHK031 Are GitHub, email replies and absence of in-app dialogue choices distinct from unselected technical mechanisms? [Scope, Specification §FR-032–FR-033, §A22–A23]
- [ ] CHK032 Are acceptance of content with all images, intermediate or uncertain states and an independent secondary alert distinguished without partial delivery, editing after confirmation or deliberate duplication? [Coverage, Specification §FR-033, §A23]
- [ ] CHK033 Does every requirement have a scenario and measurable outcome, with V1 observations distinguished from future requirements? [Traceability, Specification §Inventory and decision coverage, §SC-001–SC-008]
- [ ] CHK034 Are agreements with F01/F02/F05/F09/F10/F13 and needs of the overall Figma review explicit without claiming to complete other scopes? [Dependencies, Specification §Cross-perimeter dependencies, §Assumptions]

## Notes

- Review requirement wording; this checklist is not an application test result.
- Generated items remain unchecked. `speckit-implement` reads the markers without changing them.
- The [requirements checklist](requirements.md) has the separate Specify/Clarify lifecycle.
