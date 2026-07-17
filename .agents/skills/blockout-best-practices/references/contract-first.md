# Blockout Contract-First

> Migration status: this is the target architecture inherited from Maaatch. Apply it incrementally through `docs/current/blockout-active-roadmap.md`; do not bulk-refactor imported production code or assume missing generated-contract infrastructure already exists.

Read this reference before changing an API shape, DTO, endpoint, error, generated client, or backend OpenAPI interface.

The commands and paths in this policy describe the target state. Until the contract inventory and generator are
implemented by the active roadmap, do not invent missing generation targets or present the reserved contract package
as an active source of runtime APIs.

## Reconstructing The Legacy Contract

- Blockout's current Springdoc output, controller annotations, handwritten DTOs, entities exposed by controllers,
  mobile types, scraper dictionaries, events, and observed callers are discovery evidence. None is the target contract
  source by itself.
- Audit each service and BFF workflow before writing its authoritative fragments. Record every field's producer,
  consumer, validation, persistence role, compatibility need, casing, and frontend-visible purpose.
- Do not copy a large legacy DTO into OpenAPI merely because it serializes today. Keep a field only when deployed
  behavior, a current consumer, compatibility, or an approved product contract requires it.
- Do not remove or rename an apparently unused field during discovery. Classify it first, prove all consumers and
  rollback behavior, then remove it only in the scheduled migration slice.
- Reconstruct BFF contracts from frontend workflows and proven aggregation semantics, not by concatenating downstream
  service DTOs. Preserve ordering, pagination, partial-failure, null/fallback, and enrichment behavior explicitly.
- The read-only audit, target contract definition, generated-boundary migration, internal Java restructuring, consumer
  cutover, and legacy cleanup are separate roadmap tasks.

## Core Rule

- OpenAPI source fragments are the source of truth.
- Edit `libs/shared/contracts/specs/source/**` first.
- Generate next.
- Adapt application code only after generation succeeds.

Never hand-edit:

- `libs/shared/contracts/generated/specs/*.json`
- the future generated mobile client directory selected by the active roadmap
- `apps/backend/*/target/generated-sources/**`
- the generated `schemaMappings` block in `apps/backend/pom.xml`

## Source Lint

Run `npm exec nx run @blockout/contracts:lint-openapi-source` before bundling authoritative fragments. It rejects:

- schema property and Blockout-owned query names that are not canonical `camelCase`;
- duplicate `operationId` values within one contract owner;
- enum values outside one named `*Enum` component under `source/shared/schemas`;
- schema names ending in ambiguous transport or persistence suffixes: `Dto`, `DTO`, `DataTransferObject`, `ApiModel`,
  `Model`, or `Entity`.

Temporary exceptions are exact matches in `libs/shared/contracts/specs/lint-exceptions.json`. Each entry documents its
rule, source-relative file, JSON Pointer, compatibility reason, owning MRG task, and removal MRG task. Do not add broad
file or rule exclusions. The lint rejects malformed, duplicate, and unused exceptions so a retired compatibility case
cannot leave a permanent bypass.

## Canonical JSON Naming

- Every Blockout-owned REST property, query parameter, multipart JSON part, and asynchronous event field uses
  `camelCase` in its authoritative contract and on the wire.
- OpenAPI fragments and the selected event-contract source declare the canonical `camelCase` names directly. Generated
  Java, TypeScript, validation, and approved Python artifacts must preserve those names without a global case converter.
- Java and TypeScript identifiers therefore use their natural `camelCase`. Python application identifiers may retain
  idiomatic `snake_case`, but adapters must emit and consume canonical `camelCase` keys at Blockout-owned boundaries.
- Database columns and migration identifiers may remain `snake_case`; persistence naming is not a JSON contract.
- Third-party payloads such as federation, Auth0, GitHub, or Discord may retain the provider's casing inside an explicit
  infrastructure adapter. Do not leak those names into Blockout-owned contracts.
- Do not keep `@JsonProperty`, `@JsonAlias`, a Jackson naming strategy, or client request/response transforms solely to
  translate permanent Blockout snake_case. A temporary compatibility read must be named in the active cutover matrix,
  covered by parity and rollback checks, and removed by its scheduled cleanup task.

## Choose The Shape

- Schema only: add the schema in the owning service; use `x-contract-schema-roots` only as a temporary bridge.
- Endpoint: model the REST resource first, then the operation.
- Complete bounded collection: return an `items` wrapper named `*ListResponse`; do not include `pageInfo`, `page`,
  or `pageSize`; document the bounded source and deterministic order.
- Paginated collection: return an `items` + `pageInfo` wrapper named `*PageResponse`; guarantee `hasNext`; do not
  require `totalItems` without product need and reliable count.
- Shared enum: every `*Enum` schema belongs in `source/shared/schemas`.
- Shared non-enum schema: use `source/shared/schemas` only for true cross-boundary technical primitives.
- Public union: expose it only when behavior is implemented and activable, or when a schema-only roadmap slice
  explicitly defines the boundary.
