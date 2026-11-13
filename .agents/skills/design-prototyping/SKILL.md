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

Use fixtures and local interactions in the designated standalone prototype. Reuse its configuration, components and dependencies. Do not call production, identity or internal services or adopt generated production contracts. Reuse an existing prototype when it owns the exploration; do not add exploratory routes to the application.

Build only what makes the visual intent and essential interactions reviewable. A button can select a fixture or change local view state. Do not simulate backend delivery, provider protocols, concurrency, persistence or recovery merely to make the prototype technically realistic. No generic scenario engine, production architecture or hidden state machine is required for a visual decision.

Start with entry points, navigation, shared context and return paths. Split substantial work by coherent journeys and actual dependencies. Identify shared router, shell, mock-data and component ownership before concurrent edits; separate screen folders do not isolate shared state. Integrate lots regularly and exercise transitions between them. The presence of contributors does not itself authorize delegation.

Work in short loops: make interactions understandable, then refine the requested layout, states and visual direction. Explore alternatives only for an actual open choice; no fixed number of directions is required. Preserve approved interactions while refining typography, colors, density, components and meaningful motion. Surface unsupported or disproportionately complex interactions before treating the design as settled; a mock does not prove runtime feasibility.

## Review and handoff

Present the prototype directly through its preview and useful captures. Exercise the requested journey's essential transitions and return paths, including states needed to judge its composition or action. Check relevant responsive and interaction behavior within the project's required scope; do not turn the prototype into an exhaustive platform, theme or failure matrix. A reviewed fragment does not establish integrated approval.

Provide the exact reviewable revision, scope, unresolved decisions and material limitations. Clearly distinguish a candidate from an approved result. Keep licensed source attribution. If the next authorized task is Figma translation, hand over the chosen visual direction, interactions, states and reusable component needs without inventing additional product requirements.

Stop when the requested visual direction and essential interactions can be judged and the applicable review is complete. Keep the prototype available for future iterations; do not polish its internals into production code after that result is reached. Production adoption requires its own technical decision. Follow the project's delivery rules without requiring an application PR merely to review a prototype.
