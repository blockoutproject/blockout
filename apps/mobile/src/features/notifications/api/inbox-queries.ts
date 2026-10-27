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

/** Captured F05 session; private requests retain their original account and generation. */
export type InboxOwner = SessionSnapshot &
  NonNullable<ApiFetchOptions["session"]>;
/** Prepares credentials and current ordinary admission immediately before each request. */
export type InboxRequest = (signal?: AbortSignal) => Promise<ApiFetchOptions>;
/** Native infinite-query data; there is no second inbox store or read journal. */
export type InboxData = InfiniteData<NotificationsResponse, string | undefined>;

/** Rejects cancelled/obsolete completions even when credential acquisition or native cancellation loses a race. */
function assertCurrent(owner: InboxOwner, signal?: AbortSignal) {
  if (!owner.isCurrent(owner.generation) || signal?.aborted)
    throw new ApiError("cancelled");
}

/**
 * Defines current owner reads with generated validation and ordinary native first-page refresh.
 * Incoming rows retain a cached true state, and local age always applies before cache admission.
 * Cancelling older reads at confirmation/removal prevents them from restoring superseded decisions.
 */
export function createInboxQueries(owner: InboxOwner, request: InboxRequest) {
  const keys = getNotificationKeys(owner);
  const accountId = owner.accountId;
  if (!accountId) throw new ApiError("cancelled");

  /** Credentials/admission are prepared afresh; the captured business owner never changes. */
  async function currentRequest(signal?: AbortSignal) {
    assertCurrent(owner, signal);
    const options = await request(signal);
    assertCurrent(owner, signal);
    return { ...options, session: owner, signal: options.signal ?? signal };
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
          assertCurrent(owner, signal);
          const retained =
            client
              .getQueryData<InboxData>(keys.inbox)
              ?.pages.flatMap((p) => p.notifications) ?? [];
          return {
            ...page,
            notifications: page.notifications
              .filter((row) => notificationExpiry(row) > Date.now())
              .map((row) =>
                retained.some((known) => known.id === row.id && known.read)
                  ? { ...row, read: true }
                  : row,
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
          assertCurrent(owner, signal);
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
    /** One bounded current member observation can resolve a lost true-only acknowledgement. */
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
          assertCurrent(owner, signal);
          if (notificationExpiry(row) <= Date.now())
            throw new ApiError("http", 404);
          return row;
        },
      }),
  };
}

/** Restarts at newest with one native Query fetch; failed refresh may retain cached pages, while the view displays its error card. */
export async function refreshInbox(
  client: QueryClient,
  queries: ReturnType<typeof createInboxQueries>,
) {
  await client.cancelQueries({ queryKey: queries.inbox.queryKey, exact: true });
  return client.fetchInfiniteQuery({
    ...queries.inbox,
    staleTime: 0,
    pages: 1,
  });
}

/** Cancels an older summary before a new ordinary synchronization can replace the exact count. */
export async function refreshNotificationSummary(
  client: QueryClient,
  queries: ReturnType<typeof createInboxQueries>,
) {
  await client.cancelQueries({
    queryKey: queries.summary.queryKey,
    exact: true,
  });
  return client.fetchQuery({ ...queries.summary, staleTime: 0 });
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
    !owner.isCurrent(owner.generation) ||
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
