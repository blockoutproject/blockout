# Quickstart: qualify following and the personal feed

Use the [README verification commands](../../README.md#verification) with the feature's [plan](plan.md), [data model](data-model.md) and [contracts](contracts/README.md). Apply [F13 proportionate qualification](../003-shared-quality/plan.md#proportionate-qualification): deterministic tests own asynchronous races, cancellation, account isolation and exhaustive date/data boundaries; actual native builds own representative integration and geometry. Reuse evidence only while its source, mechanism, native dependencies, runtime and configuration remain applicable. Native accessibility verification follows [F13 FR-030](../003-shared-quality/spec.md#platforms-accessibility-and-bounded-continuity).

## Prerequisites

Use F13's selected backend/mobile environment and the authored [contracts](contracts/README.md). Prepare two disposable accounts, two viewable sporting seasons, teams/pools with overlapping matches and at least 21 follows in one list. Include a hidden target, homonymous names and matches in both F03 categories. Use controlled API failure/delay doubles, not provider changes or private production data.

## Contracts and access

Validate/bundle the mobile root with F13's Redocly configuration, then generate and compile the Java interface/DTOs and Orval client/Zod boundary in the implemented workspace. Verify F06 boolean state, optional season/default/continuations, reused summaries/calendar and shared errors. Reuse F13 generated compilation/reproducibility at the same canonical source/configuration revision; repeat reproducibility when the generator or its configuration changes. Validate business JSON once before caching; reject unknown request properties and tolerate additive response properties.

Verify unauthenticated requests, another account, erased original account, hidden target and maintenance admission. Refusals have no mutation effects. Public count and sporting viewing work without a private account read; no identities are disclosed through counts or diagnostic output.

## Durable relationship boundary

Exercise repeated desired-state true/false, remove/re-follow, independent typed targets, current F02 hiding/restoration, identity corrections, rollback and competing original-account writes on migrated PostgreSQL. Repeated true retains the relation UUID; false removes it; re-follow creates a new UUID. Check uniqueness and foreign keys with the restricted application role. Original-account erasure serializes with writes and leaves no orphan relation.

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=FollowStateWebMvcTest,ReadFollowEligibilityTest,FollowingContractWebMvcTest,FollowAccessWebMvcTest -Dit.test=FollowRelationsIntegrationTest
```

## Relationships and calendar

With Testcontainers PostgreSQL and the real schema, qualify repeated true/false, unique constraints, concurrent devices and account erasure racing a write. Last server-recorded state wins; erasure cannot leave or recreate an orphan relation. Hiding/restoring changes visibility without changing relation identity or the count's underlying truth. Re-follow uses a new relation identity.

Follow both teams and their pool, then trigger result/link notifications through the actual F07 owners: one eligible person receives one inbox entry. Personal display-season selection is not a delivery preference. Hold after-commit work and replace follow origins: an original retained pool still permits handoff, while replacing every origin prevents the old send without removing its inbox entry or replenishing its allowance. Current account removal, sporting hiding and a correction no longer selected by the retained relation prevent handoff. Keep notification permission, provider delivery and physical receipt under [F07](../011-notifications-delivery/plan.md#expo-handoff-and-association-lifecycle).

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=ReadFollowEligibilityTest,PushDeliveryTest -Dit.test=FollowRecipientDeliveryIntegrationTest,RecipientSnapshotIntegrationTest,AnnouncementAudienceIntegrationTest,PushDeliveryIntegrationTest
```

Follow both teams and their pool: each match appears once. Remove origins in turn: a match remains until its last selecting follow is removed. Verify historical seasons, All seasons, default selection and no automatic interseason transfer. Exercise F03's dates, result categories, complete-day boundaries and pagination using current visibility.

Read beyond one twenty-item follow page, including equal names and French accented names. Verify page/continuation bounds and clean BadRequest handling before native offset conversion, without overflow or a false end. Verify stable ordering, no false end on a page error and a fresh traversal after concurrent changes. Check the selected PostgreSQL image supplies the intended French collation and Hibernate executes the ordering expression.

Opening the season selector is the explicit recovery from a selected-season error. Verify its reachability, retention of the selection when options fail, and successful omission withdrawing exact-season and All-seasons rows before fallback, including when an earlier options Query was evicted. Failed reads establish no absence. Native private-client lifetime and per-control pending behavior follow the existing [session owner](../005-accounts-identity/plan.md#mobile-session-and-shared-consumers); the database retains uniqueness and desired-state idempotence.

## Mobile journeys

### Native follow action boundary

Deterministic consumer tests use independent same-target and different-target controls. Only the initiating mounted control is busy; retain its confirmed label/selection while blocking its own repeated tap. A confirmed response updates admitted member data, an ordinary failure retains confirmation, and a known current refusal stays withdrawn until a successful member read. Cover response loss, the bounded member observation and obsolete route/subject completions through the actual Query/F05 owners, without replay or a claim of delayed cancellation. Native integration checks one ordinary follow settlement and route return; the representative account transition is described below.

The compact inverse action uses the public target's displayed season and accessible hint without
writing a personal season selection or adding a success panel. Compare the live
[team](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1010-15711),
[followed team](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1023-5097)
and [dark pool](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1755-14354)
instances with the UI Library's [compact button](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=3386-697):
36-point pill, 20-point leading Plus/Check, inverse surface/content and a separate platform
touch target. The follow button has no stroke; the counter number uses
the same semantic foreground as its group icon in both themes. The F03 action region supplies its separator and 12-point inset.
Follow alone uses a native spinner in the existing leading slot instead of the generic compact
button's static loading capsule. For both follow and unfollow, verify the current label and selected
state remain unchanged while pending and the control rejects another activation. A confirmed response
changes that state; an ordinary error preserves it with the shared action feedback. Other buttons
retain their existing loading presentation. Compare this scoped native adaptation on representative iOS/Android compositions under the shared qualification rule;
the generic Figma loading variant does not represent the follow-specific spinner.
The generated boundary remains unchanged; the independent public counter is qualified below.

```sh
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/follow-action.test.tsx
```

### Direct counters and bounded recovery

Use database/generated-consumer tests to add/remove/re-follow and verify direct public counts independently of profile reads. Include multiple owners, distinct typed identities/seasons, hidden relations and restored visibility. Unknown/invalid/failed reads never become zero. Public count presentation and recovery use the count-specific scope in [F13 FR-038](../003-shared-quality/spec.md#functional-requirements); current refusal removes the count before a later network failure. A public count NotFound withdraws that F03 target and suspends its follow action; a private opaque member NotFound does not prove public absence.

In deterministic consumer tests, confirm a write, then fail dependent reads: confirmation survives. Lose a write response, delay original completion and fail the bounded observation: ordinary action feedback and explicit retry use current confirmation, without replay or a cancellation claim. Ordinary and explicit-bypass counters retain distinct keys; confirmation invalidates only the affected target.

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=FollowerCountWebMvcTest,ReadFollowerCountTest,FollowStateWebMvcTest,FollowOptionsWebMvcTest,FollowListsWebMvcTest,PersonalCalendarWebMvcTest -Dit.test=FollowerCountIntegrationTest
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/follower-count.test.tsx src/features/following/__tests__/follow-recovery.test.tsx src/features/following/__tests__/follow-action.test.tsx
```

#### Native recovery and accessibility

Use the approved [Home and Sport references](plan.md#constitution-check), the
[followed team](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1023-5097)
and [dark pool](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1755-14354).
The group icon and numeric count sit beside the existing compact follow action. F13 owns Outfit,
semantic tokens, system themes, native controls, freshness and accessibility. Use fictional accounts
and task-owned fixtures; keep private diagnostics and relationships outside public artifacts.
Select representative Home/follow/count compositions across iOS/Android, both themes, enlarged
content and reduced motion under F13. Do not repeat every failure or account/entitlement state
for every appearance, text size and platform.

| Scenario | Deterministic owner/consumer proof                                                                                                                                                                                                                                  | Representative native integration and remaining owners                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A22      | Direct counts remain independent of profile/Pro, personal season and hidden/restored relation visibility; unknown differs from zero.                                                                                                                                | Open a public count and an authenticated follow control. Reuse F05/F09 evidence for account/entitlement variants.                                                                                                                                                             |
| A23      | Definite write refusal retains confirmation; current public target refusal withdraws count/list presentation and suspends follow until a successful read.                                                                                                           | Observe one current restriction and explicit retry, including a failed reread that leaves refused content absent.                                                                                                                                                             |
| A24      | Response loss, delayed writes/member reads, unmount and A → guest/B → A cannot replay mutations or admit obsolete callbacks; ordinary current confirmation remains authoritative.                                                                                   | Perform one ordinary real account switch using the actual F05 lifetime. Precise races remain deterministic tests.                                                                                                                                                             |
| A25      | Confirmed writes survive independent profile/options/list/calendar/count read failures, including inactive tabs; selected season/category remain.                                                                                                                   | Confirm a follow change and return to Home; a changed-follow reload uses loading/error/retry and hidden tabs start at the first page when displayed.                                                                                                                          |
| A26      | Initial, refresh and continuation failures remain distinct; authorized unchanged-context data stays in Query while final failure uses the shared scoped card, known refusals cannot return after network failure, and retry establishes no false empty/end or zero. | Exercise bounded loading, populated return, failure and recovery through the existing controls.                                                                                                                                                                               |
| A27      | [Actual F07 consumption](#relationships-and-calendar) deduplicates overlapping origins and distinguishes a recreated relation; display season is not a delivery preference.                                                                                         | Native permission, global push ordering and provider/physical receipt stay with [F07](../011-notifications-delivery/quickstart.md).                                                                                                                                           |
| A28      | Consumer tests retain meaningful labels/roles/states, current grants and unchanged advertising/navigation intent.                                                                                                                                                   | Inspect reachable follow/count/retry and contextual support actions, ordinary focus/content order and representative enlarged content. F10 private handling and F11 actual advertising/consent remain with their owners; filtering/refresh/return introduces no interstitial. |
| A29      | Technical account/relationship 503 retains matching confirmation in its owner; shared required-read scope determines visible recovery. Retry is read-only; refusals and UUID replacement retain their guards.                                                       | Confirm → relationship 503 → scoped read-only Retry → restored action; check account-only 503 separately. Compare [recovery](plan.md#constitution-check); F03 owns [initial readiness](../007-sporting-consultation/quickstart.md#sporting-recovery-and-match-rereads).       |

### Shared personal season boundary

Use generated-consumer tests for the shared personal selection across Home, Teams, Pools and calendar: followed-versus-catalog default, historical/All seasons, reset, fresh-opening choices, successful disappearance, failed reconciliation and obsolete session/selection completions. A selected-season error does not read options automatically; opening the existing selector is the explicit recovery. Only successful options establish omission and withdraw retained exact-season/All-seasons data before fallback.

For representative native sheet compositions on iOS/Android, use a short season catalogue and
a long catalogue with enlarged system text. Verify content fitting and accessible radio rows
without a fixed half-screen empty region; for overflow, the native sheet must stop at available
height, scroll to All seasons and any reset action, and keep close/back usable without the floating
tab capsule covering a row. Select a season, close without selection and reopen: Home remains the
active tab, the same accepted selection survives, and opening performs only its explicit options
reread. Include an ordinary failed reread and current private refusal in the representative Home
checks; use one real account switch rather than timing every sheet completion against it.
Deterministic tests preserve obsolete completion isolation through the existing F05/F12 owners.
React tests cannot establish these native height,
scrolling, safe-area or accessibility outcomes.

Compare the [Home controls](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5075-4799)
with the UI Library's [compact tabs](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=841-983)
and [season selector](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=3176-2823).
The [approved Home composition](plan.md#mobile-state-and-failure-handling)
and its HTML select control are interaction references; their rendering is not native evidence.

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=FollowOptionsWebMvcTest,FollowStateWebMvcTest -Dit.test=FollowOptionsIntegrationTest
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/personal-season.test.tsx src/features/following/__tests__/personal-screen.test.tsx
```

### Personal team and pool lists

Database/generated-consumer tests traverse more than twenty follows, including French accented names, homonyms and UUID ties, and verify current public names, deterministic `fr-x-icu` ordering, closed seasons and hidden/reappearing relations. Native integration uses a bounded continuation and return/retry case. Open the exact F03/F11 target, return to retained pages and fail/retry the same continuation. Empty season offers Search; initial/page failure never becomes Empty/end. Confirm a follow change while another tab is hidden: reset former rows, then load its first page when shown. Reject obsolete account responses and withdraw only the addressed current refusal.

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=ReadFollowListsTest,FollowListsWebMvcTest,FollowOptionsWebMvcTest,FollowStateWebMvcTest,PersonalCalendarWebMvcTest -Dit.test=FollowListsIntegrationTest,FollowOptionsIntegrationTest,PersonalCalendarIntegrationTest -DforkCount=1
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/followed-lists.test.tsx src/features/following/__tests__/personal-screen.test.tsx
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx run-many -t verify -p backend mobile --parallel=1 --output-style=static
```

### Personal complete-day calendar

Database/generated-consumer tests follow overlapping team/pool origins and verify each match once. Reuse F03 automated date/time coverage for known/date-only/missing times, Paris/New York and DST boundaries, definitive/provisional results and postponement; F06 tests preserve its selected season/hasAvailableFollows envelope, seven complete nonempty days and a busy day with 26 matches. Continuation is exclusive; one response is coherent while between-page changes may require refresh. Remove origins in turn without altering the public match; only the last removal eliminates its personal selection.

Fail ordinary refresh and append separately. Apply [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements) at the affected Home tab: pending reads retain visible content with the appropriate native progress, final failure presents its Error card, and the existing Query retains pages/cursor for the owner’s safe read or failed continuation. Retry keeps the card and uses button progress only for its active explicit operation. A confirmed follow change resets former pages while preserving season/category; hidden views load on display. Successful no-follow evidence withdraws former rows across overlapping selections, but ordinary failure does not. A seasonal category captures the device zone on its first active read and never regroups retained same-season rows merely on foreground return. Exact match opening uses the single F11 transition owner and introduces no new advertising event. Keep a short native device-zone adapter check through the shared F03 calendar; reuse applicable F03 native evidence rather than replaying every date/time boundary on each platform.

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=PersonalCalendarWebMvcTest,FollowOptionsWebMvcTest,FollowStateWebMvcTest -Dit.test=PersonalCalendarIntegrationTest,ReadMatchCalendarIntegrationTest
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/personal-calendar.test.tsx src/features/following/__tests__/personal-screen.test.tsx src/features/sporting/__tests__/sporting-calendar.test.tsx
```

### Integrated personal season and calendar

Use real F02/F03/F06 SQL paths and generated consumers for Home, season selection, both lists and calendar. Exercise qualified complete-empty withdrawal and reappearance: preserve original match/follow UUIDs, keep independent catalog/division restrictions and hide the public match while retaining its relation. Fail a confirmed-change reload after several pages: former rows disappear into ordinary Error/Retry with season/category retained. An unchanged-context refresh failure retains authorized pages in Query and presents the affected scoped Error under [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements). Read current options only on deliberate selector opening; failed options preserve the selected season.

```sh
NX_LOAD_DOT_ENV_FILES=false ./mvnw -B -ntp -pl apps/backend verify -Dtest=FollowOptionsWebMvcTest,FollowListsWebMvcTest,PersonalCalendarWebMvcTest,FollowStateWebMvcTest -Dit.test=FollowOptionsIntegrationTest,FollowListsIntegrationTest,PersonalCalendarIntegrationTest,ReadMatchCalendarIntegrationTest -DforkCount=1
NX_LOAD_DOT_ENV_FILES=false npm run test --workspace=@blockout/mobile -- --runInBand --reporters=default --runTestsByPath src/features/following/__tests__/personal-season.test.tsx src/features/following/__tests__/personal-screen.test.tsx src/features/following/__tests__/personal-calendar.test.tsx src/features/following/__tests__/followed-lists.test.tsx src/features/following/__tests__/follow-action.test.tsx src/features/following/__tests__/follow-recovery.test.tsx
```

### Deterministic consumer journeys

Use Jest Expo/React Native Testing Library with the actual F05/Query boundaries for these cases; representative native integration follows separately:

- Follow and unfollow the same target in independent visits/controls: only the initiating mounted control becomes busy, retaining its current confirmed label and selection with a native spinner; another may send a desired-state request. Each control prevents its own pending repeat, with no tap queues or mutation replays. A confirmed response updates admitted member data; an ordinary error preserves the previous state, and known refusals remain withdrawn until a successful member read. Shared confirmed data refreshes after settlement. Preserve one shared team-follow action across its tabs.
- Leave and return to a populated personal tab without a follow change: preserve its data and traversal under the current Query observer/freshness policy. After reset while hidden, display it and fetch the first page.
- Make the selected season unavailable: its list/calendar NotFound remains an ordinary error until the holder opens the existing season selector. Its successful options read establishes omission, withdraws retained exact/All data and selects the new default or All seasons. Failed options or a still-offered season preserve selection without a loop.
- Confirm the mutation, then fail the list/count refresh: the saved follow remains confirmed and ordinary error/retry applies to the failed read.
- Confirm a change after several loaded calendar pages: reload the first page only, preserve season/category and do not show the former selection as current. Inactive tabs reload on display.
- Fail an unchanged-context refresh and an additional page: retain authorized pages/cursor in Query, show final failure in the shared scoped card and retry the safe read or failed continuation under [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements).
- Lose a write response: perform one bounded current-state read, no automatic mutation replay. Fail that read too: ordinary action error, no invented success. Delayed completion follows the documented server ordering.
- Sign out or change subjects during reads/writes: remove the old private client/data and preserve original-principal dispatch. Returning to the same subject uses its new mounted lifetime under F05’s accepted freshness limits; no application generation or global callback-rejection promise is added.
- Verify guest invitation without automatic follow after sign-in, accessible busy/selected states without colour alone, and unchanged advertising triggers.

Use the approved Home/Sport references linked from [the plan](plan.md). Controlled SQL/React checks do not establish native networking, accessibility, real Auth0, advertising serving or account-erasure orchestration.

### Shared season and native Home presentation

Use representative iOS/Android Home compositions with the actual tabs, personal-season owner, contextual selector, calendar and followed lists. Observe initial loading, a populated Home → Team → Club → Back return with exact UUID routes, and one known refusal followed by failed then successful explicit retry: refused content stays absent until fresh authorized evidence. Perform one ordinary real account switch and confirm the previous account’s Home data is absent. Combine these checks with the bounded follow/reset and native time-adapter cases above; no precisely timed race or exhaustive state × appearance × OS campaign is required. In a representative enlarged-text composition, reach the final followed card above the floating capsule, scroll long rails and preserve the personal selection; a year may wrap. Compare [Home controls](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5075-4799) and [shared sheets](../003-shared-quality/plan.md#account-basic-lists-and-contextual-sheets). Blocking errors use Retry; dragging them starts no read or automatic season recovery.

## Original-account erasure participant

Exercise F05's actual local erasure transaction with visible/hidden team and pool relations, both writer orders and same-subject re-registration. Required participant and final account-delete failures restore original relation UUIDs and start no provider cleanup. A generated follow PUT targeting the erased UUID is refused while the replacement account remains unfollowed; sporting targets and other owners survive. Use the [F05 erasure boundary](../005-accounts-identity/plan.md#erasure-and-manual-resolution), without a new F06 cleanup/recovery process.
