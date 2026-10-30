import { createConsultationQueries } from "../../sporting/api/consultation-queries";
import { InfiniteQueryObserver } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { matchDetail } from "../../sporting/test-support/consultation-data";
import {
  createFollowListOptions,
  createPersonalCalendarOptions,
  createFollowOptionsQueryOptions,
  readPersonalSelection,
  type PersonalCalendarRead,
} from "../api/personal-queries";
import type { FollowingOwner } from "../api/following-keys";

jest.mock("expo/fetch", () => ({
  fetch: (url: string, request?: RequestInit) => mockFetch(url, request),
}));
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
const environment = { ...process.env };
const accountId = "00000000-0000-4000-8000-000000000229";
const season = {
  id: "00000000-0000-4000-8000-000000000001",
  label: "2026/2027",
  startYear: 2026,
};
let client = createQueryClient();
let session = createSessionGeneration();
let owner: FollowingOwner;
const selectSeason = jest.fn();

/** Controlled I/O preparation preserves actual generated transport and session validation. */
async function request(signal?: AbortSignal) {
  return { signal, session: owner };
}
/** Exercises the same bounded season reconciliation used by the personal space. */
const read: PersonalCalendarRead = (seasonId, signal, operation, currentKey) =>
  readPersonalSelection(
    {
      client,
      owner,
      seasonId,
      signal,
      options: createFollowOptionsQueryOptions(owner, request),
      currentKey,
      isCurrent: () => true,
      selectSeason,
    },
    operation,
  );

/** A current public summary; the page's continuation and identities remain explicit in scenarios. */
function team(id: number, name = `Équipe ${id}`) {
  return {
    team: {
      id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
      name,
    },
    season,
    classification: {},
    professional: false,
  };
}

beforeEach(() => {
  client = createQueryClient();
  session = createSessionGeneration();
  owner = {
    accountId,
    generation: session.getSnapshot().generation,
    isCurrent: session.isCurrent,
  };
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
  selectSeason.mockReset();
});
afterEach(() => {
  client.clear();
  process.env = { ...environment };
});

it("traverses the generated nextPage without a total or an implicit replay on populated return", async () => {
  // Given
  const options = createFollowListOptions(
    owner,
    request,
    "team",
    season.id,
    read,
  );
  mockFetch
    .mockResolvedValueOnce(
      Response.json({
        items: Array.from({ length: 20 }, (_, index) => team(index + 1)),
        nextPage: 1,
      }),
    )
    .mockResolvedValueOnce(Response.json({ items: [team(21)] }));
  const observer = new InfiniteQueryObserver(client, {
    ...options,
    enabled: false,
  });
  const close = observer.subscribe(() => {});
  expect(mockFetch).not.toHaveBeenCalled();

  // When
  observer.setOptions({ ...options, enabled: true });
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
  await observer.fetchNextPage();
  observer.setOptions({ ...options, enabled: false });
  observer.setOptions({ ...options, enabled: true });

  // Then
  expect(observer.getCurrentResult().data?.pages).toHaveLength(2);
  expect(observer.getCurrentResult().hasNextPage).toBe(false);
  expect(
    mockFetch.mock.calls.map(([url]) => [
      new URL(url).searchParams.get("page"),
      new URL(url).searchParams.get("seasonId"),
    ]),
  ).toEqual([
    ["0", season.id],
    ["1", season.id],
  ]);
  close();
});

