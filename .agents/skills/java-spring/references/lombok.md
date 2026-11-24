# Lombok in Spring modules

Use these conventions when the module uses Lombok. Preserve the class's intended mutability, identity and construction semantics.

- Use `@Getter` for intended readable properties, at class level only when that exposure fits the class. Use field-level `@Setter` for authorized simple assignments. Preserve visibility and accessor semantics; validation, normalization and coordinated state changes remain explicit methods. Do not add accessors merely because fields exist.
- Use `@RequiredArgsConstructor` for constructors that only assign uninitialized final dependencies. Preserve parameter annotations such as Spring qualifiers; do not assume Lombok copies them. Keep an explicit constructor when that is the simplest way to preserve injection or initialization behavior.
- Use `@NoArgsConstructor` for an actual framework requirement or an existing private utility constructor. Choose the required access level; do not use `force = true` to bypass final-field initialization.
- Use `@AllArgsConstructor` only when its generated parameter list exactly matches the intended creation contract. Keep a selective constructor when owner-managed fields, defaults or invariants must stay outside that contract.
- Introduce `@Builder` only when actual construction sites benefit from named arguments, such as several easily confused values or optional inputs. Prefer annotating the intended constructor or factory when construction selects fields or validates state. A builder does not enforce required arguments at compile time; preserve required checks and defaults. Do not add production builders solely for test fixtures or automatically to every model.
- Prefer focused annotations over blanket `@Data`, which also generates setters, equality and string representations. Prefer native records for immutable values rather than replacing them with Lombok `@Value` classes.
- Add `@ToString` only for a concrete diagnostic need with safe fields. Use `onlyExplicitlyIncluded = true` when the class contains relationships or sensitive values. Choose equality semantics before using `@EqualsAndHashCode`; persistence-specific constraints belong in [entity contracts](persistence.md#entity-contracts).

Keep the existing managed Lombok version and native annotation-processor configuration. Follow [MapStruct integration](mapping.md) when both processors participate. Do not customize generated sources or add global Lombok configuration without a demonstrated need. Verify behavior and actual compiled consumers rather than testing generated boilerplate or annotation spelling.

Mechanics: [accessors](https://projectlombok.org/features/GetterSetter), [constructors](https://projectlombok.org/features/constructor), [builders](https://projectlombok.org/features/Builder), [`@Data`](https://projectlombok.org/features/Data), [string representations](https://projectlombok.org/features/ToString) and [equality](https://projectlombok.org/features/EqualsAndHashCode).
