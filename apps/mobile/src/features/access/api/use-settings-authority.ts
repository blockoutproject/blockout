import { useApplicationAccess } from "../queries/use-application-access";
import { useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";
import { useAuth0 } from "react-native-auth0";
import {
  getGetMyAccountQueryKey,
  getGetMaintenanceSettingsQueryKey,
  getGetApplicationVersionSettingsQueryKey,
} from "../../../../.generated/mobile";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useAccountSession } from "../../accounts/current-account";

/** Checks current F05 authority for settings that remain individually available behind admission gates. */
export function useSettingsAuthority(
  enabled: boolean,
  permission: "manageMaintenance" | "manageApplicationVersions",
) {
  const session = useAccountSession();
  const client = useQueryClient();
  const auth = useAuth0();
  const { observations } = useApplicationAccess();
  const group = permission === "manageMaintenance" ? "maintenance" : "versions";
  const active = useRef(enabled);
  useLayoutEffect(() => {
    active.current = enabled;
    return () => {
      active.current = false;
    };
  }, [enabled]);

  /** Reads live account and settings refusals so delayed credentials or confirmations cannot restore command access. */
  function assertAuthority(revision?: number) {
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    const account = client.getQueryState<AccountResponse>(
      getSessionQueryKey(session.generation, getGetMyAccountQueryKey()),
    );
    if (
      !active.current ||
      account?.status !== "success" ||
      account.data?.accountId !== session.accountId ||
      account.data.permissions[permission] !== true
    )
      throw new ApiError("http", 403);
    const settings = client.getQueryState(
      getSessionQueryKey(
        session.generation,
        group === "maintenance"
          ? getGetMaintenanceSettingsQueryKey()
          : getGetApplicationVersionSettingsQueryKey(),
      ),
    );
    if (revision !== undefined && isAccessDenied(settings?.error))
      throw new ApiError("http", 403);
    if (
      revision !== undefined &&
      revision < (observations.getSnapshot()[group]?.revision ?? 0)
    )
      throw new ApiError("http", 409);
  }

  /** Credentials never replace the live grant or known group revision; stale intent requires reread without transport. */
  async function request(revision?: number) {
    assertAuthority(revision);
    const credentials = await auth.getCredentials();
    assertAuthority(revision);
    if (!credentials) throw new ApiError("http", 401);
    return {
      session,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    };
  }
  return {
    session,
    request,
    observedRevision: observations.getSnapshot()[group]?.revision ?? 0,
  };
}
