import { BaseApi } from "@/src/shared/api/BaseApi";
import { CONFIG } from "@/src/shared/config/config";
import {
  EnrichedUserNotificationPage,
  RegisterPushTokenRequest,
  UnreadCount,
} from "@/src/modules/notifications/model/Notification";

export class NotificationApi extends BaseApi {
  constructor() {
    super({ baseURL: CONFIG.API_GATEWAY_BASE_URL });
  }

  public getNotifications(params: { page?: number; size?: number } = {}) {
    const { page = 0, size } = params;
    return this.httpAuth.get<EnrichedUserNotificationPage>("/notifications", {
      params: { page, size },
    });
  }

  public getUnreadNotificationsCount() {
    return this.httpAuth.get<UnreadCount>("/notifications/unread-count");
  }

  public markNotificationRead(id: number) {
    return this.httpAuth.post<void>(`/notifications/${id}/read`);
  }

  public markNotificationOpened(id: number) {
    return this.httpAuth.post<void>(`/notifications/${id}/opened`);
  }

  public deleteNotification(id: number) {
    return this.httpAuth.delete<void>(`/notifications/${id}`);
  }

  public registerPushToken(userId: number, payload: RegisterPushTokenRequest) {
    return this.httpAuth.post<void>(
      `/notifications/users/${userId}/push-tokens`,
      payload,
    );
  }
}
