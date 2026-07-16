# Frontend Mobile Policy

The mobile application lives at `apps/frontend/mobile` and is the Nx project `@blockout/mobile`.

- Use the Nx Expo plugin and root dependency/lock ownership.
- Preserve Expo SDK, React Native, native package, EAS, bundle identifier, scheme, notification, Firebase, RevenueCat,
  and advertising behavior during structural work.
- Never commit `google-services.json`, signing keys, provisioning profiles, or private EAS credentials.
- All `EXPO_PUBLIC_*` values are public.
- Keep platform-specific behavior explicit and test both Android and iOS configuration when the change is relevant.
- Prefer the existing API registry, hooks, providers, and navigation structure over new parallel abstractions.
- Run typecheck after TypeScript changes and an Expo export after configuration, Metro, Babel, asset, or dependency
  changes.
