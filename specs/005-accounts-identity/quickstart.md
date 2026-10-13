# Quickstart: validate account lifecycle

**Scope**: [plan](plan.md), [model](data-model.md) and [contracts](contracts/README.md).

## Prerequisites

These scenarios validate the future implementation. No production workspace, runnable account service or native build exists in this planning task. Use the actual Maven/npm/Nx targets supplied by authorized implementation; do not treat prototype commands as production validation. Documentary checks are in the [README](../../README.md#verification).

Prepare isolated synthetic accounts: two distinct principals sharing an email, an existing linked identity, a dedicated preproduction Database user, missing provider email/age, paid and gifted qualification customers, and two devices. Keep provider identifiers, secrets and private evidence outside this repository. Destructive provider tests require their separately authorized scope; preproduction may not erase social or cross-connection principals in the shared tenant.

## Contracts and local data

Lint/bundle the canonical mobile root with F13's selected tools, generate Java interfaces/DTOs and TypeScript Query/Zod outputs, then compile/test actual consumers. Exercise multipart metadata plus image, omission versus null, trimming before username constraints, unknown request rejection, additional response tolerance, pending Problem Details and binary photo responses. Expected: valid requests bind correctly; invalid fields cannot enter accepted state or the mobile cache.

With PostgreSQL Testcontainers, race bootstrap for one principal and edits for a case-insensitive username. Expected: one account per principal, at most one winner for the username, shared email permitted. Race disjoint profile fields and then the same field; verify omitted-field preservation and last accepted supplied value. Reject malformed/oversize/non-square photos without changing the previous profile. Decode accepted storage and verify square bounds and removal of unrelated metadata.

## Authentication and account isolation

On physical iOS/Android builds, exercise production Google/Apple and preproduction native email/password signup/login, callbacks, cancellation, temporary outage, renewal and browser logout failure. Expected: production has no Database journey, preproduction no social method; actual connection/client/audience restrictions reject cross-environment credentials. Local logout clears credentials/private data even when browser logout fails, without claiming global provider/device logout.

Ordinary profile GET must neither create nor contact Auth0. Explicit establishment requires usable first email and preserves known information on later provider failure. Unknown age suspends only dependent actions; retained age survives ordinary profile recreation. Verify existing linked methods and same-email distinct principals without new linking.

Delay A's queries, photo preparation and entitlement callbacks across A → B and A → guest → A. Expected: no old result or not-yet-accepted mutation enters the new session. Directly call owner operations with another account, visitor/expired/wrong-client tokens and collector credentials; all refuse without disclosure or effects. F05's explicitly accepted same-subject JWT limit is tested as documented, not as invented immediate revocation.

Fail sign-out destination removal: local sign-out succeeds, no durable retry appears, and a late A removal cannot remove B's binding. A system notification may still arrive under the accepted limitation, but cannot open A's private data under guest/B.

## Native photo and accessibility

Select large, rotated and transparent photos, including platform-supported source formats needing conversion. Move/zoom the square crop, cancel, retry after preparation failure and save username/photo together. Expected: original library image unchanged; accepted output square, no enlargement, at most 1024 pixels/5 MiB; old photo preserved on refusal and removed only by explicit intent. Qualify the documented iOS crop limitation with actual large assets.

Check both themes, 320-point layout, large text, VoiceOver/TalkBack, focus order, meaningful labels, reachable actions and native permission denial. The web crop establishes none of these native guarantees.

## Durable erasure and manual continuation

Inject failure before acceptance: no external delete or local account loss. After acceptance, fail/process-stop each supplier boundary: the original account is unusable on both devices, local private data/destinations are erased, useful contributions remain unowned with their moderation unchanged, and the minimal pending request remains findable privately.

Lose the DELETE response and reread the original UUID. Expected: distinguish accepted pending state, inaccessible/absent resource and unavailable verification; no blind deletion of a later account. Repeat requests and sign in during cleanup: no provider polling/retry or automatic recreation, including a former linked secondary identity returning separately.

Using authorized private tools, inspect and complete original targets. Include delayed RevenueCat v2 deletion, historical customers left after purchase transfer and Auth0 subject reuse. Expected: acceptance is not called physical purge; unknown incarnation never authorizes destructive guessing; no complete profile, per-step ledger or recovery job is retained. Resolve the block only after original destructive work cannot affect a new lifecycle.

On two devices, test a still-configured RevenueCat SDK after erasure and the next startup/re-entry. Establish the actual provider outcome; do not assume customer deletion revokes installed SDKs. A returned account uses a fresh UUID and receives no old rights, age, follows, gifts or ownership. Separately exercise the accepted still-valid same-subject JWT case.

## Restoration and private obligations

Restore a still-valid qualification purchase explicitly on each original store after resolved erasure. Verify receipt-wide effects, new-account assignment, absence of gift/data resurrection, and assistance when original-store access is unavailable. Check historical targets and valid gifts under F14's full private continuity coverage; a sample or dashboard observation is insufficient.

Exercise the existing public privacy-page request route without installation/sign-in. Verify proportionate private ownership review, truthful pending/outcome communication and F11 retention. For a database restore, apply current erasures, rights and expiry before affected access or push. Inspect logs/errors with synthetic failures: no personal subject/email, credential, photo or provider payload leaks.
