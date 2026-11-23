import {
  infiniteQueryOptions,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { listNotifications } from "../../../../.generated/mobile";
import type { NotificationsResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError, type ApiFetchOptions } from "@/shared/api/api-fetch";
import { isResourceReadRefused } from "@/shared/api/access-denied";
import { withdrawCachedRead } from "@/shared/api/withdraw-cached-read";
import type { SessionSnapshot } from "@/features/accounts";
import { expireInbox, notificationExpiry } from "../state/inbox-expiry";
import { getNotificationKeys } from "./notification-keys";

/** Captured F05 session; private requests retain their original account. */
export type InboxOwner = SessionSnapshot;

/** Prepares credentials and current ordinary admission immediately before each request. */
export type InboxRequest = (signal?: AbortSignal) => Promise<ApiFetchOptions>;

/** Native infinite-query data; there is no second inbox store or read journal. */
export type InboxData = InfiniteData<NotificationsResponse, string | undefined>;

/** Query owns the inbox list and original-owner request contracts. */
export type InboxQueries = ReturnType<typeof createInboxQueries>;

/** Honors native Query cancellation around credential acquisition and response handling. */
function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new ApiError("cancelled");
  }
}

/**
 * Defines current owner reads with generated validation and native retained-page refresh.
 * Local age applies before cache admission; read status follows the current server response.
 */
export function createInboxQueries(owner: InboxOwner, request: InboxRequest) {
  const keys = getNotificationKeys(owner);
  const accountId = owner.accountId;
  if (!accountId) {
    throw new ApiError("cancelled");
  }

  /** Credentials/admission are prepared afresh; the captured business owner never changes. */
  async function currentRequest(signal?: AbortSignal) {
    assertNotAborted(signal);
    const options = await request(signal);
    assertNotAborted(signal);
    return { ...options, signal: options.signal ?? signal };
  }

  return {
    request: currentRequest,
    inbox: infiniteQueryOptions({
      queryKey: keys.inbox,
      staleTime: 0,
      initialPageParam: undefined as string | undefined,
      queryFn: async ({
        signal,
        pageParam,
        client,
        queryKey,
      }): Promise<NotificationsResponse> => {
        try {
          const page = await listNotifications(
            accountId,
            { cursor: pageParam },
            await currentRequest(signal),
          );
          assertNotAborted(signal);
          return {
            ...page,
            notifications: page.notifications.filter(
              (row) => notificationExpiry(row) > Date.now(),
            ),
          };
        } catch (error) {
          if (!signal.aborted) {
            refuseInboxAccess(client, queryKey, error, "reader");
          }
          throw error;
        }
      },
      getNextPageParam: (page) => page.nextCursor,
    }),
  };
}

/** Passive events only refresh an admitted inbox with retained pages, after applying the age cutoff. */
export function refreshRetainedInbox(
  client: QueryClient,
  queries: InboxQueries | undefined,
) {
  if (!queries || !client.getQueryData(queries.inbox.queryKey)) {
    return;
  }
  expireInbox(client, queries);
  void client.refetchQueries({ queryKey: queries.inbox.queryKey, exact: true });
}

/**
 * An external refusal cancels the pending list read before withdrawing the inbox.
 * A refusal from the list reader leaves that request to finish through Query's error handling.
 */
export function refuseInboxAccess(
  client: QueryClient,
  queryKey: QueryKey,
  error: unknown,
  source: "reader" | "external",
) {
  if (!isResourceReadRefused(error)) {
    return;
  }
  const filters = { queryKey, exact: true };
  if (source === "external") {
    void client.cancelQueries(filters);
  }
  const query = client.getQueryCache().find(filters);
  if (query) {
    withdrawCachedRead(query, error);
  }
}
