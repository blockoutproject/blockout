import {
  InfiniteQueryObserver,
  type InfiniteData,
} from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import type { PersonalMatchCalendarResponse } from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import {
  matchDetail,
  sportingId,
} from "../../sporting/test-support/consultation-data";
import {
  calendarDays,
  refreshCalendar,
} from "../../sporting/api/sporting-calendar";
import { createConsultationQueries } from "../../sporting/api/consultation-queries";
import {
  createFollowOptionsQueryOptions,
  createPersonalCalendarOptions,
  readPersonalSelection,
  type PersonalCalendarRead,
} from "../api/personal-queries";
import type { FollowingOwner } from "../api/following-keys";

jest.mock("expo/fetch", () => ({
  fetch: (url: string, request?: RequestInit) => mockFetch(url, request),
}));
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
const environment = { ...process.env };
const accountId = "00000000-0000-4000-8000-000000000230";
const selection = {
  seasonId: sportingId,
  category: "upcoming",
  timeZone: "Europe/Paris",
} as const;
let client = createQueryClient();
let session = createSessionGeneration();
let owner: FollowingOwner;
const selectSeason = jest.fn();

/** Synthetic current I/O boundary; generated HTTP and one-time validation stay real. */
async function request(signal?: AbortSignal) {
  return { signal, session: owner };
}
/** Real bounded reconciliation with a captured selection, without replacing the query lifecycle. */
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

/** Complete generated envelope, retaining its category-independent explanation alongside F03 days. */
function page(
  date: string,
  id = sportingId,
  nextDay?: string,
): PersonalMatchCalendarResponse {
  return {
    hasAvailableFollows: true,
    calendar: {
      category: "upcoming",
      timeZone: "Europe/Paris",
      evaluatedAt: "2026-10-28T12:00:00Z",
      days: [
        {
          date,
          pools: [
            { poolId: sportingId, matches: [{ ...matchDetail().match, id }] },
          ],
        },
      ],
      ...(nextDay ? { nextDay } : {}),
    },
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

it("uses the exclusive nextDay while caching full validated personal envelopes and deduplicating display rows", async () => {
  // Given
  const options = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
  );
  mockFetch
    .mockResolvedValueOnce(
      Response.json(page("2026-10-29", sportingId, "2026-10-29")),
    )
    .mockResolvedValueOnce(Response.json(page("2026-10-30")));
  const observer = new InfiniteQueryObserver(client, options);
  const close = observer.subscribe(() => {});
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));

  // When
  await observer.fetchNextPage();

  // Then
  const data = observer.getCurrentResult().data;
  expect(data?.pages).toHaveLength(2);
  expect(data?.pages[0].hasAvailableFollows).toBe(true);
  expect(new URL(mockFetch.mock.calls[1][0]).searchParams.get("nextDay")).toBe(
    "2026-10-29",
  );
  expect(
    calendarDays(
      data && { ...data, pages: data.pages.map((value) => value.calendar) },
    ),
  ).toHaveLength(1);
  close();
});

it("retains complete pages on append and unchanged-context refresh failure without declaring exhaustion", async () => {
  // Given
  const options = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
  );
  mockFetch.mockResolvedValueOnce(
    Response.json(page("2026-10-29", sportingId, "2026-10-29")),
  );
  const observer = new InfiniteQueryObserver(client, options);
  const close = observer.subscribe(() => {});
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
  const retained = observer.getCurrentResult().data;
  mockFetch.mockRejectedValue(new TypeError("Synthetic offline transport"));

  // When
  await observer.fetchNextPage();
  await expect(refreshCalendar(client, options)).rejects.toBeDefined();

  // Then
  expect(observer.getCurrentResult().data).toEqual(retained);
  expect(observer.getCurrentResult().hasNextPage).toBe(true);
  expect(mockFetch).toHaveBeenCalledTimes(3);
  close();
});

