# Quickstart: validate account lifecycle

## Prerequisites

This guide validates the future [F05 implementation](plan.md). No account runtime or native build exists yet; use the actual implementation targets when available. Current documentary commands are in the [README](../../README.md#verification).

Prepare synthetic principals for shared email, existing linked identities, missing email/age and dedicated preproduction signup, plus two devices and qualification purchase/gift accounts. Keep private evidence outside the repository. Destructive provider tests require authorization and must not target social or cross-connection principals from preproduction.

## Contracts and profile data

1. **Generate and compile** the canonical mobile contract through the [F13 toolchain](../003-shared-quality/quickstart.md#contract-boundary). Exercise multipart binding, omission/null, the photo-action enum, username normalization, pending Problem Details and binary responses. **Expected:** valid requests/responses cross the Java/TypeScript boundary; invalid ones are refused before persistence or caching.
2. **Race creation and profile edits** with PostgreSQL Testcontainers: one principal, competing usernames, disjoint fields and the same field. **Expected:** one account per principal, case-insensitive username uniqueness, shared email allowed, omitted fields preserved and last accepted supplied value retained. A supplied unchanged username succeeds; an empty change document is refused.
3. **Save and remove photos** together with username changes; submit malformed, oversized and non-square content. **Expected:** atomic save, previous profile preserved on refusal, accepted pixels within the contract bounds without unrelated metadata, removal only by explicit intent.

## Authentication and isolation

1. **Sign in on physical iOS/Android:** production Google/Apple and dedicated preproduction email/password signup. Exercise callback, cancellation, outage, renewal and failed browser logout. **Expected:** configured environment/client/audience restrictions apply, and local logout clears credentials/private state despite browser failure. This does not claim global provider logout.
2. **Read and establish accounts:** ordinary GET, first establishment without usable email, explicit login with provider failure, missing-age retry, linked methods and same-email distinct principals. **Expected:** GET neither creates nor contacts Auth0; missing first email blocks creation; known email/age survive failure; only age-dependent actions wait for unknown age.
3. **Switch A → B and A → guest → A** while queries, photo preparation and entitlement callbacks are delayed. **Expected:** no prior-session result or unaccepted action enters the new session. Different-owner, visitor, expired/wrong-client/environment and collector credentials cannot perform owner operations.
4. **Fail push disassociation on logout, then reassociate B.** **Expected:** local logout succeeds without durable retry; delayed A removal cannot remove B. Any still-delivered A system push cannot expose A's private inbox under guest/B.

## Native photo and shared control

Select large, rotated and transparent assets, including supported source formats needing conversion; crop, cancel, fail preparation and save. **Expected:** the library original remains unchanged; prepared output is square, not enlarged, at most 1024 pixels per side and 5 MiB. Qualify the documented iOS large-image crop limitation.

Apply [F13 accessibility checks](../003-shared-quality/quickstart.md#native-mobile-and-approved-design) to the common image control, including native permission denial, 320-point layout and both themes. **Expected:** profile, sporting and support fields share selection/replacement/removal behavior while retaining owner-specific limits and removal meaning. The prototype omits native picker/crop UI and cannot qualify it.

## Erasure and return

1. **Fail before acceptance, then after each supplier boundary or process stop.** **Expected:** before acceptance, no destructive effect; afterward, unusable account on both devices, local erasure and preserved unowned moderation state, with minimal pending references discoverable privately.
2. **Lose the DELETE response, repeat it and sign in while pending**, including a formerly linked secondary identity. **Expected:** the original UUID's result is recoverable with valid ownership; no provider polling, cleanup retry or premature recreation. Inaccessible/absent API state is not proof of supplier purge.
3. **Exercise successful initial completion and incomplete cleanup.** **Expected:** close only when the [completion conditions](plan.md#erasure-and-manual-resolution) are established; otherwise resolve manually with existing private tools. Include asynchronous RevenueCat acceptance and reused Auth0 subjects; uncertainty never authorizes destructive guessing.
4. **Return after resolution**, with a second device still holding its old RevenueCat SDK association. **Expected:** a fresh business UUID and no old profile, rights, age, gifts, follows or attribution; no reassociation of the erased account at startup/re-entry. Measure the actual cross-device provider behavior. Verify the accepted same-subject token-validity limitation in [FR-035](spec.md#deletion-and-return), without assuming immediate revocation.

## Integration with other owners

- **F09 purchases:** restore a valid qualification purchase after resolved erasure on each original store. Verify current-account assignment without old data/gifts; use [F09 qualification](../006-pro-subscriptions/spec.md#success-criteria) for receipt-wide transfer and assisted exceptions.
- **F14 continuity:** supply the necessary historical customer references and valid-gift evidence to the [transition qualification](../014-v1-v2-transition/spec.md#success-criteria). Native restoration does not prove population coverage or erase old customer records.
- **F10/F11 private requests:** exercise the existing public privacy-page route under [FR-037–FR-038](spec.md#deletion-and-return); ownership verification precedes erasure and outcome communication remains truthful. Inspect synthetic diagnostics for personal data, token or payload leakage.
- **F13 restoration:** include pending/resolved account erasure in the [isolated restore qualification](../003-shared-quality/quickstart.md#initial-restore-and-activation-condition); current erasure, rights and expiry apply before affected access or push resumes.