it("keeps prior pages and the exact failed continuation for explicit retry", async () => {
  // Given
  const options = createFollowListOptions(
    owner,
    request,
    "team",
    undefined,
    read,
  );
  mockFetch
    .mockResolvedValueOnce(Response.json({ items: [team(1)], nextPage: 1 }))
    .mockRejectedValueOnce(new TypeError("Synthetic append outage"))
    .mockResolvedValueOnce(Response.json({ items: [team(2)] }));
  const observer = new InfiniteQueryObserver(client, options);
  const close = observer.subscribe(() => {});
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));

  // When
  await observer.fetchNextPage();

  // Then
  expect(observer.getCurrentResult().isFetchNextPageError).toBe(true);
  expect(observer.getCurrentResult().data?.pages).toEqual([
    { items: [team(1)], nextPage: 1 },
  ]);
  expect(observer.getCurrentResult().hasNextPage).toBe(true);

  // When
  await observer.fetchNextPage();

  // Then
  expect(observer.getCurrentResult().data?.pages).toHaveLength(2);
  expect(
    mockFetch.mock.calls.map(([url]) => new URL(url).searchParams.get("page")),
  ).toEqual(["0", "1", "1"]);
  expect(
    mockFetch.mock.calls.every(
      ([url]) => !new URL(url).searchParams.has("seasonId"),
    ),
  ).toBe(true);
  close();
});

it("defers a reset hidden list and starts at page zero when displayed", async () => {
  // Given
  const options = createFollowListOptions(
    owner,
    request,
    "pool",
    season.id,
    read,
  );
  mockFetch.mockImplementation(async () =>
    Response.json({
      items: [
        {
          pool: { id: season.id, name: "Poule A" },
          season,
          classification: {},
        },
      ],
      nextPage: 1,
    }),
  );
  const observer = new InfiniteQueryObserver(client, options);
  const close = observer.subscribe(() => {});
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
  await observer.fetchNextPage();
  observer.setOptions({ ...options, enabled: false });
  mockFetch.mockClear();

  // When
  await client.resetQueries({ queryKey: options.queryKey });

  // Then
  expect(mockFetch).not.toHaveBeenCalled();
  expect(observer.getCurrentResult().data).toBeUndefined();

  // When
  observer.setOptions({ ...options, enabled: true });
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));

  // Then
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(new URL(mockFetch.mock.calls[0][0]).searchParams.get("page")).toBe(
    "0",
  );
  expect(observer.getCurrentResult().data?.pages).toHaveLength(1);
  close();
});

it("rereads seasonal options once on NotFound and changes only an established unavailable season", async () => {
  // Given
  mockFetch
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(Response.json({ seasons: [] }));
  const options = createFollowListOptions(
    owner,
    request,
    "team",
    season.id,
    read,
  );

  // When
  await expect(client.infiniteQuery(options)).rejects.toBeDefined();

  // Then
  expect(selectSeason).toHaveBeenCalledWith(undefined);
  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
});

it("withdraws refused retained private lists without turning refusal into empty success", async () => {
  // Given
  const options = createFollowListOptions(
    owner,
    request,
    "team",
    undefined,
    read,
  );
  mockFetch.mockResolvedValueOnce(Response.json({ items: [team(1)] }));
  await client.infiniteQuery(options);
  mockFetch.mockResolvedValue(new Response(null, { status: 403 }));

  // When
  await expect(
    client.infiniteQuery({ ...options, staleTime: 0, pages: 1 }),
  ).rejects.toBeDefined();

  // Then
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
  expect(client.getQueryState(options.queryKey)?.status).toBe("error");
});

it.each(["append", "refresh"] as const)(
  "applies current F03 refusal to the exact retained identity while cancelling an older %s",
  async (operation) => {
    // Given
    session.setAccount(owner.generation, accountId);
    const queries = createConsultationQueries(
      { ...session.getSnapshot(), isCurrent: session.isCurrent },
      { request: (options) => options },
      jest.fn(),
    );
    const options = createFollowListOptions(
      owner,
      request,
      "team",
      season.id,
      read,
    );
    const first = { items: [team(1), team(2)], nextPage: 1 };
    mockFetch.mockImplementation(async () => Response.json(first));
    const observer = new InfiniteQueryObserver(client, options);
    const close = observer.subscribe(() => {});
    await waitFor(() =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    );
    const late = Promise.withResolvers<Response>();
    mockFetch.mockReturnValueOnce(late.promise);
    const pending =
      operation === "append" ? observer.fetchNextPage() : observer.refetch();
    await waitFor(() =>
      expect(observer.getCurrentResult().isFetching).toBe(true),
    );
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

    // When
    await expect(
      client.query(queries.team(team(1).team.id)),
    ).rejects.toMatchObject({ status: 404 });
    late.resolve(Response.json({ items: [team(1), team(3)] }));
    await pending;

    // Then
    expect(observer.getCurrentResult().data?.pages).toEqual([
      { items: [team(2)], nextPage: 1 },
    ]);
    expect(observer.getCurrentResult().status).toBe("success");
    expect(observer.getCurrentResult().hasNextPage).toBe(true);
    close();
  },
);

