import { randomUUID } from "expo-crypto";
import type { SessionSnapshot } from "../../accounts/session/session-generation";

/** Explicit personal intent, scoped to F05; clearing it cancels captured bypass work without replay. */
export function createMaintenanceBypass() {
  let owner:
    | (SessionSnapshot & {
        readonly intentId: string;
        readonly signal: AbortSignal;
      })
    | undefined;
  let cancellation: AbortController | undefined;
  const listeners = new Set<() => void>();
  /** Discards intent at a lifecycle, grant or complete inactive-maintenance boundary. */
  function clear() {
    if (!owner) return;
    owner = undefined;
    cancellation?.abort();
    cancellation = undefined;
    listeners.forEach((listener) => listener());
  }
  return {
    clear,
    getSnapshot: () => owner,
    /** Subscribes to personal intent changes; no credentials or permissions are stored here. */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * Records a deliberate choice with one identity shared by all consumers until cancellation.
     * Eligibility is supplied by current F12 admission, including the native minimum.
     */
    request(session: SessionSnapshot, eligible: boolean): boolean {
      if (!eligible || !session.accountId) return false;
      cancellation?.abort();
      cancellation = new AbortController();
      owner = {
        intentId: randomUUID(),
        generation: session.generation,
        accountId: session.accountId,
        signal: cancellation.signal,
      };
      listeners.forEach((listener) => listener());
      return true;
    },
    /** Checks current generation/account ownership immediately before preparing a concerned request. */
    active(session: SessionSnapshot): boolean {
      return (
        owner !== undefined &&
        owner.generation === session.generation &&
        owner.accountId === session.accountId
      );
    },
  };
}
