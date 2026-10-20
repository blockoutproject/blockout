import {
  CredentialsManagerError,
  CredentialsManagerErrorCodes,
  type useAuth0,
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
      return true;
    default:
      return (
        error.code === "invalid_grant" || error.code === "invalid_refresh_token"
      );
  }
}

/**
 * Closes the ordinary Auth0 browser/local session, falling back to local clearing on failure.
 * The caller invalidates business work first. Native storage failures propagate without retry.
 */
export async function signOutNativeSession(
  auth: Pick<ReturnType<typeof useAuth0>, "clearSession" | "clearCredentials">,
): Promise<void> {
  try {
    await auth.clearSession();
  } catch (error) {
    if (error instanceof CredentialsManagerError) throw error;
    await auth.clearCredentials();
  }
}
