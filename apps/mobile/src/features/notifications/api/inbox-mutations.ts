import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { markNotificationRead } from "../../../../.generated/mobile";
import { ApiError } from "../../../shared/api/api-fetch";
import {
  refuseInboxAccess,
  type InboxOwner,
  type InboxData,
  type createInboxQueries,
} from "./inbox-queries";
/** Sends true-only read intent; ordinary invalidation establishes the next server representation. */
export function createReadNotificationOptions(
  client: QueryClient,
  owner: InboxOwner,
  queries: ReturnType<typeof createInboxQueries>,
) {
  const accountId = owner.accountId;
  if (!accountId) throw new ApiError("cancelled");
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
        await Promise.all([
          client.cancelQueries({
            queryKey: queries.inbox.queryKey,
            exact: true,
          }),
          client.cancelQueries({
            queryKey: queries.summary.queryKey,
            exact: true,
          }),
        ]);
        client.setQueryData<InboxData>(
          queries.inbox.queryKey,
          (current) =>
            current && {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                notifications: page.notifications.filter(
                  (row) => row.id !== id,
                ),
              })),
            },
        );
        client.removeQueries({
          queryKey: queries.detail(id).queryKey,
          exact: true,
        });
        // A missing entry makes the old whole total unprovable, even if ordinary refetch is offline.
        client
          .getQueryCache()
          .find({ queryKey: queries.summary.queryKey, exact: true })
          ?.setState({ data: undefined, dataUpdatedAt: 0 });
        return;
      }
      refuseInboxAccess(client, owner, error);
    },
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({
          queryKey: queries.inbox.queryKey,
          exact: true,
        }),
        client.invalidateQueries({
          queryKey: queries.summary.queryKey,
          exact: true,
        }),
      ]),
  });
}
