import { configureCoreClient, coreFetch } from "@/src/shared/api/core-fetch";
import { getCurrentUser } from "@/src/shared/generated/core/endpoints/current-user";
import { ApiProblemCodeEnum } from "@/src/shared/generated/core/models/apiProblemCodeEnum";

const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

/** Creates a decoded problem-response fixture without native network or SDK dependencies. */
function response(status: number, body?: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers({ "content-type": "application/problem+json" }),
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("core API transport", () => {
  const getAccessToken = jest.fn();
  const onUnauthorized = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    getAccessToken.mockResolvedValue("native-access-token");
    configureCoreClient({
      baseUrl: "https://core.example",
      getAccessToken,
      onUnauthorized,
    });
  });

  afterEach(() => {
    configureCoreClient();
    jest.useRealTimers();
  });

  it("uses the generated operation with current native credentials", async () => {
    const profile = { id: "profile", firstName: null };
    mockFetch.mockResolvedValue(response(200, profile));

    await expect(
      getCurrentUser({ headers: { Authorization: "untrusted" } }),
    ).resolves.toEqual(profile);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://core.example/api/v2/users/me");
    expect(new Headers(options.headers).get("Authorization")).toBe(
      "Bearer native-access-token",
    );
    expect(options.credentials).toBe("omit");
    expect(options.redirect).toBe("error");
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])(
    "keeps HTTP %i distinct without retrying",
    async (status) => {
      const code =
        status === 401
          ? ApiProblemCodeEnum.AUTHENTICATION_REQUIRED
          : ApiProblemCodeEnum.ACCESS_DENIED;
      mockFetch.mockResolvedValue(
        response(status, { code, detail: "private server detail" }),
      );

      await expect(getCurrentUser()).rejects.toMatchObject({
        status,
        code,
        message: "The API request failed.",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(onUnauthorized).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    },
  );

  it("keeps future error codes without exposing server prose", async () => {
    mockFetch.mockResolvedValue(
      response(409, { code: "FUTURE_CODE", detail: "private server detail" }),
    );

    await expect(getCurrentUser()).rejects.toMatchObject({
      status: 409,
      code: "FUTURE_CODE",
      data: undefined,
      message: "The API request failed.",
    });
  });

  it("preserves the server retry hint without retrying automatically", async () => {
    const failed = response(503, {
      code: ApiProblemCodeEnum.SERVICE_UNAVAILABLE,
    });
    failed.headers.set("Retry-After", "5");
    mockFetch.mockResolvedValue(failed);

    await expect(getCurrentUser()).rejects.toMatchObject({
      status: 503,
      retryAfter: "5",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not send a request without credentials", async () => {
    getAccessToken.mockResolvedValue(null);

    await expect(getCurrentUser()).rejects.toMatchObject({
      status: 401,
      code: ApiProblemCodeEnum.AUTHENTICATION_REQUIRED,
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("preserves the API error when session cleanup fails", async () => {
    mockFetch.mockResolvedValue(response(401));
    onUnauthorized.mockRejectedValue(new Error("provider details"));

    await expect(getCurrentUser()).rejects.toMatchObject({
      status: 401,
      code: ApiProblemCodeEnum.AUTHENTICATION_REQUIRED,
    });
  });

  it("never forwards credentials to another origin", async () => {
    await expect(coreFetch("https://other.example/path")).rejects.toThrow(
      "origin does not match",
    );

    expect(getAccessToken).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("keeps the client inactive until explicitly configured", async () => {
    configureCoreClient();

    await expect(getCurrentUser()).rejects.toThrow("not configured");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns a safe error for an HTML proxy failure", async () => {
    const failed = response(502);
    jest
      .mocked(failed.json)
      .mockRejectedValue(new SyntaxError("private proxy HTML"));
    mockFetch.mockResolvedValue(failed);

    await expect(getCurrentUser()).rejects.toMatchObject({
      status: 502,
      code: ApiProblemCodeEnum.INTERNAL_ERROR,
    });
  });

  it("does not expose network diagnostics", async () => {
    mockFetch.mockRejectedValue(new TypeError("private host"));

    await expect(getCurrentUser()).rejects.toMatchObject({
      status: 0,
      code: "ERR_NETWORK",
      message: "The server could not be reached.",
    });
  });

  it.each(["cancel", "timeout"])(
    "supports %s with a caller signal",
    async (reason) => {
      jest.useFakeTimers();
      const caller = new AbortController();
      mockFetch.mockImplementation(
        (_: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener(
              "abort",
              () => reject(new Error("aborted")),
              { once: true },
            );
          }),
      );
      const pending = getCurrentUser({ signal: caller.signal });
      const result = expect(pending).rejects.toMatchObject({
        status: 0,
        code: reason === "timeout" ? "ERR_TIMEOUT" : "ERR_CANCELED",
      });
      await jest.advanceTimersByTimeAsync(0);

      if (reason === "cancel") caller.abort();
      else await jest.advanceTimersByTimeAsync(20_000);

      await result;
      expect(jest.getTimerCount()).toBe(0);
    },
  );
});
