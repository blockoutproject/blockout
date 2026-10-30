import { ApiError } from "../../../shared/api/api-fetch";

/** Safe ordinary version-conflict feedback; current reads never certify historical execution. */
export function contributionErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409)
    return "La contribution a changé. Vérifiez les données avant une nouvelle action.";
  return "La contribution est indisponible. Votre saisie est conservée.";
}
