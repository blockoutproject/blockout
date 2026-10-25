import { onlineManager } from "@tanstack/react-query";
import { createDiscoveryQueryOptions } from "../api/discovery-queries";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { createQueryClient } from "../../../shared/query/query-client";

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
  onlineManager.setOnline(true);
  jest.restoreAllMocks();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("uses the returned cursor as pageParam inside one native infinite-query entry", async () => {
  // Given: generated HTTP and Query are real; only HTTP responses/admission are controlled.
  const client = createQueryClient();
  const session = createSessionGeneration();
  const credentials = jest.fn();
  const options = createDiscoveryQueryOptions(
    "club",
    { q: "Volley" },
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
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
    const result = await client.fetchInfiniteQuery({ ...options, pages: 2 });

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

it("isolates type, normalized text, exact filters, session and deliberate bypass intent", () => {
  // Given
  const generation = createSessionGeneration();
  const session = {
    ...generation.getSnapshot(),
    isCurrent: generation.isCurrent,
  };
  const admission = {
    bypass: undefined,
    request: (value: import("../../../shared/api/api-fetch").ApiFetchOptions) =>
      value,
  };
  const credentials = jest.fn();
  const options = createDiscoveryQueryOptions(
    "team",
    { q: " Volley ", gender: "female" },
    session,
    admission,
    credentials,
  );

  // When / Then
  expect(options.queryKey).toEqual(
    createDiscoveryQueryOptions(
      "team",
      { q: "volley", gender: "female" },
      session,
      admission,
      credentials,
    ).queryKey,
  );
  for (const other of [
    createDiscoveryQueryOptions(
      "pool",
      { q: "Volley", gender: "female" },
      session,
      admission,
      credentials,
    ),
    createDiscoveryQueryOptions(
      "team",
      { q: "Other", gender: "female" },
      session,
      admission,
      credentials,
    ),
    createDiscoveryQueryOptions(
      "team",
      { q: "Volley", gender: "male" },
      session,
      admission,
      credentials,
    ),
    createDiscoveryQueryOptions(
      "team",
      { q: "Volley", gender: "female" },
      { ...session, generation: "next-session" },
      admission,
      credentials,
    ),
    createDiscoveryQueryOptions(
      "team",
      { q: "Volley", gender: "female" },
      session,
      {
        ...admission,
        bypass: {
          ...generation.getSnapshot(),
          intentId: "deliberate-choice",
          signal: new AbortController().signal,
        },
      },
      credentials,
    ),
  ])
    expect(other.queryKey).not.toEqual(options.queryKey);
});

it.each(["club", "team", "pool"] as const)(
  "rejects invalid known %s fields before successful cache admission",
  async (resource) => {
    // Given
    const client = createQueryClient();
    const generation = createSessionGeneration();
    const options = createDiscoveryQueryOptions(
      resource,
      { q: "Volley" },
      { ...generation.getSnapshot(), isCurrent: generation.isCurrent },
      { bypass: undefined, request: (value) => value },
      jest.fn(),
    );
    mockFetch.mockResolvedValue(
      Response.json({ [`${resource}s`]: [{ [resource]: { id, name: 42 } }] }),
    );
    try {
      // When
      const result = client.fetchInfiniteQuery(options);

      // Then
      await expect(result).rejects.toMatchObject({ kind: "schema" });
      expect(client.getQueryData(options.queryKey)).toBeUndefined();
    } finally {
      client.clear();
    }
  },
);

it("attempts an offline read once and rejects an old-session completion", async () => {
  // Given
  const client = createQueryClient();
  const generation = createSessionGeneration();
  const options = createDiscoveryQueryOptions(
    "club",
    { q: "Volley" },
    { ...generation.getSnapshot(), isCurrent: generation.isCurrent },
    { bypass: undefined, request: (value) => value },
    jest.fn(),
  );
  onlineManager.setOnline(false);
  mockFetch.mockRejectedValueOnce(new TypeError("offline"));
  try {
    // When / Then
    await expect(client.fetchInfiniteQuery(options)).rejects.toMatchObject({
      kind: "network",
    });
    onlineManager.setOnline(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const pending = Promise.withResolvers<Response>();
    mockFetch.mockReturnValue(pending.promise);
    const request = client.fetchInfiniteQuery(options);
    const rejected = expect(request).rejects.toMatchObject({
      kind: "cancelled",
    });
    generation.invalidate();
    pending.resolve(Response.json({ clubs: [] }));
    await rejected;
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    client.clear();
  }
});
