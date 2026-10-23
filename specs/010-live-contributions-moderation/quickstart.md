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

## Versions, quotas and concurrency

With JUnit/Spring MVC/Testcontainers PostgreSQL and the real mappings/schema:

- Exercise exact seven-day age, unknown evidence, H−1 and unknown time; post-definitive proposals and professional/hidden refusal. Preserve the active link while a replacement is pending.
- Submit/cancel/withdraw/approve/reject, supersede multiple proposals and reactivate a historical source. Check ownership, no inherited reports, historical decisions and no quota refund. Cancelled proposals cannot be reactivated; their history remains readable.
- Accept third/refuse fourth ordinary version per account/match and third/refuse fourth distinct match per Paris day. Test 23/25-hour days, same-match continuation, reached-quota unchanged submission and later grant changes.
- Race submissions across the same and different matches, two decisions, result acceptance/publication and account erasure/reactivation. Assert one active version, bounded quotas, no stale overwrite, no restored attribution and full rollback of required internal effects on failure.
- Report one exact version; test duplicates, self-report refusal, erased-owner link, thresholds 3/10 and result changes without a new report. Erase several reporters: every fact remains counted, each reason/author is removed. Repeated reports never target the new active version.
- Verify approved/rejected/withdrawn paths leave or resolve the report hold as specified. F07 announcement allowances do not reset with reactivation or report counts; result composition observes the serialized current link.

## Reads and mobile

Use more than twenty versions/reports/matches where applicable, including identical timestamps, hidden matches and erased authors. Check deterministic tie-breaks, literal search, combined filters, current counts and clean offset bounds. Concurrent changes may move pages; refresh restarts at zero. “To review” retains reported active links until their situation changes, without a dismissal action. After resolving a hiding wait, old reports and masked versions leave the current badges but remain in version history; rejected-version totals remain correct beyond one page.

With Jest Expo/React Native Testing Library and native device checks, preserve drafts on refusal, disable duplicate in-flight actions and reread affected views after confirmation. Lose a response, delay its completion and fail the bounded read: show ordinary error/retry without replay or invented historical success. A failed refresh after confirmed success must not undo that success. Sign out/change accounts during reads/writes and reject old callbacks, including returning to the same account. No reconnect replay, polling or offline queue.

Qualify ordinary contribution/replacement, personal-contribution and report screens with the same content and current-journey drafts. Short filters use sheets; simple confirmation uses the platform alert and cancellation has no mutation effect. Exercise first/last inputs, final scrolling actions and keyboard/back separately on both platforms. Review the [approved design references](plan.md#design-reconciliation-and-evidence), light/dark themes, narrow screens, VoiceOver/TalkBack, enlarged text, focus and accessible action states. Existing sports foreground refresh and advertising behavior remain unchanged. Prototype tests and Figma approval do not qualify native networking, SQL concurrency, provider availability or accessibility.
