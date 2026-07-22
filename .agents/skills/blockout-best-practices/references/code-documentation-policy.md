# Blockout Code Documentation Policy

Read this reference before adding or changing Javadoc, Python docstrings, TSDoc/JSDoc, exported APIs, service
interfaces, use cases, private helpers, or module-boundary comments.

## Rule

Document every handwritten class and every handwritten method or function in changed code, including private methods
when they form an extracted local step. When a task requests a module-wide documentation pass, scan every handwritten
source and test file in that module and apply the same rule wherever it fits. Do not document generated files or
generated methods.

Keep documentation short and useful. State the local contract, boundary, invariant, provider quirk, failure semantics,
or reason for extraction; never narrate syntax or repeat a type signature.

## Java

Use this standard shape when the tags add real contract information:

1. one short sentence describing the API or boundary;
2. `@param` for every parameter;
3. `@return` when a returned value is not already obvious from the method name and type;
4. `@throws` for expected business, API, authorization, or operational failures;
5. for constructors, a short sentence and `@param` tags for injected dependencies or immutable values.

- Add class-level Javadoc to every handwritten class, interface, enum, record, annotation, and exception introduced or
  touched by the task.
- Put an exposed contract on the interface method. Use `/** {@inheritDoc} */` on a touched implementation instead of
  duplicating it.
- Handwritten Spring controllers implementing generated OpenAPI interfaces use `/** {@inheritDoc} */` on override
  methods. The generated interface owns the endpoint contract.
- Document a public or package-private service, mapper, validator, policy, or use-case method when another class,
  framework wiring, or generated boundary relies on it.
- Give private methods a concise Javadoc explaining the invariant, parsing rule, domain step, error semantic, or
  readability boundary that justified their extraction.
- Do not document obvious getters, setters, record accessors, Lombok-generated methods, or framework-generated methods.

## Python

- Follow PEP 257. Add a concise module docstring to every touched handwritten module and docstrings to touched public
  classes, functions, methods, protocols, and boundary adapters.
- Document private functions when they own a non-obvious provider rule, normalization invariant, retry decision, or
  extracted algorithmic step. Do not add ceremonial docstrings to trivial private helpers.
- Describe provider quirks and failure outcomes without copying fixture content or exposing private provider data.
- Keep type information in annotations; a docstring explains meaning, not the annotation syntax.

## TypeScript And React Native

- Add TSDoc to touched exported functions, hooks, components, types, and provider boundaries when the name and type do
  not fully express the contract.
- Document non-obvious local algorithms and extracted private functions. Do not document inline JSX callbacks,
  straightforward style objects, or one-line adapters merely to satisfy a count.
- Put component behavior in its public props contract. Avoid comments that repeat JSX or enumerate visual markup.
- Use `@param`, `@returns`, and `@throws` when they clarify observable behavior or a supported failure.

## Placement And Maintenance

- Simplify or rename confusing code before compensating with a long comment.
- Keep source documentation next to the contract it explains. Do not create detached documentation for a local helper.
- Tests document non-obvious invariants, regressions, or legacy provider quirks rather than every setup method.
- For a module-wide pass, add or update an existing lightweight documentation check only when the module already has an
  appropriate static-analysis surface. Do not introduce a custom parser or source-scan framework solely for comments.
- Keep repository files in English.

## Verification

- Inspect all handwritten files in the declared workset, including tests.
- Confirm generated sources were excluded.
- Run the impacted formatter, typecheck, compile, or tests only when source changed.
- For documentation-only work, run targeted inspection, formatting where applicable, and `git diff --check`.
