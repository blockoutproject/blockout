# F02 interface contracts

**Authority**: [plan](../plan.md), [data model](../data-model.md), [F13 HTTP conventions](../../003-shared-quality/contracts/README.md).

**Status**: Authored planning contracts; no deployed API or generated runtime compatibility is claimed. The canonical [ingestion root](../../../contracts/http/ingestion/openapi.yaml), [mobile root](../../../contracts/http/mobile/openapi.yaml), [shared Problem Details](../../../contracts/http/common/problems.yaml) and [F02 classification enums](../../../contracts/http/common/sporting-enums.yaml) own their definitions.

## Ownership

| Provider / consumer      | Semantic ownership                                                       | Authoritative interface                                                        |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Backend / Java collector | F01 observation context, F02 sporting acceptance                         | Shared ingestion OpenAPI root under `contracts/http/ingestion/`                |
| Backend / Expo mobile    | F02 corrections, F12 grants; existing administration journeys            | Shared mobile OpenAPI root under `contracts/http/mobile/`                      |
| F02 / backend consumers  | F02 identities/current truth; each consumer owns its projections/actions | Explicit Java application interfaces, not internal HTTP or shared JPA entities |

[F01](../../001-source-acquisition/contracts/README.md) owns the current cycle/work-assignment operations in these same roots; F03/F04/F06 own future public reading. F07/F08 consume the in-process transition boundary below.

## Operations

| Surface   | Resources and methods                                                                                              | Consumer and effect                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ingestion | `POST /ingestion/source-bindings/{sourceBindingId}/catalog-observations`                                           | Collector supplies attributable seasonal pool references; complete current discovery may reconcile catalog absence.                                          |
| Ingestion | `POST /ingestion/pools/{poolId}/calendar-observations`                                                             | Collector submits one bounded calendar; per-match outcomes and guarded absence finalization.                                                                 |
| Ingestion | `POST /ingestion/matches/{matchId}/detail-observations`                                                            | Enrich an already-known match in the same order discipline.                                                                                                  |
| Ingestion | `POST /ingestion/pools/{poolId}/standings-observations`                                                            | Atomically replace one usable official table.                                                                                                                |
| Ingestion | `POST /ingestion/clubs/{clubId}/detail-observations` and `/locality-observations`                                  | Accept permitted current source values and revision-qualified municipality coordinates.                                                                      |
| Ingestion | `POST /ingestion/teams/{teamId}/source-logo-observations`                                                          | Accept actual LNV image bytes separately from match processing.                                                                                              |
| Mobile    | `GET` and `PATCH /administration/{clubs,teams}/{id}/presentation`                                                  | Existing authorized identity editor; each concrete route and parameter is defined in the root. One multipart save commits names and optional image together. |
| Mobile    | `GET` and `PUT /administration/pools/{poolId}/presentation`                                                        | Pool name editor; JSON full/short names and editing revision, without image or logo action.                                                                  |
| Mobile    | `GET` and `PUT /administration/{packs,pools}/{id}/classification`                                                  | Read and atomically correct the complete classification setting; no partial application across conflicting participations.                                   |
| Mobile    | `GET` and `PATCH /administration/clubs/{clubId}/contacts`                                                          | Read permitted values and change supplied independent management modes.                                                                                      |
| Mobile    | `GET` and `POST /administration/divisions`; `GET /administration/divisions/{divisionId}`                           | Read the configuration list or create a division through its existing editor.                                                                                |
| Mobile    | `PATCH /administration/divisions/{divisionId}/presentation`; `PUT /administration/divisions/{divisionId}/activity` | Presentation/image save and explicit lifecycle remain separate commands.                                                                                     |

No bulk job resource, generic alias editor, professional club-association route or extra public API version prefix is introduced. Contract `info.version` identifies this source revision family, not a mobile minimum version or a deployed product release.

## Ingestion

