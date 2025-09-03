export enum DevicePlatform {
    IOS = "IOS",
    ANDROID = "ANDROID",
    WEB = "WEB",
    UNKNOWN = "UNKNOWN",
}

export enum NotificationTargetType {
    MATCH = "MATCH",
    GENERIC = "GENERIC",
}

export enum NotificationType {
    MATCH_FINISHED = "MATCH_FINISHED",
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

export interface UserNotification {
    id: number;
    userId: number;
    type: NotificationType;
    title: string;
    body: string;
    deepLink: string | null;
    targetType: NotificationTargetType | null;
    targetId: number | null;
    metadata: string | null;
    isRead: boolean;
    isOpened: boolean;
    createdAt: string;
    readAt: string | null;
    openedAt: string | null;
}