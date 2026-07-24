# Native Component Usage Execution

Use this runbook only for an approved and claimed native-component finding.

## Preconditions

- Revalidate the candidate against current shared UI, Expo/React Native support, Figma, and both platforms.
- Confirm the replacement preserves or improves semantics, accessibility, native lifecycle, and visual intent.
- Load the Figma and visual-validation runbooks when appearance is in scope.

## Procedure

1. Characterize current props, states, callbacks, layout, accessibility, focus, keyboard, safe area, and platform
   differences.
2. Replace only the duplicated or incorrect boundary with the established Blockout, React Native, Expo, or
   provider-owned component.
3. Keep feature business composition local and keep shared primitives free of feature data or navigation.
4. Remove the old wrapper or duplicate only after all active consumers move.
5. Do not introduce a UI framework, global registry, theme runtime, configuration-driven component system, or unrelated
   visual redesign.
6. Preserve explicit iOS/Android variants when a real native difference exists.

## Validation And Delivery

- Run focused component tests and the mobile lint, typecheck, and test targets.
- Perform iOS visual comparison and Android technical verification when rendering or interaction changes.
- Verify accessibility roles, names, state, touch target, text scaling, focus, keyboard, and destructive behavior.
- Finish with repository format checks and `git diff --check`.
- Deliver through the task execution runbook.
