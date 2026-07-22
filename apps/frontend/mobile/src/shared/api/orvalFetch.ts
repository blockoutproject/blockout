import {fetch} from "expo/fetch";

import {ApiError} from "@/src/shared/api/ApiError";
import {CONFIG} from "@/src/shared/config/config";

export type TokenSupplier = () => Promise<string | null>;

let tokenSupplier: TokenSupplier | undefined;
let onUnauthorized:
  | ((error: ApiError) => void | Promise<void>)
  | undefined;

/** Configure authentication used by generated secure gateway operations. */
export function setMobileGatewayAuthContext(
  nextTokenSupplier?: TokenSupplier,
  nextOnUnauthorized?: (error: ApiError) => void | Promise<void>,
) {
  tokenSupplier = nextTokenSupplier;
  onUnauthorized = nextOnUnauthorized;
}

/** Execute a generated mobile-gateway operation with Blockout error semantics. */
export async function orvalFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.delete("Authorization");

  if (path.includes("/secure/") && tokenSupplier) {
    try {
      const token = await tokenSupplier();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } catch {
      headers.delete("Authorization");
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(resolveGatewayUrl(path), {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
    const data = await readResponseBody<T>(response);

    if (!response.ok) {
      const error = createApiError(response, data);
      if (response.status === 401 && onUnauthorized) {
        try {
          await onUnauthorized(error);
        } catch {
          // Authentication cleanup must not replace the original API failure.
        }
      }
      throw error;
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(0, "Délai dépassé.", undefined, {
        code: "ERR_TIMEOUT",
      });
    }
    throw new ApiError(0, "Serveur injoignable.", undefined, {
      code: "ERR_NETWORK",
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Resolve a contract path against the configured gateway origin. */
function resolveGatewayUrl(path: string): string {
  return new URL(path, `${CONFIG.API_GATEWAY_BASE_URL}/`).toString();
}

/** Decode successful and error bodies without assuming every response is JSON. */
async function readResponseBody<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json") || contentType?.includes("+json")) {
    return response.json() as Promise<T>;
  }
  if (contentType?.includes("application/pdf")) {
    return response.blob() as Promise<T>;
  }
  return response.text() as Promise<T>;
}

/** Normalize a gateway error response into the existing mobile error contract. */
function createApiError(response: Response, data: unknown): ApiError {
  const body = typeof data === "object" && data !== null ? data : undefined;
  const message = readString(body, "message") ?? readString(body, "detail") ?? "Erreur serveur";
  const code =
    readString(body, "code") ??
    (response.status >= 500 ? "ERR_SERVER" : "ERR_BAD_REQUEST");
  const requestId =
    response.headers.get("x-request-id") ??
    response.headers.get("x-correlation-id") ??
    undefined;

  return new ApiError(response.status, message, data, {code, requestId});
}

/** Read one string property from an unknown response object. */
function readString(
  value: object | undefined,
  property: string,
): string | undefined {
  if (!value || !(property in value)) return undefined;
  const candidate = (value as Record<string, unknown>)[property];
  return typeof candidate === "string" ? candidate : undefined;
}
