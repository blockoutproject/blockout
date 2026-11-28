import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import {
  getChangeAccountProfileMutationKey,
  getGetAccountPhotoQueryKey,
} from "../../../../.generated/mobile";
import type { useCurrentAccount } from "./use-current-account";

/** Shares the existing account/photo gesture; required reads own their card and optional photo failure adds no notice. */
export function useProfileRefresh(
  account: ReturnType<typeof useCurrentAccount>,
) {
  const client = useQueryClient();
  const mutationKey = getChangeAccountProfileMutationKey();
  const saving = useIsMutating({ mutationKey }) > 0;

  /** Rereads the account then its active optional photo; neither read alters a mounted draft or repeats a save. */
  async function refresh() {
    if (client.isMutating({ mutationKey })) {
      return;
    }
    const result = await account.refetch({ cancelRefetch: false });
    if (result.isError) {
      return;
    }
    if (client.isMutating({ mutationKey }) || !result.data?.hasPhoto) {
      return;
    }
    await client.refetchQueries({
      queryKey: getGetAccountPhotoQueryKey(result.data.accountId),
      exact: true,
      type: "active",
    });
  }

  return { saving, refresh };
}
