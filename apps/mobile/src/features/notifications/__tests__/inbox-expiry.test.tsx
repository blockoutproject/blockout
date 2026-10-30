import { createQueryClient } from "../../../shared/query/query-client";
import { createInboxQueries } from "../api/inbox-queries";
import {
  expireInbox,
  confirmedUnreadCount,
  notificationExpiry,
} from "../state/inbox-expiry";
import { notificationResponse } from "../test-support/notification-data";

const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
let client = createQueryClient();

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-10-27T12:00:00Z") });
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  client = createQueryClient();
  mockFetch.mockReset();
});
afterEach(async () => {
  client.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("invalidates seven unread when an unloaded entry expires without manufacturing a partial total", async () => {
  // Given
  const owner = {
    subject: "auth0|owner",
    accountId: notificationResponse().id,
  };
  const queries = createInboxQueries(owner, async (signal?: AbortSignal) => ({
    signal,
  }));
  const row = notificationResponse();
  client.setQueryData(queries.inbox.queryKey, {
    pages: [
      {
        notifications: [
          row,
          { ...row, id: "00000000-0000-4000-8000-000000000238" },
        ],
      },
    ],
    pageParams: [undefined],
  });
  const summary = {
    unreadCount: 7,
    nextExpiryAt: new Date(Date.now() + 1).toISOString(),
  };
  client.setQueryData(queries.summary.queryKey, summary);
  expect(confirmedUnreadCount(summary)).toBe(7);

  // When
  jest.advanceTimersByTime(1);
  await expireInbox(client, queries);

  // Then
  expect(
    confirmedUnreadCount(client.getQueryData(queries.summary.queryKey)),
  ).toBeUndefined();
  expect(
    client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
  ).toHaveLength(2);
  expect(confirmedUnreadCount({ unreadCount: 0 })).toBe(0);
});

it.each(["2026-03-08T07:00:00Z", "2026-10-25T01:00:00Z"])(
  "filters exactly 29 elapsed days through DST at %s before admitting incoming rows",
  async (createdAt) => {
    // Given
    const row = { ...notificationResponse(), createdAt };
    const owner = { subject: "auth0|owner", accountId: row.id };
    const queries = createInboxQueries(owner, async () => ({}));
    jest.setSystemTime(notificationExpiry(row) - 1);
    mockFetch.mockResolvedValueOnce(Response.json({ notifications: [row] }));
    expect(
      (await client.fetchInfiniteQuery(queries.inbox)).pages[0].notifications,
    ).toHaveLength(1);

    // When
    jest.setSystemTime(notificationExpiry(row));
    await expireInbox(client, queries);
    mockFetch.mockResolvedValueOnce(Response.json({ notifications: [row] }));
    await client.fetchInfiniteQuery(queries.inbox);

    // Then
    expect(
      client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
    ).toEqual([]);
  },
);
