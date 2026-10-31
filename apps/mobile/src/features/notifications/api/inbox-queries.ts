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
import { subscribeMatchAccess } from "../../sporting/match-access";
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
      meta: { notificationResource: "inbox" },
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
      meta: { notificationResource: "summary" },
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
        meta: { notificationResource: "detail" },
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
 * Connects current F03 refusals for the original F05 client's entire lifetime, including periods
 * with suspended private reads. Query metadata identifies existing resources, without retaining
 * restrictions or account state. Native cancellation discards older responses; only a fresh
 * authorized inbox read may restore a row. Whole counts become unknown, never page-derived.
 * Known link absence removes stale link wording locally while preserving results and counts;
 * a fresh F07 read supplies the next complete editorial text.
 * @returns cleanup when this original private client is detached
 */
export function subscribeInboxVisibility(client: QueryClient) {
  return subscribeMatchAccess(client, (matchId, outcome) => {
    // A pending member response has no known match yet; discard these transient reads in this
    // private client as well, including details outside the loaded inbox pages.
    client.removeQueries({
      predicate: (query) => query.meta?.notificationResource === "detail",
    });
    for (const query of client.getQueryCache().findAll()) {
      const resource = query.meta?.notificationResource;
      if (resource !== "inbox" && resource !== "summary") continue;
      if (resource === "summary" && outcome === "link-unavailable") continue;
      const filter = { queryKey: query.queryKey, exact: true };
      void client.cancelQueries(filter);
      if (resource === "summary")
        query.setState({ data: undefined, dataUpdatedAt: 0 });
      else
        client.setQueryData<InboxData>(
          query.queryKey,
          (data) =>
            data && {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                notifications: page.notifications.flatMap((row) => {
                  if (row.match.id !== matchId) return [row];
                  if (outcome === "unavailable") return [];
                  if (row.family === "result") return [row];
                  // Use only F07's existing absence copy until its next current response.
                  return [{ ...row, title: "Le lien n’est plus proposé." }];
                }),
              })),
            },
        );
      void client.invalidateQueries({ ...filter, refetchType: "none" });
    }
  });
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
