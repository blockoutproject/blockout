# Data model: acquisition and source operations

## Ownership

The backend stores current collection state; the collector has no direct database write access. F02 owns seasons, sporting roots, contextual source identities, observations accepted as sporting facts, classification, locality and image data. Reuse those identities rather than duplicate their models. F01 adds acquisition lifecycle and operational state. F12's existing account/grant association supplies `collection.manage`; no role or per-season delegation table is added.

## Season and source binding

A canonical F02 season has F01 acquisition lifecycle PREPARING, ACTIVE or CLOSED and an editing revision. CLOSED is terminal. Launching the first qualified source makes the season ACTIVE; new unlaunched sources can still be prepared. Closing requires the current revision and exact canonical label. Initial historical import remains in PREPARING and locks its used references without enabling periodic collection. Keep reference locking distinct from periodic launch: a qualified reference locked by initial reconstruction may later be activated without changing its accepted URL.

Each supported root source binding belongs to a season and provider and identifies its official organizer or one of the three supported LNV championships. Retain the proposed URL separately from the accepted binding, its candidate revision, validation outcome/time and season evidence, optional explicit season confirmation, and lock/launch state. Supported root identity and season are unique; no arbitrary scraper definition is stored.

Validation is missing, pending, invalid, needs season confirmation or qualified. A candidate edit clears its previous evidence. Apply a returned validation only if the candidate revision still matches and the season remains open. Human confirmation fills missing season evidence, never contradictory evidence or parser incompatibility. Launch activates the chosen currently qualified bindings atomically and locks any that were still editable; already launched bindings are unaffected, and unqualified selections are refused. Pause never unlocks them. Source rollover only proposes a new candidate, never rewrites an older accepted binding.

Native child packs/pools/phases and their published context remain F02-owned. A complete usable catalog may remove current acquisition eligibility; a failed catalog cannot. Keep latest qualified discovery references needed for same-season reuse, not an export archive. Current classification and privacy changes retain F02 authority.

## Collection control

One control exists per `(season, FFVB)` or `(season, LNV)`, plus one seasonless club-sheet and one seasonless geocoding control. Retain desired activity, editing revision, at most one pending manual request, current cycle, last attempt and last success evidence. Requested intent, confirmed execution and last outcome are independent values, not a single overloaded status.

Pause removes pending intent and changes desired activity; a running cycle drains. Resume changes activity only. Closure cancels seasonal pending requests and blocks further admission, without changing other controls. Repeated manual requests return the current pending request or active cycle. Request IDs support reading current state after lost responses, not an execution-history API. A newer request never erases an unresolved result from an unrelated scope.

A pending request contains its identity, target control and requested mode. Ordinary mobile requests cannot select initial-import mode or bypass eligibility. Source-validation requests are tied to the candidate revision; pending work is bounded by existing sources and controls, not an unbounded job collection. The collector reads current work every minute and submits admission against the current state; polling itself creates nothing.

## Collector runtime and cycle

One runtime row per environment holds a current startup UUID/incarnation and monotonic revision. On startup the collector reads it, then conditionally registers its newly generated UUID. A retry with the same current UUID returns the current registration; a stale expected revision for a different UUID is refused. A superseded process stops rather than registering again automatically.

A current cycle records its UUID, control, runtime incarnation, backend-assigned `cycleOrder`, mode, start/completion time, immutable acquisition configuration and authorized source scope. Freeze selected target identities/configuration, not a second copy of personal club locality; resolve currently permitted locality and its revision when serving targets. `readOrdinal` is allocated before supplier reads within that cycle. F02 validates the `(cycleOrder, readOrdinal)` token and source scope at each write. Arrival time never supplies ordering.

Admission is a short backend transaction checking reliable configuration, supported scope, lifecycle, pause and competing work. It consumes pending intent where applicable and commits RUNNING before supplier work starts. The same current cycle can be read after an uncertain acknowledgement. It is not permitted to reissue admission blindly. Completion is accepted only for that still-current cycle; repeating the identical terminal result is a no-op, while contradictory terminal state is refused.

The same primitive admits one source-validation cycle for the exact pending candidate revision, instead of a collection control. Its result applies only while that candidate is unchanged and its season is open. Automatic entry discovery proposes canonical season/source candidates under the runtime fence, without modifying operator edits, accepted bindings or lifecycle. These uses need no execution-history table.

Every cycle-related write holds a shared lock on the runtime row while comparing the incarnation and committing its domain effects. Startup replacement takes an exclusive lock on that row only. It waits for already admitted transactions, replaces the incarnation, and logically invalidates unfinished old cycles. No per-cycle sweep is necessary. Completed outcomes and accepted F02 data survive. Retain only current cycles/results needed by scopes and delayed-write validation; no historical execution journal or checkpoint store is introduced.

The backend does not infer an immediate crash from missing work. After replacement, old running state is interrupted/obsolete and cannot authorize further writes. Native availability signals report observable collector unavailability; an unexecuted cycle is neither a failure observation nor recovery.

## Lock order and revisions

When needed, acquire runtime, season, collection control/current cycle, then F02 sporting roots in their existing order, then account locks in sorted UUID order. Never acquire an earlier kind after a later one. Club-only integration needs the runtime and club roots, not an invented season. Grant assignment locks the account only; runtime replacement locks the runtime only. Provider calls never occur inside these transactions.

Manual mutation revisions use the existing backend/JPA version convention. Changed desired state advances its aggregate revision; a matching no-op does not. Stale mutation state returns the existing 409 conflict without effects. Safe integer wire bounds follow F12. Source validation and collector admission recheck the relevant current revisions in their write transaction.

## Observations and current results

Reuse F02's canonical observation requests and outcomes. F01 retains the operational evidence needed to distinguish acquisition from integration: affected source/scope/stage, attempt time, outcome, safe reason, available counts and latest actual successful evidence. Failed or uncertain integration never becomes successful acquisition plus an implied global success. A later partial pass updates only scopes it actually observed; another scope's failure remains visible.

For club-sheet/geocoding technical outages, retain the first current failure time until that affected scope obtains recovery evidence. Empty or ambiguous geocoding is a valid result, not a technical outage. An unchanged unresolved locality remains suppressed until its F02 locality revision changes or an explicit family rerun requests it. Successful points are not recalculated by that rerun. Native Grafana alert state is not a second persisted incident model.

Initial reconstruction retains a current coverage result per requested season/source scope while PREPARING: requested, obtained, rejected and unavailable coverage. Targeted retry replaces that scope only; untouched gaps remain. Periodic data cannot overwrite this report before its decision. F14 uses it to decide launch/closure; it is not a complete import-run history. F07 initial notification suppression is selected by backend-authorized cycle mode, never an arbitrary collector flag.

Retain no raw provider pages/exports, personal diagnostic contacts, credentials or custom durable HTTP cache. F02 and F11 own permitted business fields, restrictions, erasure and image retention. A response cached in collector memory does not advance the supplier observation time.
