---
name: openapi-codegen
description: "Plan and evolve contract-first OpenAPI APIs across features and services; coordinate authoritative sources, generated server interfaces, DTOs, clients and response validation."
---

# OpenAPI contracts and generation

Read accepted requirements, current interface owners, source contracts, the selected OpenAPI version, generation configuration and consumers. An installed skill selects no application stack, service topology or generator. Existing contracts keep their compatibility. New fields and query parameters use camelCase; do not rename existing wire fields incidentally.

For technical planning, a new API or a change shared by several features, read [contract ownership and planning](references/planning.md). Plan scopes do not partition API ownership: several plans can evolve the same authoritative contract. Settle the affected interaction before either side implements assumptions about it.

Edit the owning source first, generate next, then adapt handwritten code. A new schema is not permission to expose new behavior. Generate only active boundaries. Never edit or commit generated output, patch its templates as a shortcut, or add recursive case-conversion/compatibility aliases without an accepted migration.

## Schema contracts

- Define object roles and `required` explicitly; omit `required` for an all-optional object. For new contracts, reject unknown request properties (`additionalProperties: false` on request objects) and allow additive response properties. Apply this distinction to nested objects too; intentional request maps declare their value schema. Preserve existing contracts until an evolution is authorized.
- Document objects, operations **and properties**, including meaning, units, relevant examples, bounds and supported absence/null semantics. Required, absent, null and empty are not interchangeable.
- Separate request and response shapes. Do not reuse a mutation request as a read projection.
- Name DTOs by role: `CreateResourceRequest`, `ResourceDetailResponse`; internal service shapes use `ResourceInternalResponse` or `CreateResourceInternalRequest`, with `Internal` immediately before the shape suffix. Name nested model shapes at their semantic owner when anonymous generation obscures their meaning; intentional maps remain maps.
- Use `Upsert` only for true upsert semantics. Choose collection names and fields for their actual shape, not a universal pagination vocabulary.
- Define stable finite wire concepts as named reusable `*Enum` components and reference them. Shared contract-owned enums have one owner; provider vocabularies stay local to their boundary. Preserve serialized values.
- Java and Python generated object DTOs stay at transport/adaptation boundaries and map to application/domain values. An exact contract-owned generated enum may cross into application code, never the pure domain. Frontend code may reuse a generated object type or enum directly after the selected transport checks when its meaning fits; introduce a form/view model and mapping only for different editing or presentation semantics.
- Additive response properties do not relax the contract's required fields, types, nullability or enums. Extra properties may be ignored; unknown enum values remain invalid unless their evolution policy explicitly permits them. Select and verify consumer enforcement separately under [generator and validation boundaries](references/generation.md); decoding is not necessarily exhaustive schema validation.
- Share a non-enum schema only for a genuine cross-boundary technical primitive. Never expose JPA entities or raw provider records.

Use named `oneOf` components, an explicit discriminator property and mapping, and required discriminator values on the relevant shapes. Prove supported generation and serialization in every affected language before accepting combined `oneOf`/`allOf` inheritance.

## REST and errors

Every endpoint needs a stable operationId, focused tags, concise summary and description, concrete success schema or intentional 204, expected errors and explicit security where not inherited. For new operation IDs without an existing convention, use `get…` for a resource read and `list…` for a collection read. Name reusable response components descriptively; HTTP status codes belong in operation responses, not semantic component names. OpenAPI validity describes a contract; it does not establish REST conformance.

