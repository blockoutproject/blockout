import { useTheme } from "@/shared/theme/theme-provider";

/** Hide the Stack’s automatic top edge behind Blockout’s shared material. */
export const stackScreenOptions = {
  headerShown: false,
  scrollEdgeEffects: { top: "hidden" },
} as const;

const animatedPages = {
  ...stackScreenOptions,
  animation: "ios_from_right",
} as const;
const stillPages = { ...stackScreenOptions, animation: "none" } as const;

/** The root skips the native push while leaving the cold launch selector. */
export function useStackScreenOptions(launchPending = false) {
  const { reducedMotion } = useTheme();
  return launchPending || reducedMotion ? stillPages : animatedPages;
}
