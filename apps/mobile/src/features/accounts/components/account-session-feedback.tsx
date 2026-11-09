import { useRouter } from "expo-router";
import { LogIn } from "lucide-react-native";
import type { ReactNode } from "react";
import { Button } from "../../../shared/components/button";
import { ErrorState } from "../../../shared/components/state-card";
import { accountSessionRecovery } from "../session/account-session-recovery";
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
  const recovery = accountSessionRecovery(session);
  if (recovery.pending) {
    return loadingContent;
  }
  if (session.status === "authenticated") {
    return null;
  }
  return (
    <ErrorState onRetry={recovery.onRetry}>
      {session.status !== "initialization-error" &&
        session.status !== "authentication-error" && (
          <Button
            label="Se connecter"
            leadingIcon={LogIn}
            onPress={() => router.push("/sign-in")}
          />
        )}
    </ErrorState>
  );
}
