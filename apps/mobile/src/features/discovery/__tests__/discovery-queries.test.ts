import { createDiscoveryQueryOptions } from "../api/discovery-queries";
import { createQueryClient } from "@/shared/query/query-client";

const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const id = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});

it("uses the returned cursor as pageParam inside one native infinite-query entry", async () => {
  // Given: generated HTTP and Query are real; only HTTP responses/admission are controlled.
  const client = createQueryClient();
  const session = { subject: null, accountId: null };
  const credentials = jest.fn();
  const options = createDiscoveryQueryOptions(
    "club",
    { q: "Volley" },
    session,
    { bypass: undefined, request: (value) => value },
    credentials,
  );
  mockFetch
    .mockResolvedValueOnce(
      Response.json({
        clubs: [{ club: { id, name: "Volley" } }],
        nextCursor: "opaque-boundary",
      }),
    )
    .mockResolvedValueOnce(Response.json({ clubs: [] }));
  try {
    // When
    const result = await client.infiniteQuery({ ...options, pages: 2 });

    // Then
    expect(result.pageParams).toEqual([undefined, "opaque-boundary"]);
    expect(
      mockFetch.mock.calls.map(([url]) =>
        new URL(url).searchParams.get("cursor"),
      ),
    ).toEqual([null, "opaque-boundary"]);
    expect(client.getQueryCache().getAll()).toHaveLength(1);
    expect(options.queryKey).not.toContain("opaque-boundary");
    expect(credentials).not.toHaveBeenCalled();
  } finally {
    client.clear();
  }
});

it.each(["club", "team", "pool"] as const)(
  "rejects invalid known %s fields before successful cache admission",
  async (resource) => {
    // Given
    const client = createQueryClient();
    const generation = { subject: null, accountId: null };
    const options = createDiscoveryQueryOptions(
      resource,
      { q: "Volley" },
      generation,
      { bypass: undefined, request: (value) => value },
      jest.fn(),
    );
    mockFetch.mockResolvedValue(
      Response.json({ [`${resource}s`]: [{ [resource]: { id, name: 42 } }] }),
    );
    try {
      // When
      const result = client.infiniteQuery(options);

      // Then
      await expect(result).rejects.toMatchObject({ kind: "schema" });
      expect(client.getQueryData(options.queryKey)).toBeUndefined();
    } finally {
      client.clear();
    }
  },
);
