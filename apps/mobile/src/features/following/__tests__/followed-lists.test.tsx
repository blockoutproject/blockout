import { createConsultationQueries } from "../../sporting/api/consultation-queries";
import { InfiniteQueryObserver } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import {
  createFollowListOptions,
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
const read: PersonalCalendarRead = (seasonId, signal, operation) =>
  readPersonalSelection(
    {
      client,
      owner,
      seasonId,
      signal,
      options: createFollowOptionsQueryOptions(owner, request),
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

it("applies current F03 refusal to the exact retained identity and rejects an older append", async () => {
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
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
  const late = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(late.promise);
  const append = observer.fetchNextPage();
  await waitFor(() =>
    expect(observer.getCurrentResult().isFetchingNextPage).toBe(true),
  );
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

  // When
  await expect(
    client.query(queries.team(team(1).team.id)),
  ).rejects.toMatchObject({ status: 404 });
  late.resolve(Response.json({ items: [team(1), team(3)] }));
  await append;

  // Then
  expect(observer.getCurrentResult().data?.pages).toEqual([
    { items: [team(2)], nextPage: 1 },
  ]);
  close();
});

it("withdraws both retained collections after an original-account NotFound without a season", async () => {
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
  mockFetch.mockImplementation(async (url) =>
    Response.json({
      items: url.includes("team-follows")
        ? [team(1)]
        : [
            {
              pool: { id: season.id, name: "Poule" },
              season,
              classification: {},
            },
          ],
    }),
  );
  await client.infiniteQuery(teams);
  await client.infiniteQuery(pools);
  mockFetch.mockImplementation(async () => new Response(null, { status: 404 }));

  // When
  await expect(
    client.infiniteQuery({ ...teams, staleTime: 0, pages: 1 }),
  ).rejects.toBeDefined();

  // Then
  expect(client.getQueryData(teams.queryKey)).toBeUndefined();
  expect(client.getQueryData(pools.queryKey)).toBeUndefined();
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
