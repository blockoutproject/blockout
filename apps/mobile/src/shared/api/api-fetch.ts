import { fetch } from "expo/fetch";
import type { ZodType } from "zod";
import {
  ProblemResponse,
  AccessProblemResponse,
} from "../../../.generated/schemas/index.zod";

/** Per-call transport settings; session credentials remain supplied by their owning caller. */
export interface ApiFetchOptions extends RequestInit {
  schema?: ZodType;
  /** Positive integer milliseconds before the transport stops waiting; defaults to 15 seconds. */
  timeoutMs?: number;
  responseType?: "blob";
}

/** A safe transport failure; the server problem type retains its canonical meaning. */
export class ApiError<
  TProblem = ProblemResponse | AccessProblemResponse,
> extends Error {
  /** Captures safe classification and an optional validated canonical problem profile. */
  constructor(
    public readonly kind:
      "configuration" | "network" | "http" | "schema" | "cancelled" | "timeout",
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
 * Cancellation and timeout stop waiting; neither proves that a mutation was rolled back.
 * The adapter never retries requests and rejects redirects that could forward caller credentials.
 * Empty 204 responses succeed only when the caller expects no JSON or binary representation.
 */
export function apiFetch<T>(url: string, options?: ApiFetchOptions): Promise<T>;
export async function apiFetch(
  url: string,
  options: ApiFetchOptions = {},
): Promise<unknown> {
  const {
    schema,
    timeoutMs = 15_000,
    responseType,
    signal,
    ...request
  } = options;
  let destination: URL;
  try {
    const base = new URL(process.env.EXPO_PUBLIC_API_URL ?? "");
    destination = new URL(url, base);
    if (
      !["https:", "http:"].includes(base.protocol) ||
      destination.origin !== base.origin ||
      base.username ||
      base.password ||
      destination.username ||
      destination.password ||
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs <= 0
    ) {
      throw new Error("Invalid backend destination");
    }
  } catch {
    throw new ApiError("configuration");
  }
  if (signal?.aborted) throw new ApiError("cancelled");

  const deadline = AbortSignal.timeout(timeoutMs);
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  try {
    const response = await fetch(destination.href, {
      ...request,
      signal: requestSignal,
      redirect: "error",
    });
    const contentType = response.headers
      .get("Content-Type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    if (!response.ok) {
      let problem: ProblemResponse | AccessProblemResponse | undefined;
      if (contentType === "application/problem+json") {
        try {
          const result = (
            response.status === 503 ? AccessProblemResponse : ProblemResponse
          ).safeParse(await response.json());
          if (result.success && result.data.status === response.status)
            problem = result.data;
        } catch {
          // Malformed upstream content never replaces the safe HTTP failure.
        }
      }
      throw new ApiError("http", response.status, problem);
    }
    if (requestSignal.aborted)
      throw new ApiError(deadline.aborted ? "timeout" : "cancelled");
    if (response.status === 204) {
      if (schema || responseType) throw new ApiError("schema");
      return undefined;
    }
    if (responseType === "blob" && !schema) {
      const blob = await response.blob();
      if (requestSignal.aborted)
        throw new ApiError(deadline.aborted ? "timeout" : "cancelled");
      return blob;
    }
    if (!schema || contentType !== "application/json")
      throw new ApiError("schema");
    try {
      const body: unknown = await response.json();
      if (requestSignal.aborted)
        throw new ApiError(deadline.aborted ? "timeout" : "cancelled");
      return schema.parse(body);
    } catch {
      throw new ApiError("schema");
    }
  } catch (error) {
    if (signal?.aborted) throw new ApiError("cancelled");
    if (deadline.aborted) throw new ApiError("timeout");
    if (error instanceof ApiError) throw error;
    throw new ApiError("network");
  }
}