it("restarts reset visible queries at the first page and defers hidden mounted categories until display", async () => {
  // Given
  const options = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
  );
  const hiddenOptions = createPersonalCalendarOptions(
    owner,
    request,
    { ...selection, category: "completed" },
    read,
  );
  mockFetch.mockImplementation(async () =>
    Response.json(page("2026-10-29", sportingId, "2026-10-29")),
  );
  const visible = new InfiniteQueryObserver(client, options);
  const hidden = new InfiniteQueryObserver(client, {
    ...hiddenOptions,
    enabled: false,
  });
  const close = [visible.subscribe(() => {}), hidden.subscribe(() => {})];
  await waitFor(() => expect(visible.getCurrentResult().isSuccess).toBe(true));
  await visible.fetchNextPage();
  mockFetch.mockClear();

  // When: confirmed-change callbacks use native resetQueries for the same generated collection.
  await client.resetQueries({ queryKey: options.queryKey.slice(0, -1) });

  // Then
  expect(visible.getCurrentResult().data?.pages).toHaveLength(1);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(new URL(mockFetch.mock.calls[0][0]).searchParams.has("nextDay")).toBe(
    false,
  );
  expect(hidden.getCurrentResult().data).toBeUndefined();

  // When
  hidden.setOptions({ ...hiddenOptions, enabled: true });
  await waitFor(() => expect(hidden.getCurrentResult().isSuccess).toBe(true));
  visible.setOptions({ ...options, enabled: false });
  visible.setOptions({ ...options, enabled: true });

  // Then
  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect(new URL(mockFetch.mock.calls[1][0]).searchParams.get("category")).toBe(
    "completed",
  );
  close.forEach((unsubscribe) => unsubscribe());
});

it("cancels a late prior append before a successful first-page replacement", async () => {
  // Given
  const options = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
  );
  const late = Promise.withResolvers<Response>();
  mockFetch
    .mockResolvedValueOnce(
      Response.json(page("2026-10-29", sportingId, "2026-10-29")),
    )
    .mockReturnValueOnce(late.promise);
  const observer = new InfiniteQueryObserver(client, options);
  const close = observer.subscribe(() => {});
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
  const pending = observer.fetchNextPage();
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  mockFetch.mockResolvedValueOnce(Response.json(page("2026-11-01")));

  // When
  await refreshCalendar(client, options);
  late.resolve(Response.json(page("2026-10-30")));
  await pending;

  // Then
  expect(observer.getCurrentResult().data?.pages).toEqual([page("2026-11-01")]);
  close();
});

it("withdraws refused private rows across retained categories before a later offline failure", async () => {
  // Given
  const options = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
  );
  const sibling = createPersonalCalendarOptions(
    owner,
    request,
    { ...selection, category: "completed" },
    read,
  );
  mockFetch.mockImplementation(async () => Response.json(page("2026-10-29")));
  await client.infiniteQuery(options);
  await client.infiniteQuery(sibling);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 403 }));

  // When
  await expect(refreshCalendar(client, options)).rejects.toBeDefined();
  mockFetch.mockRejectedValueOnce(new TypeError("Synthetic offline transport"));
  await expect(refreshCalendar(client, sibling)).rejects.toBeDefined();

  // Then
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
  expect(client.getQueryData(sibling.queryKey)).toBeUndefined();
});

it("rejects a late original-generation response before successful cache admission", async () => {
  // Given
  const options = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
  );
  const late = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(late.promise);
  const pending = client.infiniteQuery(options);
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

  // When
  session.invalidate();
  late.resolve(Response.json(page("2026-10-29")));

  // Then
  await expect(pending).rejects.toMatchObject({ kind: "cancelled" });
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
});

it("rejects an invalid explanation instead of caching an empty success", async () => {
  // Given
  const options = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
  );
  mockFetch.mockResolvedValueOnce(
    Response.json({ calendar: page("2026-10-29").calendar }),
  );

  // When / Then
  await expect(client.infiniteQuery(options)).rejects.toMatchObject({
    kind: "schema",
  });
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
});

it.each([401, 403])(
  "withdraws every cached season after an account-level %i refusal in the same admission context",
  async (status) => {
    // Given
    const options = createPersonalCalendarOptions(
      owner,
      request,
      selection,
      read,
    );
    const anotherSeason = createPersonalCalendarOptions(
      owner,
      request,
      { ...selection, seasonId: "00000000-0000-4000-8000-000000000231" },
      read,
    );
    mockFetch.mockImplementation(async () => Response.json(page("2026-10-29")));
    await client.infiniteQuery(options);
    await client.infiniteQuery(anotherSeason);
    mockFetch.mockResolvedValueOnce(new Response(null, { status }));

    // When
    await expect(refreshCalendar(client, options)).rejects.toBeDefined();

    // Then
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
    expect(client.getQueryData(anotherSeason.queryKey)).toBeUndefined();
  },
);

