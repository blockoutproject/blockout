import { QueryObserver } from "@tanstack/react-query";
import { createConsultationQueries } from "../api/consultation-queries";
import { createQueryClient } from "../../../shared/query/query-client";
import { type ApiFetchOptions } from "../../../shared/api/api-fetch";
import { clubDetail, sportingId } from "../test-support/consultation-data";

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

it("starts an ordinary public read with no account, credentials or entitlement dependency", async () => {
  // Given
  const session = { subject: null, accountId: null };
  const credentials = jest.fn();
  const queries = createConsultationQueries(
    session,
    { request: (options) => options },
    credentials,
  );
  const client = createQueryClient();
  mockFetch.mockResolvedValue(Response.json(clubDetail()));
  try {
    // When
    const result = await client.query(queries.club(sportingId));

    // Then
    expect(result.club.name).toBe("Club");
    expect(credentials).not.toHaveBeenCalled();
    expect(
      new Headers(mockFetch.mock.calls[0][1].headers).has("Authorization"),
    ).toBe(false);
    expect(queries.club(sportingId).queryKey[0]).not.toBe("session");
  } finally {
    client.clear();
  }
});

it.each(["resource", "season"] as const)(
  "keeps the current %s selection when an old response completes",
  async (change) => {
    // Given: real Query observer and generated consumers; only network completion is controlled.
    const session = { subject: null, accountId: null };
    const queries = createConsultationQueries(
      session,
      { request: (options) => options },
      jest.fn(),
    );
    const client = createQueryClient();
    const second = "00000000-0000-4000-8000-000000000002";
    const old = Promise.withResolvers<Response>();
    const started = Promise.withResolvers<void>();
    const seasonId = change === "season" ? second : sportingId;
    const current = { seasonId, items: [] };
    mockFetch
      .mockImplementationOnce(() => {
        started.resolve();
        return old.promise;
      })
      .mockResolvedValue(Response.json(current));
    const firstOptions = queries.clubTeams(sportingId, sportingId);
    const nextOptions = queries.clubTeams(
      change === "resource" ? second : sportingId,
      seasonId,
    );
    const observer = new QueryObserver(client, firstOptions);
    const unsubscribe = observer.subscribe(() => {});
    const oldResult = client
      .query(firstOptions)
      .catch((error: unknown) => error);
    await started.promise;
    try {
      // When
      observer.setOptions(nextOptions);
      await client.query(nextOptions);
      old.resolve(
        Response.json({
          seasonId: sportingId,
          items: [
            {
              team: { id: sportingId, name: "Obsolete" },
              season: { id: sportingId, label: "2026/2027", startYear: 2026 },
              classification: {},
              professional: true,
            },
          ],
        }),
      );
      await oldResult;

      // Then
      expect(observer.getCurrentResult().data).toEqual(current);
      expect(firstOptions.queryKey).not.toEqual(nextOptions.queryKey);
    } finally {
      unsubscribe();
      client.clear();
    }
  },
);

it.each([401, 403, 404, 503])(
  "preserves refusal %i without a public retry or successful empty value",
  async (status) => {
    // Given
    const session = { subject: null, accountId: null };
    const queries = createConsultationQueries(
      session,
      { request: (options) => options },
      jest.fn(),
    );
    const client = createQueryClient();
    mockFetch.mockResolvedValue(new Response(null, { status }));
    const options = queries.match(sportingId);
    try {
      // When
      const result = client.query(options);

      // Then
      await expect(result).rejects.toMatchObject({ kind: "http", status });
      expect(client.getQueryData(options.queryKey)).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    } finally {
      client.clear();
    }
  },
);

