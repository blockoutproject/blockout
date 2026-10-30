import {
  InfiniteQueryObserver,
  QueryClientProvider,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import type { MatchCalendarResponse } from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { createConsultationQueries } from "../api/consultation-queries";
import {
  calendarDays,
  createCalendarOptions,
  refreshCalendar,
} from "../api/sporting-calendar";
import { matchDetail, sportingId } from "../test-support/consultation-data";
import { useCalendarGrouping } from "../api/use-calendar-grouping";
import { currentSportingTimeZone } from "../model/sporting-time";

jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const selection = {
  teamId: sportingId,
  category: "upcoming" as const,
  timeZone: "Europe/Paris",
};
let client = createQueryClient();
const queries = createConsultationQueries(
  { subject: null, accountId: null },
  { request: (value) => value },
  jest.fn(),
);

/** One complete generated-contract page; the scenario controls continuation and encounter identity. */
function page(
  date: string,
  id = sportingId,
  nextDay?: string,
): MatchCalendarResponse {
  return {
    category: "upcoming",
    timeZone: "Europe/Paris",
    evaluatedAt: "2026-09-19T12:00:00Z",
    days: [
      {
        date,
        pools: [
          { poolId: sportingId, matches: [{ ...matchDetail().match, id }] },
        ],
      },
    ],
    ...(nextDay ? { nextDay } : {}),
  };
}
beforeEach(() => {
  client = createQueryClient();
  client.setQueryDefaults([], { retry: false });
  mockFetch.mockReset();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
});
afterEach(() => {
  client.clear();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("uses native server cursors and refetches every retained page on explicit invalidation", async () => {
  // Given
  const options = createCalendarOptions(queries, selection);
  mockFetch.mockImplementation(async (url: string) =>
    Response.json(
      new URL(url).searchParams.has("nextDay")
        ? page("2026-09-21", "00000000-0000-4000-8000-000000000003")
        : page("2026-09-20", sportingId, "2026-09-20"),
    ),
  );
  const observer = new InfiniteQueryObserver(client, options);
  const close = observer.subscribe(() => {});
  try {
    await waitFor(() =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    );
    await observer.fetchNextPage();

    // When
    await refreshCalendar(client, options);

    // Then
    expect(observer.getCurrentResult().data?.pages).toHaveLength(2);
    expect(
      mockFetch.mock.calls.map(([url]) =>
        new URL(url).searchParams.get("nextDay"),
      ),
    ).toEqual([null, "2026-09-20", null, "2026-09-20"]);
  } finally {
    close();
  }
});

it("retains an unobserved traversal under native cache lifetime and rereads it on entry", async () => {
  // Given
  const options = createCalendarOptions(queries, selection);
  mockFetch.mockImplementation(async () => Response.json(page("2026-09-20")));
  const observer = new InfiniteQueryObserver(client, options);
  const close = observer.subscribe(() => {});
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));

  // When
  close();

  // Then
  expect(client.getQueryData(options.queryKey)).toBeDefined();

  // When
  const reopened = new InfiniteQueryObserver(client, options);
  const closeReopened = reopened.subscribe(() => {});
  try {
    // Then
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  } finally {
    closeReopened();
  }
});

it("retains accepted days and the continuation after an append fails", async () => {
  // Given
  const options = createCalendarOptions(queries, selection);
  mockFetch.mockResolvedValueOnce(
    Response.json(page("2026-09-20", sportingId, "2026-09-20")),
  );
  const observer = new InfiniteQueryObserver(client, options);
  const close = observer.subscribe(() => {});
  try {
    await waitFor(() =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    );
    mockFetch.mockRejectedValueOnce(new TypeError("Unavailable"));

    // When
    await observer.fetchNextPage();

    // Then
    expect(observer.getCurrentResult().isFetchNextPageError).toBe(true);
    expect(observer.getCurrentResult().data?.pages).toHaveLength(1);
    expect(observer.getCurrentResult().hasNextPage).toBe(true);
  } finally {
    close();
  }
});

it("purges this calendar's refused content before a later technical failure", async () => {
  // Given
  const options = createCalendarOptions(queries, selection);
  mockFetch.mockResolvedValueOnce(Response.json(page("2026-09-20")));
  await client.infiniteQuery(options);
  mockFetch.mockResolvedValueOnce(Response.json({}, { status: 403 }));
  await expect(client.infiniteQuery(options)).rejects.toMatchObject({
    status: 403,
  });
  mockFetch.mockResolvedValueOnce(Response.json({}, { status: 503 }));

  // When
  const later = client.infiniteQuery(options);

  // Then
  await expect(later).rejects.toMatchObject({ status: 503 });
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
});

it("keeps benign calendar projections until their own refresh after a detail refusal", async () => {
  // Given
  const options = createCalendarOptions(queries, selection);
  mockFetch.mockResolvedValueOnce(Response.json(page("2026-09-20")));
  await client.infiniteQuery(options);
  mockFetch.mockResolvedValueOnce(Response.json({}, { status: 404 }));

  // When
  await expect(client.query(queries.match(sportingId))).rejects.toMatchObject({
    status: 404,
  });

  // Then
  expect(calendarDays(client.getQueryData(options.queryKey))).toHaveLength(1);

  // When
  mockFetch.mockResolvedValueOnce(
    Response.json({ ...page("2026-09-20"), days: [] }),
  );
  await client.infiniteQuery(options);

  // Then
  expect(calendarDays(client.getQueryData(options.queryKey))).toEqual([]);
});

it("shows ordinary new-zone loading and failure without adopting previous-zone groups", async () => {
  // Given
  const initialZone = currentSportingTimeZone();
  const nextZone = initialZone === "UTC" ? "Europe/Paris" : "UTC";
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (url: string) =>
    new URL(url).searchParams.get("timeZone") === nextZone
      ? response.promise
      : Response.json({ ...page("2026-09-20"), timeZone: initialZone }),
  );
  const { result } = await renderHook(
    () => {
      const grouping = useCalendarGrouping((zone) =>
        createCalendarOptions(queries, { ...selection, timeZone: zone }),
      );
      const calendar = useInfiniteQuery(
        createCalendarOptions(queries, {
          ...selection,
          timeZone: grouping.timeZone,
        }),
      );
      return { ...grouping, calendar };
    },
    {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );
  await waitFor(() => expect(result.current.calendar.isSuccess).toBe(true));

  // When
  await act(async () => result.current.refresh(nextZone));

  // Then
  expect(result.current.timeZone).toBe(nextZone);
  expect(result.current.calendar.isPending).toBe(true);
  expect(result.current.calendar.data).toBeUndefined();

  // When
  await act(async () => response.resolve(Response.json({}, { status: 503 })));

  // Then
  await waitFor(() => expect(result.current.calendar.isError).toBe(true));
  expect(result.current.calendar.data).toBeUndefined();
  expect(
    client.getQueryData(
      createCalendarOptions(queries, { ...selection, timeZone: initialZone })
        .queryKey,
    ),
  ).toBeDefined();
});

it("deduplicates appended identities while preserving server day pool and category order", () => {
  // Given
  const first = page("2026-09-20");
  const duplicate = page("2026-09-21");
  const next = page("2026-09-22", "00000000-0000-4000-8000-000000000003");

  // When
  const days = calendarDays({
    pages: [first, duplicate, next],
    pageParams: [undefined, "2026-09-20", "2026-09-21"],
  });

  // Then
  expect(days.map((day) => day.date)).toEqual(["2026-09-20", "2026-09-22"]);
});
