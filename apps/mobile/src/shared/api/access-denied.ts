import { ApiError } from "./api-fetch";

/** A refused current read cannot authorize presentation of retained private or public results. */
export function isAccessDenied(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.kind === "http" &&
    (error.status === 401 || error.status === 403)
  );
}

/** A current access refusal or missing target withdraws the prior resource read. */
export function isResourceReadRefused(error: unknown): error is ApiError {
  return (
    isAccessDenied(error) ||
    (error instanceof ApiError && error.kind === "http" && error.status === 404)
  );
}
