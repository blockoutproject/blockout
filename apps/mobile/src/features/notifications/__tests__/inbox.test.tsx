import { InfiniteQueryObserver, MutationObserver } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import { createQueryClient } from "@/shared/query/query-client";
import { createInboxQueries, refreshInbox } from "../api/inbox-queries";
import { createReadNotificationOptions } from "../api/inbox-mutations";
import { notificationResponse } from "../test-support/notification-data";
import { expireInbox } from "../state/inbox-expiry";

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
  client.setDefaultOptions({
    ...client.getDefaultOptions(),
    queries: { retry: false },
  });
  mockFetch.mockReset();
});

afterEach(async () => {
  client.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  if (originalUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
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

it("reports a failed read action without waiting for ordinary refreshes", async () => {
  // Given: real Query observers retain the inbox while only HTTP is controlled.
  const { owner, queries } = context();
  client.setQueryData(queries.inbox.queryKey, {
    pages: [{ notifications: [row] }],
    pageParams: [undefined],
  });
  const inbox = new InfiniteQueryObserver(client, {
    ...queries.inbox,
    staleTime: Infinity,
  });
  const stopInbox = inbox.subscribe(() => undefined);
  const command = new MutationObserver(
    client,
    createReadNotificationOptions(client, owner, queries),
  );
  const stopCommand = command.subscribe(() => undefined);
  const feedback = jest.fn();
  const refreshedInbox = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    if (init.method === "PATCH") {
      throw new TypeError("lost read response");
    }
    return refreshedInbox.promise;
  });

  // When: the explicit PATCH fails while the invalidated GET remains in flight.
  const attempt = command
    .mutate(row.id, { onError: feedback })
    .catch(() => undefined);
  try {
    await waitFor(() => expect(feedback).toHaveBeenCalledTimes(1));

    // Then: the tap reports failure without waiting for those reads or replaying the write.
    expect(command.getCurrentResult().isError).toBe(true);
    expect(inbox.getCurrentResult().isFetching).toBe(true);
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
    ).toHaveLength(1);
    expect(inbox.getCurrentResult().data?.pages[0].notifications).toEqual([
      row,
    ]);
  } finally {
    refreshedInbox.resolve(Response.json({ notifications: [row] }));
    await attempt;
    stopCommand();
    stopInbox();
  }
});

