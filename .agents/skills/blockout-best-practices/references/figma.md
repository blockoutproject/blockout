# Figma

## Design Authority

- An accepted feature specification owns future observable product and design intent.
- Blockout UI Library owns approved reusable variables, styles, foundations, icons, and components.
- Blockout Product Design owns approved product patterns and representative screen states composed from published Blockout UI Library instances.
- Repository design tokens are controlled, versioned implementation projections of approved Blockout UI Library values. They are not a separately maintained visual authority.
- Current source code, tests, and archived Figma files are evidence of delivered behavior or appearance, not authority for a new visual direction.

## File Rules

- Keep `Cover` limited to file identity, ownership, status, and links to the accepted specification.
- Keep reusable foundations and components in Blockout UI Library with deterministic names, Auto Layout, published variables and styles, documented variants, and accessibility annotations.
- Keep approved reusable product compositions in the Product Design `Patterns` page and representative journey evidence in its design pages.
- Keep unresolved visual directions and experiments in `Explorations`. They do not become authoritative until explicitly approved.
- Use live published instances for reusable UI. Never detach an instance or redraw a foundation or component already owned by Blockout UI Library.
- Keep documentation-only canvas helpers private, generic, and visually separate from product components.

## Evidence Rules

- Cite the exact accepted or clarified specification snapshot and relevant acceptance criteria.
- Group specifications only when they form one coherent journey or shared pattern.
- Record exact Figma node links and screenshots for downstream planning.
- Cover iOS, Android, every supported theme, required widths, relevant interaction and failure states, keyboard behavior, focus, touch targets, text scaling, safe areas, and reduced motion.
- Treat unpublished experiments, detached instances, stale library versions, and unresolved synchronization differences as invalid downstream evidence.
