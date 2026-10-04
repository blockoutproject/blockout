# Java mapping boundaries

- API mappers translate generated request/response objects and application commands/views.
- Client mappers live inside their owning infrastructure adapter.
- Persistence mappers translate entities and application/domain values inside persistence infrastructure. An API mapper must not import JPA entities.
- Repository-backed projection assembly belongs to an infrastructure adapter; pure application composition can combine returned views.

Use role names such as `CreateResourceCommand`, `ResourceView`, `ResourceEntity`, `ResourceSnapshot` and `ProviderResourceRecord`. Avoid a generic `Domain` suffix or local renaming of generated types. A coherent mapper family uses `toCommand`, `toView`, `toEntity`, `toDomain` or `toDto`; name the specific role when several coexist.

Prefer MapStruct for field mapping. Same-name fields stay implicit; annotate renamed, nested, flattened, ignored, defaulted or qualified fields deliberately. Multiple mappers in a module share a module-local configuration with Spring component model, constructor injection, `NullValueCheckStrategy.ALWAYS` and `ReportingPolicy.ERROR`. One mapper can declare those settings directly.

Configure annotation processors through the actual module build; use `lombok-mapstruct-binding` when Lombok-generated members are mapped. Generated mapper implementations are never handwritten or committed. Use `uses` or qualified mapping methods for real nested reuse.

Handwrite decisions, aggregation, polymorphic dispatch, conditional enrichment or invariant/state-initializing construction. An explicit constructor that establishes valid state does not need proof of a generator failure; use MapStruct for the surrounding mechanical field mapping. Keep those methods small; a mapper does not orchestrate database reads or become a service.

Preserve absent/null semantics. Normalize once only where a stronger invariant requires it. Prefer immutable application collections when mutation is not part of their contract. Keep domain enums independent: map even an allowed application transport enum when entering pure domain code.

Verify actual target values, ignored owner-managed fields and meaningful branches. Compilation verifies generation; source-text assertions do not prove mapping behavior.

Mechanics: [MapStruct reference](https://mapstruct.org/documentation/stable/reference/html/index.html) and [Lombok integration](https://mapstruct.org/faq/).
