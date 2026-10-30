import {
  getClub,
  getMatch,
  getMatchDocument,
  getClubLogo,
  getPoolStandings,
} from "../../../../.generated/mobile";
import { createQueryClient } from "../../../shared/query/query-client";
import { createConsultationQueries } from "../api/consultation-queries";
import {
  clubDetail,
  matchDetail,
  sportingId,
} from "../test-support/consultation-data";

const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("accepts additive public fields and preserves unknown contacts without source fallbacks", async () => {
  // Given
  mockFetch.mockResolvedValue(
    Response.json({
      ...clubDetail(),
      club: { id: sportingId, name: "Club", future: 1 },
      future: true,
    }),
  );

  // When
  const result = await getClub(sportingId);

  // Then
  expect(result.contacts).toEqual({});
  expect(result.seasons).toEqual([]);
  expect(result.location).toBeUndefined();
  expect(result.club.logoUrl).toBeUndefined();
});

it.each([
  {},
  { ...clubDetail(), contacts: null },
  { ...clubDetail(), seasons: null },
  { ...clubDetail(), club: { id: sportingId, name: 2 } },
  { ...clubDetail(), location: { latitude: 91, longitude: 0, label: "City" } },
])(
  "rejects malformed known club fields before Query admission: %j",
  async (body) => {
    // Given
    mockFetch.mockResolvedValue(Response.json(body));
    const client = createQueryClient();
    const session = { subject: null, accountId: null };
    const queries = createConsultationQueries(
      session,
      { request: (options) => options },
      jest.fn(),
    );
    const options = queries.club(sportingId);
    try {
      // When
      const result = client.query(options);

      // Then
      await expect(result).rejects.toMatchObject({ kind: "schema" });
      expect(client.getQueryData(options.queryKey)).toBeUndefined();
    } finally {
      client.clear();
    }
  },
);

it.each(["upcoming", "completed"] as const)(
  "preserves %s, date precision and exact observation time",
  async (category) => {
    // Given
    const body = matchDetail();
    body.match.category = category;
    mockFetch.mockResolvedValue(Response.json(body));

    // When
    const result = await getMatch(sportingId);

    // Then
    expect(result.match.category).toBe(category);
    expect(result.match.schedule.localDate).toBe("2026-10-25");
    expect(result.match.schedule.observedAt).toBe("2026-10-24T16:00:00+02:00");
    expect(result.match.schedule.instant).toBeUndefined();
    expect(result.match.result).toBeUndefined();
    expect(result.sets).toBeUndefined();
    expect(result.referees).toBeUndefined();
  },
);

it("preserves known instants, explicit empty lists and nonnumeric special results", async () => {
  // Given
  const body = matchDetail();
  body.match.schedule.instant = "2026-10-25T00:30:00+02:00";
  body.match.result = {
    state: "final",
    specialLabel: "F",
    observedAt: "2026-10-25T00:45:00Z",
  };
  body.referees = [];
  body.sets = { observedAt: "2026-10-25T00:45:00Z", items: [] };
  mockFetch.mockResolvedValue(Response.json(body));

  // When
  const result = await getMatch(sportingId);

  // Then
  expect(result.match.schedule.instant).toBe(body.match.schedule.instant);
  expect(result.match.result?.homeSets).toBeUndefined();
  expect(result.match.result?.awaySets).toBeUndefined();
  expect(result.referees).toEqual([]);
  expect(result.sets?.items).toEqual([]);
});

it.each([
  { category: "future" },
  { result: null },
  {
    schedule: {
      localDate: "2026-02-30",
      timeZone: "Europe/Paris",
      observedAt: "2026-10-24T16:00:00Z",
    },
  },
  {
    schedule: {
      localDate: "2026-10-25",
      timeZone: "Europe/Paris",
      observedAt: "tomorrow",
    },
  },
  { result: { state: "future", observedAt: "2026-10-24T16:00:00Z" } },
  {
    result: {
      state: "final",
      homeSets: -1,
      observedAt: "2026-10-24T16:00:00Z",
    },
  },
])("rejects invalid known match values: %j", async (change) => {
  // Given
  const body = matchDetail();
  mockFetch.mockResolvedValue(
    Response.json({ ...body, match: { ...body.match, ...change } }),
  );

  // When
  const result = getMatch(sportingId);

  // Then
  await expect(result).rejects.toMatchObject({ kind: "schema" });
});

