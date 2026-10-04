# F03 validation guide

This guide separates documentary checks from future implementation proof. No initialized application runtime exists in this foundation; all database, generated-consumer, provider-adapter and native checks below are future work. Do not invent package scripts, Nx targets or claim a mock proves a provider/native boundary.

## Documentary checks and prerequisites

Read the [specification](spec.md), [plan](plan.md), [read contract](contracts/read-semantics.md), [mobile/design](contracts/mobile-and-design.md), [consumers](contracts/consumers.md) and [repository guidance](../../AGENTS.md). Run official Spec Kit procedures, validate all local OpenAPI references and their structures, inspect local Markdown links/anchors, and use:

```sh
npx --yes prettier@3.9.6 --check README.md AGENTS.md "docs/**/*.md" "specs/**/*.md" ".github/**/*.{md,yml}" .prettierrc.json
npx --yes prettier@3.9.6 --check "specs/007-sporting-consultation/contracts/*.yaml" specs/001-source-acquisition/contracts/acquisition.openapi.yaml specs/002-sporting-data/contracts/internal.openapi.yaml
git diff --check
```

Custom checklist boxes are reviewer-owned requirement-quality criteria, not executed runtime tests. Record actual analysis/validation outcomes in the issue/chat, not a duplicate repository status ledger. Preserve imported skills and Spec Kit assets.

## Future runtime preparation

After global technical acceptance and authorized F13/F02/F01 implementation, use actual committed manifests and targets. Generate contracts, start disposable PostgreSQL through the owning setup and apply the authorized Liquibase changes. Use controlled provider responses without personal data for automated failure cases, not live production edits. F06/F08/F10 integration requires their real owners; mocks prove only isolated contracts.

Prepare exact synthetic resource IDs: current/upcoming/closed seasons, multipool seasonal team, visible and hidden parents, inactive division, dated/undated/date-only matches, known/provisional/definitive results, missing detail, qualified and invalidated municipal points. Include guest and separate account sessions, all entitlement states and an authorized maintenance-bypass account. Qualify actual native binaries with recorded device/OS/build identity and the accepted Figma nodes.

## V01 — Resource and season navigation

Open club/team/pool/match pages as guest and with each entitlement state. Assert no consultation paywall or wait for entitlement verification. Check exact IDs across links, multiple team participations and per-pool standings tabs, one team follow, source/missing logo fallback and independent missing fields. Corrections/intentional absence/privacy suppression never reveal old source contacts or points.

Order available club seasons using qualified startYear, including published future and closed history. Preserve an available selection; a failed season read cannot switch it and an empty calendar alone cannot remove it. A successful new common-detail read establishing disappearance selects the newest remaining season or none. Postponement keeps the same sporting season. Hide resource/parent/division and prove safe unavailability through old links without namesake replacement.

## V02 — Time and source precision

Compare September 20 2026 00:30 Paris with September 19 18:30 New York for an established instant. Cover both DST transitions with date-specific offsets. Date-only remains its sporting date; FFVB 00:00 remains unknown unless explicitly qualified. Undated match is hidden across list/detail/deep links.

Load several pages in Paris, change device timezone and resume: no calendar request, reset, row movement or local category change. Times may be newly formatted while groups retain their loading zone. Next-page request keeps that original zone. Manual refresh requests the current zone and replaces grouping only on success. Match detail uses current zone and its own reread lifecycle. No special timezone screen or background timer is expected.

## V03 — Classification and whole days

Using a controlled server clock, read immediately before, at and after H+6 elapsed hours, including DST. Date-only crosses next-day Paris midnight. Definitive result overrides the time threshold; provisional does not. Completed without a result has the unavailable indication, not a fabricated zero/winner/live/cancelled state. Source result/date correction or withdrawal is reflected by a fresh read; the retained list stays stable until refresh unless a known restriction requires removal.

Use real PostgreSQL with more than seven eligible dates, empty date gaps, large complete days, multiple pools, equal instants and unknown times. Assert complete days, deterministic ordering and correct eighth-day continuation. Change data between the two statements and prove one-response consistency. Change data between requests and exercise deduplication plus a moved match rediscovered after refresh; do not assert a historical snapshot. An all-deduplicated returned page still advances its cursor rather than producing a false end.

