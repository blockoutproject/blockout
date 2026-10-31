import {
  InfiniteQueryObserver,
  MutationObserver,
  QueryObserver,
} from "@tanstack/react-query";
import { createQueryClient } from "../../../shared/query/query-client";
import { createInboxQueries, refreshInbox } from "../api/inbox-queries";
import { createReadNotificationOptions } from "../api/inbox-mutations";
import { notificationResponse } from "../test-support/notification-data";
import { confirmedUnreadCount, expireInbox } from "../state/inbox-expiry";

const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
let client = createQueryClient();
const row = notificationResponse();

/** Captured owner with real Query/generated consumers; only HTTP and credentials are controlled. */
function context() {
  const owner = { subject: "auth0|owner", accountId: row.id };
  const queries = createInboxQueries(owner, async (signal?: AbortSignal) => ({
    signal,
  }));
  return { owner, queries };
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-10-27T12:00:00Z") });
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  mockFetch.mockReset();
});

afterEach(async () => {
  client.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("retains a failed continuation boundary and refetches the loaded traversal natively", async () => {
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
  await expect(refreshInbox(client, queries)).rejects.toMatchObject({
    kind: "network",
  });
  expect(client.getQueryData(queries.inbox.queryKey)?.pages).toHaveLength(2);
  mockFetch
    .mockResolvedValueOnce(
      Response.json({
        notifications: [{ ...row, read: true }],
        nextCursor: "fresh-boundary",
      }),
    )
    .mockResolvedValueOnce(Response.json({ notifications: [second] }));
  const before = mockFetch.mock.calls.length;
  await refreshInbox(client, queries);
  expect(client.getQueryData(queries.inbox.queryKey)?.pages).toEqual([
    { notifications: [{ ...row, read: true }], nextCursor: "fresh-boundary" },
    { notifications: [second] },
  ]);
  expect(
    mockFetch.mock.calls
      .slice(before)
      .map(([url]) => new URL(url).searchParams.get("cursor")),
  ).toEqual([null, "fresh-boundary"]);
});

it("invalidates the inbox after a successful read without rewriting retained rows", async () => {
  // Given
  const { owner, queries } = context();
  client.setQueryData(queries.inbox.queryKey, {
    pages: [{ notifications: [row] }],
    pageParams: [undefined],
  });
  mockFetch.mockResolvedValueOnce(Response.json({ ...row, read: true }));
  const command = new MutationObserver(
    client,
    createReadNotificationOptions(client, owner, queries),
  );
  // When
  await command.mutate(row.id);
  // Then: the next ordinary read owns the representation, not a local monotone overlay.
  expect(
    client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications[0].read,
  ).toBe(false);
  expect(client.getQueryState(queries.inbox.queryKey)?.isInvalidated).toBe(
    true,
  );
  expect(mockFetch.mock.calls.map(([, init]) => init.method)).toEqual([
    "PATCH",
  ]);
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

it("reports a lost acknowledgement and permits a later explicit true-only attempt", async () => {
  // Given
  const { owner, queries } = context();
  mockFetch.mockRejectedValueOnce(new TypeError("lost response"));
  const command = new MutationObserver(
    client,
    createReadNotificationOptions(client, owner, queries),
  );
  // When
  await expect(command.mutate(row.id)).rejects.toMatchObject({
    kind: "network",
  });
  // Then
  expect(mockFetch.mock.calls.map(([, init]) => init.method)).toEqual([
    "PATCH",
  ]);
  // When
  mockFetch.mockResolvedValueOnce(Response.json({ ...row, read: true }));
  await command.mutate(row.id);
  // Then
  expect(mockFetch.mock.calls.map(([, init]) => init.method)).toEqual([
    "PATCH",
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
    client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications ?? [],
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

it.each([401, 403])(
  "removes retained private content and count when the read command receives %s",
  async (status) => {
    // Given
    const { owner, queries } = context();
    client.setQueryData(queries.inbox.queryKey, {
      pages: [{ notifications: [row] }],
      pageParams: [undefined],
    });
    client.setQueryData(queries.summary.queryKey, {
      unreadCount: 7,
      nextExpiryAt: "2026-11-01T00:00:00Z",
    });
    mockFetch.mockResolvedValueOnce(new Response(null, { status }));
    const command = new MutationObserver(
      client,
      createReadNotificationOptions(client, owner, queries),
    );

    // When
    await command.mutate(row.id).catch(() => undefined);

    // Then
    expect(client.getQueryData(queries.inbox.queryKey)).toBeUndefined();
    expect(client.getQueryData(queries.summary.queryKey)).toBeUndefined();
    expect(client.getQueryState(queries.inbox.queryKey)?.status).toBe("error");
  },
);

it("presents an initial list error when the summary refuses access during its pending first page", async () => {
  // Given
  const { queries } = context();
  const delayed = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(delayed.promise);
  const observer = new InfiniteQueryObserver(client, queries.inbox);
  const list = observer.refetch();
  await jest.advanceTimersByTimeAsync(0);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 403 }));

  // When
  await client.fetchQuery(queries.summary).catch(() => undefined);
  delayed.resolve(Response.json({ notifications: [row] }));
  await list;

  // Then
  expect(observer.getCurrentResult()).toMatchObject({
    status: "error",
    isFetching: false,
    data: undefined,
  });
});

it.each(["inbox", "summary"] as const)(
  "removes the original owner's retained data after a %s 404",
  async (resource) => {
    // Given
    const { queries } = context();
    client.setQueryData(queries.inbox.queryKey, {
      pages: [{ notifications: [row] }],
      pageParams: [undefined],
    });
    client.setQueryData(queries.summary.queryKey, {
      unreadCount: 7,
      nextExpiryAt: "2026-11-01T00:00:00Z",
    });
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

    // When
    await (
      resource === "inbox"
        ? client.fetchInfiniteQuery(queries.inbox)
        : client.fetchQuery(queries.summary)
    ).catch(() => undefined);

    // Then
    expect(client.getQueryData(queries.inbox.queryKey)).toBeUndefined();
    expect(client.getQueryData(queries.summary.queryKey)).toBeUndefined();
  },
);

it("keeps other notifications but invalidates the exact total when a member is missing and refresh fails", async () => {
  // Given
  const { owner, queries } = context();
  const survivor = { ...row, id: "00000000-0000-4000-8000-000000000239" };
  const summary = { unreadCount: 2, nextExpiryAt: "2026-11-01T00:00:00Z" };
  let initial = true;
  mockFetch.mockImplementation(async (url, init) => {
    if (init.method === "PATCH") return new Response(null, { status: 404 });
    if (!initial) throw new TypeError("offline during refresh");
    return String(url).endsWith("/notification-summary")
      ? Response.json(summary)
      : Response.json({ notifications: [row, survivor] });
  });
  const list = new InfiniteQueryObserver(client, queries.inbox);
  const count = new QueryObserver(client, queries.summary);
  const stopList = list.subscribe(() => undefined);
  const stopCount = count.subscribe(() => undefined);
  await Promise.all([list.refetch(), count.refetch()]);
  expect(
    client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
  ).toHaveLength(2);
  expect(client.getQueryData(queries.summary.queryKey)).toEqual(summary);
  const command = new MutationObserver(
    client,
    createReadNotificationOptions(client, owner, queries),
  );
  initial = false;
  try {
    // When
    await expect(command.mutate(row.id)).rejects.toMatchObject({ status: 404 });
    // Then
    expect(
      client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
    ).toEqual([survivor]);
    expect(client.getQueryData(queries.summary.queryKey)).toBeUndefined();
    expect(list.getCurrentResult().error).toMatchObject({ kind: "network" });
    expect(count.getCurrentResult().error).toMatchObject({ kind: "network" });
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
    ).toHaveLength(1);
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "GET"),
    ).toHaveLength(4);
  } finally {
    stopList();
    stopCount();
  }
});

it("discards a delayed whole summary after a missing-member refusal", async () => {
  // Given
  const { owner, queries } = context();
  client.setQueryData(queries.summary.queryKey, {
    unreadCount: 7,
    nextExpiryAt: "2026-11-01T00:00:00Z",
  });
  const delayed = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(delayed.promise);
  const oldSummary = client.fetchQuery(queries.summary).catch(() => undefined);
  await jest.advanceTimersByTimeAsync(0);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
  const command = new MutationObserver(
    client,
    createReadNotificationOptions(client, owner, queries),
  );

  // When
  await command.mutate(row.id).catch(() => undefined);
  delayed.resolve(
    Response.json({ unreadCount: 7, nextExpiryAt: "2026-11-01T00:00:00Z" }),
  );
  await oldSummary;

  // Then
  expect(client.getQueryData(queries.summary.queryKey)).toBeUndefined();
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
  ).toHaveLength(1);
});

it("reconciles independent clients after a lost read response and offline unloaded expiry without replay", async () => {
  // Given: two independent in-memory lifetimes, with the same account and controlled HTTP only.
  const { owner, queries } = context();
  const secondClient = createQueryClient();
  secondClient.setDefaultOptions({ queries: { retry: false } });
  const secondQueries = createInboxQueries(owner, async () => ({
    headers: { "Fixture-Client": "two" },
  }));
  let secondOffline = false;
  let read = false;
  let total = 7;
  let nextExpiryAt = new Date(Date.now() + 1000).toISOString();
  const second = { ...row, id: "00000000-0000-4000-8000-000000000239" };
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    if (
      secondOffline &&
      new Headers(init.headers).get("Fixture-Client") === "two"
    )
      throw new TypeError("offline second client");
    if (init.method === "PATCH") {
      if (!read) {
        read = true;
        total--;
      }
      throw new TypeError("lost read acknowledgement");
    }
    if (url.endsWith("notification-summary"))
      return Response.json({ unreadCount: total, nextExpiryAt });
    if (url.endsWith("/notifications"))
      return Response.json({ notifications: [{ ...row, read }, second] });
    throw new Error("No member reconciliation endpoint is expected");
  });
  const list = new InfiniteQueryObserver(client, queries.inbox);
  const count = new QueryObserver(client, queries.summary);
  const stopList = list.subscribe(() => undefined);
  const stopCount = count.subscribe(() => undefined);
  try {
    await Promise.all([
      list.refetch(),
      count.refetch(),
      secondClient.fetchInfiniteQuery(secondQueries.inbox),
      secondClient.fetchQuery(secondQueries.summary),
    ]);
    expect(
      secondClient.getQueryData(secondQueries.inbox.queryKey)?.pages[0]
        .notifications,
    ).toHaveLength(2);
    secondOffline = true;
    const command = new MutationObserver(
      client,
      createReadNotificationOptions(client, owner, queries),
    );

    // When
    await expect(command.mutate(row.id)).rejects.toMatchObject({
      kind: "network",
    });
    await expect(
      refreshInbox(secondClient, secondQueries),
    ).rejects.toMatchObject({ kind: "network" });

    // Then: ordinary successful refetch sees server true; the offline client has no remote-freshness promise.
    expect(
      client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications[0]
        .read,
    ).toBe(true);
    expect(client.getQueryData(queries.summary.queryKey)?.unreadCount).toBe(6);
    expect(
      secondClient.getQueryData(secondQueries.inbox.queryKey)?.pages[0]
        .notifications[0].read,
    ).toBe(false);
    expect(
      secondClient.getQueryData(secondQueries.summary.queryKey)?.unreadCount,
    ).toBe(7);

    // When: an unloaded entry reaches its original 29-day deadline while client two is offline.
    jest.setSystemTime(Date.now() + 1000);
    await expireInbox(secondClient, secondQueries);

    // Then
    expect(
      confirmedUnreadCount(
        secondClient.getQueryData(secondQueries.summary.queryKey),
      ),
    ).toBeUndefined();
    expect(
      secondClient.getQueryData(secondQueries.inbox.queryKey)?.pages[0]
        .notifications,
    ).toHaveLength(2);

    // When: only an ordinary explicit refresh supplies the later server truth.
    secondOffline = false;
    total = 5;
    nextExpiryAt = "2026-11-01T00:00:00Z";
    await Promise.all([
      refreshInbox(secondClient, secondQueries),
      secondClient.fetchQuery(secondQueries.summary),
    ]);

    // Then
    expect(
      secondClient.getQueryData(secondQueries.inbox.queryKey)?.pages[0]
        .notifications[0].read,
    ).toBe(true);
    expect(
      secondClient.getQueryData(secondQueries.summary.queryKey)?.unreadCount,
    ).toBe(5);
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
    ).toHaveLength(1);
    expect(
      mockFetch.mock.calls.every(
        ([url, init]) =>
          init.method === "PATCH" ||
          /notifications$|notification-summary$/.test(url),
      ),
    ).toBe(true);
  } finally {
    stopList();
    stopCount();
    secondClient.clear();
  }
});
