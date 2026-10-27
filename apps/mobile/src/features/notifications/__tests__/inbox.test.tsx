import { InfiniteQueryObserver, MutationObserver } from "@tanstack/react-query";
import { createQueryClient } from "../../../shared/query/query-client";
import { createSessionGeneration } from "../../accounts";
import { createInboxQueries, refreshInbox } from "../api/inbox-queries";
import { createReadNotificationOptions } from "../api/inbox-mutations";
import { notificationResponse } from "../test-support/notification-data";

const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
let client = createQueryClient();
const row = notificationResponse();

/** Real Query/session/generated consumers; only HTTP and credentials are controlled. */
function context() {
  const generation = createSessionGeneration();
  generation.setAccount(generation.getSnapshot().generation, row.id);
  const owner = {
    ...generation.getSnapshot(),
    isCurrent: generation.isCurrent,
  };
  const queries = createInboxQueries(owner, async (signal?: AbortSignal) => ({
    signal,
    session: owner,
  }));
  return { owner, queries };
}

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

it("retains a failed continuation boundary and replaces traversal only after successful first-page refresh", async () => {
  // Given
  const { queries } = context();
  const second = { ...row, id: "00000000-0000-4000-8000-000000000239" };
  mockFetch.mockResolvedValueOnce(
    Response.json({ notifications: [row], nextCursor: "boundary" }),
  );
  const observer = new InfiniteQueryObserver(client, queries.inbox);
  await observer.refetch();
  mockFetch.mockRejectedValueOnce(new TypeError("offline"));

  // When
  await observer.fetchNextPage();

  // Then
  expect(observer.getCurrentResult().isFetchNextPageError).toBe(true);
  expect(observer.getCurrentResult().data?.pages[0].notifications).toEqual([
    row,
  ]);
  mockFetch.mockResolvedValueOnce(Response.json({ notifications: [second] }));
  await observer.fetchNextPage();
  expect(
    new URL(mockFetch.mock.calls.at(-1)[0]).searchParams.get("cursor"),
  ).toBe("boundary");
  expect(observer.getCurrentResult().data?.pages).toHaveLength(2);
  mockFetch.mockRejectedValueOnce(new TypeError("offline"));
  await refreshInbox(client, queries).catch(() => undefined);
  expect(client.getQueryData(queries.inbox.queryKey)?.pages).toHaveLength(2);
  mockFetch.mockResolvedValueOnce(Response.json({ notifications: [second] }));
  await refreshInbox(client, queries);
  expect(client.getQueryData(queries.inbox.queryKey)?.pages).toEqual([
    { notifications: [second] },
  ]);
});

it("cancels delayed unread pages around read confirmation without inferring an unread count", async () => {
  // Given
  const { owner, queries } = context();
  client.setQueryData(queries.inbox.queryKey, {
    pages: [{ notifications: [row] }],
    pageParams: [undefined],
  });
  client.setQueryData(queries.summary.queryKey, {
    unreadCount: 7,
    nextExpiryAt: "2026-10-28T12:00:00Z",
  });
  const delayed = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(delayed.promise);
  const stale = client.fetchInfiniteQuery(queries.inbox).catch(() => undefined);
  await jest.advanceTimersByTimeAsync(0);
  mockFetch.mockResolvedValueOnce(Response.json({ ...row, read: true }));
  const command = new MutationObserver(
    client,
    createReadNotificationOptions(client, owner, queries),
  );

  // When
  await command.mutate(row.id);
  delayed.resolve(Response.json({ notifications: [row] }));
  await stale;

  // Then
  expect(
    client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications[0].read,
  ).toBe(true);
  expect(client.getQueryState(queries.summary.queryKey)?.isInvalidated).toBe(
    true,
  );
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
  ).toHaveLength(1);
});

