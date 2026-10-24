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
 * Starts the caller-validated destination immediately, without ad ownership.
 * Synchronous and asynchronous opening failures remain with the destination's caller.
 */
export async function openTransitionDestination(
  open: SportingAdTransition["open"],
): Promise<SportingAdTransitionResult> {
  try {
    await open();
    return { status: "opened" };
  } catch (error) {
    return { status: "destination-failed", error };
  }
}

/**
 * Routes accepted voluntary club/team/pool/match/live intents through the shared counter.
 * Other journeys execute independently of the ad's pending slot and lifetime.
 * This does not grant sporting access.
 */
export function openSportingAdTransition(
  lifecycle: InterstitialLifecycle,
  transition: SportingAdTransition,
): Promise<SportingAdTransitionResult> {
  const sporting =
    transition.voluntary &&
    ["club", "team", "pool", "match", "live"].includes(transition.kind);
  if (sporting) return lifecycle.transition(transition);
  if (!transition.isCurrent()) return Promise.resolve({ status: "abandoned" });
  return openTransitionDestination(transition.open);
}
