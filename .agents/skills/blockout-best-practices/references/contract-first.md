# Blockout Contract-First

Read this reference before changing an API shape, DTO, endpoint, error, generated client, backend OpenAPI interface, or
transport enum.

## Core Rule

- OpenAPI source fragments are the source of truth.
- Edit `libs/shared/contracts/specs/source/**` first.
- Generate next.
- Adapt application code only after generation succeeds.

Never hand-edit:

- `libs/shared/contracts/generated/specs/*.json`
- `apps/frontend/mobile/src/shared/generated/**`
- `apps/backend/*/target/generated-sources/**`
- `libs/shared/python-contract-clients/src/blockout_contract_clients/*/**`
- the generated `schemaMappings` block in `apps/backend/pom.xml`

Keep the existing V1 paths and native camelCase fields. Generated adoption must not introduce V2 names, compatibility
DTOs, Jackson naming aliases, or case-conversion layers.

## Choose The Shape

- Schema only: add the schema in the owning service only when an active boundary references it.
- Endpoint: model the REST resource first, then the operation.
- Complete bounded collection: return an `items` wrapper named `*ListResponse`; do not include `pageInfo`, `page`, or
  `pageSize`; document the bounded source and deterministic order.
- During an import-only V1 adoption, preserve an established bare array response unless the roadmap task explicitly
  authorizes the compatible migration to a wrapper.
- Paginated collection: return an `items` and `pageInfo` wrapper named `*PageResponse`; guarantee `hasNext`; do not
  require `totalItems` without a product need and a reliable count.
- Shared transport enum: every OpenAPI `*Enum` schema belongs in `source/shared/schemas`.
- Shared non-enum schema: use `source/shared/schemas` only for a true cross-boundary technical primitive.
- Source-sensitive surface: require current roadmap scope or a product decision before exposing new behavior.

## Schemas

- Use object schemas with explicit `required` lists for mandatory fields. Omit `required` for an all-optional object.
- Set `additionalProperties: false` unless an extension map is intentional.
- Put descriptions on the object, enum, or operation. Do not add descriptions under individual properties.
- Model stable transport values as enums and end enum component names with `Enum`.
- Keep every enum component present in a Blockout-owned OpenAPI contract under `source/shared/schemas`.
- Use the canonical business concept name. Do not create gateway- or service-prefixed enum mirrors.
- Backend handwritten code imports generated transport enums from `com.blockout.shared.model`. If a transport enum is
  missing there, add or move its OpenAPI source under `source/shared/schemas` and regenerate instead of creating a
  local copy.
- Application policies such as `DataSourcePriority` remain handwritten in their owning application. Provider-owned
  values remain in provider adapters and do not become Blockout transport enums by accident.
- Use `nullable` only when `null` is a real API state.
- Separate request DTOs, response DTOs, application commands/views, domain models, and persistence entities.
- Reuse generated `shared-models` for transport enums and rare shared technical primitives only.
- Do not reuse a command request as a read projection.
- Do not let generated DTOs define application, domain, or persistence models.

## Boundary Naming

- DTOs are boundary-local by default.
- Internal service DTO component names include `Internal`; mobile-gateway DTO component names do not.
- Place `Internal` immediately before the shape suffix: `ClubInternalResponse`, `ClubInternalPageResponse`,
  `CreateClubInternalRequest`, or `UpdateClubInternalRequest`.
- Use `*ListResponse` only for complete unpaginated list wrappers: `items` only, with no `pageInfo`, `page`, or
  `pageSize` query parameters.
- Use `*PageResponse` only for paginated wrappers: `items` and `pageInfo`, with endpoint parameters aligned to the REST
  policy.
- Use `Upsert` only when the operation has real upsert semantics.
- Mobile-gateway DTOs keep UI and product names such as `ClubDetailResponse`, `ClubListItemResponse`, and
  `CreateClubRequest`.
- Avoid bare resource nouns for wire DTOs. Use an explicit suffix for requests, responses, list/page responses, and
  command bodies.
- Give nested value objects an intentional boundary-local name. Add `Internal` when an internal nested object could be
  confused with a mobile-gateway projection.
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

- Use it only as a temporary bridge for an active boundary, such as a V1 multipart JSON string.
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

- Java shared transport enums are generated with the Maven plugin into `apps/backend/shared-models/target`. Server
  interfaces and internal clients are generated under their owning Maven module's `target/generated-sources`.
- Python models and asynchronous HTTPX clients are generated with the pinned OpenAPI Generator CLI into the private
  `libs/shared/python-contract-clients` wheel. Keep one declarative batch configuration per adopted contract.
- TypeScript models and the mobile client are generated only from the mobile-gateway contract with Orval into
  `apps/frontend/mobile/src/shared/generated`. Mobile never consumes an internal service contract directly.
- Never edit generated code, add custom templates, or commit generated sources. Prefer native generator configuration;
  add a script only when the official tools do not provide the required operation.

## Readiness And Generation

Before adopting a service contract, focused tests must prove that every active handwritten mirror has:

- the final role name;
- the owner's exact camelCase fields, types, nullability, nesting, and enum values;
- no legacy DTO, V2, alias, or duplicate complete-resource residue;
- characterization evidence for every active producer and consumer.

Generated adoption then replaces imports and deletes the proven handwritten mirrors. It must not conceal another
model, business, route, or serialization redesign.

Run only the commands useful to the impacted layers, in this order:

```bash
npm exec nx run @blockout/contracts:generate-contracts
npm exec nx run @blockout/python-contract-clients:generate
mvn -f apps/backend/pom.xml -DskipTests generate-sources
```

Run a generated mobile target only after the mobile-gateway vertical creates it. If generation fails, fix source
fragments or native generator configuration; never patch generated files. Completion requires deterministic clean
generation, impacted Java/Python package builds and imports, active consumer tests, and proof that Git tracks no
generated artifact.
