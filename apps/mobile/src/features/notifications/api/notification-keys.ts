import { getListNotificationsQueryKey } from "../../../../.generated/mobile";
import type { SessionSnapshot } from "@/features/accounts";

/** Private generated keys for a captured F05 owner; continuation belongs to native pageParam. */
export function getNotificationKeys(session: SessionSnapshot) {
  const { accountId } = session;
  if (accountId === null) {
    throw new Error("A notification owner is required");
  }
  return Object.freeze({
    inbox: getListNotificationsQueryKey(accountId),
  });
}
