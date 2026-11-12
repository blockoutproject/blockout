import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import {
  getChangeAccountProfileMutationKey,
  getGetAccountPhotoQueryKey,
} from "../../../../.generated/mobile";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import type { useCurrentAccount } from "./use-current-account";

/** Shares profile/photo refresh; required-read errors belong to the card, while optional-photo failures retain local feedback. */
export function useProfileRefresh(
  account: ReturnType<typeof useCurrentAccount>,
  retainedDraft = false,
) {
  const client = useQueryClient();
  const feedback = useActionFeedback();
  const mutationKey = getChangeAccountProfileMutationKey();
  const saving = useIsMutating({ mutationKey }) > 0;

  /** Refreshes the account then its active optional photo, without a toast competing with required-read recovery. */
  async function refresh() {
    if (client.isMutating({ mutationKey })) {
      return;
    }
    feedback.clear();
    const result = await account.refetch({ cancelRefetch: false });
    if (result.isError) {
      return;
    }
    if (client.isMutating({ mutationKey }) || !result.data?.hasPhoto) {
      return;
    }
    const currentPhotoKey = getGetAccountPhotoQueryKey(result.data.accountId);
    if (
      !client
        .getQueryCache()
        .find({ queryKey: currentPhotoKey, exact: true, type: "active" })
    ) {
      return;
    }
    await client.refetchQueries({
      queryKey: currentPhotoKey,
      exact: true,
      type: "active",
    });
    const photo = client.getQueryState(currentPhotoKey);
    if (
      photo?.status === "error" &&
      (retainedDraft || photo.dataUpdatedAt > 0)
    ) {
      feedback.error();
    }
  }

  return { saving, refresh };
}
