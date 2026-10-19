import { applicationAccessResponse } from "../test-support/application-access";
import { QueryClient } from "@tanstack/react-query";
import {
  getApplicationAccess,
  getGetApplicationAccessQueryOptions,
  getCollectionControl,
  listNotifications,
  eraseAccount,
  getAccountPhoto,
  setPoolPresentation,
} from "../../../../.generated/mobile";
import { GetApplicationAccess200 } from "../../../../.generated/schemas/index.zod";
import { apiFetch, type ApiFetchOptions } from "../api-fetch";

const accountId = "00000000-0000-4000-8000-000000000001";
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalApiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  }
});

it("validates the generated response exactly once and accepts additive nested data", async () => {
  // Given
  const body = applicationAccessResponse();
  const parse = jest.spyOn(GetApplicationAccess200, "parse");
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        ...body,
        future: 1,
        maintenance: { ...body.maintenance, future: true },
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );

  // When
  const response = await getApplicationAccess();

  // Then
  expect(response).toEqual(body);
  expect(parse).toHaveBeenCalledTimes(1);
});

it.each([
  ["missing required", {}],
  [
    "wrong known type",
    {
      ...applicationAccessResponse(),
      maintenance: {
        ...applicationAccessResponse().maintenance,
        active: "false",
      },
    },
  ],
  [
    "missing nullable",
    {
      ...applicationAccessResponse(),
      maintenance: { revision: 0, active: false },
    },
  ],
])("rejects %s before Query success", async (_case, body) => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const options = getGetApplicationAccessQueryOptions();

  try {
    // When
    const response = queryClient.fetchQuery(options);

    // Then
    await expect(response).rejects.toMatchObject({ kind: "schema" });
    expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    queryClient.clear();
  }
});

it.each(["{", "", '{"maintenance":'])(
  "rejects malformed JSON %s",
  async (body) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(body, { headers: { "Content-Type": "application/json" } }),
    );

    // When
    const response = getApplicationAccess();

    // Then
    await expect(response).rejects.toMatchObject({
      kind: "schema",
    });
  },
);

it("requires a success schema for JSON", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response("{}", { headers: { "Content-Type": "application/json" } }),
  );

  // When
  const response = apiFetch("/accounts/me");

  // Then
  await expect(response).rejects.toMatchObject({
    kind: "schema",
  });
});

it("preserves an empty notification list", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response('{"notifications":[]}', {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  const response = await listNotifications(accountId);

  // Then
  expect(response).toEqual({
    notifications: [],
  });
});

it("rejects a forbidden null notification cursor", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response('{"notifications":[],"nextCursor":null}', {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  const response = listNotifications(accountId);

  // Then
  await expect(response).rejects.toMatchObject({
    kind: "schema",
  });
});

it.each([
  { invalidField: "unknown family", invalid: { family: "future-family" } },
  {
    invalidField: "impossible date",
    invalid: { lastAttemptAt: "2026-02-31T12:00:00Z" },
  },
  { invalidField: "malformed date", invalid: { lastAttemptAt: "not-a-date" } },
])(
  "rejects $invalidField through the generated consumer",
  async ({ invalid }) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: accountId,
          family: "ffvb",
          revision: 0,
          enabled: true,
          pendingRequestId: null,
          lastAttemptAt: null,
          lastSuccessAt: null,
          ...invalid,
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );

    // When
    const response = getCollectionControl(accountId);

    // Then
    await expect(response).rejects.toMatchObject({
      kind: "schema",
    });
  },
);

it("parses errors through the problem profile without validating them as success", async () => {
  // Given
  const parse = jest.spyOn(GetApplicationAccess200, "parse");
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        type: "urn:blockout:problem:unavailable",
        title: "Private provider detail",
        status: 503,
        detail: "secret-value",
      }),
      { status: 503, headers: { "Content-Type": "application/problem+json" } },
    ),
  );

  // When
  const response = getApplicationAccess();

  // Then
  await expect(response).rejects.toMatchObject({
    kind: "http",
    status: 503,
    problem: { type: "urn:blockout:problem:unavailable" },
    message: "Le service est indisponible. Réessayez.",
  });

  expect(parse).not.toHaveBeenCalled();
});

it.each(["<html>private failure</html>", '{"type":2,"status":503}'])(
  "keeps malformed error body %p out of safe errors",
  async (body) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(body, {
        status: 503,
        headers: { "Content-Type": "application/problem+json" },
      }),
    );

    // When
    const response = getApplicationAccess();

    // Then
    await expect(response).rejects.toMatchObject({
      kind: "http",
      problem: undefined,
      message: "Le service est indisponible. Réessayez.",
    });
  },
);

