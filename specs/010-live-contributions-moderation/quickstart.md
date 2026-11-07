# Quickstart: qualify contributions and moderation

Run the [README verification commands](../../README.md#verification) for the existing workspace. The scenarios below require the actual contribution, reporting, moderation and owner integrations described in [the plan](plan.md); shared checks alone do not qualify them.

## Prerequisites

Use the [F13 environment](../003-shared-quality/plan.md) and [canonical contracts](contracts/README.md). Prepare disposable accounts with known Auth0 ages, ordinary rights and a separate stream-only moderator; nonprofessional/professional matches, hidden parents, known/unknown times and provisional/definitive results. Use controlled clocks and network doubles, never provider configuration or private production data.

## Contracts and access

Bundle/validate the mobile root, generate Java interfaces/DTOs and Orval client/Zod schemas, then compile the actual consumers. Qualify enums, required/absent/null fields, URI handling, additive responses, unknown request rejection and deterministic regeneration. Verify 201 Location, repeated-state 200, stale-revision 409, shared errors and no-store. A contributed public URL carries its exact version ID; a professional URL does not.

Reject another account, old erased account UUID, invalid session, ordinary user at an administrative route, wrong-environment token and ungranted maintenance bypass without effects. A stream-only moderator has all video actions and no unrelated administrative power. Test URI host-boundary spoofing, embedded credentials, malformed addresses, supported short/subdomain URLs and preserved query/fragment without network requests.

### Generated contract checks

Generate Java interfaces/DTOs and Orval consumers from the same canonical source. Exercise actual request binding, response serialization/validation, no-store errors, private context keys and late reads/writes across subject changes. Controlled contract tests do not qualify the commands, SQL locks or native boundaries below.

## Versions, quotas and concurrency

With JUnit/Spring MVC/Testcontainers PostgreSQL and the real mappings/schema:

- Exercise exact seven-day age, unknown evidence, H−1 and unknown time; post-definitive proposals and professional/hidden refusal. Preserve the active link while a replacement is pending.
- Submit/cancel/withdraw/approve/reject, supersede multiple proposals and reactivate a historical source. Check ownership, no inherited reports, historical decisions and no quota refund. Cancelled proposals cannot be reactivated; their history remains readable.
- Accept third/refuse fourth ordinary version per account/match and third/refuse fourth distinct match per Paris day. Test 23/25-hour days, same-match continuation, reached-quota unchanged submission and later grant changes.
- Race submissions across the same and different matches, two decisions, result acceptance/publication and account erasure/reactivation. Assert one active version, bounded quotas, no stale overwrite, no restored attribution and full rollback of required internal effects on failure.
- Report one exact version; test duplicates, self-report refusal, erased-owner link, thresholds 3/10 and result changes without a new report. Erase several reporters: every fact remains counted, each reason/author is removed. Repeated reports never target the new active version.
- Verify approved/rejected/withdrawn paths leave or resolve the report hold as specified. F07 announcement allowances do not reset with reactivation or report counts; result composition observes the serialized current link.

### Local policies and persistence

Use controlled current owner facts for exact seven elapsed days, confirmed H−1, definitive-result/report-hold approval and moderator exceptions. Apply the complete master changelog to isolated PostgreSQL with the restricted application role. Verify one active version, one pending version per non-null owner, same-match lineage/hold, nullable attribution and preserved publication/later decisions. Derive quota usage from participating versions between successive Paris midnights, including both DST changes; no lifecycle/grant change refunds usage.

### Submission and atomic announcements

Exercise the generated submission/read routes with actual F02/F05/F06/F07/F12 owners and migrated PostgreSQL. Race result acceptance against publication, same/different-match submissions, grant withdrawal and account erasure. Expect sorted sporting/account locks, current facts reread after locking, no stale overwrite and rollback of the command plus required inbox/allowance effects on failure. External push follows commit; no SQL transaction spans provider I/O. Follow [F07's announcement boundary](../011-notifications-delivery/plan.md#announcement-processing).

## Reads and mobile

Use more than twenty versions/reports/matches where applicable, including identical timestamps, hidden matches and erased authors. Check deterministic tie-breaks, literal search, combined filters, current counts and clean offset bounds. Concurrent changes may move pages; refresh restarts at zero. “To review” retains reported active links until their situation changes, without a dismissal action. After resolving a hiding wait, old reports and masked versions leave the current badges but remain in version history; rejected-version totals remain correct beyond one page.

For [A29/FR-028](spec.md#moderation-and-transitions), qualify the dedicated report page from the active editor and pending/historical version cards. Older versions use “Historique”, with no direct source/replacement shortcut or separate version sheet. Ordinary native Back must restore the same caller and dirty address/disclosure state. Hold the next read, fail it, repeat list-edge events, explicitly retry and exhaust a multi-page traversal, then open another version. Check the admitted server total, received ordering/latest overlapping report representation, erased reason, retained authorized rows and the existing [F13 feedback outcomes](../003-shared-quality/quickstart.md#feedback-and-read-recovery). Exercise a temporary profile-read failure separately from permission refusal. Compare the retained approved report-page [Figma anatomy](plan.md#approved-design-and-evidence) on iOS/Android, compact widths, both themes and enlarged text. Exercise the current report-page navigation separately from the broader native/provider matrix.

With Jest Expo/React Native Testing Library and native device checks, preserve drafts on refusal, disable duplicate in-flight actions and reread affected views after confirmation. For version-change commands, lose a response, delay its completion and fail the bounded read: show ordinary error/retry without replay or invented historical success. Exact-version reports instead keep one reason form and ordinary error feedback after refusal or response loss; a later explicit retry retains the original version and is deduplicated by the server. Verify no match-refresh action, stale-target screen, recovery control or automatic write replay. A failed refresh after confirmed success must not undo that success. Sign out/change accounts during reads/writes and reject old callbacks, including returning to the same account. No reconnect replay, polling or offline queue.

Qualify ordinary contribution/replacement, personal-contribution and report screens with the same content and current-journey drafts. Short filters use sheets; simple confirmation uses the platform alert and cancellation has no mutation effect. Exercise first/last inputs, final scrolling actions and keyboard/back separately on both platforms. Review the [approved design references](plan.md#approved-design-and-evidence), light/dark themes, narrow screens, VoiceOver on iOS, enlarged text, focus and accessible action states. Existing sports foreground refresh and advertising behavior remain unchanged. Prototype tests and Figma approval do not qualify native networking, SQL concurrency, provider availability or accessibility.

### Interruption and accessibility

Execute these cases on compatible native iOS and Android development builds generated
from the tested candidate. Use the required OS/device, appearance and text-size matrix. Use the existing F05 native session/private QueryClient, F12 admission and stream
moderation grant, F03 public match projection and F13 controls/feedback. Keep fictional addresses,
private report reasons and synthetic accounts in task-owned fixtures outside Git. A transport double
can control a lost response, an explicitly delayed completion or a failed GET; it establishes only
that controlled boundary. Exercise real SQL, original-account erasure and atomic notification effects through their actual owner integrations; transport doubles do not establish those effects.

| Case                           | Fixture and action                                                                                                                                                                                               | Expected native observation                                                                                                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Appearance and narrow layout   | Open ordinary proposal, owned editor/history, exact-version report, private queue and version detail in light, dark and system appearance at the narrow supported width. Change system appearance while mounted. | Shared surfaces/text/semantic badges follow appearance; no cropped field, hidden final action or private content outside the admitted account.                                                                                                                                               |
| Large text and keyboard        | Increase system text size on both OSes; edit the first/last field, open/cancel confirmation, scroll to final actions, dismiss keyboard and use native back.                                                      | Inputs and full labels remain reachable without overlapping keyboard/chrome; cancelling sends no write and retains the mounted draft; deliberate route departure follows ordinary draft abandonment.                                                                                         |
| VoiceOver on iOS               | Traverse headings, address/reason fields, active/pending badges, version disclosures, report sections and decision buttons. Open and dismiss a dialog/sheet.                                                     | Names, roles, disabled/pending states and reasons are understandable without color; focus enters the dialog/sheet and returns to its trigger. Pending reads have one accessible announcement, and ordinary toast/field failures are discoverable.                                            |
| Coexisting versions and quotas | Retain an active link beside a pending replacement and more than twenty read-only own versions; refuse a new submission at the server quota.                                                                     | The active link remains distinct from the proposal, total/history remain readable, no history-row command or quota counter appears, and the refused draft is retained.                                                                                                                       |
| Erased reason                  | Read a counted report whose author/reason have been erased, beside an intact report on a historical reactivation source.                                                                                         | Count and historical source remain clear; unavailable reason has no invented author/text. No report author is exposed. Qualify actual erasure through the [original-account scenarios](#original-account-attribution-erasure); an erased-row fixture alone does not establish that behavior. |
| Lost response and later state  | Lose each submit/cancel/withdraw/publication/approval/rejection/withdrawal/reactivation response, then expose a newer state. Delay one completion beyond an explicit refresh.                                    | Ordinary failure feedback and settlement invalidation; no automatic second write, command latch or inferred historical success. Subsequent explicit actions carry their viewed exact target/revision. Cancellation remains an API test because native history offers no cancellation action. |
| Failed explicit refresh        | Keep an edited address and authorized history, then fail pull-to-refresh after a conflict or response loss.                                                                                                      | Draft/history remain mounted with ordinary error feedback; no persistent technical explanation claims a successful read. A later successful explicit refresh recovers current data.                                                                                                          |
| Exact-version report           | Lose acknowledgement, fail the dependent read, then intentionally send again after restoring transport; meanwhile replace the public link. Also confirm a report before failing both dependent reads.            | Ordinary error retains the reason and original version; no match-refresh/recovery action or retargeting. Manual repetition stays on the same account/version. A confirmed report remains successful despite failed reads.                                                                    |
| Account/route departure        | Delay credential preparation or response, then sign out, sign in as a different subject or remove the route.                                                                                                     | The new subject owns a fresh private cache and draft; captured credentials cannot become the other subject's credentials. Old completion produces no new-view feedback/navigation or mutation replay.                                                                                        |

For each row record passed, failed or unavailable evidence separately for iOS and Android. Native
accessibility services, live identity credentials and controlled sporting/grant fixtures must actually
be available before claiming their cases. Preparing this matrix does not establish native execution,
physical-device/provider qualification or design acceptance.

### Ordinary interruption and diagnostic boundaries

Lose a version-mutation response and fail its dependent read: ordinary settlement invalidation neither proves rollback nor undoes acknowledged success. A report acknowledgement remains distinct from read success. After response loss, retain its reason and permit deliberate retry of the same account/version; observing an existing report is not the missing acknowledgement. Current authorization refusal removes private data before an outage. F03 match refusal removes the report address and disables sending while preserving the local reason; refusal of only the old report member keeps its exact-target retry.

Inspect safe local feedback and shared diagnostics: business refusal/conflict emits no unexpected-failure event; unexpected SQL/read failure has one bounded shared HTTP diagnostic. Exclude URLs, query strings, reasons, identities, credentials and payloads. F08 adds no telemetry sink or cleanup-content exception; [F13](../003-shared-quality/plan.md#application-diagnostics-and-health) owns the shared diagnostic boundary; crash reporting remains disabled.

### Native submission and public entry

Exercise the actual Match entry, contribution route, F05 session and F12 admission with generated transport. Verify guest invitation without replay, unavailable eligibility/entry omission, moderator eligibility independent of Pro, URL validation, retained dirty input on refusal, duplicate suppression and acknowledgement independent of derivative reads. Public F03 exposes a contribution ID only beside its exact active contributed URL; professional URLs and public responses expose no private contribution data.

Use the shared page/scroll/keyboard composition and compact match context. Verify keyboard/back, F12 detour, acknowledged return and the exact [approved design](plan.md#approved-design-and-evidence) on both native platforms. Controlled JavaScript checks do not establish native networking, provider behavior or VoiceOver speech on iOS.

### Personal contribution lifecycle

Verify independent active/pending versions, current-condition replacement, stale revision before no-op, immutable addresses/quota participation and report holds. Race withdrawal with F05 erasure: an erased actor must not return. History is read-only in the native app; the retained API cancellation command is validated separately. Current owned active projection and all-state total remain independent of loaded pages and omit other owners.

Current 401/403/404 removes private data; a later outage cannot restore it. Ordinary outages preserve authorized pages and explicit retry. Successful refresh restarts at page zero; failed refresh retains accepted pages. Continuation stops on error or outside active focus. Acknowledged withdrawal clears the exact active projection even when its dependent read fails, without changing old aggregate eligibility/revision or undoing acknowledgement.

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
  text on both platforms. Record actual VoiceOver speech/focus on iOS separately from accessibility
  semantics in an inspection tree.

Compare the [broadcast-link journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5511-51086) and current [approved composition](plan.md#approved-design-and-evidence). Prototype dialogs represent native confirmations; native keyboard, narrow/minimum-OS and VoiceOver checks on iOS remain separate.

### Exact-version reporting

Report one viewed version with a required trimmed reason. Verify self-report refusal, ownerless links, reporting independent of publication age/quota, thresholds three/ten, correction without a new report and unchanged repetition after hiding. Concurrent report/replacement must never retarget the report; first reason and anonymous counted rows remain intact. Current ordinary admission, reason-only binding, exact Location and no-store apply.

On native iOS/Android, open the [report form](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5534-59410), cancel without a write, then lose acknowledgement and retry deliberately on the same version. Retain reason and ordinary error feedback without a match-refresh action, stale-target explanation or recovery screen. Confirmed success survives dependent-read failure; departure/session change publishes no obsolete success.

### Private moderation

Exercise approval, rejection, withdrawal and new-version reactivation with real PostgreSQL/F02/F05/F07 boundaries. Preserve source ownership, decision lineage, holds and immutable quota participation. Competing decisions preserve the first accepted revision; required notification failure rolls back version/revision/allowance. Verify literal escaped search, combined criteria, hidden/dateless context, tied activity and version/report pages beyond twenty with SQL totals independent of pagination.

On both native platforms, open queue/detail, change tabs with a dirty address, cancel replacement/withdrawal and confirm one deliberate command. Background reads do not animate explicit refresh. A successful active-page refresh may adopt current revision/address as the command baseline while retaining dirty input. Use the [approved moderation and report-page references](plan.md#approved-design-and-evidence), including initial skeletons, shared filters, grouped rows and disclosures.

From the active editor and pending/historical versions, open the dedicated report page and return to the same caller/draft/disclosure. Load twenty-one reports over multiple pages, retain admitted rows after append failure, reject repeated list-edge retries while failed, then accept the final row only on explicit Retry. Verify erased-reason fallback, exact server total, no terminal footer, theme changes, initial Error/Empty/Skeleton and enlarged-text reachability. Older versions use “Historique”, without source/replacement shortcuts or a separate version sheet. Include VoiceOver on iOS, software keyboards, minimum OSes and full session/erasure cases in native qualification.

## Original-account attribution erasure

Run actual F05 erasure with F08 submission/reporting/moderation. Preserve hidden/ownerless versions, counted reports, holds, decisions, quota flags and lineage while clearing owner/decision/reporter attribution and erased reasons. Re-registration restores no ownership. Race commands holding sporting roots with erasure before their account-lock phase: resumed commands refuse the old actor or reread anonymous ownership. Required participant/final-delete failures roll back local owners and suppress external cleanup.

For the real-server erasure and generated-consumer scenarios, install the locked npm dependencies and run `npm run generate`, then use Docker and a free local port 8289 to execute the real-server contribution consumer alongside the backend suites:

```sh
BLOCKOUT_CONTRIBUTION_CONSUMERS_TEST=true ./mvnw -B -ntp -pl apps/backend verify
```

Expect anonymized contribution/report history, preserved ownerless links and restrictions, and refused stale or erased-actor commands through the generated consumers. This controlled run uses identity/time doubles and Node networking with provider cleanup disabled; native and live-provider qualification remain separate.
