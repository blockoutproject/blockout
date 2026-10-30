import { useApplicationAccess } from "../queries/use-application-access";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeApplicationVersionSettings,
  getChangeApplicationVersionSettingsMutationKey,
} from "../../../../.generated/mobile";
import type { ChangeApplicationVersionsRequest } from "../../../../.generated/schemas/index.zod";
import { createApplicationVersionsQueryOptions } from "./access-settings-queries";
import { useAccountSession } from "../../accounts/current-account";

/** Reads one settings group and lets normal Query invalidation refresh its server projections. */
export function useApplicationVersionsSettings(enabled: boolean) {
  const session = useAccountSession();
  /** Supplies native credentials for the captured principal; the server validates grants and revisions. */
  async function request() {
    const credentials = await session.getCredentials();
    return { headers: { Authorization: `Bearer ${credentials.accessToken}` } };
  }
  const client = useQueryClient();
  const { invalidate: invalidateAccess } = useApplicationAccess();
  const options = createApplicationVersionsQueryOptions({
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
    mutationKey: [
      ...queryKey,
      ...getChangeApplicationVersionSettingsMutationKey(),
    ],
    retry: false,
    networkMode: "always",
    mutationFn: async (body: ChangeApplicationVersionsRequest) =>
      changeApplicationVersionSettings(body, await request()),
    onSettled: invalidate,
  });
  return { query, queryKey, content };
}
