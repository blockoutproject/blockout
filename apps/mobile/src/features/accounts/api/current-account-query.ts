import { queryOptions } from "@tanstack/react-query";
import {
  getGetMyAccountQueryKey,
  getMyAccount,
} from "../../../../.generated/mobile";
import { ApiError } from "@/shared/api/api-fetch";
import { isAccessDenied } from "@/shared/api/access-denied";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import type { AccountSession } from "../session/account-session-provider";
import { requiresReauthentication } from "../session/native-session";

/**
 * Shares one read between native identity and feature observers, without establishing an account.
 * Technical failures retain known data; refusal withdraws it until a successful read.
 * Null withdraws refused data through Query's public cache API; the attempt still rejects.
 * Screen observers reuse the read started by session establishment, foreground, refresh or invalidation.
 */
export function currentAccountQuery(
  session: Pick<AccountSession, "status" | "getCredentials">,
) {
  return queryOptions<AccountResponse | null>({
    queryKey: getGetMyAccountQueryKey(),
    enabled: session.status === "authenticated",
    staleTime: Infinity,
    refetchOnMount: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal, client, queryKey }) => {
      try {
        const credentials = await session.getCredentials();
        return await getMyAccount({
          signal,
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
      } catch (error) {
        if (signal.aborted) {
          throw new ApiError("cancelled");
        }
        // Refused or deleted accounts cannot leave a usable personal profile in this lifetime.
        if (
          isAccessDenied(error) ||
          requiresReauthentication(error) ||
          (error instanceof ApiError &&
            error.kind === "http" &&
            error.status === 404)
        ) {
          client.setQueryData<AccountResponse | null>(queryKey, null, {
            updatedAt: client.getQueryState(queryKey)?.dataUpdatedAt ?? 0,
          });
        }
        throw error;
      }
    },
  });
}

/** Only the canonical account-absence problem permits absence-specific recovery; a bare 404 does not. */
export function isAccountMissing(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.kind === "http" &&
    error.status === 404 &&
    error.problem?.type === "urn:blockout:problem:not-found"
  );
}
