# F01 contract semantics

[OpenAPI 3.0.3](acquisition.openapi.yaml) is a documentary design source for future public/internal acquisition contracts. It reuses the existing F02 documentary projection of F13 Problem; production adopts the single F13 shared schema. No runtime or generated consumer is delivered.

## Boundaries and security

Public operations require valid Auth0 authentication and current F12 permission for the specific read/control/season/source action. Check permission and revision inside the mutation boundary. Visitors, ordinary accounts and live moderators without the permission have no authority. Service operations require private networking plus the F13 technical secret, a current registered process and matching known cycle. F02 remains responsible for accepting sporting observations; Python never writes the database.

Requests reject unknown fields and invalid required/enum/date values. Responses permit additive fields but all consumed fields are validated before mobile caching or Python use. Use F13 Problem with stable codes, correct status and opaque diagnosticId; no provider HTML, credentials or personal data. Suggested stable codes: ACQUISITION_STALE_REVISION, SOURCE_LOCKED, SOURCE_UNSUPPORTED, SOURCE_CONTEXT_MISMATCH, SOURCE_SEASON_CONFIRMATION_REQUIRED, FAMILY_NOT_PAUSED, FAMILY_BUSY, CYCLE_STALE, CONFIGURATION_UNAVAILABLE. Human messages are not branching keys.

F13 mobile policy applies: reads 10 s with one transient retry after 1 s, mutations 30 s without automatic repeat; navigation stays usable, old-account responses cannot update caches. A timeout does not cancel a backend operation.

## Source preparation and launch

Prepare season only from a stored published-season candidate; an operator may explicitly establish missing LNV season attribution using observed publication evidence. Never fabricate a next year from ID arithmetic. A source proposal is separate from an accepted binding. Supplying a supported historical URL does not require it to be discoverable from today's root.

Prepare-source expectedRevision is the season revision for creation, the binding revision for update. URLs must use the configured official host and supported path/query forms; reject credentials, fragments that change meaning, private/local destinations and unapproved redirects. Recheck every redirect. No arbitrary fetch proxy. Each URL/context edit invalidates prior qualification and human confirmation. Spring authorizes/schedules SOURCE_VALIDATION, Python reads the provider using the same adapters, Spring validates result/context against the binding revision. No HTTP inside the persistence transaction. A late validation result returns 409 rather than qualifying the replacement URL.

Human confirmation is legal only after structural qualification when seasonal evidence is missing. Known contradictory season, malformed source or wrong role stays rejected. Launch checks source qualification, seasonal attribution, covered scope and permissions atomically, independently of pool mapping, and locks the enabled bindings; incomplete publication remains visible. Closed seasons reject every new operation, including launch, manual collection, source validation and initial reconstruction. Launch of additional ready unlocked source scopes in an already active season does not unlock previously launched scopes.

Season/source readiness responses contain source qualification gaps only, never missing mapping. The collection UI does not link to the separate mapping journey. A launch or discovery request neither creates nor changes classification. Before effective mapping, only pool and native pack discovery is authorized; calendars and results wait for the owning F01/F02 pool eligibility rules, without staging pending calendars.

## Commands and uncertain results

A command changes one owning resource under expectedRevision; stale changes return 409. Competition commands carry seasonId and operate only that season/provider; CLUBS and GEOCODING forbid seasonId. Reads return these same scopes. Ordinary rerun returns its existing execution, otherwise paused/pausing scopes reject it. Pause drains selected running work; resume skips missed ticks. Busy shared provider execution does not alter other scopes’ pause states.

Prepare and qualify the three completed sporting seasons while their Blockout state is PREPARING. An authorized F14 technical initial-reconstruction request reserves the existing single provider operation slot, locks selected qualified bindings and uses the ordinary adapters and F02 integration. It neither enables periodic collection nor changes any other season/provider pause state. Refuse a busy provider instead of queuing work; retry an identified failure explicitly before closure. Read its obtained/rejected/unavailable report, then close the season definitively with exact typed confirmation. The current season uses normal launched collection, with F14 initial-import suppression. No closed-season operation, separate engine, global pause procedure or automatic reconstruction workflow remains.

After a lost 202, read the family/current cycle and target season before repeating. Repeating a still-current identical request returns its existing operation; a stale request cannot create a new one even after completion. No idempotency framework or permanent command ledger is needed beyond revisions and the family operation slot. GETs never initiate work.

## Collector protocol

Register once per new process-start UUID after stopping the former process. Repeating that same registration returns its generation. A new registration interrupts old running cycles and fences old writes; this is not HA coordination or a periodic crash supervisor. Stop the old instance before activating another under F13.

