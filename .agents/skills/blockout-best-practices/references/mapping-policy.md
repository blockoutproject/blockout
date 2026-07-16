# Blockout Mapping Policy

> Migration status: this is the target architecture inherited from Maaatch. Apply it incrementally through `docs/current/blockout-active-roadmap.md`; do not bulk-refactor imported production code or assume missing generated-contract infrastructure already exists.

Read this reference before changing backend mappings between generated OpenAPI DTOs, domain, read models, and
persistence entities.

## Boundaries

- OpenAPI DTO: HTTP contract shape.
- Application contract: commands, query inputs, decisions, plans, read models, and use-case result shapes.
- Domain: pure business concepts, invariants, value objects, and domain policies.
- JPA entity: persistence shape.

Do not pass generated DTOs as the V1 domain model. Do not expose entities. Use generated enums at shared boundaries,
without turning generated object DTOs into domain or persistence.

Generated object DTOs may appear only at an explicit contract-payload boundary when the payload is itself a durable
OpenAPI-owned JSON shape. In that case, the owning `PayloadPolicy`, `PayloadMapper`, API mapper, or persistence edge
must
parse, validate, or serialize the generated object locally, then expose an application contract, read model, neutral
payload, or JSON tree to the rest of the use case. Do not expose generated payload DTOs as application service
contracts,
JPA fields, BFF models, or general-purpose feature domain objects.

## Naming

- Persistence: `Entity` suffix.
- Application command/input: role suffix (`CommandData`, `CommandInput`, `PolicyData`).
- Read projection: `View`.
- Immutable historical state: `Snapshot`.
- Neutral polymorphic carrier: `Payload`.
- Value object: business name without a layer suffix (`ActivityKey`).
- Avoid the generic `Domain` suffix.
- Do not locally rename generated OpenAPI models; a `Dto` suffix would be a global codegen decision.

Methods:

- `toDomain(...)`, `toEntity(...)`, `toView(...)`, `toDto(...)` are acceptable when the mapper has one source/target
  family.
- If several roles coexist, make the role explicit: `toDomainCommand`, `toPolicyData`, `toResultRecordView`.

## Ownership

- Put mappers at the boundary they translate, not in a generic feature-level mapping bag.
- OpenAPI DTO mappings live in the owning feature's `api/mappers` package.
- Simple persistence entity to application read-model mappings live beside the target view family, usually
  `application/views`, with names such as `CompetitionViewMapper`.
- Repository-backed read assembly, enrichment, pagination composition, or current-state projection lives in
  `application/projection` as a `*Projector` or `*ProjectionService`, not as a mapper.
- Application command, policy, payload, mutation, or calculation mappings live in the owning role package.
- Persistence adapter mappings that must not leak into application contracts live under
  `infrastructure/persistence/mappers`.
- Avoid adding or keeping `application/mappers` unless the mapper genuinely spans several application contract families
  and no tighter role package is clearer.
- Use one mapper per coherent family, not a static utility bag.
- Reuse through MapStruct `uses = ...` or injected Spring collaborators.
- Cross-feature reuse must match a real embedded model dependency.

## MapStruct

Use the shared service config:

```java
@Mapper(config = CompetitionMapperConfig.class, uses = NestedMapper.class)
public interface ExampleMapper {
    ExampleData toDomain(ExampleDto source);
}
```

The config keeps `componentModel = "spring"`, constructor injection, strict unmapped target reporting, and null checks
before nested conversions.

Prefer MapStruct for structural mappings. Keep same-name fields implicit. Add `@Mapping` only for:

- different source/target names;
- flattening or nesting;
- intentional ignored field;
- default, constant, expression, or whole-source aggregation;
- qualified conversion.

For reusable custom conversion, prefer `@Named` + `qualifiedByName` or a dedicated mapper in `uses = ...`. Do not
duplicate the same conversion across unrelated mappers.

## Manual Logic

- Keep manual logic narrow.
- OpenAPI `oneOf` dispatch may be a default method routing to typed mappings.
- An unsupported subtype throws the service mapping exception with a stable code.
- Aggregations may be default helpers when they combine several fields.
- Polymorphic subtrees that are not executable V1 concepts go through a neutral payload.
- Never create V1 business behavior without a current V1 source.

## Collections

Domain records normalize `null` and mutability in compact constructors when it matters. Prefer `List.copyOf(...)` and
`List.of()` for immutable application data. Do not add a global MapStruct default without a service-wide need.

## Documentation

Add mapper Javadoc only when it explains a non-obvious boundary or decision: union dispatch, ignored client field,
neutral payload, stable error contract, or ambiguous DTO/domain/entity boundary. Do not paraphrase `toDto(...)` or a
same-name mapping.

## Verification

Compile at least the impacted service, for example:

```bash
mvn -f apps/backend/pom.xml -pl competition-service -am -DskipTests compile
```

Mapper tests, when requested or already present, verify concrete objects, target values, union dispatch, nested mapper
reuse, or payload conversion. Do not add tests that only scan sources or validate policy text.
