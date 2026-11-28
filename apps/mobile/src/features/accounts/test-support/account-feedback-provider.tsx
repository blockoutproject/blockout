import type { PropsWithChildren } from "react";
import { ActionFeedbackProvider } from "@/shared/components/action-feedback";
import { useAccountSession } from "../session/account-session-provider";

/** Supplies the real root feedback and session relationships to focused account interaction tests. */
export function AccountFeedbackProvider({
  children,
}: Readonly<PropsWithChildren>) {
  const session = useAccountSession();
  return (
    <ActionFeedbackProvider scopeKey={session.subject ?? "guest"}>
      {children}
    </ActionFeedbackProvider>
  );
}
