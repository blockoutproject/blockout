import { queryOptions } from "@tanstack/react-query";
import {
  getApplicationVersionSettings,
  getGetApplicationVersionSettingsQueryKey,
  getGetMaintenanceSettingsQueryKey,
  getMaintenanceSettings,
} from "../../../../.generated/mobile";
import type {
  ApplicationVersionsResponse,
  MaintenanceSettingsResponse,
} from "../../../../.generated/schemas/index.zod";
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { getSessionQueryKey } from "../../../shared/query/query-client";

/** Captured F12 settings context; request preparation guards current session and action availability. */
export interface AccessSettingsQueryContext {
  generation: string;
  enabled: boolean;
  request(): Promise<ApiFetchOptions>;
}

/** Reads one maintenance group and publishes its restriction before admitting the validated DTO. */
export function createMaintenanceSettingsQueryOptions(
  context: AccessSettingsQueryContext,
  observe: (
    value: MaintenanceSettingsResponse,
    signal: AbortSignal,
  ) => MaintenanceSettingsResponse,
) {
  return queryOptions({
    queryKey: getSessionQueryKey(
      context.generation,
      getGetMaintenanceSettingsQueryKey(),
    ),
    enabled: context.enabled,
    gcTime: 0,
    queryFn: async ({ signal, client, queryKey }) => {
      const previousError = client.getQueryState(queryKey)?.error;
      try {
        return observe(
          await getMaintenanceSettings({
            ...(await context.request()),
            signal,
          }),
          signal,
        );
      } catch (error) {
        throw settingsReadError(error, previousError);
      }
    },
  });
}

/** Reads one versions group; partial restriction evidence never substitutes for the full admission check. */
export function createApplicationVersionsQueryOptions(
  context: AccessSettingsQueryContext,
  observe: (
    value: ApplicationVersionsResponse,
    signal: AbortSignal,
  ) => ApplicationVersionsResponse,
) {
  return queryOptions({
    queryKey: getSessionQueryKey(
      context.generation,
      getGetApplicationVersionSettingsQueryKey(),
    ),
    enabled: context.enabled,
    gcTime: 0,
    queryFn: async ({ signal, client, queryKey }) => {
      const previousError = client.getQueryState(queryKey)?.error;
      try {
        return observe(
          await getApplicationVersionSettings({
            ...(await context.request()),
            signal,
          }),
          signal,
        );
      } catch (error) {
        throw settingsReadError(error, previousError);
      }
    },
  });
}

/** A failed recheck cannot lift a known settings refusal; only a successful read restores command authority. */
function settingsReadError(error: unknown, previousError: unknown) {
  return isAccessDenied(previousError) ? previousError : error;
}
