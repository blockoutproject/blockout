import type { UseQueryResult } from "@tanstack/react-query";
import type { AccountSession } from "../../accounts/current-account";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ErrorState } from "../../../shared/components/state-card";

/** Presentation inputs only; the owning authority still checks grants, identity and request admission. */
export interface AccessFeedbackProps {
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
}: AccessFeedbackProps) {
  if (
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" && account.isPending)
  )
    return <RequestLoading />;
  if (account.isError)
    return (
      <ErrorState
        onRetry={() => void account.refetch()}
        retrying={account.isFetching}
      />
    );
  return enabled ? null : <ErrorState />;
}
