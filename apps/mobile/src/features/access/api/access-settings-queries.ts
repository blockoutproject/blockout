import { queryOptions } from "@tanstack/react-query";
import {
  getApplicationVersionSettings,
  getGetApplicationVersionSettingsQueryKey,
  getGetMaintenanceSettingsQueryKey,
  getMaintenanceSettings,
} from "../../../../.generated/mobile";
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";

/** The mounted settings reader supplies normal authenticated request options. */
export interface AccessSettingsQueryContext {
  enabled: boolean;
  request(): Promise<ApiFetchOptions>;
}
/** Reads the maintenance group through its generated key in the private native client. */
export function createMaintenanceSettingsQueryOptions(
  context: AccessSettingsQueryContext,
) {
  return queryOptions({
    queryKey: getGetMaintenanceSettingsQueryKey(),
    enabled: context.enabled,
    gcTime: 0,
    queryFn: async ({ signal }) =>
      getMaintenanceSettings({ ...(await context.request()), signal }),
  });
}
/** Reads the versions group through its generated key in the private native client. */
export function createApplicationVersionsQueryOptions(
  context: AccessSettingsQueryContext,
) {
  return queryOptions({
    queryKey: getGetApplicationVersionSettingsQueryKey(),
    enabled: context.enabled,
    gcTime: 0,
    queryFn: async ({ signal }) =>
      getApplicationVersionSettings({ ...(await context.request()), signal }),
  });
}
