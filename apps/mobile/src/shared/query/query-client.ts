import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/api/api-fetch";

/**
 * Creates an independent public or private cache with bounded temporary-read retries.
 * Query owns the native retry delays and suspension; mutations require explicit submission.
 * The React owner determines cache lifetime and resource-specific options retain precedence.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: retryTemporaryRead },
      mutations: { networkMode: "always", retry: false },
    },
  });
}

/** Allows three native relaunches for temporary transport failures, preserving typed refusals. */
function retryTemporaryRead(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3 || !(error instanceof ApiError)) {
    return false;
  }
  if (error.kind === "network") {
    return true;
  }
  if (error.kind !== "http" || error.status === undefined) {
    return false;
  }
  const temporaryStatus =
    error.status === 408 ||
    error.status === 429 ||
    (error.status >= 500 && error.status < 600);
  const technicalProblem =
    !error.problem ||
    error.problem.type === "about:blank" ||
    error.problem.type === "urn:blockout:problem:unavailable";
  return temporaryStatus && technicalProblem;
}
