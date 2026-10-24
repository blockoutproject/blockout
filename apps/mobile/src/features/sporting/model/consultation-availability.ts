import { ApiError } from "../../../shared/api/api-fetch";

/** Current admission/visibility refusal invalidates the retained public representation. */
export function resourceUnavailable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.kind === "http" &&
    (error.status === 401 || error.status === 403 || error.status === 404)
  );
}
