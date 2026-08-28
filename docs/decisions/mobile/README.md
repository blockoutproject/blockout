# Mobile Decisions

The following decisions are active:

- Blockout is an Expo and React Native application with Expo Router navigation.
- The generated Orval client owns Blockout HTTP transport at the mobile boundary.
- TanStack Query owns remote facts; feature state does not duplicate query state.
- Feature modules own workflows and screen composition. Shared code requires repeated semantic ownership or an
  application-wide invariant.
- Provider and platform behavior remain behind native or Expo adapters.
- Blockout UI Library owns accepted foundations and shared components; Blockout Product Design owns accepted product
  patterns, explorations, and representative screen states. Repository documents and screenshots cannot replace them.

The current implementation boundary lives in
[`blockout-mobile-model-v1.md`](../../architecture/blockout-mobile-model-v1.md), and the durable visual boundary lives
in [`blockout-mobile-design-system-v1.md`](../../architecture/blockout-mobile-design-system-v1.md).
