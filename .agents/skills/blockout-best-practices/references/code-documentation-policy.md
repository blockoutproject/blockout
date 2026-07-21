# Blockout Code Documentation Policy

Read this before adding or changing Javadoc, TSDoc, source comments, exported functions, service interfaces, use cases,
or local contracts.

## Rule

Document handwritten boundaries and non-obvious behavior touched by a task. Keep the documentation short and useful:
state the invariant, intent, provider quirk, or failure semantics rather than narrating the syntax.

- In Java, add class-level documentation to each touched class, interface, enum, record, annotation, and exception. Put
  contract documentation on an interface method and use `{@inheritDoc}` on the implementation rather than duplicating
  it. Document public or package-private boundary methods and give non-obvious private algorithms a concise explanation.
- In Python, follow PEP 257 with concise docstrings on touched public modules, classes, functions, methods, protocols,
  and
  non-obvious algorithms. Trivial private helpers do not need ceremonial docstrings.
- In TypeScript, document exported boundaries and non-obvious local algorithms; avoid comments that duplicate types.
- Add `@param`, `@return`/`@returns`, and `@throws` when they clarify the contract.
- Do not document generated files, obvious getters/setters, or framework-generated methods.
- Simplify or rename confusing code before compensating with a long comment.
- Keep repository files in English.

Tests document non-obvious invariants or legacy quirks rather than every setup method. Documentation-only validation
consists of targeted inspection and `git diff --check`; do not invent runtime tests for prose.
