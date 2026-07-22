import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationOpened,
  markNotificationRead,
  registerPushToken,
} from "@/src/shared/generated/endpoints/notification-secure";
import type {RegisterPushTokenRequest} from "@/src/shared/generated/models";

/** Expose notification operations through the feature API boundary. */
export class NotificationApi {
  /** Load one page of notifications for the authenticated user. */
  public getNotifications(params: {page?: number; size?: number} = {}) {
    const {page = 0, size} = params;
    return getNotifications({page, size});
  }

  /** Load the authenticated user's unread notification count. */
  public getUnreadNotificationsCount() {
    return getUnreadNotificationsCount();
  }

  /** Mark one notification as read. */
  public markNotificationRead(id: number) {
    return markNotificationRead(id);
  }

  /** Mark one notification as opened. */
  public markNotificationOpened(id: number) {
    return markNotificationOpened(id);
  }

  /** Delete one notification. */
  public deleteNotification(id: number) {
    return deleteNotification(id);
  }

  /** Register one native push token for a user. */
  public registerPushToken(userId: number, payload: RegisterPushTokenRequest) {
    return registerPushToken(userId, payload);
  }
}
