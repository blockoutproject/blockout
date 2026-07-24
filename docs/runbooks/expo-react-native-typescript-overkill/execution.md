# Expo, React Native, And TypeScript Over-Engineering Execution

Use this runbook only for a claimed mobile-complexity finding. Simplification must preserve supported behavior and
native quality.

## Preconditions

- Revalidate every referenced consumer, platform path, test, and generated boundary.
- Read the mobile policies plus the relevant companion skill.
- Confirm the issue authorizes removal or refactoring and freezes the exact Workset.
- Preserve a no-op when the abstraction is now justified or its risk cannot be proven.

## Procedure

1. Characterize navigation, data, form, loading, error, accessibility, animation, and iOS/Android behavior.
2. Remove the smallest unnecessary layer or replace it with the clearest direct composition.
3. Keep generated Orval types at the API boundary and feature-owned behavior in its module.
4. Prefer children, focused props, discriminated unions, direct expressions, and small pure functions.
5. Remove dead exports, providers, files, tests, and empty directories only when their final consumer disappears.
6. Do not combine simplification with visual redesign, dependency upgrades, API changes, Expo upgrades, native module
   changes, or mass naming cleanup.
7. Update tests around observable behavior rather than the removed implementation shape.

## Validation And Delivery

- Run `npm run format`.
- Run the focused Jest tests, mobile lint, typecheck, and complete mobile test target.
- Use `docs/runbooks/mobile/visual-validation.md` when layout, interaction, animation, or Figma-owned composition may
  change.
- Add Expo Doctor or unsigned native build/launch evidence when configuration or a native boundary changes.
- Finish with `npm run format:check` and `git diff --check`.
- Publish through the task execution runbook and quantify the removed machinery without presenting line count as the
  goal.