it.each([
  ["list", 404],
  ["list", 403],
  ["calendar", 404],
  ["calendar", 403],
] as const)(
  "withdraws retained personal collections after an original-account %s refusal with status %s",
  async (source, status) => {
    // Given
    const teams = createFollowListOptions(
      owner,
      request,
      "team",
      undefined,
      read,
    );
    const pools = createFollowListOptions(
      owner,
      request,
      "pool",
      season.id,
      read,
    );
    const bypassTeams = createFollowListOptions(
      owner,
      request,
      "team",
      undefined,
      read,
      true,
    );
    const calendar = createPersonalCalendarOptions(
      owner,
      request,
      { category: "upcoming", timeZone: "Europe/Paris" },
      read,
    );
    const bypassCalendar = createPersonalCalendarOptions(
      owner,
      request,
      { category: "upcoming", timeZone: "Europe/Paris" },
      read,
      true,
    );
    const match = matchDetail().match;
    const calendarPage = {
      hasAvailableFollows: true,
      calendar: {
        category: "upcoming",
        timeZone: "Europe/Paris",
        evaluatedAt: "2026-10-29T12:00:00Z",
        days: [
          {
            date: "2026-10-30",
            pools: [{ poolId: match.pool.pool.id, matches: [match] }],
          },
        ],
      },
    };
    mockFetch.mockImplementation(async (url) =>
      Response.json(
        url.includes("/matches")
          ? calendarPage
          : {
              items: url.includes("team-follows")
                ? [team(1)]
                : [
                    {
                      pool: { id: season.id, name: "Poule" },
                      season,
                      classification: {},
                    },
                  ],
            },
      ),
    );
    for (const options of [teams, pools, bypassTeams])
      await client.infiniteQuery(options);
    await client.infiniteQuery(calendar);
    await client.infiniteQuery(bypassCalendar);
    mockFetch.mockImplementation(async () => new Response(null, { status }));

    // When
    await expect(
      source === "list"
        ? client.infiniteQuery({ ...teams, staleTime: 0, pages: 1 })
        : client.infiniteQuery({ ...calendar, staleTime: 0, pages: 1 }),
    ).rejects.toBeDefined();

    // Then
    for (const options of [teams, pools, calendar]) {
      expect(client.getQueryData(options.queryKey)).toBeUndefined();
      expect(client.getQueryState(options.queryKey)?.status).toBe("error");
    }
    expect(client.getQueryData(bypassTeams.queryKey)?.pages[0].items).toEqual([
      team(1),
    ]);
    expect(client.getQueryData(bypassCalendar.queryKey)?.pages).toEqual([
      calendarPage,
    ]);
  },
);

