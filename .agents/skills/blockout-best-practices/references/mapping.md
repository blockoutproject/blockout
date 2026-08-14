# Mapping Boundaries

Apply this policy when translating generated OpenAPI models, application contracts, domain values, persistence models,
provider records, scraper records, or mobile view state.

## Model Roles

- A generated OpenAPI model is an HTTP transport shape, not a domain or persistence model.
- An application command represents use-case input; an application view represents use-case output.
- A domain value owns business meaning and invariants without framework dependencies.
- An entity or persistence projection owns storage semantics and remains in infrastructure.
- A provider record owns an external dependency's shape and remains in its adapter.
- A mobile view or form model exists only when presentation, editing, or composition differs from the API shape.

Generated enums may cross an internal boundary only when the contract owns the exact shared concept. Provider-owned or
application-only concepts remain local.

## Placement And Naming

Put a mapper at the boundary it translates:

- transport mapping beside the API adapter;
- generated-client mapping beside the outbound HTTP adapter;
- persistence mapping beside persistence infrastructure;
- message mapping beside the consumer or publisher;
- provider mapping beside the scraper adapter;
- mobile API mapping inside the owning feature boundary.

Use explicit role names such as `Command`, `View`, `Entity`, `Snapshot`, `Payload`, or a provider-specific record name.
Do not create a generic mapper bag, universal converter, reflection mapper, or recursive case-conversion utility.

Use focused method names such as `toCommand`, `toEntity`, `toView`, `toDto`, or `toRecord`. Make the role more explicit
when several source or target families coexist.

## Java And MapStruct

Prefer MapStruct for structural mapping. Same-name fields remain implicit; add explicit mappings only for renamed,
nested, flattened, ignored, defaulted, qualified, constant, or whole-source values.

When several mappers exist in one service, share a service-local mapper configuration with Spring component mode,
constructor injection, null checks, and unmapped targets treated as errors. A single mapper may declare those settings
directly.

Use handwritten mapping when the operation contains a business decision, aggregation, external lookup, conditional
enrichment, polymorphic dispatch, or explicit failure behavior. A handwritten mapper must not become a second
application service.

## TypeScript And Python

Keep generated clients at the API boundary. Add a feature-owned pure mapping function only when the consumer needs a
different semantic shape. Do not duplicate a generated type under a new name when shape and meaning are identical.
Avoid mapper classes, registries, and transformation frameworks.

Provider parsers return typed provider records before application logic. Map generated Python client models immediately
inside the Blockout API adapter; do not leak provider dictionaries or generated models into scraper use cases.

## Nullability And Collections

- Preserve contract nullability at the transport edge and normalize it once when an application or domain invariant
  requires a stronger shape.
- Prefer immutable application collections when mutation is not part of the role.
- Never introduce a global default or null mapping rule without a demonstrated service-wide requirement.

## Verification

- Test concrete target values, ignored owner-managed fields, nested reuse, branches, enum conversion, polymorphism,
  and errors when those behaviors exist.
- Do not test mapper source text, generated method names, or framework implementation details.
- Inspect for entity exposure, generated-model leakage, duplicated shapes, and generic mapping utilities.
- Compile and test every affected producer and consumer.
