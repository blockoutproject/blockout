# MRG-376 Config Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `CFG-01` through `CFG-07` and `CFG-10` through `CFG-16`
- Owner: `config-service`
- Migrated consumer: `search-worker` division snapshot reads
- Deferred consumers: mobile-gateway, Expo, and Python scrapers
- Production effect: none

## Purpose

MRG-376 completes the owner-side generated v2 migration for app status, divisions, raw division mappings, and scraper
status. It also replaces the search worker's handwritten snake_case division client with a generated Java client and
an immediate immutable application snapshot projection.

The 14 existing v1 operations remain available through isolated legacy adapters. Both versions invoke the same
application services and persistence entities. No generated DTO or JPA entity crosses into application code, cache
state, indexing logic, or a v1 transport.

MRG-376 does not migrate mobile-gateway, Expo, or Python callers. Those cutovers remain owned by MRG-343, MRG-344,
MRG-348, and MRG-349.

Runtime validation exposed one source-contract mismatch before activation: the raw-mapping update fields were both
`required` and `nullable`, which made generated Java validation reject null. The source now models the deployed
behavior directly: omission and explicit null both unmap the field. The config bundle and official generated Python
model are regenerated from that correction; no caller is switched in this task.

## Boundary Ownership

| Family               | Application contracts                                                | Persistence owner                          | v2 generated boundary                  | v1 compatibility adapter             |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------- | ------------------------------------ |
| App status           | `AppStatusView`, `UpdateAppStatusCommand`                            | `appstatus/persistence`                    | `AppStatusApi` and generated models    | `appstatus/api/v1`                   |
| Divisions            | create/update commands, `DivisionView`, logo intent and storage port | `division/persistence`                     | `DivisionsApi` and generated models    | `division/api/v1`                    |
| Raw mappings         | create/update commands and `RawDivisionMappingView`                  | `rawmapping/persistence`                   | `RawDivisionMappingsApi`               | `rawmapping/api/v1`                  |
| Scraper status       | `ScraperStatusView`                                                  | `scraperstatus/persistence`                | `ScraperStatusesApi`                   | `scraperstatus/api/v1`               |
| Division logo        | `DivisionLogoUpload` and `DivisionLogoStorage`                       | S3 adapter under `division/infrastructure` | multipart adapter owns `MultipartFile` | same application image intent        |
| Worker config client | `DivisionCatalog` and immutable `DivisionSnapshot`                   | no worker persistence                      | generated `DivisionsClient`            | removed handwritten config transport |

Strict service-local MapStruct configurations own structural mapping in both deployables. Multipart reading and S3
logic are explicit adapters. Shared `FormatEnum`, `GenderEnum`, and `ScraperNameEnum` are used at application and
persistence boundaries, so the removed local enum copies cannot drift.

## Coexistence And Preserved Behavior

| Concern             | Preserved behavior                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| App-status updates  | omitted and explicit-null fields preserve stored values                                                  |
| Division listing    | active and inactive rows remain in repository-defined order                                              |
| Division creation   | duplicate names remain `400`; optional PNG/JPEG logo and five-megabyte limit remain                      |
| Division update     | partial fields preserve stored values; a supplied logo deletes then replaces the old object              |
| Division lifecycle  | every successful update reactivates an inactive division; delete remains a `204` soft deactivation       |
| Raw mapping filters | optional league and season filters remain exact matches in repository-defined order                      |
| Raw mapping update  | division, format, and gender are replaced; omission or explicit null unmaps each field                   |
| Legacy raw create   | the v1 adapter retains the complete entity-shaped request, including compatibility identity/audit fields |
| Scraper status      | missing rows are created by update; missing reads remain `404`                                           |
| Authorization       | all existing scopes and the scope-less authenticated app/scraper reads remain unchanged                  |
| v1 JSON             | adapter-local snake_case serialization preserves entity-shaped fields and list bodies                    |
| v2 JSON             | generated models own canonical camelCase objects and bounded list wrappers                               |
| Errors              | v1 retains the legacy error map; v2 uses Problem Details with stable code and request ID                 |

The temporary workspace-wide Jackson snake_case strategy remains because other config-service and monorepo slices
still depend on it. These four v1 adapters no longer depend on that global setting and contain no handwritten
`@JsonProperty` or `@JsonAlias`. MRG-351 and MRG-352 own the later global and annotation retirement waves.

## Search Worker Cutover

The search worker now generates its Java REST client from the committed config-service bundle during Maven
`generate-sources`, using the standard OpenAPI Generator Java `resttemplate` library. Its existing authenticated
`RestTemplate` still supplies the Auth0 M2M bearer token. Configured host, v1-config, and v2-config URLs normalize to
one host base before the generated client calls `/api/v2/config/divisions`.

Generated response models are mapped immediately to immutable `DivisionSnapshot` records. Cache bootstrap and refresh
jobs consume only the `DivisionCatalog` application port and continue projecting the same division ID, name, and logo
into the existing cache events. The handwritten `ConfigClientService`, copied `DivisionDTO`, snake_case annotations,
and manual URL construction are removed.

If the v2 read must be rolled back before the next worker migration, the worker image can revert to the previous v1
client while config-service remains on the dual-route image. No database, Elasticsearch index, cache schema, or event
contract changes are involved.

## Telemetry And Removal Gate

The config compatibility filter records `CFG-01` through `CFG-07` and `CFG-10` through `CFG-16`, API version, status
class, latency, internal caller cohort, and a bounded request ID. The shared config-service Problem Details boundary
now covers all canonical v2 config routes while retaining legacy bearer behavior for v1.

The v1 adapters remain mandatory. Their removal still requires every production caller to migrate and the MRG-304
30-day zero-traffic gate. Search-worker migration alone does not authorize removing division v1 because mobile-gateway
is still a known caller.

## Verification Evidence

- The 14 generated Spring operations are implemented by owner controllers with explicit scope checks.
- Focused behavior tests cover null-preserving app updates, division logo replacement/reactivation, raw unmapping,
  scraper upsert, generated boundary ownership, local legacy snake_case JSON, immutable worker mapping, normalized
  service URLs, canonical v2 routing, and bearer transport.
- The config-service and search-worker test reactor passes with 19 behavior tests across the impacted modules.
- Maven generation and compilation prove the generated server and worker client against the committed contract bundle.
- No Flyway file, database shape, cache shape, event, Expo app, scraper runtime, standalone repository, Maaatch file,
  or production resource changes in this task.

## Closed Scope

- MRG-343 owns the remaining mobile-gateway configuration workflows and generated config clients.
- MRG-344 owns the corresponding Expo generated-client cutover.
- MRG-348 and MRG-349 own scraper-status and raw-mapping Python caller cutovers.
- MRG-412 owns deeper search-worker cache and reconciliation restructuring.
- MRG-351, MRG-352, and MRG-374 own later casing and annotation cleanup after their caller gates close.
- The active goal still stops before Phase MRG-900.
