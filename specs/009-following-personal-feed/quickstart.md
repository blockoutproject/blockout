# Quickstart: qualify following and the personal feed

The executable workspace and T001–T005 following contract/context foundation are available. The relationship, calendar and native scenarios below remain future qualifications. Use the actual [README verification commands](../../README.md#verification) and the owning task scope; passing foundation checks does not complete the later journeys.

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

## Relationships and calendar

With Testcontainers PostgreSQL and the real schema, qualify repeated true/false, unique constraints, concurrent devices and account erasure racing a write. Last server-recorded state wins; erasure cannot leave or recreate an orphan relation. Hiding/restoring changes visibility without changing relation identity or the count's underlying truth. Re-follow uses a new relation identity.

Follow both teams and their pool: each match appears once. Remove origins in turn: a match remains until its last selecting follow is removed. Verify historical seasons, All seasons, default selection and no automatic interseason transfer. Exercise F03's dates, result categories, complete-day boundaries and pagination using current visibility.

Read beyond one twenty-item follow page, including equal names and French accented names. Verify page/continuation bounds and clean BadRequest handling before native offset conversion, without overflow or a false end. Verify stable ordering, no false end on a page error and a fresh traversal after concurrent changes. Check the selected PostgreSQL image supplies the intended French collation and Hibernate executes the ordering expression.

## Mobile journeys

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
