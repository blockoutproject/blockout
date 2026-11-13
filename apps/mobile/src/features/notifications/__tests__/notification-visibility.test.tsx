import { createQueryClient } from "@/shared/query/query-client";
import { QueryObserver } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import { createConsultationQueries } from "@/features/sporting/api/consultation-queries";
import {
  createInboxQueries,
  subscribeInboxVisibility,
} from "../api/inbox-queries";
import { notificationResponse } from "../test-support/notification-data";

const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const row = notificationResponse();
const owner = { subject: "auth0|visibility", accountId: row.id };
let client = createQueryClient();
let stop: () => void;
const inbox = createInboxQueries(owner, async (signal) => ({ signal }));
const sporting = createConsultationQueries(
  owner,
  { request: (options) => options ?? {} },
  async () => undefined,
);

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-10-27T12:00:00Z") });
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  mockFetch.mockReset();
  stop = subscribeInboxVisibility(client);
});
afterEach(async () => {
  stop();
  client.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  if (originalUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});

it.each([401, 403, 404])(
  "lets a current F03 %s cancel a delayed inbox without losing other matches",
  async (status) => {
    // Given: real F03/F07 Query functions and generated transport; only HTTP is controlled.
    const survivor = {
      ...row,
      id: "00000000-0000-4000-8000-000000000239",
      match: { ...row.match, id: "00000000-0000-4000-8000-000000000240" },
    };
    client.setQueryData(inbox.inbox.queryKey, {
      pages: [{ notifications: [row, survivor] }],
      pageParams: [undefined],
    });
    const page = Promise.withResolvers<Response>();
    const readPage = jest.fn(() => page.promise);
    mockFetch.mockImplementationOnce(readPage);
    const delayed = client
      .fetchInfiniteQuery(inbox.inbox)
      .catch(() => undefined);
    await waitFor(() => expect(readPage).toHaveBeenCalledTimes(1));
    mockFetch.mockResolvedValueOnce(new Response(null, { status }));

    // When
    await client
      .fetchQuery(sporting.match(row.match.id))
      .catch(() => undefined);
    page.resolve(Response.json({ notifications: [row, survivor] }));
    await delayed;

    // Then
    expect(
      client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
    ).toEqual([survivor]);

    // When: an ordinary offline refresh cannot bring the known unavailable copy back.
    mockFetch.mockRejectedValue(new TypeError("offline"));
    await client.fetchInfiniteQuery(inbox.inbox).catch(() => undefined);
    await client
      .fetchQuery(sporting.match(row.match.id))
      .catch(() => undefined);

    // Then
    expect(
      client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
    ).toEqual([survivor]);
  },
);

it("preserves authorized notification data after an ordinary F03 outage", async () => {
  // Given
  mockFetch.mockResolvedValueOnce(Response.json({ notifications: [row] }));
  await client.fetchInfiniteQuery(inbox.inbox);
  mockFetch.mockRejectedValue(new TypeError("offline"));

  // When
  await client.fetchQuery(sporting.match(row.match.id)).catch(() => undefined);

  // Then
  expect(
    client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([row]);
});

it("applies the first F03 refusal even when native retries later fail offline", async () => {
  // Given: QueryObserver keeps the native retry defaults; only HTTP and time are controlled.
  client.setDefaultOptions({});
  mockFetch.mockResolvedValueOnce(Response.json({ notifications: [row] }));
  await client.fetchInfiniteQuery(inbox.inbox);
  const page = Promise.withResolvers<Response>();
  const readPage = jest.fn(() => page.promise);
  mockFetch.mockImplementationOnce(readPage);
  const oldPage = client.fetchInfiniteQuery(inbox.inbox).catch(() => undefined);
  await waitFor(() => expect(readPage).toHaveBeenCalledTimes(1));
  mockFetch
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockRejectedValue(new TypeError("offline retry"));
  const current = new QueryObserver(client, sporting.match(row.match.id));
  const unsubscribe = current.subscribe(() => undefined);
  try {
    // When
    await waitFor(() =>
      expect(
        client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
      ).toEqual([]),
    );

    // Then: apply the known refusal before Query exhausts its ordinary retries.

    expect(current.getCurrentResult().failureCount).toBe(1);

    // When
    page.resolve(Response.json({ notifications: [row] }));
    await oldPage;
    await jest.advanceTimersByTimeAsync(8000);

    // Then
    expect(current.getCurrentResult().error).toMatchObject({ kind: "network" });
    expect(
      client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
    ).toEqual([]);
  } finally {
    unsubscribe();
  }
});

it("admits a retained reappearance only through a fresh inbox response and excludes expired rows", async () => {
  // Given
  mockFetch.mockResolvedValueOnce(Response.json({ notifications: [row] }));
  await client.fetchInfiniteQuery(inbox.inbox);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
  await client.fetchQuery(sporting.match(row.match.id)).catch(() => undefined);
  expect(
    client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([]);
  const expired = {
    ...row,
    id: "00000000-0000-4000-8000-000000000239",
    createdAt: "2026-09-28T12:00:00Z",
  };
  const retained = { ...row, read: true };
  mockFetch.mockResolvedValueOnce(
    Response.json({ notifications: [retained, expired] }),
  );

  // When
  await client.fetchInfiniteQuery(inbox.inbox);

  // Then
  expect(
    client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([retained]);
  expect(retained.createdAt).toBe(row.createdAt);
  expect(retained.family).toBe(row.family);
});

it("removes a known stale link claim while retaining an enriched result offline", async () => {
  // Given: the retained entry still mentions the previously public link.
  const linked = {
    ...row,
    family: "result-with-link" as const,
    title: "Un lien a été proposé pour ce match.",
  };
  mockFetch.mockResolvedValueOnce(Response.json({ notifications: [linked] }));
  await client.fetchInfiniteQuery(inbox.inbox);
  mockFetch.mockResolvedValueOnce(
    Response.json({
      match: row.match,
      documents: [],
      streamUrl: "https://youtu.be/previous271",
    }),
  );
  await client.fetchQuery(sporting.match(row.match.id));
  const page = Promise.withResolvers<Response>();
  const readPage = jest.fn(() => page.promise);
  mockFetch.mockImplementationOnce(readPage);
  const old = client.fetchInfiniteQuery(inbox.inbox).catch(() => undefined);
  await waitFor(() => expect(readPage).toHaveBeenCalledTimes(1));
  mockFetch.mockResolvedValueOnce(
    Response.json({ match: row.match, documents: [] }),
  );

  // When
  const match = await client.fetchQuery(sporting.match(row.match.id));
  page.resolve(Response.json({ notifications: [linked] }));
  await old;
  mockFetch.mockRejectedValue(new TypeError("offline inbox refresh"));
  await client.fetchInfiniteQuery(inbox.inbox).catch(() => undefined);

  // Then
  expect(match.streamUrl).toBeUndefined();
  expect(
    client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([{ ...linked, title: "Le lien n’est plus proposé." }]);
});
