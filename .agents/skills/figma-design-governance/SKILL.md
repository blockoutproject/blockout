---
name: figma-design-governance
description: "Organize and verify Figma libraries, product screens, journeys and design evidence using live instances and the project-designated sources."
---

# Figma design governance

Identify the target Figma file or nodes from the request and the project's designated design sources.

## Design Authority

- Confirm the intended change from the accepted request and any design requirements it cites.
- Preserve the navigation, behavior and visual direction approved in the designated inputs. If a prototype is the accepted input, Figma formalizes that experience; it does not independently select a different direction.
- Use the project's existing owners for reusable variables, styles and components. When a shared library is published, use its instances. Components owned by the current file can be instanced locally.
- Keep product patterns and representative screen states in the file that owns the design. Follow the project's source of truth for token values.
- Current source code, tests, and archived Figma files are evidence of delivered behavior or appearance, not authority for a new visual direction.

## File Rules

- Where the file has a cover, keep it limited to identity, ownership, status and source links.
- Keep reusable foundations and components at their established owner. Use consistent names, Auto Layout, shared variables and styles, and meaningful variant contracts.
- Follow the file's organization for reusable patterns and journeys. Keep unresolved explorations separate from approved work.
- Keep instances linked to their main components. Reuse existing foundations and components.
- Keep documentation-only canvas helpers private, generic, and visually separate from product components.

## Product Screen Organization

These rules govern full product screens and journeys. They do not prescribe which
screens a product must contain; screen scope remains owned by the approved product
specification or issue.

### Classify the artifact before creating it

- **Utility components** are private documentation or canvas-presentation helpers.
- **Library components** are reusable product primitives.
- **Patterns** are reusable compositions with stable behavior that can serve more
  than one product journey.
- **Product screens** are domain-specific compositions that solve one user or
  system scenario.
- **Journeys** group related product screens into one meaningful outcome.
- **Explorations** are unresolved directions and are never a permanent home for
  approved work.

Do not classify a complete product journey as a Pattern solely because it uses
patterns internally.

### Choose the right page and section

Before creating a screen, inspect the existing file structure and identify its
durable product boundary: audience, workspace, domain, or lifecycle area.

- Use one durable product page per meaningful boundary when that boundary is
  expected to accumulate related journeys over time.
- Use sections within that page for journeys.
- Use frames within a journey for distinct representative screen compositions.
- Do not create one page per screen by default.
- Do not create a generic `Flows` page by default. A page name must communicate
  a durable product boundary, not merely an artifact type.
- Create a new product page only when the existing page would mix unrelated
  audiences or domains, become difficult to scan, or cannot reasonably grow
  with the product area.
- Keep status tracking outside the page taxonomy. Page names must describe
  product structure, not transient maturity such as draft or shipped.

### Keep journeys readable

Reuse the existing journey section and its clear names. Keep the source at the
existing file or journey entry; do not repeat it in screen notes. Add a short note
only for an interaction or constraint that the composition cannot show. Coverage
tables, approval history, qualification logs and delivery status belong in the
project's existing review record. Do not create canvas documentation merely to
satisfy this skill.

For new nodes, follow the file's naming convention. When none exists, use:

- `Journey / <domain> / <outcome>`
- `Screen / <domain> / <journey> / <scenario>`

A screen is a frame by default. Promote it to a component or a component set only
when it is a stable template with demonstrated reuse or meaningful state axes.
Do not create screen variants merely to catalogue every screen.

### Compose and promote deliberately

Compose screens from instances of the existing components and approved patterns where they fit.

Promote a screen composition to a shared pattern only when it has a
clear reusable contract and serves, or is expected to serve, multiple independent
journeys. Keep domain-specific copy, data, and navigation in the product screen.

### Cover scenarios proportionately

Represent the requested success, loading, empty and error states where their
composition differs. Each represented composition must be faithful in layout,
typography, spacing, tokens and actions. Different actions must remain clear even
when their messages share a layout.

Do not create a frame for each error message, scroll position, theme combination
or transient button state. Reuse the component's existing properties for states
such as a busy action. Add a composition only when it conveys a distinct visual
contract needed for the requested review; a short interaction note can explain a
transition without drawing its intermediate positions. There is no frame quota.

### Maintain an idempotent file structure

Before creating a page, section, screen, or pattern:

1. Inspect the existing product boundary and naming conventions.
2. Reuse or extend the existing destination when it fits.
3. Create a new destination only when the boundary is genuinely new.
4. Move approved explorations to their durable destination and preserve links.
5. Preserve links between journey screens, approved patterns, and their sources.

## Evidence Rules

- Identify the accepted input and criteria for the work under review. Link its revision when one exists.
- Group specifications only when they form one coherent journey or shared pattern.
- Record exact Figma node links and screenshots for downstream planning.
- Verify the changed compositions and applicable requested themes, widths and interactions. Shared tokens and components carry unchanged combinations; do not redraw a qualification matrix in the product file.
- Keep native observations of keyboard/focus, touch, text scaling, safe areas, motion and SDK behavior at their actual qualification boundary. Figma frames do not prove runtime behavior.
- Treat unpublished experiments, detached instances, stale library versions, and unresolved synchronization differences as invalid downstream evidence.

## Scope and review

Confirm the requested scope, target nodes and applicable review criteria before editing. When translating an approved prototype, preserve its interactions and visual direction. If a component cannot express a required state, raise that specific gap with its owner.

Stop when the requested compositions express the accepted intent and meet the project's review criteria.

Only certify the platforms, themes and states requested and actually reviewed. Record exact nodes, revision information where available, scope and remaining limitations in the existing review record. A file's existence, a passing test or approval of another scope does not approve the current result. Limited file maintenance does not require unrelated design exploration.
