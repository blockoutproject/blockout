import { InfiniteQueryObserver } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import { createQueryClient } from "@/shared/query/query-client";
import { matchDetail } from "@/features/sporting/test-support/consultation-data";
import {
  createFollowListOptions,
  createPersonalCalendarOptions,
  createFollowOptionsQueryOptions,
} from "../api/personal-queries";
import type { FollowingOwner } from "../api/following-keys";
import type { TeamSummaryResponse } from "../../../../.generated/schemas/index.zod";

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
let owner: FollowingOwner;

/** Controlled I/O preparation preserves actual generated transport and session validation. */
async function request(signal?: AbortSignal) {
  return { signal };
}

/** A current public summary; the page's continuation and identities remain explicit in scenarios. */
function team(id: number, name = `Équipe ${id}`): TeamSummaryResponse {
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
  client.setDefaultOptions({ queries: { retry: false } });
  owner = {
    accountId,
    subject: "auth0|original",
  };
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  client.clear();
  process.env = { ...environment };
});

it("traverses the generated nextPage without a total or an implicit replay on populated return", async () => {
  // Given
  const options = createFollowListOptions(owner, request, "team", season.id);
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
  const options = createFollowListOptions(owner, request, "team", undefined);
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
  const options = createFollowListOptions(owner, request, "pool", season.id);
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

it("keeps a seasonal NotFound ordinary without rereading options", async () => {
  // Given
  mockFetch
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(Response.json({ seasons: [] }));
  const options = createFollowListOptions(owner, request, "team", season.id);

  // When
  await expect(client.infiniteQuery(options)).rejects.toBeDefined();

  // Then
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
});

it("withdraws refused retained private lists without turning refusal into empty success", async () => {
  // Given
  const options = createFollowListOptions(owner, request, "team", undefined);
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

it.each([
  ["list", 404],
  ["list", 403],
  ["calendar", 404],
  ["calendar", 403],
] as const)(
  "withdraws retained personal collections after an original-account %s refusal with status %s",
  async (source, status) => {
    // Given
    const teams = createFollowListOptions(owner, request, "team", undefined);
    const pools = createFollowListOptions(owner, request, "pool", season.id);
    const bypassTeams = createFollowListOptions(
      owner,
      request,
      "team",
      undefined,
      true,
    );
    const calendar = createPersonalCalendarOptions(owner, request, {
      category: "upcoming",
      timeZone: "Europe/Paris",
    });
    const bypassCalendar = createPersonalCalendarOptions(
      owner,
      request,
      { category: "upcoming", timeZone: "Europe/Paris" },
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
    mockFetch.mockImplementation(async (url) => {
      if (url.includes("/matches")) {
        return Response.json(calendarPage);
      }
      return Response.json({
        items: url.includes("team-follows")
          ? [team(1)]
          : [
              {
                pool: { id: season.id, name: "Poule" },
                season,
                classification: {},
              },
            ],
      });
    });
    for (const options of [teams, pools, bypassTeams]) {
      await client.infiniteQuery(options);
    }
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

it("retains followed cards after options omit their season until the list's ordinary refresh", async () => {
  // Given: real generated requests share Query; only their HTTP responses are controlled.
  const selected = createFollowListOptions(owner, request, "team", season.id);
  const all = createFollowListOptions(owner, request, "team", undefined);
  const retained = { items: [team(1)], nextPage: 1 };
  mockFetch.mockImplementation(async () => Response.json(retained));
  await client.infiniteQuery(selected);
  await client.infiniteQuery(all);
  mockFetch.mockResolvedValueOnce(Response.json({ seasons: [] }));

  // When
  await client.fetchQuery(createFollowOptionsQueryOptions(owner, request));

  // Then
  expect(client.getQueryData(selected.queryKey)?.pages).toEqual([retained]);
  expect(client.getQueryData(all.queryKey)?.pages).toEqual([retained]);

  // When
  mockFetch.mockResolvedValueOnce(Response.json({ items: [] }));
  await client.fetchInfiniteQuery({ ...all, staleTime: 0, pages: 1 });

  // Then
  expect(client.getQueryData(all.queryKey)?.pages).toEqual([{ items: [] }]);
  expect(client.getQueryData(selected.queryKey)?.pages).toEqual([retained]);
});

it("lets an independent list read complete after a calendar establishes no available follows", async () => {
  // Given
  const selected = createFollowListOptions(owner, request, "team", season.id);
  const response = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(response.promise);
  const list = client.infiniteQuery(selected);
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  mockFetch.mockResolvedValueOnce(
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
    createPersonalCalendarOptions(owner, request, {
      seasonId: season.id,
      category: "upcoming",
      timeZone: "Europe/Paris",
    }),
  );
  response.resolve(Response.json({ items: [team(1)] }));
  await list;

  // Then
  expect(client.getQueryData(selected.queryKey)?.pages).toEqual([
    { items: [team(1)] },
  ]);
  expect(client.getQueryState(selected.queryKey)?.status).toBe("success");
  expect(mockFetch).toHaveBeenCalledTimes(2);
});

it("does not withdraw other seasonal projections after one seasonal NotFound", async () => {
  // Given
  const selected = createFollowListOptions(owner, request, "team", season.id);
  const all = createFollowListOptions(owner, request, "team", undefined);
  mockFetch.mockImplementation(async () => Response.json({ items: [team(1)] }));
  await client.infiniteQuery(selected);
  await client.infiniteQuery(all);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

  // When
  await expect(
    client.fetchInfiniteQuery({ ...selected, staleTime: 0 }),
  ).rejects.toMatchObject({ status: 404 });

  // Then
  expect(client.getQueryState(selected.queryKey)?.status).toBe("error");
  expect(client.getQueryData(all.queryKey)?.pages).toEqual([
    { items: [team(1)] },
  ]);
});
