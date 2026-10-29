import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getChangeAccountProfileMutationKey,
  getGetAccountPhotoQueryKey,
} from "../../../../.generated/mobile";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useAccountSession } from "../session/account-session-provider";
import type { useCurrentAccount } from "./use-current-account";

/** Shares profile/photo refresh between overview and editor without interrupting an active save or replacing a draft. */
export function useProfileRefresh(
  account: ReturnType<typeof useCurrentAccount>,
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
      if (result.data) feedback.error();
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
