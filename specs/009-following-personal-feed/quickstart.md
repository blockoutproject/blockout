# Quickstart: qualify following and the personal feed

The executable workspace, T001–T005 contract/context foundation and T006/T007/T009/T010/T012/T013 backend relation slice are available. Full erasure orchestration, calendar and native scenarios below retain their owning qualifications. Use the actual [README verification commands](../../README.md#verification) and the owning task scope; passing foundation checks does not complete the later journeys.

## Prerequisites

Use F13's selected backend/mobile environment and the authored [contracts](contracts/README.md). Prepare two disposable accounts, two viewable sporting seasons, teams/pools with overlapping matches and at least 21 follows in one list. Include a hidden target, homonymous names and matches in both F03 categories. Use controlled API failure/delay doubles, not provider changes or private production data.

## Contracts and access

The foundation is exercised by `FollowingContractTest`, `FollowAccessTest` and the mobile
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

`FollowEligibilityTest` and the relation integration suite exercise immutable current
account/target/relation values, overlapping origins without duplicate recipients and the difference
between an unchanged relation and a removed/recreated UUID. The consumer supplies exact sporting
origins, with no display-season preference. F07 retains account/sporting lock coordination and
notification selection, cancellation and delivery; these checks establish none of that runtime.

The focused command is:

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=FollowStateWebMvcTest,FollowEligibilityTest,FollowingContractTest,FollowAccessTest -Dit.test=FollowRelationsIntegrationTest
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
reopening a restored target retries its failed member read. A new explicit attempt retires superseded
terminal mutation entries, so an older failure cannot return when another control unmounts.
response loss performs one bounded member read without replay, and failed observation leaves an
ordinary explicit retry of the same requested value. A successful observation is not announced as
proof of the original write or delayed cancellation.

Controlled future infinite-query consumers prove cancellation of former traversal, visible first-page
reload, hidden-query deferral and preserved write confirmation after dependent-read failure. These
are interface tests, not completed list/calendar screens or their integrated qualifications.
Confirmation names the public target's season without writing a personal season selection. The
generated boundary remains unchanged; no public follower-count UI is delivered here.

```sh
npm run test --workspace=@blockout/mobile -- --runTestsByPath src/features/following/__tests__/follow-action.test.tsx
```

These JavaScript checks establish no actual authentication provider, account-erasure orchestration,
native accessibility or design qualification. T016, later story tasks and T045 retain their scopes;
live Dynamic Type [#433](https://github.com/blockoutproject/blockout/issues/433) and iOS input
[#449](https://github.com/blockoutproject/blockout/issues/449) remain deferred.

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
