import { useApplicationAccess } from "../queries/use-application-access";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeMaintenanceSettings,
  getChangeMaintenanceSettingsMutationKey,
  getSetMaintenanceActivationMutationKey,
  setMaintenanceActivation,
} from "../../../../.generated/mobile";
import type {
  ChangeMaintenanceRequest,
  SetMaintenanceActivationRequest,
} from "../../../../.generated/schemas/index.zod";
import { createMaintenanceSettingsQueryOptions } from "./access-settings-queries";
import { useAccountSession } from "@/features/accounts/current-account";

/** Reads one settings group and lets normal Query invalidation refresh its server projections. */
export function useMaintenanceSettings(enabled: boolean) {
  const session = useAccountSession();

  /** Uses captured native credentials; the server owns current grant validation. */
  async function request() {
    const credentials = await session.getCredentials();
    return { headers: { Authorization: `Bearer ${credentials.accessToken}` } };
  }

  const client = useQueryClient();
  const { invalidate: invalidateAccess } = useApplicationAccess();
  const options = createMaintenanceSettingsQueryOptions({
    enabled,
    request,
  });
  const queryKey = options.queryKey;
  const query = useQuery(options);

  /** Refreshes the private editor and complete admission result after any explicit attempt. */
  function invalidate() {
    void client.invalidateQueries({ queryKey, exact: true });
    void invalidateAccess();
  }

  const content = useMutation({
    mutationKey: [...queryKey, ...getChangeMaintenanceSettingsMutationKey()],
    mutationFn: async (body: ChangeMaintenanceRequest) =>
      changeMaintenanceSettings(body, await request()),
    onSettled: invalidate,
  });
  const activation = useMutation({
    mutationKey: [...queryKey, ...getSetMaintenanceActivationMutationKey()],
    mutationFn: async (body: SetMaintenanceActivationRequest) =>
      setMaintenanceActivation(body, await request()),
    onSettled: invalidate,
  });
  return { query, queryKey, content, activation };
}
