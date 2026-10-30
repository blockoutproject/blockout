# Implementation Plan: Live contributions and moderation

**Branch**: `tech/52-live-contributions-moderation` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md), [F02 sporting data](../002-sporting-data/plan.md) and [F09 entitlements](../006-pro-subscriptions/plan.md).

## Summary

Add account-owned stream contributions, exact-version reports and a complete video-moderation grant to the existing backend/mobile boundary. PostgreSQL versions, ordinary transactions, row locks and conditional unique constraints protect ownership, quotas and decisions. Validate addresses locally; recover current state after uncertain responses without a request journal. Use ordinary private database search and manual refresh rather than a search service or moderation workflow engine.

## Technical Context

**Language/Version**: Java 25 / Spring Boot 4.1.1 and TypeScript / Expo 58 / React Native 0.88 / React 19.3.0, under [F13](../003-shared-quality/plan.md).

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
| III — Design          | The owner explicitly approved prototype 5413817 and then the scoped Figma report in the planning conversation. Exact references and evidence limits appear below.                                  |
| IV — Contracts        | Extend the canonical mobile OpenAPI root. Generated interfaces/DTOs/clients follow F13; generation and integrated consumer compilation remain future qualification, not a claimed result.          |
| V — Simplicity        | Native database/query mechanisms, local URI parsing and current-state reads suffice. No request registry, quota counters/reset job, search index, polling or dismissed-report workflow.            |
| Prerequisites         | The accepted [F02](../002-sporting-data/plan.md) and [F09](../006-pro-subscriptions/plan.md) plans supply sporting and entitlement boundaries; provider and native qualification remain separate.  |

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

### Planned source code

```text
apps/backend/   # contribution use cases, persistence and generated HTTP adapters
apps/mobile/    # shared contribution forms, personal queries and moderation views
contracts/http/mobile/contributions/
├── paths.yaml
├── parameters.yaml
└── schemas.yaml
```

Use existing feature boundaries inside the F13 applications. F08 adds no deployable or collector operation. Canonical source locations exist; application modules do not yet exist.

## Backend behavior and ownership

The [data model](data-model.md) defines versions, current match revision/hold and report facts. An approval publishes the pending version itself. Reactivation creates a new version linked to its historical source, preserving only a still-present owner; it inherits no report and uses no ordinary quota. Selected moderator publication/approval/reactivation supersedes other proposals and resolves the report hold. Rejection, cancellation and withdrawal do not resolve an unrelated hold.

