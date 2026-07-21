export type DevicePlatform = "IOS" | "ANDROID" | "WEB" | "UNKNOWN";

export enum NotificationTargetType {
  MATCH = "MATCH",
  GENERIC = "GENERIC",
}

export enum NotificationType {
  MATCH_FINISHED = "MATCH_FINISHED",
  MATCH_LIVE_LINK_CREATED = "MATCH_LIVE_LINK_CREATED",
  GENERIC = "GENERIC",
}

export interface RegisterPushTokenRequest {
  expoPushToken: string;
  platform: DevicePlatform;
  deviceId?: string | null;
}

export interface PushToken {
  id: number;
  userId: number;
  expoPushToken: string;
  platform: DevicePlatform;
  deviceId: string | null;
  active: boolean;
  createdAt: string;
  lastUpdate: string;
}

export type EnrichedUserNotification = {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  deepLink: string | null;
  targetType: NotificationTargetType | null;
  targetId: number | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  isOpened: boolean;
  createdAt: string;
  readAt: string | null;
  openedAt: string | null;
  divisionLogoUrl: string | null;
};

export type EnrichedUserNotificationPage = {
  notifications: EnrichedUserNotification[];
  hasNext: boolean;
  nextPage: number | null;
};

export interface UnreadCount {
  unread: number;
}
