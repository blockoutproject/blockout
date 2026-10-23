import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import {
  changeMaintenanceSettings,
  getMaintenanceSettings,
  setMaintenanceActivation,
  getGetMaintenanceSettingsQueryKey,
  getGetApplicationAccessQueryKey,
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
  const queryKey = getSessionQueryKey(
    session.generation,
    getGetMaintenanceSettingsQueryKey(),
  );
  /** Rechecks the observer's current grant before preparing a request for its original generation. */
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
    await client.invalidateQueries({
      queryKey: getGetApplicationAccessQueryKey(),
      exact: true,
      refetchType: "none",
    });
    return value;
  }
  const query = useQuery({
    queryKey,
    gcTime: 0,
    enabled: enabled && session.status === "authenticated",
    queryFn: async ({ signal }) =>
      getMaintenanceSettings({ ...(await request()), signal }),
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
