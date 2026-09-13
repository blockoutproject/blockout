# Contract-First Policy

Read this reference before changing an API shape, DTO, endpoint, error, generated client, backend OpenAPI interface, or
transport enum.

## Core Rule

- OpenAPI source fragments are the source of truth.
- Edit the owning OpenAPI sources declared by the skill entry point and repository build configuration first.
- Generate next.
- Adapt application code only after generation succeeds.

Never hand-edit generated specifications, clients, server interfaces, models, mappings, or source directories declared
by the repository instructions.

Keep the existing API paths, active version, and repository-owned field naming declared by the repository instructions.
Generated adoption must not introduce speculative version names, compatibility DTOs, serialization aliases, or
case-conversion layers.

## Choose The Shape

- Schema only: add the schema in the owning service only when an active boundary references it.
- Endpoint: model the REST resource first, then the operation.
- Collection: define the shape and deterministic ordering from the accepted use case; preserve established wire
  compatibility. This policy does not choose a pagination mechanism or parameter vocabulary.
- Shared transport enum: put reusable application transport concepts in the configured shared schema location.
- Shared non-enum schema: use that shared location only for a true cross-boundary technical primitive.
- New behavior requires an accepted specification or an explicitly authorized correction; an existing schema is not
  permission to expose it.

## Schemas

- Use object schemas with explicit `required` lists for mandatory fields. Omit `required` for an all-optional object.
- Set `additionalProperties: false` unless an extension map is intentional.
- Put descriptions on the object, enum, or operation. Do not add descriptions under individual properties.
- Model stable transport values as enums and end enum component names with `Enum`.
- Keep reusable application transport enum components in the configured shared schema location. Provider-owned
  vocabularies may stay as named `*Enum` schemas beside their provider boundary; reference them with `$ref` rather than
  defining inline property enums. Do not change shared enum parsing to accommodate one provider.
- Use the canonical business concept name. Do not create gateway- or service-prefixed enum mirrors.
- Handwritten HTTP adapters import generated transport enums from their configured owner package. Add a missing
  shared concept to the shared OpenAPI source and regenerate instead of creating a handwritten transport copy.
- Application policies remain handwritten in their owning application. Provider-owned values remain in provider
  adapters and do not become repository transport enums by accident.
- Express nullability with the syntax supported by the selected OpenAPI version, only when `null` is a real API state.
  Absence and explicit null are distinct when the operation gives them different meaning.
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
- Place `Internal` immediately before the shape suffix: `ResourceInternalResponse`, `CreateResourceInternalRequest`, or `UpdateResourceInternalRequest`.
- Name collection response types for their documented shape and preserve established consumer compatibility.
- Use `Upsert` only when the operation has real upsert semantics.
- Public-gateway DTOs keep UI and product names such as `ResourceDetailResponse`, `ResourceListItemResponse`, and
  `CreateResourceRequest`.
- Avoid bare resource nouns for wire DTOs. Use an explicit suffix for requests, responses, collection responses, and
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

Errors use RFC 9457 `ProblemDetail`-compatible bodies with a stable machine-readable `code` defined in the shared
transport error enum. Clients branch on that code rather than provider messages or human-readable detail text.

## Generated Output

- Java shared transport enums, server interfaces, and internal clients are generated into the locations selected by
  the repository instructions.
- Python models and asynchronous HTTPX clients are generated with the pinned OpenAPI Generator CLI into the private
  package selected by the repository instructions. Keep one declarative batch configuration per adopted contract.
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

Run the configured bundling and schema-mapping synchronization before language generation, then validate impacted
consumers in source-to-consumer order. Use the owning build targets from the skill entry point and repository manifests.

Run only generated client targets that exist for the accepted boundary. If generation fails, fix source
fragments or native generator configuration; never patch generated files. Completion requires deterministic clean
generation, impacted Java/Python package builds and imports, active consumer tests, and proof that Git tracks no
generated artifact.
