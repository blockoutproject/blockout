import { isCancelledError } from "@tanstack/react-query";
import { createDiscoveryQueryOptions } from "../api/discovery-queries";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { createMaintenanceBypass } from "../../access/state/maintenance-bypass";
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";
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

/** Captures real session/intent owners; only F12 grant admission is controlled in these transport scenarios. */
function bypassContext() {
  const session = createSessionGeneration();
  session.setAccount(
    session.getSnapshot().generation,
    "00000000-0000-4000-8000-000000000001",
  );
  const bypass = createMaintenanceBypass();
  bypass.request(session.getSnapshot(), true);
  const intent = bypass.getSnapshot();
  if (!intent) throw new Error("Expected a deliberate bypass intent");
  const options = createDiscoveryQueryOptions(
    "club",
    { q: "Volley" },
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    {
      bypass: intent,
      request: (request: ApiFetchOptions) => ({
        ...request,
        signal: request.signal
          ? AbortSignal.any([request.signal, intent.signal])
          : intent.signal,
        headers: { ...request.headers, "Blockout-Maintenance-Bypass": "true" },
      }),
    },
    async () => ({ accessToken: "synthetic-token" }),
  );
  return { session, bypass, options };
}

it("starts public discovery without reading credentials or entitlement state", async () => {
  // Given
  const session = createSessionGeneration();
  const client = createQueryClient();
  const credentials = jest.fn();
  const options = createDiscoveryQueryOptions(
    "club",
    { q: "Volley" },
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { bypass: undefined, request: (request) => request },
    credentials,
  );
  mockFetch.mockResolvedValue(Response.json({ clubs: [] }));
  try {
    // When
    await client.infiniteQuery(options);

    // Then
    expect(mockFetch.mock.calls[0][1].headers).toBeUndefined();
    expect(credentials).not.toHaveBeenCalled();
    expect(options.queryKey[0]).not.toBe("session");
  } finally {
    client.clear();
  }
});

it.each([401, 403, 503])(
  "preserves explicit bypass refusal %i without a public retry",
  async (status) => {
    // Given
    const { options } = bypassContext();
    const client = createQueryClient();
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
    try {
      // When
      const request = client.infiniteQuery(options);

      // Then
      await expect(request).rejects.toMatchObject({ kind: "http", status });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][1].headers).toMatchObject({
        Authorization: "Bearer synthetic-token",
        "Blockout-Maintenance-Bypass": "true",
      });
    } finally {
      client.clear();
    }
  },
);

it("rejects an old-session bypass completion before cache admission", async () => {
  // Given
  const { session, options } = bypassContext();
  const client = createQueryClient();
  const unbind = bindSessionQueries(
    client,
    session.subscribe,
    session.isCurrent,
  );
  const response = Promise.withResolvers<Response>();
  const started = Promise.withResolvers<void>();
  mockFetch.mockImplementation(() => {
    started.resolve();
    return response.promise;
  });
  // Removed in-flight queries still schedule their final GC; no timer is needed for this cache-removal test.
  const result = client.infiniteQuery({ ...options, gcTime: Infinity });
  const rejected = result.catch((error: unknown) => error);
  await started.promise;
  try {
    // When
    session.invalidate();
    response.resolve(Response.json({ clubs: [] }));

    // Then
    expect(isCancelledError(await rejected)).toBe(true);
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    unbind();
    client.clear();
  }
});

it("rejects a late completion after the owner cancels bypass intent", async () => {
  // Given
  const { bypass, options } = bypassContext();
  const client = createQueryClient();
  const response = Promise.withResolvers<Response>();
  const started = Promise.withResolvers<void>();
  mockFetch.mockImplementation((_url: string, request: RequestInit) => {
    request.signal?.addEventListener(
      "abort",
      () => response.reject(request.signal?.reason),
      { once: true },
    );
    started.resolve();
    return response.promise;
  });
  const result = client.infiniteQuery(options);
  const rejected = expect(result).rejects.toMatchObject({ kind: "cancelled" });
  await started.promise;
  try {
    // When
    bypass.clear();
    response.resolve(Response.json({ clubs: [] }));

    // Then
    await rejected;
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    client.clear();
  }
});

it("rejects cancelled bypass intent after the response body has completed", async () => {
  // Given: native Fetch cannot retract a completed body; intent may change before transport admission.
  const { bypass, options } = bypassContext();
  const client = createQueryClient();
  const response = Response.json({ clubs: [] });
  const readBody = response.json.bind(response);
  jest.spyOn(response, "json").mockImplementation(async () => {
    const body: unknown = await readBody();
    bypass.clear();
    return body;
  });
  mockFetch.mockResolvedValue(response);
  try {
    // When
    const result = client.infiniteQuery(options);

    // Then
    await expect(result).rejects.toMatchObject({ kind: "cancelled" });
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    client.clear();
  }
});
