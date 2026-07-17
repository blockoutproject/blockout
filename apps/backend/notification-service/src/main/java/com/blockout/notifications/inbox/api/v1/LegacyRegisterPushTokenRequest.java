package com.blockout.notifications.inbox.api.v1;

import com.blockout.notifications.models.enums.DevicePlatform;

/** Carries only the retained v1 snake-case push-token request. */
public record LegacyRegisterPushTokenRequest(
        String expoPushToken,
        DevicePlatform platform,
        String deviceId) {
}
