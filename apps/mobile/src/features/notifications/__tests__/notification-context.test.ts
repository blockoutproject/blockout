import { InfiniteQueryObserver, isCancelledError } from "@tanstack/react-query";
import {
  getNotificationSummary,
  listNotifications,
  markNotificationRead,
  deletePushSubscription,
} from "../../../../.generated/mobile";
import { createSessionGeneration } from "../../accounts";
import {
  bindSessionQueries,
  createQueryClient,
} from "../../../shared/query/query-client";
import { getNotificationKeys } from "../api/notification-keys";
import { notificationResponse } from "../test-support/notification-data";

const a = "00000000-0000-4000-8000-000000000237";
const b = "00000000-0000-4000-8000-000000000238";
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
let client: ReturnType<typeof createQueryClient>;

beforeEach(() => {
  jest.useFakeTimers();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
  client = createQueryClient();
});
afterEach(async () => {
  client.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("requires a usable original owner and keeps account and generation in private keys", () => {
  // Given
  const owner = createSessionGeneration();
  expect(() => getNotificationKeys(owner.getSnapshot())).toThrow();
  owner.setAccount(owner.getSnapshot().generation, a);
  const captured = owner.getSnapshot();

  // When
  const keys = getNotificationKeys(captured);
  owner.invalidate();
  owner.setAccount(owner.getSnapshot().generation, a);
  const returned = getNotificationKeys(owner.getSnapshot());

  // Then
  expect(keys.inbox).toEqual([
    "session",
    captured.generation,
    `/accounts/${a}/notifications`,
  ]);
  expect(keys.summary).toEqual([
    "session",
    captured.generation,
    `/accounts/${a}/notification-summary`,
  ]);
  expect(keys.detail(a)).toEqual([
    "session",
    captured.generation,
    `/accounts/${a}/notifications/${a}`,
  ]);
  expect(returned.inbox).not.toEqual(keys.inbox);
  expect(
    getNotificationKeys({ ...captured, accountId: b }).summary,
  ).not.toEqual(keys.summary);
});

it("uses one native infinite-query entry with cursor in pageParam", async () => {
  // Given
  const owner = createSessionGeneration();
  owner.setAccount(owner.getSnapshot().generation, a);
  const session = { ...owner.getSnapshot(), isCurrent: owner.isCurrent };
  const keys = getNotificationKeys(session);
  mockFetch
    .mockResolvedValueOnce(
      Response.json({
        notifications: [notificationResponse()],
        nextCursor: "opaque-date-uuid",
      }),
    )
    .mockResolvedValueOnce(Response.json({ notifications: [] }));
  const observer = new InfiniteQueryObserver(client, {
    queryKey: keys.inbox,
    queryFn: ({ pageParam, signal }) =>
      listNotifications(
        a,
        pageParam === undefined ? undefined : { cursor: pageParam },
        { signal, session },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor,
  });

  try {
    // When
    await observer.refetch();
    const result = await observer.fetchNextPage();

    // Then
    expect(result.data?.pageParams).toEqual([undefined, "opaque-date-uuid"]);
    expect(result.hasNextPage).toBe(false);
    expect(client.getQueryCache().findAll()).toHaveLength(1);
    expect(
      new URL(String(mockFetch.mock.calls[0][0])).searchParams.has("cursor"),
    ).toBe(false);
    expect(
      new URL(String(mockFetch.mock.calls[1][0])).searchParams.get("cursor"),
    ).toBe("opaque-date-uuid");
  } finally {
    observer.destroy();
  }
});

it.each<{ label: string; transitions: (string | null)[] }>([
  { label: "guest", transitions: [null] },
  { label: "guest → B", transitions: [null, b] },
  { label: "guest → A", transitions: [null, a] },
  { label: "B → A", transitions: [b, a] },
])(
  "removes obsolete inbox/summary/detail across A → $label",
  async ({ transitions }) => {
    // Given: real Query/session/transport; Fetch deliberately completes despite cancellation.
    const owner = createSessionGeneration();
    owner.setAccount(owner.getSnapshot().generation, a);
    const session = { ...owner.getSnapshot(), isCurrent: owner.isCurrent };
    const keys = getNotificationKeys(session);
    const unsubscribe = bindSessionQueries(
      client,
      owner.subscribe,
      owner.isCurrent,
    );
    client.setQueryData(keys.inbox, {
      notifications: [notificationResponse()],
    });
    client.setQueryData(keys.detail(a), notificationResponse());
    client.setQueryData(["public"], "retained");
    const response = Promise.withResolvers<Response>();
    mockFetch.mockReturnValueOnce(response.promise);
    const pending = client
      .fetchQuery({
        queryKey: keys.summary,
        queryFn: ({ signal }) => getNotificationSummary(a, { session, signal }),
      })
      .catch((error: unknown) => error);

    // When
    for (const accountId of transitions) {
      if (accountId === null) owner.invalidate();
      else owner.setAccount(owner.getSnapshot().generation, accountId);
    }
    const current = owner.getSnapshot().accountId
      ? getNotificationKeys(owner.getSnapshot())
      : undefined;
    if (current) client.setQueryData(current.summary, { unreadCount: 0 });
    response.resolve(
      Response.json({ unreadCount: 99, nextExpiryAt: "2026-11-22T01:02:03Z" }),
    );

    // Then
    expect(isCancelledError(await pending)).toBe(true);
    expect(client.getQueryState(keys.summary)).toBeUndefined();
    expect(client.getQueryState(keys.inbox)).toBeUndefined();
    expect(client.getQueryState(keys.detail(a))).toBeUndefined();
    expect(client.getQueryData(["public"])).toBe("retained");
    if (current)
      expect(client.getQueryData(current.summary)).toEqual({ unreadCount: 0 });
    expect(mockFetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
    unsubscribe();
  },
);

it.each<{ label: string; transitions: (string | null)[] }>([
  { label: "guest", transitions: [null] },
  { label: "guest → B", transitions: [null, b] },
  { label: "guest → A", transitions: [null, a] },
  { label: "B → A", transitions: [b, a] },
])(
  "rejects obsolete callbacks without a cancellation signal after A → $label",
  async ({ transitions }) => {
    // Given
    const owner = createSessionGeneration();
    owner.setAccount(owner.getSnapshot().generation, a);
    const session = { ...owner.getSnapshot(), isCurrent: owner.isCurrent };
    const body = Promise.withResolvers<unknown>();
    const reading = Promise.withResolvers<void>();
    const response = Response.json({});
    jest.spyOn(response, "json").mockImplementation(() => {
      reading.resolve();
      return body.promise;
    });
    mockFetch.mockResolvedValue(response);
    const result = markNotificationRead(
      a,
      a,
      { read: true },
      { session },
    ).catch((error: unknown) => error);
    await reading.promise;

    // When
    for (const accountId of transitions) {
      if (accountId === null) owner.invalidate();
      else owner.setAccount(owner.getSnapshot().generation, accountId);
    }
    body.resolve({ ...notificationResponse(), read: true });

    // Then
    expect(await result).toMatchObject({ kind: "cancelled" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  },
);

it("refuses old prepared work before sending even after the same account returns", async () => {
  // Given
  const owner = createSessionGeneration();
  owner.setAccount(owner.getSnapshot().generation, a);
  const session = { ...owner.getSnapshot(), isCurrent: owner.isCurrent };
  owner.invalidate();
  owner.setAccount(owner.getSnapshot().generation, a);

  // When
  const result = deletePushSubscription(a, a, { session });

  // Then
  await expect(result).rejects.toMatchObject({ kind: "cancelled" });
  expect(mockFetch).not.toHaveBeenCalled();
});
