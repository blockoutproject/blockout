import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";

/** Name conflicts are field refusals; only stale revisions and uncertain writes require rereading. */
export function requiresPresentationReread(error: unknown) {
  return (
    isUncertainMutationFailure(error) ||
    (error instanceof ApiError &&
      error.problem?.type === "urn:blockout:problem:stale-revision")
  );
}