Poll control state every five seconds. Read configuration/work pages in stable work-ID order, at most 500 per page, with opaque cursor and the same revision. No total count is promised. A changed revision returns 409; discard the partial selection and read fresh configuration. Current eligible club/locality needs come from F02 through the backend. CLUB/GEOCODING work includes clubId; GEOCODING additionally requires localityRevision and typed localityContext city/postalCode, passed unchanged to the F02 result boundary. No parsing of a concatenated free-text address is required. Selection is bounded/incrementally processed; transport overflow fails explicitly, never truncates a catalog or invents completeness.

Start-cycle validates current process, family state, selection revision and mode. MANUAL/INITIAL_RECONSTRUCTION/SOURCE_VALIDATION must claim their existing REQUESTED cycle; PERIODIC creates a fresh backend ID/order. Only one normal active cycle per family. Preserve immutable selected configuration for that run; later changes affect subsequent runs while current F02 visibility guards still apply.

Each discovery request identifies the exact backend-issued catalog work scope. COMPLETE means all its published parts were read successfully. A root entry proposing a new LNV championship cannot retract children of another bound championship. PARTIAL/INVALID/UNAVAILABLE do not remove earlier eligible references. Oversize COMPLETE submissions are rejected, never split into independently complete fragments.

Per-scope outcomes distinguish acquisition and integration; absent counts remain unknown. Publish terminal cycle state only after its work outcomes: completion accepts SUCCEEDED/PARTIAL/FAILED/INTERRUPTED/INTEGRATION_UNCERTAIN, never REQUESTED/RUNNING. A successful download cannot complete an unresolved integration or prove that a separate incident recovered. Replays of identical discovery/outcome/validation results in the same cycle are idempotent; conflicting repeats are 409 and old cycles cannot mutate newer accepted state.

## F02 handoff

Reuse [F02 internal observations](../../002-sporting-data/contracts/internal.openapi.yaml) for calendar, ranking, clubs and geocoding. Each calendar request belongs to exactly one contextual pool. `coveredRoundKeys` is empty for ordinary pools or names exactly the qualified tour for a distinct-group pool. Full CSV download sharing never merges these observation identities. F02 validates source eligibility/order and owns independent match transactions, replay and absence finalization.

Real Java/Python/TypeScript generation, strict consumed-field validation and ignored deterministic outputs must pass before executable adoption. Follow [quickstart](../quickstart.md) V08/V14; schema-only checks do not satisfy this gate.

## Initial reconstruction and season preparation boundary

The preparation overview exposes known seasons and unbound candidates without mixing configuration revisions. Season commands accept competition scopes only. Closing is terminal and requires the exact displayed season label plus expectedRevision. Atomically prevent new cycle starts and cancel unstarted requests; only cycles already RUNNING at acceptance may finish their selected work once, under normal F02 ordering/visibility guards. Preserve data and source locks. No reopen, recollection or source validation is available after closure; reads remain available. Other season/provider and seasonless club controls are unchanged. A lost response requires a read, never an automatic repeat.

The former public recollections operation and HISTORICAL mode are removed. INITIAL_RECONSTRUCTION is issued only by the protected internal F14 preparation operation for a PREPARING season; the collector cannot choose it by supplying an unchecked flag. Inspect the same cycle/result read models as other work. F07 treats these initial imports as silent. No mobile history executor or reopening endpoint exists.

## Scope and closure enforcement

Root discovery remains seasonless and may propose new seasons; a paused seasonal scope does not pause other seasons. It cannot issue sports observations or alter locked closed-season children. Seasonal configuration/work descriptors, start requests and cycle responses carry seasonId; absence is allowed only for root discovery and seasonless club/geocoding. Family reads return one competition control per season/provider and the two seasonless controls. The backend validates the conditional seasonId requirement before mutation. Shared provider execution limits do not combine pause state.

Closure uses the season revision. Starting any seasonal cycle locks/checks the same season row, so exactly one side wins a close/start race. REQUESTED work that has not started becomes INTERRUPTED with a safe closure reason. A RUNNING cycle is the sole drain exception; it cannot expand its selected scope, spawn another cycle or restart after interruption. F02 resolves this issued context at each write and finalization, retaining normal stale-order, privacy and visibility guards. The collector never decides eligibility from a supplied mode or timestamp.

The internal initial-reconstruction request uses the current season revision, accepts FFVB_COMPETITIONS or LNV_COMPETITIONS only, and selects qualified bindings for that season/provider. It is reserved for the authorized F14 transition tooling, not a collector fallback or a mobile action. Closure retains the original cycle mode for draining work: ordinary current empty-calendar semantics and initial historical empty-input protection do not change retroactively merely because CLOSED was accepted.
