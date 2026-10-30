import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  changeAccountProfile,
  getAccountPhoto,
  getChangeAccountProfileMutationKey,
  getGetAccountPhotoQueryKey,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import type { ChangeAccountProfileBody } from "../../../../.generated/schemas/index.zod";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { ApiError } from "../../../shared/api/api-fetch";
import { binaryImagePreview } from "../../../shared/api/binary-image-preview";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { useAccountSession } from "../session/account-session-provider";

/** Owns one original-target mutation; normal invalidation refreshes the private profile and photo. */
export function useProfileEditing(accountId: string) {
  const { request } = useOrdinaryRequest();
  const session = useAccountSession();
  const client = useQueryClient();
  const photoKey = getGetAccountPhotoQueryKey(accountId);
  const currentKey = getGetMyAccountQueryKey();
  /** Captures credentials for the current original account at the dispatch boundary. */
  async function options(signal?: AbortSignal) {
    if (session.accountId !== accountId) throw new ApiError("cancelled");
    const credentials = await session.getCredentials();
    if (session.accountId !== accountId) throw new ApiError("cancelled");
    if (!credentials) throw new ApiError("http", 401);
    return request({
      signal,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  }
  const save = useMutation({
    mutationKey: [...getChangeAccountProfileMutationKey(), accountId],
    retry: false,
    networkMode: "always",
    mutationFn: async (body: ChangeAccountProfileBody) =>
      changeAccountProfile(accountId, body, await options()),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: currentKey, exact: true });
      void client.invalidateQueries({ queryKey: photoKey, exact: true });
    },
  });
  return { save };
}
/** Loads the displayed owner-only photo; a prepared replacement or removal disables this remote preview. */
export function useProfilePhoto(accountId: string, enabled: boolean) {
  const { request } = useOrdinaryRequest();
  const session = useAccountSession();
  return useQuery(
    queryOptions<string | null>({
      queryKey: getGetAccountPhotoQueryKey(accountId),
      enabled: enabled && session.status === "authenticated",
      gcTime: 0,
      queryFn: async ({ signal, client, queryKey }) => {
        const previousError = client.getQueryState(queryKey)?.error;
        try {
          const credentials = await session.getCredentials();
          if (!credentials) throw new ApiError("http", 401);
          const options = request({
            signal,
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
          });
          const blob = await getAccountPhoto(accountId, options);
          const uri = await binaryImagePreview(blob, options.signal);
          if (options.signal?.aborted) throw new ApiError("cancelled");
          return uri;
        } catch (error) {
          if (signal.aborted) throw new ApiError("cancelled");
          // Null removes only the URI; Query's accepted-read timestamp distinguishes refresh from initial failure.
          if (isAccessDenied(error))
            client.getQueryCache().find({ queryKey, exact: true })?.setState({
              data: null,
            });
          throw isAccessDenied(previousError) ? previousError : error;
        }
      },
    }),
  );
}
