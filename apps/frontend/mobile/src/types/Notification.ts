export type DevicePlatform = "IOS" | "ANDROID" | "WEB" | "UNKNOWN";

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

export type EnrichedUserNotification = {
    id: number;
    userId: number;
    type: string;
    title: string;
    body: string;
    deepLink: string | null;
    targetType: string | null;
    targetId: number | null;
    metadata: string | null;
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
    count: number;
}