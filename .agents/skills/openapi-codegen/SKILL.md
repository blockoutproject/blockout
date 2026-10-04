---
name: openapi-codegen
description: "Change OpenAPI schemas, REST semantics, generated server interfaces or clients, shared transport enums and response validation across Java, Python and TypeScript."
---

# OpenAPI contracts and generation

Read the repository's accepted API behavior, source fragments, OpenAPI version, bundling/mapping targets, generator configuration and consumers. Existing contracts keep their compatibility. New fields and query parameters use camelCase; do not rename existing wire fields incidentally.

Edit the owning source first, generate next, then adapt handwritten code. A new schema is not permission to expose new behavior. Generate only active boundaries. Never edit or commit generated output, patch its templates as a shortcut, or add recursive case-conversion/compatibility aliases without an accepted migration.

## Schema contracts

- Define object roles and `required` explicitly; omit `required` for an all-optional object. Use `additionalProperties: false` unless extension keys are intentional.
- Document objects, operations **and properties**, including meaning, units, relevant examples, bounds and supported absence/null semantics. Required, absent, null and empty are not interchangeable.
- Separate request and response shapes. Do not reuse a mutation request as a read projection.
- Name DTOs by role: `CreateResourceRequest`, `ResourceDetailResponse`; internal service shapes use `ResourceInternalResponse` or `CreateResourceInternalRequest`, with `Internal` immediately before the shape suffix.
- Use `Upsert` only for true upsert semantics. Choose collection names and fields for their actual shape, not a universal pagination vocabulary.
- Define stable finite wire concepts as named reusable `*Enum` components and reference them. Shared contract-owned enums have one owner; provider vocabularies stay local to their boundary. Preserve serialized values.
- Generated object DTOs remain at transport/adaptation boundaries. Java and Python application code and frontend code can reuse a generated enum only when it is the exact contract-owned concept; pure domain code remains independent. Generated object DTOs stay in the Python API adapter; an exact contract-owned enum may cross into application code, never the pure domain.
- Share a non-enum schema only for a genuine cross-boundary technical primitive. Never expose JPA entities or raw provider records.

Use named `oneOf` components, an explicit discriminator property and mapping, and required discriminator values on the relevant shapes. Prove supported generation and serialization in every affected language before accepting combined `oneOf`/`allOf` inheritance.

## REST and errors

Every endpoint needs a stable operationId, focused tags, concise summary and description, concrete success schema or intentional 204, expected errors and explicit security where not inherited. Model resources and HTTP method semantics before implementation; never mutate via safe methods.

Use RFC 9457-compatible ProblemDetail errors with stable machine-readable codes. Clients branch on codes rather than human/provider messages. Distinguish malformed input (400), unauthenticated (401), forbidden (403), missing or deliberately hidden (404), duplicate/stale/state conflict (409), valid-shape business rejection (422 only when the API distinguishes it), and dependency unavailable (503). Do not leak stack traces, internal topology or provider payloads.

Choose page/offset/cursor per use case and compatibility. Define maximum bounds, deterministic ordering/tie-breakers, filter behavior, count availability/cost and the effect of concurrent changes. Cursors need an explicit validity/continuation contract; pages need explicit indexing and stability expectations. Do not impose `pageInfo`, total counts or one universal collection envelope.

## Language generation

Read [generator and validation boundaries](references/generation.md) for any client or server generation change. Use the existing configured Java OpenAPI Generator, pinned Python HTTPX generator and TypeScript Orval pipeline. Do not change framework versions to satisfy a policy-only task.

Replace handwritten transport mirrors only after the accepted shapes and owner/consumer behavior are characterized. Then remove the obsolete mirrors as part of the same scoped adoption. Do not disguise a route, model or business redesign as code generation.

## Evidence

Run source bundling and mapping synchronization in the configured order, generation, affected language builds/imports/typechecks, and active consumer tests. Enum, union, nullability and field changes require all affected consumers, not just the producer. Verify deterministic clean regeneration and ignored generated artifacts. Exercise handwritten serialization/error/validation behavior where meaningful; do not test generated source spelling. Report unsupported generation or missing consumer evidence as unresolved.
