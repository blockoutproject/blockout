# F02 interface contracts

**Authority**: [plan](../plan.md), [data model](../data-model.md), [F13 HTTP conventions](../../003-shared-quality/contracts/README.md).

**Status**: Authored planning contracts; no deployed API or generated runtime compatibility is claimed. The canonical [ingestion root](../../../contracts/http/ingestion/openapi.yaml), [mobile root](../../../contracts/http/mobile/openapi.yaml), [shared Problem Details](../../../contracts/http/common/problems.yaml) and [F02 classification enums](../../../contracts/http/common/sporting-enums.yaml) own their definitions.

## Ownership

| Provider / consumer      | Semantic ownership                                                       | Authoritative interface                                                        |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Backend / Java collector | F01 observation context, F02 sporting acceptance                         | Shared ingestion OpenAPI root under `contracts/http/ingestion/`                |
| Backend / Expo mobile    | F02 corrections, F12 grants; existing administration journeys            | Shared mobile OpenAPI root under `contracts/http/mobile/`                      |
| F02 / backend consumers  | F02 identities/current truth; each consumer owns its projections/actions | Explicit Java application interfaces, not internal HTTP or shared JPA entities |

No business route currently exists to preserve. These sources establish the F13 roots without a feature-local API copy. F01's future plan must implement the accepted cycle context and outcomes; F07/F08 must use the common transaction/match-order boundary. F03/F04/F06 consume stable identities and current visibility without independently redefining them. Their public reading endpoints and F01 cycle/work-assignment endpoints are outside this F02 contract revision; later owners extend the same roots.

## Operations

| Surface   | Resources and methods                                                                    | Consumer and effect                                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ingestion | `POST /ingestion/source-bindings/{sourceBindingId}/catalog-observations`                 | Collector supplies attributable seasonal pool references; complete current discovery may reconcile catalog absence.                                          |
| Ingestion | `POST /ingestion/pools/{poolId}/calendar-observations`                                   | Collector submits one bounded calendar; per-match outcomes and guarded absence finalization.                                                                 |
| Ingestion | `POST /ingestion/matches/{matchId}/detail-observations`                                  | Enrich an already-known match in the same order discipline.                                                                                                  |
| Ingestion | `POST /ingestion/pools/{poolId}/standings-observations`                                  | Atomically replace one usable official table.                                                                                                                |
| Ingestion | `POST /ingestion/clubs/{clubId}/detail-observations` and `/locality-observations`        | Accept permitted current source values and revision-qualified municipality coordinates.                                                                      |
| Ingestion | `POST /ingestion/teams/{teamId}/source-logo-observations`                                | Accept actual LNV image bytes separately from match processing.                                                                                              |
| Mobile    | `GET` and `PUT /administration/{clubs,teams,pools}/{id}/presentation`                    | Existing authorized identity editor; each concrete route and parameter is defined in the root. One multipart save commits names and optional image together. |
| Mobile    | `GET` and `PUT /administration/{packs,pools}/{id}/classification`                        | Read and atomically correct the complete classification setting; no partial application across conflicting participations.                                   |
| Mobile    | `GET` and `PATCH /administration/clubs/{clubId}/contacts`                                | Read permitted values and change supplied independent management modes.                                                                                      |
| Mobile    | `GET` and `POST /administration/divisions`; `GET /administration/divisions/{divisionId}` | Read the configuration list or create a division through its existing editor.                                                                                |
| Mobile    | `PUT /administration/divisions/{divisionId}/presentation` and `/activity`                | Presentation/image save and explicit lifecycle remain separate commands.                                                                                     |

No bulk job resource, generic alias editor, professional club-association route or extra public API version prefix is introduced. Contract `info.version` identifies this source revision family, not a mobile minimum version or a deployed product release.

## Ingestion

Provide focused operations for catalog, pool calendar, known-match detail, pool standings, known-club details, club geocoding and professional source-logo observations. Each accepts the qualified cycle/order context and rejects unrelated scope. Catalog/discovery retains native references; only attributable calendars create sporting teams/matches. Details and standings cannot create or restore calendar presence.

A calendar contains normalized attributable match candidates, recognized context-only slots and bounded local acquisition failures. Required envelope/context shape errors reject the request before writing. Invalid supplier secondary fields are omitted from their proposal with a filtered reason, not silently converted to null; supplier-level invalid rows remain explicit failures. Business acceptance errors are per match.

