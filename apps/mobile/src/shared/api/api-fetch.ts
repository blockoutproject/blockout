import { fetch } from "expo/fetch";
import type { ZodType } from "zod";
import {
  ProblemResponse,
  AccessProblemResponse,
} from "../../../.generated/schemas/index.zod";

/** Per-call transport settings; session credentials remain supplied by their owning caller. */
export interface ApiFetchOptions extends RequestInit {
  schema?: ZodType;
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
 * Requests are never retried and redirects cannot forward caller credentials elsewhere.
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
      !Number.isFinite(timeoutMs) ||
      timeoutMs <= 0
    ) {
      throw new Error("Invalid backend destination");
    }
  } catch {
    throw new ApiError("configuration");
  }
  if (signal?.aborted) throw new ApiError("cancelled");

  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(destination.href, {
      ...request,
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) {
      let problem: ProblemResponse | AccessProblemResponse | undefined;
      if (
        response.headers
          .get("Content-Type")
          ?.split(";")[0]
          .trim()
          .toLowerCase() === "application/problem+json"
      ) {
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
    if (controller.signal.aborted)
      throw new ApiError(timedOut ? "timeout" : "cancelled");
    if (response.status === 204) return undefined;
    if (responseType === "blob" && !schema) {
      const blob = await response.blob();
      if (controller.signal.aborted)
        throw new ApiError(timedOut ? "timeout" : "cancelled");
      return blob;
    }
    const contentType = response.headers
      .get("Content-Type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    if (!schema || contentType !== "application/json")
      throw new ApiError("schema");
    try {
      const body: unknown = await response.json();
      if (controller.signal.aborted)
        throw new ApiError(timedOut ? "timeout" : "cancelled");
      return schema.parse(body);
    } catch {
      throw new ApiError("schema");
    }
  } catch (error) {
    if (signal?.aborted) throw new ApiError("cancelled");
    if (timedOut) throw new ApiError("timeout");
    if (error instanceof ApiError) throw error;
    throw new ApiError("network");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
