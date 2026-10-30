import { InfiniteQueryObserver } from "@tanstack/react-query";
import { listNotifications } from "../../../../.generated/mobile";
import { createQueryClient } from "../../../shared/query/query-client";
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

it("uses generated account resource keys inside the identity-owned private cache", () => {
  // Given
  const owner = { subject: "auth0|owner", accountId: a };
  // When
  const keys = getNotificationKeys(owner);
  // Then
  expect(() =>
    getNotificationKeys({ subject: null, accountId: null }),
  ).toThrow();
  expect(keys.inbox).toEqual([`/accounts/${a}/notifications`]);
  expect(keys.summary).toEqual([`/accounts/${a}/notification-summary`]);
  expect(keys.detail(a)).toEqual([`/accounts/${a}/notifications/${a}`]);
  expect(getNotificationKeys({ ...owner, accountId: b }).summary).not.toEqual(
    keys.summary,
  );
});

it("uses one native infinite-query entry with cursor in pageParam", async () => {
  // Given
  const session = { subject: "auth0|owner", accountId: a };
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
        { signal },
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
