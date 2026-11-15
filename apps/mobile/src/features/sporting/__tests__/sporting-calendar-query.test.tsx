import type { MatchCalendarResponse } from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "@/shared/query/query-client";
import { createConsultationQueries } from "../api/consultation-queries";
import { calendarDays, createCalendarOptions } from "../api/sporting-calendar";
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
  if (originalUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
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
