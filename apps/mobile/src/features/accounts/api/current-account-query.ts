import { queryOptions } from "@tanstack/react-query";
import {
  getGetMyAccountQueryKey,
  getMyAccount,
} from "../../../../.generated/mobile";
import { ApiError } from "../../../shared/api/api-fetch";
import { isAccessDenied } from "../../../shared/api/access-denied";
import type { AccountSession } from "../session/account-session-provider";

/** One native account read is shared by the identity provider and feature observers. */
export function currentAccountQuery(
  session: Pick<AccountSession, "status" | "getCredentials">,
) {
  return queryOptions({
    queryKey: getGetMyAccountQueryKey(),
    enabled: session.status === "authenticated",
    queryFn: async ({ signal, client, queryKey }) => {
      const previousError = client.getQueryState(queryKey)?.error;
      try {
        const credentials = await session.getCredentials();
        return await getMyAccount({
          signal,
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
      } catch (error) {
        if (signal.aborted) throw new ApiError("cancelled");
        // Refused or deleted accounts cannot leave a usable personal profile in this lifetime.
        if (
          isAccessDenied(error) ||
          (error instanceof ApiError && error.status === 404)
        )
          client
            .getQueryCache()
            .find({ queryKey, exact: true })
            ?.setState({ data: undefined });
        throw isAccessDenied(previousError) ? previousError : error;
      }
    },
  });
}
