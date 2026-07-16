---
name: no-use-effect
description: |
  Prefer alternatives to unnecessary useEffect when writing or reviewing React code.
  ACTIVATE when writing React components, refactoring existing useEffect calls,
  reviewing PRs with useEffect, or when an agent adds useEffect "just in case."
  Provides the five replacement patterns and the useMountEffect escape hatch.
---

# Avoid Unnecessary useEffect

Blockout contains existing React Native effects and does not currently provide or lint-enforce `useMountEffect`.
Do not bulk-refactor them. For new code, prefer derived state, event handlers, or the existing data-fetching libraries.
Use a direct, dependency-correct `useEffect` when React Native or another external system genuinely requires
synchronization.

| Instead of useEffect for...           | Use                                         |
| ------------------------------------- | ------------------------------------------- |
| Deriving state from other state/props | Inline computation (Rule 1)                 |
| Fetching data                         | `useQuery` / data-fetching library (Rule 2) |
| Responding to user actions            | Event handlers (Rule 3)                     |
| One-time external sync on mount       | `useMountEffect` (Rule 4)                   |
| Resetting state when a prop changes   | `key` prop on parent (Rule 5)               |

- React docs: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

---

## Exception: React Hook Form async cross-field validation

When async validation depends on another field's value, use `useMountEffect` + `watch` + `setError`/`clearErrors` — they
are **stable refs** so the empty deps array is correct:

```tsx
// ✅ Correct
useMountEffect(() => {
  const subscription = watch(async (values, { name }) => {
    if (name !== 'username') return;
    const taken = await checkUsernameAvailable(values.username);
    if (taken) setError('username', { message: 'Ce pseudo est déjà pris' });
    else clearErrors('username');
  });
  return () => subscription.unsubscribe();
});

// ❌ Wrong
useEffect(() => { ... }, []); // triggers lint rule
```

---

## Optional Repeated Pattern: useMountEffect

Introduce this helper only when the same mount-only external synchronization pattern recurs:

```typescript
export function useMountEffect(effect: () => void | (() => void)) {
  /* eslint-disable no-restricted-syntax */
  useEffect(effect, []);
}
```

---

## Rule 1: Derive state, do not sync it

```typescript
// BAD: Two render cycles
useEffect(() => {
  setFiltered(products.filter((p) => p.inStock));
}, [products]);

// GOOD: Inline computation
const filtered = products.filter((p) => p.inStock);
```

**Smell:** `useEffect(() => setX(deriveFromY(y)), [y])`

---

## Rule 2: Use data-fetching libraries

```typescript
// BAD: Race condition risk
useEffect(() => {
  fetchProduct(productId).then(setProduct);
}, [productId]);

// GOOD
const { data: product } = useQuery(['product', productId], () => fetchProduct(productId));
```

**Smell:** Effect does `fetch(...)` then `setState(...)`.

---

## Rule 3: Event handlers, not effects

```typescript
// BAD
useEffect(() => { if (liked) { postLike(); setLiked(false); } }, [liked]);

// GOOD
<button onClick={() => postLike()}>Like</button>
```

**Smell:** State is used as a flag so an effect can do the real action.

---

## Rule 4: useMountEffect for one-time external sync

Good uses: DOM integration (focus, scroll), third-party widget lifecycles, browser API subscriptions.

```typescript
// BAD: Guard inside effect
useEffect(() => { if (!isLoading) playVideo(); }, [isLoading]);

// GOOD: Mount only when preconditions are met
function VideoPlayerWrapper({ isLoading }) {
  if (isLoading) return <LoadingScreen />;
  return <VideoPlayer />;
}
function VideoPlayer() {
  useMountEffect(() => playVideo());
}
```

**Smell:** You need "setup on mount, cleanup on unmount" with stable deps.

---

## Rule 5: Reset with key, not dependency choreography

```typescript
// BAD: Effect resets state on ID change
useEffect(() => { loadVideo(videoId); }, [videoId]);

// GOOD: key forces clean remount
function VideoPlayerWrapper({ videoId }) {
  return <VideoPlayer key={videoId} videoId={videoId} />;
}
function VideoPlayer({ videoId }) {
  useMountEffect(() => { loadVideo(videoId); });
}
```

**Smell:** Effect resets local state when an ID/prop changes.

---

## Component Structure Convention

```typescript
export function FeatureComponent({ featureId }: ComponentProps) {
  // 1. Hooks (useQuery, useForm, useRouter...)
  // 2. Local state (useState — UI only, e.g. popover open)
  // 3. Computed values (NOT useEffect + setState)
  // 4. Event handlers
  // 5. Early returns (loading, error)
  // 6. JSX return
}
```
