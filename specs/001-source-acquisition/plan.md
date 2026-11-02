# Implementation Plan: Source acquisition and operations

**Branch**: `tech/47-source-acquisition-plan` | **Date**: 2026-10-14 | **Spec**: [Source acquisition](spec.md)

**Input**: [spec.md](spec.md), [F02](../002-sporting-data/plan.md), [F12](../013-administration-app-configuration/plan.md) and [F13](../003-shared-quality/plan.md).

## Summary

A separately deployed Java collector reads supported official FFVB and LNV sources and sends normalized observations to the existing backend. The backend remains the sole PostgreSQL business writer. Native scheduling, bounded HTTP reads, source-specific parsing and current operational state implement the accepted cadences and manual controls without a queue platform, retained raw documents or automatic pipeline recovery.

The scoped prototype and Figma scope are approved. [Tasks](tasks.md) track implementation and remaining qualifications.

## Technical Context

**Language/Version**: Java 25 Temurin; mobile TypeScript under the [F13 baseline](../003-shared-quality/plan.md).

**Primary Dependencies**: Spring Boot 4.1.1, its managed Spring Framework 7.0.9 and Apache HttpClient 5.6.4; jsoup 1.23.2 for HTML; Apache Commons CSV 1.14.1; Resilience4j RateLimiter 2.4.0 only. Existing Spring Data JPA, generated RestClient interfaces and mobile TanStack Query remain as approved.

**Storage**: PostgreSQL 18.6 through backend application services. Collector memory holds bounded work and a bounded native HTTP image cache; no persistent source archive.

**Testing**: JUnit, Spring MVC, Testcontainers PostgreSQL; existing Expo/React Native testing tools for operator interactions; sanitized or synthetic parser fixtures. Live providers are not CI dependencies.

**Target Platform**: One Linux collector instance per environment, existing backend deployment, iOS/Android operator application.

**Project Type**: Acquisition application plus existing backend and mobile feature extensions.

**Performance Goals**: Domain scheduling only: discovery every 30 minutes; calendars/standings every 30 minutes or five minutes in the pool's H−1…H+4 window; individual LNV detail hourly or five minutes in its own window; club sheets daily; new municipal-geocoding needs within one hour when enabled and available. These are scheduling rules, not freshness or availability guarantees.

**Constraints**: No provider calls in SQL transactions; no unbounded pending work, automatic integration replay, browser automation, raw-data archive, generic job engine or monthly availability/load programme. Closed seasons accept no new work; already admitted work may finish once.

**Scale/Scope**: Covered FFVB national/regional/departmental championships and youth qualifying pools; the three professional LNV championships and all published phases. Initial reconstruction targets the current and three completed seasons subject to source availability. French Cups and bracket/progression interfaces are excluded.

## Constitution Check

| Principle      | Application                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Intent     | Functional amendments belong in F01 and the F12 consumer specification. Technical choices do not override classifications, privacy or closed-season rules.                                              |
| II — Ownership | F01 owns sources and operational admission; F02 owns sporting identities/integration; F12 owns grants; F05 owns accounts; F11 owns privacy; F14 owns cutover.                                           |
| III — Design   | Existing approvals cover unchanged journeys. Pending-request/pause behavior and preparation within an active season have explicit prototype and Figma approval, linked below.                           |
| IV — Contracts | Extend the canonical mobile and ingestion roots; generated interfaces/clients retain the F13 pipeline. No editable feature-local contract copy.                                                         |
| V — Simplicity | Native scheduling, ordinary database transactions and current state replace job infrastructure. The runtime fence prevents stale-process writes; it is not a lease, heartbeat or crash-recovery engine. |

The scoped design gate is satisfied. Documentation and contract checks do not establish runtime qualification.

## Project Structure

### Documentation (this feature)

```text
specs/001-source-acquisition/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── checklists/requirements.md
```

### Source Code

```text
apps/collector/     # scheduling, provider adapters, generated backend client
apps/backend/       # collection administration/admission; existing sporting integration
apps/mobile/        # existing administration journeys
contracts/http/     # authoritative mobile and ingestion OpenAPI sources
```

