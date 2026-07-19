---
name: karpathy-guidelines
description: Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.
---

# Karpathy Guidelines

These guidelines bias toward caution and simplicity. Use judgment for trivial tasks.

## Think Before Coding

- State assumptions explicitly.
- Present materially different interpretations instead of choosing silently.
- Point out a simpler valid approach.
- Stop and name genuine ambiguity before it causes divergent work.

## Prefer Simplicity

- Write the minimum code that solves the requested problem.
- Do not add features, flexibility, configuration, or abstractions that were not requested.
- Do not handle impossible scenarios.
- If a senior engineer would call the change overcomplicated, simplify it.

## Make Surgical Changes

- Touch only lines that trace to the task.
- Do not refactor adjacent code or reformat unrelated files.
- Match the established style.
- Remove only imports, variables, functions, and files made obsolete by the current change.
- Report unrelated problems instead of silently fixing them.

## Execute Toward Evidence

Translate the request into a short verifiable loop:

1. Define the observable result.
2. Implement the smallest coherent change.
3. Run the narrowest useful check.
4. Expand validation according to risk.
5. Stop only when the success criteria are proven or a real blocker is explicit.
