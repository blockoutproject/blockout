import {
  createContext,
  useCallback,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getApplicationAccess,
  getGetApplicationAccessQueryKey,
} from "../../../../.generated/mobile";
import type { SessionSnapshot } from "../../accounts/session/account-session-provider";

/** Explicit maintenance choice; the server checks the current principal's grant. */
export type MaintenanceBypass = Pick<SessionSnapshot, "subject" | "accountId">;
const AccessContext = createContext<ReturnType<typeof useProcessAccess> | null>(
  null,
);

/** Reads the latest complete configuration through Query, independently of native identity restoration. */
function useProcessAccess() {
  const client = useQueryClient();
  const invalidate = useCallback(
    () =>
      client.invalidateQueries({ queryKey: getGetApplicationAccessQueryKey() }),
    [client],
  );
  const [bypass, setBypass] = useState<MaintenanceBypass>();
  const clearBypass = useCallback(() => setBypass(undefined), []);
  const query = useQuery({
    queryKey: getGetApplicationAccessQueryKey(),
    queryFn: ({ signal }) => getApplicationAccess({ signal }),
  });
  return {
    bypass,
    clearBypass,
    invalidate,
    requestBypass(session: SessionSnapshot, eligible: boolean) {
      if (!eligible || !session.accountId) return false;
      setBypass({
        subject: session.subject,
        accountId: session.accountId,
      });
      return true;
    },
    snapshot: {
      maintenance: query.data?.maintenance,
      versions: query.data?.versions,
      complete: query.data,
      checking: query.isFetching,
    },
    checking: query.isFetching,
    retry: () => query.refetch(),
  };
}

/** Supplies current configuration and one ordinary React-owned maintenance choice. */
export function ApplicationAccessProvider({ children }: PropsWithChildren) {
  const access = useProcessAccess();
  return <AccessContext value={access}>{children}</AccessContext>;
}

/** Returns the public access query and explicit maintenance choice. */
export function useApplicationAccess() {
  const access = useContext(AccessContext);
  if (!access)
    throw new Error("Application access requires ApplicationAccessProvider");
  return access;
}
