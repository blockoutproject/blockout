import {
  getTeamFollowState,
  getPoolFollowState,
  replaceTeamFollowState,
  replacePoolFollowState,
  getTeamFollowerCount,
  getPoolFollowerCount,
  getFollowOptions,
  listTeamFollows,
  listPoolFollows,
  listPersonalMatches,
  getListTeamFollowsQueryOptions,
} from "../../../../.generated/mobile";
import {
  ReplaceFollowStateRequest,
  ListTeamFollowsParams,
  ListPoolFollowsParams,
  ListPersonalMatchesParams,
  ListTeamFollows200,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";

const account = "00000000-0000-4000-8000-000000000001";
const target = "00000000-0000-4000-8000-000000000002";
const season = { id: target, label: "2026/2027", startYear: 2026 };
const team = {
  team: { id: target, name: "Étoile", future: true },
  season,
  classification: {},
  professional: false,
};
const pool = {
  pool: { id: target, name: "Tour 01" },
  season,
  classification: {},
};
const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it.each([false, true])(
  "reads and replaces complete boolean state: %s",
  async (following) => {
    // Given: generated calls use the real F13 transport; only HTTP is controlled.
    mockFetch.mockImplementation(async () =>
      Response.json({ following, future: true }),
    );

    // When
    const results = await Promise.all([
      getTeamFollowState(account, target),
      getPoolFollowState(account, target),
      replaceTeamFollowState(account, target, { following }),
      replacePoolFollowState(account, target, { following }),
    ]);

    // Then
    expect(results).toEqual(Array(4).fill({ following }));
    expect(mockFetch.mock.calls.slice(2).map((call) => call[1].body)).toEqual([
      JSON.stringify({ following }),
      JSON.stringify({ following }),
    ]);
  },
);

it.each([{}, { following: null }, { following: "true" }, { following: 1 }])(
  "refuses invalid state before consumer success: %j",
  async (body) => {
    // Given
    mockFetch.mockResolvedValue(Response.json(body));

    // When
    const response = getTeamFollowState(account, target);

    // Then
    await expect(response).rejects.toMatchObject({ kind: "schema" });
  },
);

it.each([
  {},
  { following: null },
  { following: "false" },
  { following: true, extra: 1 },
])("rejects incomplete or additive mutation requests: %j", (body) => {
  // Given / When
  const result = ReplaceFollowStateRequest.strict().safeParse(body);

  // Then
  expect(result.success).toBe(false);
});

it("validates a successful JSON body exactly once", async () => {
  // Given
  mockFetch.mockResolvedValue(Response.json({ items: [team], future: true }));
  const parse = jest.spyOn(ListTeamFollows200, "parse");
  const client = createQueryClient();
  const options = getListTeamFollowsQueryOptions(account);

  // When
  const result = await client.fetchQuery(options);

  // Then
  expect(result.items[0].team.name).toBe("Étoile");
  expect(result.items[0].team).not.toHaveProperty("future");
  expect(result.nextPage).toBeUndefined();
  expect(parse).toHaveBeenCalledTimes(1);
  client.clear();
});

it("reuses sporting season, pool summaries and calendar while preserving omission", async () => {
  // Given
  mockFetch
    .mockResolvedValueOnce(
      Response.json({ items: [pool], nextPage: 107374182 }),
    )
    .mockResolvedValueOnce(
      Response.json({ seasons: [season], defaultSeasonId: target }),
    )
    .mockResolvedValueOnce(Response.json({ seasons: [] }))
    .mockResolvedValueOnce(
      Response.json({
        hasAvailableFollows: false,
        calendar: {
          category: "upcoming",
          timeZone: "Europe/Paris",
          evaluatedAt: "2026-10-24T00:00:00Z",
          days: [],
          future: true,
        },
      }),
    );

  // When
  const pools = await listPoolFollows(account);
  const options = await getFollowOptions(account);
  const empty = await getFollowOptions(account);
  const matches = await listPersonalMatches(account, {
    category: "upcoming",
    timeZone: "Europe/Paris",
  });

  // Then
  expect(pools.items[0]).toEqual(pool);
  expect(pools.nextPage).toBe(107374182);
  expect(options.seasons[0]).toEqual(season);
  expect(options.defaultSeasonId).toBe(target);
  expect(empty.defaultSeasonId).toBeUndefined();
  expect(matches).toEqual({
    hasAvailableFollows: false,
    calendar: {
      category: "upcoming",
      timeZone: "Europe/Paris",
      evaluatedAt: "2026-10-24T00:00:00Z",
      days: [],
    },
  });
  expect(new URL(mockFetch.mock.calls[0][0]).searchParams.has("seasonId")).toBe(
    false,
  );
});

it.each([0, Number.MAX_SAFE_INTEGER])(
  "reads exact public counts: %s",
  async (count) => {
    // Given
    mockFetch.mockImplementation(async () =>
      Response.json({ count, future: true }),
    );

    // When
    const results = await Promise.all([
      getTeamFollowerCount(target),
      getPoolFollowerCount(target),
    ]);

    // Then
    expect(results).toEqual([{ count }, { count }]);
  },
);

it.each([-1, 0.5, "1", null, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid counts without coercion: %j",
  async (count) => {
    // Given
    mockFetch.mockResolvedValue(Response.json({ count }));

    // When
    const result = getTeamFollowerCount(target);

    // Then
    await expect(result).rejects.toMatchObject({ kind: "schema" });
  },
);

it.each([
  { items: Array(21).fill(team) },
  { items: [], nextPage: 0 },
  { items: [], nextPage: 107374183 },
  { items: [], nextPage: 1.5 },
  { items: [], nextPage: "1" },
  { items: [], nextPage: null },
  { items: null },
  { items: [{ ...team, professional: "false" }] },
])("rejects invalid pages before caching: %j", async (body) => {
  // Given
  mockFetch.mockResolvedValue(Response.json(body));
  const client = createQueryClient();
  const options = getListTeamFollowsQueryOptions(account);

  // When
  const response = client.fetchQuery(options);

  // Then
  await expect(response).rejects.toMatchObject({ kind: "schema" });
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
  client.clear();
});

it.each(["team", "pool"] as const)(
  "accepts twenty %s items and the maximum continuation",
  async (kind) => {
    // Given
    mockFetch.mockResolvedValue(
      Response.json({
        items: Array(20).fill(kind === "team" ? team : pool),
        nextPage: 107374182,
      }),
    );

    // When
    const result = await (kind === "team" ? listTeamFollows : listPoolFollows)(
      account,
      { page: 107374182 },
    );

    // Then
    expect(result.items).toHaveLength(20);
    expect(result.nextPage).toBe(107374182);
    expect(new URL(mockFetch.mock.calls[0][0]).searchParams.get("page")).toBe(
      "107374182",
    );
  },
);

it.each([-1, 107374183, 0.5, "1", null])(
  "rejects unsupported request pages: %j",
  (page) => {
    // Given / When
    const results = [ListTeamFollowsParams, ListPoolFollowsParams].map(
      (schema) => schema.strict().safeParse({ page }),
    );

    // Then
    expect(results.every((result) => !result.success)).toBe(true);
  },
);

it.each([{ seasonId: null }, { seasonId: "" }, { future: true }])(
  "rejects invalid list request shapes: %j",
  (params) => {
    // Given / When
    const result = ListTeamFollowsParams.strict().safeParse(params);

    // Then
    expect(result.success).toBe(false);
  },
);

it.each([
  { category: "future", timeZone: "Europe/Paris" },
  { category: "upcoming" },
  { category: "upcoming", timeZone: "Europe/Paris", future: true },
  { category: "upcoming", timeZone: "Europe/Paris", nextDay: null },
])("rejects invalid calendar request shapes: %j", (params) => {
  // Given / When
  const result = ListPersonalMatchesParams.strict().safeParse(params);

  // Then
  expect(result.success).toBe(false);
});

it.each([400, 401, 403, 404, 415, 503])(
  "keeps HTTP %s as a safe error rather than false state",
  async (status) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status,
        }),
        {
          status,
          headers: { "Content-Type": "application/problem+json" },
        },
      ),
    );

    // When
    const result = replaceTeamFollowState(account, target, { following: true });

    // Then
    await expect(result).rejects.toMatchObject({ kind: "http", status });
  },
);

