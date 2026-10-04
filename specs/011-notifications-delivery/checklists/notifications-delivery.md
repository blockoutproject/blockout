# Review checklist: notifications, personal inbox and delivery

**Purpose**: Examine the completeness, clarity and consistency of F07 requirements before global functional acceptance

**Created**: 2026-09-22

**Feature**: [Specification F07](../spec.md)

**Ownership**: Requirements-quality checklist reserved for the reviewer, prepared with `speckit-checklist`. A checked box means that the writing criterion has been examined and satisfied; it does not mean that the software is implemented or validated. Checkboxes are left unchecked on generation.

## Trigger and recipient completeness

- [ ] CHK001 Is the transition of a known match to a final result separated from discovery of an already completed match, a provisional score and the “Completed” category, without an H+4/H+6 deadline? [Clarity, FR-002–FR-003, A01–A04]
- [ ] CHK002 Do corrections, withdrawals and restorations explicitly preserve identity, order and read state without a new announcement or resurrection? [Consistency, FR-004, FR-019, A05]
- [ ] CHK003 Does the union of confirmed follows exclude duplicates and requests that remain uncertain? [Completeness, FR-011–FR-012, A06]
- [ ] CHK004 Are eligibility instants, removal of the last follow, partial sends and late follows bounded without implicit catch-up? [Coverage, FR-012–FR-014, A07–A10]
- [ ] CHK005 Do public link availability, reliable H and unknown-time waiting remain distinct without a delivery retry deadline? [Clarity, FR-005–FR-006]
- [ ] CHK006 Do enriched result and separate replay share one post-match allowance that survives retention purge or push failure, independently of the live allowance? [Consistency, FR-007–FR-009, FR-043, A12–A17, A47]
- [ ] CHK007 Is result-and-replay composition fixed at match-result acceptance when a public link exists, including after live? [Coverage, FR-007, A12, A14]
- [ ] CHK008 Are publication, approval and reactivation distinct from private proposals, refusals and unchanged repeats? [Completeness, FR-010, A15–A16]
- [ ] CHK009 Is a link published after result acceptance a separate replay event regardless of personal-entry creation order, without backfilling late follows? [Clarity, FR-008, A13–A14]

## Reading, inbox and badges

- [ ] CHK010 Do actors and permissions restrict all actions and counters to their owner, without a Pro or moderation privilege? [Completeness, FR-001, FR-037, A18]
- [ ] CHK011 Is functional removal of the “opened” state explicit, with reading on tap and no reading through display alone? [Clarity, FR-017–FR-018, A19]
- [ ] CHK012 Are an accepted read and a failed opening distinct, including after a lost response? [Consistency, FR-018, FR-021, FR-038, A20]
- [ ] CHK013 Do reads, purge, correction and old pushes preserve newer decisions without resurrection, repeated effects or a fabricated read update for a missing entry? [Coverage, FR-017–FR-019, FR-030, FR-034, A21]
- [ ] CHK014 Are initial order, ties, pages, empty states and partial errors defined without a false empty result? [Completeness, FR-020–FR-021, A22–A23]
- [ ] CHK015 Do both badges have a shared definition based on all viewable unread entries, disappearing at zero? [Measurability, FR-022, A24]
- [ ] CHK016 Are cross-device synchronization and old responses handled without promising instant updates offline or at system level? [Coverage, FR-023, FR-038, A25]

## Delivery, recovery and identity

- [ ] CHK017 Is the personal entry independent of system permission, destination and push success, including during F12 maintenance? [Consistency, FR-024, A26]
- [ ] CHK018 Is push explicitly best effort without persistent fifteen-minute retries or maintenance catch-up? [Scope, withdrawn FR-025, A27]
- [ ] CHK019 Do pre-send checks cover follow, account, entry, destination, restrictions and obsolete live notices, as well as maintenance without an operator exception and reassessment after maintenance ends? [Completeness, FR-026, A26–A28]
- [ ] CHK020 Do provider acceptance, failure, uncertainty and proven receipt remain distinguished without an implicit technical guarantee? [Clarity, FR-027–FR-028, A29]
- [ ] CHK021 Are ordinary provider responses, targeted invalidation and the absence of a persistent per-device success ledger explicit? [Coverage, FR-028, A30]
- [ ] CHK022 Do installation identity and destination rotation exclude merging phones sharing the same operating-system version? [Clarity, FR-029, A31]
- [ ] CHK023 Do local sign-out, account change, deletion and re-registration preserve isolation without arbitrarily invalidating other devices? [Consistency, FR-030, FR-037–FR-038, A32–A33]

