# Blockout JPA Persistence Policy

> Migration status: this is the target architecture inherited from Maaatch. Apply it incrementally through `docs/current/blockout-active-roadmap.md`; do not bulk-refactor imported production code or assume missing generated-contract infrastructure already exists.

Read this reference before adding or changing JPA entities, Spring Data repositories, persistence annotations, JSONB
mappings, enum mappings, or repository tests.

## Core Rule

A JPA entity reflects the Flyway schema and V1 model. It is not an OpenAPI DTO, domain command, or BFF projection.

Use Spring Boot, Hibernate, and Bean Validation annotations only when they make the persistence contract explicit. For
closed V1 enum states, use generated OpenAPI enums.

## Entities

- Separate entities, OpenAPI DTOs, domain commands, read projections, and BFF models.
- Put the entity in the owning service feature package.
- Declare `@Table(name = "...")`.
- Usual types: `UUID` for `uuid`, `Instant` for `timestamptz`, `String` for open keys, generated OpenAPI enum for closed
  states.
- Do not import a generated OpenAPI object DTO into an entity.
- Never expose an entity from a controller or OpenAPI handler.

## Columns

- Mirror DB nullability exactly: `@Column(nullable = false)` or `@JoinColumn(nullable = false)`; use explicit
  `nullable = true` when useful.
- Mirror `varchar(N)` sizes with `@Column(length = N)` and `@Size(max = N)` if pre-flush validation is wanted.
- Do not invent a size for a Flyway `text` column.
- Use `@NotNull` for required persisted values when entity validation should fail before persistence.
- Use `@Version` for the technical `record_version` lock, not for business revisions.
- Use `columnDefinition` only if JPA would lose an important PostgreSQL type (`jsonb`, UUID arrays, explicitly accepted
  type).
- Keep timestamps and revisions explicit. Do not introduce hidden automatic auditing unless explicitly scoped.

## Enums And Keys

- Map closed states with `@Enumerated(EnumType.STRING)`.
- Enum columns stay textual before explicit DB hardening.
- Do not create a handwritten Java enum mirror for V1 states covered by OpenAPI.
- If the enum is missing, add or align the source contract, then regenerate.
- Keep `String` for open catalog keys: `activityKey`, `metricKey`, `stageKey`, `groupKey`, `setupTemplateKeySnapshot`.
- Do not use non-V1 enums as V1 persistence types.

## Relationships

- Critical V1 relations are relational, not hidden in JSONB.
- Prefer `@ManyToOne(fetch = FetchType.LAZY)` and `@OneToOne(fetch = FetchType.LAZY)`.
- Preserve useful FK names with `@JoinColumn(..., foreignKey = @ForeignKey(name = "..."))`.
- Use `@MapsId` for shared-primary-key extensions.
- Use `@EmbeddedId` or `@IdClass` for real composite keys.
- Prefer unidirectional relations. Add bidirectional relations, cascade, or orphan removal only when lifecycle ownership
  justifies it.
- Do not use eager loading to simplify a test.

## JSONB

- Map JSONB explicitly, for example `@JdbcTypeCode(SqlTypes.JSON)` + `@Column(columnDefinition = "jsonb")`.
- Validate the payload through the domain/application service before saving.
- JSONB may hold configs, activity payloads, snapshots, and audit inputs.
- JSONB must not hide critical relations, queryable volumetric data, current pointers, or records expected to be
  relational.
- Durable polymorphic payloads carry `schemaVersion` when the V1 model requires it.

## Repositories

- Extend `JpaRepository<Entity, Id>`.
- Name methods with V1 vocabulary: `competitionId`, `stageId`, `fixtureId`, `seat`, `record`.
- Add derived queries or `@Query` only for the current need.
- Preserve deterministic ordering when callers depend on it.
- Do not return generated OpenAPI DTOs.
- Use `Slice`/`Pageable` only for a paginated boundary or use case that needs it.
- Avoid native SQL by default. Prefer Spring Data derived queries, JPQL, Spring Data projections,
  specifications, or `@EntityGraph` according to the read/write need.
- Use `nativeQuery = true`, `createNativeQuery`, or `@NamedNativeQuery` only when the benefit is real and
  the optimization is indispensable.
- Any native SQL must have a short local comment or method documentation explaining why JPQL or Spring Data
  cannot express the need safely enough.

## Verification

- Entity aligned with Flyway: nullability, sizes, IDs, FKs, uniques, JSONB.
- Closed enums = generated OpenAPI classes + `EnumType.STRING`; open keys = `String`.
- Critical relations modeled in JPA.
- JSONB has an explicit validation path.
- PostgreSQL/Testcontainers repository tests if JSONB, arrays, FK behavior, or Flyway compatibility are risky.
- Backend compile proves imports and wiring.