Refresh after several pages: exactly one new first-page request for the active calendar, no sibling/header reread and no old-chain sequential refetch. Fail it: preserve the authorized list and error. Succeed: replace chain and reset to top. Delay an old append and ensure it cannot contaminate the replacement. Retry an additional-page failure without clearing prior days. Returning from a match, focus, foreground, reconnect and ordinary invalidation produce no automatic calendar fetch. New resource/season/category requests reject late prior-context responses.

## V04 — Standings and map

Respect official row order/rank/statistics, including missing and special-ratio values. An unmatched row has source text but no fictional team link. A missing ranking remains distinct from not-published and retained ranking after failure. Source observation and integration times are not overwritten by read/cache time.

A pool with no published ranking still has its visible participants and reliable municipal points. Exercise no participants, participants with zero points, partial coverage, invalidated point and shared exact point. Every same-point team remains accessible through the approved panel. No fabricated gym/GPS/displaced coordinate. Actual iOS/Android verifies native provider configuration, attribution, controls, tile failure where observable and accessible selection without relying solely on the basemap.

## V05 — Documents and media

Use qualified controlled responses matching the [observed mechanisms](research.md#d06--source-references-and-direct-pdf). Check information-sheet before and after result, fixed POST destination/fields, direct scoresheet only with definitive result, and current read before a scoresheet action. A known retained reference does not promise successful opening. Withdraw result: remove scoresheet eligibility while retaining its internal reference.

Try valid PDF, HTTP200 HTML, wrong media type, malformed PDF with signature, oversized body, explicit expiry, unknown failure, redirect to an unqualified destination, deadline and cancellation. Relay does not hold SQL during supplier I/O, rechecks visibility/descriptor before release, performs no own automatic retry and stores no PDF. Blockout credentials/bypass never reach the supplier. Typed maintenance suppresses generic retry. Validate error and binary paths through actual generated consumers.

On iOS Quick Look and Android ACTION_VIEW, check file URI permissions/lifetime, reader absence, cancelled download, corrupt rendering, return, focus and cleanup after normal dismissal and cold restart following termination. Launch/completion is not proof of reading. Do not remove a file while its viewer still needs it. Professional and contributed links remain distinct; neither time nor result creates a live/replay promise. No automatic LNV TV search.

## V06 — Failure, ownership and native evidence

Exercise initial loading/error, genuine empty, partial independent section success, failed refresh with retained data and definitive hidden target. Known privacy/access restrictions remove old cards/fields across controlled caches, even when that changes a stable list. Switch accounts while private owner requests or PDF downloads are pending and reject old-session effects. F12 maintenance/bypass and startup-only version/configuration decisions remain intact.

Use actual F06 follow/count, F08 contribution/report, F10 assistance and F02 editing owners before integrated acceptance; capability booleans do not replace resource/action rules. Verify unknown signed-in entitlements suppress advertisements while all sporting sections remain accessible. Test themes, small screens, large text, reduced motion, screen-reader navigation and focus against exact [design references](contracts/mobile-and-design.md#design-authority). Document passed/failed/skipped/unavailable evidence with its boundary and reason.

## Coverage

| Validation                  | Requirements       | Scenarios    | Success criteria | Implementation tasks |
| --------------------------- | ------------------ | ------------ | ---------------- | -------------------- |
| V01 — Resources and seasons | FR-001–008, FR-035 | A01–A06      | SC-001           | T004–T011, T035–T037 |
| V02 — Time precision        | FR-009–011         | A07–A10      | SC-002           | T012–T015            |
| V03 — Calendars             | FR-012–019         | A11–A17, A29 | SC-003, SC-004   | T016–T022            |
| V04 — Standings/maps        | FR-020–024         | A18–A22      | SC-005           | T023–T027            |
| V05 — Media/documents       | FR-025–028         | A23–A26      | SC-006           | T028–T033            |
| V06 — Failures/integration  | FR-029–036         | A27–A34      | SC-007, SC-008   | T001–T003, T034–T040 |

Union: 36 FRs, 34 scenarios, eight SCs. Tasks may cover multiple rows. Amendments change lifecycle expectations rather than deleting acceptance coverage. The matrix is planned evidence, not a record of tests already run.

## Completion limits

A missing actual owner integration, generated-consumer check, required native proof or unresolved material design mismatch prevents claiming full runtime acceptance. The documentary dossier can be reviewed without pretending those future checks were executed. Production source identities, native settings and migration remain F14 qualification; no provider/deployment mutation is authorized here.
