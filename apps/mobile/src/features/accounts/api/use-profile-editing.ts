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
import type {
  AccountResponse,
  ChangeAccountProfileBody,
} from "../../../../.generated/schemas/index.zod";
import { isAccessDenied } from "@/shared/api/access-denied";
import { ApiError } from "@/shared/api/api-fetch";
import { binaryImagePreview } from "@/shared/api/binary-image-preview";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import { useAccountSession } from "../session/account-session-provider";

/** Publishes confirmed profile fields to the original private account before ordinary read invalidation. */
export function useProfileEditing(accountId: string) {
  const { request } = useOrdinaryRequest();
  const session = useAccountSession();
  const client = useQueryClient();
  const photoKey = getGetAccountPhotoQueryKey(accountId);
  const currentKey = getGetMyAccountQueryKey();

  const save = useMutation({
    mutationKey: [...getChangeAccountProfileMutationKey(), accountId],
    retry: false,
    networkMode: "always",
    mutationFn: async (body: ChangeAccountProfileBody) => {
      const credentials = await session.getCredentials();
      if (
        client.getQueryData<AccountResponse | null>(currentKey)?.accountId !==
        accountId
      ) {
        throw new ApiError("cancelled");
      }
      return changeAccountProfile(
        accountId,
        body,
        request({
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        }),
      );
    },
    onSuccess: async (accepted) => {
      if (
        session.status !== "authenticated" ||
        session.accountId !== accountId
      ) {
        return;
      }
      await client.cancelQueries({ queryKey: currentKey, exact: true });
      client.setQueryData<AccountResponse | null>(currentKey, (current) =>
        current?.accountId === accountId
          ? {
              ...current,
              username: accepted.username,
              hasPhoto: accepted.hasPhoto,
            }
          : current,
      );
    },
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
        try {
          const credentials = await session.getCredentials();
          const options = request({
            signal,
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
          });
          const blob = await getAccountPhoto(accountId, options);
          const uri = await binaryImagePreview(blob, options.signal);
          if (options.signal?.aborted) {
            throw new ApiError("cancelled");
          }
          return uri;
        } catch (error) {
          if (signal.aborted) {
            throw new ApiError("cancelled");
          }
          // Null removes only the URI; Query's accepted-read timestamp distinguishes refresh from initial failure.
          if (isAccessDenied(error)) {
            client.setQueryData<string | null>(queryKey, null, {
              updatedAt: client.getQueryState(queryKey)?.dataUpdatedAt ?? 0,
            });
          }
          throw error;
        }
      },
    }),
  );
}
