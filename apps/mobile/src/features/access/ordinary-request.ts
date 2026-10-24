import { useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyAccountQueryKey } from "../../../.generated/mobile";
import type { AccountResponse } from "../../../.generated/schemas/index.zod";
import { ApiError, type ApiFetchOptions } from "../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../shared/query/query-client";
import { useApplicationAccess } from "./queries/use-application-access";
import { accessPresentation } from "./state/access-presentation";
import { readMaintenanceProblem } from "./api/maintenance-problem";

/**
 * Captures ordinary-request admission before asynchronous work. Public consumers scope their key
 * from `bypass` before fetching; private consumers retain their captured session key. Call request
 * inside each queryFn or command, immediately after obtaining native credentials; do not retain
 * prepared options for later requests. An obsolete choice fails instead of becoming a public read.
 */
export function useOrdinaryRequest() {
  const { observations, bypass } = useApplicationAccess();
  const client = useQueryClient();
  const intent = useSyncExternalStore(bypass.subscribe, bypass.getSnapshot);

  return {
    bypass: intent,
    /** Adds only this caller's current F12 intent and refusal observation; credentials remain caller-owned. */
    request(options: ApiFetchOptions): ApiFetchOptions {
      const headers = new Headers(options.headers);
      headers.delete("Blockout-Maintenance-Bypass");
      let signal = options.signal;
      if (intent) {
        const current = client.getQueryState<AccountResponse>(
          getSessionQueryKey(intent.generation, getGetMyAccountQueryKey()),
        );
        if (
          intent !== bypass.getSnapshot() ||
          intent.signal.aborted ||
          options.session?.generation !== intent.generation ||
          !options.session.isCurrent(intent.generation) ||
          current?.status !== "success" ||
          current.data?.accountId !== intent.accountId ||
          current.data.permissions.bypassMaintenance !== true ||
          accessPresentation(observations.getSnapshot()).version !== "satisfied"
        )
          throw new ApiError("cancelled");
        if (!headers.has("Authorization")) throw new ApiError("http", 401);
        headers.set("Blockout-Maintenance-Bypass", "true");
        signal = signal
          ? AbortSignal.any([signal, intent.signal])
          : intent.signal;
      }
      return {
        ...options,
        headers,
        signal,
        onHttpError(error) {
          const maintenance = readMaintenanceProblem(error);
          if (maintenance) observations.maintenance(maintenance);
          else if (error.status === 503) observations.fail();
          if (
            intent === bypass.getSnapshot() &&
            (maintenance || error.status === 401 || error.status === 403)
          )
            bypass.clear();
        },
      };
    },
  };
}
