import type { ReactNode } from "react";
import type { AccountSession } from "@/features/accounts/current-account";
import { ErrorState } from "@/shared/components/state-card";
import {
  ReadFeedback,
  type ReadFeedbackQuery,
} from "@/shared/components/read-feedback";

/** Presentation inputs only; the owning authority still checks grants, identity and request admission. */
export interface AccessFeedbackProps {
  /** Inherits the destination's shape without admitting its data or commands. */
  loadingContent: ReactNode;
  sessionStatus: AccountSession["status"];
  account: ReadFeedbackQuery;
  enabled: boolean;
}

/** Keeps account-read recovery with Query; session recovery and current grants retain their owners. */
export function AccessFeedback({
  sessionStatus,
  account,
  enabled,
  loadingContent,
}: Readonly<AccessFeedbackProps>) {
  if (sessionStatus === "restoring") {
    return loadingContent;
  }
  if (
    sessionStatus === "authenticated" &&
    (account.isError || account.isPending)
  ) {
    return <ReadFeedback query={account} loadingContent={loadingContent} />;
  }
  return enabled ? null : <ErrorState />;
}
