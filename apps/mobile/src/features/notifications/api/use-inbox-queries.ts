import { useAuth0 } from "react-native-auth0";
import { ApiError } from "../../../shared/api/api-fetch";
import { isAccessDenied } from "../../../shared/api/access-denied";
import {
  useCurrentAccount,
  useAccountSession,
} from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { createInboxQueries } from "./inbox-queries";

/** Reuses native credentials, the sole F05 generation and current F12 request admission. */
export function useInboxQueries() {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const admission = useOrdinaryRequest();
  const auth = useAuth0();
  const available =
    session.status === "authenticated" &&
    session.accountId !== null &&
    admission.admitted &&
    account.data?.accountId === session.accountId &&
    !isAccessDenied(account.error);
  const owner = { ...session.getSnapshot(), isCurrent: session.isCurrent };
  const queries = available
    ? createInboxQueries(owner, async (signal) => {
        const credentials = await auth.getCredentials();
        if (!credentials) throw new ApiError("http", 401);
        return admission.request({
          session: owner,
          signal,
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
      })
    : undefined;
  return { session, owner, queries, account };
}