it.each([null, ["#112233", "#223344", "#334455"]])(
  "accepts the required nullable gradient: %j",
  async (gradient) => {
    // Given
    const body = matchDetail();
    body.match.pool.classification.division = {
      id: sportingId,
      name: "Division",
      color: "#112233",
      gradient,
    };
    mockFetch.mockResolvedValue(Response.json(body));

    // When
    const result = await getMatch(sportingId);

    // Then
    expect(result.match.pool.classification.division?.gradient).toEqual(
      gradient,
    );
  },
);

it.each([
  undefined,
  [],
  ["#112233", "#223344"],
  ["invalid", "#223344", "#334455"],
])("rejects missing or incomplete gradients: %j", async (gradient) => {
  // Given
  const body = matchDetail();
  mockFetch.mockResolvedValue(
    Response.json({
      ...body,
      match: {
        ...body.match,
        pool: {
          ...body.match.pool,
          classification: {
            division: {
              id: sportingId,
              name: "Division",
              color: "#112233",
              gradient,
            },
          },
        },
      },
    }),
  );

  // When
  const result = getMatch(sportingId);

  // Then
  await expect(result).rejects.toMatchObject({ kind: "schema" });
});

it.each(["information", "scoresheet", "statistics"] as const)(
  "keeps the %s document action and exact contributed version",
  async (kind) => {
    // Given
    const body = matchDetail();
    body.documents = [
      { kind, url: `/matches/${sportingId}/documents/${kind}` },
    ];
    body.streamUrl = "https://video.example.invalid/exact-version";
    body.streamContributionId = sportingId;
    mockFetch.mockResolvedValue(Response.json(body));

    // When
    const result = await getMatch(sportingId);

    // Then
    expect(result.documents).toEqual(body.documents);
    expect(result.streamUrl).toBe(body.streamUrl);
    expect(result.streamContributionId).toBe(sportingId);
  },
);

it("rejects an unknown document kind", async () => {
  // Given
  mockFetch.mockResolvedValue(
    Response.json({
      ...matchDetail(),
      documents: [{ kind: "future", url: "/document" }],
    }),
  );

  // When
  const result = getMatch(sportingId);

  // Then
  await expect(result).rejects.toMatchObject({ kind: "schema" });
});

it.each(["available", "not-published", "unavailable"] as const)(
  "preserves %s standings without fabricating positions or statistics",
  async (availability) => {
    // Given
    mockFetch.mockResolvedValue(
      Response.json({
        poolId: sportingId,
        availability,
        lastAttemptFailed: false,
        columns: [],
        rows:
          availability === "available"
            ? [{ sourceName: "Unmatched", statistics: {} }]
            : [],
        ...(availability === "available"
          ? { observedAt: "2026-10-24T16:00:00Z" }
          : {}),
      }),
    );

    // When
    const result = await getPoolStandings(sportingId);

    // Then
    expect(result.availability).toBe(availability);
    expect(result.rows[0]?.position).toBeUndefined();
    expect(result.rows[0]?.team).toBeUndefined();
    expect(result.rows[0]?.statistics ?? {}).toEqual({});
  },
);

it.each(["future", null])(
  "rejects invalid standings availability: %j",
  async (availability) => {
    // Given
    mockFetch.mockResolvedValue(
      Response.json({
        poolId: sportingId,
        availability,
        lastAttemptFailed: false,
        columns: [],
        rows: [],
      }),
    );

    // When
    const result = getPoolStandings(sportingId);

    // Then
    await expect(result).rejects.toMatchObject({ kind: "schema" });
  },
);

it.each(["application/pdf", "image/png", "image/jpeg"])(
  "bypasses JSON parsing for generated %s delivery",
  async (mediaType) => {
    // Given
    const response = new Response("synthetic-binary", {
      headers: { "Content-Type": mediaType },
    });
    const json = jest.spyOn(response, "json");
    mockFetch.mockResolvedValue(response);

    // When
    const result =
      mediaType === "application/pdf"
        ? await getMatchDocument(sportingId, "information")
        : await getClubLogo(sportingId);

    // Then
    expect(await result.text()).toBe("synthetic-binary");
    expect(json).not.toHaveBeenCalled();
  },
);