it("withdraws a confirmed missing season from retained All-seasons lists before selecting the fallback", async () => {
  // Given
  const otherSeason = {
    id: "00000000-0000-4000-8000-000000000002",
    label: "2025/2026",
    startYear: 2025,
  };
  const currentTeam = team(1);
  const historicalTeam = { ...team(2), season: otherSeason };
  const currentPool = {
    pool: { id: season.id, name: "Poule A" },
    season,
    classification: {},
  };
  const historicalPool = {
    ...currentPool,
    pool: { id: otherSeason.id, name: "Poule B" },
    season: otherSeason,
  };
  const selected = createFollowListOptions(
    owner,
    request,
    "team",
    season.id,
    read,
  );
  const allTeams = createFollowListOptions(
    owner,
    request,
    "team",
    undefined,
    read,
  );
  const allPools = createFollowListOptions(
    owner,
    request,
    "pool",
    undefined,
    read,
  );
  const bypassTeams = createFollowListOptions(
    owner,
    request,
    "team",
    undefined,
    read,
    true,
  );
  const bypassPools = createFollowListOptions(
    owner,
    request,
    "pool",
    undefined,
    read,
    true,
  );
  mockFetch.mockImplementation(async (url) =>
    Response.json({
      items: url.includes("pool-follows")
        ? [currentPool, historicalPool]
        : new URL(url).searchParams.has("seasonId")
          ? [currentTeam]
          : [currentTeam, historicalTeam],
      nextPage: 1,
    }),
  );
  for (const options of [
    selected,
    allTeams,
    allPools,
    bypassTeams,
    bypassPools,
  ])
    await client.infiniteQuery(options);
  let itemsAtFallback: unknown;
  selectSeason.mockImplementation(() => {
    itemsAtFallback = [
      client.getQueryData(allTeams.queryKey)?.pages[0].items,
      client.getQueryData(allPools.queryKey)?.pages[0].items,
    ];
  });
  mockFetch.mockClear();
  mockFetch
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(Response.json({ seasons: [otherSeason] }));

  // When
  await expect(
    client.infiniteQuery({ ...selected, staleTime: 0, pages: 1 }),
  ).rejects.toBeDefined();

  // Then
  expect(selectSeason).toHaveBeenCalledWith(undefined);
  expect(itemsAtFallback).toEqual([[historicalTeam], [historicalPool]]);
  expect(client.getQueryData(selected.queryKey)?.pages[0].items).toEqual([]);
  const reopened = new InfiniteQueryObserver(client, {
    ...selected,
    enabled: (query) => query.state.status !== "error",
  });
  const close = reopened.subscribe(() => {});
  expect(reopened.getCurrentResult().data?.pages[0].items).toEqual([]);
  close();
  expect(client.getQueryData(allTeams.queryKey)?.pages[0]).toEqual({
    items: [historicalTeam],
    nextPage: 1,
  });
  expect(client.getQueryData(allPools.queryKey)?.pages[0]).toEqual({
    items: [historicalPool],
    nextPage: 1,
  });
  expect(client.getQueryData(bypassTeams.queryKey)?.pages[0].items).toEqual([
    currentTeam,
    historicalTeam,
  ]);
  expect(client.getQueryData(bypassPools.queryKey)?.pages[0].items).toEqual([
    currentPool,
    historicalPool,
  ]);
  expect(mockFetch).toHaveBeenCalledTimes(2);
});

it("withdraws the source calendar when a seasonal NotFound establishes disappearance", async () => {
  // Given
  const calendar = createPersonalCalendarOptions(
    owner,
    request,
    { seasonId: season.id, category: "upcoming", timeZone: "Europe/Paris" },
    read,
  );
  const match = matchDetail().match;
  mockFetch.mockResolvedValueOnce(
    Response.json({
      hasAvailableFollows: true,
      calendar: {
        category: "upcoming",
        timeZone: "Europe/Paris",
        evaluatedAt: "2026-10-29T12:00:00Z",
        days: [
          {
            date: "2026-10-30",
            pools: [{ poolId: match.pool.pool.id, matches: [match] }],
          },
        ],
      },
    }),
  );
  await client.infiniteQuery(calendar);
  mockFetch
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(Response.json({ seasons: [] }));

  // When
  await expect(
    client.infiniteQuery({ ...calendar, staleTime: 0, pages: 1 }),
  ).rejects.toBeDefined();

  // Then
  expect(selectSeason).toHaveBeenCalledWith(undefined);
  expect(
    client.getQueryData(calendar.queryKey)?.pages[0].calendar.days,
  ).toEqual([]);
});

