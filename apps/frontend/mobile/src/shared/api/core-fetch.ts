import { fetch } from "expo/fetch";

import { ApiError } from "@/src/shared/api/api-error";
import { ApiProblemCodeEnum } from "@/src/shared/generated/core/models/apiProblemCodeEnum";

/** Session-owned credentials and origin for the explicitly enabled replacement API client. */
export interface CoreClientConfig {
  /** Absolute API base URL; generated operations must resolve to this same origin. */
  baseUrl: string;
  /** Supply credentials from the native Auth0 SDK for the core API audience. */
  getAccessToken: () => Promise<string | null>;
  /** Optional session cleanup for 401; 403 leaves the current session intact. */
  onUnauthorized?: (error: ApiError) => void | Promise<void>;
}

let context: (CoreClientConfig & { origin: string }) | undefined;

/**
 * Installs the replacement client context; current screens keep their gateway client.
 *
 * @param config - Session-owned origin and SDK callbacks; omit to clear the context on teardown.
 * @throws If the base URL is invalid.
 */
export function configureCoreClient(config?: CoreClientConfig) {
  context = config
    ? { ...config, origin: new URL(config.baseUrl).origin }
    : undefined;
}

/**
 * Executes one generated operation with native credentials and safe typed failures, without retries.
 * Cookies and redirects are disabled. Caller cancellation and a twenty-second abort timer share the
 * fetch signal; credential acquisition itself remains owned by the SDK callback.
 *
 * @param path - Generated operation path, resolved against the configured API origin.
 * @param options - Generated request options; authorization and the fetch signal are owned here.
 * @returns Parsed JSON, or undefined for HTTP 204, using the generated response type.
 * @throws ApiError for HTTP/authentication, transport, decoding or cancellation failures; raw provider
 * prose is excluded. Missing configuration or a foreign origin fails before acquiring credentials.
 */
export async function coreFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const config = context;
  if (!config) throw new Error("The core API client is not configured.");
  const url = new URL(path, config.baseUrl);
  if (url.origin !== config.origin)
    throw new Error("The core API origin does not match.");

  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 20_000);

  try {
    const token = await config.getAccessToken().catch(() => null);
    if (!token) {
      throw new ApiError(401, "Authentication required.", undefined, {
        code: ApiProblemCodeEnum.AUTHENTICATION_REQUIRED,
      });
    }
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json, application/problem+json");
    headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(url.toString(), {
      ...options,
      headers,
      credentials: "omit",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => undefined);
      const code = problemCode(body, response.status);
      // Unknown future codes remain available; server prose and proxy bodies never become UI text.
      throw new ApiError(
        response.status,
        "The API request failed.",
        undefined,
        {
          code,
          requestId: response.headers.get("x-request-id") ?? undefined,
          retryAfter: response.headers.get("retry-after") ?? undefined,
        },
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 && config.onUnauthorized) {
        try {
          await config.onUnauthorized(error);
        } catch {
          // Session cleanup must not replace the original failure.
        }
      }
      throw error;
    }
    if (controller.signal.aborted) {
      throw new ApiError(
        0,
        timedOut ? "Request timed out." : "Request cancelled.",
        undefined,
        {
          code: timedOut ? "ERR_TIMEOUT" : "ERR_CANCELED",
        },
      );
    }
    throw new ApiError(0, "The server could not be reached.", undefined, {
      code: "ERR_NETWORK",
    });
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
  }
}

/**
 * Preserves future wire codes and supplies a safe fallback for absent or malformed problem bodies.
 * @param body - Untrusted decoded response; only a string code is retained.
 * @param status - HTTP status used to distinguish authentication and access-denied fallbacks.
 * @returns The received code or a generated generic code; no server prose becomes UI text.
 */
function problemCode(body: unknown, status: number): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    typeof body.code === "string"
  ) {
    return body.code;
  }
  switch (status) {
    case 401:
      return ApiProblemCodeEnum.AUTHENTICATION_REQUIRED;
    case 403:
      return ApiProblemCodeEnum.ACCESS_DENIED;
    default:
      return ApiProblemCodeEnum.INTERNAL_ERROR;
  }
}
