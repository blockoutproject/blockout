import { getSessionQueryKey } from "../../../shared/query/query-client";
import {
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useEffectEvent, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import { useInboxQueries } from "../api/use-inbox-queries";
import {
  refreshInbox,
  refreshNotificationSummary,
  type createInboxQueries,
} from "../api/inbox-queries";
import { useNotificationBadge } from "../native/notification-badge";
import {
  confirmedUnreadCount,
  expireInbox,
  notificationExpiry,
} from "./inbox-expiry";

/** Mounts current private synchronization under ordinary access, with no secondary cache or session owner. */
export function NotificationState({ children }: PropsWithChildren) {
  const { session, queries } = useInboxQueries();
  // Disabled observations still rerender for timer/cache decisions without starting private requests for guests.
  const summary = useQuery(
    queries?.summary ??
      queryOptions({
        queryKey: getSessionQueryKey(session.generation, [
          "notification-summary-unavailable",
        ]),
        enabled: false,
        queryFn: async () => ({ unreadCount: 0 }),
      }),
  );
  useNotificationBadge(
    session,
    queries ? confirmedUnreadCount(summary.data) : undefined,
  );
  return (
    <>
      {queries && (
        <InboxExpiry
          key={`${session.generation}:${session.accountId}`}
          queries={queries}
        />
      )}
      {children}
    </>
  );
}

/** One ordinary timeout follows the earliest loaded or summary expiry; resume checks age before refresh. */
function InboxExpiry({
  queries,
}: {
  queries: ReturnType<typeof createInboxQueries>;
}) {
  const client = useQueryClient();
  const inbox = useInfiniteQuery({ ...queries.inbox, enabled: false });
  const summary = useQuery({ ...queries.summary, enabled: false });
  const expiries =
    inbox.data?.pages.flatMap((page) =>
      page.notifications.map(notificationExpiry),
    ) ?? [];
  if (summary.data?.nextExpiryAt)
    expiries.push(Date.parse(summary.data.nextExpiryAt));
  const nextExpiry = expiries.length ? Math.min(...expiries) : undefined;
  const expire = useEffectEvent(() => expireInbox(client, queries));
  const refresh = useEffectEvent(async () => {
    await expire();
    await Promise.allSettled([
      // No inbox request is needed before the person ever opens its screen.
      client.getQueryData(queries.inbox.queryKey)
        ? refreshInbox(client, queries)
        : Promise.resolve(),
      refreshNotificationSummary(client, queries),
    ]);
  });
  const onExpiry = useEffectEvent(async () => {
    await expire();
    await client.fetchQuery(queries.summary).catch(() => undefined);
  });
  useEffect(() => {
    if (nextExpiry === undefined) return;
    const timer = setTimeout(
      () => {
        void onExpiry();
      },
      Math.max(0, Math.min(nextExpiry - Date.now(), 2_147_483_647)),
    );
    return () => clearTimeout(timer);
  }, [nextExpiry, client]);
  useEffect(() => {
    void expire();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => listener.remove();
  }, []);
  return null;
}
