import type { ReactNode } from "react";
import {
  AccountRecovery,
  type AccountSession,
} from "@/features/accounts/current-account";
import { ErrorState } from "@/shared/components/state-card";
import {
  hasReadError,
  ReadFeedback,
  type ReadFeedbackQuery,
} from "@/shared/components/read-feedback";

/** Presentation inputs only; the owning authority still checks grants, identity and request admission. */
export interface AccessFeedbackProps {
  /** Inherits the destination's shape without admitting its data or commands. */
  loadingContent: ReactNode;
  sessionStatus: AccountSession["status"];
  account: ReadFeedbackQuery & { readonly error?: unknown };
  enabled: boolean;
}

/** Keeps first account loading in the content layout and retained read errors in the feedback layout. */
export function isAccessLoading({
  sessionStatus,
  account,
}: Readonly<Pick<AccessFeedbackProps, "sessionStatus" | "account">>): boolean {
  return (
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" &&
      account.isPending &&
      account.isFetching &&
      !hasReadError(account))
  );
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
  let content = enabled ? null : <ErrorState />;
  if (
    sessionStatus === "authenticated" &&
    (account.isError || account.isPending)
  ) {
    content = <ReadFeedback query={account} loadingContent={loadingContent} />;
  }
  return <AccountRecovery error={account.error}>{content}</AccountRecovery>;
}
