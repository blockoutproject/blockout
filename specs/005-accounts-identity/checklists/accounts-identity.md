# Review checklist: accounts, identity and deletion

**Purpose**: Review precision and consistency of F05 requirements, especially identity isolation, session isolation and partial erasure

**Created**: 2026-09-18

**Feature**: [Specification F05](../spec.md)

**Note**: Custom checklist from the official `speckit-checklist` template, intended for in-depth requirements review before functional acceptance.

**Review ownership**: The reviewer determines whether each writing-quality criterion is satisfied and may then mark it `[x]`.

**Marker meaning**: `[x]` means requirement quality has been reviewed and found satisfactory, not that the behavior is implemented.

## Completeness and boundaries

- [ ] CHK001 Are guest access, restricted actions and optional onboarding defined without automatic mutation after sign-in, with an F14 transition welcome distinct from already completed onboarding? [Completeness, Specification §FR-001–FR-002, §A01–A02]
- [ ] CHK002 Are the selected providers, automatic creation and absence of a mandatory form explicit? [Clarity, Specification §FR-003, §FR-008, §FR-012]
- [ ] CHK003 Does the distinction between migration, reinstallation and voluntary deletion determine the account, its age and recovered data, without confusing mandatory F14 sign-in with a new identity? [Consistency, Specification §FR-010, §FR-024, §FR-035]

## Identity and profile

- [ ] CHK004 Is preservation of existing associations, including different addresses, compatible with the prohibition on any new association? [Consistency, Specification §FR-005–FR-007, §A04–A06]
- [ ] CHK005 Are same-email distinct principals allowed while same-principal concurrent creation stays unique and email-based merging forbidden? [Clarity, FR-004, FR-007, FR-010]
- [ ] CHK006 Are missing first-creation email and unavailable synchronization distinguished from an allowed shared email? [Coverage, FR-008–FR-009, A07–A08]
- [ ] CHK007 Are ownership evidence, permissions and assistance defined without allowing a merge based solely on a declared email or identifier? [Security, Specification §FR-004, §FR-006, §FR-016, §FR-037]
- [ ] CHK008 Is profile minimization explicit without accidentally removing sporting contact fields or provider profiles? [Completeness, Specification §FR-011, §Assumptions and dependencies]
- [ ] CHK009 Do generated and edited usernames share the same format, uniqueness and concurrent-outcome criteria? [Measurability, Specification §FR-012–FR-013, §A10]
- [ ] CHK010 Are absent, refused or uncertain changes distinguished from explicit photo deletion? [Coverage, Specification §FR-014–FR-015, §A11–A12]

## Session and rights

- [ ] CHK011 Are provider authentication, a ready profile and established rights described as distinct outcomes? [Clarity, Specification §FR-017–FR-019, §FR-023]
- [ ] CHK012 Do transient outages, nonrenewable expirations and revocations have differentiated consequences and a recovery path? [Coverage, Specification §FR-019, §A13–A15]
- [ ] CHK013 Are local sign-out, other devices and deletion scope distinguished? [Consistency, Specification §FR-020, §FR-022, §FR-027]
- [ ] CHK014 Are late responses, rights and in-progress mutations unambiguously attributed when switching from A to B or to guest mode? [Coverage, Specification §FR-021–FR-023, §A17–A19]
- [ ] CHK015 Does the F07 agreement cover destination disassociation, failures and the limit of already delivered messages without promising fabricated success? [Dependency, Specification §FR-022, §A18]
- [ ] CHK016 Is the unknown-rights rule consistent with F11 while leaving evidence validity with F09? [Consistency, Specification §FR-023, F11 §FR-007–FR-009]

## Account age

- [ ] CHK017 Are the reference principal, existing associations and business date distinguished without treating account age as civil age? [Clarity, Specification §FR-024, §A20]
- [ ] CHK018 Do known evidence during an outage and total absence of evidence have distinct outcomes without inventing a date or removing other permitted access? [Coverage, Specification §FR-025, §A21–A22]

## Deletion and recovery

- [ ] CHK019 Do confirmation, account ownership and billing information precede acceptance without premature sign-out? [Consistency, Specification §FR-026–FR-027, §A23]
- [ ] CHK020 Is the boundary between confirmed failure before acceptance, a lost response and an outage after acceptance precise enough to define each outcome? [Clarity, Specification §FR-027–FR-028, §A24–A25]
- [ ] CHK021 Does erasure scope include files, providers, access, derived data and any justified retention, with an owner for each category? [Completeness, Specification §FR-029, §Erasure and retention matrix]
- [ ] CHK022 Is retention of unattributed contributions distinguished from complete anonymization and restoration of ownership or visibility? [Consistency, Specification §FR-030, §FR-035, §A27]
- [ ] CHK023 Do repeated requests and authorized manual continuation have clear outcomes with one durable deletion state, without a per-step ledger or a claimed rollback of external deletion? [Coverage, Specification §FR-028, §FR-031, §A25–A26]
- [ ] CHK024 Does the communicated outcome distinguish acceptance, pending operations and resolution without requiring unavailable proof or promising on-call duty? [Clarity, Specification §FR-032, §A28]
- [ ] CHK025 Are standard Auth0 token limits on same-subject return explicit while keeping the new account protected against old cleanup, even if a provider reference is reused? [Coverage, Specification §FR-031–FR-035, §A28–A29]
- [ ] CHK026 Does restoration after deletion of the RevenueCat record remain distinct from ordinary restoration, with qualification per store and no return of manual benefits? [Consistency, Specification §FR-029, §FR-035–FR-036, §A30–A31]
- [ ] CHK027 Are the external deletion path and its ownership verification defined without requiring reinstallation, prior sign-in or a new portal? [Completeness, Specification §FR-037, §A32]

## Quality, privacy and traceability

- [ ] CHK028 Do evidence and personal data, assistance records and post-backup restrictions follow the same obligations as F11/F13? [Consistency, Specification §FR-034, §FR-038–FR-039]
- [ ] CHK029 Do shared goals, accessibility and degraded states have explicit authority without inventing a uniform deadline for external erasure? [Dependency, Specification §FR-039, §Assumptions and dependencies]
- [ ] CHK030 Are SC-001–SC-008 measurable and linked to requirements and scenarios without confusing documentary validation with product tests? [Measurability, Specification §Success criteria, §Coverage and cross-perimeter dependencies]
- [ ] CHK031 Are V1 findings, provider recommendations and target rules distinguished, with consistent references in the scope and mapping documents? [Traceability, Specification §V1 evidence and limitations]
- [ ] CHK032 Are F06–F14 responsibilities and the overall R01/R02 pass explicit without delegating an F05 decision to implementation? [Completeness, Specification §Coverage and cross-perimeter dependencies]

## Notes

- Each item reviews requirement quality, not execution of the behavior.
- Markers belong to the reviewer; `speckit-implement` may read them but does not change them. The `requirements.md` checklist has a separate lifecycle maintained by Specify/Clarify.
- Mechanism details, contracts and provider qualification remain to be derived after functional acceptance and the overall Figma gate; expected outcomes are defined here.