## Restrictions, content and boundaries

- [ ] CHK024 Does sporting hiding cover inbox, badge, cache and old access without equating season closure with withdrawal? [Consistency, FR-031, FR-034, A08, A34]
- [ ] CHK025 Does a withdrawn or hidden link stop being announced as available while preserving a result that remains authorized? [Clarity, FR-032, A35]
- [ ] CHK026 Does sporting reappearance distinguish retained, purged/expired and independently moderated entries without resetting age or allowances? [Coverage, FR-019, FR-033, FR-043, A36, A45]
- [ ] CHK027 Are opening the detail sheet and the limits of recalling system messages explicitly compatible with known restrictions? [Consistency, FR-034–FR-036, A37]
- [ ] CHK028 Do the four families each have at least three faithful examples, with variants for missing data and special results? [Completeness, FR-015, A38, Editorial library]
- [ ] CHK029 Does editorial stability cover devices, retries and corrections without false facts or a new announcement? [Consistency, FR-016, A39]
- [ ] CHK030 Does live and replay wording avoid promising verified video while preserving the F03 label? [Clarity, FR-015, A40]
- [ ] CHK031 Do Paris, New York and daylight-saving changes preserve the same instants and durations without assuming a time? [Coverage, FR-042, A41]
- [ ] CHK032 Do professional results and exploratory LNV TV evidence remain distinct from deferred media collection? [Boundaries, FR-039, A42]
- [ ] CHK033 Are exclusions and R02 needs explicit without campaigns, new preferences or private moderation alerts? [Boundaries, FR-040–FR-041, A43]
- [ ] CHK034 Are scoped notification retention, account erasure, backup protection, diagnostics and other domain lifetimes distinguished without inventing a global retention period? [Consistency, FR-036–FR-037, FR-043–FR-046, Cross-perimeter dependencies]
- [ ] CHK035 Are scenarios, measurable outcomes, V1 evidence and the approved removal of manual deletion traceable without claiming runtime or visual validation? [Traceability, SC-001–SC-008, Evidence and coverage]

## Retention, recovery and privacy

- [ ] CHK036 Are daily purge, the inclusive 29-day threshold, the 30-day maximum, the elapsed-hour definition and all family/read/visibility states unambiguous? [Measurability, FR-019, FR-042, A44]
- [ ] CHK037 Are elapsed retention and best-effort delivery separated, including maintenance? [Consistency, FR-019, FR-024–FR-026]
- [ ] CHK038 Is the removal of individual/bulk deletion, confirmations and archive/restore controls explicit without removing account erasure? [Scope, FR-001, FR-019–FR-021, FR-041, A46]
- [ ] CHK039 Are processed facts scoped to the match without recipient identity, while ordinary repeats and late-follower backfill remain forbidden? [Minimization, FR-043, A52]
- [ ] CHK040 Do paging, read/refresh races and stale responses preserve exact synchronized all-page counts, surviving order and absence of expired entries? [Coverage, FR-020–FR-023, FR-038, A24–A25, A48]
- [ ] CHK041 Are offline opening/resume cleanup, active-app expiry, stopped-device limits and system-message limits explicit without claiming remote freshness? [Clarity, FR-023, FR-035–FR-036, FR-044, A49]
- [ ] CHK042 Does failed purge distinguish physical removal from maximum-age exclusion, preserve partial success and require safe observable retry without manual user cleanup? [Recovery, FR-046, A50]
- [ ] CHK043 Are privacy/erasure restrictions before restore distinguished from the accepted exceptional duplicate when match facts were lost? [Recovery, FR-045, A51]
- [ ] CHK044 Do identity/privacy, follows, sporting history, contribution allowances, maintenance and design agreements remain consistent with F07 without adding implementation choices? [Consistency, FR-037, FR-041, FR-043–FR-046, Cross-perimeter dependencies]

## Notes

- Markers belong to the reviewer; they are not checked by generation or implementation.
- The [built-in quality checklist](requirements.md) follows the Specify/Clarify cycle and does not replace this review.
- R01, R02 and acceptance under #247 remain required before any technical planning.