Use Java URI for local syntax/host recognition as defined in [research](research.md#local-address-recognition). Do not fetch provider content or infer equivalence between short links, query variants or channel/video addresses. Only an identical current active/pending address for the same owner qualifies for an unchanged-submission response, after current revision and authorization checks and before quota rejection.

Acquire necessary sporting roots in [F02 order](../002-sporting-data/plan.md#acceptance-and-concurrency), then all concerned accounts in UUID order, then re-read current eligibility, grants and ownership. No provider call or sporting-root acquisition follows an account lock. The match lock serializes publication against definitive-result acceptance. The submitting account lock serializes quotas even for different matches. Counts derive from persisted quota-participating versions; no refunds after lifecycle changes. Read current Auth0 principal-age evidence from F05; missing evidence fails the dependent publication only, with its existing explicit retry.

F05 local erasure removes report attribution and reason, detaches version/decision ownership and preserves report facts and decisions. Re-read ownership after locking before copying a historical version. A deleted account cannot be resurrected through pending requests or re-registration. Addresses with personal content remain subject to F11's existing rights procedure, not an invented automated scrubber.

## Interfaces and compatibility

The [contract guide](contracts/README.md) identifies providers, consumers and canonical routes. Personal routes use the original account UUID. Administrative commands include the original actor UUID and require `stream-links.moderate`; the corresponding `moderateStreamLinks` projection permits all video-moderation actions, without unrelated powers or implicit maintenance bypass. All routes retain existing application admission and explicit bypass semantics.

Use the viewed match contribution revision in version mutations. Stale revision means 409 without effects, including a stale no-op. Reports target a version and deduplicate by account without transferring to a later version; the first reason remains authoritative. Completed creations return 201 and Location, recognized current repetitions return 200. No 202 or historical command receipt.

Lists return twenty items with optional `nextPage`, following the existing page convention. Keep filters for continuation and restart at page zero on refresh. Concurrent changes may move items; no snapshot traversal guarantee. Private match context can represent hidden or dateless matches, so it does not incorrectly reuse F03's publicly viewable dated-match wrapper. Reuse its identity, pool, schedule and result primitives where their meanings fit.

Moderation search uses parameterized ILIKE with literal wildcard escaping. A matching version must satisfy platform/state/address criteria together; team-name matching applies to its owning match. “To review” is pending versions, unresolved report-hidden wait or reported active links. Match badges distinguish current attention from history: count reports on the active or unresolved hidden version, and expose rejected versions as a historical total. Retain old reports in per-version history. Count through SQL aggregates over current data; no stored counter and no total inferred from a loaded page. Read related context, page and counts in a short read-only repeatable-read transaction when multiple queries are needed, keeping one internally coherent response without promising stability across requests.

F03 adds `streamContributionId` only alongside a contributed `streamUrl`. It exposes no author, report, quota or moderation detail. F05's account response gains the optional moderation capability through F12's existing projection. These are additive fields; request shapes and enums remain strict, response fields additive. F13 owns admitted-client compatibility and generated Java/Orval/Zod integration; no dialect or generator change is selected.

F07 consumes accepted transitions in-process under the same match transaction, with necessary inbox/announcement facts committed together. At sporting result acceptance it reads the current public link under that same lock. A rollback changes neither versions nor internal notification state. Push follows commit under existing best-effort rules, including maintenance. No report reset, reactivation or inbox purge replenishes an already consumed announcement allowance. No private moderation notification is added; the [F07 plan](../011-notifications-delivery/plan.md#announcement-processing) owns delivery and recipients, with current link presentation derived on reads rather than synchronized text copies.

## Mobile state and failures

The ordinary native contribution route contains the compact match context and a concise address form. With no public link, the match’s Media Access card offers the full-width “Proposer un lien” action directly to that form. A public link from another owner keeps F03’s external opening; exact-version reporting retains its separate US4 implementation. For the caller’s exact public version, the card instead offers “Modifier le lien”, with neither external opening nor self-reporting. While the private ownership read is unresolved for a signed-in viewer of a contributed link, use the existing loading/error/retry feedback rather than briefly offering external opening for a potentially owned version. Guest and professional-link consultation keep their existing behavior. Existing personal versions without an owned public link remain reachable through a compact contextual management action. There is no ellipsis, intermediate menu or first-proposal detour through an empty management screen. Eligibility, original-account scope, F05/F12 admission and the existing match refresh remain authoritative; this is a cleanup of the admitted-account journey, not a new authentication flow or an authorization bypass.

Personal management combines one editor for the current owned active link with an exhaustive virtualized read-only history. The server supplies optional `activeContribution` independently of the twenty-item page, and an exact all-state `proposalCount`, in the existing short repeatable-read snapshot. A page does not prove ownership. The editor prefills the current address in its retained RHF control; a newly accepted active version updates a pristine field through RHF reset, while refetch never overwrites a dirty draft. A compact “Retirer” action sits alongside the editor heading, with one main replacement submission action. The history retains textual semantic badges, addresses, thin shared separators and an always-visible “Mes propositions (number)” heading including zero. It exposes no commands, trash icon, timeline dates or repeated explanatory paragraphs; useful French state explanations remain accessible.

Initial submission, replacement and exact active withdrawal use the existing single-settlement native confirmation owner. Capture the viewed address/revision, recheck the original session before dispatch and return to the exact match only after acknowledgement through Router’s supported `dismissTo`. Cancelling the dialog preserves the draft and sends nothing. Ordinary action/refresh failures use F13’s shared toast. A failed refresh preserves the normal form heading, draft and authorized history without an extra read-retry button or persistent technical paragraph; the page’s existing pull-to-refresh restores the current context before writes become available again. Initial unavailable reads retain the shared blocking error/retry. Conflict and uncertain-command instructions remain inline under their existing bounded recovery owner; do not reproduce the Figma catalogue as additional native routes. The future US4 report form retains its reason and “Envoyer le signalement” / “Annuler” actions. It is not F10 general support.

The editor and history share one FlatList. iOS keeps native automatic keyboard insets; Android uses the installed Keyboard Controller’s [documented list scroll-component integration](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-aware-scroll-view#flatlistflashlistsectionlist-etc) with one KeyboardProvider and a stable KeyboardAwareScrollView renderer. Do not nest an unbounded list in a form scroller or introduce a generic form-screen shell. F13 continues to own scrolling, safe areas and keyboard conventions.

Retain drafts in ordinary forms and confirmed data in the shared memory QueryClient. The contribution form retains its RHF control for the original account/session and match through temporary F12 protected-route removal; clean departure, explicit abandonment, departure after acknowledgement or session change releases it. A detached acknowledgement resets the same retained control without releasing a form that has reopened. Query remains the sole command/recovery owner. Keys distinguish account/session, match, filters and page; public sporting queries remain under F03. Rotate session identity and cancel/remove private queries under F05, rejecting old callbacks even when cancellation fails. Do not put generated DTOs into persistent storage.

Read moderation at entry, after actions and on explicit list refresh; disable periodic, reconnect and implicit retry behavior under F13. Reset affected version/queue traversal to the first page after a confirmed change and refresh the public match when its link changed. Preserve authorized data on an ordinary read failure; invalidating a query does not revoke already confirmed mutation success. Retain the independently accepted F03 foreground/navigation refreshes.

After an uncertain mutation, perform one bounded current read: owner context/member for submissions or withdrawal, own report state for reporting, administrative match context/member for moderation. If it fails, use ordinary error/retry without replay. A current read can show what exists now, not whether a particular historical request ran; delayed work can still complete later. A conflict requires fresh state before a new explicit command. No dedicated recovery screen, offline queue or persistent operation record.

## Design reconciliation and evidence

On 2026-10-30, the owner replaced the earlier ellipsis and row-cancellation directions with the three card states and read-only history above. Their supplied skins and the existing [Media Access](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=576-8861), [new proposal](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5512-148457), [owned active link](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5529-55226) and [owned editor with history](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5529-55518) establish the reference behavior. The owner explicitly requested native implementation and final captures first, then authorized Figma and prototype synchronization after reviewing the [native result at aa4d229e](https://github.com/blockoutproject/blockout/pull/575#issuecomment-6511946128). This is the scoped native-first direction for this cleanup; other design prerequisites remain applicable. US4 reporting remains its separate implementation lot, as explicitly confirmed by the owner.

The synchronized [broadcast-link journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5511-51086) retains fourteen representative editable screens and fifteen used private composition masters. Twenty-four obsolete screens and nineteen unused masters were removed after checking references outside the journey. It includes the three match-card entries, proposal and prefilled editor, submission/replacement/withdrawal confirmations, read-only pending/published and zero history, the existing report form with “Annuler”, and draft abandonment. Published library instances remain live, product text uses Outfit, and ordinary form actions use the neutral context while the match ribbon retains its competition context. F05/F12 admission and bounded recovery remain shared behavior rather than a catalogue of screens. The matching [prototype revision db183a56](https://github.com/blockoutproject/product-prototype/commit/db183a56f9b70d828d87623254a2eb8d3ab2b317) is delivered in [the prototype synchronization PR](https://github.com/blockoutproject/product-prototype/pull/15); its 223 model tests, 29 browser cases, TypeScript and build pass. These design/prototype checks do not extend the native qualification below or implement US4 in the native application.

During native review on 2026-10-28, the owner approved omitting an unavailable contribution entry and simplifying the ordinary form. Repeated introductory copy, the availability disclaimer, eligibility dates and quota counters are removed. This scoped direction supersedes those parts of the earlier form copy; the ordinary stack, context and abandonment references remain applicable. Native observations qualify execution separately.

The 2026-10-22 presentation revision replaces form/history sheets with ordinary screens and simple confirmations with native dialogs. The inspected Product Design revision includes [contribution](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5512-148457), [dark/narrow contribution](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5517-54389) and [abandonment semantics](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5554-69452). The final prototype revision, captures and library-instance synchronization status are tracked in [F13 presentation evidence](../003-shared-quality/quickstart.md#native-mobile-and-approved-design). The following earlier references retain their domain content and stable node identities; older captures do not establish the revised container or native behavior.

The owner approved [prototype 5413817](https://github.com/blockoutproject/product-prototype/commit/54138170f14775fe11132aaa61433329059cbfbb) and explicitly authorized its publication. The subsequent Figma report was separately approved in the same planning conversation. Its scope is complete video-moderation actions, erased report reasons with retained counts, historical reports after new-version reactivation and ordinary current-state recovery.

Approved Product Design references:

- [Complete moderator actions, dark](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4736-32744).
- [Erased reason with retained count, dark](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4736-31730).
- [Historical-version reports, light](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4736-32107).
- Current-state recovery in [moderation](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5569-48570). Personal-contribution recovery remains inline under the current mobile state and failure rules above; its former dedicated screen was removed by the scoped cleanup.

Existing library instances and product patterns cover the previously approved content; the presentation revision adds no business requirement or library primitive. Published-instance synchronization for the changed presentation is verified by [F13’s scoped receipt evidence](../003-shared-quality/quickstart.md#native-mobile-and-approved-design). Existing approvals remain authoritative elsewhere. The 206 prototype tests, TypeScript and build passed; browser inspection included narrow/dark report display and uncertain-response reactivation. Figma captures establish the inspected layouts only, not native accessibility or provider behavior.

## Verification and delivery

Use [quickstart.md](quickstart.md) for implementation qualification and the [README checks](../../README.md#verification) for affected boundaries. Owning specifications and interfaces remain consistent throughout implementation; [tasks](tasks.md) track the work.

## Complexity Tracking

No constitutional exception. The short database locks and constraints protect concrete concurrency/erasure invariants; no additional process or service is justified.
