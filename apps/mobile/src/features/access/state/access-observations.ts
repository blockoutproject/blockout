import type {
  ApplicationAccessResponse,
  ApplicationVersionsResponse,
  PublicMaintenanceResponse,
} from "../../../../.generated/schemas/index.zod";

/** Highest process observations; only a complete current check supplies ordinary admission. */
export interface AccessSnapshot {
  maintenance?: PublicMaintenanceResponse;
  versions?: ApplicationVersionsResponse;
  complete?: ApplicationAccessResponse;
  checking: boolean;
}

/** Owns process-local revision ordering without persisting or combining partial reads into admission. */
export function createAccessObservations() {
  let snapshot: AccessSnapshot = { checking: true };
  const listeners = new Set<() => void>();
  /** Publishes one immutable observation to React and asynchronous consumers. */
  function publish(next: AccessSnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => snapshot,
    /** Subscribes to accepted observations, returning its cleanup. */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Closes admission during the explicit complete verification while retaining known restrictions. */
    begin() {
      publish({ ...snapshot, complete: undefined, checking: true });
    },
    /** A failed check cannot use the previous permissive snapshot as a fallback. */
    fail() {
      publish({ ...snapshot, complete: undefined, checking: false });
    },
    /** Accepts only a complete snapshot at least as recent as both highest group observations. */
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
        complete: current ? value : undefined,
        checking: false,
      });
      return current;
    },
    /** Advances maintenance from a partial read/write or typed refusal; an old refusal has no effect. */
    maintenance(value: PublicMaintenanceResponse) {
      if (value.revision < (snapshot.maintenance?.revision ?? 0)) return;
      const changed =
        !snapshot.maintenance ||
        value.revision > snapshot.maintenance.revision ||
        value.active !== snapshot.maintenance.active;
      publish({
        ...snapshot,
        maintenance: value,
        complete: changed ? undefined : snapshot.complete,
      });
    },
    /** Observes a whole versions group without treating its partial response as complete admission. */
    versions(value: ApplicationVersionsResponse) {
      if (value.revision < (snapshot.versions?.revision ?? 0)) return;
      const changed =
        !snapshot.versions || value.revision > snapshot.versions.revision;
      publish({
        ...snapshot,
        versions: value,
        complete: changed ? undefined : snapshot.complete,
      });
    },
  };
}

/** Process owner shared by the public check, transport observations and route composition. */
export type AccessObservations = ReturnType<typeof createAccessObservations>;
