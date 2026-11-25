import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import {
  getDivision,
  getMappingPack,
  getPoolPresentation,
  getTeamLogo,
  setPoolPresentation,
} from "../../../../.generated/mobile";
import type {
  DivisionResponse,
  MappingPackResponse,
  PoolPresentationResponse,
} from "../../../../.generated/schemas/index.zod";
import { createMappingQueries } from "../api/mapping-queries";

const poolId = "00000000-0000-4000-8000-000000000001";
const mappingPack: MappingPackResponse = {
  id: "00000000-0000-4000-8000-000000000010",
  label: "CFA",
  sourceId: "00000000-0000-4000-8000-000000000011",
  sourceLabel: "FFVB / Ligue",
  seasonId: "00000000-0000-4000-8000-000000000012",
  seasonLabel: "2026\u20132027",
  defaultClassification: null,
  status: "some",
  poolCount: 2,
  classifiedPoolCount: 1,
};
const division: DivisionResponse = {
  id: "00000000-0000-4000-8000-000000000002",

  name: "Synthetic division",
  color: "#112233",
  gradient: null,
  logo: { effectiveUrl: null, manualUrl: null, automaticUrl: null },
  active: true,
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

/** Supplies only the required synthetic presentation; optional short-name presence stays visible. */
function poolPresentation(): PoolPresentationResponse {
  return {
    id: poolId,

    names: {
      sourceName: "Synthetic pool",
      effectiveName: "Synthetic pool",
      manualName: null,
    },
  };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalApiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  }
});

it.each([
  ["explicit null", null],
  ["three colors", ["#112233", "#aAbBcC", "#778899"]],
])("preserves a division gradient with %s", async (_scenario, gradient) => {
  // Given
  const body = { ...division, gradient };
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  const result = await getDivision(division.id);

  // Then
  expect(result).toStrictEqual(body);
});

it.each([
  ["invalid color", { color: "blue" }],
  ["null color", { color: null }],
  ["omitted gradient", { gradient: undefined }],
  ["short gradient", { gradient: ["#112233", "#445566"] }],
  ["long gradient", { gradient: ["#112233", "#445566", "#778899", "#AABBCC"] }],
  ["null gradient color", { gradient: ["#112233", null, "#778899"] }],
  ["invalid gradient color", { gradient: ["#112233", "blue", "#778899"] }],
])("rejects a division response with %s", async (_scenario, invalid) => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ ...division, ...invalid }), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  const request = getDivision(division.id);

  // Then
  await expect(request).rejects.toMatchObject({ kind: "schema" });
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

it("selects automatic team artwork independently through the generated binary client", async () => {
  // Given
  const teamId = "00000000-0000-4000-8000-000000000193";
  mockFetch.mockResolvedValue(
    new Response("synthetic-image", {
      headers: { "Content-Type": "image/png" },
    }),
  );

  // When
  const image = await getTeamLogo(teamId, { selection: "automatic" });

  // Then
  expect(String(mockFetch.mock.calls[0][0])).toBe(
    `https://api.example.invalid/teams/${teamId}/logo?selection=automatic`,
  );
  expect(image).toBeInstanceOf(Blob);
  expect(await image.text()).toBe("synthetic-image");
});

it("preserves the mapping aggregate and explicit unclassified pool on a generated detail page", async () => {
  // Given
  const body = {
    pack: { ...mappingPack, label: "🏐".repeat(256) },
    items: [
      {
        id: poolId,
        label: "Tour 2",
        mode: "inherited",
        effectiveClassification: null,
      },
    ],
    page: 1,
    hasNext: false,
  };
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  const result = await getMappingPack(mappingPack.id, { page: 1, size: 1 });

  // Then
  const url = new URL(String(mockFetch.mock.calls[0][0]));
  expect(url.pathname).toBe(`/administration/packs/${mappingPack.id}`);
  expect(url.searchParams.get("page")).toBe("1");
  expect(url.searchParams.get("size")).toBe("1");
  expect(result).toStrictEqual(body);
});

it.each([
  { reason: "omitted effective classification", pool: { label: "Tour 2" } },
  {
    reason: "label over the Unicode limit",
    pool: { label: "🏐".repeat(257), effectiveClassification: null },
  },
])("rejects a generated pool response with $reason", async ({ pool }) => {
  // Given
  mockFetch.mockResolvedValue(
    Response.json({
      pack: mappingPack,
      items: [{ id: poolId, mode: "inherited", ...pool }],
      page: 0,
      hasNext: false,
    }),
  );

  // When
  const request = getMappingPack(mappingPack.id);

  // Then
  await expect(request).rejects.toMatchObject({ kind: "schema" });
});

it("keeps a failed Mapping continuation until an explicit retry reads the same page", async () => {
  // Given: a real infinite query and generated client, with one temporary transport failure.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const options = createMappingQueries({
    enabled: true,
    request: async () => ({}),
  }).packs({ seasonId: mappingPack.seasonId }, true);
  const secondPack = {
    ...mappingPack,
    id: "00000000-0000-4000-8000-000000000020",
    label: "N2F",
  };
  mockFetch
    .mockResolvedValueOnce(
      Response.json({ page: 0, hasNext: true, items: [mappingPack] }),
    )
    .mockResolvedValueOnce(Response.json({}, { status: 503 }))
    .mockResolvedValueOnce(
      Response.json({ page: 1, hasNext: false, items: [secondPack] }),
    );
  await client.fetchInfiniteQuery(options);
  const observer = new InfiniteQueryObserver(client, {
    ...options,
    refetchOnMount: false,
  });
  const unsubscribe = observer.subscribe(() => {});

  try {
    // When returning to the app after a failed continuation
    await observer.fetchNextPage();
    client.getQueryCache().onFocus();
    expect(observer.getCurrentResult().isFetchNextPageError).toBe(true);
    expect(observer.getCurrentResult().isFetching).toBe(false);
    expect(observer.getCurrentResult().data?.pages[0].items).toEqual([
      mappingPack,
    ]);

    // Then Retry resumes page 1 and appends it without restarting the traversal.
    const retried = await observer.fetchNextPage();
    expect(retried.data?.pages.map(({ items }) => items[0].label)).toEqual([
      "CFA",
      "N2F",
    ]);
    expect(
      mockFetch.mock.calls.map(([url]) =>
        new URL(String(url)).searchParams.get("page"),
      ),
    ).toEqual(["0", "1", "1"]);
  } finally {
    unsubscribe();
    client.clear();
  }
});
