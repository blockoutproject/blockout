import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";

/** Safe ordinary version-conflict feedback; current reads never certify historical execution. */
export function contributionErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409)
    return "La contribution a changé. Vérifiez les données avant une nouvelle action.";
  return "La contribution est indisponible. Votre saisie est conservée.";
}

/** Keeps exact-version conflicts, established HTTP refusals and unconfirmed moderation writes distinct. */
export function moderationErrorMessage(
  error: unknown,
  operation: "decision" | "publication",
): string {
  if (
    error instanceof ApiError &&
    error.kind === "http" &&
    error.status === 409
  )
    return contributionErrorMessage(error);
  if (isUncertainMutationFailure(error))
    return operation === "decision"
      ? "La décision n’a pas pu être confirmée. Actualisez avant une nouvelle décision."
      : "La publication n’a pas pu être confirmée. Votre saisie est conservée.";
  if (
    error instanceof ApiError &&
    error.kind === "http" &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500
  )
    return operation === "decision"
      ? "La décision a été refusée."
      : "La publication a été refusée. Votre saisie est conservée.";
  return TECHNICAL_ERROR;
}
