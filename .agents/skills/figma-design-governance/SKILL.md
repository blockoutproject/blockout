---
name: figma-design-governance
description: "Organize and verify approved Figma libraries, product screens, journeys and design evidence, preserving specification authority, live instances and the UI planning gate."
---

# Figma design governance

Repository instructions and the accepted issue identify the canonical design files. Resolve their actual links before acting; this portable skill owns no file IDs or product screen list.

## Design Authority

- Accepted specifications own future observable product and design intent, for a whole application release or an evolution.
- An approved interactive prototype demonstrates scoped navigation and behavior; its exploratory styling does not override the designated Figma visual authority.
- The designated UI library owns approved reusable variables, styles, foundations, icons, and components.
- The designated product design file owns approved product patterns and representative screen states composed from published designated UI library instances.
- Repository design tokens are controlled, versioned implementation projections of approved designated UI library values. They are not a separately maintained visual authority.
- Current source code, tests, and archived Figma files are evidence of delivered behavior or appearance, not authority for a new visual direction.

## File Rules

- Keep `Cover` limited to file identity, ownership, status, and links to the accepted specification.
- Keep reusable foundations and components in the designated UI library with deterministic names, Auto Layout, published variables and styles, documented variants, and accessibility annotations.
- Keep approved reusable product compositions in the Product Design `Patterns` page and representative journey evidence in its design pages.
- Keep unresolved visual directions and experiments in `Explorations`. They do not become authoritative until explicitly approved.
- Use live published instances for reusable UI. Never detach an instance or redraw a foundation or component already owned by the designated UI library.
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
- Use frames within a journey for screens and scenario coverage.
- Do not create one page per screen by default.
- Do not create a generic `Flows` page by default. A page name must communicate
  a durable product boundary, not merely an artifact type.
- Create a new product page only when the existing page would mix unrelated
  audiences or domains, become difficult to scan, or cannot reasonably grow
  with the product area.
- Keep status tracking outside the page taxonomy. Page names must describe
  product structure, not transient maturity such as draft or shipped.

### Document journeys and screens consistently

Each journey section must use the private linked documentation presentation
components available in the file and state:

- the user or system context;
- the intended outcome;
- the authoritative source, such as an issue or specification;
- the relevant viewport, theme, state, and accessibility coverage.

Use deterministic names:

- `Journey / <domain> / <outcome>`
- `Screen / <domain> / <journey> / <scenario>`

A screen is a frame by default. Promote it to a component or a component set only
when it is a stable template with demonstrated reuse or meaningful state axes.
Do not create screen variants merely to catalogue every screen.

### Compose and promote deliberately

Product screens must be composed from live published designated UI library instances
and approved Pattern instances where they fit. Never detach instances.

Promote a composition from a product screen to `Patterns` only when it has a
clear reusable contract and serves, or is expected to serve, multiple independent
journeys. Keep domain-specific copy, data, and navigation in the product screen.

### Cover scenarios proportionately

For each journey, explicitly select the relevant viewport, theme, state,
keyboard/focus, touch-target, loading, empty, validation, permission, failure,
and recovery coverage. Do not multiply variants mechanically when they do not
change behavior, layout, or a meaningful visual contract.

### Maintain an idempotent file structure

Before creating a page, section, screen, or pattern:

1. Inspect the existing product boundary and naming conventions.
2. Reuse or extend the existing destination when it fits.
3. Create a new destination only when the boundary is genuinely new.
4. Move approved work out of `Explorations` rather than duplicating it.
5. Preserve links between journey screens, approved patterns, and their sources.

## Evidence Rules

- Cite the exact accepted or clarified specification snapshot and relevant acceptance criteria.
- Group specifications only when they form one coherent journey or shared pattern.
- Record exact Figma node links and screenshots for downstream planning.
- Cover the supported platforms, every supported theme, required widths, relevant interaction and failure states, keyboard behavior, focus, touch targets, text scaling, safe areas, and reduced motion.
- Treat unpublished experiments, detached instances, stale library versions, and unresolved synchronization differences as invalid downstream evidence.

## Planning gate and scope

For material UI work, resolve accepted product behavior first, then obtain explicit approval of the corresponding Figma design before the technical implementation plan is finalized. Read-only feasibility work may resolve design prerequisites before approval; it does not certify an unapproved design or authorize product implementation. Use the applicable official Spec Kit and Figma workflows rather than reproducing their mechanics here.

When following a prototype-first workflow, require explicit approval of the complete selected prototype scope before canonical translation, not just approval of one screen or lot. Use the design-workflow skill when available for decomposition and stage transitions. Reuse approved visual identity or settle the remaining art direction, then build or amend the designated UI Library from validated needs before composing Product Design patterns and complete screens with its published instances. Preserve the prototype's approved navigation, states and meaningful effects; reconcile specification, prototype and Figma differences explicitly before production. This sequence applies to a whole V1 or an evolution and its affected journeys; it does not force unrelated library maintenance through a new prototype.

A design issue must identify its authoritative specification/decision, target library/product file, scoped journeys or components, acceptance coverage and required evidence. Do not invent design authority from current screenshots or another product. If a required library capability is absent, report the conflict and obtain a design decision rather than detaching or silently drawing a replacement.

Only certify the supported platforms/themes/states the task requires and for which evidence exists. Report absent platform captures, unpublished components and unresolved differences. A source-code policy change does not certify a design system.
