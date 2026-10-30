import { createQueryClient } from "../../../shared/query/query-client";
import { createConsultationQueries } from "../api/consultation-queries";
import { clubDetail, sportingId } from "../test-support/consultation-data";

jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("purges refused club contacts so a later network failure cannot republish them", async () => {
  // Given
  const client = createQueryClient();
  const queries = createConsultationQueries(
    { subject: null, accountId: null },
    { request: (value) => value },
    jest.fn(),
  );
  const options = queries.club(sportingId);
  mockFetch.mockResolvedValueOnce(
    Response.json({
      ...clubDetail(),
      contacts: {
        email: "private@example.invalid",
        phone: "+33123456789",
        address: "Private address",
      },
    }),
  );
  await client.query(options);
  mockFetch.mockResolvedValueOnce(Response.json({}, { status: 403 }));
  try {
    // When
    await expect(client.query(options)).rejects.toMatchObject({
      kind: "http",
      status: 403,
    });
    mockFetch.mockResolvedValueOnce(Response.json({}, { status: 503 }));
    const later = client.query(options);

    // Then
    await expect(later).rejects.toMatchObject({ kind: "http", status: 503 });
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    client.clear();
  }
});

it("keeps benign cached projections independent until their own current server refresh", async () => {
  // Given
  const client = createQueryClient();
  const queries = createConsultationQueries(
    { subject: null, accountId: null },
    { request: (value) => value },
    jest.fn(),
  );
  const detail = queries.club(sportingId);
  const collection = queries.clubTeams(sportingId, sportingId);
  const cached = {
    seasonId: sportingId,
    items: [
      {
        team: { id: sportingId, name: "Known team" },
        season: { id: sportingId, label: "2026/2027", startYear: 2026 },
        classification: {},
        professional: false,
      },
    ],
  };
  mockFetch.mockImplementation(async (url: string) =>
    Response.json(
      new URL(url).pathname.endsWith("/teams") ? cached : clubDetail(),
    ),
  );
  await client.query(detail);
  await client.query(collection);
  mockFetch.mockImplementation(async (url: string) =>
    new URL(url).pathname.endsWith("/teams")
      ? Response.json({ ...cached, items: [] })
      : Response.json({}, { status: 404 }),
  );
  try {
    // When
    await expect(client.query(detail)).rejects.toMatchObject({
      kind: "http",
      status: 404,
    });

    // Then
    expect(client.getQueryData(detail.queryKey)).toBeUndefined();
    expect(client.getQueryData(collection.queryKey)).toEqual(cached);

    // When
    const refreshed = await client.query(collection);

    // Then
    expect(refreshed).toEqual({ ...cached, items: [] });
    expect(mockFetch).toHaveBeenCalledTimes(4);
  } finally {
    client.clear();
  }
});
