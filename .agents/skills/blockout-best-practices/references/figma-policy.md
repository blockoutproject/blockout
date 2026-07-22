# Blockout Figma Interaction Policy

Read this policy before any Blockout mobile or product-design task that reads from, writes to, compares against, or
makes a decision in Figma. This includes visual discovery, token or component work, code-to-Figma calibration,
Figma-to-code implementation, and visual reconciliation.

## Authority

- `docs/current/roadmap.md` controls current task scope, order, dependencies, and acceptance evidence.
- Runtime source and the running iOS and Android application control behavior, routes, authorization, data flow, copy,
  accessibility, platform integration, and available states. Figma cannot activate or redefine them.
- [`ref-061-mobile-visual-baseline.md`](../../../../docs/current/ref-061-mobile-visual-baseline.md) controls the visual
  inventory and the approved foundation, component, and screen scope.
- [`ref-064-figma-screen-certification.md`](../../../../docs/current/ref-064-figma-screen-certification.md) records the
  certified screen coverage and the boundary between visual and functional authority.
- The only canonical design file is
  [`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) in the Blockout Figma team
  (`NwDQmiXqSjKVzQ6gwry0zb`). Do not create a parallel canonical file.
- The canonical Figma file controls visual composition. The application remains the authority for behavior and platform
  functionality.

## Entry Gate

1. Read the owning roadmap task, the current visual baseline, relevant runtime sources, this policy, the mobile policy,
   and the applicable Figma skills.
2. Confirm that the task explicitly includes Figma or visual work and names the target foundation, component, flow, or
   screen family.
3. Classify the direction as visual discovery, code-to-Figma calibration, Figma-to-code implementation, or visual
   reconciliation.
4. Stop only when behavior, navigation, component ownership, token semantics, responsive intent, authentication, or a
   required provider state cannot be resolved from current evidence.

## Direction Of Work

### Visual discovery and code-to-Figma calibration

- Treat the shipped mobile application and runtime source as the authority for delivered behavior and reachable states.
- Produce a clean normalized design-system composition. Do not reproduce incidental alignment drift, duplicated styles,
  Web-only defects, or one-off values as new design rules.
- Preserve the current dark identity, mobile information hierarchy, copy, and native platform boundaries.

### Figma-to-code implementation

- Inspect the exact approved node and current runtime source before editing code.
- Treat Figma as visual input within the owning roadmap task, not as authority for contracts, permissions, data,
  navigation, hidden states, or provider behavior.
- Preserve accessible native behavior when a static composition cannot represent it.

## File And Lifecycle Structure

- Keep one canonical design file named `Blockout - Product Design`.
- Use deterministic lifecycle pages: `00 - Cover`, `10 - Foundations`, `20 - Components`, `30 - Ready for Development`,
  and `40 - Shipped`.
- Name screen frames `Domain / Screen / Viewport / State`.
- Keep foundations and component masters on their owning pages. Place approved screen compositions on
  `30 - Ready for Development`; move them to `40 - Shipped` only after the corresponding runtime implementation and
  native evidence pass.
- React Native Web references use phone-sized viewports only. They never establish a desktop product.

## Inspection And Mutation

- Inspect exact nodes, variables, styles, components, instances, current runtime sources, and available libraries before
  creating or changing anything.
- Keep Figma writes sequential, incremental, idempotent, and bounded to the owning page or node.
- Reuse semantic variables, text and effect styles, local components, variants, and icon instance swaps. Do not detach
  instances or duplicate an existing component family.
- Preserve a minimum 44-point interactive target. Keep iOS and Android safe-area and system differences explicit.
- Every variable, token category, component family, lifecycle page, and screen state requires evidence from REF-061 or
  current runtime source.
- Return every changed node ID and immediately verify naming, properties, bindings, fonts, metadata, instance linkage,
  accessibility, and rendered screenshots.
- Stop after a failed mutation, ambiguous result, missing prerequisite, or genuine decision fork. Do not continue
  writing blindly.
- Do not introduce automatic or bidirectional Figma/code synchronization.
- Code Connect remains deferred until a roadmap task explicitly authorizes it and stable published components exist.

## Fidelity And Evidence

- Compare Figma with the running application at the same viewport, platform, theme, authentication mode, sanitized
  fixture, and state.
- Validate loading, empty, error, disabled, destructive, sheet, toast, keyboard, scrolling, and platform-specific states
  where current evidence makes them reachable. Figma alone cannot prove interaction behavior.
- Missing runtime data, authentication, provider state, font, entitlement, simulator, or physical-device evidence is a
  blocker for that state. Report it instead of inventing a bypass or fake proof.
- Use sanitized data only. Never write credentials, access tokens, personal profiles, private identifiers, or production
  payloads into Figma or repository documentation.
- Record durable architecture and scope in repository documentation. Keep transient screenshots and local credentials
  outside Git.

## Closure

The final report identifies the canonical file, changed or consumed node IDs, runtime sources, viewports, platforms,
authentication modes, states, validations, intentional normalization, blockers, and skipped evidence. Complete and push
each roadmap task separately on `main` under the repository's current workflow.
