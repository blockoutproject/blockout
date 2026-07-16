---
name: vercel-react-best-practices
description: React performance guidance adapted for Expo and React Native. Use when writing, reviewing, or refactoring Blockout React components, hooks, client data flows, rendering, or JavaScript hot paths; exclude Next.js, server, DOM, browser-storage, and hydration rules.
license: MIT
metadata:
  author: vercel
  version: "1.0.0-blockout"
---

# Blockout React Performance Practices

Use the applicable upstream React and JavaScript rules in this skill for the Expo application. Read
[`../blockout-best-practices/references/frontend-mobile-policy.md`](../blockout-best-practices/references/frontend-mobile-policy.md)
first: it remains authoritative for product behavior, route and state ownership, native integrations, styling, and
validation.

Performance guidance does not authorize speculative refactors, new dependencies, product changes, or broad cleanup.
Preserve current behavior, optimize an evidenced problem or task-owned boundary, and prefer the smallest direct change.

## When To Apply

Use this skill when:

- writing or reviewing React Native components and hooks;
- changing TanStack Query consumers or asynchronous client workflows;
- investigating unnecessary rerenders or expensive render work;
- changing imports or conditional feature loading that affects the Metro bundle;
- optimizing a measured JavaScript hot path.

For ordinary code changes, use the rules as review guidance rather than a mandate to rewrite adjacent code.

## Applicable Rule Groups

Read only the individual rule files needed by the current change.

### Asynchronous JavaScript

- `rules/async-defer-await.md`
- `rules/async-parallel.md`
- `rules/async-dependencies.md`

These rules apply to independent client work, native bridges, and API orchestration. They do not authorize changing
request ordering when ordering is part of the current behavior.

### Bundle Ownership

- `rules/bundle-barrel-imports.md`
- `rules/bundle-conditional.md`

Apply them only when the package and Metro/Expo toolchain support the resulting import pattern. Do not use Next.js
dynamic imports or browser hover/focus preload patterns.

### React Rerenders

- `rules/rerender-defer-reads.md`
- `rules/rerender-memo.md`
- `rules/rerender-memo-with-default-value.md`
- `rules/rerender-dependencies.md`
- `rules/rerender-derived-state.md`
- `rules/rerender-derived-state-no-effect.md`
- `rules/rerender-functional-setstate.md`
- `rules/rerender-lazy-state-init.md`
- `rules/rerender-simple-expression-in-memo.md`
- `rules/rerender-move-effect-to-event.md`
- `rules/rerender-transitions.md`
- `rules/rerender-use-ref-transient-values.md`
- `rules/rerender-no-inline-components.md`

Keep [`../no-use-effect/SKILL.md`](../no-use-effect/SKILL.md) authoritative for effect decisions. Memoization is not a
default; use it only for an actual identity contract or meaningful work.

### Framework-Neutral Rendering

- `rules/rendering-hoist-jsx.md`
- `rules/rendering-conditional-render.md`
- `rules/rendering-usetransition-loading.md`

Translate examples to React Native primitives. Preserve accessibility, animation, list virtualization, and native
interaction behavior defined by the mobile policy.

### JavaScript Hot Paths

- `rules/js-index-maps.md`
- `rules/js-cache-property-access.md`
- `rules/js-cache-function-results.md`
- `rules/js-combine-iterations.md`
- `rules/js-length-check-first.md`
- `rules/js-early-exit.md`
- `rules/js-hoist-regexp.md`
- `rules/js-min-max-loop.md`
- `rules/js-set-map-lookups.md`
- `rules/js-tosorted-immutable.md`
- `rules/js-flatmap-filter.md`

Use these only when the collection size, call frequency, or profiling evidence makes the tradeoff worthwhile. Prefer
readable direct code for ordinary lists and one-time operations.

### Advanced React Patterns

- `rules/advanced-event-handler-refs.md`
- `rules/advanced-init-once.md`
- `rules/advanced-use-latest.md`

These are escape hatches for stable callbacks or one-time initialization. Do not hide missing dependencies or native
lifecycle mistakes behind refs or module state.

## Explicitly Non-Applicable Upstream Rules

Do not apply the following upstream categories to Blockout mobile:

- Next.js API route, Server Component, Server Action, server cache, serialization, or streaming rules;
- `next/dynamic`, Next.js preload, browser analytics deferral, and other Next.js bundle rules;
- SWR ownership, browser global event listeners, passive DOM listeners, and `localStorage` rules;
- DOM/CSS batching, `content-visibility`, browser hydration, resource hints, script tags, and DOM wrapper animation;
- guidance that assumes HTML elements, CSS class names, browser rendering, or a web server runtime.

The upstream `AGENTS.md`, `README.md`, and non-applicable rule files remain vendored for provenance and comparison only.
Their presence does not activate them. MRG-505 owns any later rule-level mobile adaptation after the mobile architecture
audit.

## Verification

Run the checks required by the changed mobile boundary. At minimum, handwritten TypeScript changes require:

```bash
npm exec nx run @blockout/mobile:typecheck
```

Route, Metro, asset, configuration, dependency, or bundle-sensitive changes normally require the applicable Expo
exports. Native plugin or permission changes require stronger platform evidence as defined by the mobile policy.
