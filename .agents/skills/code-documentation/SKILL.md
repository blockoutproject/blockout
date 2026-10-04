---
name: code-documentation
description: "Write or review Javadoc, Python docstrings and TSDoc for changed handwritten contracts, including meaningful private steps; perform explicitly scoped documentation audits."
---

# Code Documentation

Apply this policy when writing or reviewing handwritten code documentation, including Javadoc, Python docstrings, TSDoc,
service interfaces, use cases, private helpers, and module boundaries.

## Rule

Document every handwritten production class and every handwritten method or function introduced or changed by the
task, including private methods that form an extracted local step. During a documentation pass, inspect every
handwritten source and test file in the declared scope, including unchanged files. Apply the language guidance and
explicit exceptions below. Generated files and generated methods are excluded.

Prefer a short, useful explanation over leaving a reader to reconstruct the contract from the implementation. Clear
names do not replace documentation of purpose, inputs, outcomes, side effects, or failure behavior. A class comment
does not replace method documentation.

State the local contract, boundary, invariant, provider constraint, or reason for extraction. Explain relevant
transaction, concurrency, idempotency, cancellation, and resource ownership guarantees where they apply. Describe
actual behavior; do not invent guarantees or narrate syntax.

## Java

- Add class-level Javadoc to every handwritten class, interface, enum, record, annotation, and exception introduced
  or touched by the task. Explain its responsibility and place in the feature or module.
- Add Javadoc to handwritten methods, including public, protected, package-private, and extracted private methods.
  Start with a short sentence describing the operation or local step. Include supported inputs, results, side
  effects, and failures when applicable; readers should not need to inspect the body to discover the contract.
- Document constructors with a short sentence and `@param` tags explaining injected dependencies or immutable values.
- Use `@param` for each parameter to explain its role and relevant constraints, `@return` when the result semantics
  are not already obvious, and `@throws` for supported business, API, authorization, or operational failures. Do not
  enumerate hypothetical exceptions from every library call.
- Put exposed contracts on interface methods. Use `/** {@inheritDoc} */` on touched implementations instead of
  duplicating the contract; add implementation-specific guarantees only when needed.
- Handwritten Spring controllers implementing generated OpenAPI interfaces use `/** {@inheritDoc} */` on override
  methods. Improve the OpenAPI source when the endpoint contract is incomplete, then regenerate.
- Document Spring bean factories, service, mapper, validator, policy, and use-case methods: their collaborators and
  lifecycle are part of the contract even when they are not public.
- Give private methods a concise Javadoc explaining the invariant, parsing rule, domain step, failure behavior, or
  readability boundary that justified their extraction.
- Do not add documentation to obvious getters, setters, implicit record accessors, Lombok-generated methods, or
  framework-generated methods. An accessor with validation or side effects is not an obvious accessor.

## Python

- Follow PEP 257. Add a concise module docstring to touched handwritten modules and docstrings to public classes,
  functions, methods, protocols, and boundary adapters.
- Document extracted private functions that own provider rules, normalization, retries, or algorithmic steps.
  Trivial private forwarding helpers do not need ceremonial docstrings.
- Describe provider constraints, side effects, and failure outcomes without copying fixture content or exposing
  private provider data. Keep type information in annotations; explain its meaning in the docstring.

## TypeScript And React

- Add TSDoc to touched exported functions, hooks, components, types, and provider boundaries. Explain purpose,
  supported behavior, effects, lifecycle, and failures as relevant.
- Document extracted private functions and local algorithms. Inline JSX callbacks, straightforward style objects,
  and trivial one-line forwarding adapters do not need separate comments.
- Put component behavior in its public props contract; document the component's role without repeating JSX or
  enumerating visual markup.
- Use `@param`, `@returns`, and `@throws` when they clarify observable behavior or supported failures.

## Placement And Maintenance

- Simplify or rename confusing code before compensating with a long comment. Documentation complements KISS.
- Keep documentation beside the contract it explains, in English. Do not create detached documentation for a helper.
- Keep inherited contracts in one place and update stale comments when behavior changes.
- Tests document non-obvious invariants, regressions, fixture ownership, and provider constraints. Descriptive test
  names or `@DisplayName` can carry straightforward scenarios; do not repeat every assertion or setup method in prose.
- A module-wide pass may use an existing static-analysis check. Do not introduce a custom parser or source-scanning
  framework solely to count comments.

## Verification

- Inspect all handwritten files in the declared scope, including tests, and exclude generated sources.
- Review types and methods individually; a class-level overview alone does not satisfy the method rule.
- Confirm comments describe current behavior, explain relevant contracts, and contain no unsupported guarantees.
- Run the impacted formatter, typecheck, compilation, or tests proportionately when source changes.
- For policy-only changes, inspect the routing and reference consistency, validate the skill, check formatting where
  applicable, and run the repository diff-hygiene check.
- Distinguish updating this policy from applying it to existing code. Report the actual documentation coverage of a
  code pass; changing the rule does not establish compliance of previously written code.
