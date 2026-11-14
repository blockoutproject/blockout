import { InfiniteQueryObserver } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import type { PersonalMatchCalendarResponse } from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "@/shared/query/query-client";
import {
  matchDetail,
  sportingId,
} from "@/features/sporting/test-support/consultation-data";
import { refreshCalendar } from "@/features/sporting/api/sporting-calendar";
import {
  createFollowOptionsQueryOptions,
  createPersonalCalendarOptions,
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
let owner: FollowingOwner;

/** Synthetic current I/O boundary; generated HTTP and one-time validation stay real. */
async function request(signal?: AbortSignal) {
  return { signal };
}

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

it("uses the exclusive nextDay while caching full validated personal envelopes", async () => {
  // Given
  const options = createPersonalCalendarOptions(owner, request, selection);
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
  close();
});

it("retains complete pages on append and unchanged-context refresh failure without declaring exhaustion", async () => {
  // Given
  const options = createPersonalCalendarOptions(owner, request, selection);
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
  await expect(
    client.fetchInfiniteQuery({ ...options, staleTime: 0 }),
  ).rejects.toBeDefined();

  // Then
  expect(observer.getCurrentResult().data).toEqual(retained);
  expect(observer.getCurrentResult().hasNextPage).toBe(true);
  expect(mockFetch).toHaveBeenCalledTimes(3);
  close();
});

it("restarts reset visible queries at the first page and defers hidden mounted categories until display", async () => {
  // Given
  const options = createPersonalCalendarOptions(owner, request, selection);
  const hiddenOptions = createPersonalCalendarOptions(owner, request, {
    ...selection,
    category: "completed",
  });
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
  const options = createPersonalCalendarOptions(owner, request, selection);
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
  const options = createPersonalCalendarOptions(owner, request, selection);
  const sibling = createPersonalCalendarOptions(owner, request, {
    ...selection,
    category: "completed",
  });
  mockFetch.mockImplementation(async () => Response.json(page("2026-10-29")));
  await client.infiniteQuery(options);
  await client.infiniteQuery(sibling);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 403 }));

  // When
  await expect(
    client.fetchInfiniteQuery({ ...options, staleTime: 0 }),
  ).rejects.toBeDefined();
  mockFetch.mockRejectedValueOnce(new TypeError("Synthetic offline transport"));
  await expect(
    client.fetchInfiniteQuery({ ...sibling, staleTime: 0 }),
  ).rejects.toBeDefined();

  // Then
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
  expect(client.getQueryData(sibling.queryKey)).toBeUndefined();
});

it("rejects an invalid explanation instead of caching an empty success", async () => {
  // Given
  const options = createPersonalCalendarOptions(owner, request, selection);
  mockFetch.mockResolvedValueOnce(
    Response.json({ calendar: page("2026-10-29").calendar }),
  );

  // When
  const calendar = client.infiniteQuery(options);

  // Then
  await expect(calendar).rejects.toMatchObject({
    kind: "schema",
  });
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
});

it.each([401, 403])(
  "withdraws every cached season after an account-level %i refusal in the same admission context",
  async (status) => {
    // Given
    const options = createPersonalCalendarOptions(owner, request, selection);
    const anotherSeason = createPersonalCalendarOptions(owner, request, {
      ...selection,
      seasonId: "00000000-0000-4000-8000-000000000231",
    });
    mockFetch.mockImplementation(async () => Response.json(page("2026-10-29")));
    await client.infiniteQuery(options);
    await client.infiniteQuery(anotherSeason);
    mockFetch.mockResolvedValueOnce(new Response(null, { status }));

    // When
    await expect(
      client.fetchInfiniteQuery({ ...options, staleTime: 0 }),
    ).rejects.toBeDefined();

    // Then
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
    expect(client.getQueryData(anotherSeason.queryKey)).toBeUndefined();
  },
);

it("withdraws all cached seasons after an original-account NotFound without a seasonal selector", async () => {
  // Given
  const seasonal = createPersonalCalendarOptions(owner, request, selection);
  const all = createPersonalCalendarOptions(owner, request, {
    ...selection,
    seasonId: undefined,
  });
  mockFetch.mockImplementation(async () => Response.json(page("2026-10-29")));
  await client.infiniteQuery(seasonal);
  await client.infiniteQuery(all);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

  // When
  await expect(
    client.fetchInfiniteQuery({ ...all, staleTime: 0 }),
  ).rejects.toBeDefined();

  // Then
  expect(client.getQueryData(seasonal.queryKey)).toBeUndefined();
  expect(client.getQueryData(all.queryKey)).toBeUndefined();
});

it("retains other calendar projections after a current category has no available follows", async () => {
  // Given
  const current = createPersonalCalendarOptions(owner, request, selection);
  const completed = createPersonalCalendarOptions(owner, request, {
    ...selection,
    category: "completed",
  });
  const previous = page("2026-10-29");
  mockFetch.mockResolvedValueOnce(Response.json(previous));
  await client.infiniteQuery(current);
  const completedPage = {
    ...previous,
    calendar: { ...previous.calendar, category: "completed" },
  };
  mockFetch.mockResolvedValueOnce(Response.json(completedPage));
  await client.infiniteQuery(completed);
  const empty = {
    hasAvailableFollows: false,
    calendar: { ...previous.calendar, days: [] },
  };
  mockFetch.mockResolvedValueOnce(Response.json(empty));

  // When
  await client.fetchInfiniteQuery({ ...current, staleTime: 0, pages: 1 });

  // Then
  expect(client.getQueryData(current.queryKey)?.pages).toEqual([empty]);
  expect(client.getQueryData(completed.queryKey)?.pages).toEqual([
    completedPage,
  ]);

  // When
  mockFetch.mockResolvedValueOnce(
    Response.json({
      ...empty,
      calendar: { ...empty.calendar, category: "completed" },
    }),
  );
  await client.fetchInfiniteQuery({ ...completed, staleTime: 0, pages: 1 });

  // Then
  expect(
    client.getQueryData(completed.queryKey)?.pages[0].hasAvailableFollows,
  ).toBe(false);
});

it("retains exact and All-seasons calendars when options omit a previously loaded season", async () => {
  // Given
  const exact = createPersonalCalendarOptions(owner, request, selection);
  const all = createPersonalCalendarOptions(owner, request, {
    ...selection,
    seasonId: undefined,
  });
  const previous = page("2026-10-29");
  mockFetch.mockImplementation(async () => Response.json(previous));
  await client.infiniteQuery(exact);
  await client.infiniteQuery(all);
  mockFetch.mockResolvedValueOnce(Response.json({ seasons: [] }));

  // When
  await client.fetchQuery(createFollowOptionsQueryOptions(owner, request));

  // Then
  expect(client.getQueryData(exact.queryKey)?.pages).toEqual([previous]);
  expect(client.getQueryData(all.queryKey)?.pages).toEqual([previous]);
});
