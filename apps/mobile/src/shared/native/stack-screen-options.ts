/** Shared custom chrome owns the top material; UIKit must not add another scroll-edge surface. */
export const stackScreenOptions = {
  headerShown: false,
  scrollEdgeEffects: { top: "hidden" },
} as const;
