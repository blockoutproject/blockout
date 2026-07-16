# Blockout Code Documentation Policy

> Migration status: this is the target architecture inherited from Maaatch. Apply it incrementally through `docs/current/blockout-active-roadmap.md`; do not bulk-refactor imported production code or assume missing generated-contract infrastructure already exists.

Read this reference before adding or changing Javadoc, TSDoc/JSDoc, `package-info.java`, exported APIs, service
interfaces, use cases, private helpers, or module-boundary comments.

## Rule

Document every handwritten class and every handwritten method that is part of the changed code, including private
methods. When a task asks for a module-wide documentation pass, scan every handwritten source and test file in that
module and apply the same rule everywhere it fits. Do not document generated files or generated methods. Keep comments
short and useful: documentation must state the local contract, boundary, invariant, or intent, not narrate Java syntax.

Standard shape:

1. one short sentence saying what the API or boundary is for;
2. `@param` for each parameter;
3. Java `@return` or TypeScript `@returns` when the return value should be explicit;
4. `@throws` for expected business, API, authorization, or operational failures.
5. for constructors, a short sentence plus `@param` tags when dependencies or immutable values are injected.

## Placement

- Add a class-level Javadoc on every handwritten class, interface, enum, record, annotation, and exception introduced or
  touched by the task.
- If a function is exposed through an interface or contract, document the interface method.
- Do not duplicate that documentation on the implementation; use `{@inheritDoc}` for touched implementation methods when
  the interface already carries the contract.
- Handwritten Spring controllers that implement OpenAPI Generator server interfaces inherit endpoint documentation from
  those generated interfaces. For overridden controller methods, use only `/** {@inheritDoc} */` as the method Javadoc
  and keep local behavior comments inside the method body only when they explain a non-obvious implementation detail.
- If a public or package-private service, mapper, validator, policy, or use-case method is not exposed through an
  interface, document the method when it is still a real local contract: called across classes, relied on by generated
  or framework wiring, has expected exceptions, or owns non-obvious mapping, validation, transaction, idempotency, or
  boundary semantics.
- Document private methods too. Their Javadoc can be one concise sentence when the method is obvious, but it must still
  explain the local reason for the extraction: invariant, parsing rule, domain step, error semantic, or readability
  boundary.
- For module-wide Java passes, add or update a local structure test, static check, or documented inspection that makes
  missing class/method Javadocs visible for future changes when the module already has an appropriate test surface.
- Prefer making code simpler before adding many comments. If a private method needs a long explanation, first check
  whether the method or surrounding class should be renamed, split, or simplified.

## Examples

```java
/**
 * Creates a competition from a validated command.
 *
 * @param principalId authenticated principal identifier.
 * @param command competition creation command.
 * @return created competition projection.
 * @throws CompetitionCommandConflictException if the command idempotency key conflicts with a previous request.
 */
CompetitionView createCompetition(String principalId, CreateCompetitionCommand command);
```

```ts
/**
 * Maps a competition response to the setup screen view model.
 *
 * @param response - BFF competition detail response.
 * @returns setup screen view model.
 * @throws CompetitionViewModelError if required setup data is missing.
 */
export function toCompetitionSetupViewModel(response: CompetitionDetailResponse): CompetitionSetupViewModel {
  // ...
}
```

## Checklist

- Every touched handwritten class has class-level documentation.
- Every touched handwritten method or constructor has Javadoc, including private methods.
- First sentence is useful and specific.
- Tags match the signature.
- Contract lives on the interface; implementation does not duplicate it.
- OpenAPI controller overrides use `/** {@inheritDoc} */` instead of rewritten endpoint summaries or tags.
- Comment explains a boundary, invariant, or intent, not Java syntax.
- V1 vocabulary is target vocabulary; non-V1 terms are not presented as the product model.
