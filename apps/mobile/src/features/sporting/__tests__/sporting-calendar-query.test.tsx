import {
  InfiniteQueryObserver,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import type { MatchCalendarResponse } from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { createConsultationQueries } from "../api/consultation-queries";
import {
  calendarDays,
  createCalendarOptions,
  refreshCalendar,
} from "../api/sporting-calendar";
import { matchDetail, sportingId } from "../test-support/consultation-data";

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
const session = createSessionGeneration();
const queries = createConsultationQueries(
  { ...session.getSnapshot(), isCurrent: session.isCurrent },
  { request: (options) => options },
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
  mockFetch.mockReset();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
});
afterEach(() => {
  client.clear();
  onlineManager.setOnline(true);
  focusManager.setFocused(undefined);
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("retains observed pages through focus reconnect and invalidation without a reread", async () => {
  // Given
  const options = createCalendarOptions(queries, selection);
  mockFetch
    .mockResolvedValueOnce(
      Response.json(page("2026-09-20", sportingId, "2026-09-20")),
    )
    .mockResolvedValueOnce(
      Response.json(page("2026-09-21", "00000000-0000-4000-8000-000000000003")),
    );
  await client.infiniteQuery(options);
  const observer = new InfiniteQueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  await observer.fetchNextPage();

  // When
  focusManager.setFocused(true);
  onlineManager.setOnline(false);
  onlineManager.setOnline(true);
  await client.invalidateQueries({ queryKey: options.queryKey });

  // Then
  expect(observer.getCurrentResult().data?.pages).toHaveLength(2);
  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect(new URL(mockFetch.mock.calls[1][0]).searchParams.get("nextDay")).toBe(
    "2026-09-20",
  );
  unsubscribe();
});

it("discards an unmounted calendar so a new page opening reads a fresh first page", async () => {
  // Given: a retained page keeps its observer; closing it removes the last observer.
  const options = createCalendarOptions(queries, selection);
  mockFetch.mockResolvedValueOnce(Response.json(page("2026-09-20")));
  const first = new InfiniteQueryObserver(client, options);
  const close = first.subscribe(() => {});
  await waitFor(() => expect(first.getCurrentResult().isSuccess).toBe(true));

  // When
  close();
  await waitFor(() =>
    expect(client.getQueryData(options.queryKey)).toBeUndefined(),
  );
  mockFetch.mockResolvedValueOnce(Response.json(page("2026-09-22")));
  const reopened = new InfiniteQueryObserver(client, options);
  const unsubscribe = reopened.subscribe(() => {});

  // Then
  await waitFor(() =>
    expect(reopened.getCurrentResult().data?.pages).toEqual([
      page("2026-09-22"),
    ]),
  );
  expect(mockFetch).toHaveBeenCalledTimes(2);
  unsubscribe();
});

it("suppresses every retained category of a refused selector and cancels its late append", async () => {
  // Given: two visited categories and an unrelated resource in the same session.
  const upcoming = createCalendarOptions(queries, selection);
  const completed = createCalendarOptions(queries, {
    ...selection,
    category: "completed",
  });
  const other = createCalendarOptions(queries, {
    ...selection,
    teamId: "00000000-0000-4000-8000-000000000003",
  });
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve(
      Response.json({
        ...page("2026-09-20", sportingId, "2026-09-20"),
        category: new URL(url).searchParams.get("category"),
      }),
    ),
  );
  const observers = [upcoming, completed, other].map(
    (options) => new InfiniteQueryObserver(client, options),
  );
  const subscriptions = observers.map((observer) =>
    observer.subscribe(() => {}),
  );
  await waitFor(() =>
    observers.forEach((observer) =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    ),
  );
  const late = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(late.promise);
  const pending = observers[1].fetchNextPage();
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));
  mockFetch.mockResolvedValueOnce(Response.json({}, { status: 404 }));

  // When
  await expect(refreshCalendar(client, upcoming)).rejects.toBeDefined();
  late.resolve(Response.json(page("2026-09-21")));
  await pending;

  // Then
  expect(client.getQueryData(upcoming.queryKey)).toBeUndefined();
  expect(client.getQueryData(completed.queryKey)).toBeUndefined();
  expect(client.getQueryData(other.queryKey)).toBeDefined();
  subscriptions.forEach((unsubscribe) => unsubscribe());
});

it("replaces multiple pages with only the successful first-page refresh", async () => {
  // Given
  const options = createCalendarOptions(queries, selection);
  mockFetch
    .mockResolvedValueOnce(
      Response.json(page("2026-09-20", sportingId, "2026-09-20")),
    )
    .mockResolvedValueOnce(
      Response.json(page("2026-09-21", "00000000-0000-4000-8000-000000000003")),
    );
  const observer = new InfiniteQueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
  await observer.fetchNextPage();
  mockFetch.mockResolvedValueOnce(Response.json(page("2026-09-22")));

  // When
  await refreshCalendar(client, options);

  // Then
  expect(observer.getCurrentResult().data?.pages).toEqual([page("2026-09-22")]);
  expect(mockFetch).toHaveBeenCalledTimes(3);
  expect(new URL(mockFetch.mock.calls[2][0]).searchParams.has("nextDay")).toBe(
    false,
  );
  unsubscribe();
});

