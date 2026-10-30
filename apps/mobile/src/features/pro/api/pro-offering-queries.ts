import { queryOptions } from "@tanstack/react-query";
import { ApiError } from "../../../shared/api/api-fetch";
import type { SessionSnapshot } from "../../accounts/session/account-session-provider";
import { loadProOffering } from "../pro-offering";
/**
 * Keeps the native offering in its captured native principal. Entry explicitly executes it;
 * RevenueCat has no AbortSignal API, so cancellation rejects admission rather than stopping SDK I/O.
 */
export function createProOfferingQueryOptions(
  session: SessionSnapshot,
  offeringId: string,
) {
  return queryOptions({
    queryKey: ["pro-offering", session.accountId, offeringId],
    enabled: false,
    queryFn: async ({ signal }) => {
      if (signal.aborted) throw new ApiError("cancelled");
      const offering = await loadProOffering(offeringId);
      if (signal.aborted) throw new ApiError("cancelled");
      return offering;
    },
  });
}
