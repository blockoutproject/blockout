import {
  infiniteQueryOptions,
  hashKey,
  queryOptions,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  listNotifications,
  getNotificationSummary,
  getNotification,
} from "../../../../.generated/mobile";
import type {
  NotificationResponse,
  NotificationsResponse,
} from "../../../../.generated/schemas/index.zod";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
import { isAccessDenied } from "../../../shared/api/access-denied";
import type { SessionSnapshot } from "../../accounts";
import {
  confirmedUnreadCount,
  notificationExpiry,
} from "../state/inbox-expiry";
import { getNotificationKeys } from "./notification-keys";
/** Captured F05 session; private requests retain their original account. */
export type InboxOwner = SessionSnapshot;
/** Prepares credentials and current ordinary admission immediately before each request. */
export type InboxRequest = (signal?: AbortSignal) => Promise<ApiFetchOptions>;
/** Native infinite-query data; there is no second inbox store or read journal. */
export type InboxData = InfiniteData<NotificationsResponse, string | undefined>;
/** Honors native Query cancellation around credential acquisition and response handling. */
function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new ApiError("cancelled");
}
/**
 * Defines current owner reads with generated validation and native retained-page refresh.
 * Local age applies before cache admission; read status follows the current server response.
 */
export function createInboxQueries(owner: InboxOwner, request: InboxRequest) {
  const keys = getNotificationKeys(owner);
  const accountId = owner.accountId;
  if (!accountId) throw new ApiError("cancelled");
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
          if (!signal.aborted)
            refuseInboxAccess(client, owner, error, keys.inbox);
          throw error;
        }
      },
      getNextPageParam: (page) => page.nextCursor,
    }),
    summary: queryOptions({
      queryKey: keys.summary,
      staleTime: 0,
      queryFn: async ({ signal, client }) => {
        try {
          const summary = await getNotificationSummary(
            accountId,
            await currentRequest(signal),
          );
          assertNotAborted(signal);
          if (confirmedUnreadCount(summary) === undefined)
            throw new ApiError("cancelled");
          return summary;
        } catch (error) {
          if (!signal.aborted)
            refuseInboxAccess(client, owner, error, keys.summary);
          throw error;
        }
      },
    }),
    /** Reads an original current entry for notification navigation; age and owner rules still apply. */
    detail: (id: string) =>
      queryOptions({
        queryKey: keys.detail(id),
        staleTime: 0,
        gcTime: 0,
        queryFn: async ({ signal }): Promise<NotificationResponse> => {
          const row = await getNotification(
            accountId,
            id,
            await currentRequest(signal),
          );
          assertNotAborted(signal);
          if (notificationExpiry(row) <= Date.now())
            throw new ApiError("http", 404);
          return row;
        },
      }),
  };
}
/** Refetches retained pages natively; failures preserve authorized content and reach explicit refresh feedback. */
export function refreshInbox(
  client: QueryClient,
  queries: ReturnType<typeof createInboxQueries>,
) {
  return client.refetchQueries(
    { queryKey: queries.inbox.queryKey, exact: true },
    { throwOnError: true },
  );
}
/** Refetches the native summary while preserving ordinary stale data on technical failure. */
export function refreshNotificationSummary(
  client: QueryClient,
  queries: ReturnType<typeof createInboxQueries>,
) {
  return client.refetchQueries(
    { queryKey: queries.summary.queryKey, exact: true },
    { throwOnError: true },
  );
}
/**
 * Applies a known current owner refusal or missing owner across private list/count observers. Older reads are
 * cancelled; both representations enter ordinary error state so an initial read can be retried.
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
  )
    return;
  const keys = getNotificationKeys(owner);
  for (const queryKey of [keys.inbox, keys.summary]) {
    if (!failingKey || hashKey(failingKey) !== hashKey(queryKey))
      void client.cancelQueries({ queryKey, exact: true });
    client.getQueryCache().find({ queryKey, exact: true })?.setState({
      data: undefined,
      dataUpdatedAt: 0,
      error,
      errorUpdatedAt: Date.now(),
      status: "error",
      fetchStatus: "idle",
    });
  }
}
