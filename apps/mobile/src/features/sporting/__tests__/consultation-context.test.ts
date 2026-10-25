import { QueryObserver } from "@tanstack/react-query";
import { createConsultationQueries } from "../api/consultation-queries";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { createMaintenanceBypass } from "../../access/state/maintenance-bypass";
import { createQueryClient } from "../../../shared/query/query-client";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
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
  const session = createSessionGeneration();
  const credentials = jest.fn();
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
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
    const session = createSessionGeneration();
    const queries = createConsultationQueries(
      { ...session.getSnapshot(), isCurrent: session.isCurrent },
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

it("rejects an old public-session completion even without native cancellation", async () => {
  // Given
  const session = createSessionGeneration();
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { request: (options) => options },
    jest.fn(),
  );
  const client = createQueryClient();
  const response = Promise.withResolvers<Response>();
  mockFetch.mockReturnValue(response.promise);
  const options = queries.club(sportingId);
  const result = client.query(options);
  const rejected = expect(result).rejects.toMatchObject({ kind: "cancelled" });

  try {
    // When
    session.invalidate();
    response.resolve(Response.json(clubDetail("Obsolete")));

    // Then
    await rejected;
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    client.clear();
  }
});

it.each([401, 403, 404, 503])(
  "preserves refusal %i without a public retry or successful empty value",
  async (status) => {
    // Given
    const session = createSessionGeneration();
    const queries = createConsultationQueries(
      { ...session.getSnapshot(), isCurrent: session.isCurrent },
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
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, sportingId);
  const bypass = createMaintenanceBypass();
  bypass.request(session.getSnapshot(), true);
  const intent = bypass.getSnapshot();
  const request = jest.fn((options: ApiFetchOptions) => ({
    ...options,
    signal: intent?.signal,
    headers: { ...options.headers, "Blockout-Maintenance-Bypass": "true" },
  }));
  const credentials = jest
    .fn()
    .mockResolvedValue({ accessToken: "synthetic-token" });
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
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
    expect(queries.club(sportingId).queryKey[0]).toBe("session");
  } finally {
    client.clear();
  }
});

it("shares one in-flight read across consumers of the same F12 bypass intent", async () => {
  // Given: separate consumers capture the same owner intent, rather than inventing new scopes.
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, sportingId);
  const bypass = createMaintenanceBypass();
  bypass.request(session.getSnapshot(), true);
  const intent = bypass.getSnapshot();
  const admission = {
    bypass: intent,
    request: (options: ApiFetchOptions) => ({
      ...options,
      signal: intent?.signal,
      headers: { ...options.headers, "Blockout-Maintenance-Bypass": "true" },
    }),
  };
  const captured = { ...session.getSnapshot(), isCurrent: session.isCurrent };
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

it("rejects revoked bypass while credentials are pending", async () => {
  // Given
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, sportingId);
  const bypass = createMaintenanceBypass();
  bypass.request(session.getSnapshot(), true);
  const intent = bypass.getSnapshot();
  const credentials = Promise.withResolvers<{ accessToken: string }>();
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    {
      bypass: intent,
      request: () => {
        throw new ApiError("cancelled");
      },
    },
    () => credentials.promise,
  );
  const client = createQueryClient();
  const result = client.query(queries.club(sportingId));
  const rejected = expect(result).rejects.toMatchObject({ kind: "cancelled" });

  try {
    // When
    bypass.clear();
    credentials.resolve({ accessToken: "obsolete-token" });

    // Then
    await rejected;
    expect(mockFetch).not.toHaveBeenCalled();
  } finally {
    client.clear();
  }
});

it("keeps a newer successful representation when cancelled credential work later refuses", async () => {
  // Given: the documented query-function context supplies the cancelled attempt's signal.
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, sportingId);
  const bypass = createMaintenanceBypass();
  bypass.request(session.getSnapshot(), true);
  const late = Promise.withResolvers<{ accessToken: string } | undefined>();
  const credentials = jest
    .fn()
    .mockImplementationOnce(() => late.promise)
    .mockResolvedValue({ accessToken: "synthetic-token" });
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { bypass: bypass.getSnapshot(), request: (options) => options },
    credentials,
  );
  const client = createQueryClient();
  const options = queries.club(sportingId);
  const read = options.queryFn;
  if (typeof read !== "function")
    throw new Error("Expected generated query function");
  const cancelled = new AbortController();
  const oldRead = read({
    client,
    queryKey: options.queryKey,
    signal: cancelled.signal,
    meta: undefined,
  });
  const rejected = expect(oldRead).rejects.toMatchObject({
    kind: "http",
    status: 401,
  });
  mockFetch.mockResolvedValue(
    Response.json(clubDetail("Current representation")),
  );
  try {
    // When
    cancelled.abort();
    await client.query(options);
    late.resolve(undefined);
    await rejected;

    // Then
    expect(client.getQueryData(options.queryKey)?.club.name).toBe(
      "Current representation",
    );
    expect(client.getQueryState(options.queryKey)?.status).toBe("success");
  } finally {
    client.clear();
  }
});

