# Quickstart: qualify contributions and moderation

Run the [README verification commands](../../README.md#verification) for the existing workspace. The scenarios below require the F08 implementations and integrations tracked in [tasks](tasks.md); shared checks alone do not qualify them.

## Prerequisites

Use the [F13 environment](../003-shared-quality/plan.md) and [canonical contracts](contracts/README.md). Prepare disposable accounts with known Auth0 ages, ordinary rights and a separate stream-only moderator; nonprofessional/professional matches, hidden parents, known/unknown times and provisional/definitive results. Use controlled clocks and network doubles, never provider configuration or private production data.

## Contracts and access

Bundle/validate the mobile root, generate Java interfaces/DTOs and Orval client/Zod schemas, then compile the actual consumers. Qualify enums, required/absent/null fields, URI handling, additive responses, unknown request rejection and deterministic regeneration. Verify 201 Location, repeated-state 200, stale-revision 409, shared errors and no-store. A contributed public URL carries its exact version ID; a professional URL does not.

Reject another account, old erased account UUID, invalid session, ordinary user at an administrative route, wrong-environment token and ungranted maintenance bypass without effects. A stream-only moderator has all video actions and no unrelated administrative power. Test URI host-boundary spoofing, embedded credentials, malformed addresses, supported short/subdomain URLs and preserved query/fragment without network requests.

### Foundation boundary — T001–T005

The [T001–T005 foundation](tasks.md) uses the existing pinned F13 stack, generators and ignored outputs. The existing XML master and README retain the disposable-baseline/freeze rule and separate migration/application roles; this lot changes no schema or environment. `ContributionContractWebMvcTest` exercises generated Java request binding and response serialization/constraints; `contribution-contract.test.ts` exercises actual Orval calls through F13 and Query, including one JSON read/schema parse, rejected responses, erased attribution, hidden/dateless private context, finite enums, twenty-item pages, numeric bounds and opaque revisions. Public stream fixtures qualify URL/version-ID serialization and consumption only; actual F03/F08 pair selection remains future business mapping.

`ContributionAccessWebMvcTest` composes real signature/environment checks, F05 identity resolution and F12 admission/grants against controlled account/settings/transaction adapters. `contribution-context.test.ts` uses the real session owner, generated calls and Query to qualify keys, native infinite-query page parameters and late reads/writes across A → guest/B → A even without effective cancellation. Strict unknown-command rejection is proved at MVC; Orval's request schemas check known fields, while generated Fetch validates consumed responses once. These are contract/context proofs, not business endpoints, SQL locking/erasure, device, design or provider qualification. Later mutations must recheck identity/grants under their ordered locks.

Run the full README verification for current generator, application and Expo Doctor results;
revision-specific execution results belong to the delivery PR. Foundation evidence alone does not
qualify the command, SQL or native boundaries below.

## Versions, quotas and concurrency

With JUnit/Spring MVC/Testcontainers PostgreSQL and the real mappings/schema:

- Exercise exact seven-day age, unknown evidence, H−1 and unknown time; post-definitive proposals and professional/hidden refusal. Preserve the active link while a replacement is pending.
- Submit/cancel/withdraw/approve/reject, supersede multiple proposals and reactivate a historical source. Check ownership, no inherited reports, historical decisions and no quota refund. Cancelled proposals cannot be reactivated; their history remains readable.
- Accept third/refuse fourth ordinary version per account/match and third/refuse fourth distinct match per Paris day. Test 23/25-hour days, same-match continuation, reached-quota unchanged submission and later grant changes.
- Race submissions across the same and different matches, two decisions, result acceptance/publication and account erasure/reactivation. Assert one active version, bounded quotas, no stale overwrite, no restored attribution and full rollback of required internal effects on failure.
- Report one exact version; test duplicates, self-report refusal, erased-owner link, thresholds 3/10 and result changes without a new report. Erase several reporters: every fact remains counted, each reason/author is removed. Repeated reports never target the new active version.
- Verify approved/rejected/withdrawn paths leave or resolve the report hold as specified. F07 announcement allowances do not reset with reactivation or report counts; result composition observes the serialized current link.

### Local policies and persistence — T007/T010/T011

`StreamAddressTest`, `ContributionEligibilityTest` and `ContributionQuotaTest` qualify local literal URI recognition, current authorization/revision before unchanged submission, seven elapsed days, confirmed H−1, definitive-result/report-hold approval and the limited moderator exceptions. Inputs are controlled current owner facts; these tests do not qualify F02/F05/F12 read composition or provider availability.

`ContributionPersistenceJpaTest` applies the complete master changelog to isolated PostgreSQL 18.6 using the existing role setup, then validates actual JPA mappings, conditional active/pending uniqueness, same-match lineage/hold, nullable ownership/decision attribution, preserved publication/later decisions and replacement flush ordering. One Hibernate filtered-aggregate query returns lifetime participating versions and distinct daily matches from one SQL statement snapshot, using successive Paris-midnight boundaries. Cases include empty usage, both DST changes, yesterday's match, same-day continuation and later state/grant changes. Pending ownerless versions coexist; report schema/deduplication remains T029.

These suites establish the local model and policies. The following qualification covers the
implemented store, submission/read endpoints, ordered locks and required F02/F07 atomicity;
actual account erasure, remaining lifecycle commands and mobile journeys retain their owning tasks.

### Submission and atomic announcements

T006/T008/T012–T014/T054 bind real F02 sporting roots, F05 original-account locks,
F06 confirmed relation unions and F07 inbox/allowance persistence. `SubmitContribution`
gathers current version-attribution accounts together with the actor/audience before sorted locking, rereads current grants,
age, ownership and quotas, and publishes only accepted active transitions. The same JPA store
supplies native twenty-item `Slice` reads in a short repeatable-read application transaction.
The generated submission interface supplies owner POST/GET and direct moderator POST without
exposing later lifecycle commands. [HTTP cases](../../apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionSubmissionWebMvcTest.java)
cover completed creation/current repetition, exact Locations, private reads, strict requests,
original owner/actor, current privileges and safe refusal/outage responses.

[Submission cases](../../apps/backend/src/test/java/com/blockout/backend/contributions/application/SubmitContributionIntegrationTest.java),
[private reads](../../apps/backend/src/test/java/com/blockout/backend/contributions/application/ReadOwnContributionsIntegrationTest.java),
[attribution-lock races](../../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAttributionIntegrationTest.java)
and [cross-owner cases](../../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAnnouncementsIntegrationTest.java)
use the actual migrated PostgreSQL 18.6 mappings and separately proxied production services.
They qualify replacement flush ordering, immutable quota participation, third/fourth limits,
same-day continuation, stale no-ops, current private visibility, both concurrent result/publication
orders, complete sorted account locking, concurrent same/different-match submissions, actor-row
removal, grant withdrawal and rollback on real required inbox constraint failure. Shared persisted
quota/DST qualifications remain in the preceding T007/T010/T011 evidence.

The cross-owner fixture controls time and the after-commit external observer; no provider request
occurs. Commit proofs run outside an enclosing test transaction, with PostgreSQL-observed lock
exclusion and an independent transaction checking committed entry visibility.

The [F07 qualification](../011-notifications-delivery/quickstart.md#atomic-producer-and-link-qualification)
owns announcement timing, handoff and allowance evidence. Controlled hiding/new exempt-version
and personal-row deletion fixtures are not real moderation-command or scheduled-purge
qualification; those remain [F07 T046 and T052](../011-notifications-delivery/tasks.md). Actual F05 erasure and native/mobile
journeys remain with their existing tasks. F08 T016/F03 public projection is qualified separately below.

## Reads and mobile

Use more than twenty versions/reports/matches where applicable, including identical timestamps, hidden matches and erased authors. Check deterministic tie-breaks, literal search, combined filters, current counts and clean offset bounds. Concurrent changes may move pages; refresh restarts at zero. “To review” retains reported active links until their situation changes, without a dismissal action. After resolving a hiding wait, old reports and masked versions leave the current badges but remain in version history; rejected-version totals remain correct beyond one page.

With Jest Expo/React Native Testing Library and native device checks, preserve drafts on refusal, disable duplicate in-flight actions and reread affected views after confirmation. Lose a response, delay its completion and fail the bounded read: show ordinary error/retry without replay or invented historical success. A failed refresh after confirmed success must not undo that success. Sign out/change accounts during reads/writes and reject old callbacks, including returning to the same account. No reconnect replay, polling or offline queue.

Qualify ordinary contribution/replacement, personal-contribution and report screens with the same content and current-journey drafts. Short filters use sheets; simple confirmation uses the platform alert and cancellation has no mutation effect. Exercise first/last inputs, final scrolling actions and keyboard/back separately on both platforms. Review the [approved design references](plan.md#design-reconciliation-and-evidence), light/dark themes, narrow screens, VoiceOver/TalkBack, enlarged text, focus and accessible action states. Existing sports foreground refresh and advertising behavior remain unchanged. Prototype tests and Figma approval do not qualify native networking, SQL concurrency, provider availability or accessibility.

### Native submission and public entry — T009/T015/T016

The ordinary match contribution route composes F03's current match summary and the F08
owner collection through the existing F05 session, F12 admission and single QueryClient.
`submit-contribution.test.tsx` exercises the real screen, RHF form, generated transport and
Query with controlled native credentials, HTTP and navigation. Cases cover unavailable eligibility, guest/profile distinctions, concise form copy, local URL validation, retained dirty input after refresh
and refusal, duplicate suppression, moderator eligibility without a Pro condition, invalid
response rejection, late-session rejection, conflict observation and confirmed acknowledgement
independent of derivative-read failure. `contribution-entry.test.tsx` reads current eligibility through the same original-account Query owner, omits an unavailable match entry (including account-age refusal), keeps the guest invitation distinct from support and carries no post-authentication command. Its real-match refresh cases recover from changed eligibility, an owner-read outage and a profile-read outage without remounting.

`PublicContributionIntegrationTest` exercises actual submitted active/pending versions and
F03's generated response, including current match withdrawal. The existing
`ConsultationContractJsonTest` separately qualifies omission of contribution identity for
professional URLs and private-field absence. Version identity is supplied only with the exact
active contributed URL; no private owner, quota, report or moderation data enters F03.

The form uses the current F13 page/scroll/keyboard composition and the compact F03 match-context variant. `contribution-navigation.test.tsx` mounts actual protected native routes to verify draft/recovery retention after a F12 503 detour and a clean return after acknowledgement. Native interaction and design
evidence must identify the executed revision, platform and exact
[approved nodes](plan.md#design-reconciliation-and-evidence); controlled JavaScript evidence
alone does not qualify native networking, provider behavior or screen-reader announcements.
Full moderation/lifecycle and extended uncertain-response recovery retain their owning tasks.

### Personal contribution lifecycle — T018–T022

`OwnContributionLifecycleWebMvcTest` exercises generated PATCH binding, strict commands,
original-account scope, ordinary admission, conflicts and private headers.
`OwnContributionLifecycleIntegrationTest` executes production commands over HTTP with migrated
PostgreSQL mappings and real F02/F05 owners. It covers independent active/pending versions,
current-condition replacement, exact terminal repetition, stale revision before no-op,
immutable addresses/quota participation and report holds. An account-lock race verifies that
withdrawal cannot restore a publication actor erased while the command waits. The retained
backend cancellation command is separately qualified; the current native history exposes no
such action. Historical decision/erasure fixtures do not qualify actual US5/F05 orchestration.

`ReadOwnContributionsIntegrationTest` qualifies all-state totals independently of twenty-item
pages and ordinary quotas, true-empty zero, isolation and the exact owned active projection
outside the first page. Other owners' active versions are omitted. Contract/generated-client
checks qualify the optional member and safe integer total.

The contribution suites exercise the real screens, RHF, generated transport, Query and session
owners with controlled native I/O and HTTP. The current match card opens an initial proposal
form directly, or a distinct prefilled editor for the exact owned public version. Replacement,
withdrawal and initial submission require one native confirmation and return to the exact
match only after acknowledgement. Cancelled dialogs preserve drafts and send nothing. Tests
cover captured revisions/addresses, pristine active-version refresh, dirty refetch retention, duplicate suppression and late
callbacks after session change or departure. The exhaustive history has no row commands;
textual badges, addresses, separators and “Mes propositions (number)” remain visible, including
zero and totals beyond loaded pages.

Current 401/403/404 refuses and removes private data, including an F03 refusal observed before
navigation; a later technical failure cannot restore it. Ordinary outages preserve authorized
pages and explicit retry. A successful refresh replaces traversal from page zero; failed
refresh retains all accepted pages. Continuation stops on error or outside active focus. An
acknowledged withdrawal clears its exact active projection even if the derivative read fails,
without advancing old aggregate revision/eligibility or undoing acknowledgement. These tests do
not establish native networking, keyboard behavior or assistive-technology execution.

Use fictional accounts/addresses on compatible iOS and Android development clients. More than
twenty historical versions must be moderator-created and quota-exempt; ordinary active/pending
versions retain their real consumption. Check the following construction boundaries:

- A card without a public URL opens the blank proposal form directly. Cancel its confirmation,
  then accept one valid proposal and observe one POST and return to the match.
- An exactly owned public link offers “Modifier le lien” rather than external opening or
  self-reporting. Its editor starts with the previous address, retains edits on refresh and
  confirms replacement before returning to the match. Cancellation preserves the draft.
- The compact withdrawal action confirms the exact active URL/version, then returns to the
  match while preserving independent pending versions and consumed quota.
- The personal history is exhaustive and read-only across pending, active and terminal states.
  Traverse beyond twenty versions, refresh from page zero and retain authorized information
  on technical read failure. An ownerless or other-owner link grants no ownership.
- Inspect the real keyboard, native back/discard behavior, safe areas, both themes and enlarged
  text on both platforms. Record actual reader speech/focus separately from accessibility
  semantics in an inspection tree.

Earlier [row/lifecycle captures](https://github.com/blockoutproject/blockout/pull/575#issuecomment-6510562999)
and [ellipsis-entry captures](https://github.com/blockoutproject/blockout/pull/575#issuecomment-6510989325)
retain their exact source revisions and narrow execution proofs. Their entry placement,
row-cancellation controls and empty-management detour are superseded by the current
[owner direction](plan.md#design-reconciliation-and-evidence); those captures do not establish
this revised interaction. The [current native evidence](https://github.com/blockoutproject/blockout/pull/575#issuecomment-6511946128)
identifies source `aa4d229e5138d1429e6bea76987c3e7b6296c622`. After reviewing that result,
the owner explicitly authorized synchronization and removal of obsolete Figma/prototype states.

The [current Figma journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5511-51086)
contains fourteen representative editable screens and fifteen used private composition masters;
twenty-four obsolete screens and nineteen unused masters were removed. Final inspection finds
live library references without broken instances and Outfit product text. The
[prototype captures and delivery](https://github.com/blockoutproject/product-prototype/pull/15#issuecomment-6512645456) at
`db183a56f9b70d828d87623254a2eb8d3ab2b317` passes 223 model tests, 29 Chromium cases,
TypeScript and build. Browser checks cover the three card entries, prefilled replacement,
cancelled confirmation, acknowledged returns, withdrawal, read-only/zero history, report
cancellation, narrow/dark layouts and the header inset regression. This prototype uses only
fictional local services; its dialogs represent native confirmations and do not qualify native
platform execution. The existing build chunk-size advisory remains. US4 native reporting and
the wider qualification matrix retain their own scope.

The current [native captures and observations](https://github.com/blockoutproject/blockout/pull/575#issuecomment-6511946128)
use production screens on compatible iOS 27.0 and Android 17/API 37 development clients with
fictional Auth0/storage and a controlled HTTP peer. Both platforms exercise direct first
proposal, prefilled own-link editing, native replacement and withdrawal confirmations, and
return to the exact match after one acknowledged write. Android replacement cancellation and
iOS initial-submission cancellation preserve the draft and send nothing. Pending replacements
retain the public version until its independent confirmed withdrawal; the peer records the
pending row and consumed quota afterward. iOS also verifies the non-owned public opening
action and readable dark presentation at extra-extra-extra-large text, then restores light/large.
Android traverses twenty-five read-only versions through pages zero/one, then refreshes to
an empty collection with “Mes propositions (0)” still visible. Its real software keyboard
leaves the editor and submission action reachable. This run does not establish iOS
software-keyboard presentation, real provider behavior or reader speech.

T023, US4 reporting, actual US5/US6 moderation/erasure, T049/T056 and the minimum-OS/narrow-device
and screen-reader matrix retain their own qualification. A synthetic peer establishes only its
rendering, transport and interaction boundaries; it is not provider or global design approval.

Scoped iOS/Android observations at `e9a6ece6`, including builds and controlled fixtures, are recorded in the [native contribution evidence](https://github.com/blockoutproject/blockout/pull/557#issuecomment-6475614201). Available-entry/form composition, keyboard/back, retained drafts, real refusal/explicit retry, acknowledgement and exact active public projection were observed. That run also reported cropped labels after live Android text enlargement and development navigation warnings; its missing screen-reader and minimum-OS evidence remains explicitly unqualified.

The [integrated native evidence](https://github.com/blockoutproject/blockout/pull/562#issuecomment-6479911193) exercises production source `84e723e7` on compatible iOS 27.1 and Android API 37 development clients. iOS keyboard dismissal and cancelling the native discard confirmation preserve the exact draft; the captured future-match form is ineligible for ordinary submission and supplies no new acknowledgement proof. Android font enlargement recreates the Activity without changing the process, returns to the home route and yields a readable empty form on explicit reopening. This establishes neither retained-context cropping nor draft persistence across recreation, and does not erase the earlier failed observation. The real Stream link panel is exercised on both platforms; native external handoff and return are observed on Android. The iOS handoff remains unqualified. The compact contribution summary remains informational and has no navigation dependency. Real TalkBack 17.0 speech captions verify the link field name/hint and the empty-value validation alert on this source; no POST is issued. These two cases do not qualify complete reader traversal or VoiceOver.

T009/T015/T016 construction is complete with the generated/RHF/Query tests, public projection proof and these scoped native observations. The full F03 match status still truncates after a live Android theme change at 130% text; it is absent from the compact F08 context and retains its failed result under [F13 native qualification](../003-shared-quality/quickstart.md#native-presentation-qualification). This grants no Android exception or global native acceptance. T017 retains the complete US1 acceptance execution; T049/T056 and F13 T073 retain the broader journeys, runtime matrix and assistive-technology qualification.
