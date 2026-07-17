# MRG-331 Legal Document Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `CFG-08` and `CFG-09`
- Owner: `config-service`
- Consumer state: all known consumers still use v1 until MRG-332 and MRG-333
- Production effect: none

## Purpose

MRG-331 is the first runtime proof of the Blockout contract/data architecture. It adds the canonical generated v2
legal-document boundary while preserving the complete v1 transport as an isolated compatibility adapter. Both routes
invoke one application service and one persistence model; neither route exposes that model.

No database migration, BFF caller change, Expo change, scraper change, event change, standalone repository change, or
production deployment belongs to this slice.

## Boundary Ownership

| Role                    | Owner                                                   | Shape                                                                                                |
| ----------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Source contract         | `libs/shared/contracts/specs/source/services/config/**` | OpenAPI operations `getLegalDocument` and `updateLegalDocument`                                      |
| Generated v2 transport  | `config-service` build output                           | `LegalDocumentsApi`, `LegalDocumentInternalResponse`, and `UpdateLegalDocumentInternalRequest`       |
| v2 adapter              | `legal/api/v2`                                          | generated interface implementation, API mapper, Problem Details, and security errors                 |
| v1 adapter              | `legal/api/v1`                                          | legacy records and one adapter-local snake_case `ObjectMapper`                                       |
| Application             | `legal/application`                                     | `LegalDocumentSnapshot`, `UpdateLegalDocumentCommand`, and the shared use case                       |
| Persistence             | `legal/persistence`                                     | `LegalDocumentEntity`, repository, and strict MapStruct mapper                                       |
| Compatibility telemetry | `legal/api`                                             | route version, operation ID, status class, latency, safe request ID, and problem/parse failure codes |

Generated models stop at the v2 API mapper. Legacy transport records stop at the v1 adapter. The application service
accepts and returns role-owned records, and the JPA entity remains persistence-owned.

## Preserved Behavior

| Concern                | v1 preserved behavior                                                     | v2 canonical behavior                                                    |
| ---------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Route                  | `/api/v1/config/legal/{type}`                                             | `/api/v2/config/legal/{type}`                                            |
| GET path lookup        | exact path value, without normalization                                   | same application behavior                                                |
| PUT path lookup        | lowercase and trim before lookup                                          | same application behavior                                                |
| Partial update         | null title, version, or content leaves the stored field unchanged         | same application behavior                                                |
| Read authorization     | public                                                                    | public                                                                   |
| Update authorization   | `SCOPE_update:legal`                                                      | `SCOPE_update:legal`                                                     |
| Success status         | `200`                                                                     | `200`                                                                    |
| Success body           | complete legacy entity-shaped JSON, including snake_case audit timestamps | generated camelCase contract with type, title, version, and content only |
| Unknown request fields | ignored                                                                   | generated Spring validation and deserialization rules                    |
| Missing document       | legacy `500` error map                                                    | `500` Problem Details with code `legal_document_not_found`               |
| Invalid JSON           | legacy `500` error map                                                    | `400` Problem Details with code `invalid_request`                        |
| Security errors        | existing bearer/legacy handling                                           | Problem Details with stable code and request ID                          |

The workspace-wide Spring snake_case strategy remains temporarily active for config-service routes that have not yet
migrated. It is not used by the v2 legal-document contract. The v1 legal adapter owns its mapper locally, and no
`@JsonAlias`, handwritten `@JsonProperty`, entity exposure, or generated-model conversion is used for coexistence.

## Telemetry And Removal Gate

The legal-document compatibility filter emits one structured event per v1 or v2 request with `CFG-08` or `CFG-09`,
API version, internal caller cohort, status, status class, latency, and a safe request ID. The v2 error boundary emits
the Problem Details code; the legacy input adapter emits an explicit compatibility parse-failure event without logging
the body.

This is the `T-REST` foundation for the slice. Production dashboards and the 30-day zero-v1 evidence window remain
later release/cutover work. MRG-331 does not remove v1. Its adapter remains mandatory until MRG-332 and MRG-333 migrate
all known callers and the MRG-304 `G-REST` gate is eventually proven.

## Deployment And Rollback

The provider-first sequence is:

1. build and validate a dual-route config-service image;
2. prove v1 parity and shadow-call v2 without switching a consumer;
3. retain the dual-route image as the next rollback baseline;
4. migrate mobile-gateway in MRG-332;
5. migrate Expo in MRG-333.

At completion of MRG-331 no v2 consumer exists. The last known-good standalone v1 config-service image therefore
remains the current production rollback artifact. After MRG-332 activates the first v2 consumer, rollback must first
revert that consumer to v1 and then use the retained last known-good dual-route owner image. No rollback changes the
database or legal-document rows.

## Verification Evidence

- Generated Spring sources compile from the committed config-service bundle without committing generated Java.
- Strict MapStruct generation fails on unmapped target fields.
- Focused tests cover the generated interface/path, transport-to-application mapping, omitted persistence/audit fields,
  camelCase Problem Details, shared request ID, exact legacy snake_case output, ignored legacy input fields, exact GET
  lookup, normalized PUT lookup, and null-preserving partial updates.
- The full Maven reactor package remains the unchanged backend baseline.
- Documentation, source-contract validation, Maaatch structural comparison, whitespace checks, and shadow CI remain
  required before publication.

## Closed Scope

- No production or standalone repository was read or changed.
- No Flyway file or database schema changed.
- No BFF, Expo, Python, RabbitMQ, Elasticsearch, or vendor boundary changed.
- MRG-332 owns the first generated backend consumer and route switch; its implementation and rollback evidence are
  recorded in the [MRG-332 BFF migration](mrg-332-mobile-legal-document-generated-client.md).
- MRG-333 owns the first generated Expo consumer and React Hook Form/Zod pilot.
- MRG-377 owns the cross-contract removal of custom scalar and authorization metadata after the complete pilot.
- The active goal still stops before Phase MRG-900.
