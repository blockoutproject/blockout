import { setBadgeCountAsync } from "expo-notifications";
import { useEffect, useLayoutEffect } from "react";
import type { AccountSession } from "../../accounts";

/** Best effort only: unsupported launchers/permissions never block account or inbox use. */
function setBadge(count: number) {
  void setBadgeCountAsync(count).catch(() => undefined);
}

/**
 * Projects only a confirmed current summary; unknown or zero clears the app-controlled badge.
 * F05 invalidation clears immediately, including A → guest → A. Platform-owned indicators and
 * presented notifications remain outside this adapter; no permission prompt or push lifecycle is added.
 */
export function useNotificationBadge(
  session: AccountSession,
  count: number | undefined,
) {
  const { subscribe, generation, accountId, isCurrent } = session;
  useLayoutEffect(() => {
    setBadge(0);
    return subscribe(() => setBadge(0));
  }, [subscribe]);
  useEffect(() => {
    if (isCurrent(generation)) setBadge(count ?? 0);
  }, [generation, accountId, isCurrent, count]);
}