it("removes a currently refused F03 match from personal pages and cancels a late append in the same admission context", async () => {
  // Given: real generated F03/F06 reads share the original session and root cache.
  session.setAccount(owner.generation, accountId);
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { request: (options) => options },
    jest.fn(),
  );
  const options = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
  );
  const bypass = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
    true,
  );
  const first = page("2026-10-29", sportingId, "2026-10-29");
  const retainedId = "00000000-0000-4000-8000-000000000231";
  first.calendar.days[0].pools[0].matches.push({
    ...matchDetail().match,
    id: retainedId,
  });
  mockFetch.mockImplementation(async () => Response.json(first));
  await client.infiniteQuery(bypass);
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

  // When: the old response ignores abort after the detail establishes a current restriction.
  await expect(client.query(queries.match(sportingId))).rejects.toBeDefined();
  late.resolve(Response.json(page("2026-10-30")));
  await append;

  // Then
  expect(
    observer
      .getCurrentResult()
      .data?.pages[0].calendar.days[0].pools[0].matches.map(
        (match) => match.id,
      ),
  ).toEqual([retainedId]);
  expect(observer.getCurrentResult().data?.pages[0].calendar.nextDay).toBe(
    "2026-10-29",
  );
  expect(observer.getCurrentResult().data?.pages[0].calendar.evaluatedAt).toBe(
    first.calendar.evaluatedAt,
  );
  expect(client.getQueryData(bypass.queryKey)).toEqual({
    pages: [first],
    pageParams: [undefined],
  });
  close();
});

it("removes a currently refused F03 pool from retained personal pages without restoring it through a late append", async () => {
  // Given: real generated reads share the owner; the other admission keeps its own envelope.
  session.setAccount(owner.generation, accountId);
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { request: (options) => options },
    jest.fn(),
  );
  const options = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
  );
  const bypass = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
    true,
  );
  const first = page("2026-10-29", sportingId, "2026-10-30");
  const retainedId = "00000000-0000-4000-8000-000000000231";
  const retainedPool = {
    poolId: retainedId,
    matches: [
      {
        ...matchDetail().match,
        id: retainedId,
        pool: {
          ...matchDetail().match.pool,
          pool: { ...matchDetail().match.pool.pool, id: retainedId },
        },
      },
    ],
  };
  first.calendar.days[0].pools.push(retainedPool);
  first.calendar.days.push(page("2026-10-30").calendar.days[0]);
  mockFetch.mockImplementation(async () => Response.json(first));
  await client.infiniteQuery(bypass);
  const observer = new InfiniteQueryObserver(client, options);
  const close = observer.subscribe(() => {});
  try {
    await waitFor(() =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    );
    const updatedAt = client.getQueryState(options.queryKey)?.dataUpdatedAt;
    const late = Promise.withResolvers<Response>();
    mockFetch.mockReturnValueOnce(late.promise);
    const append = observer.fetchNextPage();
    await waitFor(() =>
      expect(observer.getCurrentResult().isFetchingNextPage).toBe(true),
    );
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

    // When: a current standings refusal precedes an old response that ignores abort.
    await expect(
      client.query(queries.standings(sportingId)),
    ).rejects.toMatchObject({
      status: 404,
    });
    late.resolve(Response.json(page("2026-10-31")));
    await append;

    // Then: only that pool and its now-empty day disappear; attribution and continuation stay exact.
    expect(observer.getCurrentResult().data).toEqual({
      pages: [
        {
          ...first,
          calendar: {
            ...first.calendar,
            days: [{ ...first.calendar.days[0], pools: [retainedPool] }],
          },
        },
      ],
      pageParams: [undefined],
    });
    expect(client.getQueryState(options.queryKey)?.dataUpdatedAt).toBe(
      updatedAt,
    );
    expect(client.getQueryData(bypass.queryKey)).toEqual({
      pages: [first],
      pageParams: [undefined],
    });
    expect(mockFetch).toHaveBeenCalledTimes(4);
  } finally {
    close();
  }
});