The canonical operations above define request/response fields and errors. The [plan](../plan.md#acceptance-and-concurrency) defines transaction boundaries, observation ordering and absence-finalization guarantees.

A calendar contains normalized attributable match candidates, recognized context-only slots and bounded local acquisition failures. Required envelope/context shape errors reject the request before writing. Invalid supplier secondary fields are omitted from their proposal with a filtered reason, not silently converted to null; supplier-level invalid rows remain explicit failures. Business acceptance errors are per match.

All ingestion JSON bodies are bounded to 8 MiB. The calendar also has a 1,000-entry total across match candidates, context-only slots and failures; catalog and standings lists use the byte bound without an additional item quota. Refuse oversized input without truncation or automatic chunking. The canonical schema describes duplicate and completeness semantics.

Calendar processing returns per-reference accepted/unchanged/stale/rejected results, useful counts and whether absence was reconciled. Results follow distinct match references in first-occurrence order, then acquisition failures in their input order; context-only slots have no result. A partial outcome is not an HTTP 207, asynchronous job or complete success. Globally invalid shape/context, permissions and unavailable processing use the shared Problem Details profile. No raw body or personal detail appears in reasons.

Catalog presence and eligible absence changes commit together within their source-season scope; invalid or unauthorized entries reject the whole request. Results correspond positionally to every input pool, including identical duplicates, so repeated native labels in different competition/tour/group contexts remain unambiguous. The full compound identity governs deduplication, not the displayed pool reference alone. Standings similarly replace one table atomically; calendar match commits remain independent.

F01 adds optional published calendar/standings entry URLs to catalog candidates and a detail URL to match candidates. Retain only qualified current acquisition references under the same context/order checks; omission preserves a usable prior reference. These fields neither authorize arbitrary backend fetching nor change sporting identity. The collector uses them through F01's admitted target projection; no URL is a public proxy.

The [F03 public read boundary](../../007-sporting-consultation/contracts/README.md) consumes these accepted facts without exposing administrative projections. Optional match enrichment now carries permitted referees, professional stream/PDF references and a qualified information-sheet locator. Binary document retrieval remains a public backend operation under current admission and visibility, not a collector-supplied arbitrary URL proxy. Result-state values have one canonical owner in `contracts/http/common/sporting-enums.yaml`; the existing ingestion reference remains valid.

Use optional/null/value semantics without per-field state wrappers. No proposal preserves the old usable fact; explicit null has only the owning field's qualified absence/removal meaning. An old whole observation is rejected before mapping new facts. Keep required identities and context separate from optional sporting values.

Images use a separate binary submission with observation metadata, actual PNG/JPEG validation and the 5-MiB bound. Backend accepts bytes; it does not fetch a collector-supplied URL. Provenance URLs are descriptive evidence with no credentials or arbitrary proxy behavior.

The collector authenticates with its environment-specific M2M client/audience and ingestion permission. The backend validates current authorized cycle/scope and reconstruction mode before processing, then checks each affected resource in its transaction; neither a mobile token nor an invented old cycle bypasses closure or visibility. For a calendar, a local permission/eligibility refusal is a rejected item and prevents absence reconciliation; it does not undo earlier matches or become a global no-effects error. A lost response has an uncertain aggregate outcome: completed match commits remain; the next ordinary observation can resolve failures. Do not replay the entire pipeline automatically.

`cycleId` resolves a backend-owned immutable context containing source binding, season, allowed sporting scope, logical cycle order, starting classification/configuration and reconstruction mode. `readOrdinal` is assigned before each provider read within that cycle; completion time is freshness only. F01 work assignment must supply the existing pool/match/club IDs and effective locality revision it actually authorizes. Calendar outcomes return resolved team IDs for ordinary logo submissions. No arbitrary client-provided cycle order, historical flag or professional club reference can widen these permissions.

## Mobile administration

Retain existing resource editing, classification and division lifecycle journeys. Read projections expose current effective values, independent source/manual modes and a scoped editing revision; no supplier document or JPA entity is exposed.

Commands carry the revision they edit and explicit desired values; a stale body revision is a domain conflict (`409`), not an HTTP `If-Match` failure. No ETag protocol is added alongside it; source/manual/hidden contact modes remain distinct. F12 grants are global per action; each operation still checks the relevant resource and business invariants. Each canonical operation defines its changes and refusal semantics; no moderator or M2M privilege is inherited.

Club, team and division presentation updates use atomic `PATCH` with `multipart/form-data`: JSON metadata plus an image only for `logoAction=replace`. `keep` preserves the current manual logo and `automatic` clears it; fallback is resource-specific in the canonical operation. Validate the complete form before the single editor transaction. The JSON metadata and logo actions define the patch semantics; they are not JSON Merge Patch or JSON Patch. Division creation remains `POST`, returns `201` with `Location` pointing to its detail resource, and has no prior revision; case-insensitive name uniqueness and rereading the list handle an uncertain result. Pool presentation, classification and activity use `PUT` with the complete writable state of their respective sub-resource; omitted required values are rejected. Contacts use the documented JSON `PATCH`, with omitted fields unchanged and no partial application. A successful no-op does not advance the editing revision or repeat lifecycle effects. Every refusal precedes effects or rolls back the complete administrative change.

Classification applies division/format/gender together, with pack inheritance or a full pool override. Refusals identify conflicting sporting scopes without partial mutation. Division name/color/logo editing and activation are distinct commands. No association, score, generic alias or split/merge endpoint is introduced.

## In-process consumers

F02 supplies stable resource IDs, contextual source attribution, useful facts/freshness, current viewability, participations and effective presentation. Read consumers enforce current restrictions even over retained data. They do not receive mutable entities or bypass ownership through repositories.

| Application interaction                | Owned values and guarantees                                                                                                                                                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F03/F04/F06 resolve sporting resources | Stable UUID and kind, season/classification, current visibility reasons, independent source/effective names, optional professional club, effective logo, eligible participations and useful fact freshness. No implicit replacement identity. |
| F01 obtains acquisition context        | Source-season binding, native references, current acquisition classification, known resource IDs and effective locality revision. Retained published classification cannot authorize new collection.                                          |
| F07 accepts a match transition         | Match identity, previous/accepted result, designated-source observation time, initial-reconstruction context and current F08 public-link value under the shared match lock. F07 owns audience, announcement eligibility and consumed facts.   |
| F08 publishes a public link            | Uses the same match exclusion and current visibility; F02 never owns link moderation or replay eligibility.                                                                                                                                   |

These are explicit application calls inside the modular backend, not another wire schema or a shared entity library. An inaccessible resource is unavailable to ordinary readers even when its retained data remains present for authorized administration.

The [plan](../plan.md#results-and-dependent-transitions) defines synchronous F07 participation in the score transaction, shared F08 match locking and after-commit push. The table above identifies the values crossing these application boundaries.

## Compatibility and qualification

F13 owns dialect, generation, error profile and compatibility with every admitted mobile version. Requests reject unknown properties except intentional maps; responses tolerate additional properties while validating known fields. Enum additions are not presumed compatible. The shared `ResultStateEnum` carries finality (`provisional`, `final`, `unconfirmed`); `specialLabel` independently preserves recognized sporting notation. Only `final` establishes a definitive-result transition. Collector, backend and mobile adopt the shared contract together before runtime implementation. Generate provider and consumers from the same authored revision; compile and exercise serialization/validation before runtime adoption.

F02 machine problem identifiers use stable URNs: `urn:blockout:problem:invalid-observation`, `stale-observation`, `invalid-cycle-context`, `identity-conflict`, `classification-conflict`, `stale-revision` and `invalid-image`, with the same prefix on each suffix. The common HTTP categories use `invalid-request`, `unauthenticated`, `forbidden`, `not-found`, `payload-too-large`, `unsupported-media-type` and `unavailable`. `type` is the identifier; there is no duplicate code field. Authorized classification conflicts may include `conflictingResourceIds`; no private contact data appears in diagnostic details. New types use the existing generic client error until their owning presentation is supported.

Cross-field checks remain focused handwritten boundary/application validation: total calendar entries, paired numeric result totals, special-result label, required LNV/FFVB identity fields, current cycle scope, manual contact value rules, at least one changed contact field, coordinate pairing and multipart image/action consistency. Generated structural validation alone cannot establish these invariants. OAS 3.0.4 optional nullable objects deliberately avoid an inheritance/union hierarchy; qualify undefined versus explicit null through the selected Java mapper and real MVC binding.
