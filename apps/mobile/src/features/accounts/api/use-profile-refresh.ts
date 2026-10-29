import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getChangeAccountProfileMutationKey,
  getGetAccountPhotoQueryKey,
} from "../../../../.generated/mobile";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useAccountSession } from "../session/account-session-provider";
import type { useCurrentAccount } from "./use-current-account";

/** Shares profile/photo refresh; retainedDraft keeps refusal feedback with the locked editor instead of a blocking overview card. */
export function useProfileRefresh(
  account: ReturnType<typeof useCurrentAccount>,
  retainedDraft = false,
) {
  const session = useAccountSession();
  const client = useQueryClient();
  const feedback = useActionFeedback();
  const mutationKey = getSessionQueryKey(
    session.generation,
    getChangeAccountProfileMutationKey(),
  );
  const saving = useIsMutating({ mutationKey }) > 0;
  const photoKey = getSessionQueryKey(
    session.generation,
    getGetAccountPhotoQueryKey(account.data?.accountId ?? ""),
  );
  const photoFetching = useIsFetching({ queryKey: photoKey, exact: true }) > 0;
  const refreshing =
    account.isRefetching ||
    (photoFetching && client.getQueryData(photoKey) !== undefined);

  /** Refreshes the accepted current account then its displayed photo; an unavailable current scope never publishes late feedback. */
  async function refresh() {
    if (client.isMutating({ mutationKey })) return;
    feedback.clear();
    const result = await account.refetch({ cancelRefetch: false });
    if (!session.isCurrent(session.generation)) return;
    if (result.isError) {
      if (result.data && (retainedDraft || !isAccessDenied(result.error)))
        feedback.error();
      return;
    }
    if (client.isMutating({ mutationKey }) || !result.data?.hasPhoto) return;
    const currentPhotoKey = getSessionQueryKey(
      session.generation,
      getGetAccountPhotoQueryKey(result.data.accountId),
    );
    await client.refetchQueries({
      queryKey: currentPhotoKey,
      exact: true,
      type: "active",
    });
    const photo = client.getQueryState(currentPhotoKey);
    if (
      session.isCurrent(session.generation) &&
      photo?.status === "error" &&
      photo.dataUpdatedAt > 0
    )
      feedback.error();
  }

  return { saving, refreshing, refresh };
}
