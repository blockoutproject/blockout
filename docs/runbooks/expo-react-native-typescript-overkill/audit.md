# Expo, React Native, And TypeScript Over-Engineering Audit

Use this runbook to find unnecessary mobile complexity without modifying the Expo application.

## Authority

Read:

- `.agents/skills/blockout-best-practices/references/mobile-expo-policy.md`
- `.agents/skills/blockout-best-practices/references/mobile-testing-policy.md`
- `karpathy-guidelines`
- `vercel-react-native-skills` when performance or native behavior is inspected
- `vercel-composition-patterns` when public component composition is inspected

Current Blockout behavior and the canonical Figma source remain authoritative. Maaatch's web audit supplies the
evidence flow, not Next.js or browser rules.

## Evidence Scope

Inspect handwritten code under `apps/frontend/mobile`. Exclude generated Orval output, Expo/native build output,
dependencies, caches, and code already owned by an active issue or pull request.

## Procedure

1. Map routes, feature modules, shared modules, providers, generated API boundaries, forms, hooks, view models, and
   high-cost collection screens.
2. Search for candidates:
   - wrappers that only forward React Native props;
   - components controlled by unrelated boolean mode combinations;
   - generic screen schemas, registries, factories, base hooks, managers, or type-level frameworks;
   - generated types renamed or duplicated without semantic change;
   - remote state copied into provider/local state, effects used for derivation, or providers without active consumers;
   - hooks that combine navigation, mutation, analytics, formatting, and presentation;
   - broad barrels, speculative shared components, empty feature role folders, or one-use abstractions;
   - `any`, unsafe casts, non-null assertions, ceremonial explicit local types, or generic parameters with one concrete
     use;
   - memoization without measured cost, unstable list keys, expensive virtualized rows, or full-screen subscriptions;
   - duplicated Formik/Yup rules, a second form stack, or transport models leaking directly into UI composition.
3. Trace every candidate through all imports, tests, platforms, accessibility behavior, and native lifecycle.
4. Estimate the simpler equivalent and discard candidates that would move complexity, change behavior, or reduce
   clarity.
5. Classify survivors by correctness, performance, accessibility, maintainability, or removal of dead machinery.
6. Deduplicate against current Roadmap work.

## Publication

Publish in a separate mutation phase only when a finding names exact files, current consumers, preserved behavior,
expected deletion or simplification, and focused validation. Do not claim or execute the issue.

## Result

Report inspected boundaries, actionable issues, rejected candidates with reasons, and a valid no-op when current
abstractions are justified.
