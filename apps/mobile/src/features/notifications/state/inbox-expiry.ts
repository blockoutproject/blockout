import type { QueryClient } from "@tanstack/react-query";
import type { NotificationResponse } from "../../../../.generated/schemas/index.zod";
import type { InboxData, InboxQueries } from "../api/inbox-queries";

/** Original UTC creation controls retention; local calendar days never enter the calculation. */
export function notificationExpiry(row: NotificationResponse) {
  return Date.parse(row.createdAt) + 29 * 24 * 60 * 60 * 1000;
}

/** Filters loaded content at ordinary inbox events; an unchanged page has no expiry timer. */
export function expireInbox(client: QueryClient, queries: InboxQueries) {
  const query = client.getQueryCache().find<InboxData>({
    queryKey: queries.inbox.queryKey,
    exact: true,
  });
  const current = query?.state.data;
  if (
    query &&
    current?.pages.some((page) =>
      page.notifications.some((row) => notificationExpiry(row) <= Date.now()),
    )
  ) {
    // Cancel first so Query reverts its pending snapshot before the data-only cutoff update.
    void client.cancelQueries({ queryKey: query.queryKey, exact: true });
    const data = query.state.data;
    if (!data) {
      return;
    }
    query.setState({
      data: {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          notifications: page.notifications.filter(
            (row) => notificationExpiry(row) > Date.now(),
          ),
        })),
      },
    });
  }
}
