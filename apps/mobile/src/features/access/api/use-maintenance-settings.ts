import { useSettingsAuthority } from "./use-settings-authority";
import { createMaintenanceSettingsQueryOptions } from "./access-settings-queries";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeMaintenanceSettings,
  getChangeMaintenanceSettingsMutationKey,
  getSetMaintenanceActivationMutationKey,
  setMaintenanceActivation,
} from "../../../../.generated/mobile";
import type {
  ChangeMaintenanceRequest,
  MaintenanceSettingsResponse,
  SetMaintenanceActivationRequest,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useCommand } from "../../../shared/query/use-command";
import { useApplicationAccess } from "../queries/use-application-access";

/** Uses canonical generated consumers and the existing private session cache, with no mutation replay. */
export function useMaintenanceSettings(enabled: boolean) {
  const { session, request, observedRevision } = useSettingsAuthority(
    enabled,
    "manageMaintenance",
  );
  const client = useQueryClient();
  const { observations } = useApplicationAccess();
  const options = createMaintenanceSettingsQueryOptions(
    {
      generation: session.generation,
      enabled: enabled && session.status === "authenticated",
      request,
    },
    observe,
  );
  const queryKey = options.queryKey;
  /** Publishes a confirmed group without triggering the complete startup/admission check. */
  async function acceptMaintenance(value: MaintenanceSettingsResponse) {
    await client.cancelQueries({ queryKey, exact: true });
    if (!session.isCurrent(session.generation)) return;
    const current = client.getQueryData<MaintenanceSettingsResponse>(queryKey);
    if (
      value.revision <
      Math.max(
        current?.revision ?? 0,
        observations.getSnapshot().maintenance?.revision ?? 0,
      )
    )
      return;
    client.setQueryData(queryKey, value);
    observe(value);
  }
  /** Retains the typed partial group as a restriction; only a complete check can admit ordinary access. */
  function observe(value: MaintenanceSettingsResponse, signal?: AbortSignal) {
    if (!session.isCurrent(session.generation) || signal?.aborted)
      throw new ApiError("cancelled");
    if (
      value.revision < (observations.getSnapshot().maintenance?.revision ?? 0)
    )
      throw new ApiError("schema");
    observations.maintenance({
      ...value,
      message: value.active ? value.message : null,
      imageUrl: value.active ? value.imageUrl : null,
    });
    return value;
  }
  const query = useQuery(options);
  const policy = { groupKey: queryKey, requiresRead: requiresRevisionRead };
  const content = useCommand(
    {
      mutationKey: [...queryKey, ...getChangeMaintenanceSettingsMutationKey()],
      mutationFn: async (body: ChangeMaintenanceRequest) =>
        changeMaintenanceSettings(body, await request(body.revision)),
      onSuccess: acceptMaintenance,
    },
    policy,
  );
  const activation = useCommand(
    {
      mutationKey: [...queryKey, ...getSetMaintenanceActivationMutationKey()],
      mutationFn: async (body: SetMaintenanceActivationRequest) =>
        setMaintenanceActivation(body, await request(body.revision)),
      onSuccess: acceptMaintenance,
    },
    policy,
  );
  return { query, queryKey, observedRevision, content, activation };
}
