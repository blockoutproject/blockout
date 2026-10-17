import { QueryClient } from "@tanstack/react-query";
import {
  getApplicationAccess,
  getGetApplicationAccessQueryOptions,
  getCollectionControl,
  listNotifications,
  eraseAccount,
  getAccountPhoto,
} from "../../../../.generated/mobile";
import { GetApplicationAccess200 } from "../../../../.generated/schemas/index.zod";
import { apiFetch } from "../api-fetch";

const accountId = "00000000-0000-4000-8000-000000000001";
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

/** Supplies the complete public access shape without assuming any domain defaults. */
function accessResponse() {
  return {
    maintenance: { revision: 0, active: false, message: null, imageUrl: null },
    versions: {
      revision: 0,
      ios: { minimumVersion: null, storeUrl: null },
      android: { minimumVersion: null, storeUrl: null },
      message: null,
    },
  };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  jest.restoreAllMocks();
});

it("validates the generated response exactly once and accepts additive nested data", async () => {
  const body = accessResponse();
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

  const response = await getApplicationAccess();

  expect(response).toEqual(body);
  expect(parse).toHaveBeenCalledTimes(1);
});

it.each([
  ["missing required", {}],
  [
    "wrong known type",
    {
      ...accessResponse(),
      maintenance: { ...accessResponse().maintenance, active: "false" },
    },
  ],
  [
    "missing nullable",
    { ...accessResponse(), maintenance: { revision: 0, active: false } },
  ],
])("rejects %s before Query success", async (_case, body) => {
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const options = getGetApplicationAccessQueryOptions();

  await expect(queryClient.fetchQuery(options)).rejects.toMatchObject({
    kind: "schema",
  });

  expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
  queryClient.clear();
});

it.each(["{", "", '{"maintenance":'])(
  "rejects malformed JSON %s",
  async (body) => {
    mockFetch.mockResolvedValue(
      new Response(body, { headers: { "Content-Type": "application/json" } }),
    );
    await expect(getApplicationAccess()).rejects.toMatchObject({
      kind: "schema",
    });
  },
);

it("requires a success schema for JSON", async () => {
  mockFetch.mockResolvedValue(
    new Response("{}", { headers: { "Content-Type": "application/json" } }),
  );
  await expect(apiFetch("/accounts/me")).rejects.toMatchObject({
    kind: "schema",
  });
});

it("preserves an empty list and rejects a forbidden null", async () => {
  mockFetch.mockResolvedValueOnce(
    new Response('{"notifications":[]}', {
      headers: { "Content-Type": "application/json" },
    }),
  );
  await expect(listNotifications(accountId)).resolves.toEqual({
    notifications: [],
  });
  mockFetch.mockResolvedValueOnce(
    new Response('{"notifications":[],"nextCursor":null}', {
      headers: { "Content-Type": "application/json" },
    }),
  );
  await expect(listNotifications(accountId)).rejects.toMatchObject({
    kind: "schema",
  });
});

it.each([
  { family: "future-family" },
  { lastAttemptAt: "2026-02-31T12:00:00Z" },
  { lastAttemptAt: "not-a-date" },
])(
  "rejects an invalid enum or date through the generated consumer",
  async (invalid) => {
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
    await expect(getCollectionControl(accountId)).rejects.toMatchObject({
      kind: "schema",
    });
  },
);

it("parses errors through the problem profile without validating them as success", async () => {
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

  await expect(getApplicationAccess()).rejects.toMatchObject({
    kind: "http",
    status: 503,
    problem: { type: "urn:blockout:problem:unavailable" },
    message: "Le service est indisponible. Réessayez.",
  });

  expect(parse).not.toHaveBeenCalled();
});

it.each(["<html>private failure</html>", '{"type":2,"status":503}'])(
  "keeps malformed error bodies out of safe errors",
  async (body) => {
    mockFetch.mockResolvedValue(
      new Response(body, {
        status: 503,
        headers: { "Content-Type": "application/problem+json" },
      }),
    );
    await expect(getApplicationAccess()).rejects.toMatchObject({
      kind: "http",
      problem: undefined,
      message: "Le service est indisponible. Réessayez.",
    });
  },
);

