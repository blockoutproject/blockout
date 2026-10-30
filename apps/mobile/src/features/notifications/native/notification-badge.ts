import { setBadgeCountAsync } from "expo-notifications";
import { useEffect } from "react";
import type { SessionSnapshot } from "../../accounts";

/** Best effort only: unsupported launchers/permissions never block account or inbox use. */
function setBadge(count: number) {
  void setBadgeCountAsync(count).catch(() => undefined);
}

/** Clears only the app-controlled badge; SDK failures and launcher-owned indicators never block departure. */
export function clearNotificationBadge() {
  setBadge(0);
}

/**
 * Projects only a confirmed current summary; unknown or zero clears the app-controlled badge.
 * Changing the current account clears its app-controlled badge. Platform-owned indicators and
 * presented notifications remain outside this adapter; no permission prompt or push lifecycle is added.
 */
export function useNotificationBadge(
  session: SessionSnapshot,
  count: number | undefined,
) {
  useEffect(() => {
    setBadge(count ?? 0);
    return clearNotificationBadge;
  }, [session.subject, session.accountId, count]);
}
