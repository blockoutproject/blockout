# Quickstart: qualify following and the personal feed

The executable workspace, T001–T005 contract/context foundation and T006/T007/T009/T010/T012/T013 backend relation slice are available. Full erasure orchestration and integrated/native scenarios below retain their owning qualifications. Use the actual [README verification commands](../../README.md#verification) and the owning task scope; passing foundation checks does not complete the later journeys.

## Prerequisites

Use F13's selected backend/mobile environment and the authored [contracts](contracts/README.md). Prepare two disposable accounts, two viewable sporting seasons, teams/pools with overlapping matches and at least 21 follows in one list. Include a hidden target, homonymous names and matches in both F03 categories. Use controlled API failure/delay doubles, not provider changes or private production data.

## Contracts and access

The foundation is exercised by `FollowingContractWebMvcTest`, `FollowAccessWebMvcTest` and the mobile
`following-contract.test.ts` / `following-context.test.ts` suites through the actual generated
Java interfaces/DTOs and Orval consumers. Java MVC uses a test-only following adapter; F05 identity
and F12 admission run with controlled account/settings/transaction collaborators. Mobile uses the
real F05 generation, Query cleanup and F13 transport with controlled HTTP. These checks establish
binding, original-owner rejection and late-response isolation, including returning to the same
account; they establish no production following endpoint, persisted relation, account-erasure race,
native networking, screen or provider behavior. Generated response Bean Validation in the Java
suite is explicit qualification of the DTO bounds, not automatic outbound MVC validation.

Validate/bundle the mobile root with F13's Redocly configuration, then generate and compile the Java interface/DTOs and Orval client/Zod boundary in the implemented workspace. Verify boolean state, optional season/default/continuations, reused summaries/calendar and shared errors. Validate business JSON once before caching; reject unknown request properties and tolerate additive response properties.

Verify unauthenticated requests, another account, erased original account, hidden target and maintenance admission. Refusals have no mutation effects. Public count and sporting viewing work without a private account read; no identities are disclosed through counts or diagnostic output.

## Durable relationship boundary

`FollowStateWebMvcTest` exercises the production generated member controller with controlled
application state, real F05 identity and F12 admission: confirmed booleans, strict bodies/queries,
media refusal, original-owner isolation, explicit maintenance bypass and opaque no-store failures.
`FollowRelationsIntegrationTest` uses migrated PostgreSQL 18.6 and the restricted application role
for UUID lifecycle, FK/uniqueness, independent typed targets, current F02 visibility, retained hidden
relations, identity corrections, rollback and competing original-account writes. Its deletion
fixtures remove the account row under F05's lock; they do not invoke the future F05 erasure
orchestrator or F06 participant. Those integrated races remain T011/T016 and F05 T035.

`ReadFollowEligibilityTest` and the relation integration suite exercise immutable current
account/target/relation values, overlapping origins without duplicate recipients and the difference
between an unchanged relation and a removed/recreated UUID. The consumer supplies exact sporting
origins, with no display-season preference. F07 retains account/sporting lock coordination and
notification selection, cancellation and delivery; these checks establish none of that runtime.

The focused command is:

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=FollowStateWebMvcTest,ReadFollowEligibilityTest,FollowingContractWebMvcTest,FollowAccessWebMvcTest -Dit.test=FollowRelationsIntegrationTest
```

## Relationships and calendar

With Testcontainers PostgreSQL and the real schema, qualify repeated true/false, unique constraints, concurrent devices and account erasure racing a write. Last server-recorded state wins; erasure cannot leave or recreate an orphan relation. Hiding/restoring changes visibility without changing relation identity or the count's underlying truth. Re-follow uses a new relation identity.

Follow both teams and their pool: each match appears once. Remove origins in turn: a match remains until its last selecting follow is removed. Verify historical seasons, All seasons, default selection and no automatic interseason transfer. Exercise F03's dates, result categories, complete-day boundaries and pagination using current visibility.

Read beyond one twenty-item follow page, including equal names and French accented names. Verify page/continuation bounds and clean BadRequest handling before native offset conversion, without overflow or a false end. Verify stable ordering, no false end on a page error and a fresh traversal after concurrent changes. Check the selected PostgreSQL image supplies the intended French collation and Hibernate executes the ordering expression.

## Mobile journeys

### Native follow action boundary (T008, T014, T015)

`follow-action.test.tsx` exercises the real Query, theme, F05 session and F12 admission owners,
generated member operations and response validation. Only native Auth0 I/O and HTTP are controlled.
It covers shared target busy/provisional state, independent typed targets, explicit replacement,
guest invitation with no sign-in replay, unavailable profile, exact sporting-route composition,
completion after unmount and retired-session rejection. Definite refusals retain confirmation;
reopening a restored target reads its current member state and retires superseded action feedback.
A new explicit attempt also retires terminal mutation entries, so an older failure cannot return
when another control unmounts. Confirmed state reconciles both ordinary and explicit F12 bypass
cache variants. Response loss performs one bounded member read without replay, and failed observation leaves an
ordinary explicit retry of the same requested value. A successful observation is not announced as
proof of the original write or delayed cancellation.

Current 403/404 availability belongs to the member Query, independently of mutation collection.
An earlier saved write response cannot erase a newer refusal; a successful current member read
restores the control. The tests include native five-minute collection with another control still mounted.

Controlled future infinite-query consumers prove cancellation of former traversal, visible first-page
reload, hidden-query deferral and preserved write confirmation after dependent-read failure. These
are interface tests, not completed list/calendar screens or their integrated qualifications.
The compact inverse action uses the public target's displayed season and accessible hint without
writing a personal season selection or adding a success panel. Compare the live
[team](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1010-15711),
[followed team](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1023-5097)
and [dark pool](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1755-14354)
instances with the UI Library's [compact button](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=3386-697):
36-point pill, 20-point leading Plus/Check, inverse surface/content, contextual border and a
separate platform touch target. The F03 action region supplies its separator and 12-point inset.
The generated boundary remains unchanged; the independent public counter is qualified below.

```sh
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/follow-action.test.tsx
```

These JavaScript checks establish no actual authentication provider, account-erasure orchestration,
native accessibility or design qualification. T016, later story tasks and T045 retain their scopes;
live Dynamic Type [F13 native qualification](../003-shared-quality/quickstart.md#native-presentation-qualification) and iOS input
[F13 native qualification](../003-shared-quality/quickstart.md#native-presentation-qualification) remain deferred.

### Direct counters and bounded recovery (T038–T043 construction)

`FollowerCountIntegrationTest` exercises the real reader and follow replacements on migrated,
disposable PostgreSQL with the restricted application role: direct counts through repeated true,
repeated false and re-follow, multiple owners, distinct typed identities and seasons, retained
hidden relations and current restored visibility. `FollowerCountWebMvcTest` exercises the production
generated routes, exact safe-integer serialization, strict query shapes, no-store, current F12
bypass and opaque missing/storage failures. Ordinary public counts invoke no account or permission
lookup. `ReadFollowerCountTest` covers safe-integer bounds through a controlled persistence port;
it does not manufacture that number of database rows.

`follower-count.test.tsx` uses real Query, generated validation, theme/session/admission providers
and the compact counter. HTTP/native identity I/O are controlled. Unknown/invalid/failed reads
never become zero; retained permitted counts identify a failed refresh and expose count-only retry.
Current permission/visibility refusals remove retained values, including across a subsequent network
failure. `follow-recovery.test.tsx` composes the actual F03 action region with the counter and
existing shared mutation lifecycle. It covers a delayed original write after one observation,
failed dependent count/profile reads after confirmed success and A → guest/B → A while the old
observation is pending. The existing `follow-action.test.tsx` also covers definite refusal,
failed/cancelled observation, same-command explicit retry, unmount and affected personal resets.
One bounded generated member read observes current state; it neither replays a write nor proves
that the original request cannot complete later. Ordinary and explicit-bypass counters use their
own keys and only the affected target is invalidated after confirmation.

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=FollowerCountWebMvcTest,ReadFollowerCountTest,FollowStateWebMvcTest,FollowOptionsWebMvcTest,FollowListsWebMvcTest,PersonalCalendarWebMvcTest -Dit.test=FollowerCountIntegrationTest
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/follower-count.test.tsx src/features/following/__tests__/follow-recovery.test.tsx src/features/following/__tests__/follow-action.test.tsx
```

#### Prepared native A22–A28 cases (T040; execution remains T045)

Use the approved [Home and Sport references](plan.md#constitution-check), the
[followed team](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1023-5097)
and [dark pool](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1755-14354).
The group icon and numeric count sit beside the existing compact follow action. F13 owns Outfit,
semantic tokens, system themes, native controls, freshness and accessibility; this slice adds no
new design journey. Use fictional accounts/data and controlled response loss, not provider changes.
Before execution, identify build/commit, device, platform, theme/text scale, real and controlled
boundaries; keep private diagnostics and relationships outside public captures.

| Scenario | Native action and observable result                                                                                                                                                                                                                                                                                                                                                                                                                        | Owners and prerequisites                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A22      | Open team and pool as guest, free member, Pro and unknown-entitlement member. Verify the direct count independently of profile failure; repeat add/remove, change personal season, hide and restore. Each relation counts once; unknown is distinct from zero.                                                                                                                                                                                             | F02 current targets; F05 original sessions; F09 entitlements remain independent; actual F06 SQL and generated consumers.                                                                                        |
| A23      | Refuse add/remove, then make a retained target unavailable. Previous confirmation is retained without invented success; current refusal removes public count and suspends personal action. Explicit retry follows current access.                                                                                                                                                                                                                          | F02 visibility; F05/F12 admission; F13 ordinary feedback.                                                                                                                                                       |
| A24      | Lose a potentially recorded PUT response, delay original completion and fail or delay the single member observation. Shared controls stay provisionally busy only within the bounded wait, then use current observed state or ordinary error/same-command explicit retry. No replay or claim of cancellation. Repeat after unmount and A → guest/B → A, checking no obsolete callback applies.                                                             | Controlled HTTP delay/loss; F13 bounded transport and Query; F05 generation cleanup.                                                                                                                            |
| A25      | Confirm PUT, then fail profile, options, list/calendar reset and count reads independently, including inactive Home tabs. The write remains successful; visible reads show loading/error/retry, the other count stays unchanged, and selection/category stay intact.                                                                                                                                                                                       | Actual F03/F05/F06 generated paths and F13 Query; controlled read failures only.                                                                                                                                |
| A26      | Fail initial, refresh and additional-page retrieval independently. Retain permitted unchanged-context content with identifiable freshness; a current refusal must not return after a later network error. Retry the failed boundary without false empty/end-of-list or zero.                                                                                                                                                                               | Actual personal lists/calendar and F03 current visibility; F13 failure isolation.                                                                                                                               |
| A27      | Remove/recreate a confirmed relation with overlapping team/pool origins and change only the display season. F07 sees one eligible recipient and distinguishes the new relation; no push promise follows from the follow itself.                                                                                                                                                                                                                            | Actual F07 trigger/send, relation rechecks and native notification permission/provider setup are required for their own execution. T044 owns consumption qualification.                                         |
| A28      | On iOS and Android, exercise system light/dark and live changes, VoiceOver/TalkBack, enlarged text and reduced motion. Count announces its quantity/unknown/failed-refresh meaning; busy/selected/retry states are understandable without color, remain operable without clipping and follow current grants. Filtering/refresh/return causes no interstitial; sporting opening uses F11. Open contextual support without adding collection or diagnostics. | F13 native accessibility and approved designs; F05 original session; F09 free/Pro/unknown; F10 private destination and contextual route; F11 advertising consent/provider prerequisites; F12 current admission. |

Native construction captures can establish only the executed rendering/interaction boundary.
They do not complete T045, screen-reader/enlarged-text qualification, real Auth0, notification or
advertising delivery, support-provider collection or account-erasure orchestration. Keep each
unexecuted prerequisite and qualification explicit; no mocked success substitutes for them.

### Shared personal season boundary (T017–T021)

`FollowOptionsIntegrationTest` exercises the migrated PostgreSQL projection, current F02 visibility,
original-account isolation and the followed-versus-catalog default. F06 composes its own relations
with the [F02 scalar selection API](../../apps/backend/src/main/java/com/blockout/backend/sporting/application/SportingSeasonSelection.java), keeping private sporting predicates at their owner.
`FollowOptionsWebMvcTest` exercises the production generated route and mapper, no-store, strict
queries and safe access/storage failures with controlled application reads and identity/admission inputs.

`personal-season.test.tsx` uses the real Query client, generated options/list/calendar calls and bounded
transport with controlled HTTP. It covers shared selection, All seasons, reset, fresh-opening defaults,
successful disappearance, failed reconciliation, explicit retry and obsolete session/selection responses.
`personal-screen.test.tsx` adds the actual F05/F12 providers, Home, follow action, club and search
components; native identity/inset I/O and HTTP are controlled. Current private refusals remain
blocking across a subsequent network failure until a successful read. The actual Home/season native routes share one generation-scoped owner. Opening the contextual
route starts one explicit options reread; only that request may publish opening feedback, while
retained Query error state alone emits none.
These tests establish neither native networking nor provider qualification.

The existing entry/age guards now live in `apps/mobile/src/app/(ordinary)/(tabs)/(home)/_layout.tsx`,
with Home still at `/` and its contextual choice at `/season`. The latter is a `(sheets)` leaf of
the same native stack, so the application-wide sheet convention owns presentation and tab clearance.
F07 owns its ordinary tab placement; the personal context, controls and calendar remain with F06.
US3 retains the follow-list composition. T021 supplies the bounded read boundary; T022/T029/T037
retain qualification through all actual views and endpoints.

On each required native platform, open the selector with a short season catalogue and verify that
the sheet fits its content, exposes every radio row and leaves no fixed half-screen empty region.
Repeat with a long catalogue and enlarged system text: the native sheet must stop at available
height, scroll to All seasons and any reset action, and keep close/back usable without the floating
tab capsule covering a row. Select a season, close without selection and reopen: Home remains the
active tab, the same accepted selection survives, and opening performs only its explicit options
reread. Repeat an ordinary failed reread, a current private refusal and a session change while the
sheet is open; retained permitted data, protected withdrawal and obsolete completion isolation
must follow the existing F05/F12 owners. React tests cannot establish these native height,
scrolling, safe-area or accessibility outcomes.

Compare the [Home controls](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5075-4799)
with the UI Library's [compact tabs](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=841-983)
and [season selector](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=3176-2823).
The [prototype Home](https://github.com/blockoutproject/product-prototype/blob/859bf5970ff0cda8a9a7ddb9aaa7203ce7c7d7a0/src/sport/discovery-screens.tsx#L279)
and its HTML select control are interaction references; their rendering is not native evidence.

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=FollowOptionsWebMvcTest,FollowStateWebMvcTest -Dit.test=FollowOptionsIntegrationTest
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/personal-season.test.tsx src/features/following/__tests__/personal-screen.test.tsx
```

### Personal team and pool lists (T023–T028 construction)

`FollowListsIntegrationTest` exercises the production F06 reader, F02 current visibility and F03
batch summaries on migrated PostgreSQL 18.6 with the restricted application role. Both lists
traverse more than twenty entries using the installed deterministic `fr-x-icu` collation through Hibernate
`collate`, with accented names, UUID ties, current name corrections, closed seasons and retained
hidden/reappearing relations. The maximum supported offset executes against PostgreSQL; the
unrepresentable continuation is exercised with a controlled full-page application port instead of
manufacturing billions of rows. One-item and twenty-item summary reads have the same bounded SQL
statement count. `FollowListsWebMvcTest` exercises the production generated controller/mapper,
strict query bounds, no-store, original-owner/F12 admission and safe failures.

`followed-lists.test.tsx` and `personal-screen.test.tsx` use actual Query, generated list calls,
session/admission/season owners and native component composition with controlled HTTP/native I/O.
They cover separate current sections, exact UUID opening through F03/F11, continuation retry,
homonyms and UUID deduplication, shared All seasons, successful empty/Search versus failure,
populated return without rereading, confirmed-mutation reset while hidden and first-page loading
on display. Current F03 refusals cancel older continuations and withdraw only the refused identity;
retired account responses never become current results. Successful calendar absence also withdraws
overlapping lists without rereading them on return. Native cancellation restores accepted state
before removing a refused identity, including an interrupted first-page refresh. When a late hidden
calendar or current team-detail refusal cancels an initial list read without accepted pages, Query
exposes ordinary error/retry rather than idle pending state; explicit retry alone admits a new page.
A failed refresh
with remaining pages exposes its own explicit retry at the list edge before automatic continuation
resumes. Original-account refusals withdraw both lists and retained calendars within the same
session/admission context. A seasonal NotFound followed by successful options omission removes
that season from overlapping All-seasons data before selecting the fallback. Entity Card extraction
retains the existing F04 presentation adapter and its consumer checks.

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=ReadFollowListsTest,FollowListsWebMvcTest,FollowOptionsWebMvcTest,FollowStateWebMvcTest,PersonalCalendarWebMvcTest -Dit.test=FollowListsIntegrationTest,FollowOptionsIntegrationTest,PersonalCalendarIntegrationTest -DforkCount=1
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/followed-lists.test.tsx src/features/following/__tests__/personal-screen.test.tsx
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx run-many -t verify -p backend mobile --parallel=1 --output-style=static
```

Complete affected verification covers backend unit/MVC and PostgreSQL integration suites, mobile
lint/typecheck/Jest, both platform JavaScript exports and Expo Doctor.

Native construction observations use the compatible Expo development clients on iPhone 18 Pro /
iOS 27.0 and Pixel 9 Android emulator, with fictional HTTP and native Auth0 RPC only. The actual
generated consumers, session/admission/Query owners, native pager and LegendList remain real.
Observed cases include homonymous teams, independent section collapse, light/dark cards, native
season selection, exact team detail opening and the existing follow control, empty-season Search,
iOS retained page failure followed by same-page retry beyond twenty pools, and Android initial
failure/retry versus successful empty. iOS accessibility-tree extraction was unavailable; coordinate
interactions establish no screen-reader qualification. These observations do not complete T029 or
T022/T037's cross-view qualification, live authentication/backend/provider paths, full native
accessibility or enlarged-text coverage, advertising serving or account-erasure orchestration.

### Personal complete-day calendar (T030–T035, T036 construction)

`PersonalCalendarIntegrationTest` exercises the production F06/F03 readers on migrated PostgreSQL,
including overlapping follow origins, typed seasonal identities, qualified absence/reappearance,
independent restrictions, categories, date precision and both loading zones. Seven complete
nonempty days retain all 26 encounters on a busy first day; continuation is exclusive. A committed
follow/visibility change between reads proves one read-only repeatable-read response. Statement
counts stay constant from one to 25 encounters with distinct participants, exercising F03's
existing fetched presentation graph. Only time and the concurrent-write interleaving are controlled.
`PersonalCalendarWebMvcTest` exercises the production controller and generated mapper, strict
query binding, owner isolation, no-store and safe failures with controlled application reads.

`personal-calendar.test.tsx` and `personal-screen.test.tsx` exercise actual Query, generated
transport validation, shared-season/session/admission owners and the reused F03 calendar.
They distinguish ordinary failed refresh from confirmed-follow reset, preserve failed continuation,
cancel obsolete pages/selections, defer covered Home and inactive tabs, clear refused private rows,
and distinguish no available follows from no matches with a working Search action. A successful
continuation establishing no available follows withdraws former rows across categories and
overlapping seasons in the same owner/admission context; unaffected seasons remain retained.
An original-account 404 without a seasonal selector withdraws the whole private calendar collection.
A new seasonal category captures the current device zone at its first active read, including a
previously mounted inactive category, without regrouping retained same-season rows on foreground
return. Established empty selections retire cancelled continuation errors instead of exposing an
ineffective retry footer. A current F03 match-detail
refusal cancels older personal continuations and removes that UUID in the same original-owner
admission context, without reclassifying other rows or reloading the calendar on return. Exact match
UUID routing is exercised. The shared zero-delay collection regression advances native Query timers
before data-observer adoption, then verifies the successful new-zone page survives without another
request and is collected after calendar closure. HTTP and native I/O/focus are controlled; this establishes no provider,
full native accessibility or complete account-erasure journey.

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=PersonalCalendarWebMvcTest,FollowOptionsWebMvcTest,FollowStateWebMvcTest -Dit.test=PersonalCalendarIntegrationTest,ReadMatchCalendarIntegrationTest
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/personal-calendar.test.tsx src/features/following/__tests__/personal-screen.test.tsx src/features/sporting/__tests__/sporting-calendar.test.tsx
```

Native construction observations use the aligned F13 development clients on iOS 27.1 Duo and
Android 17 / Pixel 9, with controlled HTTP and native Auth0 RPC only. The actual entry, generated
validation, session/admission/Query owners, RNCT pager and LegendList composition remain real.
Observed cases include system light/dark, missing/provisional results, native season selection and
Search, complete-day continuation, retained page failure and same-cursor explicit retry, retained
rows after a failed ordinary pull, and cross-category withdrawal after successful no-follow evidence.
On iOS, the enlarged empty card requires scrolling; the Search action was reached above the floating
navigation and activated at accessibility-medium. This is scoped rendering/gesture evidence, not
complete screen-reader, minimum-runtime, live backend/provider, account-erasure or F11 qualification.

The shared F03 calendar row now opens its exact match through the installation's single F11
transition owner. Public and personal calendars use the same component and navigation boundary;
F06 adds no counter, ad preparation or destination copy. The
[entry composition cases](../../apps/mobile/src/features/advertising/__tests__/sporting-ad-entry.test.tsx)
exercise that real row and shared owner, while the personal screen cases retain actual pagination
and UUID routing. Native ad serving remains with
[F11 T010/T020](../004-advertising-privacy-legal/tasks.md). T037 and the cross-view portions of
T022/T029 remain open for their broader integrated qualification.

### Integrated journeys to qualify

Using Jest Expo/React Native Testing Library and native device checks where applicable:

- Open the same target in different tabs, act once and observe the same immediate provisional/busy state; repeated taps do not enqueue work and another target remains usable.
- Leave and return to a populated personal tab without a follow change: preserve its data and traversal without a new request. After reset while hidden, display it and fetch the first page.
- Make the selected season unavailable: its list/calendar NotFound triggers one options read; successful confirmation switches to the new default or All seasons. Failed options or a still-available season preserve selection and ordinary error/retry without a loop.
- Confirm the mutation, then fail the list/count refresh: the saved follow remains confirmed and ordinary error/retry applies to the failed read.
- Confirm a change after several loaded calendar pages: reload the first page only, preserve season/category and do not show the former selection as current. Inactive tabs reload on display.
- Fail a normal unchanged-context refresh: retain authorized content. Fail an additional page: retain earlier pages and retry the continuation.
- Lose a write response: perform one bounded current-state read, no automatic mutation replay. Fail that read too: ordinary action error, no invented success. Delayed completion follows the documented server ordering.
- Sign out or change accounts during reads/writes, including returning to the same account: reject old-session callbacks and remove private data.
- Verify guest invitation without automatic follow after sign-in, accessible busy/selected states without colour alone, and unchanged advertising triggers.

Use the approved Home/Sport references linked from [the plan](plan.md). A mock test or visual match does not establish native networking, accessibility or integrated generation correctness.

### Shared season and native Home presentation follow-ups

At `1a5163d8`, Home's existing personal-season owner is shared only by its Home/season routes; the contextual sheet uses the shared basic radio rows and intrinsic presenter. [F13 Phase 18](../003-shared-quality/quickstart.md#complete-account-and-direct-operational-entries--phase-18) records short-content fitting, native selection/dismissal and Android compact/enlarged-text overflow. Its [representation evidence](../003-shared-quality/quickstart.md#account-readiness-basic-lists-and-contextual-sheets) identifies the current Figma season composition and prototype `8a08c71e`; Club's earlier selector remains unchanged.

The separate [native-only Home brand follow-up](../003-shared-quality/quickstart.md#native-home-brand-retreat--a31) at `0f23092e` qualifies collapse-driven fading, transparent retreat, sticky controls and restoration on Android/Duo. Its matches fixture returned 404, so it establishes chrome over the existing Error state rather than a successful personal feed. Neither follow-up changes follow commands, Query/session ownership, scheduling or the outstanding integrated qualifications above.

The later native-only [A32/A33](../003-shared-quality/quickstart.md#native-fitting-state-scrolling-and-home-pager--a32a33) and [A34](../003-shared-quality/quickstart.md#native-blocking-error-recovery--a34) qualify fitting feedback, Home's shared stock pager bar and Retry-only blocking errors on both clients. Error dragging causes no request; its Retry makes one calendar attempt plus the existing season-options revalidation after 404. Earlier A31 Error-scroll footage is historical and superseded for that gesture. These presentation corrections establish no successful feed or additional F06 business acceptance.