Use [HTTP semantics, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) and [PATCH, RFC 5789](https://www.rfc-editor.org/rfc/rfc5789.html) as normative references:

- Model identifiable business resources and their representations, not controller methods, database tables or screens. Add sub-resources only for meaningful relationships or cohesive state; expose only operations needed by actual consumers, not automatic CRUD.
- For new routes without an accepted naming convention, use plural nouns for collections, stable identifiers for members and lowercase kebab-case literal segments. Use query parameters for filtering, sorting and pagination. These are this skill's naming defaults, not REST requirements; preserve existing conventions and compatibility.
- Never request business mutations through safe methods; use GET/HEAD for retrieval. PUT creates or replaces the target resource state and is idempotent; omitted writable state must not silently mean “keep”. PATCH applies a defined partial-change document atomically; specify omitted/null behavior and media type, without assuming every PATCH is idempotent. POST creates under a collection or performs resource-specific processing. DELETE removes the target association, without promising physical data erasure.
- Choose methods from observable semantics. A command that cannot honestly express resource replacement or partial modification may use POST with explicit effects; do not invent a persistent job resource just to make the URL look RESTful. Define repeated-request effects: idempotence concerns the intended server effect, not identical responses or permission for automatic retries.
- Align status, headers and response body: 201 for completed creation with the created resource identifiable; 202 only for accepted but incomplete processing with a defined way to determine its outcome; no content for 204. Prefer standard validators and conditional requests when concurrency or revalidation is needed; failed mutation preconditions use 412, distinct from domain conflicts using 409; conditional GET/HEAD can instead return 304 for an unchanged representation. Do not introduce validators or deduplication infrastructure without an actual need.
- Make requests understandable without an implicit preceding conversational session; persisted business data and authorization checks remain valid. Specify appropriate cacheability and protect authenticated/private responses; REST permits non-cacheable responses and does not require adding a cache service.

Write concise, self-contained descriptions focused on observable API behavior. Describe what the operation returns or changes, required permissions, and relevant limits, errors and side effects. Keep each description specific to its HTTP method and resource. Avoid internal feature identifiers, planning history and references that require reading another document to understand the contract. Keep requirement traceability and architectural rationale in the owning planning artifacts. Preserve necessary technical precision, including units, nullability, atomicity and partial-success semantics.

When a new API has no accepted error format, recommend RFC 9457-compatible Problem Details and settle the choice in the project’s technical plan. Preserve an existing accepted format and compatibility unless a migration is authorized. Define the selected shared error profile once, with stable machine-readable codes, and reference it from affected APIs; retain meaningful domain extensions and status-specific responses. A framework error class is an implementation adapter, not the source of the wire contract. Clients branch on codes rather than human/provider messages. Distinguish malformed input (400), unauthenticated (401), forbidden (403), missing or deliberately hidden (404), duplicate/stale domain state conflict (409), failed mutation precondition (412), valid-shape business rejection (422 only when the API distinguishes it), and dependency unavailable (503). Do not leak stack traces, internal topology or provider payloads.

Choose page/offset/cursor per use case and compatibility. Define maximum bounds, deterministic ordering/tie-breakers, filter behavior, count availability/cost and the effect of concurrent changes. Cursors need an explicit validity/continuation contract; pages need explicit indexing and stability expectations. Do not impose `pageInfo`, total counts or one universal collection envelope.

## Language generation

Read [generator and validation boundaries](references/generation.md) when selecting or changing client or server generation. Select generators and the application stack together against the required outputs when undecided; otherwise preserve the approved choices. Pin selected versions and configuration in the repository. OpenAPI Generator and Orval are candidates when their targets fit; their presence in this skill is not a selection. Installation alone does not authorize replacing an existing pipeline. Do not change framework versions to satisfy a policy-only task.

Replace handwritten transport mirrors only after the accepted shapes and owner/consumer behavior are characterized. Then remove the obsolete mirrors as part of the same scoped adoption. Do not disguise a route, model or business redesign as code generation.

## Evidence

Run source bundling and mapping synchronization in the configured order, generation, affected language builds/imports/typechecks, and active consumer tests. Enum, union, nullability and field changes require all affected consumers, not just the producer. Verify deterministic clean regeneration and ignored generated artifacts. Exercise handwritten serialization/error/validation behavior where meaningful; do not test generated source spelling. Report unsupported generation or missing consumer evidence as unresolved.
