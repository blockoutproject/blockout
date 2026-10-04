# Review checklist: stream-link contributions and moderation

**Purpose**: Examine the completeness, clarity and consistency of F08 requirements before global functional acceptance

**Created**: 2026-09-22

**Feature**: [Specification F08](../spec.md)

**Ownership**: Requirements-quality checklist reserved for the reviewer, prepared with `speckit-checklist`. A checked box means that the writing criterion has been examined and satisfied; it does not mean that the software is implemented or validated. Checkboxes are left unchecked on generation.

## Eligibility completeness

- [ ] CHK001 Are actors, publishing permissions, unavailable profiles and the absence of a Pro privilege explicitly distinguished? [Completeness, Specification §FR-001, §FR-027, §A01, §A09]
- [ ] CHK002 Are the three platforms and video, live-stream, channel or page addresses bounded without promising availability or verified broadcasting? [Clarity, Specification §FR-002, §A02]
- [ ] CHK003 Does the professional-competition prohibition cover moderators and phases without an FFVB equivalent without depending on a single provider code? [Consistency, Specification §FR-003, §A03]
- [ ] CHK004 Are the seven-day boundary, Auth0 evidence, its absence and the authorized exception consistent with F05? [Clarity, Specification §FR-004–FR-005, §FR-027, §A04]
- [ ] CHK005 Are conditions before and at H−1, unknown time and absent date separated without inventing a time? [Coverage, Specification §FR-006–FR-007, §FR-033, §A05–A06]
- [ ] CHK006 Does post-match validation depend on the F02 final result rather than the F03 category, a provisional score or elapsed time alone? [Consistency, Specification §FR-008–FR-009, §A07–A08]

## Ownership, proposals and quotas

- [ ] CHK007 Are the uniqueness of the active link and coexistence with private proposals defined without confusing active state with public visibility? [Clarity, Specification §FR-010, §FR-033, §Transition table]
- [ ] CHK008 Are the rights of the owner, other users and the moderator explicit, including for an ownerless link? [Completeness, Specification §FR-011, §FR-016, §FR-027, §FR-034, §A10, §A15]
- [ ] CHK009 Are immediate replacement and keeping the old link while awaiting a decision consistent with rejection, cancellation and independent withdrawal? [Consistency, Specification §FR-012–FR-013, §A10–A11, §A16]
- [ ] CHK010 Does replacing a proposal by the same author follow current conditions after sporting corrections, with the old proposal becoming obsolete only when the new version is saved, immediate publication or a pending state as applicable, and retention on refusal? [Coverage, Specification §FR-009, §FR-012–FR-014, §FR-019, §A12, §A16]
- [ ] CHK011 Are viewing and cancelling one’s own proposal described without access to other users’ proposals or private history? [Completeness, Specification §FR-015, §A13, §A39]
- [ ] CHK012 Is withdrawing the active link distinct from cancelling one’s proposal and withdrawing a later version? [Clarity, Specification §FR-016, §FR-036, §A14, §A35]
- [ ] CHK013 Do the three cumulative pre-match and post-match versions include the first version and pending versions, without a refund after a negative decision? [Clarity, Specification §FR-017, §FR-019, §A17]
- [ ] CHK014 Does the daily quota include matches contributed to previously, without counting the same match several times today? [Coverage, Specification §FR-018, §A18]
- [ ] CHK015 Are the Paris day, daylight-saving changes and the deadline shown in New York consistent, without renewal through a time-zone change? [Consistency, Specification §FR-018, §A19]
- [ ] CHK016 Are refusals, identical repeats, approvals and reactivations distinguished from a new version consuming quotas? [Clarity, Specification §FR-019–FR-020, §A20–A21]

## Reports and moderation

- [ ] CHK017 Are the reason, permissions, reporting another user’s link and the absence of an account-age threshold for reporting specified? [Completeness, Specification §FR-021, §A22]
- [ ] CHK018 Is deduplication defined by reporter, version and period, without transfer to a link or period that appeared in the meantime? [Clarity, Specification §FR-022, §FR-036, §A23, §A35]
- [ ] CHK019 Are the thresholds of three and ten and their assessment on a new report consistent with result corrections? [Coverage, Specification §FR-023, §A24, §A27]
- [ ] CHK020 Does the pending state imposed on all new authors after hiding clearly prohibit bypass through an address or account change? [Consistency, Specification §FR-024, §A25]
- [ ] CHK021 Are actions resolving this pending state distinguished from simple rejection, cancellation and post-match validation, which still applies? [Clarity, Specification §FR-025, §A28]
- [ ] CHK022 Does reactivation retain history while opening a fresh counter, allowing a new report and avoiding reset on replay? [Coverage, Specification §FR-026, §FR-037, §A26, §A36]
- [ ] CHK023 Do moderation exceptions remain action-specific, without universal authorization to publish, withdraw or bypass restrictions? [Consistency, Specification §FR-027, §A09, §A29]
- [ ] CHK024 Are the moderation list, useful history and their confidentiality defined without imposing an audit architecture? [Completeness, Specification §FR-028, §A29, §A34]
- [ ] CHK025 Do approval, rejection and reactivation transitions specify admissible states and their effect on the owner and old active link? [Clarity, Specification §FR-029–FR-031, §A30–A32, §Transition table]
- [ ] CHK026 Are the obsolescence of other proposals after moderation selects one and notification of their authors explicit, without implicit late approval? [Coverage, Specification §FR-032, §A30–A32]

## Cross-feature consistency and acceptance quality

- [ ] CHK027 Do sporting restrictions, private review and moderation reasons accumulate without republication through reappearance or reactivation? [Consistency, Specification §FR-033, §A34]
- [ ] CHK028 Does account deletion distinguish personal attribution, ownership, counters and retained decisions without inventing a global retention period? [Completeness, Specification §FR-034, §A15, §A38]
- [ ] CHK029 Do concurrent publications, simultaneous quota use and obsolete actions have explicit outcomes without two active links or silent overwrites? [Coverage, Specification §FR-035–FR-036, §A33, §A35]
- [ ] CHK030 Are success, refusal, failure, uncertainty and failed reads after a confirmed mutation separated, with retries free of duplicate effects? [Consistency, Specification §FR-037–FR-038, §A36–A37]
- [ ] CHK031 Do personal and moderation states reuse F13 requirements for accessibility, French language, freshness and protection without new technical thresholds? [Completeness, Specification §FR-039, §A39]
- [ ] CHK032 Are F07/F10/F12/R02 responsibilities and visual needs explicit without declaring notifications or design delivered? [Boundaries, Specification §FR-040–FR-041, §A40, §Cross-perimeter dependencies]
- [ ] CHK033 Does each requirement have scenarios and measurable criteria, including positive cases, refusals, boundaries and recovery? [Traceability, Specification §SC-001–SC-007, §Inventory and decision coverage]
- [ ] CHK034 Do V1 observations, functional decisions and future software validations remain separate without imposing implementation details? [Consistency, Specification §V1 sources, §Assumptions and limits]

## Notes

- Markers belong to the reviewer. `speckit-implement` may read them as prerequisites but must not check them.
- The [built-in quality checklist](requirements.md) follows the Specify/Clarify cycle and does not replace this review.
- Global review R01, design R02 and acceptance under #247 remain required before any technical planning.
