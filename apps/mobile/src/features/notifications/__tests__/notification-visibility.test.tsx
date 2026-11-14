import { createQueryClient } from "@/shared/query/query-client";
import { waitFor } from "@testing-library/react-native";
import { createConsultationQueries } from "@/features/sporting/api/consultation-queries";
import { createInboxQueries } from "../api/inbox-queries";
import { notificationResponse } from "../test-support/notification-data";

const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const row = notificationResponse();
const owner = { subject: "auth0|visibility", accountId: row.id };
let client = createQueryClient();
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

it("retains an old public notification after current destination refusal until the inbox refreshes", async () => {
  // Given: F03/F07 query functions and generated transport are real; only HTTP is controlled.
  mockFetch.mockResolvedValueOnce(Response.json({ notifications: [row] }));
  await client.fetchInfiniteQuery(inbox.inbox);
  mockFetch.mockResolvedValueOnce(
    Response.json({ match: row.match, documents: [] }),
  );
  await client.fetchQuery(sporting.match(row.match.id));
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

  // When
  await expect(
    client.fetchQuery(sporting.match(row.match.id)),
  ).rejects.toMatchObject({ status: 404 });

  // Then: the destination removes its own facts while the public notification remains an independent projection.
  expect(
    client.getQueryData(sporting.match(row.match.id).queryKey),
  ).toBeUndefined();
  expect(
    client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([row]);

  // When
  mockFetch.mockRejectedValueOnce(new TypeError("Synthetic inbox outage"));
  await expect(client.fetchInfiniteQuery(inbox.inbox)).rejects.toMatchObject({
    kind: "network",
  });

  // Then
  expect(
    client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([row]);

  // When
  mockFetch.mockResolvedValueOnce(Response.json({ notifications: [] }));
  await client.fetchInfiniteQuery(inbox.inbox);

  // Then
  expect(
    client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([]);
});

it("lets an already started inbox read finish independently of a match refusal", async () => {
  // Given
  const response = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(response.promise);
  const read = client.fetchInfiniteQuery(inbox.inbox);
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

  // When
  await expect(
    client.fetchQuery(sporting.match(row.match.id)),
  ).rejects.toMatchObject({ status: 404 });
  response.resolve(Response.json({ notifications: [row] }));
  await read;

  // Then
  expect(
    client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([row]);
  expect(client.getQueryState(inbox.inbox.queryKey)?.status).toBe("success");
  expect(mockFetch).toHaveBeenCalledTimes(2);
});

it("keeps old link wording until an ordinary inbox read supplies the current title", async () => {
  // Given
  const linked = {
    ...row,
    family: "result-with-link" as const,
    title: "Un lien a été proposé pour ce match.",
  };
  mockFetch.mockResolvedValueOnce(Response.json({ notifications: [linked] }));
  await client.fetchInfiniteQuery(inbox.inbox);
  mockFetch.mockResolvedValueOnce(
    Response.json({ match: row.match, documents: [] }),
  );

  // When
  const match = await client.fetchQuery(sporting.match(row.match.id));

  // Then
  expect(match.streamUrl).toBeUndefined();
  expect(
    client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([linked]);

  // When
  const current = { ...linked, title: "Le lien n’est plus proposé." };
  mockFetch.mockResolvedValueOnce(Response.json({ notifications: [current] }));
  await client.fetchInfiniteQuery(inbox.inbox);

  // Then
  expect(
    client.getQueryData(inbox.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([current]);
});
