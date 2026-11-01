import { useQuery } from "@tanstack/react-query";
import { ApiError } from "../../../shared/api/api-fetch";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { captureFollowingOwner, type FollowingTarget } from "./following-keys";
import { createFollowStateQueryOptions } from "./follow-queries";

/**
 * Binds the generated member read to the original account and current admission.
 * Profile errors suspend personal actions without removing public sporting content.
 * Reopening shares a current confirmed read; each mounted mutation owns its pending presentation.
 */
export function useFollowStateQuery(target: FollowingTarget) {
  const session = useAccountSession();
  const profile = useCurrentAccount();
  const admission = useOrdinaryRequest();
  const { getCredentials } = session;
  const owner = captureFollowingOwner(session);
  const usable =
    admission.admitted &&
    session.status === "authenticated" &&
    profile.isSuccess &&
    profile.data.accountId === owner?.accountId;
  const bypass = Boolean(admission.bypass);
  /** Prepares each captured-owner request after native credentials so F12 rechecks current intent. */
  async function request(signal?: AbortSignal) {
    if (!owner) throw new ApiError("cancelled");
    const credentials = await getCredentials();
    if (!credentials) throw new ApiError("http", 401);
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
    request,
    options,
    bypass,
    profile,
    sessionStatus: session.status,
  };
}
