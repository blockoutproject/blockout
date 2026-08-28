# Figma

## Issue Evidence

- Cite the exact clarified product-source snapshots and relevant acceptance criteria.
- Group product sources only when they form one coherent journey or shared pattern.
- Record exact node links and screenshots for downstream planning.

## Design Rules

- Blockout UI Library is the only component source. Use published instances and official gluestack Figma UI kit components when they cover the required structure.
- Never detach an instance or redraw a primitive that the library provides.
- Structure Blockout Product Design files as `Cover`, `Utility Components`, `Patterns`, and `Explorations`.
- Keep `Cover` limited to a simple product-design identity frame.
- Build `Utility Components` like the gluestack Figma UI kit: keep only private, generic `_Docs / ...` components for documentation and canvas presentation, linked instances, deterministic names, Auto Layout, published Blockout variables and styles, and a small reusable page-presentation template.
- Keep approved product-pattern component sets on `Patterns`, with deterministic `Pattern / ...` names and linked instances for their presentation. Compose their product UI exclusively from live Blockout UI Library instances.
- Keep unresolved visual directions and design experiments in `Explorations`. Move only explicitly approved systems into `Patterns`.
- Keep `Patterns` limited to approved reusable product compositions and their linked pattern instances.
- Cover iOS, Android, supported themes, relevant states, keyboard interactions, focus, touch targets, text scaling, safe areas, and readability.
