import type { PropsWithChildren } from "react";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { ImageChoicesProvider } from "../../../shared/components/image-choices";
import { useAccountSession } from "../session/account-session-provider";

/** Supplies the real root feedback, image-choice and session relationships to focused account interaction tests. */
export function AccountFeedbackProvider({ children }: PropsWithChildren) {
  const session = useAccountSession();
  return (
    <ImageChoicesProvider>
      <ActionFeedbackProvider scopeKey={session.subject ?? "guest"}>
        {children}
      </ActionFeedbackProvider>
    </ImageChoicesProvider>
  );
}
