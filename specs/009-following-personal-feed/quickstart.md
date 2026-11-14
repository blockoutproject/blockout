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

Opening the season selector is the explicit recovery from a selected-season error. Verify its reachability, retention of the selection when options fail, and successful omission selecting the ordinary valid default without rewriting exact-season or All-seasons cached rows, including when an earlier options Query was evicted. Failed reads establish no absence. Native private-client lifetime and per-control pending behavior follow the existing [session owner](../005-accounts-identity/plan.md#mobile-session-and-shared-consumers); the database retains uniqueness and desired-state idempotence.

## Mobile journeys

### Native follow action boundary

Deterministic consumer tests use independent same-target and different-target controls. Only the initiating mounted control is busy; retain its confirmed label/selection while blocking its own repeated tap. A confirmed response updates admitted member data, an ordinary failure retains confirmation, and a known current refusal stays withdrawn until a successful member read. Cover response loss, ordinary settlement invalidation/reads and obsolete route/subject completions through the actual Query/F05 owners, without a successful-read prerequisite, replay or a claim of delayed cancellation. Native integration checks one ordinary follow settlement and route return; the representative account transition is described below.

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

Use database/generated-consumer tests to add/remove/re-follow and verify direct public counts independently of profile reads. Include multiple owners, distinct typed identities/seasons, hidden relations and restored visibility. Unknown/invalid/failed reads never become zero. Delay the first active count read to observe its skeleton, then exhaust an initial failure and a retained-number refresh failure: keep the icon, replace the number with `Indisponible` and expose `Nombre d’abonnés indisponible`, with no dedicated Retry. An ordinary later successful count read restores the number. Idle or paused reads show no artificial active skeleton; no polling or substitute refresh loop is added. Public count presentation uses the count-specific scope in [F13 FR-038](../003-shared-quality/spec.md#functional-requirements); current refusal removes the count before a later network failure. A public count NotFound invalidates only the addressed F03 detail, which retains current server authority and private contact withdrawal; it does not rewrite private Follow state or other sporting projections. A private opaque member NotFound does not prove public absence.

In deterministic consumer tests, confirm a write, then fail dependent reads: confirmation survives. Lose a write response and delay original completion: ordinary action feedback retains the last confirmation and allows a later explicit desired-state command. Existing invalidation and normal reads may observe current state; fail those reads independently without imposing a successful-verification prerequisite, replay or a cancellation claim. Ordinary and explicit-bypass counters retain distinct keys; confirmation invalidates only the affected target.

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

| Scenario | Deterministic owner/consumer proof                                                                                                                                                                                                                                                                                                                                                        | Representative native integration and remaining owners                                                                                                                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A22      | Direct counts remain independent of profile/Pro, personal season and hidden/restored relation visibility; initial/retained final failure shows icon plus static unavailable label, without zero or dedicated Retry, and ordinary successful reads restore the number.                                                                                                                     | Open a public count and an authenticated follow control. Reuse F05/F09 evidence for account/entitlement variants.                                                                                                                                                                                |
| A23      | Definite write refusal retains confirmation. Public target refusal updates its addressed reader without rewriting loaded lists or relationship status; actual private refusal withdraws forbidden data.                                                                                                                                                                                   | Keep an old public card, open its currently refused destination, then refresh its list. Check private refusal separately: failed reread never restores forbidden data.                                                                                                                           |
| A24      | Response loss, delayed writes/member reads, unmount and A → guest/B → A cannot replay mutations or admit obsolete callbacks; ordinary current confirmation remains authoritative.                                                                                                                                                                                                         | Perform one ordinary real account switch using the actual F05 lifetime. Precise races remain deterministic tests.                                                                                                                                                                                |
| A25      | Confirmed writes survive independent profile/options/list/calendar/count read failures, including inactive tabs; selected season/category remain.                                                                                                                                                                                                                                         | Confirm a follow change and return to Home; a changed-follow reload uses loading/error/retry and hidden tabs start at the first page when displayed.                                                                                                                                             |
| A26      | Initial, refresh and continuation failures remain distinct; authorized unchanged-context data stays in Query while initial/full-reread failure uses the shared scoped card and next-page-only failure keeps the mounted list with shared footer Retry, data withdrawn after actual private refusal cannot return after network failure, and retry establishes no false empty/end or zero. | Exercise bounded loading, populated return, failure and recovery through the existing controls.                                                                                                                                                                                                  |
| A27      | [Actual F07 consumption](#relationships-and-calendar) deduplicates overlapping origins and distinguishes a recreated relation; display season is not a delivery preference.                                                                                                                                                                                                               | Native permission, global push ordering and provider/physical receipt stay with [F07](../011-notifications-delivery/quickstart.md).                                                                                                                                                              |
| A28      | Consumer tests retain meaningful labels/roles/states, current grants and unchanged advertising/navigation intent.                                                                                                                                                                                                                                                                         | Inspect reachable follow/count/retry and contextual support actions, ordinary focus/content order and representative enlarged content. F10 private handling and F11 actual advertising/consent remain with their owners; filtering/refresh/return introduces no interstitial.                    |
| A29      | Technical relationship 503 retains matching confirmation in Query while the common signed-in page card masks dependent content and the inverse action. Its Retry reads the shared relationship only; public count failure is independent. Refusals and UUID replacement retain their guards.                                                                                              | Confirm → relationship 503 → common page card → read-only relationship Retry → restored action; check account-only 503 separately. Compare [recovery](plan.md#constitution-check); F03 owns [initial readiness](../007-sporting-consultation/quickstart.md#sporting-recovery-and-match-rereads). |

### Home pager with an unavailable common read

[A30/FR-008/FR-029](spec.md#errors-concurrency-and-shared-responsibilities) and [T056](tasks.md#shared-account-and-sporting-composition) cover only the existing Home pager during common-prerequisite loading or failure. The affected [prototype and separate Figma scope](spec.md#design-evidence) are approved; native adoption and qualification remain with T056. Follow/count adoption and Following's internal section recovery retain T053/T054.

Use the existing real Query/generated-consumer `personal-screen` suite, with controlled HTTP responses and native pager events:

1. Establish the personal owner and delay then fail the first season-options read. Verify all three tab choices and the native pager remain present, with structural loading only during the active first read and a card after final failure. Press and page through Upcoming, Completed and Following: each scene presents its dependent card, the season selector stays unavailable and no calendar/list GET starts. Tab changes cause no additional common GET.
2. Retry that shared failed read with a delayed response. Keep the same card during its active request, show progress only in the initiating scene's Retry button and keep the card without active progress while suspended. Swipe to another scene: its card action stays idle. Return to the initiating scene and observe the same attempt without starting another read. Repeated failure restores available Retry; successful options restore the selected scene's content or confirmed Empty, retaining a valid season and selected tab.
3. Preserve existing checks for current account/options refusals, refusal followed by technical failure, account/UUID replacement and independent calendar/list queries. A failed common read must neither invent All seasons nor restore refused private content. Pending background reads retain usable content under F13; their final failure uses the dependent cards. Existing retained data stays with its owner.

After the native implementation checks, observe one controlled common-read failure and delayed Retry on compatible iOS/Android clients: tab press and native swipe use the same shared pager as Search, with Home's existing collapsible brand and season rail. Verify card movement, reachable actions and successful return without extra common reads or premature collection reads. Reuse F13's representative theme/text/reduced-motion scope; add no provider operation or VoiceOver/TalkBack qualification. These observations do not complete T053/T054 or broader T045.

### Shared personal season boundary

Use generated-consumer tests for the shared personal selection across Home, Teams, Pools and calendar: followed-versus-catalog default, historical/All seasons, reset, fresh-opening choices, successful disappearance, failed reconciliation and obsolete session/selection completions. A selected-season error does not read options automatically; opening the existing selector is the explicit recovery. Only successful options establish omission and apply valid-choice fallback. Verify that other retained exact-season/All-seasons query data and in-flight reads remain untouched.

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

Database/generated-consumer tests traverse more than twenty follows, including French accented names, homonyms and UUID ties, and verify current public names, deterministic `fr-x-icu` ordering, closed seasons and hidden/reappearing relations. Native integration uses a bounded continuation and return/retry case. Teams and Pools are collapsible sections in one Following tab. Fail an initial/full reread in either open section: one card replaces Following content, Upcoming/Completed remain accessible and the sibling section’s authorized pages stay in Query. A collapsed section starts no request until opened. Card Retry reads only failed necessary sections. Fail a next page separately: retain the single native list, both sections’ rows, controls and scroll position; each failed section shows the shared compact error and footer Retry after its own rows. Retry fetches only that section’s failed cursor with continuation progress, while the sibling’s valid paging remains available. Repeated edges/taps create no automatic or parallel recovery reads; idle, paused and background reads do not simulate that action. Open the exact F03/F11 target, return to retained pages and fail/retry the same continuation cursor. Empty season offers Search; initial/page failure never becomes Empty/end. Confirm a follow change while another tab is hidden: reset former rows, then load its first page when shown. Reject obsolete account responses and withdraw forbidden private data at its existing owner. A public target refusal in another reader leaves loaded list cards intact until the list's ordinary read; opening a card still checks the destination's current authority.

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=ReadFollowListsTest,FollowListsWebMvcTest,FollowOptionsWebMvcTest,FollowStateWebMvcTest,PersonalCalendarWebMvcTest -Dit.test=FollowListsIntegrationTest,FollowOptionsIntegrationTest,PersonalCalendarIntegrationTest -DforkCount=1
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/followed-lists.test.tsx src/features/following/__tests__/personal-screen.test.tsx
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx run-many -t verify -p backend mobile --parallel=1 --output-style=static
```

### Personal complete-day calendar

Database/generated-consumer tests follow overlapping team/pool origins and verify each match once. Reuse F03 automated date/time coverage for known/date-only/missing times, Paris/New York and DST boundaries, definitive/provisional results and postponement; F06 tests preserve its selected season/hasAvailableFollows envelope, seven complete nonempty days and a busy day with 26 matches. Continuation is exclusive; one response is coherent while between-page changes may require refresh. Remove origins in turn without altering the public match; only the last removal eliminates its personal selection.

Fail ordinary refresh and append separately. Apply [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements) at the affected Home tab: pending reads retain visible content with the appropriate native progress. Final full-refresh failure presents its Error card and same-card Retry. Final next-page-only failure keeps authorized rows, controls and the sticky native scroller/position mounted with the shared error/footer Retry. The existing Query retains pages/cursor; footer Retry fetches that cursor with continuation progress, without page-zero restart or duplicates. A failure in Upcoming does not replace Completed or Following, and conversely; the shared season remains selected. A confirmed follow change resets former pages while preserving season/category; hidden views load on display. A successful no-follow response updates its own calendar only; other loaded public projections remain until their ordinary read. Ordinary failure establishes no absence. A seasonal category captures the device zone on its first active read and never regroups retained same-season rows merely on foreground return. Exact match opening uses the single F11 transition owner and introduces no new advertising event. Keep a short native device-zone adapter check through the shared F03 calendar; reuse applicable F03 native evidence rather than replaying every date/time boundary on each platform.

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=PersonalCalendarWebMvcTest,FollowOptionsWebMvcTest,FollowStateWebMvcTest -Dit.test=PersonalCalendarIntegrationTest,ReadMatchCalendarIntegrationTest
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/personal-calendar.test.tsx src/features/following/__tests__/personal-screen.test.tsx src/features/sporting/__tests__/sporting-calendar.test.tsx
```

### Integrated personal season and calendar

Use real F02/F03/F06 SQL paths and generated consumers for Home, season selection, both lists and calendar. Exercise qualified complete-empty withdrawal and reappearance: preserve original match/follow UUIDs, keep independent catalog/division restrictions and hide the public match while retaining its relation. Fail a confirmed-change reload after several pages: former rows disappear into ordinary Error/Retry with season/category retained. An unchanged-context refresh failure retains authorized pages in Query and presents the affected scoped Error under [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements). Read current options only on deliberate selector opening; failed options preserve the selected season and use their scoped read card. Change the season with an old list/calendar request pending and verify the old batch cannot enter the new context; do not start the sibling calendar merely to recover the selected one.

```sh
NX_LOAD_DOT_ENV_FILES=false ./mvnw -B -ntp -pl apps/backend verify -Dtest=FollowOptionsWebMvcTest,FollowListsWebMvcTest,PersonalCalendarWebMvcTest,FollowStateWebMvcTest -Dit.test=FollowOptionsIntegrationTest,FollowListsIntegrationTest,PersonalCalendarIntegrationTest,ReadMatchCalendarIntegrationTest -DforkCount=1
NX_LOAD_DOT_ENV_FILES=false npm run test --workspace=@blockout/mobile -- --runInBand --reporters=default --runTestsByPath src/features/following/__tests__/personal-season.test.tsx src/features/following/__tests__/personal-screen.test.tsx src/features/following/__tests__/personal-calendar.test.tsx src/features/following/__tests__/followed-lists.test.tsx src/features/following/__tests__/follow-action.test.tsx src/features/following/__tests__/follow-recovery.test.tsx
```

### Deterministic consumer journeys

Use Jest Expo/React Native Testing Library with the actual F05/Query boundaries for these cases; representative native integration follows separately:

- Follow and unfollow the same target in independent visits/controls: only the initiating mounted control becomes busy, retaining its current confirmed label and selection with a native spinner; another may send a desired-state request. Each control prevents its own pending repeat, with no tap queues or mutation replays. A confirmed response updates admitted member data; an ordinary error preserves the previous state, and known refusals remain withdrawn until a successful member read. Shared confirmed data refreshes after settlement. Preserve one shared team-follow action across its tabs.
- Leave and return to a populated personal tab without a follow change: preserve its data and traversal under the current Query observer/freshness policy. After reset while hidden, display it and fetch the first page.
- Make the selected season unavailable: its list/calendar NotFound remains an ordinary error until the holder opens the existing season selector. Its successful options read establishes omission and selects the new default or All seasons without traversing or rewriting retained exact/All data. Failed options or a still-offered season preserve selection without a loop.
- Confirm the mutation, then fail the list/count refresh: the saved follow remains confirmed and ordinary error/retry applies to the failed read.
- Confirm a change after several loaded calendar pages: reload the first page only, preserve season/category and do not show the former selection as current. Inactive tabs reload on display.
- Fail an unchanged-context refresh and an additional page: retain authorized pages/cursor in Query, show full-refresh failure in the shared scoped card and next-page-only failure in the compact footer while keeping the list/controls/scroller mounted; retry only the owning read or failed cursor under [F13 FR-031/FR-036–FR-038](../003-shared-quality/spec.md#functional-requirements).
- Lose a write response: retain ordinary action feedback, existing invalidation and normal reads, then require a later explicit desired-state action. A successful reread is not a prerequisite to another submission. Fail an independent read too: its scoped card owns presentation without invented success or automatic mutation replay. Delayed completion follows the documented server ordering.
- Sign out or change subjects during reads/writes: remove the old private client/data and preserve original-principal dispatch. Returning to the same subject uses its new mounted lifetime under F05’s accepted freshness limits; no application generation or global callback-rejection promise is added.
- Verify guest invitation without automatic follow after sign-in, accessible busy/selected states without colour alone, and unchanged advertising triggers.

Use the approved Home/Sport references linked from [the plan](plan.md). Controlled SQL/React checks do not establish native networking, accessibility, real Auth0, advertising serving or account-erasure orchestration.

### Shared season and native Home presentation

Use representative iOS/Android Home compositions with the actual tabs, personal-season owner, contextual selector, calendar and followed lists. Observe initial loading and a populated Home → Team → Club → Back return with exact UUID routes. Retain an old public card while its destination is currently unavailable, then remove/update the card at its ordinary refresh. Separately observe a private refusal followed by failed then successful explicit retry: forbidden private content stays absent until fresh authorized evidence. Perform one ordinary real account switch and confirm the previous account’s Home data is absent. Combine these checks with the bounded follow/reset and native time-adapter cases above; no precisely timed race or exhaustive state × appearance × OS campaign is required. In a representative enlarged-text composition, reach the final followed card above the floating capsule, scroll long rails and preserve the personal selection; a year may wrap. Compare [Home controls](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5075-4799) and [shared sheets](../003-shared-quality/plan.md#account-basic-lists-and-contextual-sheets). Blocking errors use Retry; dragging them starts no read or automatic season recovery.

## Original-account erasure participant

Exercise F05's actual local erasure transaction with visible/hidden team and pool relations, both writer orders and same-subject re-registration. Required participant and final account-delete failures restore original relation UUIDs and start no provider cleanup. A generated follow PUT targeting the erased UUID is refused while the replacement account remains unfollowed; sporting targets and other owners survive. Use the [F05 erasure boundary](../005-accounts-identity/plan.md#erasure-and-manual-resolution), without a new F06 cleanup/recovery process.
