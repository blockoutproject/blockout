import {
  deletePushSubscription,
  getNotification,
  getNotificationSummary,
  getListNotificationsQueryOptions,
  listNotifications,
  markNotificationRead,
  replacePushSubscription,
} from "../../../../.generated/mobile";
import {
  ListNotifications200,
  MarkNotificationReadRequest,
  ReplacePushSubscriptionRequest,
  ListNotificationsParams,
  MatchSummaryResponse,
  SportingDivisionResponse,
  PushSubscriptionResponse,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { notificationResponse } from "../test-support/notification-data";

const id = "00000000-0000-4000-8000-000000000237";
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

beforeEach(() => {
  jest.useFakeTimers();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(async () => {
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it.each([
  "result",
  "result-with-link",
  "live-link",
  "post-result-link",
] as const)(
  "admits the finite %s family with additive fields and precise original values",
  async (family) => {
    // Given
    const entry = { ...notificationResponse(), family };
    mockFetch.mockResolvedValue(
      Response.json({
        ...entry,
        future: true,
        match: { ...entry.match, future: true },
      }),
    );

    // When
    const result = await getNotification(id, id);

    // Then
    expect(result).toEqual(entry);
    expect(result.createdAt).toBe("2026-10-24T01:02:03.123456Z");
    expect(MatchSummaryResponse.parse(result.match)).toEqual(entry.match);
    expect(SportingDivisionResponse.parse(result.division)).toEqual(
      entry.division,
    );
    expect(result.match.schedule.instant).toBeUndefined();
    expect(result.match.result?.homeSets).toBeUndefined();
  },
);

it("validates a twenty-entry page once at F13 before cache admission and preserves end absence", async () => {
  // Given
  const page = {
    notifications: Array.from({ length: 20 }, () => notificationResponse()),
    future: true,
  };
  mockFetch.mockResolvedValue(Response.json(page));
  const parse = jest.spyOn(ListNotifications200, "parse");
  const client = createQueryClient();
  const options = getListNotificationsQueryOptions(id);

  try {
    // When
    const result = await client.fetchQuery(options);

    // Then
    expect(result.notifications).toHaveLength(20);
    expect(result.nextCursor).toBeUndefined();
    expect(client.getQueryData(options.queryKey)).toEqual(result);
    expect(parse).toHaveBeenCalledTimes(1);
  } finally {
    client.clear();
  }
});

it.each([
  {},
  { notifications: null },
  { notifications: [], nextCursor: null },
  { notifications: [], nextCursor: "" },
  { notifications: Array.from({ length: 21 }, () => notificationResponse()) },
  ...[
    { family: "future" },
    { id: "invalid" },
    { createdAt: "2026-10-24" },
    { read: null },
    { read: "true" },
    { title: null },
    { match: null },
    { division: { ...notificationResponse().division, gradient: [] } },
    { match: { ...notificationResponse().match, category: "future" } },
  ].map((patch) => ({
    notifications: [{ ...notificationResponse(), ...patch }],
  })),
])("rejects malformed page data before Query success: %j", async (body) => {
  // Given
  mockFetch.mockResolvedValue(Response.json(body));
  const client = createQueryClient();
  const options = getListNotificationsQueryOptions(id);

  try {
    // When
    const result = client.fetchQuery(options);

    // Then
    await expect(result).rejects.toMatchObject({ kind: "schema" });
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    client.clear();
  }
});

it.each([0, 2 ** 32, Number.MAX_SAFE_INTEGER])(
  "consumes the authored int64 count %s",
  async (unreadCount) => {
    // Given: positive/zero consistency is a producer invariant, not a generated cross-field validator.
    const body = {
      unreadCount,
      ...(unreadCount > 0
        ? { nextExpiryAt: "2026-11-22T01:02:03.123456Z" }
        : {}),
    };
    mockFetch.mockResolvedValue(Response.json(body));

    // When
    const result = await getNotificationSummary(id);

    // Then
    expect(result).toEqual(body);
    expect(result.nextExpiryAt).toBe(body.nextExpiryAt);
  },
);

it.each([
  {},
  { unreadCount: -1 },
  { unreadCount: 0.5 },
  { unreadCount: "1" },
  { unreadCount: null },
  { unreadCount: 0, nextExpiryAt: null },
  { unreadCount: 1, nextExpiryAt: "tomorrow" },
])("rejects malformed summary fields: %j", async (body) => {
  // Given
  mockFetch.mockResolvedValue(Response.json(body));

  // When
  const result = getNotificationSummary(id);

  // Then
  await expect(result).rejects.toMatchObject({ kind: "schema" });
});

it.each([
  {},
  { read: false },
  { read: null },
  { read: "true" },
  { read: true, opened: true },
])("rejects unsupported read intent: %j", (body) => {
  // Given / When
  const result = MarkNotificationReadRequest.strict().safeParse(body);

  // Then
  expect(result.success).toBe(false);
});

it.each([
  {},
  { installationId: id },
  { installationId: null, expoPushToken: "synthetic" },
  { installationId: "invalid", expoPushToken: "synthetic" },
  { installationId: id, expoPushToken: null },
  { installationId: id, expoPushToken: "" },
  { installationId: id, expoPushToken: "synthetic", accountId: id },
])("rejects incomplete or extra registration fields: %j", (body) => {
  // Given / When
  const result = ReplacePushSubscriptionRequest.strict().safeParse(body);

  // Then
  expect(result.success).toBe(false);
});

it("sends true-only intent and keeps an opaque continuation unmodified", async () => {
  // Given
  mockFetch
    .mockResolvedValueOnce(Response.json(notificationResponse()))
    .mockResolvedValueOnce(Response.json({ notifications: [] }));
  const cursor = "date+uuid/opaque=";

  // When
  await markNotificationRead(
    id,
    id,
    MarkNotificationReadRequest.strict().parse({ read: true }),
  );
  await listNotifications(
    id,
    ListNotificationsParams.strict().parse({ cursor }),
  );

  // Then
  expect(mockFetch.mock.calls[0][1]).toMatchObject({
    method: "PATCH",
    body: '{"read":true}',
  });
  expect(
    new URL(String(mockFetch.mock.calls[1][0])).searchParams.get("cursor"),
  ).toBe(cursor);
});

it.each([{ cursor: null }, { cursor: "" }, { opened: true }])(
  "rejects invalid list parameters: %j",
  (params) => {
    // Given / When
    const result = ListNotificationsParams.strict().safeParse(params);

    // Then
    expect(result.success).toBe(false);
  },
);

it.each([200, 201])(
  "returns association identities for %s without requiring or echoing a destination",
  async (status) => {
    // Given
    mockFetch.mockResolvedValue(
      Response.json({ id, installationId: id }, { status }),
    );

    // When
    const result = await replacePushSubscription(
      id,
      id,
      {
        installationId: id,
        expoPushToken: "synthetic-destination",
      },
      { schema: PushSubscriptionResponse },
    );

    // Then
    expect(result).toEqual({ id, installationId: id });
  },
);

it("consumes 204 without invoking JSON parsing", async () => {
  // Given
  const response = new Response(null, { status: 204 });
  const json = jest.spyOn(response, "json");
  mockFetch.mockResolvedValue(response);

  // When
  const result = await deletePushSubscription(id, id);

  // Then
  expect(result).toBeUndefined();
  expect(json).not.toHaveBeenCalled();
  expect(mockFetch.mock.calls[0][1]?.method).toBe("DELETE");
});
