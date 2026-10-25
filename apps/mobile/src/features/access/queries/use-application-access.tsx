import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import {
  getApplicationAccess,
  useGetApplicationAccess,
} from "../../../../.generated/mobile";
import { ApiError } from "../../../shared/api/api-fetch";
import { createAccessObservations } from "../state/access-observations";
import { createMaintenanceBypass } from "../state/maintenance-bypass";

const AccessContext = createContext<ReturnType<typeof useProcessAccess> | null>(
  null,
);

/** Starts the sole generated public check independently of F14/Auth0; Query owns its request lifecycle. */
function useProcessAccess() {
  const [observations] = useState(createAccessObservations);
  const [bypass] = useState(createMaintenanceBypass);
  useLayoutEffect(() => () => bypass.clear(), [bypass]);
  const observed = useSyncExternalStore(
    observations.subscribe,
    observations.getSnapshot,
  );
  const query = useGetApplicationAccess({
    query: {
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      queryFn: async ({ signal }) => {
        const value = await getApplicationAccess({ signal });
        if (!observations.complete(value)) throw new ApiError("schema");
        if (!value.maintenance.active) bypass.clear();
        return value;
      },
    },
  });
  const complete =
    query.isSuccess &&
    !query.isFetching &&
    !observed.refused &&
    query.data.maintenance.revision >= (observed.maintenance?.revision ?? 0) &&
    query.data.versions.revision >= (observed.versions?.revision ?? 0) &&
    query.data.maintenance.active === observed.maintenance?.active
      ? query.data
      : undefined;
  return {
    observations,
    bypass,
    snapshot: { ...observed, complete, checking: query.isFetching },
    checking: query.isFetching,
    retry: () => query.refetch(),
  };
}

/** Owns only process admission observations and explicit bypass, above credential initialization. */
export function ApplicationAccessProvider({ children }: PropsWithChildren) {
  const access = useProcessAccess();
  return <AccessContext value={access}>{children}</AccessContext>;
}

/** Reads the public complete-check owner; identity restoration never remounts it. */
export function useApplicationAccess() {
  const access = useContext(AccessContext);
  if (!access)
    throw new Error("Application access requires ApplicationAccessProvider");
  return access;
}
