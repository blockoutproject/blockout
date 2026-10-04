# F13 API and generation contract

**Owner**: F13 technical boundaries; business operations remain in their feature contracts.
**Trace**: F13 FR-008, FR-013, FR-015–FR-019, FR-031; constitution II/IV; [plan](../plan.md).

## Sources and outputs

| Authoritative future input                               | Consumers and ignored output                                                                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `contracts/public/openapi.yaml`, domain-owned fragments  | Java Spring interfaces/DTOs under `apps/backend/target/generated-sources/openapi/public`; Orval clients/Zod under `apps/mobile/src/generated` |
| `contracts/internal/openapi.yaml`, acquisition fragments | Java interfaces under `apps/backend/target/generated-sources/openapi/internal`; Python HTTPX package under `apps/ingestion/.generated`        |
| `contracts/shared/schemas/problem.yaml`                  | Single shared technical problem schema referenced by both roots                                                                               |
| `contracts/tooling/`                                     | Locked generator/linter configs and synthetic qualification fixtures; never production API endpoints                                          |

Bundle into ignored `contracts/.generated`. Configure Redocly bundle with `--component-renaming-conflicts-severity=error`: semantically different components must have explicit owner-appropriate names, never automatic numeric suffixes. Preserve operation-level authentication when assembling mixed documents into public/internal roots. Include declared security schemes explicitly; an inherited root policy must not disappear at a fragment boundary. The current design sources contain 49 public and 13 internal operations. F01's source contains both kinds and must be partitioned by path, not treated as a public-only fragment.

F02 configuration projections are `ClassificationConfigurationResponse` and `ClubContactConfigurationResponse`; F03 retains its distinct `ClassificationResponse` and `ClubContactsResponse`. F01/F02 use `SportProblemResponse` and F02's `sport-problem.schema.yaml`, preserving its bounds and `conflictingScopeIds`. F03 retains its consultation problem union; F05/F12 consume the base problem profile. Response and security component names identify their owners so descriptions, headers and authentication policies remain explicit. Future adoption of the common F13 problem source must preserve domain extensions and existing wire constraints; do not flatten different projections merely because their former names matched.

Generated Python code is made importable through the owning uv project's configured generated package path; generation precedes import/test/package. No runtime installation from the network. Mobile/Java compilation uses the configured generated outputs, not committed copies.

Public prefix `/api/v1`; private prefix `/internal/v1`. Product V2 does not imply API v2. HTTPS publicly; private network plus dedicated service credential internally. Public proxy rejects internal/management paths. Each operation declares access requirements, request/response/error schemas and bounded input/page/upload sizes. Domain plans own values and pagination; F13 creates no universal envelope/page/job/session DTO.

## Validation

Requests: explicit required/nullable fields, `additionalProperties: false` for authored request objects, strict primitive types without implicit coercion, declared enum values and domain validation. Configure Jackson/server validation explicitly; annotations alone are not proof of strictness.

Responses: additional fields allowed recursively, but validate every consumed required field, type, nullability, enum, date and nested object. An unknown consumed business enum fails safely as a contract error; never map it to permission, success or a different business value. Unknown problem codes use a safe generic French fallback. Domain-owned date-only values remain date-only, timestamps preserve instants/offset semantics; no timezone conversion invented by the transport layer.

Only contract-valid data reaches TanStack Query success/cache or Python application mapping. Handle 204 without parsing a JSON body. Non-JSON proxy errors and malformed responses become controlled technical failures. Business models, generated object DTOs, persistence and provider models remain separate; pure domain code never imports generated types.

## Problem response profile

Use RFC 9457 `application/problem+json`:

| Property       | Contract                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `type`         | Required URI reference, stable for the problem category; `about:blank` is valid for a generic HTTP problem |
| `title`        | Required safe French category text                                                                         |
| `status`       | Required integer matching the actual HTTP response                                                         |
| `code`         | Required stable open string; domain owns business codes, F13 owns technical categories                     |
| `diagnosticId` | Required server-generated opaque UUID, unrelated to accounts/resources                                     |
| `detail`       | Optional safe French explanation, never provider/exception text or request values                          |
| `instance`     | Optional opaque `urn:uuid:` reference; never an automatically copied request URI                           |

Required generic code categories: `INVALID_REQUEST` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `DEPENDENCY_UNAVAILABLE` (503), `INTERNAL_ERROR` (500). Domain operations may specialize codes and document other statuses. A hidden resource may deliberately use 404 under its owner's rules. Technical refusals from the proxy may lack this body and still require safe handling.

Spring uses ProblemDetail and centralized exception mapping, with equivalent Security authentication/denial handlers. Override default instance enrichment to prevent path/query disclosure. Never log request bodies, authorization headers, query strings or provider payloads. Diagnose with the opaque reference; never trust an inbound correlation value as an unrestricted log string.

The mobile adapter maps status/code to safe presentation behavior. A transport failure does not revoke identity. Token/session changes remain F05-owned; F13 introduces no independent refresh loop.

## Generation and compatibility

- OpenAPI Generator `spring`: interface-only server contracts, Boot 4/Jackson 3-compatible options from the pinned version. Do not generate another server/application architecture.
- OpenAPI Generator `python` with HTTPX async library configuration; use real decoder/validation tests, not assumptions from annotations.
- Orval React Query/fetch plus Zod. A thin application mutator owns timeout, session generation and safe failure mapping; validate exactly once before success. Qualify the selected pinned runtime-validation integration; no handwritten template fork.
- Redocly CLI lint/bundle and oasdiff breaking-change comparison are pinned tooling dependencies. Static diff is complemented by representative supported mobile-consumer fixtures; it is not proof of semantic compatibility.
- Compare public contracts against released mobile versions still allowed by F12, separately per platform. Store sanitized source contracts/consumer fixtures in repository history/release evidence, never personal production payloads.
- Breaking changes require a new API version or an explicit supported-client transition under F12/F14; no automatic minimum-version bump. Internal backend/collector contracts must remain compatible across the documented deployment sequence or stop the collector during the coordinated change.
- Generate twice from clean outputs and compare reproducible output; build/import/test actual consumers. Never edit generated projections as the fix.

## Qualification cases

Strict extra-field/type/null request failures; additive nested response fields; missing consumed fields; unknown business enum; unknown problem code; date-only and instant values; non-JSON proxy failure; 204; Security/controller error consistency; internal authentication refusal; generation from clean checkout through all consumers. Use test-only contract fixtures until a domain provides a real operation.

Actual generator patch compatibility and runtime behavior must be demonstrated during initialization. If unsupported, block the boundary and seek a decision rather than quietly changing generation or disabling validation.
