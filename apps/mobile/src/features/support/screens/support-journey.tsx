import { useState, type PropsWithChildren } from "react";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import { getGetMyAccountQueryKey } from "../../../../.generated/mobile";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { useAccountSession } from "../../accounts/session/account-session-provider";
import { SupportVisitProvider } from "../forms/support-visit";
import { supportContext, type SupportOrigin } from "../model/support-context";
import { supportDeviceContext } from "../api/support-device-context";
/** Existing F12 admission and untrusted route origin; this composition grants no independent access. */
export interface SupportJourneyProps extends PropsWithChildren {
  admitted: boolean;
  origin: SupportOrigin;
}
/** Reads already-known contact passively and scopes the private draft to F05's mounted private lifetime. */
export function SupportJourney({
  admitted,
  origin,
  children,
}: SupportJourneyProps) {
  const session = useAccountSession();
  const { user } = useAuth0();
  const [navigation] = useState(() => supportContext(origin));
  const account = useQuery<AccountResponse>({
    queryKey: getGetMyAccountQueryKey(),
    queryFn: skipToken,
  });
  if (!admitted) return null;
  const knownAccount =
    account.data?.accountId === session.accountId ? account.data : undefined;
  const replyEmail =
    session.status === "authenticated"
      ? (knownAccount?.email ?? user?.email ?? "")
      : "";
  const context = {
    ...supportDeviceContext(),
    ...navigation,
    ...(session.accountId ? { accountId: session.accountId } : {}),
  };
  return (
    <SupportVisitProvider
      key={session.subject}
      context={context}
      replyEmail={replyEmail}
    >
      {children}
    </SupportVisitProvider>
  );
}
