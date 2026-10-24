import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import {
  changeMaintenanceSettings,
  getMaintenanceSettings,
  setMaintenanceActivation,
  getGetMaintenanceSettingsQueryKey,
} from "../../../../.generated/mobile";
import type {
  ChangeMaintenanceRequest,
  MaintenanceSettingsResponse,
  SetMaintenanceActivationRequest,
} from "../../../../.generated/schemas/index.zod";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useAccountSession } from "../../accounts/current-account";
import { useApplicationAccess } from "../queries/use-application-access";

/** A conflict or possibly committed write requires an explicit current-state read before resubmission. */
export function requiresSettingsReread(error: unknown) {
  return (
    isUncertainMutationFailure(error) ||
    (error instanceof ApiError && error.status === 409)
  );
}

/** Uses canonical generated consumers and the existing private session cache, with no mutation replay. */
export function useMaintenanceSettings(enabled: boolean) {
  const session = useAccountSession();
  const auth = useAuth0();
  const client = useQueryClient();
  const { observations } = useApplicationAccess();
  const queryKey = getSessionQueryKey(
    session.generation,
    getGetMaintenanceSettingsQueryKey(),
  );
  /** Requires this observer's enabled state and current generation; the server rechecks the actual grant. */
  async function request() {
    if (!enabled) throw new ApiError("http", 403);
    try {
      const credentials = await auth.getCredentials();
      if (!session.isCurrent(session.generation))
        throw new ApiError("cancelled");
      if (!credentials) throw new ApiError("http", 401);
      return {
        session,
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      };
    } catch (error) {
      if (!session.isCurrent(session.generation))
        throw new ApiError("cancelled");
      throw error;
    }
  }
  /** Publishes a confirmed group without triggering the complete startup/admission check. */
  async function accept(value: MaintenanceSettingsResponse) {
    await client.cancelQueries({ queryKey, exact: true });
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    const current = client.getQueryData<MaintenanceSettingsResponse>(queryKey);
    if (current && value.revision < current.revision)
      throw new ApiError("schema");
    client.setQueryData(queryKey, value);
    observe(value);
    return value;
  }
  /** Retains the typed partial group as a restriction; only a complete check can admit ordinary access. */
  function observe(value: MaintenanceSettingsResponse, signal?: AbortSignal) {
    if (!session.isCurrent(session.generation) || signal?.aborted)
      throw new ApiError("cancelled");
    observations.maintenance({
      ...value,
      message: value.active ? value.message : null,
      imageUrl: value.active ? value.imageUrl : null,
    });
    return value;
  }
  const query = useQuery({
    queryKey,
    gcTime: 0,
    enabled: enabled && session.status === "authenticated",
    queryFn: async ({ signal }) =>
      observe(
        await getMaintenanceSettings({ ...(await request()), signal }),
        signal,
      ),
  });
  const content = useMutation({
    gcTime: 0,
    mutationFn: async (body: ChangeMaintenanceRequest) =>
      accept(await changeMaintenanceSettings(body, await request())),
  });
  const activation = useMutation({
    gcTime: 0,
    mutationFn: async (body: SetMaintenanceActivationRequest) =>
      accept(await setMaintenanceActivation(body, await request())),
  });
  return { query, content, activation };
}
