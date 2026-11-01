/**
 * Accepted navigation intent. Reuse its key for repetitions while pending; create a new key
 * for a new action. The caller owns resource/admission validity and destination failures.
 */
export interface SportingAdTransition {
  readonly key: object;
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