it("does not restore a known missing row from an older page", async () => {
  // Given
  const { owner, queries } = context();
  client.setQueryData(queries.inbox.queryKey, {
    pages: [{ notifications: [row] }],
    pageParams: [undefined],
  });
  const delayed = Promise.withResolvers<Response>();
  const delayedRead = jest.fn(() => delayed.promise);
  mockFetch.mockImplementationOnce(delayedRead);
  const old = client.fetchInfiniteQuery(queries.inbox).catch(() => undefined);
  await waitFor(() => expect(delayedRead).toHaveBeenCalledTimes(1));
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

it.each([401, 403])(
  "removes retained private content when the read command receives %s",
  async (status) => {
    // Given
    const { owner, queries } = context();
    client.setQueryData(queries.inbox.queryKey, {
      pages: [{ notifications: [row] }],
      pageParams: [undefined],
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
    expect(client.getQueryState(queries.inbox.queryKey)?.status).toBe("error");
  },
);

it("removes the original owner's retained data after an inbox 404", async () => {
  // Given
  const { queries } = context();
  client.setQueryData(queries.inbox.queryKey, {
    pages: [{ notifications: [row] }],
    pageParams: [undefined],
  });
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

  // When
  await client.fetchInfiniteQuery(queries.inbox).catch(() => undefined);

  // Then
  expect(client.getQueryData(queries.inbox.queryKey)).toBeUndefined();
});

it("does not restore expired content when a pending page is cancelled after ordinary filtering", async () => {
  // Given
  const { queries } = context();
  const deadline = Date.now() + 1000;
  const expiring = {
    ...row,
    createdAt: new Date(deadline - 29 * 86_400_000).toISOString(),
  };
  client.setQueryData(queries.inbox.queryKey, {
    pages: [{ notifications: [expiring] }],
    pageParams: [undefined],
  });
  const delayedPage = Promise.withResolvers<Response>();
  const readPage = jest.fn(() => delayedPage.promise);
  mockFetch.mockImplementation(readPage);
  const page = client.fetchInfiniteQuery(queries.inbox).catch(() => undefined);
  await waitFor(() => expect(readPage).toHaveBeenCalledTimes(1));
  expect(Date.now()).toBeLessThan(deadline);

  // When
  jest.setSystemTime(deadline);
  expireInbox(client, queries);
  await client.cancelQueries({ queryKey: queries.inbox.queryKey, exact: true });
  delayedPage.resolve(Response.json({ notifications: [expiring] }));
  await page;

  // Then
  expect(
    client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([]);
});

it("keeps other notifications when a member is missing and refresh fails", async () => {
  // Given
  const { owner, queries } = context();
  const survivor = { ...row, id: "00000000-0000-4000-8000-000000000239" };
  let initial = true;
  mockFetch.mockImplementation(async (url, init) => {
    if (init.method === "PATCH") {
      return new Response(null, { status: 404 });
    }
    if (!initial) {
      throw new TypeError("offline during refresh");
    }
    return Response.json({ notifications: [row, survivor] });
  });
  const list = new InfiniteQueryObserver(client, queries.inbox);
  const stopList = list.subscribe(() => undefined);
  await list.refetch();
  expect(
    client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
  ).toHaveLength(2);
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
    await waitFor(() => {
      expect(list.getCurrentResult().error).toMatchObject({ kind: "network" });
    });
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
    ).toHaveLength(1);
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "GET"),
    ).toHaveLength(2);
  } finally {
    stopList();
  }
});

it("reconciles read state on another client's ordinary refresh after a lost acknowledgement", async () => {
  // Given: two native Query lifetimes share only the controlled server's read state.
  const { owner, queries } = context();
  const secondClient = createQueryClient();
  secondClient.setDefaultOptions({ queries: { retry: false } });
  let read = false;
  mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
    if (init.method === "PATCH") {
      read = true;
      throw new TypeError("Lost acknowledgement");
    }
    return Response.json({ notifications: [{ ...row, read }] });
  });
  await secondClient.fetchInfiniteQuery(queries.inbox);
  const command = new MutationObserver(
    client,
    createReadNotificationOptions(client, owner, queries),
  );
  try {
    // When
    await expect(command.mutate(row.id)).rejects.toMatchObject({
      kind: "network",
    });

    // Then: another client has no immediate cross-client update guarantee.
    expect(
      secondClient.getQueryData(queries.inbox.queryKey)?.pages[0]
        .notifications[0].read,
    ).toBe(false);

    // When
    await refreshInbox(secondClient, queries);

    // Then
    expect(
      secondClient.getQueryData(queries.inbox.queryKey)?.pages[0]
        .notifications[0].read,
    ).toBe(true);
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
    ).toHaveLength(1);
  } finally {
    secondClient.clear();
  }
});

it("keeps a full-read failure when a missing member is removed locally", async () => {
  // Given: Query retains an authorized page behind a failed full-read state.
  const { owner, queries } = context();
  const survivor = { ...row, id: "00000000-0000-4000-8000-000000000239" };
  mockFetch.mockResolvedValueOnce(
    Response.json({ notifications: [row, survivor] }),
  );
  await client.fetchInfiniteQuery(queries.inbox);
  mockFetch.mockRejectedValueOnce(new TypeError("Full read unavailable"));
  await client.fetchInfiniteQuery(queries.inbox).catch(() => undefined);
  const error = client.getQueryState(queries.inbox.queryKey)?.error;
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
  const command = new MutationObserver(
    client,
    createReadNotificationOptions(client, owner, queries),
  );

  // When
  await command.mutate(row.id).catch(() => undefined);

  // Then: removing one known missing entry does not certify the remainder of the failed read.
  expect(client.getQueryState(queries.inbox.queryKey)).toMatchObject({
    status: "error",
    error,
    fetchStatus: "idle",
  });
  expect(
    client.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([survivor]);
  expect(mockFetch).toHaveBeenCalledTimes(3);
});
