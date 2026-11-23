import { useAccountAvailability } from "@/features/accounts/current-account";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import { createInboxQueries } from "./inbox-queries";

/** Applies ordinary F12 admission to the private inbox while retaining each request's F05 owner. */
export function useInboxQueries() {
  const { session, account, usable } = useAccountAvailability();
  const admission = useOrdinaryRequest();
  const available = usable && admission.admitted;
  const owner = { subject: session.subject, accountId: session.accountId };
  const queries = available
    ? createInboxQueries(owner, async (signal) => {
        const credentials = await session.getCredentials();
        return admission.request({
          signal,
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
      })
    : undefined;
  return { session, owner, queries, account };
}
