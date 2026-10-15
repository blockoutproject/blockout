# Quickstart: validate search and discovery

**Scope**: [plan](plan.md), [data model](data-model.md) and [canonical contracts](contracts/README.md).

## Prerequisites

This guide qualifies the future implementation. The product runtime and its Maven/npm/Nx targets do not exist yet; run the actual targets supplied by authorized implementation, not invented commands. Current documentary checks are in the [README](../../README.md#verification).

Use synthetic sporting fixtures, PostgreSQL 18.6, OpenSearch 3.9.0 and the selected Java client on Java 25. Keep provider data and production credentials out of fixtures. Start the isolated services through the implementation's supported setup and apply its current baseline before the scenarios. Native checks use the F13 iOS/Android builds and established test tools.

## Contracts and access

Lint/bundle the canonical root and generate the Java/TypeScript consumers at the same source revision. Compile/test actual consumers and regenerate deterministically. Check absent fields, additive response properties, enum rejection, Unicode length, repeated UUID query-array encoding and cursor/context validation. Expected: 200 Unicode characters are accepted, longer input is rejected without truncation, all meaningful terms are retained, wrong parameter combinations fail, and invalid JSON never enters the cache as success.

Read as guest, free, Pro and unknown entitlement. Exercise maintenance and explicit bypass with absent, expired, wrong-environment and unauthorized tokens. Expected: public search needs no account; existing F12 refusals and safe Problem Details apply. Stop the engine or fail a shard: no failure becomes a successful empty list or end. Verify TLS trust, namespace-scoped privileges and that neither mobile nor collector reaches the engine directly.

## Matching, choices and complete browsing

Seed names/context spread across fields, accents/case, verified aliases, scoped division abbreviations, formats/genders and same-named distinct identities. Exercise `eag ly`, `Eagles Lyon` and `Volly Lyon`; verify direct matches are favored and every term counts. Combined typo/partial-word forms are not an acceptance promise. Check full and intermediate prefixes near the accepted length boundary through the real analyzer, including folding expansion such as `ﬃ` → `ffi`; nonempty punctuation-only input must not become examples. Strict filters never broaden to fill results.

Include old and future seasons, an inactive division, a club without teams and an unattached professional team. Expected: options/defaults and all-season selection follow F04; absent relationships are not invented. Remove a selected choice, then independently fail the choices read: only established removal resets it.

With unchanged data, browse sets of 47 and more than 10,000 eligible matches, including equal scores. Expected: every identity exactly once, no total cap, no false total and no empty continuation pages. Interleave ineligible candidates and exhaust the processing bound: either eligible results/established end or ordinary retryable failure. Verify an unconsumed candidate is not skipped by the returned cursor. Change data or switch index generations during traversal, then refresh: current results recompose without mixing old pages or lasting omissions.

For empty text, verify five or fewer examples, stable retained order across tabs/detail return/refresh, exact filters, and no replacements after a retained example becomes restricted. Changing filters permits a new selection. The absence of a cursor in examples does not advertise catalogue completeness.

## Projection and privacy

Commit a name, alias, classification, club attachment or effective city change. Expected: the after-commit task reads current data and updates all dependent resources. Roll back the business write: no projection effect. Run the non-web operator entry point: it starts no second index scheduler, and its relevant changes appear through the serving backend’s next full rebuild. Change only a score: no unnecessary search rewrite. Restrict a city while the index still contains it: no old-city match or old contact reaches the response; a candidate may be temporarily omitted until reindexing.

Fail a targeted update or stop the process before queued work runs. Restart and exercise the fixed-delay rebuild: lost work catches up without a durable retry record. Mutate data during a rebuild; queued tasks execute afterward using current values. Fail one bulk item, a whole request or the final refresh: old usable aliases remain. Lose the alias-update response: reread native alias state before cleanup, and never delete an active generation. Fail cleanup: diagnostic only, no destruction of unrelated indexes.

Restore authoritative PostgreSQL into isolation and rebuild the derived search state before use. Verify prior valid results survive an interrupted replacement, current restrictions still apply, and failure/last-success diagnostics contain no query text, credentials, contacts or raw payload. A scheduled run or successful HTTP bulk envelope alone is not proof of an indexed generation.

## Mobile journey

Using the existing Jest/native scenarios, change text/tabs/filters rapidly and deliver old requests late. Preserve independent filters, retained examples and valid scroll context. Fail refresh/next page, retry explicitly, reconnect and switch accounts. Expected: no mixed contexts, silent replay, private old-session data or false end; authorized previous content remains usable until successful replacement.

Open/close F03 sheets and exercise the existing F11 counter: filtering, scrolling, refresh and return add no advertising trigger. Check both themes, VoiceOver/TalkBack, enlarged text, selection/focus, retry and absent-context cards. No character counter, new index-lag screen or native-interface mockup is introduced.

## Evidence limits

Official documentation and scoped static V1 inspection support the decisions, not their integrated execution. No engine run, Java 25/client compilation, generated consumer compilation, native qualification, deployment or restoration has been performed for this plan. Record those future outcomes in their owning test/delivery tools; do not infer them from passing documentary checks.
