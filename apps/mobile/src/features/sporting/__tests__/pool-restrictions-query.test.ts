import { InfiniteQueryObserver } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import type {
  MatchCalendarResponse,
  PoolStandingsResponse,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { createConsultationQueries } from "../api/consultation-queries";
import { createCalendarOptions } from "../api/sporting-calendar";
import { matchDetail, sportingId } from "../test-support/consultation-data";

jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const otherPool = "00000000-0000-4000-8000-000000002099";
const pool = matchDetail().match.pool;
const table: PoolStandingsResponse = {
  poolId: sportingId,
  availability: "available",
  observedAt: "2026-10-20T12:00:00Z",
  lastAttemptFailed: false,
  columns: [],
  rows: [],
};
let client = createQueryClient();

/** Constructs a distinct real current session; only the HTTP boundary is replaced. */
function publicQueries() {
  const session = createSessionGeneration();
  return createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { request: (options) => options },
    jest.fn(),
  );
}

/** A generated-valid retained day whose sole group belongs to the scenario's exact pool. */
function page(poolId: string): MatchCalendarResponse {
  return {
    category: "upcoming",
    timeZone: "Europe/Paris",
    evaluatedAt: "2026-10-20T12:00:00Z",
    days: [
      {
        date: "2026-11-14",
        pools: [
          {
            poolId,
            matches: [
              {
                ...matchDetail().match,
                pool: { ...pool, pool: { ...pool.pool, id: poolId } },
              },
            ],
          },
        ],
      },
    ],
  };
}

/** Responds from synthetic current facts without sharing consumed Response bodies. */
function reads(url: string) {
  const parsed = new URL(url);
  if (parsed.pathname === "/matches")
    return Promise.resolve(
      Response.json(page(parsed.searchParams.get("poolId") ?? sportingId)),
    );
  if (parsed.pathname.endsWith("/standings"))
    return Promise.resolve(Response.json(table));
  if (parsed.pathname.endsWith("/participants"))
    return Promise.resolve(Response.json({ poolId: sportingId, items: [] }));
  return Promise.resolve(
    Response.json({
      pool: { ...pool, pool: { ...pool.pool, id: sportingId } },
    }),
  );
}

beforeEach(() => {
  client = createQueryClient();
  mockFetch.mockReset().mockImplementation(reads);
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
});
afterEach(() => {
  client.clear();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it.each(["pool", "standings", "participants", "calendar"] as const)(
  "a current %s refusal suppresses the same pool's independent retained reads",
  async (operation) => {
    // Given
    const queries = publicQueries();
    const otherContext = publicQueries();
    const input = {
      poolId: sportingId,
      category: "upcoming" as const,
      timeZone: "Europe/Paris",
    };
    const calendar = createCalendarOptions(queries, input);
    const otherCalendar = createCalendarOptions(queries, {
      ...input,
      poolId: otherPool,
    });
    const original = new InfiniteQueryObserver(client, calendar);
    const unrelated = new InfiniteQueryObserver(client, otherCalendar);
    const closeOriginal = original.subscribe(() => undefined);
    const closeUnrelated = unrelated.subscribe(() => undefined);
    try {
      await waitFor(() =>
        expect(
          original.getCurrentResult().isSuccess &&
            unrelated.getCurrentResult().isSuccess,
        ).toBe(true),
      );
      await client.query(queries.pool(sportingId));
      await client.query(queries.standings(sportingId));
      await client.query(queries.participants(sportingId));
      await client.query(otherContext.standings(sportingId));
      const calls = mockFetch.mock.calls.length;
      mockFetch.mockResolvedValue(Response.json({}, { status: 404 }));

      // When
      let refused: Promise<unknown>;
      switch (operation) {
        case "calendar":
          refused = original.refetch({ throwOnError: true });
          break;
        case "pool":
          refused = client.query({ ...queries.pool(sportingId), staleTime: 0 });
          break;
        case "standings":
          refused = client.query({
            ...queries.standings(sportingId),
            staleTime: 0,
          });
          break;
        case "participants":
          refused = client.query({
            ...queries.participants(sportingId),
            staleTime: 0,
          });
          break;
      }
      await expect(refused).rejects.toMatchObject({ status: 404 });

      // Then
      expect(
        client.getQueryData(queries.pool(sportingId).queryKey),
      ).toBeUndefined();
      expect(
        client.getQueryData(queries.standings(sportingId).queryKey),
      ).toBeUndefined();
      expect(
        client.getQueryData(queries.participants(sportingId).queryKey),
      ).toBeUndefined();
      expect(original.getCurrentResult().data).toBeUndefined();
      expect(original.getCurrentResult().error).toMatchObject({ status: 404 });
      expect(unrelated.getCurrentResult().data?.pages[0]).toEqual(
        page(otherPool),
      );
      expect(
        client.getQueryData(otherContext.standings(sportingId).queryKey),
      ).toEqual(table);
      expect(mockFetch).toHaveBeenCalledTimes(calls + 1);
    } finally {
      closeOriginal();
      closeUnrelated();
    }
  },
);

it("cancels older table and calendar reads before they can republish a refused pool", async () => {
  // Given
  const queries = publicQueries();
  const calendar = createCalendarOptions(queries, {
    poolId: sportingId,
    category: "upcoming",
    timeZone: "Europe/Paris",
  });
  const observer = new InfiniteQueryObserver(client, calendar);
  const close = observer.subscribe(() => undefined);
  try {
    await waitFor(() =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    );
    await client.query(queries.standings(sportingId));
    let finishTable: ((response: Response) => void) | undefined;
    let finishCalendar: ((response: Response) => void) | undefined;
    const signals: AbortSignal[] = [];
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.endsWith("/standings") || new URL(url).pathname === "/matches") {
        if (options?.signal) signals.push(options.signal);
        return new Promise<Response>((resolve) => {
          if (url.endsWith("/standings")) finishTable = resolve;
          else finishCalendar = resolve;
        });
      }
      return Promise.resolve(Response.json({}, { status: 404 }));
    });
    const lateTable = client
      .query({ ...queries.standings(sportingId), staleTime: 0 })
      .catch(() => undefined);
    const lateCalendar = observer.refetch();
    await waitFor(() => {
      expect(finishTable).toBeDefined();
      expect(finishCalendar).toBeDefined();
    });

    // When
    await expect(client.query(queries.pool(sportingId))).rejects.toMatchObject({
      status: 404,
    });
    finishTable?.(Response.json(table));
    finishCalendar?.(Response.json(page(sportingId)));
    await Promise.all([lateTable, lateCalendar]);

    // Then
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(
      client.getQueryData(queries.standings(sportingId).queryKey),
    ).toBeUndefined();
    expect(observer.getCurrentResult().data).toBeUndefined();
  } finally {
    close();
  }
});
