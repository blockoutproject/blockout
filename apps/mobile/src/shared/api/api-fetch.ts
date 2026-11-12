import { fetch } from "expo/fetch";
import type { ZodType } from "zod";
import {
  ProblemResponse,
  AccessProblemResponse,
} from "../../../.generated/schemas/index.zod";

/** Per-call transport settings; session credentials remain supplied by their owning caller. */
export interface ApiFetchOptions extends RequestInit {
  schema?: ZodType;
  responseType?: "blob";
  /** Observes a current, validated HTTP refusal for this caller; transport owns no business policy. */
  onHttpError?(error: ApiError): void;
}

/** A safe transport failure; the server problem type retains its canonical meaning. */
export class ApiError<
  TProblem = ProblemResponse | AccessProblemResponse,
> extends Error {
  /** Captures safe classification and an optional validated canonical problem profile. */
  constructor(
    public readonly kind:
      "configuration" | "network" | "http" | "schema" | "cancelled",
    public readonly status?: number,
    public readonly problem?: TProblem,
  ) {
    super(
      kind === "http" && status === 503
        ? "Le service est indisponible. Réessayez."
        : "La demande n’a pas pu aboutir. Réessayez.",
    );
    this.name = "ApiError";
  }
}

/** Supplies the transport error type to Orval's generated Query consumers. */
export type ErrorType<TProblem> = ApiError<TProblem>;

/**
 * Resolves backend references and validates JSON once before a generated consumer succeeds.
 * Expo Fetch owns cancellation and native waiting. A completed body may win a cancellation race;
 * cancellation never proves that a mutation was rolled back.
 * The adapter never retries requests and rejects redirects that could forward caller credentials.
 * Empty 204 responses succeed only when the caller expects no JSON or binary representation.
 * Captured credentials and private cache lifetime belong to the identity owner.
 */
export function apiFetch<T>(url: string, options?: ApiFetchOptions): Promise<T>;

export async function apiFetch(
  url: string,
  options: ApiFetchOptions = {},
): Promise<unknown> {
  const destination = backendDestination(url);
  const { schema, responseType, signal, onHttpError, ...request } = options;
  try {
    signal?.throwIfAborted();
    const response = await fetch(destination.href, {
      ...request,
      signal,
      redirect: "error",
    });
    const contentType = response.headers
      .get("Content-Type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    if (!response.ok) {
      const problem = await readProblem(response, contentType);
      throw new ApiError("http", response.status, problem);
    }
    return await readSuccess(response, contentType, schema, responseType);
  } catch (error) {
    if (signal?.aborted) {
      throw new ApiError("cancelled");
    }
    if (error instanceof ApiError) {
      if (error.kind === "http") {
        onHttpError?.(error);
      }
      throw error;
    }
    throw new ApiError("network");
  }
}

/** Accepts only same-origin HTTP(S) destinations without embedded credentials. */
function backendDestination(url: string): URL {
  try {
    const base = new URL(process.env.EXPO_PUBLIC_API_URL ?? "");
    const destination = new URL(url, base);
    if (
      !["https:", "http:"].includes(base.protocol) ||
      destination.origin !== base.origin ||
      base.username ||
      base.password ||
      destination.username ||
      destination.password
    ) {
      throw new Error("Invalid backend destination");
    }
    return destination;
  } catch {
    throw new ApiError("configuration");
  }
}

/** Malformed or mismatched upstream problem bodies never replace the safe HTTP failure. */
async function readProblem(
  response: Response,
  contentType: string | undefined,
) {
  if (contentType !== "application/problem+json") {
    return undefined;
  }
  try {
    const profile =
      response.status === 503 ? AccessProblemResponse : ProblemResponse;
    const result = profile.safeParse(await response.json());
    if (result.success && result.data.status === response.status) {
      return result.data;
    }
  } catch {
    // Retain the safe HTTP classification even when the body cannot be read.
  }
  return undefined;
}

/** Reads the expected representation once; empty and binary responses never bypass an expected JSON schema. */
async function readSuccess(
  response: Response,
  contentType: string | undefined,
  schema: ZodType | undefined,
  responseType: ApiFetchOptions["responseType"],
): Promise<unknown> {
  let data: unknown;
  if (response.status === 204) {
    if (schema || responseType) {
      throw new ApiError("schema");
    }
  } else if (responseType === "blob" && !schema) {
    data = await response.blob();
  } else {
    if (!schema || contentType !== "application/json") {
      throw new ApiError("schema");
    }
    try {
      const body: unknown = await response.json();
      data = schema.parse(body);
    } catch {
      throw new ApiError("schema");
    }
  }
  return data;
}
