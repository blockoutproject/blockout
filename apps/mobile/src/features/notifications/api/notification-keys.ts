import {
  getListNotificationsQueryKey,
  getGetNotificationQueryKey,
  getGetNotificationSummaryQueryKey,
} from "../../../../.generated/mobile";
import type { SessionSnapshot } from "../../accounts/session/session-generation";
import { getSessionQueryKey } from "../../../shared/query/query-client";

/** Private generated keys for a captured F05 owner; continuation belongs to native pageParam. */
export function getNotificationKeys(session: SessionSnapshot) {
  const { accountId, generation } = session;
  if (accountId === null) throw new Error("A notification owner is required");
  return Object.freeze({
    inbox: getSessionQueryKey(
      generation,
      getListNotificationsQueryKey(accountId),
    ),
    summary: getSessionQueryKey(
      generation,
      getGetNotificationSummaryQueryKey(accountId),
    ),
    /** Selects one original owner's retained entry within the captured session. */
    detail: (id: string) =>
      getSessionQueryKey(generation, getGetNotificationQueryKey(accountId, id)),
  });
}
