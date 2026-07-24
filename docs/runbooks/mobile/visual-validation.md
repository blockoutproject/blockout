# Mobile Visual Validation

Use this runbook when an owning task changes Figma-controlled composition, React Native layout, tokens, typography,
images, interaction states, or native presentation.

## Authority And Safety

- Read the Figma policy, Expo mobile policy, mobile testing policy, and local-runtime policy.
- Use the canonical `Blockout - Product Design` Figma file. Never create a parallel canonical file.
- iOS Simulator is the visual capture and comparison authority. Android remains a required supported runtime and
  receives proportional technical verification.
- Do not start services, mutate Figma, install dependencies, or accept external terms unless the owning task authorizes
  that action.
- Keep credentials, sessions, personal data, and production APIs out of captures.

## Prepare

1. Confirm the claimed issue owns the screen, state, route, and Figma scope.
2. Identify exact device, color scheme, text scale, locale, safe-area, keyboard, and data fixture.
3. Start only the required local services through the repository runtime procedure.
4. Use deterministic local or test data. Record any unavailable provider-owned state.
5. Capture the current implementation before editing when a comparison baseline is needed.

## Validate

1. Navigate through the real Expo Router path rather than mounting an isolated imitation.
2. Compare structure first: hierarchy, spacing, alignment, scroll ownership, safe areas, keyboard avoidance, and native
   presentation.
3. Compare tokens: surface, content, border, status, action, typography, radius, spacing, image treatment, and effects.
4. Exercise loading, empty, error, disabled, selected, focused, destructive, offline, and cancellation states relevant
   to the task.
5. Verify roles, accessible names, state, hints, 44-point targets, focus order, selectable content, and system text
   scaling.
6. Inspect bounded content with ScrollView and unbounded data with the established virtualized list.
7. Capture the same deterministic iOS state after the change and compare at the same viewport and scale.
8. Launch or build the Android path proportionally and verify navigation, layout safety, input, back behavior, and
   platform-specific components.

## Figma Writeback

Only write to Figma when the task explicitly owns a design change. Read current nodes and variables first, use the Figma
skill required by the operation, make the smallest change, and re-read the affected nodes. Code does not silently
redefine the canonical design, and Figma does not silently redefine product behavior.

## Evidence

Report route/state, device/runtime, before/after captures, Figma node or component references, accessibility checks,
iOS comparison, Android technical evidence, deviations, and unavailable states. Store no personal or secret material in
the repository.
