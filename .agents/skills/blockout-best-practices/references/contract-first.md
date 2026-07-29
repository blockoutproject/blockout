# Contract-First Policy

Read this reference before changing an API shape, DTO, endpoint, error, generated client, backend OpenAPI interface, or
transport enum.

## Core Rule

- OpenAPI source fragments are the source of truth.
- Edit the owning OpenAPI sources declared by the repository router first.
- Generate next.
- Adapt application code only after generation succeeds.

Never hand-edit generated specifications, clients, server interfaces, models, mappings, or source directories declared
by the repository profile.

Keep the existing API paths, active version, and repository-owned field naming declared by the repository profile.
Generated adoption must not introduce speculative version names, compatibility DTOs, serialization aliases, or
case-conversion layers.

## Choose The Shape

- Schema only: add the schema in the owning service only when an active boundary references it.
- Endpoint: model the REST resource first, then the operation.
- Complete bounded collection: return an `items` wrapper named `*ListResponse`; do not include `pageInfo`, `page`, or
  `pageSize`; document the bounded source and deterministic order.
- During an import-only adoption, preserve an established bare array response unless the roadmap task explicitly
  authorizes the compatible migration to a wrapper.
- Paginated collection: return an `items` and `pageInfo` wrapper named `*PageResponse`; guarantee `hasNext`; do not
  require `totalItems` without a product need and a reliable count.
- Shared transport enum: every OpenAPI `*Enum` schema belongs in the configured shared schema location.
- Shared non-enum schema: use that shared location only for a true cross-boundary technical primitive.
- Source-sensitive surface: require current roadmap scope or a product decision before exposing new behavior.

## Schemas

- Use object schemas with explicit `required` lists for mandatory fields. Omit `required` for an all-optional object.
- Set `additionalProperties: false` unless an extension map is intentional.
- Put descriptions on the object, enum, or operation. Do not add descriptions under individual properties.
- Model stable transport values as enums and end enum component names with `Enum`.
- Keep every enum component present in a repository-owned OpenAPI contract under the configured shared schema location.
- Use the canonical business concept name. Do not create gateway- or service-prefixed enum mirrors.
- Handwritten code imports generated transport enums from the package declared by the repository profile. If a
  transport enum is missing there, add or move its OpenAPI source under the configured shared schema location and
  regenerate instead of creating a local copy.
- Application policies remain handwritten in their owning application. Provider-owned values remain in provider
  adapters and do not become repository transport enums by accident.
- Use `nullable` only when `null` is a real API state.
- Separate request DTOs, response DTOs, application commands/views, domain models, and persistence entities.
- Reuse the configured generated shared-model package for transport enums and rare shared technical primitives only.
- Do not reuse a command request as a read projection.
- Do not let generated DTOs define application, domain, or persistence models.

## Boundary Naming

- DTOs are boundary-local by default.
- Internal service DTO component names include `Internal`; public-gateway DTO component names do not.
- The consumer language does not change ownership: Python scrapers call the owning backend services directly, so their
  generated transport DTOs also use the internal service names. They never substitute public-gateway DTOs for those
  contracts.
- Place `Internal` immediately before the shape suffix: `ResourceInternalResponse`, `ResourceInternalPageResponse`,
  `CreateResourceInternalRequest`, or `UpdateResourceInternalRequest`.
- Use `*ListResponse` only for complete unpaginated list wrappers: `items` only, with no `pageInfo`, `page`, or
  `pageSize` query parameters.
- Use `*PageResponse` only for paginated wrappers: `items` and `pageInfo`, with endpoint parameters aligned to the REST
  policy.
- Use `Upsert` only when the operation has real upsert semantics.
- Public-gateway DTOs keep UI and product names such as `ResourceDetailResponse`, `ResourceListItemResponse`, and
  `CreateResourceRequest`.
- Avoid bare resource nouns for wire DTOs. Use an explicit suffix for requests, responses, list/page responses, and
  command bodies.
- Give nested value objects an intentional boundary-local name. Add `Internal` when an internal nested object could be
  confused with a public-gateway projection.
- Keep generated DTOs from another service inside client or adapter packages and map them immediately to local
  application, domain, read-model, or gateway types. Shared generated transport enums are the exception.

## Polymorphic `oneOf`

- Do not put `oneOf` inline in an endpoint.
- Expose a polymorphic body through a named component.
- Define `discriminator.propertyName` and `mapping`.
- Require the discriminator field on the parent and subtypes.
- Keep the parent and subtypes on the same Java discriminator type; prefer a shared named transport enum.
- Validate Java, Python, and impacted mobile generation before combining `oneOf`, `allOf`, and a discriminator.

## Schema-Only Bridge

`x-contract-schema-roots` may include active schemas that an existing wire shape cannot reference directly.

- Use it only as a temporary bridge for an active boundary, such as an established multipart JSON string.
- Do not create fake endpoints.
- Put roots on the owning service base contract.
- Remove a root when a real operation can reference the schema directly without changing compatibility.
- Never present this bridge as API behavior.

## Endpoints And Errors

Each operation defines:

- a stable `operationId`;
- focused tags;
- a short `summary`;
- a request schema when needed;
- a concrete success response or an intentional `204`;
- expected errors;
- explicit security when it is not clearly inherited.

Expected errors use these semantics:

- `400`: invalid shape.
- `401`: missing or invalid authentication.
- `403`: missing scope or permission.
- `404`: missing or hidden resource.
- `409`: duplicate, stale revision, state conflict, or incompatible retry.
- `422`: business violation with a valid shape, only when the service distinguishes it.
- `503`: technical dependency unavailable.

Errors use `ProblemDetail`-compatible bodies with a stable machine-readable `code`.

## Generated Output

- Java shared transport enums, server interfaces, and internal clients are generated into the locations selected by
  the repository profile.
- Python models and asynchronous HTTPX clients are generated with the pinned OpenAPI Generator CLI into the private
  package selected by the repository profile. Keep one declarative batch configuration per adopted contract.
- TypeScript models and application clients are generated only from their owning public contract into the configured
  generated location. A public client never consumes an internal service contract directly.
- Never edit generated code, add custom templates, or commit generated sources. Prefer native generator configuration;
  add a script only when the official tools do not provide the required operation.

## Readiness And Generation

Before adopting a service contract, focused tests must prove that every active handwritten mirror has:

- the final role name;
- the owner's exact repository-configured field names, types, nullability, nesting, and enum values;
- no legacy-version DTO, alias, or duplicate complete-resource residue;
- characterization evidence for every active producer and consumer.

Generated adoption then replaces imports and deletes the proven handwritten mirrors. It must not conceal another
model, business, route, or serialization redesign.

Run only the generation commands declared by the repository router for the impacted layers, in source-to-consumer
order.

Run a generated client target only after its public-gateway vertical creates it. If generation fails, fix source
fragments or native generator configuration; never patch generated files. Completion requires deterministic clean
generation, impacted Java/Python package builds and imports, active consumer tests, and proof that Git tracks no
generated artifact.
