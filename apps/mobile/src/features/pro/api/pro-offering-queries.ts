import { queryOptions } from "@tanstack/react-query";
import { ApiError } from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import type {
  SessionSnapshot,
  SessionGeneration,
} from "../../accounts/session/session-generation";
import { loadProOffering } from "../pro-offering";

/**
 * Keeps the native offering in its captured account generation. Entry explicitly executes it;
 * RevenueCat has no AbortSignal API, so cancellation rejects admission rather than stopping SDK I/O.
 */
export function createProOfferingQueryOptions(
  session: SessionSnapshot & Pick<SessionGeneration, "isCurrent">,
  offeringId: string,
) {
  return queryOptions({
    queryKey: getSessionQueryKey(session.generation, [
      "pro-offering",
      session.accountId,
      offeringId,
    ]),
    enabled: false,
    queryFn: async ({ signal }) => {
      if (signal.aborted || !session.isCurrent(session.generation))
        throw new ApiError("cancelled");
      const offering = await loadProOffering(offeringId);
      if (signal.aborted || !session.isCurrent(session.generation))
        throw new ApiError("cancelled");
      return offering;
    },
  });
}
