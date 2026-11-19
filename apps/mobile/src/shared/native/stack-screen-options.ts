import { useReducedMotion } from "@/shared/theme/use-reduced-motion";
import { useNativeSplashPending } from "./native-splash-handoff";

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

/** UIKit keeps its standard push, and Android uses the equivalent native slide. */
export function useStackScreenOptions() {
  const splashPending = useNativeSplashPending();
  const reducedMotion = useReducedMotion();
  return splashPending || reducedMotion ? stillPages : animatedPages;
}
