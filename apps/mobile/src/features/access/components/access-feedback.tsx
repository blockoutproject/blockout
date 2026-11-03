import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { AccountSession } from "../../accounts/current-account";
import { ErrorState } from "../../../shared/components/state-card";

/** Presentation inputs only; the owning authority still checks grants, identity and request admission. */
export interface AccessFeedbackProps {
  /** Inherits the destination's shape without admitting its data or commands. */
  loadingContent: ReactNode;
  sessionStatus: AccountSession["status"];
  account: Pick<
    UseQueryResult,
    "isPending" | "isError" | "refetch" | "isFetching"
  >;
  enabled: boolean;
}

/** Initial authority feedback stays opaque; retained-editor failures belong to their action's toast. */
export function AccessFeedback({
  sessionStatus,
  account,
  enabled,
  loadingContent,
}: AccessFeedbackProps) {
  if (
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" && account.isPending)
  )
    return loadingContent;
  if (account.isError)
    return (
      <ErrorState
        onRetry={() => void account.refetch()}
        retrying={account.isFetching}
      />
    );
  return enabled ? null : <ErrorState />;
}
