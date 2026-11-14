import {
  infiniteQueryOptions,
  hashKey,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { listNotifications } from "../../../../.generated/mobile";
import type { NotificationsResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError, type ApiFetchOptions } from "@/shared/api/api-fetch";
import { isAccessDenied } from "@/shared/api/access-denied";
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
            refuseInboxAccess(client, owner, error, keys.inbox);
          }
          throw error;
        }
      },
      getNextPageParam: (page) => page.nextCursor,
    }),
  };
}

/** Filters retained ages before an ordinary native page refresh; Query owns its result and failure. */
export function refreshInbox(client: QueryClient, queries: InboxQueries) {
  expireInbox(client, queries);
  return client.refetchQueries(
    { queryKey: queries.inbox.queryKey, exact: true },
    { throwOnError: true },
  );
}

/**
 * Applies a known current owner refusal or missing owner to the private list. Older reads are
 * cancelled; the list enters ordinary error state so an initial read can be retried.
 * The failing query finishes its own native error transition when its key is supplied.
 */
export function refuseInboxAccess(
  client: QueryClient,
  owner: InboxOwner,
  error: unknown,
  failingKey?: QueryKey,
) {
  if (
    !(error instanceof ApiError) ||
    !(isAccessDenied(error) || error.status === 404)
  ) {
    return;
  }
  const keys = getNotificationKeys(owner);
  const queryKey = keys.inbox;
  if (!failingKey || hashKey(failingKey) !== hashKey(queryKey)) {
    void client.cancelQueries({ queryKey, exact: true });
  }
  client.getQueryCache().find({ queryKey, exact: true })?.setState({
    data: undefined,
    dataUpdatedAt: 0,
    error,
    errorUpdatedAt: Date.now(),
    status: "error",
    fetchStatus: "idle",
  });
}
