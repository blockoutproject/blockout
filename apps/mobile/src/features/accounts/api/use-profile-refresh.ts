import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import {
  getChangeAccountProfileMutationKey,
  getGetAccountPhotoQueryKey,
} from "../../../../.generated/mobile";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import type { useCurrentAccount } from "./use-current-account";

/** Shares profile/photo refresh; retainedDraft keeps refusal feedback with the locked editor instead of a blocking overview card. */
export function useProfileRefresh(
  account: ReturnType<typeof useCurrentAccount>,
  retainedDraft = false,
) {
  const client = useQueryClient();
  const feedback = useActionFeedback();
  const mutationKey = getChangeAccountProfileMutationKey();
  const saving = useIsMutating({ mutationKey }) > 0;

  /** Refreshes the current account then its active photo; retained-data failures use the existing action feedback. */
  async function refresh() {
    if (client.isMutating({ mutationKey })) {
      return;
    }
    feedback.clear();
    const result = await account.refetch({ cancelRefetch: false });
    if (result.isError) {
      if (result.data && (retainedDraft || !isAccessDenied(result.error))) {
        feedback.error();
      }
      return;
    }
    if (client.isMutating({ mutationKey }) || !result.data?.hasPhoto) {
      return;
    }
    const currentPhotoKey = getGetAccountPhotoQueryKey(result.data.accountId);
    await client.refetchQueries({
      queryKey: currentPhotoKey,
      exact: true,
      type: "active",
    });
    const photo = client.getQueryState(currentPhotoKey);
    if (photo?.status === "error" && photo.dataUpdatedAt > 0) {
      feedback.error();
    }
  }

  return { saving, refresh };
}
