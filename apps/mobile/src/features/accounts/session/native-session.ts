import {
  CredentialsManagerError,
  CredentialsManagerErrorCodes,
} from "react-native-auth0";

/**
 * Recognizes explicit SDK evidence that credentials cannot be used or renewed.
 * Generic renewal/network failures remain retryable; no token decoding or expiry clock is added.
 */
export function requiresReauthentication(error: unknown): boolean {
  if (!(error instanceof CredentialsManagerError)) return false;
  switch (error.type) {
    case CredentialsManagerErrorCodes.NO_CREDENTIALS:
    case CredentialsManagerErrorCodes.NO_REFRESH_TOKEN:
    case CredentialsManagerErrorCodes.INVALID_CREDENTIALS:
    case CredentialsManagerErrorCodes.SESSION_EXPIRED:
    case CredentialsManagerErrorCodes.DPOP_KEY_MISSING:
    case CredentialsManagerErrorCodes.DPOP_KEY_MISMATCH:
    case CredentialsManagerErrorCodes.DPOP_NOT_CONFIGURED:
      return true;
    default:
      return (
        error.code === "invalid_grant" || error.code === "invalid_refresh_token"
      );
  }
}
