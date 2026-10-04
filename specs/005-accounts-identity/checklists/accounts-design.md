# F05 technical design requirements checklist

**Purpose:** Review completeness, clarity and consistency of the account/identity design before dossier acceptance.

**Created:** 2026-10-06

**Feature:** [F05 specification](../spec.md), [plan](../plan.md)

**Ownership:** Reviewer-owned requirements-quality checklist. `[x]` means the reviewer approved the writing-quality criterion, never that implementation or qualification ran. Newly generated items remain unchecked.

## Requirements quality

- [ ] CHK001 Is the explicit bootstrap/read distinction specified, with no account creation or provider synchronization on ordinary GET? [Completeness, FR-004, FR-008–FR-010; contracts/account-behavior.md]
- [ ] CHK002 Are canonical identities and preserved associations distinguished from shared, non-unique provider email, without linking or reservations? [Completeness, FR-004–FR-010]
- [ ] CHK003 Are neutral username generation, shared format/uniqueness rules and the initial default avatar unambiguous? [Clarity, FR-011–FR-015; research.md R03]
- [ ] CHK004 Are unavailable first-creation email, retained known-profile data and an allowed shared email given distinct outcomes? [Coverage, FR-008–FR-009, Q01–Q02]
- [ ] CHK005 Are explicit-sign-in synchronization, retained-value behavior and targeted missing-age retrieval distinguished from cold-start reads? [Clarity, FR-009, FR-018, FR-024–FR-025]
- [ ] CHK006 Are provider credentials, JWT validation and current account/action authorization assigned to explicit owners without a business session registry? [Security, FR-003–FR-004, FR-016–FR-021; research.md R01]
- [ ] CHK007 Is standard Auth0 same-subject return behavior explicit without weakening old-data, stale-cleanup or mobile-cache isolation? [Consistency, FR-019–FR-021, FR-027, FR-031, FR-035; Q06/Q08]
- [ ] CHK008 Are local logout, browser-logout failure, another device and account switching distinguished? [Coverage, FR-020–FR-022; contracts/account-behavior.md]
- [ ] CHK009 Are profile readiness and F09 entitlement readiness separate, including unknown rights without advertising or a repurchase invitation? [Clarity, FR-017–FR-023; contracts/consumers.md]
- [ ] CHK010 Are private photo access, input constraints, stale edits, uncertain association and cleanup failure specified without public-logo assumptions? [Completeness, FR-014–FR-016, FR-038; research.md R04; Q04]
- [ ] CHK011 Are Auth0 account age, unknown evidence, migration preservation and voluntary deletion kept distinct? [Consistency, FR-024–FR-025, FR-035; Q02/Q08]
- [ ] CHK012 Are erasure confirmation and durable acceptance separated from external cleanup and total physical completion? [Clarity, FR-026–FR-029, FR-032; contracts/erasure-and-operations.md]
- [ ] CHK013 Does one pending deletion state plus original references replace any implied per-step ledger, periodic retry or dedicated resume tool? [Simplicity, FR-028, FR-031; research.md R06]
- [ ] CHK014 Are uncertain responses, app/process interruption and manual resolution described without losing the accepted obligation? [Coverage, FR-027–FR-032; Q07]
- [ ] CHK015 Are repeated intents, manual continuation and late completion constrained to the original account/targets, rather than reused email/subject? [Security, FR-031–FR-035; data-model.md]
- [ ] CHK016 Are standard Auth0/Apple cleanup and RevenueCat asynchronous deletion/restore guarantees distinguished from unexecuted provider qualification? [Dependency, FR-029, FR-032–FR-036; research.md R07–R08]
- [ ] CHK017 Does the existing privacy page provide the external deletion route/contact without introducing a portal or trusting a reply address as ownership? [Completeness, FR-037–FR-038; research.md R10]
- [ ] CHK018 Are failure/recovery incidents explicitly routed through F13 without new notification, grouping or supervision concepts? [Consistency, FR-028, FR-032, FR-039; research.md R09]
- [ ] CHK019 Are target-reference retention, support evidence, useful unattributed contributions and backup restrictions purpose-limited? [Privacy, FR-029–FR-034, FR-038; contracts/consumers.md]
- [ ] CHK020 Are public schema requirements, nullable/additive responses, safe errors and actual language consumers defined without generated-model leakage? [Interfaces, FR-004, FR-014–FR-019, FR-038–FR-039; contracts/account.openapi.yaml]
- [ ] CHK021 Are F06/F07/F08/F09/F10/F11/F12/F14 interfaces and genuine implementation dependencies explicit without duplicate owner work? [Ownership, FR-001–FR-039; contracts/consumers.md; tasks.md]
- [ ] CHK022 Do scenarios and future proofs separate documentary checks, controlled adapters and actual PostgreSQL/provider/native evidence? [Measurability, SC-001–SC-008; quickstart.md Q01–Q12]
- [ ] CHK023 Are approved Access/Account/System states reused, with targeted revalidation required for material differences? [Design, FR-001–FR-002, FR-017–FR-023, FR-026–FR-027, FR-039; plan.md]
- [ ] CHK024 Do all requirements and decisions have owned tasks and qualification conditions, with no new runtime or implementation-issue work in this dossier? [Traceability, FR-001–FR-039; tasks.md; plan.md]

## Notes

This checklist evaluates the written requirements. Runtime scenarios and their NOT EXECUTED status belong to [quickstart](../quickstart.md). It does not replace or reset the existing feature checklist.