Use feature-owned packages within these applications. Provider adapters own FFVB, LNV and IGN interpretation; do not introduce an adapter registry, generic scraping language or service per collection family. Maven/npm/Nx responsibilities and generation remain under F13.

## Acquisition and scheduling

Spring `TaskScheduler` triggers eligible work through one bounded passage `ThreadPoolTaskExecutor`, with at most `3 * concurrencyPerProvider` callers and no pending queue; current-entry discovery adds one synchronous caller. Startup is sequential. Supplier reads run directly through each provider's native STRICT connection pool and finite lease timeout. Resilience4j acquires permits after leasing, immediately before `MAIN_TRANSPORT`, for every actual retry, redirect and cache revalidation; fresh cache hits consume none. Saturated callers wait for a lease or time out. The HTTP boundary preserves native retry/origin/body/cache behavior and translates checked I/O once to `UncheckedIOException`; timers and the passage executor retain shutdown ownership. Native lenient triggers skip overruns, while backend admission excludes a second cycle for the same control. Shared provider limits cover all seasons/families; qualification establishes bounded behavior, not speculative throughput.

Read operator requests every minute through the internal API. A pending request is durable current intent, not a promised start within one minute. Repeated requests return existing pending/running state. Pause and closure cancel unstarted requests; resume restores ordinary eligibility without replay. Dashboard refresh only reads state. Configuration unavailable at admission prevents new work; a known admitted cycle retains its configuration snapshot.

Use a five-minute ordinary competition tick; backend admission selects due targets from their last actual attempts and current reliable fast windows; discovery remains on its 30-minute cadence. The seasonless controls check newly encountered clubs and changed geocoding needs on the existing minute tick, respecting daily club refresh and suppression of unchanged normal no-result localities. These are eligibility checks, not repeated supplier calls or catch-up queues. Initial current-entry discovery runs every 30 minutes without depending on a season already having been created.

Discovery continues every 30 minutes even with no eligible calendar. Discover new child pools/phases beneath already bound sources normally. New root bindings require operator qualification and launch; PREPARING and ACTIVE seasons permit preparation of unlaunched supported sources. Launch locks only the qualified bindings concerned. Pause never unlocks them. A later current-entry rollover never silently replaces an older season's accepted binding.

Keep the F02 classification snapshot for acquisition and apply current corrections/restrictions again at integration. A shared FFVB resource may serve discovery or several eligible pools; fetch it once within a passage, partition only with qualified native context, and discard ineligible sporting rows. Do not retrieve a dedicated calendar solely for an unclassified pool or retain a reserve of such calendars.

A newly discovered LNV match gets its first detail read. Subsequent detail scheduling is per match, including final results. Unknown start times create no fast window; a missing result never extends H+4. Logos are read once per distinct team during the ordinary calendar passage. Use Apache's bounded in-memory HTTP cache only for images, honoring origin directives; disable heuristic freshness, asynchronous refresh and stale-on-error substitution. A cached reuse is not a new provider observation. No separate logo schedule is introduced.

The admitted target snapshot contains the due targets selected by the backend, starting eligibility and qualified references. Manual/initial passages select their explicitly authorized scope instead. An empty selection performs no supplier observation and cannot advance recovery or last-success evidence. Newly discovered pools use a subsequent snapshot; newly identified matches within an already authorized calendar can receive their first detail and image reads in that passage. Result recording resolves the admitted target once and reuses its source binding for initial-reconstruction attribution. Multi-pool admission remains one bounded selection; image-write admission retains its additional current-parent check. Store only qualified current URL provenance with the existing identities, never raw source documents. Current privacy restrictions still apply when targets are served and data are integrated.

## Provider boundaries

