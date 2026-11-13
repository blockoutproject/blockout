import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { markNotificationRead } from "../../../../.generated/mobile";
import { ApiError } from "@/shared/api/api-fetch";
import {
  refuseInboxAccess,
  type InboxOwner,
  type InboxData,
  type InboxQueries,
} from "./inbox-queries";

/** Sends true-only read intent; ordinary invalidation refreshes the representation without delaying the tap's outcome. */
export function createReadNotificationOptions(
  client: QueryClient,
  owner: InboxOwner,
  queries: InboxQueries,
) {
  const accountId = owner.accountId;
  if (!accountId) {
    throw new ApiError("cancelled");
  }
  return mutationOptions({
    mutationKey: [...queries.inbox.queryKey, "read"],
    retry: false,
    mutationFn: async (id: string) =>
      markNotificationRead(
        accountId,
        id,
        { read: true },
        await queries.request(),
      ),
    onError: async (error, id) => {
      // A known removed personal entry must leave the local copy, independently of read-flag freshness.
      if (error instanceof ApiError && error.status === 404) {
        await client.cancelQueries({
          queryKey: queries.inbox.queryKey,
          exact: true,
        });
        const query = client.getQueryCache().find<InboxData>({
          queryKey: queries.inbox.queryKey,
          exact: true,
        });
        const current = query?.state.data;
        if (current) {
          query.setState({
            data: {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                notifications: page.notifications.filter(
                  (row) => row.id !== id,
                ),
              })),
            },
          });
        }
        return;
      }
      refuseInboxAccess(client, owner, error);
    },
    onSettled: () => {
      void client.invalidateQueries({
        queryKey: queries.inbox.queryKey,
        exact: true,
      });
    },
  });
}
