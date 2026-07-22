# Blockout Mapping Policy

Read this reference before changing mappings between generated OpenAPI DTOs, application contracts, domain values,
provider records, frontend view models, and persistence entities.

## Boundaries

- OpenAPI DTO: HTTP transport shape.
- Application contract: command, query input, decision, plan, view, or use-case result.
- Domain: pure business concepts, invariants, value objects, and policies.
- Provider record: external FFVB, LNV, Auth0, Expo, Mapbox, GitHub, Discord, or S3 shape.
- JPA entity or search document: persistence or index shape.
- Mobile view/form model: feature presentation and editable state.

Generated object DTOs are boundary models, never the Java domain, Python scraper domain, JPA model, or mobile feature
state. Do not expose entities or provider records. Generated enums may cross boundaries only when the OpenAPI contract
owns the exact shared concept; application-only and provider-owned enums remain local to their owner.

## Naming

- Persistence: `Entity` suffix.
- Application mutation input: `Command` or a more precise role suffix.
- Application read projection: `View`.
- Immutable historical state: `Snapshot`.
- Provider input: explicit owner and role, such as `FfvbClubRecord`.
- Neutral polymorphic carrier: `Payload`.
- Value object: business name without a layer suffix.
- Mobile presentation shape: feature-owned role name; do not append `Dto` to local view state.

Do not add the generic `Domain` suffix and do not locally rename generated OpenAPI types. For a mapper with one coherent
source and target family, use `toCommand`, `toDomain`, `toEntity`, `toView`, `toDto`, or `toRecord`. When several roles
coexist, make the role explicit.

## Ownership And Placement

- Put a mapper at the boundary it translates, never in a generic feature-level mapping bag.
- Java OpenAPI mappings live in the owning feature's `api/mappers` package.
- Java generated clients map inside their owning infrastructure adapter package.
- Simple entity-to-view mapping lives beside `application/views`; repository-backed assembly and enrichment live in
  `application/projection` as a projector or projection service.
- Persistence-only conversion lives under `infrastructure/persistence/mappers`.
- Python generated/internal Blockout transport mapping remains under `infrastructure/blockout`; provider parsing and
  normalization remain under the provider adapter. Application and domain packages never import generated clients.
- Mobile gateway DTO mapping remains in the owning feature API/client boundary. Feature view and form models remain in
  the feature; move a mapping to `shared` only when multiple active features genuinely share the same boundary.
- Avoid `application/mappers` unless one mapper truly spans several application contract families and no tighter role
  package is clearer.
- Use one mapper per coherent family. Do not create static utility bags, universal converters, reflection mappers, or
  recursive case-conversion helpers.

## Java And MapStruct

Prefer MapStruct for structural Java mappings. Same-name fields stay implicit. Use explicit `@Mapping` only for renamed,
flattened, nested, ignored, defaulted, constant, qualified, or whole-source fields.

A service with several MapStruct mappers owns one service-local `*MapperConfig` with:

```java
@MapperConfig(
        componentModel = "spring",
        injectionStrategy = InjectionStrategy.CONSTRUCTOR,
        nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
        unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface ServiceMapperConfig {
}
```

A small service with one mapper may declare those settings directly instead of introducing an otherwise unused config.
Reuse nested mapping through `uses = ...` or injected Spring collaborators. Prefer `@Named` plus `qualifiedByName`, or a
dedicated mapper, for a reusable conversion.

Keep manual mapping when it owns orchestration, aggregation, polymorphic dispatch, conditional enrichment, a generated
model constructor that requires explicit required fields, or a non-mechanical business decision. A manual mapper stays
small and explicit; it must not become a second application service.

## Python

Use explicit typed functions at the adapter edge. Map generated responses immediately to domain values and domain
values to generated requests. Keep provider parsing separate from Blockout transport mapping. Do not add a mapping
framework, generic serializer wrapper, or dictionary-based intermediate shape when direct typed construction is clear.

## TypeScript And React Native

Keep generated gateway DTOs in the API boundary. Map to a feature view or form model only when presentation, editing,
normalization, or composition semantics differ. Do not duplicate a generated model under a new name when the shape and
meaning are identical. Prefer a focused pure function over a mapper class, registry, or generic transform framework.

## Collections And Nullability

- Preserve the contract's nullability at transport edges and normalize it once when application or domain invariants
  require a stronger shape.
- Prefer immutable application collections (`List.copyOf`, tuples, frozen dataclasses, or readonly values) when
  mutation is not part of the role.
- Do not add a global null/default mapping rule without a service-wide need.

## Documentation And Tests

Document a mapper when it explains a non-obvious boundary or decision: union dispatch, ignored client field, provider
quirk, stable error contract, or ambiguous DTO/application/entity distinction. Do not paraphrase a same-name mapping.

Mapper tests verify concrete target values, nested reuse, ignored owner-managed fields, conditional branches, or
polymorphic/error behavior. Do not add tests that only scan source text or prove a method exists.

## Verification

- Compile and test each impacted Java module from `apps/backend/pom.xml`.
- Run the owning scraper suite and architecture guards for Python mapping changes.
- Run mobile tests and typecheck for mobile mapping changes.
- Inspect for transport leakage, entity exposure, generic mapper bags, and generated files tracked by Git.
- Run `git diff --check`.