it("rejects a late response from a retired account generation", async () => {
  // Given
  const late = Promise.withResolvers<Response>();
  mockFetch.mockReturnValue(late.promise);
  const options = createFollowListOptions(
    owner,
    request,
    "team",
    season.id,
    read,
  );
  const pending = client.infiniteQuery(options);
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

  // When
  session.invalidate();
  late.resolve(Response.json({ items: [team(1)] }));

  // Then
  await expect(pending).rejects.toMatchObject({ kind: "cancelled" });
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
});

it.each([undefined, season.id])(
  "withdraws retained list applicability after a successful calendar absence for %s",
  async (absentSeason) => {
    // Given: both resource families and overlapping seasonal selections use real generated requests.
    const otherSeason = {
      id: "00000000-0000-4000-8000-000000000002",
      label: "2025/2026",
      startYear: 2025,
    };
    const selected = createFollowListOptions(
      owner,
      request,
      "team",
      season.id,
      read,
    );
    const all = createFollowListOptions(
      owner,
      request,
      "team",
      undefined,
      read,
    );
    const pools = createFollowListOptions(
      owner,
      request,
      "pool",
      season.id,
      read,
    );
    const other = createFollowListOptions(
      owner,
      request,
      "team",
      otherSeason.id,
      read,
    );
    const bypass = createFollowListOptions(
      owner,
      request,
      "team",
      season.id,
      read,
      true,
    );
    const currentTeam = team(1);
    const historical = { ...team(2), season: otherSeason };
    mockFetch.mockImplementation(async (url) =>
      Response.json({
        items: url.includes("pool-follows")
          ? [
              {
                pool: { id: season.id, name: "Poule A" },
                season,
                classification: {},
              },
            ]
          : new URL(url).searchParams.get("seasonId") === season.id
            ? [currentTeam]
            : new URL(url).searchParams.get("seasonId") === otherSeason.id
              ? [historical]
              : [currentTeam, historical],
        nextPage: 1,
      }),
    );
    for (const options of [selected, all, pools, other, bypass])
      await client.infiniteQuery(options);
    const observer = new InfiniteQueryObserver(client, {
      ...selected,
      enabled: false,
    });
    const close = observer.subscribe(() => {});
    mockFetch.mockImplementation(async () =>
      Response.json({
        hasAvailableFollows: false,
        calendar: {
          category: "upcoming",
          timeZone: "Europe/Paris",
          evaluatedAt: "2026-10-29T12:00:00Z",
          days: [],
        },
      }),
    );

    // When
    await client.infiniteQuery(
      createPersonalCalendarOptions(
        owner,
        request,
        {
          seasonId: absentSeason,
          category: "upcoming",
          timeZone: "Europe/Paris",
        },
        read,
      ),
    );
    mockFetch.mockClear();
    observer.setOptions({ ...selected, enabled: true });

    // Then: returning shows established absence without resurrecting hidden summaries or replaying reads.
    expect(observer.getCurrentResult().data?.pages[0]).toEqual({
      items: [],
      nextPage: undefined,
    });
    expect(observer.getCurrentResult().status).toBe("success");
    expect(client.getQueryData(pools.queryKey)?.pages[0].items).toEqual([]);
    expect(client.getQueryData(all.queryKey)?.pages[0].items).toEqual(
      absentSeason ? [historical] : [],
    );
    expect(client.getQueryData(other.queryKey)?.pages[0].items).toEqual(
      absentSeason ? [historical] : [],
    );
    expect(client.getQueryData(bypass.queryKey)?.pages[0].items).toEqual([
      currentTeam,
    ]);
    expect(mockFetch).not.toHaveBeenCalled();
    close();
  },
);