- Source-sensitive surface: require a V1 model section, roadmap scope, or product decision before exposing behavior.

## Schemas

- Use object schemas with explicit `required` lists for mandatory fields. For all-optional objects, do not add
  `required: []` unless the impacted generation chain accepts it; BFF/Web Orval validation rejects `required: []`, so
  BFF all-optional request bodies omit `required`.
- Set `additionalProperties: false` unless an extension map is intentional.
- Put descriptions on the object, enum, or operation. Do not add `description` under `properties.<field>`. If a field
  constraint matters, document it on the object or operation.
- Model stable public values as enums.
- End enum component names with `Enum`.
- Keep all enum components in `libs/shared/contracts/specs/source/shared/schemas`.
- Use the canonical business concept name for an enum. Do not create BFF- or service-prefixed mirrors such as
  `CompetitionFixtureStatusEnum` when `FixtureStatusEnum` is the shared concept.
- Backend handwritten code imports generated enum classes from `com.blockout.shared.model`. If the enum is missing there,
  move or add the source enum under `source/shared/schemas` and regenerate instead of adding a local enum.
- Use `nullable` only when `null` is a real API state.
- Separate request DTOs, response DTOs, backend domain, and persistence.
- Reuse generated `shared-models` on the backend for enums and for rare shared technical primitives only.
- Do not reuse a command request as a read projection.
- Do not let generated DTOs define domain or persistence.

## Boundary Naming

- DTOs are boundary-local by default.
- Internal service DTO component names include `Internal`; BFF DTO component names do not.
- Place `Internal` immediately before the shape suffix: `CompetitionInternalResponse`,
  `CompetitionInternalPageResponse`, `CreateCompetitionInternalRequest`, `UpsertUserProfileInternalRequest`.
- Use `*ListResponse` only for complete unpaginated list wrappers: `items` only, no `pageInfo`, no `page` /
  `pageSize` query params.
- Use `*PageResponse` only for paginated wrappers: `items` + `pageInfo`, with endpoint pagination params aligned to
  `rest-pagination-policy.md`.
- `Upsert` is allowed when the operation really has upsert semantics. Do not force create/update naming over a real
  upsert contract.
- BFF DTOs keep UI/product names such as `CompetitionDetailResponse`, `CompetitionListItemResponse`, and
  `CreateCompetitionRequest`.
- Avoid bare resource nouns for wire DTOs in service contracts. Use an explicit shape suffix when the schema is a
  request, response, list response, command body, or other boundary payload.
- Nested value objects may stay boundary-local, but they still need an intentional name. Add `Internal` when the nested
  object is owned by an internal service contract and could be confused with a BFF projection.
- Generated DTOs from another service stay in client/adapter packages and are mapped immediately to local domain,
  read-model, or BFF DTOs. Enums are the exception because every enum is shared.

## Polymorphic `oneOf`

- Do not put `oneOf` inline in an endpoint.
- Expose a polymorphic body through a named component.
- Define `discriminator.propertyName` and `mapping`.
- Require the discriminator field on the parent and subtypes.
- Keep parent and subtypes on the same Java discriminator type; prefer a shared named enum.
- Prefer existing V1 discriminants: `activityKey`, `formatKind`, or `kind`.
- Validate Spring, Orval, and impacted client generation before combining `oneOf`, `allOf`, and discriminator.

## Schema-Only Bridge

`x-contract-schema-roots` only includes schemas temporarily without runtime endpoints.

- Do not create fake endpoints.
- Put roots on a path already reserved by the owning service.
- Remove the bridge when real operations naturally reference the schemas.
- Never present this bridge as API behavior.

## Endpoints And Errors

Each operation defines:

- stable `operationId`;
- focused tags;
- short `summary`;
- request schema when needed;
- concrete success response or intentional `204`;
- expected errors;
- explicit security when it is not clearly inherited.

Expected errors:

- `400`: invalid shape.
- `401`: missing or invalid authentication.
- `403`: missing scope or permission.
- `404`: missing or hidden resource.
- `409`: duplicate, stale revision, state conflict, or incompatible retry.
- `422`: business violation with valid shape, only when the service distinguishes it.
- `503`: technical dependency unavailable.

Errors use `ProblemDetail`-compatible bodies with a stable machine-readable `code`.

## Generation

Run only the commands useful to impacted layers, in this order:

```bash
npm exec nx run @blockout/contracts:lint-openapi-source
npm exec nx run @blockout/contracts:generate-contracts
mvn -f apps/backend/pom.xml -DskipTests generate-sources
```

If generation fails, fix source fragments or generator config. Never patch generated files. In the final report, name
the generations run and those intentionally skipped.

Mobile client generation is intentionally not configured yet. The active roadmap must first inventory the existing
mobile API layer, choose an Expo-compatible generator, define its output directory, and add the corresponding Nx
target. Once configured, generated validation schemas remain contract artifacts rather than product or form-design
sources; fix the OpenAPI source or generator configuration instead of editing generated output.
