# Quickstart: qualify contributions and moderation

Run the [README verification commands](../../README.md#verification) for the existing workspace. The scenarios below require the F08 implementations and integrations tracked in [tasks](tasks.md); shared checks alone do not qualify them.

## Prerequisites

Use the [F13 environment](../003-shared-quality/plan.md) and [canonical contracts](contracts/README.md). Prepare disposable accounts with known Auth0 ages, ordinary rights and a separate stream-only moderator; nonprofessional/professional matches, hidden parents, known/unknown times and provisional/definitive results. Use controlled clocks and network doubles, never provider configuration or private production data.

## Contracts and access

Bundle/validate the mobile root, generate Java interfaces/DTOs and Orval client/Zod schemas, then compile the actual consumers. Qualify enums, required/absent/null fields, URI handling, additive responses, unknown request rejection and deterministic regeneration. Verify 201 Location, repeated-state 200, stale-revision 409, shared errors and no-store. A contributed public URL carries its exact version ID; a professional URL does not.

Reject another account, old erased account UUID, invalid session, ordinary user at an administrative route, wrong-environment token and ungranted maintenance bypass without effects. A stream-only moderator has all video actions and no unrelated administrative power. Test URI host-boundary spoofing, embedded credentials, malformed addresses, supported short/subdomain URLs and preserved query/fragment without network requests.

### Foundation boundary — T001–T005

The #223 foundation uses the existing pinned F13 stack, generators and ignored outputs. The existing XML master and README retain the disposable-baseline/freeze rule and separate migration/application roles; this lot changes no schema or environment. `ContributionContractTest` exercises generated Java request binding and response serialization/constraints; `contribution-contract.test.ts` exercises actual Orval calls through F13 and Query, including one JSON read/schema parse, rejected responses, erased attribution, hidden/dateless private context, finite enums, twenty-item pages, numeric bounds and opaque revisions. Public stream fixtures qualify URL/version-ID serialization and consumption only; actual F03/F08 pair selection remains future business mapping.

`ContributionAccessTest` composes real signature/environment checks, F05 identity resolution and F12 admission/grants against controlled account/settings/transaction adapters. `contribution-context.test.ts` uses the real session owner, generated calls and Query to qualify keys, native infinite-query page parameters and late reads/writes across A → guest/B → A even without effective cancellation. Strict unknown-command rejection is proved at MVC; Orval's request schemas check known fields, while generated Fetch validates consumed responses once. These are contract/context proofs, not business endpoints, SQL locking/erasure, device, design or provider qualification. Later mutations must recheck identity/grants under their ordered locks.

Automated foundation qualification on 2026-10-24 passed 45 Java and 52 mobile cases. Full README verification passed formatting, contract lint/bundling/generation, backend/collector verification, mobile lint/types/tests and iOS/Android JavaScript exports (922 backend, 211 collector and 555 mobile tests passed; six existing opt-in skips). CI's Alloy validation and deterministic regeneration of 306 ignored files passed. The full command remains failed because Expo Doctor passed 19/20: its live recommendations require newer patches for Expo, dev-client, file-system, font, image and router than the unchanged baseline pins. No dependency upgrade or check suppression is included; this external version-check failure remains visible for delivery review.

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

`ContributionPersistenceIntegrationTest` applies the complete master changelog to isolated PostgreSQL 18.6 using the existing role setup, then validates actual JPA mappings, conditional active/pending uniqueness, same-match lineage/hold, nullable ownership/decision attribution, preserved publication/later decisions and replacement flush ordering. One Hibernate filtered-aggregate query returns lifetime participating versions and distinct daily matches from one SQL statement snapshot, using successive Paris-midnight boundaries. Cases include empty usage, both DST changes, yesterday's match, same-day continuation and later state/grant changes. Pending ownerless versions coexist; report schema/deduplication remains T029.

The scoped 2026-10-24 qualification passes 82 pure policy cases and 21 PostgreSQL cases. These establish the local model and policies only. Production store/command orchestration, ordered lock races, actual account erasure, HTTP/mobile journeys and required F02/F07 atomicity remain with T008/T012–T017 and their owning later tasks; no production no-op participant or publication endpoint is supplied by this lot.

### Submission and atomic announcements — #252

T006/T008/T012–T014/T054 bind real F02 sporting roots, F05 original-account locks,
F06 confirmed relation unions and F07 inbox/allowance persistence. `SubmitContribution`
gathers current version-attribution accounts together with the actor/audience before sorted locking, rereads current grants,
age, ownership and quotas, and publishes only accepted active transitions. The same JPA store
supplies native twenty-item `Slice` reads in a short repeatable-read application transaction.
The generated submission interface supplies owner POST/GET and direct moderator POST without
exposing later lifecycle commands. [HTTP cases](../../apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionSubmissionWebMvcTest.java)
cover completed creation/current repetition, exact Locations, private reads, strict requests,
original owner/actor, current privileges and safe refusal/outage responses.

[Submission cases](../../apps/backend/src/test/java/com/blockout/backend/contributions/infrastructure/ContributionSubmissionIntegrationTest.java),
[private reads](../../apps/backend/src/test/java/com/blockout/backend/contributions/application/ReadOwnContributionsIntegrationTest.java)
[attribution-lock races](../../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAttributionIntegrationTest.java)
and [cross-owner cases](../../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAnnouncementsIntegrationTest.java)
use the actual migrated PostgreSQL 18.6 mappings and separately proxied production services.
They qualify replacement flush ordering, immutable quota participation, third/fourth limits,
same-day continuation, stale no-ops, current private visibility, both concurrent result/publication
orders, complete sorted account locking, concurrent same/different-match submissions, actor-row
removal, grant withdrawal and rollback on real required inbox constraint failure. Shared persisted
quota/DST qualifications remain in the preceding T007/T010/T011 evidence.

The first real result-producer regression failed with no recorded announcement; seven timing
cases and two real submission cases failed before their implementations. The completed targeted
qualification passes 57 integration cases (including 14 readiness-context regressions) and the
latest 39-case HTTP/transition/timing run. Test review used the Java-testing canonical examples:
real immutable values, explicit scenario inputs, no enclosing test transaction for commit proof,
and PostgreSQL-observed exclusion for races. Only time and the after-commit external observer
are controlled in the cross-owner fixture; no provider request occurs.

The [F07 qualification](../011-notifications-delivery/quickstart.md#atomic-producer-and-link-qualification--252)
owns announcement timing, handoff and allowance evidence. Controlled hiding/new exempt-version
and personal-row deletion fixtures are not real moderation-command or scheduled-purge
qualification; those remain F07 T046/#277 and T052/#267. Actual F05 erasure and native/mobile
journeys remain with their existing tasks. F08 T016/F03 public projection is not implemented here.

## Reads and mobile

Use more than twenty versions/reports/matches where applicable, including identical timestamps, hidden matches and erased authors. Check deterministic tie-breaks, literal search, combined filters, current counts and clean offset bounds. Concurrent changes may move pages; refresh restarts at zero. “To review” retains reported active links until their situation changes, without a dismissal action. After resolving a hiding wait, old reports and masked versions leave the current badges but remain in version history; rejected-version totals remain correct beyond one page.

With Jest Expo/React Native Testing Library and native device checks, preserve drafts on refusal, disable duplicate in-flight actions and reread affected views after confirmation. Lose a response, delay its completion and fail the bounded read: show ordinary error/retry without replay or invented historical success. A failed refresh after confirmed success must not undo that success. Sign out/change accounts during reads/writes and reject old callbacks, including returning to the same account. No reconnect replay, polling or offline queue.

Qualify ordinary contribution/replacement, personal-contribution and report screens with the same content and current-journey drafts. Short filters use sheets; simple confirmation uses the platform alert and cancellation has no mutation effect. Exercise first/last inputs, final scrolling actions and keyboard/back separately on both platforms. Review the [approved design references](plan.md#design-reconciliation-and-evidence), light/dark themes, narrow screens, VoiceOver/TalkBack, enlarged text, focus and accessible action states. Existing sports foreground refresh and advertising behavior remain unchanged. Prototype tests and Figma approval do not qualify native networking, SQL concurrency, provider availability or accessibility.