it("keeps initial list reads retryable when a late hidden calendar establishes absence", async () => {
  // Given: the calendar starts before the visible tab changes to Following.
  const calendarResponse = Promise.withResolvers<Response>();
  const teamResponse = Promise.withResolvers<Response>();
  const poolResponse = Promise.withResolvers<Response>();
  mockFetch
    .mockReturnValueOnce(calendarResponse.promise)
    .mockReturnValueOnce(teamResponse.promise)
    .mockReturnValueOnce(poolResponse.promise);
  const calendarOptions = createPersonalCalendarOptions(
    owner,
    request,
    { seasonId: season.id, category: "upcoming", timeZone: "Europe/Paris" },
    read,
  );
  const calendar = new InfiniteQueryObserver(client, calendarOptions);
  const closeCalendar = calendar.subscribe(() => {});
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  calendar.setOptions({ ...calendarOptions, enabled: false });
  const teams = new InfiniteQueryObserver(
    client,
    createFollowListOptions(owner, request, "team", season.id, read),
  );
  const pools = new InfiniteQueryObserver(
    client,
    createFollowListOptions(owner, request, "pool", season.id, read),
  );
  const closeTeams = teams.subscribe(() => {});
  const closePools = pools.subscribe(() => {});
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));

  // When: the unchanged season accepts the late calendar without available follows.
  calendarResponse.resolve(
    Response.json({
      hasAvailableFollows: false,
      calendar: {
        category: "upcoming",
        timeZone: "Europe/Paris",
        evaluatedAt: "2026-10-29T12:00:00Z",
        days: [],
      },
    }),
  );

  // Then: cancelled initial reads expose ordinary retry, not permanent pending or invented emptiness.
  await waitFor(() => expect(calendar.getCurrentResult().isSuccess).toBe(true));
  for (const observer of [teams, pools]) {
    expect(observer.getCurrentResult().status).toBe("error");
    expect(observer.getCurrentResult().fetchStatus).toBe("idle");
    expect(observer.getCurrentResult().data).toBeUndefined();
  }
  expect(mockFetch).toHaveBeenCalledTimes(3);

  // When: the existing read-error control explicitly retries each independent collection.
  teamResponse.resolve(Response.json({ items: [team(1)] }));
  poolResponse.resolve(Response.json({ items: [] }));
  mockFetch.mockImplementation(async () => Response.json({ items: [] }));
  await Promise.all([teams.refetch(), pools.refetch()]);

  // Then: only those explicit retries admit current empty pages; old responses cannot reappear.
  for (const observer of [teams, pools]) {
    expect(observer.getCurrentResult().status).toBe("success");
    expect(observer.getCurrentResult().data?.pages).toEqual([{ items: [] }]);
  }
  expect(mockFetch).toHaveBeenCalledTimes(5);
  closeCalendar();
  closeTeams();
  closePools();
});

it("keeps an initial follow list retryable after a current team-detail refusal", async () => {
  // Given: the first list read is still pending when its current team becomes unavailable.
  session.setAccount(owner.generation, accountId);
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { request: (options) => options },
    jest.fn(),
  );
  const late = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(late.promise);
  const observer = new InfiniteQueryObserver(
    client,
    createFollowListOptions(owner, request, "team", season.id, read),
  );
  const close = observer.subscribe(() => {});
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

  // When
  await expect(
    client.query(queries.team(team(1).team.id)),
  ).rejects.toMatchObject({
    status: 404,
  });

  // Then: there is no accepted page to revert to, so the read must expose retry.
  expect(observer.getCurrentResult().status).toBe("error");
  expect(observer.getCurrentResult().fetchStatus).toBe("idle");
  expect(observer.getCurrentResult().data).toBeUndefined();
  expect(mockFetch).toHaveBeenCalledTimes(2);

  // When
  late.resolve(Response.json({ items: [team(1)] }));
  mockFetch.mockResolvedValueOnce(Response.json({ items: [team(2)] }));
  await observer.refetch();

  // Then: explicit retry cannot resurrect the refused identity from the cancelled response.
  expect(observer.getCurrentResult().data?.pages).toEqual([
    { items: [team(2)] },
  ]);
  expect(mockFetch).toHaveBeenCalledTimes(3);
  close();
});