it("handles the generated 204 mutation without JSON or replay", async () => {
  // Given
  mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

  // When
  const response = await eraseAccount(accountId);

  // Then
  expect(response).toBeUndefined();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("rejects an unexpected 204 for a generated JSON mutation without replay", async () => {
  // Given
  mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

  // When
  const response = setPoolPresentation(accountId, {
    revision: "revision-1",
    manualName: null,
    manualShortName: null,
  });

  // Then
  await expect(response).rejects.toMatchObject({ kind: "schema" });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("rejects an unexpected 204 for a generated binary request", async () => {
  // Given
  mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

  // When
  const response = getAccountPhoto(accountId);

  // Then
  await expect(response).rejects.toMatchObject({ kind: "schema" });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("returns binary content only for a declared binary request", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response("image-bytes", { headers: { "Content-Type": "image/png" } }),
  );

  // When
  const response = await getAccountPhoto(accountId);

  // Then
  expect(response).toBeInstanceOf(Blob);
  expect(await response.text()).toBe("image-bytes");
});

it("rejects non-JSON when the generated consumer requires JSON", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response("unexpected HTML", {
      headers: { "Content-Type": "text/html" },
    }),
  );

  // When
  const response = getApplicationAccess();

  // Then
  await expect(response).rejects.toMatchObject({
    kind: "schema",
  });
});

it.each([
  "https://outside.example.invalid/path",
  "//outside.example.invalid/path",
  "https://user:password@api.example.invalid/path",
])("refuses unsafe backend reference %s", async (url) => {
  // Given
  const options: ApiFetchOptions = {
    headers: {
      Authorization: "Bearer harmless",
      "Blockout-Maintenance-Bypass": "true",
    },
  };

  // When
  const response = apiFetch(url, options);

  // Then
  await expect(response).rejects.toMatchObject({ kind: "configuration" });
  expect(mockFetch).not.toHaveBeenCalled();
});

it("resolves a backend URI reference on the configured origin", async () => {
  // Given
  mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

  // When
  await apiFetch("/accounts/me");

  // Then
  expect(mockFetch).toHaveBeenCalledWith(
    "https://api.example.invalid/accounts/me",
    expect.objectContaining({ redirect: "error" }),
  );
});

it("preserves caller cancellation without replay", async () => {
  // Given
  const controller = new AbortController();
  mockFetch.mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        ),
      ),
  );

  // When
  const response = getApplicationAccess({ signal: controller.signal });
  controller.abort();

  // Then
  await expect(response).rejects.toMatchObject({ kind: "cancelled" });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("does not send an already cancelled request", async () => {
  // Given
  const controller = new AbortController();
  controller.abort();

  // When
  const response = getApplicationAccess({ signal: controller.signal });

  // Then
  await expect(response).rejects.toMatchObject({ kind: "cancelled" });
  expect(mockFetch).not.toHaveBeenCalled();
});

it.each([0, 0.5, Number.POSITIVE_INFINITY])(
  "rejects an invalid timeout of %s before sending",
  async (timeoutMs) => {
    // Given
    const options: ApiFetchOptions = { timeoutMs };

    // When
    const response = getApplicationAccess(options);

    // Then
    await expect(response).rejects.toMatchObject({
      kind: "configuration",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  },
);

it("bounds an uncertain write without replay", async () => {
  // Given
  // AbortSignal.timeout uses native timers; this transport proof deliberately keeps real time.
  mockFetch.mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options?.signal?.addEventListener("abort", () =>
          reject(new Error("timeout")),
        ),
      ),
  );

  // When
  const response = eraseAccount(accountId, { timeoutMs: 50 });

  // Then
  await expect(response).rejects.toMatchObject({
    kind: "timeout",
  });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("rejects a response that arrives after caller cancellation", async () => {
  // Given
  const controller = new AbortController();
  mockFetch.mockImplementation(async () => {
    controller.abort();
    return new Response(JSON.stringify(applicationAccessResponse()), {
      headers: { "Content-Type": "application/json" },
    });
  });

  // When
  const response = getApplicationAccess({ signal: controller.signal });

  // Then
  await expect(response).rejects.toMatchObject({ kind: "cancelled" });
});

it("rejects JSON read after caller cancellation", async () => {
  // Given
  const controller = new AbortController();
  const response = new Response("{}", {
    headers: { "Content-Type": "application/json" },
  });
  jest.spyOn(response, "json").mockImplementation(async () => {
    controller.abort();
    return applicationAccessResponse();
  });
  mockFetch.mockResolvedValue(response);

  // When
  const attempt = getApplicationAccess({ signal: controller.signal });

  // Then
  await expect(attempt).rejects.toMatchObject({ kind: "cancelled" });
});

it("rejects binary content read after caller cancellation", async () => {
  // Given
  const controller = new AbortController();
  const response = new Response("image-bytes", {
    headers: { "Content-Type": "image/png" },
  });
  jest.spyOn(response, "blob").mockImplementation(async () => {
    controller.abort();
    return new Blob(["image-bytes"]);
  });
  mockFetch.mockResolvedValue(response);

  // When
  const attempt = getAccountPhoto(accountId, { signal: controller.signal });

  // Then
  await expect(attempt).rejects.toMatchObject({ kind: "cancelled" });
});

it("rejects a response that arrives after the timeout", async () => {
  // Given
  mockFetch.mockImplementation(
    (_url, options) =>
      new Promise((resolve) =>
        options?.signal?.addEventListener("abort", () =>
          resolve(
            new Response(JSON.stringify(applicationAccessResponse()), {
              headers: { "Content-Type": "application/json" },
            }),
          ),
        ),
      ),
  );

  // When
  const response = getApplicationAccess({ timeoutMs: 50 });

  // Then
  await expect(response).rejects.toMatchObject({
    kind: "timeout",
  });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