it("obtains credentials only for captured explicit bypass and lets F12 prepare each request", async () => {
  // Given: controlled F12 admission supplies the authorized header, not a second grant registry.
  const session = { subject: "auth0|reader", accountId: sportingId };
  const intent = session;
  const request = jest.fn((options: ApiFetchOptions) => ({
    ...options,
    headers: { ...options.headers, "Blockout-Maintenance-Bypass": "true" },
  }));
  const credentials = jest
    .fn()
    .mockResolvedValue({ accessToken: "synthetic-token" });
  const queries = createConsultationQueries(
    session,
    { bypass: intent, request },
    credentials,
  );
  const client = createQueryClient();
  mockFetch.mockResolvedValue(Response.json(clubDetail()));
  try {
    // When
    await client.query(queries.club(sportingId));

    // Then
    expect(credentials).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { Authorization: "Bearer synthetic-token" },
      }),
    );
    expect(
      new Headers(mockFetch.mock.calls[0][1].headers).get(
        "Blockout-Maintenance-Bypass",
      ),
    ).toBe("true");
    expect(queries.club(sportingId).queryKey[0]).toBe("consultation-bypass");
  } finally {
    client.clear();
  }
});

it("shares one in-flight read across consumers of the same F12 bypass intent", async () => {
  // Given: separate consumers capture the same owner intent, rather than inventing new scopes.
  const session = { subject: "auth0|reader", accountId: sportingId };
  const intent = session;
  const admission = {
    bypass: intent,
    request: (options: ApiFetchOptions) => ({
      ...options,
      headers: { ...options.headers, "Blockout-Maintenance-Bypass": "true" },
    }),
  };
  const captured = session;
  const credentials = async () => ({ accessToken: "synthetic-token" });
  const first = createConsultationQueries(captured, admission, credentials);
  const second = createConsultationQueries(captured, admission, credentials);
  const ready = Promise.withResolvers<void>();
  mockFetch.mockImplementation(async () => {
    await ready.promise;
    return Response.json(clubDetail());
  });
  const client = createQueryClient();
  try {
    // When
    const results = [
      client.query(first.club(sportingId)),
      client.query(second.club(sportingId)),
    ];
    ready.resolve();
    await Promise.all(results);

    // Then
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(first.club(sportingId).queryKey).toEqual(
      second.club(sportingId).queryKey,
    );
  } finally {
    client.clear();
  }
});

it("keeps each calendar selector, category and grouping zone in its generated context", () => {
  // Given
  const session = { subject: null, accountId: null };
  const queries = createConsultationQueries(
    session,
    { request: (options) => options },
    jest.fn(),
  );
  const input = {
    clubId: sportingId,
    seasonId: sportingId,
    category: "upcoming" as const,
    timeZone: "Europe/Paris",
  };
  const first = queries.calendar(input);

  // When
  const alternatives = [
    queries.calendar({ ...input, category: "completed" }),
    queries.calendar({ ...input, timeZone: "America/New_York" }),
    queries.calendar({
      ...input,
      seasonId: "00000000-0000-4000-8000-000000000002",
    }),
  ];

  // Then
  alternatives.forEach((options) =>
    expect(options.queryKey).not.toEqual(first.queryKey),
  );
});

it.each([
  { category: "upcoming" as const, timeZone: "UTC" },
  { clubId: sportingId, category: "upcoming" as const, timeZone: "UTC" },
  {
    clubId: sportingId,
    teamId: sportingId,
    seasonId: sportingId,
    category: "upcoming" as const,
    timeZone: "UTC",
  },
  {
    teamId: sportingId,
    seasonId: sportingId,
    category: "upcoming" as const,
    timeZone: "UTC",
  },
  { teamId: sportingId, category: "upcoming" as const, timeZone: "invalid" },
])("rejects incoherent calendar selection before transport: %j", (input) => {
  // Given
  const session = { subject: null, accountId: null };
  const queries = createConsultationQueries(
    session,
    { request: (options) => options },
    jest.fn(),
  );

  // When
  const create = () => queries.calendar(input);

  // Then
  expect(create).toThrow();
  expect(mockFetch).not.toHaveBeenCalled();
});
