import { useState, type PropsWithChildren } from "react";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import { getGetMyAccountQueryKey } from "../../../../.generated/mobile";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { useAccountSession } from "@/features/accounts/session/account-session-provider";
import { SupportVisitProvider } from "../forms/support-visit";
import { supportContext, type SupportOrigin } from "../model/support-context";
import { supportDeviceContext } from "../api/support-device-context";

/** Existing F12 admission and untrusted route origin; this composition grants no independent access. */
export interface SupportJourneyProps extends PropsWithChildren {
  admitted: boolean;
  origin: SupportOrigin;
}

/** Reads already-known contact passively and keeps each draft within its current F05 owner. */
export function SupportJourney({
  admitted,
  origin,
  children,
}: Readonly<SupportJourneyProps>) {
  const { accountId, status, subject } = useAccountSession();
  const { user } = useAuth0();
  const [navigation] = useState(() => supportContext(origin));
  const [visit, setVisit] = useState({ accountId, key: 0 });
  const account = useQuery<AccountResponse>({
    queryKey: getGetMyAccountQueryKey(),
    queryFn: skipToken,
  });
  // A provisional draft can take its first UUID. Losing or replacing a known owner starts a fresh visit.
  if (visit.accountId !== accountId) {
    setVisit({
      accountId,
      key: visit.accountId === null ? visit.key : visit.key + 1,
    });
  }
  if (!admitted) {
    return null;
  }
  const knownAccount =
    account.data?.accountId === accountId ? account.data : undefined;
  const replyEmail =
    status === "authenticated"
      ? (knownAccount?.email ?? user?.email ?? "")
      : "";
  const context = {
    ...supportDeviceContext(),
    ...navigation,
    ...(accountId ? { accountId } : {}),
  };
  return (
    <SupportVisitProvider
      key={`${subject ?? "guest"}:${visit.key}`}
      context={context}
      replyEmail={replyEmail}
    >
      {children}
    </SupportVisitProvider>
  );
}
