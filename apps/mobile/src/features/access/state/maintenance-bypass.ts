import type { SessionSnapshot } from "../../accounts/session/session-generation";

/** Explicit personal intent, scoped to the existing F05 generation and never persisted. */
export function createMaintenanceBypass() {
  let owner: SessionSnapshot | undefined;
  const listeners = new Set<() => void>();
  /** Discards intent at a lifecycle, grant or complete inactive-maintenance boundary. */
  function clear() {
    if (!owner) return;
    owner = undefined;
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
    /** Records only a deliberate currently eligible account choice; eligibility includes the native minimum. */
    request(session: SessionSnapshot, eligible: boolean): boolean {
      if (!eligible || !session.accountId) return false;
      owner = { generation: session.generation, accountId: session.accountId };
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
