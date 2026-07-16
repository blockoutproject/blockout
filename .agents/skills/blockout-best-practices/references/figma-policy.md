# Blockout Figma Interaction Policy

> Migration status: target policy inherited from Maaatch. Apply it incrementally through `docs/current/blockout-active-roadmap.md` without changing current product behavior.

Read this policy before any Blockout frontend development or product-design task that reads from, writes to, compares
against, or makes a decision in Figma. This includes visual conception, component or token work, code-to-Figma
calibration, Figma-to-code implementation, and visual reconciliation.

## Authority

- The [Roadmap GitHub Project](https://github.com/orgs/blockoutproject/projects/1) and the owning issue control task scope,
  readiness, priority, ownership, dependencies, and acceptance evidence.
- Product architecture, durable product decisions, source contracts, and current runtime source control capabilities,
  behavior, routes, authorization, data flow, and copy. Figma cannot activate or redefine them.
- `DESIGN.md` and `docs/architecture/blockout-frontend-design-system-v1.md` control visual direction and design-system
  boundaries.
- The only canonical design file is
  [`Blockout - Product Design`](https://www.figma.com/design/HUym9MGmc8ueIYR5IosgGw), file key
  `HUym9MGmc8ueIYR5IosgGw`. Do not create a parallel canonical file.
- Runtime source and browser evidence control shipped interaction, accessibility, responsive behavior, and state
  handling. Static Figma frames cannot prove these properties.

## Entry Gate

1. Start from the Roadmap Project, agent brief, product/runtime context, owning issue, and its cited domain sources.
2. Confirm the issue explicitly includes Figma or visual work and identifies the target page, component, flow, or frame.
3. Load `DESIGN.md`, the frontend design-system model, this policy, and the applicable Figma skills before interacting
   with the file.
4. Classify the source gate as `OK`, `REVALIDATE`, or `BLOCK` and the execution mode as `DEFAULT_EXECUTION` or
   `PLAN_REQUIRED`.
5. Stop in Plan mode when product behavior, visual direction, hierarchy, navigation, component ownership, token
   taxonomy, responsive intent, or a closed capability remains undecided.

## Direction Of Work

### Product or visual conception

- Work Figma-first when the task must decide a new screen, composed view, modal, dialog, drawer, panel, navigation
  pattern, interaction hierarchy, or reusable visual component.
- Resolve and approve the visual decision in the canonical file before implementing runtime code.
- Only an exact node on `30 - Ready for Development`, named by the owning issue, can become an implementation target.

### Figma-to-code implementation

- Inspect the exact approved node and current runtime source before editing.
- Treat the node as visual input within the issue scope, not as authority for product behavior, routes, contracts,
  rights, data, or hidden states.
- Preserve accessible browser behavior when a static composition cannot represent it.

### Code-to-Figma calibration

- Treat runtime source as authority for delivered behavior and state availability.
- Produce a clean, normalized design-system composition; do not reproduce incidental runtime defects or one-off CSS
  drift as new design rules.
- Do not use calibration to activate an unapproved capability or create an implementation obligation.

## Inspection And Mutation

- Inspect the exact nodes, variables, styles, components, instances, and current runtime sources before creating or
  changing anything.
- Keep Figma writes sequential, bounded to the owning page or node, and idempotent.
- Keep lifecycle pages deterministic and name screen frames `Domain / Screen / Viewport / State`.
- Reuse semantic variables, text styles, local components, variants, and icon instance swaps. Do not detach instances
  or create duplicate component families when an existing owner fits.
- Use local Lucide icon masters and preserve a 44 px touch target for interactive controls.
- A new variable, token category, component family, or lifecycle page requires explicit source justification and Plan
  mode when its ownership or semantics are not already decided.
- Return every changed node ID and immediately verify names, properties, bindings, fonts, metadata, placeholders,
  instance linkage, and screenshots.
- Stop after a failed mutation, ambiguous result, missing prerequisite, or genuine decision fork. Do not continue
  writing blindly.
- Automatic or bidirectional Figma/code synchronization is not accepted.
- Code Connect remains evidence-gated on current entitlement, published-library support, stable published nodes, and a
  source-aligned mapping preview. A mapping never changes product or runtime authority.

## Fidelity And Evidence

- Compare the browser with the exact approved node at the route, locale, viewport, theme, authentication mode, fixture,
  and state named by the issue.
- Validate keyboard flow, focus, scrolling, loading, empty, error, forbidden, conflict, responsive, and reduced-motion
  behavior when applicable. Figma alone cannot close these checks.
- Missing runtime, authentication, fixture, entitlement, font, or environment prerequisites are blockers. Report them
  explicitly instead of simulating proof.
- Record intentional drift separately from defects.
- Keep node IDs, screenshots, validation commands, comparison results, and delivery evidence in the owning issue and
  pull request, not in durable documentation.
- Move a frame to `40 - Shipped` only after the owning runtime implementation and browser evidence pass. Figma lifecycle
  state never replaces Git or GitHub delivery history.

## Closure

The final report must identify the canonical file, changed or consumed node IDs, code sources, routes, locales,
viewports, states, validations, intentional drift, blockers, and skipped evidence. The owning task execution workflow
remains responsible for validation, GitFlow, PR publication, and Project status transitions.
