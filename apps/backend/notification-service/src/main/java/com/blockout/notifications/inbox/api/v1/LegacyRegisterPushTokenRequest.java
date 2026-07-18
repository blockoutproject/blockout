package com.blockout.notifications.inbox.api.v1;

import com.blockout.shared.model.DevicePlatformEnum;

/** Carries only the retained v1 snake-case push-token request. */
public record LegacyRegisterPushTokenRequest(
        String expoPushToken,
        DevicePlatformEnum platform,
        String deviceId) {
}
