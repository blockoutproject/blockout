package com.blockout.notifications.push.application;

import com.blockout.shared.model.DevicePlatformEnum;

/** Captures one existing push-token row update chosen by the registration policy. */
public record PushTokenRegistrationChange(
        Long id,
        Long userId,
        String expoPushToken,
        DevicePlatformEnum platform,
        String deviceId) {
}
