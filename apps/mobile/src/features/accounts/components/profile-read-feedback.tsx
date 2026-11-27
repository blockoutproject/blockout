import type { ReactNode } from "react";
import { PageContent } from "@/shared/components/page";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { ErrorState } from "@/shared/components/state-card";
import type { useCurrentAccount } from "../api/use-current-account";
import type { AccountSession } from "../session/account-session-provider";
import { accountSessionRecovery } from "../session/account-session-recovery";
import { AccountRecovery } from "./account-recovery";

/** Each Profile destination places this feedback in its own layout. */
export function profileReadFeedback({
  admitted,
  session,
  account,
  loadingContent,
}: Readonly<{
  admitted: boolean;
  session: AccountSession;
  account: ReturnType<typeof useCurrentAccount>;
  loadingContent: ReactNode;
}>) {
  if (!admitted) {
    return (
      <ScreenState>
        <ErrorState />
      </ScreenState>
    );
  }

  const recovery = accountSessionRecovery(session);
  const connected = session.status === "authenticated";
  if (
    recovery.pending ||
    (connected &&
      account.isPending &&
      account.isFetching &&
      !hasReadError(account))
  ) {
    return <PageContent>{loadingContent}</PageContent>;
  }
  if (
    recovery.failed ||
    (connected && (account.isPending || hasReadError(account)))
  ) {
    return (
      <ScreenState>
        <AccountRecovery error={account.error}>
          {recovery.failed ? (
            <ErrorState onRetry={recovery.onRetry} />
          ) : (
            <ReadFeedback query={account} loadingContent={null} />
          )}
        </AccountRecovery>
      </ScreenState>
    );
  }
  return null;
}
