# Blockout Code Documentation Policy

Read this before adding or changing Javadoc, TSDoc, source comments, exported functions, service interfaces, use cases,
or local contracts.

## Rule

Document every handwritten class and every handwritten method touched by a task, including private methods. Keep the
documentation short and useful: state the boundary, invariant, intent, or non-obvious behavior rather than narrating
the syntax.

- Add class-level documentation to each touched class, interface, enum, record, annotation, and exception.
- Put contract documentation on an interface method. Use `{@inheritDoc}` on the implementation rather than duplicating
  it.
- Document public or package-private methods that form a local or framework boundary.
- Give private methods a concise sentence explaining the reason for the extraction.
- Add `@param`, `@return`/`@returns`, and `@throws` when they clarify the contract.
- Do not document generated files, obvious getters/setters, or framework-generated methods.
- Simplify or rename confusing code before compensating with a long comment.
- Keep repository files in English.

Tests follow the same class/method documentation rule when touched. Documentation-only validation consists of targeted
inspection and `git diff --check`; do not invent runtime tests for prose.
