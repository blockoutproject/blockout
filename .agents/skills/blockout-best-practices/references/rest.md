# REST Endpoints

Apply this policy when changing an OpenAPI operation, controller, request, response, query parameter, error, collection,
or service-to-service HTTP boundary.

## Resource And HTTP Semantics

- Design paths around stable business resources and relationships, using plural collection nouns and stable member IDs.
- Nest a path only when the parent relationship is part of identity or authorization.
- Keep mobile-gateway routes client-oriented and internal service routes owner-oriented.
- `GET` is side-effect free; `POST` creates or submits a non-idempotent command; `PUT` replaces; `PATCH` applies a
  defined partial change; `DELETE` removes or deactivates only when the product contract says so.
- Return status codes that describe the observable result. Use `201 Created` and `Location` when applicable; never
  return success with an error body.
- Define idempotency deliberately for externally retried commands. Do not introduce a generic framework pre-emptively.

OpenAPI is authoritative. Edit source fragments first and regenerate every configured producer and consumer. Do not
add field aliases, naming hacks, or handwritten mirrors to compensate for a contract mismatch.

## Controllers

A controller has four responsibilities: extract trusted transport context, validate the transport boundary, delegate
to one application operation, and map the result.

Controllers do not own repository orchestration, provider parsing, transactions, or business decisions. Transport
validation belongs at the edge; business validation belongs to the application or domain. Follow `mapping.md`, and
never expose entities, provider payloads, or persistence projections.

## Errors

Translate expected application failures to RFC 9457-compatible `ProblemDetail` responses with a stable code, suitable
status, safe title, and useful non-sensitive detail. Keep validation, authentication, authorization, not-found,
conflict, dependency, rate, and unexpected failures distinguishable when clients recover differently.

Clients branch on stable codes, not backend prose. Never leak stack traces, SQL, internal hosts, provider bodies,
tokens, secrets, or personal data.

## Collections And Pagination

Return a complete collection only when it is intentionally bounded. Otherwise use an explicit paginated contract.

For offset pagination:

- use zero-based `page` and bounded `pageSize` parameters;
- return `items` and `pageInfo`, including `page`, `pageSize`, and `hasNext`;
- guarantee `totalItems` only when a consumer needs an exact count and the application can compute it correctly;
- document one deterministic ordering with an immutable unique tie-breaker;
- keep filters explicit and product-owned; do not add a generic sort or query language.

Prefer a slice-style query when only `hasNext` is required. Do not expose framework page types. Cursor pagination needs
an accepted requirement for a highly mutable stream or navigation that offsets cannot support, plus explicit cursor
stability, opacity, filter binding, direction, expiry, and error rules.

## Verification

- Test controller-owned validation, status, headers, security, and error translation at the narrowest useful level.
- Verify mapping and every changed producer and consumer.
- Prove deterministic collection ordering and pagination bounds where applicable.
- Regenerate, compile, and compare generated boundaries after contract changes.
- Run the owning module tests and repository diff-hygiene checks.
