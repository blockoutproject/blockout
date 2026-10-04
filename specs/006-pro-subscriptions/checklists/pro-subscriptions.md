# Review checklist: subscriptions and Pro benefits

**Purpose**: Review precision, consistency and coverage of F09 requirements before the overall functional review.

**Created**: 2026-09-18

**Feature**: [Specification F09](../spec.md)

**Ownership**: This checklist is reviewer-owned. A checked box means requirement quality has been reviewed and found satisfactory, never that its implementation or provider qualification is complete.

## Scope and states

- [ ] CHK001 Is absence of Blockout-served advertising the only benefit, excluding external video-service ads, with pool maps and both club calendars free for guests and every rights state, without changing personal or administrative permissions? [Completeness, FR-001, A01–A02, SC-001]
- [ ] CHK002 Is RevenueCat the entitlement authority without a duplicate backend projection, including paid/promotional state and native transfer scope? [Consistency, FR-002–FR-003, FR-020]
- [ ] CHK003 Are SDK active, inactive, unavailable and pending-purchase states distinguished? [Clarity, FR-003–FR-004]
- [ ] CHK004 Is the no-state ad/purchase suppression distinct from SDK-inactive consent-based advertising? [Consistency, FR-004, F11]
- [ ] CHK005 Do a usable account, existing associations and isolation of late responses respect F05 without equating sign-in with payment ownership? [Consistency, FR-005–FR-006, FR-016, A04–A05]

## Timing, evidence and outages

- [ ] CHK006 Is standard SDK refresh specified without a Blockout five-minute guarantee or global propagation deadline? [Clarity, FR-007]
- [ ] CHK007 Are native purchase outcome and current SDK entitlement state distinguished from payment success? [Clarity, FR-008, A14, A18]
- [ ] CHK008 Is withdrawal of the custom 72-hour tolerance explicit, with native cache/expiry owning behavior? [Scope, withdrawn FR-009]
- [ ] CHK009 Are deletion/account switching and SDK expiry defined without an independent tolerance clock? [Coverage, FR-010, A09–A10]
- [ ] CHK010 Is rejection of old-account responses specified without requiring a backend entitlement event-ordering system? [Consistency, FR-006, FR-010]
- [ ] CHK011 Are store billing validity and SDK cache behavior distinguished without event-name inference? [Clarity, FR-011]
- [ ] CHK012 Are provider latency and SDK refresh acknowledged without a Blockout propagation guarantee? [Dependencies, FR-007, FR-031]

## Purchase and management

- [ ] CHK013 Does commercial information rely on the actual offer, without invented prices, trials, tiers or family sharing? [Accuracy, FR-012–FR-013, A12]
- [ ] CHK014 Are canceled, deferred, failed, uncertain and paid outcomes distinct enough to prevent unintended repeat billing? [Coverage, FR-014, A13–A15]
- [ ] CHK015 Does confirmed payment with unavailable activation retain an honest outcome and recovery path without prompting payment again? [Exception coverage, FR-014–FR-015, A14]
- [ ] CHK016 Does the profile entry open a provider-managed, dismissible Pro sheet rather than an app page, while the ad-free-only message, independent restore, store management and R02 review remain intact? [Measurability, FR-015–FR-017, A15–A17]
- [ ] CHK017 Does subscription management remain assigned to the originating store, distinct from a gift and understandable from the other platform? [Clarity, FR-017–FR-018, A16]

## Restoration and recovery

- [ ] CHK018 Does restoration remain identifiable for every usable account, independent of a new purchase and triggered by an informed action? [Completeness, FR-005, FR-019, A17]
- [ ] CHK019 Are no applicable purchase, active restoration and unknown outcome distinguished without false success? [Clarity, FR-019, A18]
- [ ] CHK020 Is native receipt-wide restoration scope accepted without per-purchase guarantees, gift transfer as a purchase or business-profile merge? [Consistency, FR-020, A19]
- [ ] CHK021 Do return to the same account and recovery of a purchase from the other store have distinct paths without promising impossible native restoration? [Coverage, FR-016, FR-021, A04, A20]
- [ ] CHK022 Does the post-deletion cycle include the RevenueCat record, both stores and protection of the new account against old erasures? [Completeness, FR-022, A21, F05]
- [ ] CHK023 Does recovery evidence link the request, authenticated recipient, valid transaction and corroborated ownership, without automatically accepting an email, screenshot or isolated number? [Precision, FR-023–FR-024, A22–A23]
- [ ] CHK024 Are verified ownership, unsupported operations and uncertain outcomes defined without rejecting the accepted native receipt-wide scope? [Coverage, FR-024–FR-026]
- [ ] CHK025 Are the private record and before/after checks defined, with a clear distinction between Blockout assignment and the paying store account? [Auditability, FR-025–FR-026, A22, A24]

## Gifts, privacy and qualification

- [ ] CHK026 Are console-managed grant/expiry/change/revoke and SDK visibility specified without a Blockout ledger or instant propagation guarantee? [Completeness, FR-027]
- [ ] CHK027 Does gift independence cover charges, renewals, refunds, purchase transfer and deletion/recreation? [Consistency, FR-028, A27–A28]
- [ ] CHK028 Are interventions restricted to the owner in RevenueCat at launch, without an extra Blockout screen, implicit delegation or misleading presentation of the Support role? [Scope, FR-023, FR-027, FR-029, A25]
- [ ] CHK029 Are uncertain console outcomes and SDK refresh distinguished from completed mobile visibility? [Recovery, FR-030–FR-031]
- [ ] CHK030 Do requirements distinguish V1 observations from future qualification of settings, identities and actual effects, without F14 restoration help replacing prior continuity evidence? [Traceability, FR-032, A19, A21, evidence]
- [ ] CHK031 Do accessibility, assistance and public content remain available in degraded states under F05/F13? [Cross-feature consistency, FR-033, A02, SC-008]
- [ ] CHK032 Do privacy of evidence/records, deletion and backup restoration respect F11/F13 without unlimited retention or restoration of a revoked right? [Consistency, FR-034, A23, A29]

- [ ] CHK033 Are cached inactive SDK state, no state and uncertain payment given distinct advertising/purchase outcomes? [Boundaries, FR-003–FR-004, FR-014]
- [ ] CHK034 Does premium styling distinguish SDK-active from unknown/free/expired rights across light/dark themes and account switches without recoloring match cards or division contexts? [Design coherence, FR-005, FR-035, A30, SC-009]
- [ ] CHK035 Are RevenueCat entitlement/UI ownership and Blockout account/consent responsibilities separated, with native qualification explicitly pending? [Provider boundary, FR-003, FR-017]

## Notes

- Markers remain unchecked until review. They certify no actual payment, transfer, deletion or provider-configuration test.
- The [Specify/Clarify quality checklist](requirements.md) has a separate lifecycle.
- Contracts, evidence and authorization mechanisms, schemas and technical tests will be derived after corpus acceptance; this checklist evaluates requirements.
