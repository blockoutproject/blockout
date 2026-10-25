import { ApiError, isUncertainMutationFailure } from "./api-fetch";

/**
 * Revision-guarded commands require a current read after conflict or an uncertain acknowledgement.
 * Non-revision contracts, including username uniqueness, retain their own refusal semantics.
 */
export function requiresRevisionRead(error: unknown): boolean {
  return (
    isUncertainMutationFailure(error) ||
    (error instanceof ApiError && error.status === 409)
  );
}
