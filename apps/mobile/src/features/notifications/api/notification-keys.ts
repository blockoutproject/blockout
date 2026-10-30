import {
  getListNotificationsQueryKey,
  getGetNotificationQueryKey,
  getGetNotificationSummaryQueryKey,
} from "../../../../.generated/mobile";
import type { SessionSnapshot } from "../../accounts";
/** Private generated keys for a captured F05 owner; continuation belongs to native pageParam. */
export function getNotificationKeys(session: SessionSnapshot) {
  const { accountId } = session;
  if (accountId === null) throw new Error("A notification owner is required");
  return Object.freeze({
    inbox: getListNotificationsQueryKey(accountId),
    summary: getGetNotificationSummaryQueryKey(accountId),
    /** Selects one original owner's retained entry within the captured session. */
    detail: (id: string) => getGetNotificationQueryKey(accountId, id),
  });
}
