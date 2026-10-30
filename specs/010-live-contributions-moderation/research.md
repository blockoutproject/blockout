# Research: live contributions and moderation

## Local address recognition

**Decision:** Parse with Java 25 `URI`, require an absolute HTTP(S) address, a nonempty recognized host and no user information. Compare case-insensitive exact domains or dot-delimited subdomains of youtube.com, twitch.tv and facebook.com; also accept youtu.be and fb.watch. Preserve the submitted path, query and fragment. Compare stored addresses literally for same-owner active/pending deduplication; no provider identity inference.

**Rationale:** [Java URI](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/URI.html) supplies syntax and host/user-info components without network resolution. Recognition establishes neither video existence nor availability. No provider request, SDK, redirect expansion or query cleanup is justified by the accepted journey.

**Alternatives:** Remote validation introduces provider availability and access dependencies without guaranteeing later playback. A custom URL parser adds no useful guarantee.

**Generated-binding qualification ([T001–T005](tasks.md)):** F08 URI properties retain `format: uri` without a redundant `minLength`. OpenAPI Generator 7.26.0 maps them to `java.net.URI`; combining length with that type generated `@Size` and caused valid MVC commands to fail with `UnexpectedTypeException`. [Jakarta Validation 3.1 §8.13](https://jakarta.ee/specifications/bean-validation/3.1/jakarta-validation-spec-3.1#builtinconstraints-size) supports character sequences, collections, maps and arrays, not URI. The owning schema correction preserves the URI contract and required fields; local HTTP(S)/host/credential rules remain T007/T010, rather than being claimed from DTO binding. No generator template, shared configuration or generated output is edited.

## Transactions, quotas and erasure

**Decision:** Use short JPA transactions and the existing sporting-root/account lock order. Match publication and sporting result acceptance serialize on the match. Lock the submitting account for quota evaluation across matches. Count recorded ordinary versions and distinct matches between successive Europe/Paris midnights; record quota participation when creating a version. Use partial uniqueness for active match versions, pending owner/match versions and reports with an existing author. Re-read original ownership after account locking before copying it into a reactivation.

**Rationale:** [Spring Data JPA locking](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html) supports repository lock metadata. [PostgreSQL partial indexes](https://www.postgresql.org/docs/18/indexes-partial.html) enforce conditional uniqueness, and [explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html) supplies transaction-scoped row protection. [LocalDate.atStartOfDay](<https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/time/LocalDate.html#atStartOfDay(java.time.ZoneId)>) expresses calendar boundaries; adding 24 hours would fail on Paris daylight-saving changes. F05 erasure retains report facts but nulls their author and reason; these anonymous rows must not collide.

**Alternatives:** Unsynchronized counts alone cannot enforce concurrent quotas. Synchronized counters, daily reset jobs and distributed locks add lifecycle work without need. A general decision/event ledger duplicates the necessary version state. F07's required internal effects stay in the same transaction; its ordinary post-commit push is not guaranteed delivery.

## Current-state reads and HTTP resources

**Decision:** Keep the existing mobile OpenAPI root, page-based twenty-item lists and shared Problem Details. Version-change commands carry the viewed contribution revision; administrative commands also carry the original actor account UUID. Reports retain their canonical reason-only input and exact version resource. A stale revision returns 409 before duplicate/no-op evaluation. A lost version-change response permits one bounded current-state read and a later explicit action, never an automatic write retry or exact historical receipt. The owner’s 2026-10-30 direction keeps reporting simpler: an ordinary error retains the reason, and a later explicit retry stays on the exact version. The report’s account/version uniqueness and unchanged-duplicate response preserve the first reason and effects without a dedicated recovery state or after-error read.

**Rationale:** The existing [contract conventions](../003-shared-quality/contracts/README.md), [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html) and [PATCH semantics](https://www.rfc-editor.org/rfc/rfc5789.html) fit completed synchronous operations. Body revisions follow already approved business-conflict semantics; no HTTP conditional header is introduced. Known current state is useful even when a delayed request can still finish afterward.

**Alternatives:** A request registry, durable job or replay queue adds retention and reconciliation work. Cursor snapshots are unnecessary. The personal proposal list requires an exact `proposalCount` across all owner/match versions, including active and terminal states, to satisfy the always-visible total; compute it with a SQL aggregate beside the page in the same repeatable-read transaction. No stored counter or downloaded-page count is needed. Other list envelopes are unchanged. No generic bulk endpoint or hypermedia framework is needed by the current callers; resource-shaped routes alone are not a claim of full REST conformance.

The private owner collection also projects its exact active member independently of pagination. An old active version may be outside the first twenty rows after moderator-created exempt versions; searching those rows cannot establish ownership or prefill the editor reliably. Reuse the existing owner/match/ACTIVE query in the same read snapshot rather than downloading history, exposing public attribution or interpreting a foreign-member 404 as global access refusal.

## Search, attention and mobile freshness

**Decision:** Use parameterized PostgreSQL substring queries over effective team names and recorded addresses, escaping LIKE metacharacters. Filter by season, platform and state. “To review” is a query over pending proposals, unresolved hiding waits and reported active versions. Use native Spring Data paging/Slice and TanStack Query's existing explicit fetching/invalidation, with no polling.

**Rationale:** [PostgreSQL pattern matching](https://www.postgresql.org/docs/18/functions-matching.html) provides ILIKE; [Spring Data query methods](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html) provide the ordinary query boundary. [TanStack Query invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) and [query cancellation](https://tanstack.com/query/v5/docs/framework/react/guides/query-cancellation) support the selected memory-only lifecycle. Current counts come from database aggregates, not downloaded pages.

**Alternatives:** A search index duplicates private moderation state. An “examined” state would create an unrequested workflow. Polling and persistent caching add freshness and privacy obligations without an accepted need. Retain manual refresh and ordinary action/read feedback.

## Evidence limits

The owner approved prototype [5413817](https://github.com/blockoutproject/product-prototype/commit/54138170f14775fe11132aaa61433329059cbfbb), then the scoped Figma reconciliation linked in [plan.md](plan.md), in the planning conversation. Prototype tests (206), TypeScript and its build passed; browser checks covered complete moderator actions, unavailable report reasons and current-state recovery. These observations establish fictional web behavior only.

Documentation establishes native capabilities, not their integrated execution. Generation/compilation, real PostgreSQL concurrency, native mobile networking/accessibility and F07 integration remain [future qualifications](quickstart.md). No provider account or application runtime was configured and no dependency upgrade was selected.

## Contribution draft lifetime under admission gates

F12 ordinary dependency refusals can remove the ordinary native stack, including its form.
A route-local `useForm` therefore loses a dirty address during a failed submission observation.
Retain the actual RHF control under the original account/session and match, following the
existing settings/classification editors; release it on clean departure, explicit abandonment,
departure after acknowledgement or session invalidation. A detached acknowledged write resets the retained control but leaves its registration available to an already reopened form. Commands and validated responses remain in
Query. This preserves the existing F12 gates without a copied draft store, persistence, replay
or a change to access policy. A real protected-router regression covers the 503 detour and
explicit reopening with the same draft and unresolved-command guard.
