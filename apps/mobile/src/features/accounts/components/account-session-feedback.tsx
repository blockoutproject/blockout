import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ErrorState } from "../../../shared/components/state-card";
import { useAccountSession } from "../session/account-session-provider";

/** Session recovery only; resource reads, authorization, drafts and placement remain with the consumer. */
export interface AccountSessionFeedbackProps {
  loadingContent: ReactNode;
}

/** Presents active native-session waiting or F05's existing explicit recovery, without observing Query state. */
export function AccountSessionFeedback({
  loadingContent,
}: AccountSessionFeedbackProps) {
  const session = useAccountSession();
  const router = useRouter();
  if (
    session.status === "restoring" ||
    session.status === "authenticating" ||
    session.status === "signing-out"
  )
    return loadingContent;
  if (session.status === "authenticated") return null;
  return (
    <ErrorState
      onRetry={
        session.status === "initialization-error"
          ? session.retryInitialization
          : session.status === "authentication-error"
            ? session.retryAuthentication
            : () => router.push("/sign-in")
      }
    />
  );
}
