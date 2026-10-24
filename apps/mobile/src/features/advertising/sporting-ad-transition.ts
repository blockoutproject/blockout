import type { InterstitialLifecycle } from "./interstitial-lifecycle";

/**
 * Accepted navigation intent. Reuse its key for repetitions while pending; create a new key
 * for a new action. The caller owns resource/admission validity and destination failures.
 */
export interface SportingAdTransition {
  readonly key: object;
  readonly kind: string;
  readonly voluntary: boolean;
  readonly isCurrent: () => boolean;
  readonly open: () => void | Promise<void>;
}

/** Destination outcome; advertising failures release the intent and are diagnosed separately. */
export type SportingAdTransitionResult =
  | { status: "opened" | "abandoned" | "busy" }
  | { status: "destination-failed"; error: unknown };

/**
 * Routes accepted voluntary club/team/pool/match/live intents through the shared counter.
 * Other journeys execute without an advertising opportunity. This does not grant sporting access.
 */
export function openSportingAdTransition(
  lifecycle: InterstitialLifecycle,
  transition: SportingAdTransition,
): Promise<SportingAdTransitionResult> {
  const counted =
    transition.voluntary &&
    ["club", "team", "pool", "match", "live"].includes(transition.kind);
  return lifecycle.transition(transition, counted);
}
