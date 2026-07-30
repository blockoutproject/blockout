import { ApiError } from "@/src/shared/api/api-error";

/**
 * Maps live-link API failures to user-facing form feedback while preserving
 * each command's domain-specific client-error fallback.
 */
export function getMatchLiveLinkErrorMessage(
  error: unknown,
  clientErrorFallback = "Lien invalide ou non accepté.",
): string {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status >= 500) {
      return "Le serveur rencontre un problème, réessaie dans quelques instants.";
    }
    if (error.message && error.message.trim().length > 0) {
      return error.message;
    }
    return clientErrorFallback;
  }

  return "Action impossible, réessaie.";
}