it("retains authorized pages and continuation on failed append and offline refresh without replay", async () => {
  // Given
  const options = createCalendarOptions(queries, selection);
  mockFetch.mockResolvedValueOnce(
    Response.json(page("2026-09-20", sportingId, "2026-09-20")),
  );
  const observer = new InfiniteQueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
  const retained = observer.getCurrentResult().data;
  mockFetch.mockRejectedValue(new TypeError("Controlled offline transport"));

  // When
  await observer.fetchNextPage();
  onlineManager.setOnline(false);
  await expect(refreshCalendar(client, options)).rejects.toBeDefined();
  onlineManager.setOnline(true);

  // Then
  expect(observer.getCurrentResult().data).toEqual(retained);
  expect(observer.getCurrentResult().hasNextPage).toBe(true);
  expect(observer.getCurrentResult().fetchStatus).toBe("idle");
  expect(mockFetch).toHaveBeenCalledTimes(3);
  unsubscribe();
});

it("cancels old pagination before a replacement and rejects its late completion", async () => {
  // Given
  const options = createCalendarOptions(queries, selection);
  const old = Promise.withResolvers<Response>();
  mockFetch
    .mockResolvedValueOnce(
      Response.json(page("2026-09-20", sportingId, "2026-09-20")),
    )
    .mockReturnValueOnce(old.promise);
  const observer = new InfiniteQueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
  const pending = observer.fetchNextPage();
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  mockFetch.mockResolvedValueOnce(Response.json(page("2026-09-22")));

  // When
  await refreshCalendar(client, options);
  old.resolve(Response.json(page("2026-09-21")));
  await pending;

  // Then
  expect(observer.getCurrentResult().data?.pages).toEqual([page("2026-09-22")]);
  unsubscribe();
});

it("removes known forbidden data before a later transport failure can redisplay it", async () => {
  // Given
  const options = createCalendarOptions(queries, selection);
  mockFetch.mockResolvedValueOnce(Response.json(page("2026-09-20")));
  await client.infiniteQuery(options);
  mockFetch.mockResolvedValueOnce(Response.json({}, { status: 404 }));

  // When
  await expect(refreshCalendar(client, options)).rejects.toBeDefined();
  mockFetch.mockRejectedValueOnce(new TypeError("offline"));
  await expect(refreshCalendar(client, options)).rejects.toBeDefined();

  // Then
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
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

it.each(["resource", "season", "category", "session"] as const)(
  "rejects an obsolete traversal after a %s context change",
  async (change) => {
    // Given: real observers/generated transport; the old network peer deliberately ignores abort.
    const generation = createSessionGeneration();
    const captured = createConsultationQueries(
      { ...generation.getSnapshot(), isCurrent: generation.isCurrent },
      { request: (options) => options },
      jest.fn(),
    );
    const initial = {
      clubId: sportingId,
      seasonId: sportingId,
      category: "upcoming" as const,
      timeZone: "Europe/Paris",
    };
    const old = Promise.withResolvers<Response>();
    mockFetch.mockReturnValueOnce(old.promise);
    const first = createCalendarOptions(captured, initial);
    const observer = new InfiniteQueryObserver(client, first);
    const unsubscribe = observer.subscribe(() => {});
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    if (change === "session") generation.invalidate();
    const current = createConsultationQueries(
      { ...generation.getSnapshot(), isCurrent: generation.isCurrent },
      { request: (options) => options },
      jest.fn(),
    );
    const next = createCalendarOptions(current, {
      ...initial,
      ...(change === "resource"
        ? { clubId: "00000000-0000-4000-8000-000000000003" }
        : {}),
      ...(change === "season"
        ? { seasonId: "00000000-0000-4000-8000-000000000003" }
        : {}),
      ...(change === "category" ? { category: "completed" as const } : {}),
    });
    const replacement = {
      ...page("2026-09-22"),
      category:
        change === "category" ? ("completed" as const) : ("upcoming" as const),
    };
    mockFetch.mockResolvedValueOnce(Response.json(replacement));

    // When
    observer.setOptions(next);
    await client.infiniteQuery(next);
    old.resolve(Response.json(page("2026-09-20")));

    // Then
    await waitFor(() =>
      expect(observer.getCurrentResult().data?.pages).toEqual([replacement]),
    );
    expect(first.queryKey).not.toEqual(next.queryKey);
    unsubscribe();
  },
);