`ProviderPages` and `ProviderResponse` belong to collector application. Discovery and qualification depend on that narrow asynchronous page seam, while the existing provider HTTP adapter owns transport and the FFVB/LNV adapters retain their technical GET/POST/image operations. One response value carries complete bytes, final URI and actual supplier-read provenance across these consumers; passage timing/order remains unchanged. The [shared composition decision](../003-shared-quality/plan.md#application-use-case-families) keeps application response ownership local to each application.

Apache HttpClient owns HTTP transport, connection pools, bounded timeouts and its standard retry policy, configured for at most two additional attempts with `Retry-After`. The [research](research.md#runtime-and-bounded-transport) states the native status, method and exception limits; read-only POST does not imply I/O retry. Parser failures are not retried. The generated backend client has no automatic business-write retry. Bound decompressed response bytes and reject overflow rather than truncate it into a plausible empty document. Use jsoup solely to parse content fetched by this transport; its convenience HTTP defaults are unsuitable for the observed large LNV pages.

FFVB adapters follow published frames, options, links and forms. Parse semicolon-delimited Windows-1252 exports with Commons CSV and qualified headers, keeping quoted fields and leading zeros. HTML supplies missing source context; neither `Jo` nor match-code prefixes are universal group identifiers. Distinguish byes, qualifiers, normal missing values, invalid fields and contradictory rows before F02 handoff. Club lookup uses the currently published form action, not a remembered URL.

LNV adapters use the three official championship entries and their published phase links. Interpret grouped HTML without executing scripts or advertisements; deduplicate mobile/desktop representations by contextual native reference. Pin the provider's `timezoneoffset=0` convention. For a confirmed date/time rendered in that convention, interpret offset zero as UTC and use Java time to produce the corresponding Europe/Paris local date/time for the existing F02 contract; never label the unconverted UTC clock as Paris time. An unknown-time flag preserves a date-only source value instead of creating a midnight instant. Qualify calendar/detail extraction separately, since hidden fields need not use the rendered clock. No XML or FFVB fallback completes professional sporting facts. The F03 document integration uses the narrow F01/F02 exception for information-sheet codes, with verified championship/season-scoped team associations and an unambiguous participant/date match. Read an applicable XML index once per eligible collection pass, not once per match or through another scheduler; unmatched historical references remain unavailable. Extract published scoresheet and statistics-PDF links using ordinary HTTP form requests and page hidden fields. Keep these references and their read outcomes separate from sporting facts; do not download or archive PDF bodies during collection. An absent unpublished standings table is distinct from an unrecognized or broken table.

Manual creation records an unqualified, credential-free HTTP candidate in an open season, without a second backend organizer registry. Only collector-qualified provider hosts, paths, redirects and organizer/championship scope are eligible for launch and acquisition. Operator season confirmation fills missing attribution only; it cannot override wrong-host, incompatible-format or contradictory-season evidence. A changed candidate URL invalidates its prior validation. Apply asynchronous validation results only to that unchanged candidate revision in an open season.

IGN Géoplateforme is the only municipal geocoder. Send F02's current municipality/postal context using native municipality filters. Accept a unique municipality, preserve no-candidate/ambiguity as ordinary outcomes, and treat transport/unqualified errors separately. Do not add fuzzy matching, arbitrary score thresholds or a fallback provider. F02 locality revision prevents a late result overwriting a changed locality. Repeated unchanged unresolved needs await explicit family rerun; technical failures follow ordinary eligible passages.

The native Apache client owns intermediate redirect/retry response disposal, including error-body consumption under its configured socket/response timeouts. These are inactivity bounds, not a whole-response elapsed deadline. The collector retains complete-or-fail decoded success-body limits, terminal status interpretation and origin checks; it does not close and erase intermediate response entities itself.

## Admission, transactions and failure handling

The collector keeps only acquisition inputs from each generated target. Effective classification and due-time evidence remain backend-owned selection rules; copying their unused fields into the collector adds no protection. The admitted cycle retains its immutable candidate snapshot directly, so qualification consumes the same confirmed capability without another candidate GET. `CollectorLifecycle` owns runtime-conflict inspection for work, discovery and passages: an unavailable inspection preserves the original refusal, while confirmed supersession stops further work. Neither outcome authorizes replay. Backend current state owns eligibility for later ordinary polling.

Use the [current-state model](data-model.md) and F02's existing seven ingestion operations. Backend admission allocates `cycleOrder`, binds a cycle to the current collector incarnation and freezes its authorized acquisition scope. The collector assigns `readOrdinal` before each source read. The commit that marks RUNNING is the logical cycle start; only the successful admission response permits provider work. A failed response ends that attempt; later ordinary polling uses current backend eligibility. A committed RUNNING admission still blocks new work until explicit incarnation replacement, while an uncommitted admission may receive a fresh cycle UUID at a later opportunity.

Each cycle-related write checks the current collector incarnation under a shared runtime-row lock held in the same transaction as the write. Restart registration exclusively locks that row, waits for admitted transactions to finish, replaces the incarnation and makes old unfinished cycles obsolete. No mass update or distributed fencing service is needed. Repeating the current startup identifier is harmless; stale startup revisions are refused. A superseded process stops and does not automatically register again.

Candidate validation reuses the admission protection, keyed to the source and candidate revision rather than a periodic provider control. That existing context identifies validation without a collection-mode value or another job framework. Only control passages carry `periodic`, `manual` or `initial-import`, which determine due-target selection, explicit rerun behavior and reconstruction safeguards. It may start only for an unlocked source in an open season. Applying its result rechecks that unchanged candidate and the open season.

Acquire locks in this order when needed: runtime fence, season, collection control/cycle, sporting roots in F02 order, then account. No provider/network call holds these locks. New startup needs the runtime row only. Already accepted sporting facts and completed successes survive a restart; the new collector uses the next ordinary opportunity, never resumes checkpoints or replays a failed pipeline. Without heartbeat, the backend cannot immediately distinguish a crashed from an isolated collector; F13 availability signals and later registration provide the available evidence.

Each accepted F02 write retains its own atomicity. Catalog integration is atomic for its authoritative scope; calendars keep per-match transactions and only a fully successful qualified observation permits absence reconciliation; standings replace a whole qualified table. Discard stale observations instead of opportunistically completing their fields. Preserve independent successful pools/stages when another fails. An uncertain sporting write is reported, not automatically replayed; ordinary later collection can recover still-published facts. End the passage through its normal completion operation even when some results failed. Completion and validation result submission each use one ordinary generated-client call. Failure is reported without a confirmation GET or mutation replay. The next ordinary poll reads current backend work: committed terminal work permits a later opportunity even if its response was lost; an unfinished RUNNING cycle remains blocked by backend admission until the existing explicit restart. There is no process-local acknowledgement set, terminal confirmation flag or client ownership-release protocol. A stale concurrent poll can submit another admission request, but backend atomic admission refuses concurrent running work. The native lenient trigger skips missed poll firings; asynchronous passage exclusion belongs to backend admission. Startup registration failure ends startup rather than trying to recover a lost response. The operator inspects current state and, if necessary, restarts the collector through existing deployment tools; incarnation replacement invalidates unfinished work. An interrupted candidate requires a new explicit validation request. No completion retry loop, watchdog or automatic re-registration is added.

## Initial reconstruction and operations

Use a non-web Spring Boot `ApplicationRunner` entry point in the backend executable, calling the same application services. An explicitly supplied operator account must currently hold `collection.manage`; this creates neither a bootstrap privilege nor a second database writer. The same entry point supports preparation from explicitly supplied historical start years and supported provider/organizer URLs, reusing canonical F02 season services and existing source validation. It creates missing PREPARING seasons/bindings without guessing years or reopening history. Acquisition then selects prepared references and requests one ordinary collector passage in initial-import mode. It is an exploitation tool, with no new mobile journey or CLI framework. This non-web invocation does not start the [F04 index scheduler](../008-search-discovery/plan.md#projection-lifecycle); the serving backend remains the sole search-index writer and its full rebuild covers relevant operator-side data changes.

Historical seasons remain PREPARING. Initial reconstruction locks references without enabling periodic activity; a later current-season launch may activate those same qualified references without editing them. Lock used references on their first admitted initial pass; retain obtained/rejected/unavailable coverage by scope for F14 review. A targeted retry replaces only its affected current result, never erases gaps in other scopes. Admission rechecks PREPARING after a pending request. A failed team-logo retry freezes that team and an eligible qualified parent calendar for image-reference interpretation only; it permits no calendar or neighboring-team write. Source-validation failure categories retain unavailable transport separately from refused content; uncategorized failures remain unavailable. Preserve F02’s typed content/staleness refusals through collector evidence instead of classifying them as transport failures. Published empty initial standings advance publication attribution but preserve the last usable table and its own observation time; ordinary current empty-table replacement remains effective. Prevent periodic results from overwriting that initial report before its decision. F07 initial-import suppression is backend-controlled. Terminal closure requires the exact season label and current revision; it prevents all subsequent preparation and new work while allowing already admitted work to finish once.

Operational projections retain current outcome, observation time, logical order and the latest successful observation/integration for each control/scope/stage/phase. Failed, partial and unconfirmed observations are immediately actionable for every family, including transient club/geocoding failures. A usable observation after a non-successful outcome emits recovery evidence only for that exact key. Native last-value conditions include successes before testing actionability. Grafana owns grouping, five-day reminders and resolved notifications; resolution or success elsewhere does not prove recovery. Normal unresolved geocoding results are not outages, and exact outage age is unavailable.

Retained database evolution preserves applied history and current-result fields other than the discarded outage clocks. Stop old writers and check admitted consumers before the existing manual migration/start sequence. Application rollback cannot recreate discarded clock values; incompatible state requires authorized forward repair or compatible restoration.

Accepted discovery reports new-season and classification needs through existing structured logs and native Grafana notifications, grouped by provider/season/subject. Use bounded counts and the existing administration destination, without per-item notification or an outage classification for ordinary waiting. Native grouping/reminders handle repeated needs. Diagnostics exclude raw documents, contacts and secrets; F11 restrictions remain effective during reimport and restoration.

## Contracts and validation

The [contract overview](contracts/README.md) owns interface coordination and links canonical definitions. F12 projects the optional `manageCollection` capability on the existing account response; current backend grants remain authoritative. Source/season/control mutations use the established body-revision conventions, shared descriptive Problem Details, no automatic mobile mutation retry and current-state reads after uncertain responses. Paginated discovered children and control-result history use [F13's automatic continuation and retained-row footer feedback](../003-shared-quality/plan.md#repeated-interaction-conventions), while their Query, authorization and command owners retain their scopes.

The [research](research.md) separates official documented capabilities, direct provider observations and remaining qualifications. The [quickstart](quickstart.md) records executable construction checks, their controlled boundaries and remaining provider/native/environment qualifications. No constitutional exception is proposed.

## Design acceptance

Source URL editing is inline in preparation or an ordinary edit route; typed season closure uses an ordinary screen, as approved on 2026-10-22. Retain every field, validation, consequence, exact season-label safeguard and pending/active-season rule. Simple confirmations use native alerts. Scoped native presentation qualification is recorded by [F13 presentation evidence](../003-shared-quality/quickstart.md#native-ui-and-approved-design); content references and stable node identities do not independently qualify the native container.

The owner explicitly approved the prototype and then its Figma translation within the owning design scope. The scope is requested-versus-running collection, cancellation of pending intent on pause, and preparation/launch of an unlaunched source within an active season without unlocking other bindings.

Accepted Product Design references are the pending state in [light](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1611-18280) and [dark at 320 points](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1615-18531), [active season with an unlaunched source](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=4798-100665), [season confirmation](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=5987-46284) and [launch of the qualified source](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=6664-88448). Existing linked library primitives, tokens and unchanged journey approvals are retained. Prototype/browser checks establish fictional interaction behavior only; native accessibility, provider and production acquisition qualification remain separate.
