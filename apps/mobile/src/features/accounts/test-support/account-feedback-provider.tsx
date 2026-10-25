import type { PropsWithChildren } from "react";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { useAccountSession } from "../session/account-session-provider";

/** Supplies the real root feedback/session relationship to account and follow interaction tests. */
export function AccountFeedbackProvider({ children }: PropsWithChildren) {
  const session = useAccountSession();
  return (
    <ActionFeedbackProvider scopeKey={session.generation}>
      {children}
    </ActionFeedbackProvider>
  );
}
