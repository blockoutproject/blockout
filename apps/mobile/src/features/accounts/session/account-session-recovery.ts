import type { AccountSession } from "./account-session-provider";

/** Existing session-only waiting and recovery, independent of any account/resource read. */
export interface AccountSessionRecovery {
  pending: boolean;
  failed: boolean;
  onRetry?: () => void;
}

/** Selects native preparation/recovery without starting authentication or a business-account command. */
export function accountSessionRecovery(
  session: AccountSession,
): AccountSessionRecovery {
  let onRetry: (() => void) | undefined;
  if (session.status === "initialization-error") {
    onRetry = session.retryInitialization;
  } else if (session.status === "authentication-error") {
    onRetry = session.retryAuthentication;
  }
  return {
    pending: ["restoring", "authenticating", "signing-out"].includes(
      session.status,
    ),
    failed: [
      "initialization-error",
      "authentication-error",
      "reauthentication-required",
    ].includes(session.status),
    onRetry,
  };
}