it("withdraws all cached seasons after an original-account NotFound without a seasonal selector", async () => {
  // Given
  const seasonal = createPersonalCalendarOptions(
    owner,
    request,
    selection,
    read,
  );
  const all = createPersonalCalendarOptions(
    owner,
    request,
    { ...selection, seasonId: undefined },
    read,
  );
  mockFetch.mockImplementation(async () => Response.json(page("2026-10-29")));
  await client.infiniteQuery(seasonal);
  await client.infiniteQuery(all);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

  // When
  await expect(refreshCalendar(client, all)).rejects.toBeDefined();

  // Then
  expect(client.getQueryData(seasonal.queryKey)).toBeUndefined();
  expect(client.getQueryData(all.queryKey)).toBeUndefined();
});

it.each([sportingId, undefined])(
  "withdraws current unavailable-follow effects from overlapping season/category caches for season %s",
  async (seasonId) => {
    // Given: all selections use real validated envelopes; only HTTP supplies current availability.
    const current = createPersonalCalendarOptions(
      owner,
      request,
      { ...selection, seasonId },
      read,
    );
    const completed = createPersonalCalendarOptions(
      owner,
      request,
      { ...selection, category: "completed" },
      read,
    );
    const otherSeasonId = "00000000-0000-4000-8000-000000000231";
    const other = createPersonalCalendarOptions(
      owner,
      request,
      { ...selection, seasonId: otherSeasonId },
      read,
    );
    const all = createPersonalCalendarOptions(
      owner,
      request,
      { ...selection, seasonId: undefined },
      read,
    );
    const first = page("2026-10-29");
    const another = page("2026-10-30", otherSeasonId);
    const otherMatch = another.calendar.days[0].pools[0].matches[0];
    another.calendar.days[0].pools[0].matches[0] = {
      ...otherMatch,
      pool: {
        ...otherMatch.pool,
        season: { ...otherMatch.pool.season, id: otherSeasonId },
      },
    };
    mockFetch.mockResolvedValueOnce(
      Response.json({
        ...first,
        calendar: {
          ...first.calendar,
          category: "completed",
          nextDay: "2026-10-29",
        },
      }),
    );
    const observer = new InfiniteQueryObserver(client, completed);
    const close = observer.subscribe(() => {});
    await waitFor(() =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    );
    mockFetch.mockResolvedValueOnce(Response.json(another));
    await client.infiniteQuery(other);
    mockFetch.mockResolvedValueOnce(
      Response.json({
        ...first,
        calendar: {
          ...first.calendar,
          days: [...first.calendar.days, ...another.calendar.days],
        },
      }),
    );
    await client.infiniteQuery(all);
    const late = Promise.withResolvers<Response>();
    mockFetch.mockReturnValueOnce(late.promise);
    const append = observer.fetchNextPage();
    await waitFor(() =>
      expect(observer.getCurrentResult().isFetchingNextPage).toBe(true),
    );
    mockFetch.mockResolvedValueOnce(
      Response.json({
        hasAvailableFollows: false,
        calendar: { ...first.calendar, days: [] },
      }),
    );

    // When
    await refreshCalendar(client, current);
    late.resolve(Response.json(first));
    await append;

    // Then
    expect(
      observer
        .getCurrentResult()
        .data?.pages.flatMap((page) => page.calendar.days),
    ).toEqual([]);
    expect(
      observer.getCurrentResult().data?.pages.at(-1)?.hasAvailableFollows,
    ).toBe(false);
    expect(observer.getCurrentResult().isFetchNextPageError).toBe(false);
    const combined = client.getQueryData<
      InfiniteData<PersonalMatchCalendarResponse>
    >(all.queryKey);
    expect(
      combined?.pages.flatMap((page) =>
        page.calendar.days.flatMap((day) =>
          day.pools.flatMap((pool) =>
            pool.matches.map((match) => match.pool.season.id),
          ),
        ),
      ),
    ).toEqual(seasonId ? [otherSeasonId] : []);
    expect(
      client.getQueryData<InfiniteData<PersonalMatchCalendarResponse>>(
        other.queryKey,
      )?.pages[0].calendar.days,
    ).toEqual(seasonId ? another.calendar.days : []);
    close();
  },
);
