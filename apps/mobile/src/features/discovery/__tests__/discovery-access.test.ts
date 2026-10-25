import { listClubs } from "../../../../.generated/mobile";
import { createDiscoveryContext } from "../api/discovery-context";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import {
  createQueryClient,
  bindSessionQueries,
} from "../../../shared/query/query-client";

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

it("starts public discovery without reading credentials or entitlement state", async () => {
  // Given
  mockFetch.mockResolvedValue(Response.json({ clubs: [] }));
  const context = createDiscoveryContext("club");

  // When
  await listClubs(context.params, context.request);

  // Then
  expect(mockFetch.mock.calls[0][1].headers).toBeUndefined();
  expect(context.queryKey[0]).not.toBe("session");
});

it.each([401, 403, 503])(
  "preserves explicit bypass refusal %i without a public retry",
  async (status) => {
    // Given: the shared owner supplies captured intent; the HTTP response is controlled, not real F12 admission.
    const session = createSessionGeneration();
    const context = createDiscoveryContext(
      "club",
      {},
      {
        headers: {
          Authorization: "Bearer synthetic-token",
          "Blockout-Maintenance-Bypass": "true",
        },
        session: { ...session.getSnapshot(), isCurrent: session.isCurrent },
        signal: new AbortController().signal,
      },
    );
    mockFetch.mockResolvedValue(
      Response.json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status,
        },
        {
          status,
          headers: {
            "Content-Type": "application/problem+json",
            "Cache-Control": "no-store",
          },
        },
      ),
    );

    // When
    const request = listClubs(context.params, context.request);

    // Then
    await expect(request).rejects.toMatchObject({ kind: "http", status });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][1].headers).toMatchObject({
      Authorization: "Bearer synthetic-token",
      "Blockout-Maintenance-Bypass": "true",
    });
  },
);

it("rejects an old-session bypass completion before cache admission", async () => {
  // Given
  const session = createSessionGeneration();
  const cache = createQueryClient();
  const unbind = bindSessionQueries(
    cache,
    session.subscribe,
    session.isCurrent,
  );
  const context = createDiscoveryContext(
    "club",
    {},
    {
      headers: {
        Authorization: "Bearer synthetic-token",
        "Blockout-Maintenance-Bypass": "true",
      },
      session: { ...session.getSnapshot(), isCurrent: session.isCurrent },
      signal: new AbortController().signal,
    },
  );
  const response = Promise.withResolvers<Response>();
  mockFetch.mockReturnValue(response.promise);
  cache.setQueryData(context.queryKey, { clubs: [] });

  try {
    // When
    const result = listClubs(context.params, context.request);
    const rejected = expect(result).rejects.toMatchObject({
      kind: "cancelled",
    });
    session.invalidate();
    response.resolve(Response.json({ clubs: [] }));

    // Then
    await rejected;
    expect(cache.getQueryData(context.queryKey)).toBeUndefined();
  } finally {
    unbind();
    cache.clear();
  }
});

it("rejects a late completion after the owner cancels bypass intent", async () => {
  // Given
  const session = createSessionGeneration();
  const intent = new AbortController();
  const context = createDiscoveryContext(
    "club",
    {},
    {
      headers: {
        Authorization: "Bearer synthetic-token",
        "Blockout-Maintenance-Bypass": "true",
      },
      session: { ...session.getSnapshot(), isCurrent: session.isCurrent },
      signal: intent.signal,
    },
  );
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((_url: string, options: RequestInit) => {
    options.signal?.addEventListener(
      "abort",
      () => response.reject(options.signal?.reason),
      { once: true },
    );
    return response.promise;
  });

  // When
  const result = listClubs(context.params, context.request);
  intent.abort();
  response.resolve(Response.json({ clubs: [] }));

  // Then
  await expect(result).rejects.toMatchObject({ kind: "cancelled" });
  expect(createDiscoveryContext("club").queryKey).not.toEqual(context.queryKey);
});

it("rejects cancelled bypass intent after the response body has completed", async () => {
  // Given: native Fetch cannot retract a completed body; intent may change before transport admission.
  const session = createSessionGeneration();
  const intent = new AbortController();
  const cache = createQueryClient();
  const context = createDiscoveryContext(
    "club",
    {},
    {
      headers: {
        Authorization: "Bearer synthetic-token",
        "Blockout-Maintenance-Bypass": "true",
      },
      session: { ...session.getSnapshot(), isCurrent: session.isCurrent },
      signal: intent.signal,
    },
  );
  const response = Response.json({ clubs: [] });
  const readBody = response.json.bind(response);
  jest.spyOn(response, "json").mockImplementation(async () => {
    const body: unknown = await readBody();
    intent.abort();
    return body;
  });
  mockFetch.mockResolvedValue(response);

  try {
    // When
    const result = cache.fetchQuery({
      queryKey: context.queryKey,
      queryFn: () => listClubs(context.params, context.request),
    });

    // Then
    await expect(result).rejects.toMatchObject({ kind: "cancelled" });
    expect(cache.getQueryData(context.queryKey)).toBeUndefined();
  } finally {
    jest.restoreAllMocks();
    cache.clear();
  }
});