it("handles the generated 204 mutation without JSON or replay", async () => {
  mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
  await expect(eraseAccount(accountId)).resolves.toBeUndefined();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("returns binary content only for a declared binary request", async () => {
  mockFetch.mockResolvedValue(
    new Response("image-bytes", { headers: { "Content-Type": "image/png" } }),
  );
  await expect(getAccountPhoto(accountId)).resolves.toBeInstanceOf(Blob);
});

it("rejects non-JSON when the generated consumer requires JSON", async () => {
  mockFetch.mockResolvedValue(
    new Response("unexpected HTML", {
      headers: { "Content-Type": "text/html" },
    }),
  );
  await expect(getApplicationAccess()).rejects.toMatchObject({
    kind: "schema",
  });
});

it.each([
  "https://outside.example.invalid/path",
  "//outside.example.invalid/path",
  "https://user:password@api.example.invalid/path",
])("refuses external or credential-bearing backend references", async (url) => {
  await expect(
    apiFetch(url, {
      headers: {
        Authorization: "Bearer harmless",
        "Blockout-Maintenance-Bypass": "true",
      },
    }),
  ).rejects.toMatchObject({ kind: "configuration" });
  expect(mockFetch).not.toHaveBeenCalled();
});

it("resolves a backend URI reference on the configured origin", async () => {
  mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
  await apiFetch("/accounts/me");
  expect(mockFetch).toHaveBeenCalledWith(
    "https://api.example.invalid/accounts/me",
    expect.objectContaining({ redirect: "error" }),
  );
});

it("preserves caller cancellation without replay", async () => {
  const controller = new AbortController();
  mockFetch.mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        ),
      ),
  );
  const request = getApplicationAccess({ signal: controller.signal });
  const assertion = expect(request).rejects.toMatchObject({
    kind: "cancelled",
  });
  controller.abort();
  await assertion;
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("does not send an already cancelled request", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    getApplicationAccess({ signal: controller.signal }),
  ).rejects.toMatchObject({ kind: "cancelled" });
  expect(mockFetch).not.toHaveBeenCalled();
});

it.each([0, 0.5, Number.POSITIVE_INFINITY])(
  "rejects an invalid timeout of %s before sending",
  async (timeoutMs) => {
    // Given / When / Then
    await expect(getApplicationAccess({ timeoutMs })).rejects.toMatchObject({
      kind: "configuration",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  },
);

it("bounds an uncertain write without replay", async () => {
  // Given
  mockFetch.mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options?.signal?.addEventListener("abort", () =>
          reject(new Error("timeout")),
        ),
      ),
  );

  // When / Then
  await expect(
    eraseAccount(accountId, { timeoutMs: 50 }),
  ).rejects.toMatchObject({
    kind: "timeout",
  });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("preserves validated maintenance details on the error profile", async () => {
  const maintenance = {
    ...accessResponse().maintenance,
    active: true,
    message: "Maintenance en cours",
  };
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        type: "urn:blockout:problem:maintenance",
        title: "Unavailable",
        status: 503,
        maintenance,
      }),
      { status: 503, headers: { "Content-Type": "application/problem+json" } },
    ),
  );
  await expect(getApplicationAccess()).rejects.toMatchObject({
    kind: "http",
    problem: { maintenance },
  });
});

it("rejects a response that arrives after caller cancellation", async () => {
  const controller = new AbortController();
  mockFetch.mockImplementation(async () => {
    controller.abort();
    return new Response(JSON.stringify(accessResponse()), {
      headers: { "Content-Type": "application/json" },
    });
  });
  await expect(
    getApplicationAccess({ signal: controller.signal }),
  ).rejects.toMatchObject({ kind: "cancelled" });
});

it("rejects JSON read after caller cancellation", async () => {
  // Given
  const controller = new AbortController();
  const response = new Response("{}", {
    headers: { "Content-Type": "application/json" },
  });
  jest.spyOn(response, "json").mockImplementation(async () => {
    controller.abort();
    return accessResponse();
  });
  mockFetch.mockResolvedValue(response);

  // When / Then
  await expect(
    getApplicationAccess({ signal: controller.signal }),
  ).rejects.toMatchObject({ kind: "cancelled" });
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

  // When / Then
  await expect(
    getAccountPhoto(accountId, { signal: controller.signal }),
  ).rejects.toMatchObject({ kind: "cancelled" });
});

it("rejects a response that arrives after the timeout", async () => {
  // Given
  mockFetch.mockImplementation(
    (_url, options) =>
      new Promise((resolve) =>
        options?.signal?.addEventListener("abort", () =>
          resolve(
            new Response(JSON.stringify(accessResponse()), {
              headers: { "Content-Type": "application/json" },
            }),
          ),
        ),
      ),
  );

  // When / Then
  await expect(getApplicationAccess({ timeoutMs: 50 })).rejects.toMatchObject({
    kind: "timeout",
  });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
