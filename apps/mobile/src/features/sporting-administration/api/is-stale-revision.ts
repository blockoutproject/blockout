import { ApiError } from "@/shared/api/api-fetch";

/** Only the server's typed revision refusal requires an explicit editor reread. */
export function isStaleRevision(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.problem?.type === "urn:blockout:problem:stale-revision"
  );
}