it("observes a lost acknowledgement once without replaying the write and never recreates a missing entry", async () => {
  // Given
  const { owner, queries } = context();
  client.setQueryData(queries.inbox.queryKey, {
    pages: [{ notifications: [row] }],
    pageParams: [undefined],
  });
  mockFetch.mockRejectedValueOnce(new TypeError("lost response"));
  mockFetch.mockResolvedValueOnce(Response.json({ ...row, read: true }));
  const command = new MutationObserver(
    client,
    createReadNotificationOptions(client, owner, queries),
  );

  // When
  await command.mutate(row.id);

  // Then
  expect(
    client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications[0].read,
  ).toBe(true);
  expect(mockFetch.mock.calls.map(([, init]) => init.method)).toEqual([
    "PATCH",
    "GET",
  ]);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
  await command.mutate(row.id).catch(() => undefined);
  expect(
    client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([]);
});

it("discards a cancelled old summary when a newer confirmed summary succeeds", async () => {
  // Given
  const { queries } = context();
  const delayed = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(delayed.promise);
  const old = client.fetchQuery(queries.summary).catch(() => undefined);
  await jest.advanceTimersByTimeAsync(0);

  // When
  await client.cancelQueries({
    queryKey: queries.summary.queryKey,
    exact: true,
  });
  mockFetch.mockResolvedValueOnce(Response.json({ unreadCount: 0 }));
  await client.fetchQuery(queries.summary);
  delayed.resolve(
    Response.json({ unreadCount: 7, nextExpiryAt: "2026-11-01T00:00:00Z" }),
  );
  await old;

  // Then
  expect(client.getQueryData(queries.summary.queryKey)).toEqual({
    unreadCount: 0,
  });
});

it("allows an explicit true-only repetition after an unconfirmed observation without automatic retry", async () => {
  // Given
  const { owner, queries } = context();
  mockFetch.mockRejectedValueOnce(new TypeError("lost response"));
  mockFetch.mockResolvedValueOnce(Response.json(row));
  const command = new MutationObserver(
    client,
    createReadNotificationOptions(client, owner, queries),
  );

  // When
  await expect(command.mutate(row.id)).rejects.toMatchObject({
    kind: "network",
  });
  await jest.advanceTimersByTimeAsync(1000);

  // Then
  expect(mockFetch.mock.calls.map(([, init]) => init.method)).toEqual([
    "PATCH",
    "GET",
  ]);
  mockFetch.mockResolvedValueOnce(Response.json({ ...row, read: true }));
  await command.mutate(row.id);
  expect(mockFetch.mock.calls.map(([, init]) => init.method)).toEqual([
    "PATCH",
    "GET",
    "PATCH",
  ]);
});

it("does not restore a known missing row from an older page", async () => {
  // Given
  const { owner, queries } = context();
  client.setQueryData(queries.inbox.queryKey, {
    pages: [{ notifications: [row] }],
    pageParams: [undefined],
  });
  const delayed = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(delayed.promise);
  const old = client.fetchInfiniteQuery(queries.inbox).catch(() => undefined);
  await jest.advanceTimersByTimeAsync(0);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
  const command = new MutationObserver(
    client,
    createReadNotificationOptions(client, owner, queries),
  );

  // When
  await command.mutate(row.id).catch(() => undefined);
  delayed.resolve(Response.json({ notifications: [row] }));
  await old;

  // Then
  expect(
    client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([]);
});

it("does not restore a badge from a delayed summary after a current owner refusal", async () => {
  // Given
  const { queries } = context();
  const delayed = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(delayed.promise);
  const old = client.fetchQuery(queries.summary).catch(() => undefined);
  await jest.advanceTimersByTimeAsync(0);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 403 }));

  // When
  await client.fetchInfiniteQuery(queries.inbox).catch(() => undefined);
  delayed.resolve(
    Response.json({ unreadCount: 7, nextExpiryAt: "2026-11-01T00:00:00Z" }),
  );
  await old;

  // Then
  expect(client.getQueryData(queries.summary.queryKey)).toBeUndefined();
});
