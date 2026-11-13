import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/shared/api/api-fetch";
import { useAccountAvailability } from "@/features/accounts/current-account";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import { captureFollowingOwner, type FollowingTarget } from "./following-keys";
import { createFollowStateQueryOptions } from "./follow-queries";

/**
 * Binds the generated member read to the original account and current admission.
 * F05 keeps a known matching account usable after technical reread failure; actual refusals
 * withdraw its protected availability. Routes can share this result with their initial page
 * composition and the query-free control without mounting another relationship observer.
 */
export function useFollowStateQuery(target: FollowingTarget) {
  const availability = useAccountAvailability();
  const { session, account: profile } = availability;
  const admission = useOrdinaryRequest();
  const { getCredentials } = session;
  const owner = captureFollowingOwner(session);
  const usable = admission.admitted && availability.usable;
  const bypass = Boolean(admission.bypass);

  /** Prepares each captured-owner request after native credentials so F12 rechecks current intent. */
  async function request(signal?: AbortSignal) {
    if (!owner || !admission.admitted) {
      throw new ApiError("cancelled");
    }
    const credentials = await getCredentials();
    if (!credentials) {
      throw new ApiError("http", 401);
    }
    return admission.request({
      signal,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  }

  const options = createFollowStateQueryOptions(target, owner, request);
  const query = useQuery({
    ...options,
    enabled: usable,
  });
  return {
    query,
    owner,
    usable,
    accountUsable: availability.usable,
    admitted: admission.admitted,
    request,
    options,
    bypass,
    profile,
    sessionStatus: session.status,
  };
}

/** One captured relationship read shared by the sporting admission boundary and its protected control. */
export type FollowStateRead = ReturnType<typeof useFollowStateQuery>;
