import type {
  ApplicationAccessResponse,
  ApplicationVersionsResponse,
  PublicMaintenanceResponse,
} from "../../../../.generated/schemas/index.zod";

/** Process history of restrictions; Query exclusively owns the complete response and request lifecycle. */
export interface AccessObservationsSnapshot {
  maintenance?: PublicMaintenanceResponse;
  versions?: ApplicationVersionsResponse;
  /** A generic ordinary-request refusal closes admission until a new complete check succeeds. */
  refused: boolean;
}

/** Owns monotone process observations, without a second complete response or request-status store. */
export function createAccessObservations() {
  let snapshot: AccessObservationsSnapshot = { refused: false };
  const listeners = new Set<() => void>();

  /** Publishes immutable restriction history to React and asynchronous request consumers. */
  function publish(next: AccessObservationsSnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot: () => snapshot,

    /** Subscribes to accepted restrictions, returning its cleanup. */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Records a refusal without guessing a settings revision or erasing known restrictions. */
    refuse() {
      publish({ ...snapshot, refused: true });
    },

    /** Admits a complete response to Query only when it is at least as recent as both known groups. */
    complete(value: ApplicationAccessResponse): boolean {
      const current =
        value.maintenance.revision >= (snapshot.maintenance?.revision ?? 0) &&
        value.versions.revision >= (snapshot.versions?.revision ?? 0);
      publish({
        maintenance:
          value.maintenance.revision >= (snapshot.maintenance?.revision ?? 0)
            ? value.maintenance
            : snapshot.maintenance,
        versions:
          value.versions.revision >= (snapshot.versions?.revision ?? 0)
            ? value.versions
            : snapshot.versions,
        refused: current ? false : snapshot.refused,
      });
      return current;
    },

    /** Advances a partial maintenance observation; an older refusal cannot replace newer evidence. */
    maintenance(value: PublicMaintenanceResponse) {
      if (value.revision < (snapshot.maintenance?.revision ?? 0)) return;
      publish({ ...snapshot, maintenance: value });
    },

    /** Advances a partial versions observation without establishing complete admission. */
    versions(value: ApplicationVersionsResponse) {
      if (value.revision < (snapshot.versions?.revision ?? 0)) return;
      publish({ ...snapshot, versions: value });
    },
  };
}

/** Restriction owner shared by complete checking, validated partial results and request refusals. */
export type AccessObservations = ReturnType<typeof createAccessObservations>;
