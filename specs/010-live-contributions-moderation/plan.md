# Implementation Plan: Live contributions and moderation

**Branch**: `tech/52-live-contributions-moderation` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: [#52](https://github.com/blockoutproject/blockout/issues/52), its owning specification and the owner-approved preparatory plan. This delivery produces planning artifacts and reconciled design/specifications, not the product runtime.

## Summary

Add account-owned stream contributions, exact-version reports and a complete video-moderation grant to the existing backend/mobile boundary. PostgreSQL versions, ordinary transactions, row locks and conditional unique constraints protect ownership, quotas and decisions. Validate addresses locally; recover current state after uncertain responses without a request journal. Use ordinary private database search and manual refresh rather than a search service or moderation workflow engine.

## Technical Context

**Language/Version**: Java 25 / Spring Boot 4.1.1 and TypeScript / Expo 57 / React Native 0.86 / React 19.2.3, under [F13](../003-shared-quality/plan.md).

**Primary Dependencies**: Existing Spring Data JPA/Hibernate, Java URI/time libraries, TanStack Query and the F13 generated HTTP boundary. No video-provider SDK or new dependency.

**Storage**: PostgreSQL 18.6 for contribution state, versions and reports; mobile query cache in memory only.

**Testing**: JUnit/Spring MVC/Testcontainers PostgreSQL and Jest Expo/React Native Testing Library; repository documentation/OpenAPI checks now, application qualification later.

**Target Platform**: Existing Linux backend and native iOS/Android clients.

**Project Type**: Mobile application with a modular backend.

**Performance Goals**: No throughput, load/capacity benchmark or monthly availability commitment. Page ordinary private lists; avoid per-row lookup loops.

**Constraints**: Current rights and sporting visibility, original account identity, seven-day age/H−1 rules, Paris-day quotas, no provider calls, mutation replay, polling, durable recovery journal or additional service.

**Scale/Scope**: Nonprofessional match links, personal proposals, reports and private moderation. Professional links, sporting truth, subscriptions and notification delivery remain owned by their existing features.

## Constitution Check

Pre-research and post-design checks pass for this scoped planning delivery:

| Principle             | Application                                                                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification     | Agreed behavior is integrated into F08's current requirements; F05/F11 erasure and F12 moderation ownership agree.                                                                                 |
| II — Domain ownership | F02 owns identities/results/visibility; F03 public consultation; F05 account lifecycle; F07 notification semantics; F12 assignment/admission. The interfaces below reconcile their affected plans. |
| III — Design          | The owner explicitly approved prototype 5413817 and then the scoped Figma report in the #52 conversation. Exact references and evidence limits appear below.                                       |
| IV — Contracts        | Extend the canonical mobile OpenAPI root. Generated interfaces/DTOs/clients follow F13; generation and integrated consumer compilation remain future qualification, not a claimed result.          |
| V — Simplicity        | Native database/query mechanisms, local URI parsing and current-state reads suffice. No request registry, quota counters/reset job, search index, polling or dismissed-report workflow.            |
| Prerequisites         | Native blockers #43 and #48 are closed. No product implementation, provider configuration, tasks or automatic merge/closure is authorized.                                                         |

## Project Structure

### Documentation (this feature)

```text
specs/010-live-contributions-moderation/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/README.md
└── quickstart.md
```

### Source code (planned, not initialized)

```text
apps/backend/   # contribution use cases, persistence and generated HTTP adapters
apps/mobile/    # shared contribution forms, personal queries and moderation views
contracts/http/mobile/contributions/
├── paths.yaml
├── parameters.yaml
└── schemas.yaml
```

Use existing feature boundaries inside the F13 applications. F08 adds no deployable or collector operation. Canonical source locations exist; application modules and tasks do not yet exist.

## Backend behavior and ownership

The [data model](data-model.md) defines versions, current match revision/hold and report facts. An approval publishes the pending version itself. Reactivation creates a new version linked to its historical source, preserving only a still-present owner; it inherits no report and uses no ordinary quota. Selected moderator publication/approval/reactivation supersedes other proposals and resolves the report hold. Rejection, cancellation and withdrawal do not resolve an unrelated hold.

Use Java URI for local syntax/host recognition as defined in [research](research.md#local-address-recognition). Do not fetch provider content or infer equivalence between short links, query variants or channel/video addresses. Only an identical current active/pending address for the same owner qualifies for an unchanged-submission response, after current revision and authorization checks and before quota rejection.

Acquire necessary sporting roots in [F02 order](../002-sporting-data/plan.md#acceptance-and-concurrency), then all concerned accounts in UUID order, then re-read current eligibility, grants and ownership. No provider call or sporting-root acquisition follows an account lock. The match lock serializes publication against definitive-result acceptance. The submitting account lock serializes quotas even for different matches. Counts derive from persisted quota-participating versions; no refunds after lifecycle changes. Read current Auth0 principal-age evidence from F05; missing evidence fails the dependent publication only, with its existing explicit retry.

F05 local erasure removes report attribution and reason, detaches version/decision ownership and preserves report facts and decisions. Re-read ownership after locking before copying a historical version. A deleted account cannot be resurrected through pending requests or re-registration. Addresses with personal content remain subject to F11's existing rights procedure, not an invented automated scrubber.

## Interfaces and compatibility

The [contract guide](contracts/README.md) identifies providers, consumers and canonical routes. Personal routes use the original account UUID. Administrative commands include the original actor UUID and require `stream-links.moderate`; the corresponding `moderateStreamLinks` projection permits all video-moderation actions, without unrelated powers or implicit maintenance bypass. All routes retain existing application admission and explicit bypass semantics.

Use the viewed match contribution revision in version mutations. Stale revision means 409 without effects, including a stale no-op. Reports target a version and deduplicate by account without transferring to a later version; the first reason remains authoritative. Completed creations return 201 and Location, recognized current repetitions return 200. No 202 or historical command receipt.

Lists return twenty items with optional `nextPage`, following the existing page convention. Keep filters for continuation and restart at page zero on refresh. Concurrent changes may move items; no snapshot traversal guarantee. Private match context can represent hidden or dateless matches, so it does not incorrectly reuse F03's publicly viewable dated-match wrapper. Reuse its identity, pool, schedule and result primitives where their meanings fit.

Moderation search uses parameterized ILIKE with literal wildcard escaping. A matching version must satisfy platform/state/address criteria together; team-name matching applies to its owning match. “To review” is pending versions, unresolved report-hidden wait or reported active links. Count through SQL aggregates over current data; no stored counter and no total inferred from a loaded page. Read related context, page and counts in a short read-only repeatable-read transaction when multiple queries are needed, keeping one internally coherent response without promising stability across requests.

F03 adds `streamContributionId` only alongside a contributed `streamUrl`. It exposes no author, report, quota or moderation detail. F05's account response gains the optional moderation capability through F12's existing projection. These are additive fields; request shapes and enums remain strict, response fields additive. F13 owns admitted-client compatibility and generated Java/Orval/Zod integration; no dialect or generator change is selected.

F07 consumes accepted transitions in-process under the same match transaction, with necessary inbox/announcement facts committed together. At sporting result acceptance it reads the current public link under that same lock. A rollback changes neither versions nor internal notification state. Push follows commit under existing best-effort rules, including maintenance. No report reset, reactivation or inbox purge replenishes an already consumed announcement allowance. No private moderation notification is added; the future F07 plan owns delivery and recipients.

## Mobile state and failures

Retain drafts in ordinary forms and confirmed data in the shared memory QueryClient. Keys distinguish account/session, match, filters and page; public sporting queries remain under F03. Rotate session identity and cancel/remove private queries under F05, rejecting old callbacks even when cancellation fails. Do not put generated DTOs into persistent storage.

Read moderation at entry, after actions and on explicit list refresh; disable periodic, reconnect and implicit retry behavior under F13. Reset affected version/queue traversal to the first page after a confirmed change and refresh the public match when its link changed. Preserve authorized data on an ordinary read failure; invalidating a query does not revoke already confirmed mutation success. Retain the independently accepted F03 foreground/navigation refreshes.

After an uncertain mutation, perform one bounded current read: owner context/member for submissions or withdrawal, own report state for reporting, administrative match context/member for moderation. If it fails, use ordinary error/retry without replay. A current read can show what exists now, not whether a particular historical request ran; delayed work can still complete later. A conflict requires fresh state before a new explicit command. No dedicated recovery screen, offline queue or persistent operation record.

## Design reconciliation and evidence

The owner approved [prototype 5413817](https://github.com/blockoutproject/product-prototype/commit/54138170f14775fe11132aaa61433329059cbfbb) and explicitly authorized its publication. The subsequent Figma report was separately approved in the same #52 conversation. Its scope is complete video-moderation actions, erased report reasons with retained counts, historical reports after new-version reactivation and ordinary current-state recovery.

Approved Product Design references:

- [Complete moderator actions, dark](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4736-32744).
- [Erased reason with retained count, dark](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4736-31730).
- [Historical-version reports, light](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4736-32107).
- Current-state recovery in [moderation](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5569-48570) and the [personal sheet](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5558-70675).

Existing published library instances and product patterns cover these changes; no new library primitive was necessary. Existing approvals remain authoritative elsewhere. The 206 prototype tests, TypeScript and build passed; browser inspection included narrow/dark report display and uncertain-response reactivation. Figma captures establish the inspected layouts only, not native accessibility or provider behavior.

## Verification and delivery

Use [quickstart.md](quickstart.md) for implementation qualification and the [README checks](../../README.md#verification) for this documentary delivery. Reconcile owning specs and interfaces together in a draft PR to develop. The PR is a planning review; no executable product implementation, tasks, merge, provider action or issue closure follows automatically.

## Complexity Tracking

No constitutional exception. The short database locks and constraints protect concrete concurrency/erasure invariants; no additional process or service is justified.
