import { ApiError } from "../../../shared/api/api-fetch";
import { isAccessDenied } from "../../../shared/api/access-denied";
import {
  useCurrentAccount,
  useAccountSession,
} from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { createInboxQueries } from "./inbox-queries";
/** Reuses native credentials, the native F05 principal and current F12 request admission. */
export function useInboxQueries() {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const admission = useOrdinaryRequest();
  const available =
    session.status === "authenticated" &&
    session.accountId !== null &&
    admission.admitted &&
    account.data?.accountId === session.accountId &&
    !isAccessDenied(account.error);
  const owner = { subject: session.subject, accountId: session.accountId };
  const queries = available
    ? createInboxQueries(owner, async (signal) => {
        const credentials = await session.getCredentials();
        if (!credentials) throw new ApiError("http", 401);
        return admission.request({
          signal,
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
      })
    : undefined;
  return { session, owner, queries, account };
}
