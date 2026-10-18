import {
  getPoolPresentation,
  getGetPoolStandingsQueryOptions,
  setPoolPresentation,
} from "../../../../.generated/mobile";
import type {
  GetPoolPresentation200,
  GetPoolStandings200,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";

const poolId = "00000000-0000-4000-8000-000000000001";
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

/** Supplies only the required synthetic presentation; optional short-name presence stays visible. */
function poolPresentation(): GetPoolPresentation200 {
  return {
    id: poolId,
    revision: "revision-1",
    names: {
      sourceName: "Synthetic pool",
      effectiveName: "Synthetic pool",
      manualName: null,
    },
  };
}

/** Supplies a usable official table without fabricated rows or recomputed sporting values. */
function standings(): GetPoolStandings200 {
  return {
    poolId,
    availability: "available",
    observedAt: "2026-10-18T18:00:00Z",
    lastAttemptFailed: false,
    columns: [],
    rows: [],
  };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

it.each([
  ["omitted", {}],
  ["explicit null", { manualShortName: null }],
  ["supplied", { manualShortName: "Pool A" }],
])(
  "preserves %s short-name presence in a generated response",
  async (_scenario, shortName) => {
    // Given
    const body = poolPresentation();
    const names = { ...body.names, ...shortName };
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ...body, names }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    // When
    const result = await getPoolPresentation(poolId);

    // Then
    expect(result.names).toStrictEqual(names);
  },
);

it.each([
  ["explicit null", { manualName: null, manualShortName: null }],
  [
    "supplied values",
    { manualName: "Synthetic pool", manualShortName: "Pool A" },
  ],
])(
  "retains %s in the generated replacement request",
  async (_scenario, names) => {
    // Given
    const change = {
      revision: "revision-1",
      ...names,
    };
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(poolPresentation()), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    // When
    await setPoolPresentation(poolId, change);

    // Then
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.example.invalid/administration/pools/${poolId}/presentation`,
      expect.objectContaining({ method: "PUT", body: JSON.stringify(change) }),
    );
  },
);

it("rejects an omitted required nullable name in a generated response", async () => {
  // Given
  const body = poolPresentation();
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        ...body,
        names: {
          sourceName: body.names.sourceName,
          effectiveName: body.names.effectiveName,
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );

  // When
  const request = getPoolPresentation(poolId);

  // Then
  await expect(request).rejects.toMatchObject({ kind: "schema" });
});

it("accepts additive sporting response fields before Query admission", async () => {
  // Given
  const body = standings();
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ ...body, future: true }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  const client = createQueryClient();
  const options = getGetPoolStandingsQueryOptions(poolId);

  try {
    // When
    const result = await client.fetchQuery(options);

    // Then
    expect(result).toStrictEqual(body);
    expect(client.getQueryData(options.queryKey)).toStrictEqual(body);
  } finally {
    client.clear();
  }
});

it.each([
  ["unknown enum", { availability: "future" }],
  ["invalid date", { observedAt: "2026-02-31T18:00:00Z" }],
  ["wrong known type", { lastAttemptFailed: "false" }],
])(
  "rejects a sporting %s before Query admission",
  async (_scenario, invalid) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ...standings(), ...invalid }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = createQueryClient();
    const options = getGetPoolStandingsQueryOptions(poolId);

    try {
      // When
      const request = client.fetchQuery(options);

      // Then
      await expect(request).rejects.toMatchObject({ kind: "schema" });
      expect(client.getQueryData(options.queryKey)).toBeUndefined();
    } finally {
      client.clear();
    }
  },
);

it("preserves a safe sporting refusal without caching a successful table", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        type: "urn:blockout:problem:unavailable",
        title: "Service Unavailable",
        status: 503,
      }),
      { status: 503, headers: { "Content-Type": "application/problem+json" } },
    ),
  );
  const client = createQueryClient();
  const options = getGetPoolStandingsQueryOptions(poolId);

  try {
    // When
    const request = client.fetchQuery(options);

    // Then
    await expect(request).rejects.toMatchObject({
      kind: "http",
      status: 503,
      problem: { type: "urn:blockout:problem:unavailable" },
    });
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    client.clear();
  }
});
