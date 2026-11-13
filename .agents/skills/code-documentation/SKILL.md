---
name: code-documentation
description: "Write or review useful Javadoc, Python docstrings and TSDoc for non-obvious contracts, reasons and effects; perform broader documentation audits only within an explicit scope."
---

# Code Documentation

Document what a maintainer cannot readily learn from clear names, types and code: a non-obvious contract,
reason, invariant, provider constraint, side effect or lifetime. Describe actual behavior and guarantees.
Do not narrate syntax, repeat a readable helper name or invent guarantees to fill a comment.

## Scope

Update documentation affected by the change and correct comments it makes stale. Touching one line does not
require documenting every member of the file, its tests or neighboring code. A broader documentation audit
uses its explicitly requested scope; generated code remains excluded.

Simplify or rename confusing code before compensating with prose. A short readable function, constructor,
type or component needs no ceremonial comment. Document important authorization, transaction, cancellation,
idempotency, resource ownership and provider rules where they actually apply, even on a private step.

## Language conventions

- **Java:** use Javadoc for contracts that need explanation. Put an exposed contract on its owning interface
  instead of duplicating it across implementations. Use `{@inheritDoc}` when an implementation needs to refer
  to that contract; add only relevant implementation guarantees. Add `@param`, `@return` and `@throws` when
  they explain constraints or supported outcomes that the signature does not convey. Do not enumerate
  hypothetical library exceptions or describe straightforward dependency injection.
- **Generated HTTP interfaces:** improve an incomplete endpoint contract in its OpenAPI source and regenerate.
  Handwritten overrides need only documentation of additional behavior; do not copy the generated contract.
- **Python:** follow PEP 257 for docstrings that explain module/public contracts and meaningful private rules.
  Keep types in annotations. Explain provider constraints, effects and failure outcomes without exposing
  private payloads or copying fixtures.
- **TypeScript and React:** use TSDoc for non-obvious exported contracts, hook/component behavior, effects and
  lifecycles. Put prop semantics with their public contract. Private algorithms need comments only where
  their reason or rule is unclear; do not narrate JSX, styles or inline callbacks.

## Placement and maintenance

Keep explanations beside their owner, in English. Maintain one source for an inherited contract; a class
overview does not explain an unrelated method invariant. Keep relevant existing documentation unless it
is stale or redundant within the task's scope.

Tests can explain a subtle regression, invariant, fixture owner or provider constraint. Descriptive names
already carry straightforward scenarios; do not repeat setup and assertions in prose. Do not create detached
helper documents, comment-count checks or a source-scanning framework to enforce this policy.

## Verification

Check that changed code and its documentation agree, comments explain a real reader need and no unsupported
guarantee is claimed. Run affected source checks proportionately when source changed. For policy-only edits,
validate skill structure, routing/reference consistency, applicable formatting and diff hygiene. Report actual
coverage; changing this policy does not establish compliance of existing code.
