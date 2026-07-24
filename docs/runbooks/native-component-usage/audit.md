# Native Component Usage Audit

Use this runbook to inspect whether Blockout uses established React Native, Expo, and Blockout components consistently.
It is the mobile equivalent of Maaatch's shadcn component-usage audit and remains read-only during evidence collection.

## Authority

Read the mobile Expo policy, mobile testing policy, Figma policy, relevant Expo/React Native documentation, and the
canonical Blockout design file when visual authority is required.

## Procedure

1. Inventory shared Blockout primitives, feature-owned compositions, React Native primitives, Expo packages, and
   provider-owned native components.
2. Locate handwritten buttons, fields, sheets, menus, cards, feedback states, images, lists, safe-area handling, and
   navigation controls.
3. Flag only evidence-backed candidates:
   - a supported Blockout primitive already owns the same responsibility and behavior;
   - a native or Expo component handles accessibility, lifecycle, performance, or platform behavior more correctly;
   - duplicated one-off implementations have drifted from certified tokens or states;
   - a shared wrapper merely forwards primitive props and should be removed;
   - a generic shared component contains feature business behavior and should return to its owner.
4. Compare props, accessibility, loading, empty/error, keyboard, focus, safe-area, animation, and both platform paths.
5. Do not demand visual uniformity where native iOS/Android behavior intentionally differs.
6. Deduplicate active Roadmap work and discard candidates that would require a product or design decision.

## Publication And Result

In a separate authorized phase, publish one focused issue per coherent component family with exact call sites, chosen
owner, preserved behavior, visual evidence requirement, and frozen Workset. Report a no-op when no replacement is
strictly better.
