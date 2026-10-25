import { randomUUID } from "expo-crypto";

/** Transient identity for private work; profile and entitlement data remain with their own owners. */
export interface SessionSnapshot {
  readonly generation: string;
  readonly accountId: string | null;
  /** An explicit native lifecycle command, owned here so same-turn actions cannot duplicate it. */
  readonly operation?: "authenticating" | "signing-out";
}

/** Observable lifecycle boundary shared by React and asynchronous consumers. */
export type SessionGeneration = ReturnType<typeof createSessionGeneration>;

/**
 * Owns one in-memory session generation. Consumers capture it before starting work and check it
 * before publishing results; cancellation is an independent optimization, not the isolation guard.
 */
export function createSessionGeneration() {
  let snapshot: SessionSnapshot = { generation: randomUUID(), accountId: null };
  const listeners = new Set<() => void>();

  /** Publishes an immutable snapshot to the current subscribers. */
  function publish(next: SessionSnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot: () => snapshot,

    /** Subscribes to account establishment and lifecycle changes; returns the unsubscribe function. */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Tests a generation captured before asynchronous work, including a return to the same account. */
    isCurrent(generation: string) {
      return snapshot.generation === generation;
    },

    /** Accepts a current account result; replacing an established account starts a new generation. */
    setAccount(generation: string, accountId: string): boolean {
      if (snapshot.generation !== generation) return false;
      if (snapshot.accountId === accountId) return true;
      publish({
        generation: snapshot.accountId === null ? generation : randomUUID(),
        accountId,
      });
      return true;
    },

    /** Discards the account context and invalidates all previously captured work immediately. */
    invalidate() {
      publish({ generation: randomUUID(), accountId: null });
    },

    /** Reserves a lifecycle command synchronously; guest departure may supersede login, never the reverse. */
    beginOperation(operation: "authenticating" | "signing-out") {
      if (
        snapshot.operation === "signing-out" ||
        snapshot.operation === operation
      )
        return;
      const generation = randomUUID();
      publish({ generation, accountId: null, operation });
      return generation;
    },

    /** Releases only this generation's native command; older completion cannot reopen admission. */
    finishOperation(generation: string) {
      if (snapshot.generation !== generation || !snapshot.operation) return;
      publish({ generation, accountId: snapshot.accountId });
    },
  };
}
