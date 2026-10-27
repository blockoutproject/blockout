import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { markNotificationRead } from "../../../../.generated/mobile";
import type { NotificationResponse } from "../../../../.generated/schemas/index.zod";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { notificationExpiry } from "../state/inbox-expiry";
import {
  refreshInbox,
  type InboxOwner,
  type InboxData,
  type createInboxQueries,
} from "./inbox-queries";

/**
 * Sends one explicit true-only intent independently of navigation. A lost acknowledgement permits
 * one current member GET, never another PATCH. Confirmation updates retained rows only, cancels old
 * reads and invalidates the whole summary; there is no optimistic counter or durable read record.
 */
export function createReadNotificationOptions(
  client: QueryClient,
  owner: InboxOwner,
  queries: ReturnType<typeof createInboxQueries>,
) {
  const accountId = owner.accountId;
  if (!accountId) throw new ApiError("cancelled");

  /** Stops all older representations before a confirmation/removal can supersede them. */
  async function cancelReads(id: string) {
    await Promise.all([
      client.cancelQueries({ queryKey: queries.inbox.queryKey, exact: true }),
      client.cancelQueries({ queryKey: queries.summary.queryKey, exact: true }),
      client.cancelQueries({
        queryKey: queries.detail(id).queryKey,
        exact: true,
      }),
    ]);
  }

  /** Removes stale rows, or publishes monotone true without inserting an absent entry. */
  async function reconcile(id: string, confirmed?: NotificationResponse) {
    await cancelReads(id);
    if (!owner.isCurrent(owner.generation)) return;
    const retained = confirmed && notificationExpiry(confirmed) > Date.now();
    client.setQueryData<InboxData>(
      queries.inbox.queryKey,
      (current) =>
        current && {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            notifications: page.notifications.flatMap((row) =>
              row.id !== id
                ? [row]
                : retained
                  ? [{ ...confirmed, read: true }]
                  : [],
            ),
          })),
        },
    );
    if (retained)
      client.setQueryData(queries.detail(id).queryKey, {
        ...confirmed,
        read: true,
      });
    else
      client.removeQueries({
        queryKey: queries.detail(id).queryKey,
        exact: true,
      });
    client
      .getQueryCache()
      .find({ queryKey: queries.summary.queryKey, exact: true })
      ?.setState({ data: undefined, dataUpdatedAt: 0 });
    // Native active observers perform ordinary refresh; failure keeps authorized inbox pages.
    void client.invalidateQueries({
      queryKey: queries.inbox.queryKey,
      exact: true,
      refetchType: "none",
    });
    if (
      client
        .getQueryCache()
        .find({ queryKey: queries.inbox.queryKey, exact: true })
        ?.isActive()
    )
      void refreshInbox(client, queries).catch(() => undefined);
    void client.invalidateQueries({
      queryKey: queries.summary.queryKey,
      exact: true,
    });
  }

  return mutationOptions({
    mutationKey: [...queries.inbox.queryKey, "read"],
    retry: false,
    mutationFn: async (id: string) => {
      await cancelReads(id);
      try {
        return await markNotificationRead(
          accountId,
          id,
          { read: true },
          await queries.request(),
        );
      } catch (error) {
        if (!owner.isCurrent(owner.generation)) throw new ApiError("cancelled");
        if (error instanceof ApiError && error.status === 404) {
          await reconcile(id);
          throw error;
        }
        if (!isUncertainMutationFailure(error)) throw error;
        try {
          const current = await client.fetchQuery(queries.detail(id));
          if (current.read) return current;
        } catch (observation) {
          if (observation instanceof ApiError && observation.status === 404)
            await reconcile(id);
        }
        throw error;
      }
    },
    onSuccess: (confirmed, id) => reconcile(id, confirmed),
  });
}
