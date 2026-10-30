import { createDiscoveryQueryOptions } from "../api/discovery-queries";
import { createQueryClient } from "../../../shared/query/query-client";

jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const session = {
  subject: "auth0|reader",
  accountId: "00000000-0000-4000-8000-000000000001",
};
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("starts public discovery without credentials or account/entitlement lookup", async () => {
  // Given
  const credentials = jest.fn();
  const client = createQueryClient();
  const options = createDiscoveryQueryOptions(
    "club",
    { q: "Volley" },
    { subject: null, accountId: null },
    { bypass: undefined, request: (value) => value },
    credentials,
  );
  mockFetch.mockResolvedValue(Response.json({ clubs: [] }));
  try {
    // When
    await client.infiniteQuery(options);

    // Then
    expect(credentials).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(
      new Headers(mockFetch.mock.calls[0][1].headers).has("Authorization"),
    ).toBe(false);
  } finally {
    client.clear();
  }
});

it.each([401, 403, 503])(
  "preserves server bypass refusal %i without attempting a public fallback",
  async (status) => {
    // Given
    const credentials = jest.fn(async () => ({
      accessToken: "captured-token",
    }));
    const client = createQueryClient();
    const options = createDiscoveryQueryOptions(
      "club",
      { q: "Volley" },
      session,
      {
        bypass: session,
        request: (value) => ({
          ...value,
          headers: { ...value.headers, "Blockout-Maintenance-Bypass": "true" },
        }),
      },
      credentials,
    );
    mockFetch.mockResolvedValue(Response.json({}, { status }));
    try {
      // When
      const read = client.infiniteQuery(options);

      // Then
      await expect(read).rejects.toMatchObject({ kind: "http", status });
      expect(credentials).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(
        new Headers(mockFetch.mock.calls[0][1].headers).get("Authorization"),
      ).toBe("Bearer captured-token");
      expect(
        new Headers(mockFetch.mock.calls[0][1].headers).get(
          "Blockout-Maintenance-Bypass",
        ),
      ).toBe("true");
    } finally {
      client.clear();
    }
  },
);
