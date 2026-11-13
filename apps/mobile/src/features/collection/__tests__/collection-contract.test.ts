import { QueryClient } from "@tanstack/react-query";
import { createCollectionQueries } from "../api/collection-queries";
import { getCollectionControl } from "../../../../.generated/mobile";
import type {
  CollectionControlResponse,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";

const control: CollectionControlResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  family: "club-sheets",
  revision: 0,
  enabled: false,
  pendingRequestId: null,
  lastAttemptAt: null,
  lastSuccessAt: null,
};
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  if (originalApiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  }
});

it("accepts explicit nullable evidence and additive fields through the generated client", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ ...control, future: true }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }),
  );

  // When
  const result = await getCollectionControl(control.id);

  // Then
  expect(result).toEqual(control);
  expect(result).not.toHaveProperty("cycle");
  expect(result).not.toHaveProperty("seasonId");
});

it.each([
  ["an unknown family", { family: "unknown" }],
  ["an unsafe revision", { revision: Number.MAX_SAFE_INTEGER + 1 }],
  ["an omitted required nullable timestamp", { lastSuccessAt: undefined }],
  ["a null optional season", { seasonId: null }],
  ["an invalid known timestamp", { lastAttemptAt: "not-a-date" }],
])(
  "rejects %s before accepting collection state",
  async (_scenario, invalid) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ...control, ...invalid }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    // When
    const request = getCollectionControl(control.id);

    // Then
    await expect(request).rejects.toMatchObject({ kind: "schema" });
  },
);

it("retains the shared conflict problem without treating it as collection state", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        type: "urn:blockout:problem:stale-revision",
        title: "Conflict",
        status: 409,
      }),
      {
        status: 409,
        headers: {
          "Content-Type": "application/problem+json",
          "Cache-Control": "no-store",
        },
      },
    ),
  );

  // When
  const request = getCollectionControl(control.id);

  // Then
  await expect(request).rejects.toMatchObject({
    kind: "http",
    status: 409,
    problem: { type: "urn:blockout:problem:stale-revision" },
  });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it.each([403, 404])(
  "shows the current technical error after a %i withdrawal without restoring the season",
  async (status) => {
    // Given
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const season: CollectionSeasonResponse = {
      id: control.id,
      label: "2026/2027",
      startYear: 2026,
      revision: 5,
      state: "active",
    };
    const options = createCollectionQueries({
      enabled: true,
      request: async () => ({}),
    }).season(season.id);
    client.setQueryData(options.queryKey, season);
    mockFetch.mockResolvedValue(
      Response.json({ status, title: "Refused" }, { status }),
    );

    try {
      // When
      await expect(client.fetchQuery(options)).rejects.toMatchObject({
        status,
      });

      // Then
      expect(client.getQueryData(options.queryKey)).toBeNull();

      // When
      mockFetch.mockResolvedValue(
        Response.json({ status: 503, title: "Unavailable" }, { status: 503 }),
      );
      await expect(client.fetchQuery(options)).rejects.toMatchObject({
        status: 503,
      });

      // Then
      expect(client.getQueryState(options.queryKey)?.error).toMatchObject({
        status: 503,
      });
      expect(client.getQueryData(options.queryKey)).toBeNull();
    } finally {
      client.clear();
    }
  },
);
