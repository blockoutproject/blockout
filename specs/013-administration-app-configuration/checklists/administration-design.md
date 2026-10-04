# Administration design requirements-quality checklist

**Purpose**: Deep author/peer review of F12 permission, configuration, access and consumer requirement quality before plan acceptance.
**Created**: 2026-10-09
**Feature**: [F12](../spec.md), [plan](../plan.md), [contracts](../contracts/consumers.md)

**Review ownership**: Reviewer-owned requirements-quality artifact. `[x]` means a reviewer has approved the criterion's completeness/clarity; it never means an implementation test passed. New markers remain unchecked for review.

## Authority and permission completeness

- [ ] CHK001 Are all ordinary and privileged capabilities enumerated, with one current owner and no implicit administrator power? [Completeness, FR-001–005; authorization catalogue]
- [ ] CHK002 Are new-account defaults distinguished from subsequent login and account recreation, including removed ordinary grants? [Lifecycle, FR-001/005]
- [ ] CHK003 Is owner-only assignment defined with an exact current account and environment, without an approximate personal-data lookup? [Clarity, FR-002]
- [ ] CHK004 Are action/resource conditions and current authorization distinguished from displayed capabilities and authentication? [Consistency, FR-004/005]
- [ ] CHK005 Are admission, final mutation authorization and accepted business outcome unambiguously distinguished across F01/F02/F05? [Consistency, FR-005/019]

## Configuration and outcome precision

- [ ] CHK006 Are independent groups, shared content/state revision, effective no-op and stale-write behavior fully specified? [Completeness, FR-006/008/011]
- [ ] CHK007 Are absent fields, explicit null, empty patch and nested platform edits distinguished? [Clarity, FR-008/030]
- [ ] CHK008 Are text, URL, version and revision bounds measurable and consistent across language boundaries? [Measurability, FR-007/025/028]
- [ ] CHK009 Are initial loading, dirty refresh, refusal, conflict and uncertain save outcomes defined without invented history? [Coverage, FR-009–011]
- [ ] CHK010 Are missing configuration and seed semantics defined without a permissive runtime default? [Exception coverage, FR-018]

## Access and retry consistency

- [ ] CHK011 Are ordinary access, targeted configuration recovery and legal/support/identification exceptions distinct in every block state? [Completeness, FR-012/013/018]
- [ ] CHK012 Is the bypass lifetime explicit for cold restart, logout, account switch, Auth0 return and maintenance off/on? [Clarity, FR-014/015]
- [ ] CHK013 Are cold-start failure, explicit retry, in-process restrictions/revisions and partial administrative recovery defined without persisted access configuration or a session timer? [Measurability, FR-015–018]
- [ ] CHK014 Are complete verification and partial observations distinguished, including older responses and restrictions retained in the current process? [Consistency, FR-011/016–018]
- [ ] CHK015 Are configuration failures distinguished from maintenance, with no ordinary access conferred by an administrative read/save? [Exception coverage, FR-013/018]
- [ ] CHK016 Is a known minimum retained during unavailability and operator recovery, including an unknown installed version? [Consistency, FR-025–027]
- [ ] CHK017 Are business maintenance refusal and technical retry semantics defined without automatic mutation repetition? [Consistency, FR-016/019; F13]

## Consumer, media and acceptance boundaries

- [ ] CHK018 Are inbox retention, push suppression, configuration-read failure and no replay defined together, including operator recipients? [Completeness, FR-021–023]
- [ ] CHK019 Are per-platform numeric comparison and store confirmation conditions precise, without equating URL format with availability? [Clarity, FR-024–030]
- [ ] CHK020 Are optional media failure, fallback messages, store-opening failure and accessibility requirements described independently of imagery? [Coverage, FR-007/029/031/034]
- [ ] CHK021 Are the seven public operations and additive capability responses sufficient for the five journeys without a permission-management API? [Coverage, FR-001–031]
- [ ] CHK022 Are actual F07 and F14 dependencies distinguished from controlled interface evidence and documentary checks? [Dependencies, FR-021–023/035]
- [ ] CHK023 Are design references tied to accepted scope and future native qualification without new screen approval claims? [Traceability, FR-034–036]
- [ ] CHK024 Are all active requirements/scenarios/criteria mapped while FR-032, FR-033 and A34 remain withdrawn? [Traceability, quickstart coverage]

## Notes

Use [quickstart coverage](../quickstart.md#coverage) and the linked owning contracts as evidence. Record unresolved requirement findings with their owners. `$speckit-implement` reads this gate but must not change markers. `requirements.md` keeps its separate Spec Kit specification lifecycle. Runtime validation is described in quickstart, not asserted by these boxes.