it.each([
  {
    hasAvailableFollows: undefined,
    calendar: {
      category: "upcoming",
      timeZone: "Europe/Paris",
      evaluatedAt: "2026-10-24T00:00:00Z",
      days: [],
    },
  },
  { hasAvailableFollows: null, calendar: {} },
  { hasAvailableFollows: false, calendar: null },
  {
    hasAvailableFollows: true,
    calendar: {
      category: "future",
      timeZone: "Europe/Paris",
      evaluatedAt: "2026-10-24T00:00:00Z",
      days: [],
    },
  },
])("rejects malformed personal calendars before success: %j", async (body) => {
  // Given
  mockFetch.mockResolvedValue(Response.json(body));

  // When
  const response = listPersonalMatches(account, {
    category: "upcoming",
    timeZone: "Europe/Paris",
  });

  // Then
  await expect(response).rejects.toMatchObject({ kind: "schema" });
});

it.each([
  { seasons: null },
  { seasons: [], defaultSeasonId: null },
  { seasons: [{ ...season, startYear: "2026" }] },
])(
  "rejects malformed options without inventing a default: %j",
  async (body) => {
    // Given
    mockFetch.mockResolvedValue(Response.json(body));

    // When
    const response = getFollowOptions(account);

    // Then
    await expect(response).rejects.toMatchObject({ kind: "schema" });
  },
);
