# Code Documentation

Apply this policy to Javadoc, TSDoc, exported APIs, comments, and non-obvious test support. Documentation explains a
contract or decision that names and types cannot express; it does not narrate syntax.

## What To Document

Document handwritten code when a reader needs to know one of the following:

- ownership, intent, or a non-obvious invariant;
- supported inputs, outputs, side effects, lifecycle, concurrency, or failure semantics;
- a business rule, external-provider constraint, security boundary, or compatibility decision;
- why a simpler-looking implementation would be incorrect.

Public and cross-module contracts deserve the strongest documentation. Locally shared services, policies, mappers,
validators, hooks, and test fixtures need documentation when their contract is not evident from naming and types.
Private helpers need comments only for a non-obvious rule or algorithm.

## What Not To Document

- Do not document generated code, obvious accessors, Spring annotations, straightforward mapping, or visible control
  flow.
- Do not repeat a method name, parameter type, or JSX structure in prose.
- Do not add ceremonial Javadoc or TSDoc merely to satisfy a count.
- Prefer a clearer name or smaller function over a long explanation of confusing code.
- Delete or update stale comments in the changed boundary.

## Language Guidance

For Java, put the contract on the interface when one exists and use `{@inheritDoc}` only when it helps navigation. Add
`@param`, `@return`, or `@throws` when the tag conveys behavior beyond the signature.

For TypeScript and React, document exported functions, hooks, components, and types when observable behavior or
constraints are not fully expressed by their types. Put component behavior in the props contract; avoid comments that
enumerate markup.

Tests should explain only non-obvious regressions, fixtures, infrastructure constraints, or deliberately unusual
setup. Test names and structure should carry the scenario whenever possible.

Keep documentation beside the contract it describes and write it in English. Do not create detached documentation for
a local implementation detail.

## Verification

- Review handwritten code changed by the task and exclude generated sources.
- Check that documentation describes current behavior and adds information rather than restating code.
- Run formatting, compilation, or type checking when source documentation changes.
