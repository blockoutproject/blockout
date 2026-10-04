---
name: design-prototyping
description: "Build and review standalone responsive web prototypes with mock data, coherent navigation and deliberate visual direction. Use for explicitly requested interactive design exploration."
---

# Standalone design prototypes

Read the accepted specifications, requested scope and project design constraints. The project owns approval requirements and stage transitions; this skill supplies prototype construction and review techniques. Use official Spec Kit procedures for specification changes when installed. Exploration does not silently change accepted behavior or select production architecture.

## Inputs and licensed material

When licensed material is needed, the request or repository must identify the human-provided source path and selected subdirectories. Verify the source exists and its component base matches the project. Do not substitute another archive or redistribute the full export; copy only selected material permitted for this use. Keep exact paths and registry choices in the consuming project.

For shadcn, inspect `components.json` for base, aliases, icons, Tailwind and tokens. Reuse configured primitives and approved semantic tokens. Adapt selected blocks deliberately rather than importing a foreign theme or treating a block as a finished screen. A rough navigation sketch does not require finished branding or licensed blocks unless the request requires them.

## Build coherent journeys

Use mock data and local interactions in the designated standalone prototype, with its own configuration and dependencies. Do not call production, identity or internal services or adopt generated production contracts. Reuse an existing prototype when it owns the exploration; do not add exploratory routes to the application.

Start with entry points, navigation, shared context and return paths. Split substantial work by coherent journeys and actual dependencies. Identify shared router, shell, mock-data and component ownership before concurrent edits; separate screen folders do not isolate shared state. Integrate lots regularly and exercise transitions between them. The presence of contributors does not itself authorize delegation.

Work in short loops: make interactions understandable, then refine responsive layout, states and visual direction. Explore alternatives only for an actual open choice; no fixed number of directions is required. Preserve approved interactions while refining typography, colors, density, components and meaningful motion. Surface unsupported or disproportionately complex interactions before treating the design as settled; a mock does not prove runtime feasibility.

## Review and handoff

Present the prototype directly through its preview and useful captures. Check complete journeys, not just rendered screens: context retention, returns, permissions, validation, empty/failure states, relevant widths/themes, keyboard/focus and touch targets. Use the project's required coverage and approval scope; a reviewed fragment does not establish integrated approval.

Provide the exact reviewable revision, scope, unresolved decisions and material limitations. Clearly distinguish a candidate from an approved result. Keep licensed source attribution. If the next authorized task is Figma translation, hand over the chosen visual direction, interactions, states and reusable component needs without inventing additional product requirements.

Keep the prototype available for future iterations. Its code is exploratory; production adoption requires its own technical decision. Follow the project's delivery rules without requiring an application PR merely to review a prototype.