it("rejects a late bypass body after intent ends and keeps ordinary context separate", async () => {
  // Given
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, sportingId);
  const bypass = createMaintenanceBypass();
  bypass.request(session.getSnapshot(), true);
  const intent = bypass.getSnapshot();
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    {
      bypass: intent,
      request: (options) => ({
        ...options,
        signal: intent?.signal,
        headers: { ...options.headers, "Blockout-Maintenance-Bypass": "true" },
      }),
    },
    async () => ({ accessToken: "synthetic-token" }),
  );
  const body = Promise.withResolvers<unknown>();
  const reading = Promise.withResolvers<void>();
  const response = Response.json({});
  jest.spyOn(response, "json").mockImplementation(() => {
    reading.resolve();
    return body.promise;
  });
  mockFetch.mockResolvedValue(response);
  const client = createQueryClient();
  const options = queries.club(sportingId);
  const result = client.query(options);
  const rejected = expect(result).rejects.toMatchObject({ kind: "cancelled" });
  await reading.promise;

  try {
    // When
    bypass.clear();
    body.resolve(clubDetail());

    // Then
    await rejected;
    const ordinary = createConsultationQueries(
      { ...session.getSnapshot(), isCurrent: session.isCurrent },
      { request: (options) => options },
      jest.fn(),
    );
    expect(ordinary.club(sportingId).queryKey).not.toEqual(options.queryKey);
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    client.clear();
  }
});

it("keeps each calendar selector, category and grouping zone in its generated context", () => {
  // Given
  const session = createSessionGeneration();
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
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

it.each(["session", "bypass"] as const)(
  "starts a fresh current read instead of deduplicating on the old %s promise",
  async (change) => {
    // Given: real Query identity/observer with a native response that ignores cancellation.
    const session = createSessionGeneration();
    session.setAccount(session.getSnapshot().generation, sportingId);
    const bypass = createMaintenanceBypass();
    if (change === "bypass") bypass.request(session.getSnapshot(), true);
    const credentials = async () => ({ accessToken: "synthetic-token" });
    /** Supplies controlled F12 options for the exact captured intent; the real owner owns grants. */
    function capture() {
      const intent = bypass.getSnapshot();
      return createConsultationQueries(
        { ...session.getSnapshot(), isCurrent: session.isCurrent },
        {
          bypass: intent,
          request: (options) => ({
            ...options,
            signal:
              intent && options.signal
                ? AbortSignal.any([options.signal, intent.signal])
                : options.signal,
            headers: intent
              ? { ...options.headers, "Blockout-Maintenance-Bypass": "true" }
              : options.headers,
          }),
        },
        credentials,
      );
    }
    const previous = capture();
    const oldResponse = Promise.withResolvers<Response>();
    const started = Promise.withResolvers<void>();
    mockFetch
      .mockImplementationOnce(() => {
        started.resolve();
        return oldResponse.promise;
      })
      .mockResolvedValue(Response.json(clubDetail("Current")));
    const client = createQueryClient();
    const observer = new QueryObserver(client, previous.club(sportingId));
    const unsubscribe = observer.subscribe(() => {});
    const oldResult = client
      .query(previous.club(sportingId))
      .catch((error: unknown) => error);
    await started.promise;

    try {
      // When
      if (change === "session") session.invalidate();
      else {
        bypass.clear();
        bypass.request(session.getSnapshot(), true);
      }
      const current = capture();
      const options = current.club(sportingId);
      observer.setOptions(options);
      const result = client.query(options);
      oldResponse.resolve(Response.json(clubDetail("Obsolete")));

      // Then
      await expect(result).resolves.toEqual(clubDetail("Current"));
      await oldResult;
      expect(observer.getCurrentResult().data).toEqual(clubDetail("Current"));
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(options.queryKey).not.toEqual(previous.club(sportingId).queryKey);
      expect(current.club(sportingId).queryKey).toEqual(options.queryKey);
    } finally {
      unsubscribe();
      client.clear();
    }
  },
);

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
  const session = createSessionGeneration();
  const queries = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { request: (options) => options },
    jest.fn(),
  );

  // When
  const create = () => queries.calendar(input);

  // Then
  expect(create).toThrow();
  expect(mockFetch).not.toHaveBeenCalled();
});
