# Repository REST Endpoint Policy

Read this before changing a controller, request, response, query parameter, API mapper, error response, collection, or
service-to-service HTTP boundary.

## Resource Model

- Design paths around stable business resources and relationships, not controller methods or UI actions.
- Use plural nouns for collections and stable identifiers for members.
- Preserve existing active paths and methods unless the active task explicitly changes the contract.
- Use nested paths only when the parent relationship is part of the resource identity or authorization boundary.
- Model a state-changing operation as a resource or explicit command only when ordinary resource mutation is unclear.
- Keep public-gateway routes client-oriented and internal service routes owner-oriented; do not leak provider topology
  into the public contract.

## HTTP Semantics

- `GET` reads without side effects, `POST` creates or submits a non-idempotent command, `PUT` replaces an identified
  resource when that is truly supported, `PATCH` applies a defined partial mutation, and `DELETE` removes or deactivates
  only when the product contract says so.
- Return status codes that describe the observable outcome. Do not return success with an error payload.
- Use `201 Created` and `Location` when a resource was created and its location is known.
- Preserve idempotency semantics across retries. Give externally retried commands an explicit idempotency design when
  the task requires it; do not invent a generic framework.
- Keep request validation at the transport edge and business validation in the application boundary.

## Contract Shape

- OpenAPI is authoritative for repository-owned HTTP contracts. Follow `contract-first.md`.
- Repository-owned JSON bodies, responses, and query parameters use the convention declared by the repository profile.
- Do not add naming strategies, field aliases, or recursive case converters for repository-owned fields.
- Isolate provider-owned fields in provider-specific adapters and models.
- While a boundary remains handwritten, use explicit names such as `CreateResourceInternalRequest` and
  `ResourceInternalResponse`.
- Keep application commands, views, and domain values independent from HTTP and persistence types.

## Controllers And Mapping

- A controller authenticates, extracts transport input, delegates to one application boundary, and maps the result.
- Keep controllers thin and deterministic; no repository orchestration, provider parsing, or business decisions.
- Map transport to application models at the API boundary and follow `mapping-policy.md`.
- Never expose an entity, provider payload, message model, or generated persistence projection as an HTTP response.
- Keep complete resource mirrors aligned with the owning service. Purpose-specific summaries and search projections may
  be smaller only when their name and consumer make that role explicit.

## Errors

- Translate expected application failures to RFC 9457-compatible `ProblemDetail` responses.
- Provide a stable machine-readable code, suitable HTTP status, safe title, and useful non-sensitive detail.
- Keep authentication, authorization, not-found, validation, conflict, dependency, rate, and unexpected failures
  distinguishable where clients need different recovery.
- Never leak stack traces, SQL, provider bodies, secrets, tokens, internal hosts, or personal data.
- Client-facing copy must not depend on an unstable backend detail string; clients branch on stable codes.

## Collections

- Preserve the established collection contract and ordering when compatibility matters.
- Never expose a JPA page, repository projection, or provider collection directly.
- Any new collection shape or large-result navigation behavior requires an explicit contract-first task with all
  consumers in scope. This policy deliberately defines no repository-wide pagination standard.

## Verification

- Test controller-owned validation, security, status, headers, and error translation.
- Verify mappers and all changed producers and consumers.
- Confirm repository-owned serialization and unchanged provider naming.
- Regenerate and compare generated boundaries when OpenAPI changes.
- Run the owning module tests, affected client tests, and the repository diff-hygiene check.
