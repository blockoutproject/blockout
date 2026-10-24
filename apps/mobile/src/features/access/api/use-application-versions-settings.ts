import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import {
  changeApplicationVersionSettings,
  getApplicationVersionSettings,
  getGetApplicationVersionSettingsQueryKey,
} from "../../../../.generated/mobile";
import type {
  ApplicationVersionsResponse,
  ChangeApplicationVersionsRequest,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useAccountSession } from "../../accounts/current-account";
import { useApplicationAccess } from "../queries/use-application-access";

/** Reads and atomically edits the versions group using generated transport and F05 session isolation. */
export function useApplicationVersionsSettings(enabled: boolean) {
  const session = useAccountSession();
  const auth = useAuth0();
  const client = useQueryClient();
  const { observations } = useApplicationAccess();
  const queryKey = getSessionQueryKey(
    session.generation,
    getGetApplicationVersionSettingsQueryKey(),
  );
  /** Rechecks current presentation authority before native credentials; the server owns actual authorization. */
  async function request() {
    if (!enabled) throw new ApiError("http", 403);
    const credentials = await auth.getCredentials();
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    if (!credentials) throw new ApiError("http", 401);
    return {
      session,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    };
  }
  /** Advances only validated, current partial observations; this never establishes ordinary admission. */
  function observe(value: ApplicationVersionsResponse, signal?: AbortSignal) {
    if (!session.isCurrent(session.generation) || signal?.aborted)
      throw new ApiError("cancelled");
    if (value.revision < (observations.getSnapshot().versions?.revision ?? 0))
      throw new ApiError("schema");
    observations.versions(value);
    return value;
  }
  const query = useQuery({
    queryKey,
    gcTime: 0,
    enabled: enabled && session.status === "authenticated",
    queryFn: async ({ signal }) =>
      observe(
        await getApplicationVersionSettings({ ...(await request()), signal }),
        signal,
      ),
  });
  const content = useMutation({
    gcTime: 0,
    mutationFn: async (body: ChangeApplicationVersionsRequest) => {
      const accepted = await changeApplicationVersionSettings(
        body,
        await request(),
      );
      await client.cancelQueries({ queryKey, exact: true });
      observe(accepted);
      client.setQueryData(queryKey, accepted);
      return accepted;
    },
  });
  return { query, content };
}
