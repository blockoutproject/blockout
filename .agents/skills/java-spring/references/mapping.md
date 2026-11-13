# Java mapping boundaries

Keep one representation when meaning, ownership and lifecycle are identical. A new operation does not require a command, view, DTO and mapper family. Introduce distinct types for an actual semantic boundary: domain invariants, transport presence/null rules, editing state, provider vocabulary or persistence lifecycle. Keep comparable consumers on the same project pattern.

- API mappers translate request/response objects only where the application boundary uses a distinct representation.
- Client mappers live inside their owning infrastructure adapter.
- Persistence mappers translate entities and application/domain values inside persistence infrastructure. An API mapper must not import JPA entities.
- Repository-backed projection assembly stays at the persistence boundary, in its repository or justified adapter; pure application composition can combine returned values.

When distinct types are needed, use role names such as `CreateResourceCommand`, `ResourceView`, `ResourceEntity`, `ResourceSnapshot` and `ProviderResourceRecord`. Avoid a generic `Domain` suffix or local renaming of generated types. A coherent mapper family uses `toCommand`, `toView`, `toEntity`, `toDomain` or `toDto`; name the specific role when several coexist.

Use MapStruct for needed mechanical field mapping; do not introduce a conversion solely to use a mapper. Same-name fields stay implicit; annotate renamed, nested, flattened, ignored, defaulted or qualified fields deliberately. Multiple mappers in a module share a module-local configuration with Spring component model, constructor injection, `NullValueCheckStrategy.ALWAYS` and `ReportingPolicy.ERROR`. One mapper can declare those settings directly.

Configure annotation processors through the actual module build; use `lombok-mapstruct-binding` when Lombok-generated members are mapped. Generated mapper implementations are never handwritten or committed. Use `uses` or qualified mapping methods for real nested reuse.

Handwrite decisions, aggregation, polymorphic dispatch, conditional enrichment or invariant/state-initializing construction. An explicit constructor that establishes valid state does not need proof of a generator failure; use MapStruct for the surrounding mechanical field mapping. Keep those methods small; a mapper does not orchestrate database reads or become a service.

Preserve absent/null semantics. Normalize once only where a stronger invariant requires it. Prefer immutable application collections when mutation is not part of their contract. Keep domain enums independent: map even an allowed application transport enum when entering pure domain code.

Verify actual target values, ignored owner-managed fields and meaningful branches. Compilation verifies generation; source-text assertions do not prove mapping behavior.

Mechanics: [MapStruct reference](https://mapstruct.org/documentation/stable/reference/html/index.html) and [Lombok integration](https://mapstruct.org/faq/).
