import { QueryObserver } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import type { PoolStandingsResponse } from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { createConsultationQueries } from "../api/consultation-queries";
import { sportingId } from "../test-support/consultation-data";

jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const table: PoolStandingsResponse = {
  poolId: sportingId,
  availability: "available",
  observedAt: "2026-10-20T12:00:00Z",
  lastAttemptFailed: false,
  columns: ["Ratio", "Pts"],
  rows: [
    {
      sourceName: "Official row",
      position: 7,
      statistics: { Ratio: "∞" },
      team: { id: sportingId, name: "Team" },
    },
  ],
};
let client = createQueryClient();

/** Captures a real current session and ordinary admission while controlling only HTTP. */
function publicQueries() {
  const session = createSessionGeneration();
  return createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { request: (options) => options },
    jest.fn(),
  );
}

beforeEach(() => {
  client = createQueryClient();
  mockFetch.mockReset();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
});
afterEach(() => {
  client.clear();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it.each([false, true])(
  "rereads a newly opened table after prior failure=%s",
  async (failure) => {
    // Given
    const queries = publicQueries();
    const options = queries.standings(sportingId);
    mockFetch.mockResolvedValueOnce(
      failure ? Response.json({}, { status: 503 }) : Response.json(table),
    );
    const first = new QueryObserver(client, options);
    const closeFirst = first.subscribe(() => undefined);
    await waitFor(() =>
      expect(first.getCurrentResult().isFetching).toBe(false),
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    closeFirst();
    mockFetch.mockResolvedValueOnce(
      Response.json({ ...table, observedAt: "2026-10-21T12:00:00Z" }),
    );

    // When
    const reopened = new QueryObserver(client, options);
    const closeReopened = reopened.subscribe(() => undefined);
    try {
      // Then
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(reopened.getCurrentResult().data?.observedAt).toBe(
          "2026-10-21T12:00:00Z",
        ),
      );
    } finally {
      closeReopened();
    }
  },
);

it("unlinks only the refused team in retained standings of the same current context", async () => {
  // Given
  const queries = publicQueries();
  const otherContext = publicQueries();
  mockFetch.mockImplementation((url: string) =>
    url.endsWith("/standings")
      ? Promise.resolve(Response.json(table))
      : Promise.resolve(Response.json({}, { status: 404 })),
  );
  await client.query(queries.standings(sportingId));
  await client.query(otherContext.standings(sportingId));
  const originalTimestamp = client.getQueryState(
    queries.standings(sportingId).queryKey,
  )?.dataUpdatedAt;

  // When
  await expect(client.query(queries.team(sportingId))).rejects.toMatchObject({
    kind: "http",
    status: 404,
  });

  // Then
  expect(client.getQueryData(queries.standings(sportingId).queryKey)).toEqual({
    ...table,
    rows: [
      { sourceName: "Official row", position: 7, statistics: { Ratio: "∞" } },
    ],
  });
  expect(
    client.getQueryState(queries.standings(sportingId).queryKey)?.dataUpdatedAt,
  ).toBe(originalTimestamp);
  expect(
    client.getQueryData(otherContext.standings(sportingId).queryKey)?.rows[0]
      .team?.id,
  ).toBe(sportingId);
});

it("cancels an older table read before it can restore a now forbidden association", async () => {
  // Given
  const queries = publicQueries();
  mockFetch.mockResolvedValueOnce(Response.json(table));
  await client.query(queries.standings(sportingId));
  let finish: ((response: Response) => void) | undefined;
  let signal: AbortSignal | undefined;
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    if (url.endsWith("/standings")) {
      signal = options?.signal ?? undefined;
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    }
    return Promise.resolve(Response.json({}, { status: 404 }));
  });
  const late = client
    .query({ ...queries.standings(sportingId), staleTime: 0 })
    .catch(() => undefined);
  await waitFor(() => expect(finish).toBeDefined());

  // When
  await expect(client.query(queries.team(sportingId))).rejects.toMatchObject({
    status: 404,
  });
  finish?.(Response.json(table));
  await late;

  // Then
  expect(signal?.aborted).toBe(true);
  expect(
    client.getQueryData(queries.standings(sportingId).queryKey)?.rows[0].team,
  ).toBeUndefined();
  expect(
    client.getQueryData(queries.standings(sportingId).queryKey)?.observedAt,
  ).toBe(table.observedAt);
});

it("preserves links when an ordinary team read fails without a visibility refusal", async () => {
  // Given
  const queries = publicQueries();
  mockFetch
    .mockResolvedValueOnce(Response.json(table))
    .mockResolvedValueOnce(Response.json({}, { status: 503 }));
  await client.query(queries.standings(sportingId));

  // When
  await expect(client.query(queries.team(sportingId))).rejects.toMatchObject({
    status: 503,
  });

  // Then
  expect(client.getQueryData(queries.standings(sportingId).queryKey)).toEqual(
    table,
  );
});
