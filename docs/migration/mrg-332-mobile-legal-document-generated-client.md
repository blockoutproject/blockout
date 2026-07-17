# MRG-332 Mobile Legal Document Generated Client Migration

- Status: implemented in the monorepo shadow baseline
- Owner: `mobile-gateway`
- Downstream operations: `CFG-08` and `CFG-09`
- BFF operations: `BFF-P-05` and `BFF-S-07`
- Production effect: none

## Purpose

MRG-332 completes the BFF portion of the legal-document pilot. The canonical mobile-gateway v2 routes implement their
generated server interface and call config-service v2 through a generated Java client. Generated transport types are
mapped immediately to workflow-owned records at both BFF edges.

The v1 BFF routes remain observable compatibility boundaries. They still call config-service v1 through an explicitly
named legacy adapter because the v1 response includes persistence identity and audit timestamps that the canonical v2
contract intentionally omits. Removing those fields from v1 would be a product-visible regression, while copying them
into v2 would reintroduce entity-shaped transport. MRG-332 therefore replaces handwritten access for the canonical
slice without disguising the retained v1 adapter as canonical code.

## Boundary Ownership

| Role                        | Owner                                        | Shape                                                                                 |
| --------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| BFF source contract         | mobile-gateway OpenAPI fragments             | `getMobileLegalDocument` and `updateMobileLegalDocument` under `MobileLegalDocuments` |
| Generated inbound boundary  | mobile-gateway build output                  | `MobileLegalDocumentsApi` and generated request/response models                       |
| Inbound adapter             | `configuration/legal/api`                    | controller, strict mapper, scoped Problem Details, security writer, and telemetry     |
| Application workflow        | `configuration/legal/application`            | `LegalDocumentView`, `UpdateLegalDocumentCommand`, port, and workflow                 |
| Generated downstream client | mobile-gateway build output from config spec | `LegalDocumentsClient` and generated config request/response models                   |
| Outbound adapter            | `configuration/legal/outbound`               | auth selection, strict mapper, URL normalization, and generated client configuration  |
| Legacy BFF compatibility    | `configuration/legal/legacy`                 | handwritten v1 transport only                                                         |
| Expo generated output       | mobile-owned Orval output                    | deterministic tag-split output; runtime adoption remains MRG-333                      |

The application port has no Spring, OpenAPI, persistence, or legacy DTO dependency. Generated BFF models stop at the
inbound mapper, and generated config-service models stop at the outbound mapper. The v1 DTOs remain reachable only
from the v1 controllers, the legacy client, and the pre-existing compatibility service facade.

## Route And Behavior Matrix

| Concern                  | v1 compatibility route                            | v2 canonical route                                        |
| ------------------------ | ------------------------------------------------- | --------------------------------------------------------- |
| Public read              | `GET /api/v1/mobile/public/config/legal/{type}`   | `GET /api/v2/mobile/public/config/legal/{type}`           |
| Authenticated update     | `PUT /api/v1/mobile/secure/config/legal/{type}`   | `PUT /api/v2/mobile/secure/config/legal/{type}`           |
| Downstream route         | config-service `/api/v1/config/legal/{type}`      | config-service `/api/v2/config/legal/{type}`              |
| Success body             | full snake_case body with ID and audit timestamps | generated camelCase type, title, version, and content     |
| Partial update           | null values preserve stored fields                | null values preserve stored fields                        |
| Public transport auth    | existing M2M selection                            | existing M2M selection through generated client transport |
| User transport auth      | forwarded authenticated user JWT                  | forwarded authenticated user JWT                          |
| Errors                   | existing legacy BFF error map                     | scoped Problem Details with stable code and request ID    |
| Unknown downstream error | existing global compatibility handling            | safe `downstream_error` without leaking an upstream body  |
| Availability failure     | existing compatibility handling                   | `config_service_unavailable` Problem Details              |

Both generated clients reuse the existing five-second connection timeout, fifteen-second read timeout, forwarded-user
JWT interceptor, and Auth0 M2M interceptor. No retry, case conversion, cache policy, or implicit authorization rule is
added. `CONFIG_API_URL` accepts the checked-in host-only form and the temporary versioned config suffixes so the v2
client cannot duplicate a legacy base path during coexistence.

## Compatibility Telemetry And Removal

The BFF compatibility filter records only the two legal routes and emits the operation ID, API version, HTTP status,
status class, latency, and bounded request ID. It does not record legal content, request bodies, tokens, or downstream
error bodies.

MRG-332 does not remove v1. The isolated v1 downstream adapter remains required until all production BFF v1 traffic
has passed the MRG-304 removal gate. MRG-333 migrates the known Expo caller to the generated v2 BFF client, but neither
MRG-332 nor MRG-333 can waive the mobile-version, store-availability, or 30-day zero-traffic evidence.

## Deployment And Rollback

The future provider-first deployment order is:

1. retain a validated dual-route config-service image from MRG-331;
2. deploy and validate a dual-route mobile-gateway image containing this slice;
3. retain both dual-route images as the rollback baseline;
4. release the Expo v2 consumer only through MRG-333;
5. observe v1 and v2 compatibility telemetry before any removal decision.

Before a v2 Expo release, rolling back mobile-gateway to its standalone v1 image is safe because no production mobile
consumer requires the BFF v2 route. After a v2 Expo release, rollback must first return consumers to v1 or retain the
last known-good dual-route BFF image. Config-service must likewise remain dual-route while any BFF v2 instance exists.
No rollback changes legal-document rows or database schema.

## Verification Evidence

- Generated server and downstream client sources compile from committed OpenAPI bundles.
- Eleven focused tests prove URL normalization, BFF and downstream record mapping, nullable partial updates, exact config
  v2 paths, camelCase JSON, bearer transport, JWT-user versus M2M selection, the complete legacy v1 path and snake_case
  body, and safe downstream Problem Details propagation.
- Orval regeneration moves only the legal operations into the dedicated generated tag output; no Expo runtime import
  changes in MRG-332.
- Full backend packaging, contract validation, deterministic generation, mobile typecheck, documentation validation,
  Maaatch structural comparison, and whitespace checks pass locally. Shadow CI remains the publication gate.

## Closed Scope

- No Expo runtime call or form changes; MRG-333 owns both.
- No config-service runtime, database, event, scraper, standalone repository, Maaatch, or production change.
- No global Jackson strategy or legacy DTO is removed.
- MRG-377 remains responsible for removing the non-standard OpenAPI scalar and authorization metadata.
- The active goal still stops before Phase MRG-900.
