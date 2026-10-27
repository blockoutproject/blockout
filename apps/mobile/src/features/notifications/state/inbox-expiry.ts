import type { QueryClient } from "@tanstack/react-query";
import type {
  NotificationResponse,
  NotificationSummaryResponse,
} from "../../../../.generated/schemas/index.zod";
import type { InboxData, createInboxQueries } from "../api/inbox-queries";

/** Original UTC creation controls retention; local calendar days never enter the calculation. */
export function notificationExpiry(row: NotificationResponse) {
  return Date.parse(row.createdAt) + 29 * 24 * 60 * 60 * 1000;
}

/** Undefined means no provable exact total; zero is a confirmed empty unread set. */
export function confirmedUnreadCount(
  summary: NotificationSummaryResponse | undefined,
): number | undefined {
  if (
    !summary ||
    (summary.unreadCount > 0 &&
      (!summary.nextExpiryAt || Date.parse(summary.nextExpiryAt) <= Date.now()))
  )
    return undefined;
  return summary.unreadCount;
}

/** Removes expired loaded content and invalidates a whole-inbox total without subtracting loaded rows. */
export async function expireInbox(
  client: QueryClient,
  queries: ReturnType<typeof createInboxQueries>,
) {
  const current = client.getQueryData<InboxData>(queries.inbox.queryKey);
  if (
    current?.pages.some((page) =>
      page.notifications.some((row) => notificationExpiry(row) <= Date.now()),
    )
  ) {
    void client.cancelQueries({
      queryKey: queries.inbox.queryKey,
      exact: true,
    });
    client.setQueryData<InboxData>(
      queries.inbox.queryKey,
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            notifications: page.notifications.filter(
              (row) => notificationExpiry(row) > Date.now(),
            ),
          })),
        },
    );
  }
  const summary = client.getQueryData(queries.summary.queryKey);
  if (summary && confirmedUnreadCount(summary) === undefined) {
    void client.cancelQueries({
      queryKey: queries.summary.queryKey,
      exact: true,
    });
    client
      .getQueryCache()
      .find({ queryKey: queries.summary.queryKey, exact: true })
      ?.setState({ data: undefined, dataUpdatedAt: 0 });
    void client.invalidateQueries({
      queryKey: queries.summary.queryKey,
      exact: true,
      refetchType: "none",
    });
  }
}