Bound the complete calendar to 1,000 entries and 8 MiB of JSON, excluding images. Include every relevant row/slot/failure in its count; no truncation or automatic chunk finalization. Collapse identical native-reference duplicates; contradictory duplicates isolate that reference and block absence reconciliation. A qualified empty observation is explicitly distinguished from unreadable/missing essential sections.

Successful HTTP processing returns a JSON outcome with per-reference accepted/unchanged/stale/rejected results, useful counts and whether absence was reconciled. A partial outcome is not an HTTP 207, asynchronous job or complete success. Globally invalid shape/context, permissions and unavailable processing use the shared Problem Details profile. No raw body or personal detail appears in reasons.

Use optional/null/value semantics without per-field state wrappers. No proposal preserves the old usable fact; explicit null has only the owning field's qualified absence/removal meaning. An old whole observation is rejected before mapping new facts. Keep required identities and context separate from optional sporting values.

Images use a separate binary submission with observation metadata, actual PNG/JPEG validation and the 5-MiB bound. Backend accepts bytes; it does not fetch a collector-supplied URL. Provenance URLs are descriptive evidence with no credentials or arbitrary proxy behavior.

The collector authenticates with its environment-specific M2M client/audience and ingestion permission. The backend validates current authorized cycle/scope and reconstruction mode; neither a mobile token nor an invented old cycle bypasses closure or visibility. A lost response has an uncertain aggregate outcome: completed match commits remain; the next ordinary observation can resolve failures. Do not replay the entire pipeline automatically.

`cycleId` resolves a backend-owned immutable context containing source binding, season, allowed sporting scope, logical cycle order, starting classification/configuration and reconstruction mode. `readOrdinal` is assigned before each provider read within that cycle; completion time is freshness only. F01 work assignment must supply the existing pool/match/club IDs and effective locality revision it actually authorizes. Calendar outcomes return resolved team IDs for ordinary logo submissions. No arbitrary client-provided cycle order, historical flag or professional club reference can widen these permissions.

## Mobile administration

Retain existing resource editing, classification and division lifecycle journeys. Read projections expose current effective values, independent source/manual modes and a scoped editing revision; no supplier document or JPA entity is exposed.

Commands carry the revision they edit and explicit desired values. Removing one customization does not reset another field; contact source/manual/hidden modes stay distinct. Use current F12 action/scope grants, with no moderator or M2M inheritance. Reject stale commands as conflicts without effects, and return the accepted projection after success. Lost responses lead to a read before any explicit retry; no persistent command history is added.

Presentation saves use ordinary `multipart/form-data`: one JSON metadata part and an image part only for `logoAction=replace`. `keep` preserves the image; `automatic` removes only manual artwork. The backend validates every part before committing the single editor transaction. There is no staging upload, media token or persistent draft. Division creation uses the same form with no prior revision; case-insensitive name uniqueness and rereading the configuration list handle an uncertain result. Other updates require their resource revision.

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

F07 processes required accepted-match transitions synchronously in the F02 transaction; F08 publication uses the same match lock. Composition and consumed facts belong to F07. After-commit push is best effort and cannot roll back accepted state. No broker, event archive or durable outbox.

## Compatibility and qualification

F13 owns dialect, generation, error profile and compatibility with every admitted mobile version. Requests reject unknown properties except intentional maps; responses tolerate additional properties while validating known fields. Enum additions are not presumed compatible. Generate provider and consumers from the same authored revision; compile and exercise serialization/validation before runtime adoption.

F02 machine problem identifiers use stable URNs: `urn:blockout:problem:invalid-observation`, `stale-observation`, `invalid-cycle-context`, `identity-conflict`, `classification-conflict`, `stale-revision` and `invalid-image`, with the same prefix on each suffix. The common HTTP categories use `invalid-request`, `unauthenticated`, `forbidden`, `not-found`, `payload-too-large`, `unsupported-media-type` and `unavailable`. `type` is the identifier; there is no duplicate code field. Authorized classification conflicts may include `conflictingResourceIds`; no private contact data appears in diagnostic details. New types use the existing generic client error until their owning presentation is supported.

Cross-field checks remain focused handwritten boundary/application validation: total calendar entries, paired numeric result totals, special-result label, required LNV/FFVB identity fields, current cycle scope, manual contact value rules, at least one changed contact field, coordinate pairing and multipart image/action consistency. Generated structural validation alone cannot establish these invariants. OAS 3.0.4 optional nullable objects deliberately avoid an inheritance/union hierarchy; qualify undefined versus explicit null through the selected Java mapper and real MVC binding.
