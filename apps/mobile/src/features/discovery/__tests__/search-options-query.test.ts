import { createSearchOptionsQueryOptions } from "../api/discovery-queries";
import { createQueryClient } from "../../../shared/query/query-client";
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";

const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const catalogue = {
  resourceType: "team",
  seasons: [],
  divisions: [],
  formats: ["6x6"],
  genders: ["female"],
};
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("reads independent public team/pool options without consulting credentials", async () => {
  // Given
  const generation = { subject: null, accountId: null };
  const session = generation;
  const client = createQueryClient();
  const credentials = jest.fn();
  const admission = {
    bypass: undefined,
    request: (value: ApiFetchOptions) => value,
  };
  const team = createSearchOptionsQueryOptions(
    "team",
    session,
    admission,
    credentials,
  );
  const pool = createSearchOptionsQueryOptions(
    "pool",
    session,
    admission,
    credentials,
  );
  mockFetch.mockImplementation((url) =>
    Promise.resolve(
      Response.json({
        ...catalogue,
        resourceType: new URL(String(url)).searchParams.get("resourceType"),
      }),
    ),
  );
  try {
    // When
    await client.query(team);
    await client.query(pool);

    // Then
    expect(credentials).not.toHaveBeenCalled();
    expect(client.getQueryCache().getAll()).toHaveLength(2);
    expect(
      mockFetch.mock.calls.map(([url]) =>
        new URL(String(url)).searchParams.get("resourceType"),
      ),
    ).toEqual(["team", "pool"]);
  } finally {
    client.clear();
  }
});

it.each([
  {},
  { ...catalogue, seasons: null },
  { ...catalogue, formats: ["future"] },
])(
  "rejects invalid options before successful cache admission: %j",
  async (body) => {
    // Given
    const generation = { subject: null, accountId: null };
    const client = createQueryClient();
    const options = createSearchOptionsQueryOptions(
      "team",
      generation,
      { bypass: undefined, request: (value) => value },
      jest.fn(),
    );
    mockFetch.mockResolvedValue(Response.json(body));
    try {
      // When
      const result = client.query(options);

      // Then
      await expect(result).rejects.toMatchObject({ kind: "schema" });
      expect(client.getQueryData(options.queryKey)).toBeUndefined();
    } finally {
      client.clear();
    }
  },
);

it.each([401, 403, 503])(
  "preserves explicit options bypass refusal %i without a public fallback",
  async (status) => {
    // Given: current grant admission is controlled; generated HTTP and captured session are real.
    const generation = { subject: null, accountId: null };
    const snapshot = generation;
    const client = createQueryClient();
    const options = createSearchOptionsQueryOptions(
      "team",
      snapshot,
      {
        bypass: {
          ...snapshot,
          accountId: "00000000-0000-4000-8000-000000000001",
        },
        request: (value) => ({
          ...value,
          headers: { ...value.headers, "Blockout-Maintenance-Bypass": "true" },
        }),
      },
      async () => ({ accessToken: "synthetic-token" }),
    );
    mockFetch.mockResolvedValue(Response.json({ status }, { status }));
    try {
      // When
      const result = client.query(options);

      // Then
      await expect(result).rejects.toMatchObject({ kind: "http", status });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][1].headers).toMatchObject({
        Authorization: "Bearer synthetic-token",
        "Blockout-Maintenance-Bypass": "true",
      });
    } finally {
      client.clear();
    }
  },
);
