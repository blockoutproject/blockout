import { useSettingsAuthority } from "./use-settings-authority";
import { createApplicationVersionsQueryOptions } from "./access-settings-queries";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeApplicationVersionSettings,
  getChangeApplicationVersionSettingsMutationKey,
} from "../../../../.generated/mobile";
import type {
  ApplicationVersionsResponse,
  ChangeApplicationVersionsRequest,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useCommand } from "../../../shared/query/use-command";
import { useApplicationAccess } from "../queries/use-application-access";

/** Reads and atomically edits the versions group using generated transport and F05 session isolation. */
export function useApplicationVersionsSettings(enabled: boolean) {
  const { session, request, observedRevision } = useSettingsAuthority(
    enabled,
    "manageApplicationVersions",
  );
  const client = useQueryClient();
  const { observations } = useApplicationAccess();
  const options = createApplicationVersionsQueryOptions(
    {
      generation: session.generation,
      enabled: enabled && session.status === "authenticated",
      request,
    },
    observe,
  );
  const queryKey = options.queryKey;
  /** Advances only validated, current partial observations; this never establishes ordinary admission. */
  function observe(value: ApplicationVersionsResponse, signal?: AbortSignal) {
    if (!session.isCurrent(session.generation) || signal?.aborted)
      throw new ApiError("cancelled");
    if (value.revision < (observations.getSnapshot().versions?.revision ?? 0))
      throw new ApiError("schema");
    observations.versions(value);
    return value;
  }
  const query = useQuery(options);
  /** Accepts a confirmed group without letting an older response replace a newer restriction. */
  async function acceptVersions(value: ApplicationVersionsResponse) {
    await client.cancelQueries({ queryKey, exact: true });
    if (!session.isCurrent(session.generation)) return;
    const current = client.getQueryData<ApplicationVersionsResponse>(queryKey);
    if (
      value.revision <
      Math.max(
        current?.revision ?? 0,
        observations.getSnapshot().versions?.revision ?? 0,
      )
    )
      return;
    client.setQueryData(queryKey, value);
    observations.versions(value);
  }
  const content = useCommand(
    {
      mutationKey: [
        ...queryKey,
        ...getChangeApplicationVersionSettingsMutationKey(),
      ],
      mutationFn: async (body: ChangeApplicationVersionsRequest) =>
        changeApplicationVersionSettings(body, await request(body.revision)),
      onSuccess: acceptVersions,
    },
    { groupKey: queryKey, requiresRead: requiresRevisionRead },
  );
  return { query, queryKey, observedRevision, content };
}
