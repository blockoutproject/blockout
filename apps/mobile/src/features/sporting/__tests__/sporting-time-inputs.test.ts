import type { MatchCalendarResponse } from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { createConsultationQueries } from "../api/consultation-queries";
import {
  formatSportingDay,
  formatSportingSchedule,
} from "../model/sporting-time";
import { matchDetail, sportingId } from "../test-support/consultation-data";

jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
afterEach(() => {
  process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("keeps captured calendar days and continuation inputs while display uses the new zone", async () => {
  // Given: real generated requests/cache; controlled pages are not a calendar UI or database query.
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  const client = createQueryClient();
  const session = createSessionGeneration();
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { request: (options) => options },
    jest.fn(),
  );
  const selection = {
    teamId: sportingId,
    category: "upcoming" as const,
    timeZone: "Europe/Paris",
  };
  const match = matchDetail().match;
  match.schedule = {
    localDate: "2026-09-20",
    instant: "2026-09-20T00:30:00+02:00",
    timeZone: "Europe/Paris",
    observedAt: "2026-09-19T12:00:00Z",
  };
  const page: MatchCalendarResponse = {
    category: "upcoming",
    timeZone: "Europe/Paris",
    evaluatedAt: "2026-09-19T22:45:00Z",
    days: [
      { date: "2026-09-20", pools: [{ poolId: sportingId, matches: [match] }] },
    ],
    nextDay: "2026-09-20",
  };
  mockFetch.mockReset().mockResolvedValueOnce(Response.json(page));
  try {
    const options = queries.calendar(selection);
    const loaded = await client.fetchQuery(options);

    // When: formatting travels, while the retained response supplies the grouping context.
    const displayZone = "America/New_York";
    const now = new Date("2026-09-19T22:45:00Z");
    const formatted = formatSportingSchedule(match.schedule, displayZone, now);
    const groupLabel = formatSportingDay(
      loaded.days[0].date,
      loaded.timeZone,
      now,
    );

    // Then
    expect(formatted).toEqual({
      date: "Aujourd’hui · 19 sept. 2026",
      time: "18:30",
    });
    expect(groupLabel).toBe("Aujourd’hui · 20 sept. 2026");
    expect(client.getQueryData(options.queryKey)).toBe(loaded);
    expect(loaded.days).toEqual(page.days);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // When: explicit continuation keeps the captured zone; a fresh selection can use the new zone.
    mockFetch.mockResolvedValueOnce(
      Response.json({ ...page, days: [], nextDay: undefined }),
    );
    await client.fetchQuery(
      queries.calendar({ ...selection, nextDay: loaded.nextDay }),
    );
    const continuation = new URL(mockFetch.mock.calls[1][0]);

    // Then
    expect(continuation.searchParams.get("timeZone")).toBe("Europe/Paris");
    expect(continuation.searchParams.get("nextDay")).toBe("2026-09-20");
    expect(
      queries.calendar({ ...selection, timeZone: displayZone }).queryKey,
    ).not.toEqual(options.queryKey);
  } finally {
    client.clear();
  }
});
