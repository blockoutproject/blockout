# Implementation Plan: Search and discovery

**Branch**: `tech/50-search-discovery-plan` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md) and the accepted [F03 consultation](../007-sporting-consultation/plan.md) and [F02 sporting data](../002-sporting-data/plan.md) plans.

## Summary

Provide public club, team and pool discovery through the existing backend and mobile application. PostgreSQL remains sporting truth; OpenSearch supplies tolerant candidates with strict filters and complete pagination on unchanged data. Current sporting rules govern every returned representation. After-commit updates and a regular full rebuild maintain the derived indexes without a broker, durable work queue or recovery platform.

## Technical Context

**Language/Version**: Java 25 Temurin/Spring Boot 4.1.1 and TypeScript/Expo SDK 58, React Native 0.88, React 19.3.0 under [F13](../003-shared-quality/plan.md#technical-context).

**Primary Dependencies**: OpenSearch 3.9.0, official `opensearch-java` 3.10.0 with Apache HttpClient 5 transport; existing Spring transaction events and scheduling, JPA/Hibernate, TanStack Query and F13 OpenAPI generation. No Spring Data OpenSearch layer. Java 25/client integration is a qualification gate; the published client matrix does not list Java 25.

**Storage**: PostgreSQL 18.6 owns sporting facts, verified identity aliases and division terms. Three derived OpenSearch indexes per environment; mobile visit state stays in memory. No search history, persistent mobile search cache or server cursor store.

**Testing**: JUnit/Spring MVC, Testcontainers with PostgreSQL and the selected OpenSearch image, generated Java/TypeScript integration, Jest Expo/React Native Testing Library, repository documentation/contract checks and native accessibility qualification. [Quickstart](quickstart.md) records actual results and limits.

**Target Platform**: Existing Linux backend and native iOS/Android app. Separate private production/preproduction OpenSearch instances and volumes on the existing VPS, sharing its host-failure boundary.

**Project Type**: Search capability in the modular backend, a derived search engine and the existing mobile feature; no additional business service.

**Performance Goals**: None beyond correct bounded operations and the accepted propagation behavior. No latency, load, capacity or monthly availability programme.

**Constraints**: Public free access; current restrictions override indexed or retained data; all meaningful query terms count; no silent result cap or failure-as-empty; no provider/engine call inside a business SQL transaction; no automatic ordinary mobile retry.

**Scale/Scope**: Clubs, seasonal teams and pools only. Five empty-text examples, up to twenty textual results per page, no total limit. Input remains at most 200 Unicode characters, without a visible counter or another token-count limit.

## Constitution Check

| Principle           | Before research / after design                                                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification   | Accepted format/gender search, scoped division abbreviations and matching limits are integrated into F04. No revision journal or implicit behavioral replacement.                                                                                                               |
| II — Ownership      | F02 owns identities, effective data, aliases, classification and visibility; F04 owns candidate matching and browsing; F03 owns destinations. F13 incorporates only the additional derived infrastructure.                                                                      |
| III — Design        | The [existing discovery approval](spec.md#user-scenarios--testing) covers the unchanged field, filters, examples, cards and retry states. Backend matching/indexing decisions introduce no material visual or interaction change; no new prototype or Figma approval is needed. |
| IV — Contracts      | Extend the canonical mobile root. Reuse existing representations and errors where meanings match; no editable contract copy or committed generated output. Boundary suites qualify generation; owning tasks qualify business behavior.                                          |
| V — Proportionality | Native search, transaction events, one scheduler and atomic aliases. No PIT lifecycle, durable outbox, distributed locks, custom relevance engine or separate operator UI. Alternatives and limits reside in [research](research.md).                                           |
| Prerequisites       | The accepted [F03 plan](../007-sporting-consultation/plan.md) and F02/F13/shared identity/access/privacy decisions supply the required boundaries. No unresolved design or product arbitration remains.                                                                         |

No constitutional exception is required. Passing this documentary gate does not establish runtime compatibility. A failed qualification blocks adoption of the affected mechanism rather than permitting an invented workaround.

## Project Structure

### Documentation (this feature)

```text
specs/008-search-discovery/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/README.md
├── quickstart.md
└── checklists/requirements.md
```

### Source code

```text
contracts/http/mobile/discovery/  # Canonical search/read definitions
apps/backend/                    # Search application cases and OpenSearch adapter
apps/mobile/                     # Existing discovery queries and visit state
```

**Structure Decision**: Use the F13 applications and feature-first boundaries. Search consumes the sporting application API, not another module's JPA entities/repositories. Its engine port has a real external responsibility; no generic repository or query-builder framework is introduced. Generated interfaces, DTOs, clients and bundles remain build outputs.

## Matching and current data

Search hydrates accepted candidate sets through F03's batched current summaries, keeping the same repeatable-read boundary and F02 visibility. Shared season/division/presentation inputs use set-based scalar projections, including logo presence without loading image bytes. The [common composition qualification](../003-shared-quality/quickstart.md#shared-backend-reads-images-and-authority) compares one and twenty candidates and retains current-city and visibility regressions; no application cache is introduced.

The backend indexes the [data model](data-model.md): current public/source full and short names, verified owner-scoped aliases and the permitted context for each resource. Teams and pools also index their format/gender labels and relevant division abbreviations. Abbreviations belong to the identified division; they are not global text substitutions or a reason to merge identities. Professional teams without a club have no invented club or city.

Use native `copy_to` to form two aggregate text fields from the permitted source fields. Normalize with standard tokenization, lowercase and accent folding, without stop-word removal or stemming. One aggregate indexes word prefixes using `edge_ngram`; the other retains whole words. Explicitly set the prefix field’s `search_analyzer` to standard tokenization, lowercase and accent folding only, matching the whole-word search analyzer. Prefix expansion runs only at indexing time, never on the query. Search submits the whole text to two alternative `match` clauses, each with `operator: and`: prefix matching, or ordinary whole-word typo tolerance (`fuzziness: AUTO`). Require at least one complete branch. Native optional boosts on exact names and direct whole-word matches favor them over context or fuzzy matches without promising an absolute ordering.

Configure prefix/token bounds to cover every accepted 200-character query after normalization, with original words preserved; no query truncation or separate token limit. The initial edge-gram range is 1–800 with the corresponding native `max_ngram_diff`; standard tokenizer maximum length is 1024. This allows accent-folding expansion without losing an intermediate prefix. Qualify these settings through the engine analyzer and end-to-end fixtures; weights remain ordinary tuning, not additional product rules. No per-token query decomposition, synonym/fuzzy workaround or custom scoring script.

All meaningful terms must match, possibly across fields. `eag ly` can match Eagles/Lyon through prefixes; `Volly Lyon` can use typo tolerance. Arbitrary combinations such as `Volly ly` are not guaranteed. Exact season/division/format/gender filters remain outside those text branches. Nonempty input that produces no searchable terms returns no textual matches, not examples or all documents.

OpenSearch supplies candidate identities, sort values and the indexed city needed for the internal current-value check. Before returning a page, load current public representations and recheck F02 visibility and exact filters. Compare the candidate's indexed city to the current authorized city; reject a stale candidate until it is reindexed, including when the query would also match its name. This simple conservative check may temporarily omit a result, but cannot grant a match using a replaced/restricted city. It neither hides the business identity nor starts a separate correction process. Return current SQL-owned presentation, never raw index documents or obsolete contacts.

## Reads, pagination and examples

[Canonical contracts](contracts/README.md) add `GET /clubs`, `/teams`, `/pools` and `/sporting-search-options` to the existing mobile API. Public reads do not wait for account or Pro state. Optional maintenance bypass follows F12; invalid explicit bypass never silently becomes ordinary public admission. Use existing no-store headers and Problem Details, including the shared `AccessUnavailable` response for maintenance or ordinary dependency failure.

Nonempty text returns up to twenty results. Order by `_score` descending and a keyword UUID ascending, using native `search_after`; use one primary shard and zero replicas per resource index so ordinary scoring has no replica-selection variation. A cursor contains only the native score/UUID boundary through ordinary serialization. Validate parseable sort values; it grants no access and contains no retained search session. Clients continue with the same criteria; a cursor reused under different criteria may skip results, without bypassing current SQL visibility. Generated MVC binding owns declared query types, enum wire conversion and bounds; ignore unknown parameters instead of maintaining another query grammar. Retained examples keep their native supplied UUID order and semantic mode exclusions. Do not add a cursor signing service or persist result sets.

No PIT or snapshot is retained. Unchanged indexed data has a stable complete traversal, including beyond 10,000 results. Concurrent updates or an index replacement may change ordering: de-duplicate identities in the current mobile list and let ordinary refresh restart it. Refresh replaces a list only with its own new context, never appending old pages.

Hydrate each nonempty native engine batch of at most 200 candidates once through `HydrateSearch.current`, then consume the same score/UUID order with current eligibility and useful lookahead. An empty native batch needs no SQL hydration. Evaluate at most ten batches until a nonempty eligible page or exhaustion is established. A mostly eligible batch may hydrate its unused tail; this bounded extra work is accepted without a latency or throughput claim. Advance only past candidates actually consumed, never past an unreturned eligible candidate. If bounded processing establishes neither results nor an end, return the ordinary retryable failure. Successful partial pages may continue; a native engine timeout or exception is not a successful search. The request sets `allowPartialSearchResults(false)`; typed decoding and ordinary failure translation replace local shard/sort/ID consistency certification. An omitted cursor means exhausted textual traversal; no empty continuation page or hidden total cap.

Empty/whitespace-only text selects up to five eligible examples in stable UUID order, with no pagination. The mobile retains their identities and order during the visit; `exampleIds` rereads only those identities under current restrictions and filters, without filling missing ones with replacements. An initial visit or changed filters selects examples afresh; there is no randomness, personalization or geolocation. Clearing text reuses retained examples for the same valid filter context.

Search options come from current PostgreSQL viewability, separately for teams and pools: available seasons newest sporting start year first, and active divisions. The existing format/gender enums are shared. Absent season means all seasons; the mobile supplies the newest available season by default, including an already published future season. A successful catalogue reload reconciles unavailable choices under F04; a failed read preserves earlier choices.

## Projection lifecycle

`SearchIndexProperties` owns resource alias names for both `OpenSearchEngine` queries and `OpenSearchProjectionWriter` writes/publication. Environment prefix and existing alias values remain unchanged; the native bulk and uncertain-publication rules below remain authoritative.

Use one dedicated Spring `ThreadPoolTaskScheduler` with one thread in the serving backend instance. Both after-commit targeted work and full rebuilds execute on that scheduler, without a nested async executor. Relevant F02 commits submit identities or affected scopes; execution rereads current sporting state rather than indexing an event payload. Club changes reach dependent teams, division changes reach teams and pools, and participation/source visibility changes reach their affected identities. Score-only changes require no search update.

Schedule a full rebuild as soon as the application starts, then with a fixed delay of one hour after the preceding run completes. This configurable initial cadence is ordinary catch-up, not a freshness SLA. Failed targeted work, process interruption or lost in-memory submissions are recovered by the next full run. Log failed submissions and item failures through F13; no durable queue, checkpoint or per-operation retry state is added.

For a rebuild, create new generation indexes for all three resources, read PostgreSQL in bounded batches and send native bulk writes outside SQL transactions. Use the native aggregate bulk failure flag, retaining safe item counts on failure. Explicitly refresh the completed candidate indexes before atomically replacing all three aliases in one native operation. Never clear the active indexes first. Keep prior usable aliases on failure and start again at the next regular run. Tasks queued behind the rebuild subsequently reread current state and apply to the active aliases, so stale payloads cannot overwrite newer data. Current read guards still apply during the build.

Use short SQL reads; a rebuild is not a cross-resource business snapshot. Its temporary mixed-age projection is subject to the same current visibility guards and eventual catch-up as targeted indexing. Clean only inactive/temporary generations in this application's environment namespace, after a confirmed complete publication and a fresh alias read. An uncertain alias acknowledgement is a failed run, even if the switch already applied. Keep its candidates until the next successfully acknowledged full run; an old-state read cannot cancel an in-flight switch. Do not reclassify uncertainty as success through a second metadata protocol. A cleanup error is logged, not treated as a successful deletion or a reason to delete an active index. No persisted rebuild-state machine is required.

Only the serving backend process starts this scheduler and writes indexes. Non-web operator/migration invocations do not start it; their relevant data changes are covered by the next full run. This assumes one serving backend instance per environment, consistent with stop-before-start deployment. Overlapping serving replicas or rolling deployment would require a new coordination decision.

## Mobile state and navigation

Use native TanStack Query ownership and generated functions/keys in F05's private client lifetime. One textual infinite query holds the normalized type/text/filters; the server cursor remains `pageParam`. A visit/context key owns its example page, and refresh submits UUIDs from that accepted page without another response store, key migration or cache subscription. An exhausted selection stays empty until a new visit/filter context. Initial sporting reads wait for current choices before applying the default. Text is shared across tabs; team/pool filters remain separate and are ignored on Clubs. Ordinary public reads need no credentials; explicit bypass captures the original principal. No distributed session epochs or F03 refusal timestamps remain.

The existing three resource tabs use F13's shared `PagedTabs` [native paging and scroll composition](../003-shared-quality/plan.md#native-paging-and-scroll-composition). The fixed chrome contains the tab rail, then the single shared RHF query field/current filter action and the count/clear heading, all over the same scroll material. Accepted rows use the official `TabLegendList` adapter. Blank, pending, empty and failed content use F13's shared fitting-feedback composition so they add no artificial header-collapse reserve; real enlarged-content overflow stays reachable. Neither projection mounts a Search refresh control. Changed shared text resets every scene through RNCT's public ref; changed sporting filters reset their active scene, while unchanged-context returns retain position. The selected business resource controls the textual Query subscription, so native neighbour mounting starts no read and returning follows ordinary native freshness and retry behavior. The [shared native paging research](../003-shared-quality/research.md#native-paging-and-navigation) owns library selection and scoped native evidence; Search supplies automatic native continuation and the shared failure toast and explicit footer retry while retaining its no-refresh behavior.

The native search stack scopes a visit provider to its index, draft-filter and single-choice routes. Applied team/pool criteria live in component state; RHF owns the unapplied snapshot. The draft-filter and single-choice leaves live under the structural `(sheets)` group, preserving their URLs and existing visit owner. They reuse F13's `formSheet`/`fitToContents` options and intrinsically sized first `ScrollView`: native screens owns maximum height and overflow instead of fixed screen fractions or application geometry. `SheetContent` owns the single body inset, `SelectField` keeps field presentation, and `EntryGroup`/`SelectionRow` align choice spacing, separators and radio/check state with the other bounded lists. Closing discards the draft, reset changes only that snapshot, and Apply commits only its sporting tab. No callback registry or stored search history is introduced.

Each new visit reads current generated options before initializing its default, using Query's observer-local `isFetchedAfterMount`; ordinary tab and sheet returns retain the same observer. Later successful catalogue changes reconcile disappeared season/division identities while retaining valid criteria and other draft edits. Failed reads preserve the previous known choices. The same-valued implicit and explicit season share one selection and query context.

Native query keys isolate superseded text/filter selections and F05's private client isolates principals. Additional-page failure retains usable rows, reports feedback from the initiating action and keeps explicit retry. Search exposes no pull-to-refresh or refresh button; native freshness, read retries and current owner invalidation remain normal library behavior. No text page or example page is rewritten after a neighbouring detail refusal. A refused detail shows its own error and locally purges sensitive facts; benign search cards can remain stale until their own server refresh. Established exhaustion removes continuation without an end-of-results label. No dispatch timestamps, global subscriptions, transitive projection surgery, persistent search history or second result store is required.

The approved Search header's reporting action opens the existing `supportHref({ screen: "search" })` route. F10's finite screen mapping owns the “Recherche” provenance; its existing target mapping continues to preserve a known attempted UUID from detail journeys. Search text, tab/filter state and errors are not support URL/context fields. Returning from support retains the mounted public visit; F05/F13 invalidation separates old work and F10 independently discards its private draft. F12 global gates still remove ordinary routes, so a visit removed by that gate is not a retained applicable context.

F03 identity-based destinations and F11 opening counter remain unchanged; filtering, scrolling and returning add no interstitial trigger.

## Operations and validation

Run one isolated OpenSearch instance per environment with its own volume/configuration/secrets, on the existing VPS. Native security uses verified TLS, trusted certificates and backend credentials restricted to the necessary index/alias namespace and operations. No public port, demo credentials or trust-all client. The collector and mobile never access it. Both environments still share host loss; no extra availability promise is made.

Search indexes are disposable derivatives. PostgreSQL backups preserve the authoritative inputs; restoration rebuilds indexes before search is usable. No extra backup chain, Dashboards deployment or operator screen. Existing private logs/metrics and native Grafana alerts expose failed targeted/rebuild work and last successful rebuild; an alert closure is not proof of search recovery. Exclude query text, city values, credentials and raw engine/provider payloads from telemetry.

[Research](research.md) records decision rationale; [quickstart](quickstart.md) distinguishes implemented engine/client and contract checks from outstanding business, native, restoration and deployment qualifications. Run the [README verification commands](../../README.md#verification) for affected boundaries; [tasks](tasks.md) track the remaining work.
