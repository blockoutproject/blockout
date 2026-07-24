import {
  orvalFetch,
  setMobileGatewayAuthContext,
} from "@/src/shared/api/orvalFetch";
import { getTeamsByIds } from "@/src/shared/generated/endpoints/team-public";

const mockFetch = jest.fn();

jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

jest.mock("@/src/shared/config/config", () => ({
  CONFIG: {
    API_GATEWAY_BASE_URL: "http://localhost:8089/api/v1/mobile",
  },
}));

function response(status: number, body?: unknown, headers?: HeadersInit) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers({
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    }),
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(body === undefined ? "" : String(body)),
    blob: jest.fn(),
  } as unknown as Response;
}

describe("generated mobile-gateway fetch boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMobileGatewayAuthContext();
  });

  it("resolves public contract paths without an authorization header", async () => {
    mockFetch.mockResolvedValue(response(200, [{ id: 1 }, { id: 2 }]));

    await expect(getTeamsByIds({ ids: [1, 2] })).resolves.toEqual([
      { id: 1 },
      { id: 2 },
    ]);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://localhost:8089/api/v1/mobile/public/teams/by-ids?ids=1&ids=2",
    );
    expect(new Headers(options.headers).get("Authorization")).toBeNull();
  });

  it("adds the current token only to secure contract paths", async () => {
    const tokenSupplier = jest.fn().mockResolvedValue("access-token");
    setMobileGatewayAuthContext(tokenSupplier);
    mockFetch.mockResolvedValue(response(204));

    await orvalFetch<void>("/api/v1/mobile/secure/users/me", {
      method: "DELETE",
    });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(tokenSupplier).toHaveBeenCalledTimes(1);
    expect(new Headers(options.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("preserves gateway problem details and invokes unauthorized cleanup", async () => {
    const onUnauthorized = jest.fn();
    setMobileGatewayAuthContext(
      jest.fn().mockResolvedValue("expired-token"),
      onUnauthorized,
    );
    mockFetch.mockResolvedValue(
      response(
        401,
        { code: "AUTHENTICATION_REQUIRED", detail: "Authentication required" },
        { "x-request-id": "request-123" },
      ),
    );

    await expect(
      orvalFetch("/api/v1/mobile/secure/users/me"),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
      requestId: "request-123",
      message: "Authentication required",
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("normalizes transport failures without exposing the original error", async () => {
    mockFetch.mockRejectedValue(new Error("private network details"));

    await expect(
      orvalFetch("/api/v1/mobile/public/config/app-status"),
    ).rejects.toMatchObject({
      status: 0,
      code: "ERR_NETWORK",
      message: "Serveur injoignable.",
    });
  });
});
