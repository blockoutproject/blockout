# F13 validation quickstart

**Scope**: [plan](plan.md), [contracts](contracts/api.md), [tasks](tasks.md).
This guide defines validation; it is not a record of completed tests. Provider/native/runtime checks require later authorized implementation and suitable environments. Store results against the exact revision/artifact in the owning GitHub issue, with passed/failed/skipped/unavailable and reasons.

## Current documentary checkout

From the repository root, with the already approved formatter available:

```sh
npx --yes prettier@3.9.6 --check README.md AGENTS.md "docs/**/*.md" "specs/**/*.md" ".github/**/*.{md,yml}" .prettierrc.json
git diff --check
SPECIFY_FEATURE_DIRECTORY="$PWD/specs/003-shared-quality" .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

If downloads are prohibited, run the same pinned Prettier from an existing installation/cache; do not install application dependencies. Validate relative links/anchors against actual files, not future task destinations written as code paths. Check all task IDs, story labels, dependency references and active requirement coverage. Compare `.agents/skills` and tracked `.specify` to the initial revision; only ignored feature-selection state may be produced by official scripts.

Apply the official custom checklist for requirements quality, then the read-only `speckit-analyze` procedure. The checklist's unchecked state means reviewer evaluation is pending, not that application tests failed. Do not claim generated clients, deployments or native checks passed in this documentary checkout.

## Future initialization prerequisites

Only after global planning acceptance and implementation authorization:

- Verify the planning bypass is removed and normal branch protections restored.
- Install locked toolchains and dependencies through the committed manifests; no version guesses from this guide.
- Provide Docker and local test infrastructure; use non-personal fixtures. Configure authorized test-provider accounts separately from production.
- Bundle the actual public/internal composition with `--component-renaming-conflicts-severity=error`. Current documentary inputs contain 49 public and 13 internal operations; partition F01’s mixed source and preserve every inherited/operation security requirement and scheme. Resolve semantic homonyms explicitly at their owner. A deliberately conflicting-component fixture must fail rather than receive a numeric suffix. Qualify the selected pinned Redocly version.
- Ensure generation runs before Java/Python/TypeScript consumer compilation/import.
- Use the command surface defined by [delivery](contracts/delivery.md); commands below exist only after its setup tasks.

```sh
npm ci
npm run infra:up
npm run contracts:verify
npm run verify
```

Expected: reproducible outputs outside Git, all four project checks, no network provider credentials needed for unit/ordinary integration tests. Native/provider qualification remains separate. `infra:down` must preserve volumes.

## Q01 — Contracts and accepted views (US1)

Use synthetic fixtures to qualify strict request objects, extra additive nested response fields, invalid/missing consumed fields, unknown enums, dates, 204 and non-JSON errors. Generate cleanly twice, compare, compile/import and execute every consumer. Expected: invalid payloads never reach successful mobile cache or business mappings.

When F02/F03/F04 exist, accept a controlled sporting correction and consult affected detail/calendar/search views. Simulate supplier unavailability and visibility restriction. Expected: retained authorized data with honest freshness; no sporting deletion inferred from supplier failure; no hidden resource disclosed by stale projection. Run owning domain suites plus `npm run verify`. No global propagation stopwatch.

## Q02 — External detection and incident lifecycle (US2)

In an authorized non-production environment, configure one public HTTPS probe per environment at 60 seconds. Cause endpoint failure for the five-minute condition; verify external detection with the VPS/Alloy unavailable. Inspect actual observation/evaluation/delivery times rather than promising exactly five minutes end-to-end. Verify readiness exposes only its exact public path and minimal 200/503 status; PostgreSQL failure yields 503 while detailed management/metrics remain private.

Repeat same-scope failures, pause processing, remove telemetry and recover another scope. Expected: one logical opening, no reminders, no false recovery; affected scope remains identifiable. Restore the failing scope and verify one recovery notification. Exercise webhook timeout/lost-response behavior and document possible transport duplicates. Verify separate Discord channels and current Free usage.

Exercise preproduction healthy stop/restart and open-incident stop/failed restart/successful restart with the documented two-label silence procedure. No production/AWS/shared-host alert is silenced; verify preproduction PostgreSQL freshness is silenced only during deliberate database stop, then require a new confirmed backup on restart. Inspect sanitized logs for deliberate secret/personal payload fixtures: prohibited values must never be exported.

## Q03 — Rights, sessions and uncertain actions (US3)

Use controlled users A/B, visitor, missing permission, different owner and revoked session. Invoke the actual operation directly, including an old UI/client. Expected: denied without forbidden effect; UI hiding is not the evidence.

Delay A's response, sign out/change to B, then release it. Expected: no private A content/rights enters B state, even if network abort fails. Lose a mutation response after acceptance. Expected: uncertain UI result, no automatic repetition, current-state/provider reconciliation before a safe retry. Pro freshness/revocation, deletion and linked identities are qualified under F05/F09/F11, not replaced with this generic fixture.

## Q04 — Partial integration and reconstruction (US4)

Using F01/F02/F04 implementations, interrupt a multi-unit integration and a replacement search-index build. Expected: accepted units retained, failed units visible, old usable projection remains until complete replacement; without a usable projection the UI reports unavailable, not empty. Replay an older observation and change visibility before retry. Expected: no stale overwrite/re-exposure or regenerated business notification. Record useful pending/failed counts and manual next step, without requiring exact crash-step resumption.

## Q05 — Protection, restore and rollback (US5)

Use test data and explicitly authorized provider operations:

1. Run a native Dokploy backup; establish completed dump and S3 upload evidence. Exercise dump/upload failure and inspect native notifications/history. Stop scheduling silently and document that no absence alarm is promised. Last usable copies and normal expiry remain inspectable.
2. Verify age-based 30-day expiry independently of Dokploy copy counts. Failure never prematurely removes an older copy; the last copy still expires normally at 30 days.
3. Qualify hourly periodic AWS Backup, 30-day retention, native job problem notifications/history and isolated byte restoration. Verify regional costs, source version lifecycle and applicable erasure obligations. No continuous-protection dependency monitor, last-success alarm or custom supervisor. Silent schedule stoppage may not alert.
4. Restore into an isolated environment while denying access to original data/file storage. Validate records, file bytes and associations; rebuild disposable projections from authoritative data. Record actual missing data and elapsed time.
5. Use a copy predating account erasure, rights revocation and F07 notification purge. Apply current obligations and preserve consumed notification/quota facts before access or sends. If evidence is missing, expected result is continued closure.
6. Fail a migration and verify no rollout. Attempt a compatible application rollback, then demonstrate rejection of an incompatible one. No automatic SQL reverse migration.

No production reset or real-user data export is authorized by this guide. GitHub attachments need F10's provider-specific retention/erasure/recovery evidence; an S3 image drill does not certify them.

## Q06 — Logo continuity handoff (US7, P1)

Use synthetic identified, ambiguous, unmapped and missing-file club cases. Expected: certain source-identity matching only; actual protected bytes for preservation; unresolved associations retained; missing files explicit and blocking destructive reset. No invented public club/name-only matching. F14 separately qualifies the actual authorized inventory before transition.

## Q07 — Mobile/native/accessibility (US6, P2)

Automated fixtures cover 10-second reads, one retry after one second, 30-second mutations, 60-second uploads, abort cleanup, cancellation/session change during retry and no retry for refusal/invalid contract. Navigation/back remain available. Distinguish loading, empty, retained, offline, denied, error, pending and uncertain states; preserve dirty forms.

On both qualified phones/builds, inspect VoiceOver/TalkBack, text scaling, reduced motion, 44-point targets, focus order, French errors and source/date semantics against exact approved Figma nodes. Record device/OS/build and state-specific captures in approved evidence destinations. No Jest snapshot substitutes for visual/native evidence.

Qualify affected Auth0, purchase/restore, push and consent paths with real native SDKs/test accounts. Preview uses distinct identity/preproduction API; production candidate uses production identity/config and TestFlight/Play internal delivery. Verify manual store release and F12 per-platform minimum-version behavior; no OTA.

## Blocking and evidence rules

Missing generator compatibility, backup completion signal, positive recovery proof, real file restoration or native/provider evidence blocks the corresponding capability. Fix within the selected standard tools; if infeasible, return for a scoped decision instead of installing a new framework or pretending qualification.

Runtime checks are unavailable in #18 because no applications/environments are initialized. Documentation-only checks cannot establish free-account eligibility, store availability, signing, provider permissions, current production state, restorability or a migration outcome.

## Affected visual acceptance

The [targeted KISS design review](../../docs/design.md#review-references) was approved on 2026-10-06 for its exact recorded scope and revisions. Prototype/Figma approval does not qualify native or provider behavior. The actual iOS/Android/runtime checks in this guide remain **NOT EXECUTED**; a future material UI change requires renewed targeted approval. F01’s later source/season supplement has its separate [2026-10-09 acceptance](../001-source-acquisition/visual-supplement.md).
